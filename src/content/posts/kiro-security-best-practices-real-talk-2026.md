---
title: "Kiro Security, Best Practices, and Real Talk"
description: "The truth about AI agent security — incident analysis from the Dec 2025 AWS outage, permission scoping strategies, sandbox hardening, when NOT to use Kiro, and an honest comparison with Claude Code, Cursor, and GitHub Copilot."
published: 2026-05-13
pubDate: 2026-05-13T10:00:00.000Z
slug: kiro-security-best-practices-real-talk-2026
tags:
  - kiro
  - aws
  - security
  - best-practices
  - ai-coding
  - comparison
  - agent-safety
  - incident-analysis
category: ai-agents
lang: en
series:
  name: "Practical Kiro — AWS's Agentic Development Environment"
  order: 6
  total: 6
---

This is the final post in the Practical Kiro series. Days 0-4 covered the IDE, CLI, specs, hooks, powers, and autonomous agents. All of that is exciting. But the difference between a great tool and a dangerous tool is what happens when things go wrong.

Today we cover three things:

1. **Security** — permissions, sandboxing, and the December 2025 AWS incident
2. **Best practices** — what actually works in production after months of using Kiro
3. **Real talk** — honest comparison vs Claude Code, Cursor, Copilot, and when to avoid Kiro entirely

Let's be honest: no AI coding tool is safe by default. Safety is something you build.

---

## Part 1: Security — The December 2025 AWS Incident

In December 2025, an AWS team used an early version of the Kiro autonomous agent to refactor a shared IAM policy module across their service mesh. The refactoring worked — too well. The agent, following instructions to "consolidate duplicate policies," merged read-only and read-write policies into a single template, effectively granting write access to services that should only read.

The result: a production incident where a read-only data pipeline service accidentally gained the ability to modify critical infrastructure state.

Eight hours of rollback, post-mortem, and policy restoration. Root cause: the agent had permission to *create and apply IAM policies* in its GitHub-connected sandbox, and the human review process didn't catch the permission expansion buried in a 200-line policy diff.

### Lessons from the Incident

This incident reveals a fundamental truth about AI coding agents: **they are extremely good at following instructions and extremely bad at understanding consequences.**

The agent did exactly what was asked — consolidate policies. It didn't understand that some of those policies formed a security boundary that shouldn't be crossed. Three specific failures:

1. **Overscoped credentials** — The sandbox had full IAM write access instead of scoped read-only
2. **Trusted policy diff** — A 200-line diff was collapsed by default; the permission expansion was invisible
3. **No policy safety check** — No pre-commit verification that changes preserved the original access boundaries

### How Kiro Fixed It

After the incident, Kiro added several security features that are now standard:

1. **Policy-aware sandboxing** — MCP integrations that touch infrastructure (IAM, Terraform, CloudFormation) now run in a restricted sandbox by default
2. **Permission diff highlights** — When a PR changes IAM/service roles, the agent automatically highlights the permission delta in the PR description
3. **Guardrails configuration** — `.kiro/kiro.json` now accepts explicit deny rules

### Setting Up Guardrails

In your `.kiro/kiro.json`:

```json
{
  "guardrails": {
    "deny": {
      "actions": [
        "grant_admin_access",
        "modify_network_security_groups",
        "delete_production_database"
      ],
      "resources": [
        "arn:aws:iam::*:role/production-*",
        "arn:aws:s3:::*-production"
      ],
      "patterns": [
        "AWS_SECRET_ACCESS_KEY",
        "DATABASE_URL_PRIMARY"
      ]
    },
    "requireApproval": {
      "files": ["**/Dockerfile", "**/docker-compose*.yml", "**/*-config/production.*"],
      "patterns": ["DELETE FROM", "DROP TABLE", "GRANT ALL"]
    }
  }
}
```

This configuration tells Kiro:
- **Deny** — Never perform these actions, touch these resources, or write these patterns
- **Require approval** — Flag these files/patterns for human review before applying

The `deny` list is automatically checked at three stages: spec generation, task execution, and PR creation. If a generated spec includes a denied action, Kiro rejects it before any code is written.

### Token and Credential Hygiene

From Day 3, we covered the basics (no hardcoded tokens, read-only first). Here's the complete system:

| Credential Type | Where to Store | Rotation | Audit |
|----------------|---------------|----------|-------|
| GitHub tokens | Kiro secret store / env vars | Every 90 days | Checked against repo access |
| MCP server tokens | Kiro secret store | Per provider policy | Logged per request |
| Cloud provider keys | Separate role (sandbox → assume role) | Per session | CloudTrail integration |
| Service secrets | Kiro secret store or 1Password CLI | Per task | Never logged to stdout |

The most important rule: **never connect Kiro with your production AWS credentials.** Use a staging/production-isolated sandbox. The autonomous agent runs in its own cloud environment, but if you configure it with full AWS access, the only difference between Kiro and a security breach is your ability to review the PR before merge.

---

## Part 2: Best Practices from Production Use

These are patterns that emerged from teams using Kiro daily for months. Not theory — proven practice.

### 1. The Steering File Is the Single Source of Truth

Your steering file defines your project's "constitution." Every team member and every AI agent references it. Keep it:

- **In version control** — Track `.kiro/steering.md` in git. Changes should go through PR review like any other code change.
- **Reviewed quarterly** — As your project evolves, update steering files to reflect new architecture decisions.
- **Concise but specific** — A 20-line steering file that nails your critical constraints beats a 200-line manifesto that nobody reads.

Good steering files focus on: what not to do, which patterns to follow, and how to handle security.

### 2. Spec Review Works, If You Do It

The spec generation phase (Day 2) catches more bugs than code review. Teams that invest 5 minutes reviewing the generated spec before approving execution see:

- **40% fewer PR iterations** compared to skipping spec review
- **60% fewer security escapes** — edge cases get flagged before any code exists
- **Better task decomposition** — missing components exposed early

The pain point: it's tempting to glance at the spec and hit approve. Don't. Read the acceptance criteria and edge cases. That's where the bugs live.

### 3. Limit Concurrent Autonomous Tasks

The autonomous agent can run 10 concurrent tasks (Day 4). Team experience suggests:

| Concurrent Tasks | Human Attention Needed | Ideal For |
|-----------------|----------------------|-----------|
| 1-3 | 5-10 minutes per review cycle | Daily development |
| 4-6 | 15-20 minutes per review cycle | Migration projects |
| 7-10 | Full-time oversight | Large-scale refactoring |

Running 10 tasks simultaneously with no supervision is how you wake up to 10 PRs that all need significant rework. Start with 3. Scale up only when you trust the agent's output quality.

### 4. Hooks: Start Small, Extend Later

The most common Kiro mistake: creating 15 hooks on day one. Each hook burns credits and can produce noise.

**Start with these three:**
```
on_commit: Scan for secrets (non-negotiable)
on_save → "src/**/*.ts": Type-check (catches issues early)
on_pr_open: Generate PR description (saves time)
```

Add more only when you have a specific pain point: "We keep forgetting to update API docs" → add `on_api_change`.

### 5. MCP: 3 Servers, Not 5

Kiro supports up to 5 simultaneous MCP servers. Use fewer:

- **Start with 1-2** — the MCP servers most relevant to your current sprint
- **Never exceed 3 for daily work** — more servers = slower planning + higher token consumption
- **Use Powers when possible** — they're pre-tested and optimized for Kiro

The most common MCP setup on production teams: version control (GitHub/GitLab) + database (PostgreSQL/Supabase) + documentation (Context7/Notion).

### 6. Always Keep a Human in the Loop

Kiro's per-task approval mode isn't a checkbox. For anything that touches production infrastructure, security configuration, or database schema:

1. Review the spec before execution
2. Review the diff before merge
3. Run staging tests before production

The autonomous agent is an async assistant, not an autonomous decision-maker. Treat it like a junior developer who reads docs quickly but lacks judgment.

---

## Part 3: Real Talk — Honest Comparison

Here's where marketing stops and honesty starts.

### Kiro vs Claude Code

| Dimension | Kiro | Claude Code |
|-----------|------|-------------|
| **Pricing** | $0-$200/mo | $20/mo (Pro) + API usage |
| **Autonomous agent** | Yes (Web interface) | No |
| **Cross-repo** | Yes | No (single directory) |
| **Spec-driven mode** | Yes | No |
| **Hooks** | Agent hooks (natural language) | Git hooks (shell scripts) |
| **Powers/MCP market** | 100+ bundled | Community MCP |
| **Sandbox** | Cloud (autonomous only) | Your terminal |
| **Best for** | Full workflow ownership | Quick inline tasks |

**Verdict:** Claude Code is great for inline work — ask a question, get an answer, move on. Kiro wins for projects that need structured workflows, cross-repo changes, and async execution. If your work is primarily editing single files and asking questions, Claude Code is cheaper and faster.

### Kiro vs Cursor

| Dimension | Kiro | Cursor |
|-----------|------|--------|
| **Pricing** | $0-$200/mo | $20/mo |
| **Agent mode** | Spec-driven (plan → execute → review) | Chat-driven (ask → code) |
| **Hooks** | Agent hooks (context-aware) | Rules (static) |
| **MCP** | Powers + custom MCP | MCP support (newer, less mature) |
| **IDE base** | VS Code fork (proprietary) | VS Code fork |
| **Tab completion** | No | Yes |
| **Best for** | Complex, multi-step features | Rapid prototyping, quick edits |

**Verdict:** Cursor's tab completion and inline editing are significantly better for rapid iteration. Kiro's spec-driven mode is more powerful for complex features but requires more upfront investment. For prototyping, Cursor is faster. For production features with clear requirements, Kiro produces more reliable output.

### Kiro vs GitHub Copilot

| Dimension | Kiro | GitHub Copilot |
|-----------|------|----------------|
| **Pricing** | $0-$200/mo | $10-$39/mo |
| **Agent mode** | Full spec-driven + autonomous | Chat + Agent mode (in progress) |
| **Context** | Steering file + hook config | Repository indexing |
| **MCP** | Powers + custom | Limited |
| **Cross-repo** | Yes | No |
| **Best for** | Team-scale agentic development | Individual code completion |

**Verdict:** Copilot is the most affordable option for individual developers who mainly need code completion and chat. Kiro targets a different problem: teams that need to orchestrate AI across repos, enforce standards, and automate quality checks. They're not really competing — Copilot is a better autocomplete, Kiro is a better development environment.

### When to Avoid Kiro

Honestly:

1. **You're a solo developer building single-page apps** — Too expensive. Use Copilot or Claude Code.
2. **Your team doesn't do code review** — Kiro's safety model relies on human review. Without it, you're giving an AI write access to your infrastructure.
3. **You work in air-gapped environments** — Kiro needs internet for auth and updates. Claude Code can run offline in a terminal.
4. **Your project has zero tests** — The spec-driven workflow generates test files, but if there's no existing test suite to verify against, you lose the verification phase's main benefit.
5. **You need fine-grained cost control** — Kiro's credit model is consumption-based. If your team runs 50 hooks per day, costs add up fast. Copilot's flat $39/mo is more predictable.

### When to Absolutely Use Kiro

1. **You maintain 10+ microservices** — Cross-repo refactoring alone justifies the cost
2. **Your team struggles with code consistency** — Steering file enforces standards across all PRs
3. **You're migrating a large codebase** — Framework upgrades, library changes, cloud migrations
4. **Security compliance is mandatory** — Guardrails, deny lists, and per-file approval modes
5. **You want async development** — Delegate work and review results later

---

## The Final Verdict

Kiro is the most ambitious AI coding environment available today. Its spec-driven workflow, agent hooks, powers ecosystem, and autonomous agent represent a genuinely new approach to software development — moving from "AI as autocomplete" to "AI as async collaborator."

But ambition comes with complexity. Kiro demands more setup, more review discipline, and more active management than simpler tools. It's not a magic wand — it's a powerful engine that needs a skilled operator.

The teams that succeed with Kiro share one trait: they treat it as a **collaborator**, not a replacement. They review specs, maintain steering files, configure guardrails, and keep a human in every decision loop.

Use it for what it's good for. Respect what it's not. And never forget that the human doing the review is still the one responsible for the code.

---

## Complete Series Recap

| Day | Topic | Key Takeaway |
|-----|-------|-------------|
| 0 | Kiro Overview | Three surfaces: IDE, CLI, Web. $0-$200/mo. Spec-driven, not chat-driven |
| 1 | Installation & Setup | Brew/macOS, download/Linux, CLI via curl. AWS Builder ID auth. Steering files |
| 2 | Spec-Driven Workflow | 6 stages: Prompt → Spec → Task Plan → Implement → Review → Approve |
| 3 | Hooks, Powers, MCP | Event-driven QA gates. 100+ Powers. Custom MCP servers. Steering+Hooks+Powers stack |
| 4 | Autonomous Agent | Async cross-repo coding. 3 sub-agents. Sandbox isolation. GitHub issue → PR lifecycle |
| 5 | Security & Best Practices | Dec 2025 incident. Guardrails. Real comparison. When to use / avoid |

---

*Series: Practical Kiro — AWS's Agentic Development Environment. 6 parts, complete.*
