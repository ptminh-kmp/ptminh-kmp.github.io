---
title: "AI Agents trong Production — Day 6: Building an Internal Agent Platform"
description: "Gói tất cả 5 ngày trước vào một nền tảng nội bộ. Agent registry, self-service creation, governance (approval workflows), dashboard unified."
published: 2026-06-18
pubDate: 2026-06-18T09:00:00.000Z
slug: ai-agents-in-production-internal-agent-platform-vi
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
lang: vi
series:
  name: "AI Agents in Production"
  order: 6
  total: 6
---

Năm ngày xây dựng agent infrastructure. Giờ gói nó thành platform.

Khác biệt giữa một đống agents và một platform là **reusability, governance, và self-service**. Ai trong công ty cũng có thể tạo và deploy agent mà không cần biết circuit breaker, cache invalidation, hay multi-region failover.

Bài này gói Days 1-5 vào Internal Agent Platform (IAP):

```
Agent Portal (UI)
  ├── Agent Registry
  ├── Tool Catalog
  └── Deployments

Platform API (REST)
  ├── Agent Builder (templates)
  ├── Governance (approvals)
  └── Dashboard (single pane)

Agent Runtime (Days 1-3)
  ├── Logger / Tracer / Cache
  ├── Retry / Breaker / Fallback
  └── Prompt Store / Experiment

Infrastructure Layer (Days 4-5)
  ├── Region Router
  ├── Global State
  └── Cache Warmup
```

---

## Step 1: Agent Registry — Source of Truth

Mọi agent trong công ty đều có định danh duy nhất.

### `src/platform/agent-registry.ts`

```typescript
export interface AgentDefinition {
  id: string;
  name: string;
  displayName: string;
  version: string;
  owner: string;                    // Team
  status: "draft" | "active" | "deprecated" | "retired";
  tools: Array<{
    name: string;
    source: "built-in" | "mcp-server";
    required: boolean;
    permissions: string[];
  }>;
  deployment: {
    replicas: number;
    regions: string[];
    environment: "development" | "staging" | "production";
  };
  promptVersionId: string | null;
}

export class AgentRegistry {
  private agents = new Map<string, AgentDefinition>();

  async register(def: Omit<AgentDefinition, "id" | "createdAt" | "updatedAt">): Promise<AgentDefinition> {
    const id = def.name.toLowerCase().replace(/[^a-z0-9-]/g, "-");
    const agent = { ...def, id, createdAt: Date.now(), updatedAt: Date.now() };
    this.validate(agent);
    this.agents.set(id, agent);
    return agent;
  }

  list(filters?: { status?: string; environment?: string; owner?: string }): AgentDefinition[] {
    let r = Array.from(this.agents.values());
    if (filters?.status) r = r.filter(a => a.status === filters.status);
    if (filters?.owner) r = r.filter(a => a.owner === filters.owner);
    return r.sort((a, b) => b.updatedAt - a.updatedAt);
  }

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
}
```

---

## Step 2: Agent Builder — Self-Service

Bất kỳ team nào cũng có thể tạo agent từ template, không cần viết code.

### `src/platform/agent-builder.ts`

```typescript
interface AgentTemplate {
  id: string;
  name: string;
  description: string;
  tools: string[];
  defaultPrompt: string;
  icon: string;
}

export class AgentBuilder {
  private templates = new Map<string, AgentTemplate>();

  registerTemplate(t: AgentTemplate): void { this.templates.set(t.id, t); }

  async createFromTemplate(params: {
    templateId: string; name: string; team: string; environment?: string;
  }) {
    const t = this.templates.get(params.templateId);
    if (!t) throw new Error(`Template "${params.templateId}" not found`);

    // Auto-generate agent definition + default prompt
    // Activate prompt at 100%
    // Return agent + promptVersionId
  }
}

// Templates built-in
builder.registerTemplate({
  id: "github-issue-manager",
  name: "GitHub Issue Manager",
  tools: ["list_issues", "get_issue", "create_issue", "search_issues", "add_comment"],
  defaultPrompt: "You are {{name}}, a GitHub issue management agent...",
  icon: "🐙",
});

builder.registerTemplate({
  id: "code-review-assistant",
  name: "Code Review Assistant",
  tools: ["list_prs", "get_pr_diff", "comment_on_pr", "check_lint", "run_tests"],
  defaultPrompt: "You are {{name}}, a code review assistant...",
  icon: "📝",
});
```

**Tạo agent chỉ với 1 API call:**

```bash
curl -X POST https://platform.company.com/v1/agents/create \
  -d '{
    "templateId": "github-issue-manager",
    "name": "Support Issue Tracker",
    "team": "support"
  }'
```

---

## Step 3: Governance — Approval Workflows

Không phải ai cũng được deploy production mà không review.

### `src/platform/governance.ts`

```typescript
export class GovernanceEngine {
  private policies = new Map<string, ApprovalPolicy>();

  addPolicy(p: ApprovalPolicy): void { /* ... */ }

  needsApproval(agent: AgentDefinition, type: string): boolean {
    // Kiểm tra tất cả policies
    // Nếu agent deploy production → cần 2 approvals từ platform-engineering
  }

  async requestApproval(agentId: string, changeType: string, requestedBy: string): Promise<ApprovalRequest> {
    // Tạo request pending
  }

  async approve(id: string, by: string): Promise<ApprovalRequest> {
    // Nếu đủ approvals → auto-approve
  }
}

// Policies mặc định:
governance.addPolicy({
  id: "prod-deploy",
  conditions: [{ attribute: "deployment.environment", operator: "eq", value: "production" }],
  requiredApprovals: 2,
  approverTeams: ["platform-engineering"],
});
```

---

## Step 4: Unified Platform API

### `src/platform/api.ts`

```
GET    /v1/agents                  → list agents
GET    /v1/agents/:id              → get agent
POST   /v1/agents                  → register agent
PATCH  /v1/agents/:id              → update agent
POST   /v1/agents/create           → create from template
GET    /v1/agents/:id/prompts      → list prompt versions
POST   /v1/agents/:id/prompts     → new prompt version
POST   /v1/agents/:id/experiments → start A/B test
POST   /v1/agents/:id/deploy      → deploy / rollout
GET    /v1/tools/usage             → tool impact analysis
POST   /v1/approvals/:id/approve  → approve deployment
POST   /v1/approvals/:id/reject   → reject deployment
GET    /v1/dashboard               → aggregated metrics
GET    /v1/infra/regions           → region status
```

---

## Step 5: Onboarding Flow

**Support team muốn có agent:**

```bash
# 1. Browse templates
GET /v1/templates

# 2. Tạo agent từ template
POST /v1/agents/create → support-issue-tracker

# 3. Custom prompt
POST /v1/agents/support-issue-tracker/prompts

# 4. Deploy staging
POST /v1/agents/support-issue-tracker/deploy

# 5. Deploy production → cần approval
POST /v1/agents/support-issue-tracker/deploy
→ { status: "approval-required", approvalId: "apr-..." }

# 6. Platform engineering approve
POST /v1/approvals/apr-.../approve

# 7. Monitor dashboard
GET /v1/dashboard
```

---

## Summary

| Concept | Implementation |
|---------|---------------|
| Agent registry | AgentRegistry — source of truth |
| Self-service | AgentBuilder với templates |
| Governance | GovernanceEngine với policies |
| Unified API | Express router v1/ |
| Dashboard | DashboardService — aggregate metrics |

### Final Checklist:
- [ ] Registry tracks tất cả agents
- [ ] Self-service agent creation từ templates
- [ ] Governance policies enforce approvals
- [ ] Dashboard aggregates health
- [ ] Tool usage tracking cho impact analysis

---

| Day | Chủ đề |
|-----|--------|
| 1 | Observability & Telemetry ✅ |
| 2 | Caching Strategies ✅ |
| 3 | Error Handling & Resilience ✅ |
| 4 | A/B Testing Prompts & Configs ✅ |
| 5 | Multi-Region & High Availability ✅ |
| 6 | **Building an Internal Agent Platform ✅** |

---

*Series: AI Agents trong Production. Day 6: Internal Agent Platform wrapping Days 1-5 vào self-service creation, governance, và unified API.*
