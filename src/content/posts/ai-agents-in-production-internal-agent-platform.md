---
title: "AI Agents in Production — Day 6: Building an Internal Agent Platform"
description: "One agent is a feature. A platform for building agents is a capability. Unify tools, governance, approvals, deployment, and monitoring into an internal platform that every team can use."
published: 2026-06-18
pubDate: 2026-06-18T09:00:00.000Z
slug: ai-agents-in-production-internal-agent-platform
tags:
  - ai-agents
  - production
  - platform-engineering
  - internal-tools
  - governance
  - deployment
  - microservices
  - typescript
category: ai-agents
lang: en
series:
  name: "AI Agents in Production"
  order: 6
  total: 6
---

Five days of building agent infrastructure. Now it's time to turn it into a platform.

The difference between a set of agents and a platform is **reusability, governance, and self-service**. Anyone in the company should be able to create and deploy an agent without knowing about circuit breakers, cache invalidation, or multi-region failover.

This post wraps everything from Days 1–5 into an Internal Agent Platform (IAP):

```
┌─────────────────────────────────────────────────┐
│                  Agent Portal (UI)              │
├─────────────────────────────────────────────────┤
│   Agent Registry  │  Tool Catalog  │  Deployments│
├─────────────────────────────────────────────────┤
│               Platform API (REST)               │
├────────────────────┬────────────────────────────┤
│   Agent Runtime    │    Infrastructure Layer     │
│   (Days 1-3)       │    (Days 4-5)              │
│   ┌───────────┐    │    ┌──────────────────┐    │
│   │ Logger    │    │    │ Prompt Store     │    │
│   │ Tracer    │    │    │ Experiment Mgr   │    │
│   │ Cache     │    │    │ Gradual Rollout  │    │
│   │ Retry     │    │    │ Region Router    │    │
│   │ Breaker   │    │    │ Global State     │    │
│   │ Fallback  │    │    │ Cache Warmup     │    │
│   └───────────┘    │    └──────────────────┘    │
├────────────────────┴────────────────────────────┤
│               Shared Infrastructure              │
│   Redis  │  DynamoDB  │  Prometheus  │  Docker   │
└─────────────────────────────────────────────────┘
```

---

## Step 1: Agent Registry — The Source of Truth

Every agent in the company needs a home. The registry tracks what agents exist, what tools they use, and what version is deployed.

### `src/platform/agent-registry.ts`

```typescript
// src/platform/agent-registry.ts — Central registry for all agents

export interface AgentDefinition {
  id: string;
  name: string;                     // "github-issue-manager"
  displayName: string;              // "GitHub Issue Manager"
  description: string;
  version: string;                  // SemVer
  owner: string;                    // Team name
  status: "draft" | "active" | "deprecated" | "retired";

  // Tool bindings
  tools: Array<{
    name: string;                   // "list_issues"
    source: "built-in" | "mcp-server" | "custom";
    mcpServerUrl?: string;          // If external MCP server
    required: boolean;              // Can agent run without this tool?
    permissions: string[];          // ["issues:read", "issues:write"]
  }>;

  // Deployment config
  deployment: {
    replicas: number;
    regions: string[];              // ["us-east-1", "eu-west-1"]
    resources: {
      cpu: string;                  // "0.5"
      memory: string;               // "512Mi"
    };
    environment: "development" | "staging" | "production";
  };

  // References to platform components (Days 1-5)
  promptVersionId: string | null;
  experimentName: string | null;

  createdAt: number;
  updatedAt: number;
}

export class AgentRegistry {
  private agents: Map<string, AgentDefinition> = new Map();

  /**
   * Register a new agent.
   */
  async register(definition: Omit<AgentDefinition, "id" | "createdAt" | "updatedAt">): Promise<AgentDefinition> {
    const id = definition.name.toLowerCase().replace(/[^a-z0-9-]/g, "-");

    const agent: AgentDefinition = {
      ...definition,
      id,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    // Validate
    this.validate(agent);
    this.agents.set(id, agent);

    console.log(`[Registry] Registered agent: ${agent.name} v${agent.version}`);
    return agent;
  }

  /**
   * Update an existing agent definition.
   */
  async update(id: string, patch: Partial<AgentDefinition>): Promise<AgentDefinition> {
    const existing = this.agents.get(id);
    if (!existing) throw new Error(`Agent "${id}" not found`);

    const updated: AgentDefinition = { ...existing, ...patch, id, updatedAt: Date.now() };
    this.validate(updated);
    this.agents.set(id, updated);

    return updated;
  }

  /**
   * Get agent by ID.
   */
  get(id: string): AgentDefinition | undefined {
    return this.agents.get(id);
  }

  /**
   * List all agents, optionally filtered by status.
   */
  list(filters?: { status?: string; environment?: string; owner?: string }): AgentDefinition[] {
    let results = Array.from(this.agents.values());

    if (filters?.status) results = results.filter(a => a.status === filters.status);
    if (filters?.environment) results = results.filter(a => a.deployment.environment === filters.environment);
    if (filters?.owner) results = results.filter(a => a.owner === filters.owner);

    return results.sort((a, b) => b.updatedAt - a.updatedAt);
  }

  /**
   * Find which tools are used across all agents (for impact analysis).
   */
  getToolUsage(): Map<string, string[]> {
    const usage = new Map<string, string[]>();

    for (const agent of this.agents.values()) {
      for (const tool of agent.tools) {
        const agents = usage.get(tool.name) || [];
        agents.push(agent.name);
        usage.set(tool.name, agents);
      }
    }

    return usage;
  }

  private validate(agent: AgentDefinition): void {
    if (!agent.name) throw new Error("Agent name is required");
    if (!agent.version) throw new Error("Agent version is required");

    // Validate tools have unique names
    const toolNames = agent.tools.map(t => t.name);
    if (new Set(toolNames).size !== toolNames.length) {
      throw new Error(`Duplicate tool names in agent "${agent.name}"`);
    }
  }
}
```

---

## Step 2: Platform API — Unified Interface

All platform capabilities exposed through a single REST API.

```typescript
// src/platform/api.ts — Unified platform API

import express from "express";
import { AgentRegistry, AgentDefinition } from "./agent-registry.js";
import { PromptStore } from "../experiments/prompt-store.js";
import { ExperimentManager } from "../experiments/experiment-manager.js";
import { GradualRollout } from "../experiments/rollout.js";
import { RegionRouter } from "../multi-region/region-router.js";

export function createPlatformApi(
  registry: AgentRegistry,
  promptStore: PromptStore,
  experimentManager: ExperimentManager,
  rollout: GradualRollout,
  regionRouter: RegionRouter
) {
  const router = express.Router();

  // ─── Agents ───

  router.get("/agents", (req, res) => {
    const { status, environment, owner } = req.query as any;
    res.json(registry.list({ status, environment, owner }));
  });

  router.get("/agents/:id", (req, res) => {
    const agent = registry.get(req.params.id);
    if (!agent) return res.status(404).json({ error: "Agent not found" });
    res.json(agent);
  });

  router.post("/agents", async (req, res) => {
    try {
      const agent = await registry.register(req.body);
      res.status(201).json(agent);
    } catch (error) {
      res.status(400).json({ error: String(error) });
    }
  });

  router.patch("/agents/:id", async (req, res) => {
    try {
      const agent = await registry.update(req.params.id, req.body);
      res.json(agent);
    } catch (error) {
      res.status(400).json({ error: String(error) });
    }
  });

  // ─── Tools ───

  router.get("/tools/usage", (req, res) => {
    const usage = registry.getToolUsage();
    res.json(Object.fromEntries(usage));
  });

  // ─── Prompts ───

  router.get("/agents/:id/prompts", (req, res) => {
    const agent = registry.get(req.params.id);
    if (!agent) return res.status(404).json({ error: "Agent not found" });

    // Assume agent name matches prompt name
    const versions = promptStore.listVersions(agent.name);
    res.json(versions);
  });

  router.post("/agents/:id/prompts", async (req, res) => {
    const agent = registry.get(req.params.id);
    if (!agent) return res.status(404).json({ error: "Agent not found" });

    const version = await promptStore.save({
      name: agent.name,
      content: req.body.content,
      tags: req.body.tags || [],
      metadata: {
        author: req.body.author || "unknown",
        createdAt: Date.now(),
        parentId: req.body.parentId || null,
        model: req.body.model || "gpt-4o",
        description: req.body.description || "",
      },
    });
    res.status(201).json(version);
  });

  // ─── Experiments ───

  router.post("/agents/:id/experiments", async (req, res) => {
    const agent = registry.get(req.params.id);
    if (!agent) return res.status(404).json({ error: "Agent not found" });

    const config = {
      name: req.body.name || `${agent.name}-${Date.now()}`,
      description: req.body.description,
      promptName: agent.name,
      variants: req.body.variants,
      metrics: req.body.metrics || ["tool_accuracy", "latency_p50", "error_rate"],
      startAt: Date.now(),
      durationMs: req.body.durationMs || 86400_000,
      minSampleSize: req.body.minSampleSize || 100,
      significanceLevel: req.body.significanceLevel || 0.05,
    };

    await experimentManager.start(config);
    res.status(201).json({ experimentName: config.name });
  });

  // ─── Deployments ───

  router.post("/agents/:id/deploy", async (req, res) => {
    const agent = registry.get(req.params.id);
    if (!agent) return res.status(404).json({ error: "Agent not found" });

    // Trigger rollout of the current prompt version
    if (req.body.rolloutPlan) {
      await rollout.start(req.body.rolloutPlan);
      res.json({ status: "rollout-started" });
    } else {
      // Simple deploy — set to 100%
      await promptStore.activate(agent.name, req.body.versionId, 100);
      res.json({ status: "deployed", versionId: req.body.versionId });
    }
  });

  // ─── Infrastructure ───

  router.get("/infra/regions", (req, res) => {
    res.json(regionRouter.getStatus());
  });

  // ─── Health ───

  router.get("/health", (req, res) => {
    res.json({
      status: "ok",
      agents: registry.list().length,
      timestamp: Date.now(),
    });
  });

  return router;
}
```

---

## Step 3: Agent Builder — Self-Service Agent Creation

The platform should let anyone create an agent without writing code. This is the core of self-service.

### `src/platform/agent-builder.ts`

```typescript
// src/platform/agent-builder.ts — Self-service agent factory

import { AgentRegistry, AgentDefinition } from "./agent-registry.js";
import { PromptStore } from "../experiments/prompt-store.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

interface AgentTemplate {
  id: string;
  name: string;
  description: string;
  tools: string[];             // Tool names this template needs
  defaultPrompt: string;       // Default system prompt template
  icon: string;                // Emoji or URL
}

export class AgentBuilder {
  private registry: AgentRegistry;
  private promptStore: PromptStore;
  private templates: Map<string, AgentTemplate> = new Map();

  constructor(registry: AgentRegistry, promptStore: PromptStore) {
    this.registry = registry;
    this.promptStore = promptStore;
  }

  /**
   * Register a template for agent creation.
   */
  registerTemplate(template: AgentTemplate): void {
    this.templates.set(template.id, template);
  }

  /**
   * List available templates.
   */
  listTemplates(): AgentTemplate[] {
    return Array.from(this.templates.values());
  }

  /**
   * Create an agent from a template.
   */
  async createFromTemplate(params: {
    templateId: string;
    name: string;
    team: string;
    environment?: string;
  }): Promise<{ agent: AgentDefinition; promptVersionId: string }> {
    const template = this.templates.get(params.templateId);
    if (!template) throw new Error(`Template "${params.templateId}" not found`);

    // Generate agent definition
    const agent: Omit<AgentDefinition, "id" | "createdAt" | "updatedAt"> = {
      name: params.name.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
      displayName: params.name,
      description: template.description,
      version: "1.0.0",
      owner: params.team,
      status: "draft",
      tools: template.tools.map(toolName => ({
        name: toolName,
        source: "built-in" as const,
        required: true,
        permissions: ["read"],
      })),
      deployment: {
        replicas: 1,
        regions: ["us-east-1"],
        resources: { cpu: "0.5", memory: "512Mi" },
        environment: (params.environment as any) || "development",
      },
      promptVersionId: null,
      experimentName: null,
    };

    const registered = await this.registry.register(agent);

    // Create default prompt
    const promptVersion = await this.promptStore.save({
      name: registered.name,
      content: template.defaultPrompt.replace("{{name}}", params.name),
      tags: ["default", "initial"],
      metadata: {
        author: "platform",
        createdAt: Date.now(),
        parentId: null,
        model: "gpt-4o",
        description: `Default prompt for ${params.name}`,
      },
    });

    // Activate prompt
    await this.promptStore.activate(registered.name, promptVersion.id, 100);

    return {
      agent: { ...registered, promptVersionId: promptVersion.id },
      promptVersionId: promptVersion.id,
    };
  }
}
```

### Templates:

```typescript
// Register built-in templates
const builder = new AgentBuilder(registry, promptStore);

builder.registerTemplate({
  id: "github-issue-manager",
  name: "GitHub Issue Manager",
  description: "Manage GitHub issues: list, create, update, search, comment",
  tools: ["list_issues", "get_issue", "create_issue", "update_issue", "search_issues", "add_comment"],
  defaultPrompt: `You are {{name}}, a GitHub issue management agent.
Help users find, create, and manage issues in their repositories.

Always validate issue numbers before referencing them.
When creating issues, ask for title and description.
Group related issues together in responses.`,
  icon: "🐙",
});

builder.registerTemplate({
  id: "code-review-assistant",
  name: "Code Review Assistant",
  description: "Review pull requests, suggest improvements, check for common issues",
  tools: ["list_prs", "get_pr_diff", "comment_on_pr", "check_lint", "run_tests"],
  defaultPrompt: `You are {{name}}, a code review assistant.
Review pull requests for code quality, security issues, and best practices.

Focus on:
- Security vulnerabilities (SQL injection, XSS, hardcoded secrets)
- Performance issues (N+1 queries, memory leaks)
- Code style consistency
- Missing error handling`,
  icon: "📝",
});
```

### Creating an agent via API:

```bash
# Any team member can create an agent
curl -X POST https://platform.minixium.com/v1/agents/create \
  -H "Content-Type: application/json" \
  -d '{
    "templateId": "github-issue-manager",
    "name": "Support Issue Tracker",
    "team": "support",
    "environment": "staging"
  }'

# Response:
# {
#   "agent": { "id": "support-issue-tracker", "version": "1.0.0", ... },
#   "promptVersionId": "a1b2c3d4e5f6"
# }
```

---

## Step 4: Governance — Approvals & Policies

Not every team should be able to deploy to production without review.

### `src/platform/governance.ts`

```typescript
// src/platform/governance.ts — Approval workflows and policy enforcement

export interface ApprovalPolicy {
  id: string;
  name: string;
  conditions: {
    attribute: string;        // "deployment.environment" | "tools[].permissions"
    operator: "eq" | "in" | "contains";
    value: string | string[];
  }[];
  requiredApprovals: number;  // How many approvers needed
  approverTeams: string[];    // Which teams can approve
}

export interface ApprovalRequest {
  id: string;
  agentId: string;
  changeType: "deploy" | "prompt-change" | "tool-change" | "config-change";
  requestedBy: string;
  requestedAt: number;
  status: "pending" | "approved" | "rejected";
  approvedBy: string[];
  approvedAt: number | null;
  diff: string;               // What changed
}

export class GovernanceEngine {
  private policies: ApprovalPolicy[] = [];
  private approvals: Map<string, ApprovalRequest> = new Map();

  /**
   * Register a policy.
   */
  addPolicy(policy: ApprovalPolicy): void {
    this.policies.push(policy);
  }

  /**
   * Check if a change needs approval.
   */
  needsApproval(agent: AgentDefinition, changeType: ApprovalRequest["changeType"]): boolean {
    for (const policy of this.policies) {
      const matches = policy.conditions.every(cond => {
        const value = this.getAttribute(agent, cond.attribute);
        if (cond.operator === "eq") return value === cond.value;
        if (cond.operator === "in") return Array.isArray(value) && cond.value.includes(value);
        if (cond.operator === "contains") return String(value).includes(String(cond.value));
        return false;
      });

      if (matches) return true;
    }

    return false;
  }

  /**
   * Create an approval request.
   */
  async requestApproval(
    agentId: string,
    changeType: ApprovalRequest["changeType"],
    requestedBy: string,
    diff: string
  ): Promise<ApprovalRequest> {
    const id = `apr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const request: ApprovalRequest = {
      id, agentId, changeType, requestedBy,
      requestedAt: Date.now(), status: "pending",
      approvedBy: [], approvedAt: null, diff,
    };

    this.approvals.set(id, request);

    console.log(`[Governance] Approval request ${id}: ${changeType} for ${agentId}`);
    return request;
  }

  /**
   * Approve a request.
   */
  async approve(approvalId: string, by: string): Promise<ApprovalRequest> {
    const request = this.approvals.get(approvalId);
    if (!request) throw new Error(`Approval request "${approvalId}" not found`);
    if (request.status !== "pending") throw new Error("Request already processed");

    request.approvedBy.push(by);

    // Check if we have enough approvals
    const policy = this.policies.find(p =>
      request.agentId.startsWith(p.conditions[0]?.value as string)
    );
    const required = policy?.requiredApprovals || 1;

    if (request.approvedBy.length >= required) {
      request.status = "approved";
      request.approvedAt = Date.now();
    }

    return request;
  }

  /**
   * Reject a request.
   */
  async reject(approvalId: string, by: string): Promise<ApprovalRequest> {
    const request = this.approvals.get(approvalId);
    if (!request) throw new Error(`Approval request "${approvalId}" not found`);

    request.status = "rejected";
    return request;
  }

  private getAttribute(obj: any, path: string): any {
    return path.split(".").reduce((o, key) => o?.[key], obj);
  }
}
```

### Default policies:

```typescript
const governance = new GovernanceEngine();

// Production deployments need 2 approvals
governance.addPolicy({
  id: "prod-deploy-approval",
  name: "Production deployment requires approval",
  conditions: [
    { attribute: "deployment.environment", operator: "eq", value: "production" },
  ],
  requiredApprovals: 2,
  approverTeams: ["platform-engineering"],
});

// Tools with write permissions need review
governance.addPolicy({
  id: "write-tool-review",
  name: "Write tools require security review",
  conditions: [
    { attribute: "tools", operator: "contains", value: "write" },
  ],
  requiredApprovals: 1,
  approverTeams: ["security"],
});
```

---

## Step 5: Platform Dashboard — Single Pane of Glass

All agents, their health, and their metrics in one place.

### `src/platform/dashboard-service.ts`

```typescript
// src/platform/dashboard-service.ts — Aggregation service for platform dashboard

import { AgentRegistry } from "./agent-registry.js";
import { GlobalStateStore } from "../multi-region/global-state.js";
import { RegionRouter } from "../multi-region/region-router.js";

export interface DashboardData {
  summary: {
    totalAgents: number;
    activeAgents: number;
    totalSessions: number;
    activeSessions: number;
    avgLatency: number;
    avgAccuracy: number;
    errorRate: number;
    cacheHitRate: number;
  };
  agents: AgentSummary[];
  regions: RegionSummary[];
}

export interface AgentSummary {
  id: string;
  name: string;
  status: string;
  environment: string;
  version: string;
  sessions: number;
  uptime: number;           // Percentage
}

export interface RegionSummary {
  name: string;
  status: string;
  sessions: number;
  failovers: number;
}

export class DashboardService {
  private registry: AgentRegistry;
  private globalState: GlobalStateStore;
  private regionRouter: RegionRouter;

  constructor(
    registry: AgentRegistry,
    globalState: GlobalStateStore,
    regionRouter: RegionRouter
  ) {
    this.registry = registry;
    this.globalState = globalState;
    this.regionRouter = regionRouter;
  }

  async getDashboard(): Promise<DashboardData> {
    const agents = this.registry.list();
    const sessionStats = await this.globalState.stats();
    const regionStatus = this.regionRouter.getStatus();

    return {
      summary: {
        totalAgents: agents.length,
        activeAgents: agents.filter(a => a.status === "active" && a.deployment.environment === "production").length,
        totalSessions: sessionStats.totalSessions,
        activeSessions: sessionStats.activeSessions,
        avgLatency: 0,      // From Prometheus
        avgAccuracy: 0,     // From experiment manager
        errorRate: 0,       // From Day 3 error handler
        cacheHitRate: 0,    // From Day 2 cache
      },
      agents: agents.map(a => ({
        id: a.id,
        name: a.displayName,
        status: a.status,
        environment: a.deployment.environment,
        version: a.version,
        sessions: 0,
        uptime: 99.9,
      })),
      regions: regionStatus.regions.map(r => ({
        name: r.name,
        status: r.status,
        sessions: sessionStats.byRegion[r.name] || 0,
        failovers: 0, // From failover history
      })),
    };
  }
}
```

---

## Step 6: Putting It All Together — Platform Server

### `src/platform/server.ts`

```typescript
import express from "express";
import { AgentRegistry } from "./agent-registry.js";
import { AgentBuilder } from "./agent-builder.js";
import { GovernanceEngine } from "./governance.js";
import { DashboardService } from "./dashboard-service.js";
import { createPlatformApi } from "./api.js";
import { PromptStore } from "../experiments/prompt-store.js";
import { ExperimentManager } from "../experiments/experiment-manager.js";
import { GradualRollout } from "../experiments/rollout.js";
import { RegionRouter } from "../multi-region/region-router.js";
import { GlobalStateStore } from "../multi-region/global-state.js";

async function main() {
  // Initialize platform components
  const registry = new AgentRegistry();
  const promptStore = new PromptStore("./data/prompts");
  await promptStore.init();
  const experimentManager = new ExperimentManager(promptStore);
  const rollout = new GradualRollout(promptStore);
  const regionRouter = new RegionRouter([
    { name: "us-east-1", endpoint: "https://agent-us.minixium.com", weight: 50, priority: 0, status: "active" },
    { name: "eu-west-1", endpoint: "https://agent-eu.minixium.com", weight: 30, priority: 1, status: "active" },
    { name: "ap-southeast-1", endpoint: "https://agent-ap.minixium.com", weight: 20, priority: 2, status: "active" },
  ]);
  const globalState = new GlobalStateStore(process.env.AWS_REGION || "us-east-1");
  const governance = new GovernanceEngine();
  const dashboard = new DashboardService(registry, globalState, regionRouter);

  // Initialize builder with templates
  const builder = new AgentBuilder(registry, promptStore);

  // Set up governance policies
  governance.addPolicy({
    id: "prod-deploy", name: "Production deployment requires approval",
    conditions: [{ attribute: "deployment.environment", operator: "eq", value: "production" }],
    requiredApprovals: 2, approverTeams: ["platform-engineering"],
  });

  // Create Express app
  const app = express();
  app.use(express.json());

  // Mount platform API
  const platformRouter = createPlatformApi(
    registry, promptStore, experimentManager, rollout, regionRouter
  );
  app.use("/v1", platformRouter);

  // Agent builder endpoint
  app.post("/v1/agents/create", async (req, res) => {
    try {
      const result = await builder.createFromTemplate(req.body);
      res.status(201).json(result);
    } catch (error) {
      res.status(400).json({ error: String(error) });
    }
  });

  // Governance endpoints
  app.get("/v1/approvals", (req, res) => {
    // List pending approvals
    res.json({ approvals: [] });
  });

  app.post("/v1/approvals/:id/approve", async (req, res) => {
    const approval = await governance.approve(req.params.id, req.body.approvedBy);
    res.json(approval);
  });

  app.post("/v1/approvals/:id/reject", async (req, res) => {
    const approval = await governance.reject(req.params.id, req.body.rejectedBy);
    res.json(approval);
  });

  // Dashboard
  app.get("/v1/dashboard", async (req, res) => {
    const data = await dashboard.getDashboard();
    res.json(data);
  });

  // Start server
  const PORT = process.env.PORT || 8080;
  app.listen(PORT, () => {
    console.log(`Agent Platform running on port ${PORT}`);
  });
}

main().catch(console.error);
```

---

## Step 7: Onboarding a New Team

Here's what using the platform looks like from a team's perspective:

### Scenario: The Support Team Wants an Agent

```bash
# 1. Browse available templates
curl https://platform.minixium.com/v1/templates
# → ["github-issue-manager", "code-review-assistant", ...]

# 2. Create an agent from template (self-service)
curl -X POST https://platform.minixium.com/v1/agents/create \
  -d '{
    "templateId": "github-issue-manager",
    "name": "Support Issue Tracker",
    "team": "support",
    "environment": "staging"
  }'
# → { agent: { id: "support-issue-tracker", ... }, promptVersionId: "abc" }

# 3. Customize the prompt
curl -X POST https://platform.minixium.com/v1/agents/support-issue-tracker/prompts \
  -d '{
    "content": "You are Support Issue Tracker... (custom prompt)",
    "tags": ["support-customized"]
  }'

# 4. Deploy to staging
curl -X POST https://platform.minixium.com/v1/agents/support-issue-tracker/deploy \
  -d '{
    "versionId": "abc",
    "rolloutPlan": {
      "steps": [
        { "percent": 10, "durationMs": 3600000 },
        { "percent": 50, "durationMs": 86400000 },
        { "percent": 100, "durationMs": 0 }
      ]
    }
  }'

# 5. When ready, request production deployment
curl -X POST https://platform.minixium.com/v1/agents/support-issue-tracker/deploy \
  -d '{
    "versionId": "def",
    "environment": "production"
  }'
# → { status: "approval-required", approvalId: "apr-..." }

# 6. Platform engineering approves
curl -X POST https://platform.minixium.com/v1/approvals/apr-.../approve \
  -d '{ "approvedBy": "tech-lead" }'

# 7. Monitor on dashboard
curl https://platform.minixium.com/v1/dashboard
```

---

## Step 8: Platform Architecture Summary

```
┌──────────────────────────────────────────────────────┐
│                   Agent Portal                        │
│  Browse templates  │  Create agents  │  Monitor       │
└──────────────────────┬───────────────────────────────┘
                       │
┌──────────────────────▼───────────────────────────────┐
│                  Platform API (REST)                  │
│                                                       │
│  POST /v1/agents           POST /v1/prompts           │
│  POST /v1/agents/create    POST /v1/experiments       │
│  POST /v1/agents/:id/deploy                           │
│  POST /v1/approvals/:id/approve                       │
│  GET  /v1/dashboard                                   │
└──────────────────────┬───────────────────────────────┘
                       │
┌──────────────────────▼───────────────────────────────┐
│               Platform Services                        │
│                                                       │
│  AgentRegistry  │  AgentBuilder  │  GovernanceEngine  │
│  PromptStore    │  ExperimentMgr │  DashboardService  │
└──────────────────────┬───────────────────────────────┘
                       │
┌──────────────────────▼───────────────────────────────┐
│               Agent Runtime (per agent)               │
│                                                       │
│  Logger  │  Tracer  │  Cache  │  Breaker  │  Fallback │
│  Retry   │  Checkpoint  │  Region Router              │
└──────────────────────┬───────────────────────────────┘
                       │
┌──────────────────────▼───────────────────────────────┐
│               Shared Infrastructure                   │
│                                                       │
│  Redis  │  DynamoDB  │  Prometheus  │  Docker/k8s     │
└──────────────────────────────────────────────────────┘
```

---

## What You Built (Days 1-6)

| Day | Component | What it does |
|-----|-----------|-------------|
| 1 | **Observability & Telemetry** | Logger, tracer, metrics, loop detection, session store |
| 2 | **Caching Strategies** | Three-layer cache (exact, semantic, tool-result) |
| 3 | **Error Handling & Resilience** | Retry, circuit breaker, fallback, graceful degradation |
| 4 | **A/B Testing** | Prompt versioning, experiments, gradual rollout, evaluation |
| 5 | **Multi-Region & HA** | Region routing, global state, failover, cache warmup |
| 6 | **Internal Agent Platform** | Registry, builder, governance, dashboard, unified API |

---

## Summary

| Concept | Implementation | Benefit |
|---------|---------------|---------|
| Agent registry | `AgentRegistry` — source of truth | Know what agents exist |
| Self-service creation | `AgentBuilder` with templates | Any team can create an agent |
| Governance | `GovernanceEngine` with policies | Production changes need approval |
| Unified API | Express router (v1/) | Single entry point for everything |
| Dashboard | `DashboardService` | See all agents in one place |
| Tool catalog | `getToolUsage()` | Impact analysis for changes |

### Final Checklist:
- [ ] Agent registry tracks all agents centrally
- [ ] Self-service agent creation from templates
- [ ] Governance policies enforce approval workflows
- [ ] Platform API exposes all Days 1-5 capabilities
- [ ] Dashboard aggregates all agent health
- [ ] Tool usage tracking for impact analysis
- [ ] Onboarding documented for new teams

---

| Day | Topic |
|-----|-------|
| 1 | Observability & Telemetry ✅ |
| 2 | Caching Strategies ✅ |
| 3 | Error Handling & Resilience ✅ |
| 4 | A/B Testing Prompts & Configs ✅ |
| 5 | Multi-Region & High Availability ✅ |
| 6 | **Building an Internal Agent Platform ✅** |

---

*Series: AI Agents in Production. Day 6: Internal Agent Platform wrapping all previous 5 days into self-service agent creation, governance, and unified API. Full TypeScript source code included.*
