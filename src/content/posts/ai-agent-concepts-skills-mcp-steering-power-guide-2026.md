---
lang: en
title: "Skills, MCP, Steering, Power: The Four Concepts You Actually Need to Understand About AI Agents"
description: "Forget the hype. Here's a clear, example-driven explanation of the four concepts that actually matter when working with AI coding agents in 2026 — Skills (what the agent can do), MCP (how it connects to the world), Steering (how you control it), and Power (what model it runs on)."
published: 2026-04-30
category: AI
tags: ["AI Agents", "MCP", "Skills", "Steering", "Prompt Engineering", "Claude Code", "Agent Architecture", "Developer Tools"]
author: minhpt
mermaid: false
---

If you've been following AI agents in 2026, you've seen these four words everywhere: **Skills, MCP, Steering, Power.** They get thrown around at every conference, every blog post, every product launch.

But nobody stops to explain what they actually *mean* — especially how they relate to each other. Is a Skill the same as an MCP server? Is Steering just prompt engineering with a fancy name? Does Power mean the size of the model or the context window?

Let's fix that. With real examples.

## The One Metaphor

Think of an AI agent as a **software engineering team**:

| Concept | Team Analogy | What It Is |
|---|---|---|
| **Power** | The senior engineer | The AI model — experience, speed, architecture ability |
| **Skills** | The team's runbooks & playbooks | Step-by-step SOPs for each type of task |
| **MCP** | The infrastructure & API keys | Connecting to databases, GitHub, Slack, etc. |
| **Steering** | The sprint board & code review | How you assign work, approve plans, and review output |

A team with a brilliant senior engineer (Power) but no runbooks (Skills), no database access (MCP), and a chaotic no-review policy (Steering) won't ship anything reliable. All four must work together.

Another way to visualize it: Power is the *person*, Skills are the *process*, MCP is the *infrastructure*, and Steering is the *governance*.

---

## 1. Power: The Senior Engineer

**What it is:** The AI model running the agent — its capabilities, speed, cost, and context size.

**The simple version:** Power is "who's writing the code." A staff engineer with 15 years of experience (Opus) can design a distributed system from scratch. A junior dev (Haiku) can fix a CSS bug all day but shouldn't be given architecture decisions.

### What actually matters about Power

| Factor | Low Power (Junior) | High Power (Staff Engineer) | Impact |
|---|---|---|---|
| **Model size** | 7B parameters (Haiku) | Hundreds of billions (Opus) | Quality of reasoning |
| **Context window** | 32K tokens | 200K+ tokens | How much code it sees at once |
| **Speed** | Fast (junior cranks through tickets) | Slow (staff thinks before coding) | Time per task |
| **Cost** | Cheap ($0.03/task) | Expensive ($0.30+/task) | Your budget |
| **Reasoning depth** | Follows patterns | Designs patterns | Handling complex bugs |

### Real example

```bash
# Low Power — Haiku (junior: fast, cheap, needs supervision)
$ claude -m claude-haiku "Fix the typo in the README"
  → Fixed in 2 seconds, cost $0.01
  (Perfect task for a junior — well-defined, low risk)

# Medium Power — Sonnet (mid-level: reliable daily driver)
$ claude -m claude-sonnet "Refactor this auth module to use OAuth2"
  → 30 seconds, cost $0.08, good result
  (Standard feature work — sweet spot for most tasks)

# High Power — Opus (staff engineer: slow, expensive, deep)
$ claude -m claude-opus "Find the memory leak in this 50K-line Rust codebase"
  → 3 minutes, cost $0.50, found it
  (You call the staff engineer when the juniors and mid-level are stuck)
```

### How to think about Power

**Don't assign your staff engineer to fix button alignment.** Use the cheapest model that can do the job:

- **Haiku (junior):** Typo fixes, simple refactors, documentation
- **Sonnet (mid-level):** Feature implementation, bug fixes, code review — your daily workhorse
- **Opus/GPT-5.5 (staff engineer):** Complex architecture, system redesign, novel code — use sparingly
- **DeepSeek-V4 (contractor):** Cost-effective alternative, often mid-level quality at junior prices

The art of Power management is knowing *when* to pay for a staff engineer's brain and *when* a junior can handle it. Most teams blow 70% of their AI budget on staff engineers doing junior work.

---

## 2. Skills: The Team's Runbooks

**What it is:** Reusable instruction sets that teach the agent *how* to perform specific tasks — procedures, conventions, and guardrails for a given context.

**The simple version:** Skills are your team's wiki. Instead of explaining how to triage a bug every time, you point the engineer to the runbook that says "1. Reproduce → 2. Find root cause → 3. Write fix → 4. Add tests → 5. Create PR." The engineer follows it step by step.

### Skills vs. Regular Prompts

| | Regular Prompt | Skill |
|---|---|---|
| **Where it lives** | In your message | In `.claude/skills/` as SKILL.md |
| **Reusable** | No (type it each time) | Yes (invoke by name) |
| **Versioned** | No | Yes (git-tracked) |
| **Composable** | No | Yes (combine multiple skills) |
| **Auditable** | Lost in chat history | File on disk |

### Real examples

**A bug triage runbook (`.claude/skills/bug-triage/SKILL.md`):**
```markdown
# Bug Triage Skill

When invoked, this skill:
1. Reads the error from the ticket or the last API response
2. Reproduces the bug locally or via live MCP queries
3. Finds the root cause in the codebase
4. Proposes a fix with alternatives (Plan mode)
5. After approval: implements, tests, creates PR
6. Updates the ticket with a summary

## Trigger
Run: /bug-triage
```

**Usage:**
```bash
$ claude "/bug-triage"
  → Agent reads the skill, executes the procedure step by step.
```

A PR description skill:
```markdown
# PR Describe Skill

When writing a PR description:
1. Summarize the problem being solved
2. List files changed and why
3. Include testing strategy
4. Note any breaking changes or migration steps
5. Format: Our template — Problem / Root Cause / Fix / Tests
```

### Why Skills matter

Without Skills, you either:
- **Explain everything each time** (like re-onboarding an intern every morning)
- **Let the agent figure it out** (risky — it will guess conventions)

With Skills, the agent loads your team's exact workflow — the same runbooks that a human engineer would follow. This is why the open-source **mattpocock/skills** repo has 44K★ in 2026: it's a library of battle-tested runbooks ready to use.

### Skills vs. CLAUDE.md

- **CLAUDE.md** = your project's constitution ("we use Riverpod, not BLoC")
- **Skills** = your SOPs ("here's how we ship a feature: spec → approval → implementation → review → deploy")

Both are needed. One sets rules, the other sets procedures.

---

## 3. MCP: The Infrastructure & APIs

**What it is:** Model Context Protocol — an open standard (97M+ monthly downloads) for connecting AI agents to external tools, data sources, and services.

**The simple version:** MCP is how the agent accesses your infrastructure. Instead of every tool building its own AI connector, MCP provides one standard way to plug databases, GitHub, Slack, Sentry, etc. into any agent.

### How MCP works (simplified)

```
┌─────────────┐    MCP Protocol    ┌──────────────┐
│  AI Agent   │ ◄──────────────► │  MCP Server  │
│ (Claude,    │                    │ (GitHub,     │
│  ChatGPT,   │                    │  Slack,      │
│  Codex)     │                    │  PostgreSQL, │
│             │                    │  Sentry)     │
└─────────────┘                    └──────────────┘
```

The agent says "I need to check the error logs." The Sentry MCP server handles the API call, authentication, and response formatting. The agent doesn't need to know Sentry's API — it speaks MCP.

### Real example: Without vs. With MCP

**Without MCP (like a dev without VPN access):**
```bash
$ claude "Check the recent errors in production"
  → Agent: "I can't access Sentry. Can you paste the logs?"
  ← You: paste stack traces
  → Agent: reads manually... "Looks like a database timeout."
```

**With MCP (like giving the dev a VPN and credentials):**
```bash
$ claude "Check the recent errors in production"
  → Agent connects to Sentry MCP server
  → Sentry MCP queries the API, returns filtered results
  → Agent: "8 new errors in the last hour. Top one: connection pool
     exhaustion on the /checkout endpoint. Let me check the DB..."
  → Connects to PostgreSQL MCP...
```

### What MCP actually connects to

| Category | Examples |
|---|---|
| **Code** | GitHub, GitLab, Bitbucket, local filesystem |
| **Communication** | Slack, Discord, email, Linear, Jira |
| **Data** | PostgreSQL, SQLite, BigQuery, S3, Notion |
| **Design** | Figma, screenshot tools, browser automation |
| **Infrastructure** | Docker, Kubernetes, AWS, Vercel, Cloudflare |
| **Monitoring** | Sentry, Datadog, Grafana, PagerDuty |

### The MCP context tax problem

MCP has one well-known downside: **the context tax.** Every MCP server you add sends its tool descriptions to the agent's context window. With 5+ MCP servers, you can burn 10K+ tokens just describing available tools before the real work starts.

This is where **Skills** come back in — Skills load their context only when invoked (like a runbook you grab from a shelf), while MCP tool descriptions are always in the agent's working memory.

| Approach | Context cost | When tools are available |
|---|---|---|
| **MCP only** | High (always loaded) | Always |
| **Skills only** | Low (loaded on demand) | Only when invoked |
| **Hybrid (Skills + MCP)** | Low (Skills orchestrate MCP) | On demand |

The emerging best practice in 2026 is the **Skills → MCP** pattern: a Skill decides *when* to use an MCP server, keeping context small and only paying the context tax when needed. This is the architectural equivalent of "give the dev access to the database, but they only query it when they need to."

---

## 4. Steering: The Sprint Board & Code Review

**What it is:** The methods you use to control the agent — telling it *what* to do, *how* to do it, and *when to stop and ask for approval*.

**The simple version:** Steering is your development workflow as applied to an AI agent. Sprint planning, task assignment, design review, code review, CI gates — all the governance you'd apply to a human engineer, but for an AI.

### Steering levels

| Level | What you do | Agent autonomy | Cost | Risk |
|---|---|---|---|---|
| **Full manual** | You write code, agent autocompletes | None | Low | None |
| **Plan-then-do** | Agent designs, you approve | Medium | Medium | Low |
| **Supervised** | Agent executes, checks in at milestones | High | Medium-High | Medium |
| **Autonomous** | Agent picks its own tasks | Full | High | High |

### Steering tools in practice

**1. Plan mode (like writing a design doc)**
```bash
$ claude "Add rate limiting to the API" --plan

  Agent: "Here's my design:
  1. Create a rate limiter middleware
  2. Add Redis backend for distributed counting
  3. Wire it into the API router
  4. Add configuration env variables
  5. Write tests
  Approve?"

  You: "Skip Redis, use in-memory for now."
  Agent: adjusts design and starts implementing.
```

**2. Hooks (automated CI checks)**
```
PreCommit hook → runs tests automatically (like CI before push)
PreToolUse hook → blocks secrets from being committed (like a secrets scanner)
PostToolUse hook → formats code after every edit (like a formatter on save)
```

Hooks are "set and forget" steering — you define the gates once, and the agent can't bypass them.

**3. Permissions (access control)**
```bash
# Claude Code permission modes
claude --permission-mode default    # Ask for anything outside the project
claude --permission-mode relaxed    # Trust the agent fully
claude --permission-mode restricted # Read-only, must ask to write anything
```

**4. Checkpoints (sprint demos)**
```bash
$ claude "Build a login screen"
  → Implements UI
  ✓ Checkpoint: "Review the login screen? [Y/n]"
  → Implements auth logic
  ✓ Checkpoint: "Run tests? [Y/n]"
```

### The steering golden rule

> **High complexity = tight steering. Low complexity = loose steering.**

A typo fix: let the agent do it (no design doc, no code review). A database migration: plan first, approve, review output, verify in staging. Most failures with AI agents happen when developers apply the wrong steering level — either micromanaging trivial tasks or letting the agent run wild on complex ones.

---

## How It All Fits Together

**Task:** A customer reports a bug — the `/checkout` endpoint returns a 500 error when the cart has a promo code applied.

```
👨‍💻 Power: Claude Sonnet (mid-level engineer — complex enough to need
    good judgment, but a staff engineer would be overkill)

The agent loads its workspace:

📖 CLAUDE.md (project README / onboarding docs):
  "Express.js, Prisma ORM, PostgreSQL, Promo codes are timezone-sensitive"

📋 Skills loaded (runbooks checked out from the team wiki):
  /bug-triage    → "Reproduce → find root cause → test → fix → verify → PR"
  /pr-describe   → "Write PR with problem, root cause, fix, tests"

🔌 MCP servers (infrastructure access):
  GitHub MCP → browse source, create branch + PR
  PostgreSQL MCP → query promo_codes table live
  Sentry MCP → check error logs and stack traces
  Linear MCP → update bug ticket status

🎮 Steering:
  Plan mode: ON (dev proposes architecture, TL approves)
  PreCommit hook: runs `tsc --noEmit && vitest run`
  Permission mode: default (asks before touching schema or production config)

---

PM (via Linear ticket): "Bug: checkout fails with promo code HELIO25"

Agent (/bug-triage runbook activates):
  1. Reproduce the bug
     → MCP PostgreSQL: "SELECT * FROM promo_codes WHERE code='HELIO25'"
     → Sees the code expires at 2026-04-30T23:59:59Z
     → MCP Sentry: Check recent error logs for /checkout
     → Finds: "Error: promo_code applied but expiry check runs before validation"

  2. Propose fix (Plan mode)
     "Root cause: The validation middleware checks expiry before
      checking if the code was already applied.
      Fix: Swap the order — apply first, then validate expiration.
      Approve?"

  TL (you): "Approved. Add a regression test."

  3. Implement → writes fix → adds test
  4. PreCommit hook runs: tsc --noEmit, vitest — all green
     (Like CI running before every push)
  5. MCP GitHub: creates branch, commits, opens PR
  6. MCP Linear: updates ticket to "Fix ready — PR #72"
  7. /pr-describe skill: writes PR description

  → "Fix ready on branch fix/checkout-promo-order.
     Sent for code review."

---

You (TL) spent: writing 1 comment on the ticket + 5 seconds approving.
The agent handled: reproducing, diagnosing, implementing, testing, documenting, and creating the PR.
```

Each concept plays its role on the engineering team:

| Concept | Engineering team role | In the example |
|---|---|---|
| **Power** | Who's writing the code | Sonnet — mid-level engineer, capable of bug diagnosis without being overkill |
| **Skills** | The team's runbooks | /bug-triage gave the exact 6-step bug-fixing process |
| **MCP** | Infrastructure & APIs | PostgreSQL, Sentry, GitHub, Linear — all accessed through one protocol |
| **Steering** | Sprint workflow & code review | Plan mode, PreCommit hook, approval gates — you're the tech lead, not the IC |

---

## The Bottom Line

These four concepts — Skills, MCP, Steering, Power — are not competing ideas. They're four layers of one stack, and understanding how they fit together is the difference between "I tried AI coding and it was a mess" and "AI agents are the most productive tool I've ever used."

| Concept | Ask yourself | 
|---|---|
| **Power** | What model does this task actually need? (Junior? Mid-level? Staff?) |
| **Skills** | What procedures should the agent already know? |
| **MCP** | What external systems should the agent access? |
| **Steering** | How much control does this task need from me? |

If you're getting into AI agents in 2026, skip the hype posts about "which model is best." Learn these four concepts first. Every product decision, every workflow choice, every tool evaluation — they all come back to these.

---

*This article is based on hands-on experience with Claude Code, Codex, Cursor, and Warp ADE in production projects.*
