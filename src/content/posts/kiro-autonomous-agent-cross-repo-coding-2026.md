---
title: "Kiro Autonomous Agent: Cross-Repo Coding at Scale"
description: "Deep dive into Kiro's autonomous agent (Web interface) — async, cross-repo coding that runs independently for hours or days. Sub-agent architecture, sandbox isolation, GitHub integration, and real-world workflow examples."
published: 2026-05-12
pubDate: 2026-05-12T10:00:00.000Z
slug: kiro-autonomous-agent-cross-repo-coding-2026
tags:
  - kiro
  - aws
  - autonomous-agent
  - cross-repo
  - sub-agents
  - sandbox
  - frontier-agents
  - ci-cd
category: ai-agents
lang: en
series:
  name: "Practical Kiro — AWS's Agentic Development Environment"
  order: 5
  total: 6
---

On Day 0, we introduced Kiro's three surfaces: IDE, CLI, and Autonomous Agent. Days 1-3 covered the IDE and CLI in depth. Today, we tackle the most ambitious piece — the **Kiro Autonomous Agent** running in the Web interface at [app.kiro.dev/agent](https://app.kiro.dev/agent).

This is the mode that lets you delegate work and walk away. The agent works independently for hours or days, maintaining context across sessions, coordinating changes across multiple repositories, and managing its own sandboxed development environment.

If spec-driven development is Kiro telling you what it plans to build, the autonomous agent is Kiro telling you what it already built — while you were asleep.

---

## What Makes It Autonomous?

The term "autonomous" in AI coding tools gets thrown around loosely. Most tools claiming autonomy are still session-based: open a chat, describe a task, wait for completion, close the chat — forget everything.

Kiro's autonomous agent is different:

| Property | IDE Agent | CLI Agent | **Autonomous Agent** |
|----------|-----------|-----------|---------------------|
| **Session persistence** | Session-only | Session-only | **Persistent across sessions** |
| **Context scope** | Current project | Current directory | **Multiple repositories** |
| **Execution model** | Synchronous (wait) | Synchronous (wait) | **Async (fire and forget)** |
| **Duration** | Minutes | Minutes | **Hours to days** |
| **Sub-agents** | No | No | **Yes (3 specialized roles)** |
| **Sandbox** | Your machine | Your machine | **Isolated cloud sandbox** |
| **Concurrency** | Sequential | Sequential | **Up to 10 concurrent tasks** |
| **GitHub integration** | Manual | Manual | **Issue → PR full cycle** |
| **Learning** | None | None | **Remembers feedback across tasks** |

The last row is the most important: **the autonomous agent learns**. When you leave PR feedback like "always use our error handling pattern," it remembers and applies that pattern to future work — automatically.

---

## Architecture: How It Works

When you assign a task to the autonomous agent, here's what happens under the hood:

```
┌─ You describe a task ─────────────────────────────┐
│ "Upgrade lodash across all 15 microservices"      │
└────────────────────────┬───────────────────────────┘
                         ↓
┌─ Task Analysis ───────────────────────────────────┐
│ - Identifies affected repos                        │
│ - Analyzes how each service uses lodash            │
│ - Creates requirements and acceptance criteria    │
└────────────────────────┬───────────────────────────┘
                         ↓
┌─ Sandbox Provisioning ───────────────────────────┐
│ - Spins up isolated cloud environment             │
│ - Configures network access (Integration only)   │
│ - Clones repositories and reads codebase          │
│ - Detects dev environment (Dockerfile/DevFile)    │
└────────────────────────┬───────────────────────────┘
                         ↓
┌─ Sub-Agent Orchestration ─────────────────────────┐
│                                                    │
│  Research Agent ──→ Code Agent ──→ Verify Agent    │
│  (plan approach)  (implement)  (run tests/safety)  │
│                                                    │
│ Each coordinates via the task spec.                │
│ Agent asks questions when uncertain.               │
└────────────────────────┬───────────────────────────┘
                         ↓
┌─ Pull Request Output ─────────────────────────────┐
│ - Opens 15 PRs with detailed explanations          │
│ - Each PR has: changed files, test results,        │
│   implementation decisions, migration notes        │
│ - Self-fixes based on your feedback                │
└────────────────────────────────────────────────────┘
```

## The Sub-Agent Model

The autonomous agent uses three specialized sub-agents that work together:

### 1. Research & Planning Agent

This agent doesn't write code. It analyzes:

- **Codebase structure** — How is the project organized? What patterns are in use?
- **Dependencies** — Which packages are imported? What versions? Any known breaking changes?
- **Architecture** — Follows the steering file's architecture rules
- **Previous work** — References learnings from prior tasks and PR feedback

It produces the task plan (the same structured plan from Day 2's spec-driven workflow) and hands it off.

### 2. Code Agent

This agent implements the actual changes. It:

- Creates new files following your project's conventions
- Modifies existing files without breaking adjacent code
- Generates migration scripts for database changes
- Updates configuration files as needed

The code agent respects your steering file's rules about code style, architecture, and security.

### 3. Verification Agent

This agent runs after every change:

- Executes the project's test suite
- Runs linting and type checking
- Scans for security issues (hardcoded secrets, SQL injection)
- Validates against the spec's acceptance criteria
- Reports any failures with specific file and line references

If the verification agent finds issues, it loops back to the code agent for fixes before proceeding.

### Sub-Agent Communication

All three agents share a **task spec** — the same structured document from Day 2. This is the single source of truth they coordinate around. The research agent writes the plan, the code agent implements it, and the verification agent checks it — all against the same spec.

When the code agent encounters ambiguity, it consults the research agent. When the verification agent finds a failure, it sends the stack trace back to the code agent. This multi-agent architecture is more reliable than a single LLM call because each agent specializes and double-checks the others.

---

## The Sandbox Environment

Every autonomous agent task runs in its own isolated sandbox — a cloud VM provisioned per task.

### Environment Setup

The agent automatically detects:

1. **Dockerfile** — If found, builds the full container environment
2. **DevFile** — Follows the specification for tools, runtimes, and dependencies
3. **Project structure** — If neither exists, analyzes package.json, requirements.txt, etc.

This auto-detection is critical for consistency. Your CI pipeline and your autonomous agent run in equivalent environments.

### Network Controls

Configured per task with four levels:

| Level | Access | Use Case |
|-------|--------|----------|
| **Integration only** | GitHub proxy only | Safe default for code tasks |
| **Common dependencies** | npm, PyPI, Maven + GitHub proxy | Dependency updates |
| **Open internet** | Full network access | Web scraping, external API integrations |
| **Custom** | Domain allowlist | Enterprise security policies |

For the lodash upgrade example, "Common dependencies" is sufficient — the agent needs npm for the new lodash version and GitHub for PR creation.

### Secrets Management

Environment variables and secrets are configured per task:

```json
{
  "env": {
    "NPM_TOKEN": "${NPM_TOKEN}",
    "GITHUB_TOKEN": "${GITHUB_TOKEN}"
  },
  "secrets": {
    "STRIPE_API_KEY": "${STRIPE_SECRET}"
  }
}
```

Secrets are:
- Stored encrypted at rest
- Never exposed in logs, error messages, or PR descriptions
- Injected as environment variables in the sandbox
- Scoped to a single task or session

---

## GitHub Integration: Issues to PR

The autonomous agent integrates deeply with GitHub. You can assign work directly from GitHub issues without opening Kiro at all.

### Label-Based Assignment

Add the `kiro` label to any GitHub issue:

```bash
# From GitHub UI: add label "kiro" to issue #42
# Kiro picks it up within minutes
```

### Comment-Based Assignment

Use `/kiro` in a GitHub issue comment to assign specific work:

```
/kiro Implement rate limiting on the /api/login endpoint
Use the existing rate-limiter middleware pattern from src/middleware/.
Add tests for: normal flow, exceeded limit, reset after window.
```

Kiro listens to all subsequent comments on the issue for:
- Clarifications to the original request
- Feedback on intermediate results
- Steering adjustments

### PR Auto-Fix

When you leave review feedback on a PR that Kiro created:

```
"Please use our standard error response format: { error: string, code: string }"
```

Kiro doesn't just fix that PR. It **remembers** the preference and applies it to future work automatically. This is the learning mechanism — your feedback trains the agent's understanding of your team's standards.

---

## Real Workflow: Upgrade a Library Across 15 Microservices

Let's trace the exact workflow that makes the autonomous agent shine.

**The task:** Upgrading lodash from v4.17 to v5.0 across a microservices architecture. This is a breaking change — `_.chain` was removed, some utility functions changed signatures.

### Step 1: Task Definition

In the autonomous agent chat at [app.kiro.dev/agent](https://app.kiro.dev/agent):

> "Upgrade lodash from 4.17 to 5.0 across all microservices in the saaskit-org. Handle breaking changes: _.chain removal, _.flatten signature change, _.extend behavior change. Run tests after each upgrade. Open individual PRs per service."

### Step 2: Analysis

The agent:
1. Queries GitHub for all repos under `saaskit-org` containing lodash in package.json
2. Finds 15 affected services
3. Analyzes each service's lodash usage patterns
4. Identifies which breaking changes apply to which service
5. Creates a task plan sorted by risk: low-usage services first, critical services last

### Step 3: Execution

For each service:

1. Clone → create branch → update lodash → fix breaking changes → update tests → run test suite → create PR
2. If tests fail, analyze failure and retry with different approach
3. If retry fails too, mark PR as needing human review

All 15 services processed asynchronously. Each gets its own sandbox, its own sub-agent team, its own PR.

### Step 4: PR Output

Each PR includes:
- Summary of lodash changes applied
- Breaking changes handled and how
- Test results (passed/failed with coverage delta)
- Migration notes for the team
- Any decisions that need human review

### Step 5: Feedback Loop

You review PR #1 and comment:

> "For the _.chain removal — use the pipe pattern from fp/ instead of native Promise.all"

Kiro updates PR #1 and **applies the same pattern** to PRs #2-15 automatically. Those teams don't need to repeat the same feedback.

### Time Comparison

| Approach | Time | Quality |
|----------|------|---------|
| Manual (15 devs) | 3-5 days | Inconsistent per dev |
| IDE agent (sequential) | 1-2 days | Consistent within session, but each session is isolated |
| **Autonomous agent** | **3-6 hours** | **Consistent across all repos, learns from feedback** |

---

## Concurrency and Limits

The autonomous agent executes up to **10 concurrent tasks**. Each task gets its own sandbox, sub-agent team, and resource allocation.

| Plan | Concurrent Tasks | Sandbox Duration | Sandbox Storage |
|------|-----------------|-----------------|-----------------|
| Pro | Up to 10 | 72 hours per task | 10 GB |
| Pro+ | Up to 10 | 72 hours per task | 25 GB |
| Power | Up to 10 | 7 days per task | 50 GB |

Tasks that exceed duration limits get an "extend" option. Completed tasks are cleaned up automatically to free resources.

---

## When to Use the Autonomous Agent

### Perfect Fit

- **Cross-repo refactoring** — Rename a shared library, upgrade a dependency, change an API contract
- **Large-scale migrations** — Framework upgrades (React 18 → 19), database migrations, cloud provider changes
- **Tech debt reduction** — Replace deprecated APIs, remove unused code, standardize patterns across repos
- **Security patching** — CVE fixes across the entire organization in hours instead of weeks
- **Onboarding automation** — Set up new microservices following established patterns

### Avoid When

- **One-line fixes** — Faster to do yourself
- **Exploratory work** — Vibe mode in IDE is better for rapid iteration
- **Highly sensitive production** — Use per-file approval mode in IDE instead
- **Tasks requiring real-time interaction** — The agent is async by design

---

## Monitoring and Steering

The autonomous agent provides real-time status updates:

```
🔄 Analyzing 15 repos for lodash usage...
✅ 15 repos found, 12 with direct lodash imports, 3 with transitive deps
🔄 Creating task plan sorted by migration risk...
✅ Task plan created: 15 tasks, estimated 4-6 hours
🔄 Executing Task 1: user-service (low risk)...
   • 3 minutes: lodash updated
   • 30 seconds: 2 breaking changes fixed
   • 45 seconds: all tests pass
   • 15 seconds: PR opened
🔄 Executing Task 2: payment-service (medium risk)...
   • 3 minutes: lodash updated
   • 2 minutes: 7 breaking changes fixed
   • 1 minute: tests failed (_.extend replacement)
   • 2 minutes: retrying with different approach...
```

You can pause, redirect, or cancel individual tasks from the Web interface. The agent asks questions when it encounters ambiguity, but you can also proactively send steering instructions mid-task.

---

## What's Next

Day 5 wraps up the series with **Security, Best Practices, and Real Talk** — the December 2025 AWS outage analyzed, permission scoping strategies, sandbox hardening, when (and when not) to use Kiro, and a final decision framework for choosing Kiro over other AI coding tools.

---

*Series: Practical Kiro — AWS's Agentic Development Environment. Day 4: Autonomous Agent (Web). Day 5: Security, Best Practices & Real Talk → coming next.*
