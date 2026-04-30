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

Think of an AI agent as a **race car**:

| Concept | Car Analogy | What It Is |
|---|---|---|
| **Power** | The engine | The AI model itself |
| **Skills** | The driver's playbook | How to race a specific track |
| **MCP** | The pit crew & telemetry | Connecting to external tools |
| **Steering** | The steering wheel & pedals | How you control the agent |

A race car is useless with just a powerful engine (Power) if the driver doesn't know the track (Skills), can't talk to the pit crew (MCP), and you can't steer it (Steering). All four must work together.

Now let's dive into each one.

---

## 1. Power: The Engine

**What it is:** The AI model running the agent — its capabilities, speed, cost, and context size.

**The simple version:** Power is "which brain is in the agent's head." Claude Opus 4.7? GPT-5.5? DeepSeek-V4? That's Power.

### What actually matters about Power

| Factor | Low Power | High Power | Impact |
|---|---|---|---|
| **Model size** | 7B parameters (Haiku) | Hundreds of billions (Opus) | Quality of reasoning |
| **Context window** | 32K tokens | 200K+ tokens | How much code it sees at once |
| **Speed** | Fast (small model) | Slow (large model) | Time per task |
| **Cost** | Cheap ($0.03 per task) | Expensive ($0.30+ per task) | Your wallet |
| **Reasoning depth** | Shallow | Deep multi-step | Handling complex bugs |

### Real example

```bash
# Low Power — Haiku (fast, cheap, shallow)
$ claude -m claude-haiku "Fix the typo in the README"
  → Fixed in 2 seconds, cost $0.01

# Medium Power — Sonnet (balanced)
$ claude -m claude-sonnet "Refactor this auth module to use OAuth2"
  → 30 seconds, cost $0.08, good result

# High Power — Opus (slow, expensive, deep)
$ claude -m claude-opus "Find the memory leak in this 50K-line Rust codebase"
  → 3 minutes, cost $0.50, found it
```

### How to think about Power

**Don't use Opus for everything.** It's like driving a Ferrari to get groceries. Use the smallest model that can handle the task:

- **Haiku:** Typo fixes, simple refactors, documentation
- **Sonnet/GPT-5-mini:** Feature implementation, bug fixes, code review
- **Opus/GPT-5.5:** Complex architecture decisions, system-wide refactoring, novel code generation
- **DeepSeek-V4:** Cost-effective alternative for coding, often matches Sonnet at Haiku prices

The art of Power management is knowing *when* to pay for intelligence and *when* to use the cheap model. Most teams burn 70% of their AI budget using Opus for tasks Haiku could handle.

---

## 2. Skills: The Driver's Playbook

**What it is:** Reusable instruction sets that teach the agent *how* to perform specific tasks — procedures, conventions, and guardrails for a given context.

**The simple version:** Skills are like recipe cards. Instead of explaining how to make pasta every time, you hand the agent a card that says "boil water → add pasta → drain → sauce." The agent reads the card and executes.

### Skills vs. Regular Prompts

| | Regular Prompt | Skill |
|---|---|---|
| **Where it lives** | In your message | In `.claude/skills/` as SKILL.md |
| **Reusable** | No (type it each time) | Yes (invoke by name) |
| **Versioned** | No | Yes (git-tracked) |
| **Composable** | No | Yes (combine multiple skills) |
| **Auditable** | Lost in chat history | File on disk |

### Real examples

**A testing skill (`.claude/skills/test-triage/SKILL.md`):**
```markdown
# Test Triage Skill

When invoked, this skill:
1. Reads all source files in the staged diff
2. For each changed function, checks if a corresponding test exists
3. For untested functions, generates test scaffold with:
   - Happy path
   - Error cases
   - Edge cases
4. Runs the test suite to verify nothing breaks

## Trigger
Run: /test-triage
```

**Usage:**
```bash
$ claude "/test-triage"
  → Agent reads the skill, executes the procedure step by step.
```

**A PR description skill:**
```markdown
# PR Describe Skill

When writing a PR description:
1. Summarize the problem being solved
2. List files changed and why
3. Include testing strategy
4. Note any breaking changes or migration steps
5. Format: Conventional PR template

## Trigger
Run: /pr-describe
```

### Why Skills matter

Skills are the answer to the *"explain yourself every session"* problem — but taken further. Instead of telling the agent how to behave (CLAUDE.md), you're giving it complete procedures it can execute on demand.

Think of CLAUDE.md as your project's constitution ("we use Riverpod, not BLoC"). Skills are your SOPs ("here's how we add a new feature: spec → approval → implementation → review → ship").

### The Skill ecosystem in 2026

- **mattpocock/skills** (44K★) — The most popular skill collection. ~40 skills for real engineering.
- **Claude Code built-in skills** — /plan, /review, /lint-fix
- **Custom team skills** — Your own SOPs version-controlled in your repo

The trend is clear: **Skills > prompts** in 2026. Julien Chaumond (HuggingFace CTO) summed it up: "In 2026, Skills > MCP alone for all use cases. They are more dynamic, composable, and define the expected results."

---

## 3. MCP: The Pit Crew & Telemetry

**What it is:** Model Context Protocol — an open standard (97M+ monthly downloads) for connecting AI agents to external tools, data sources, and services.

**The simple version:** MCP is "USB-C for AI." Instead of every company building their own connector for every AI agent, MCP provides one standard way to plug anything into any agent.

### How MCP works (simplified)

```
┌─────────────┐    MCP Protocol    ┌──────────────┐
│  AI Agent   │ ◄──────────────► │  MCP Server  │
│ (Claude,    │                    │ (GitHub,     │
│  ChatGPT,   │                    │  Slack,      │
│  Codex)     │                    │  Database,   │
│             │                    │  Filesystem) │
└─────────────┘                    └──────────────┘
```

The agent says "I need to look up this PR." The MCP server for GitHub handles the API call, authentication, and response formatting. The agent doesn't need to know GitHub's API — it speaks MCP, and the MCP server handles the rest.

### Real example: Without vs. With MCP

**Without MCP:**
```bash
$ claude "Check the status of PR #42"
  → Agent: "I can't access GitHub directly. Can you paste the link?"
  ← You: paste the URL
  → Agent: reads the content... "The PR is approved."
```

**With MCP (GitHub MCP server):**
```bash
$ claude "Check the status of PR #42"
  → Agent connects to MCP server for GitHub
  → MCP server authenticates and queries the API
  → Agent: "PR #42 is approved by @teammate. 3 comments pending."
```

### What MCP actually connects to

In 2026, MCP servers exist for:

| Category | Examples |
|---|---|
| **Code** | GitHub, GitLab, Bitbucket, local filesystem |
| **Communication** | Slack, Discord, email, Linear, Jira |
| **Data** | PostgreSQL, SQLite, BigQuery, S3, Notion |
| **Design** | Figma, screenshot tools, browser automation |
| **Infrastructure** | Docker, Kubernetes, AWS, Vercel, Cloudflare |
| **Search** | Web search, documentation search, code search |

### The MCP context tax problem

MCP has one well-known downside: **the context tax.** Every MCP server you connect adds tool descriptions to the agent's context window. With 5+ MCP servers, you can burn 10K+ tokens just describing available tools before the real work starts.

This is where **Skills** come back in — progressive loading means Skills only load their context when invoked, while MCP tools are always in context.

| Approach | Context cost | When tools are available |
|---|---|---|
| **MCP only** | High (always loaded) | Always |
| **Skills only** | Low (loaded on demand) | Only when invoked |
| **Hybrid (Skills + MCP)** | Low (Skills orchestrate MCP) | On demand |
| **Skill as orchestrator** | Lowest | Skills decide which MCP to call |

The emerging best practice in 2026 is the **Skills → MCP** pattern: a Skill decides *when* to use an MCP server, keeping context small and only paying the MCP tax when needed.

---

## 4. Steering: The Steering Wheel & Pedals

**What it is:** The methods you use to control the agent — telling it *what* to do, *how* to do it, and *when to stop*.

**The simple version:** Steering is everything between you and the agent. Prompts. Plan mode. Hooks. Checkpoints. Permissions. All of the "driver controls."

### Steering levels

| Level | What you do | Agent autonomy | Cost | Risk |
|---|---|---|---|---|
| **Full manual** | You write code, agent helps | None | Low | None |
| **Plan-then-do** | Agent plans, you approve | Medium | Medium | Low |
| **Supervised** | Agent executes, checks in | High | Medium-High | Medium |
| **Autonomous** | Agent runs free | Full | High | High |

### Steering tools in practice

**1. Plan mode (Claude Code, Codex)**
```bash
$ claude "Add rate limiting to the API" --plan

  Agent: "I'll:
  1. Create a rate limiter middleware
  2. Add Redis backend for distributed counting
  3. Wire it into the API router
  4. Add configuration env variables
  5. Write tests
  Sound good?"

  You: "Skip Redis, use in-memory for now."
  Agent: adjusts plan and executes.
```

**2. Hooks (proactive steering)**
```
PreCommit hook → runs tests automatically
PreToolUse hook → blocks secrets from being committed
PostToolUse hook → formats code after every edit
```

Hooks are "set and forget" steering — you define rules once, and the agent enforces them without asking.

**3. Permissions (defensive steering)**
```bash
# Claude Code permission modes
claude --permission-mode default    # Ask for read-only outside project
claude --permission-mode relaxed    # Allow any file operation
claude --permission-mode restricted # Read-only with explicit allow
```

**4. Checkpoints (state-based steering)**
```bash
# After each major step, the agent pauses and asks
$ claude "Build a login screen"
  → Implements UI
  ✓ Checkpoint: "Review the login screen? [Y/n]"
  → Implements auth logic
  ✓ Checkpoint: "Run tests? [Y/n]"
```

### The steering golden rule

> **High complexity = tight steering. Low complexity = loose steering.**

A typo fix: loose steering (just let it happen). A database migration: tight steering (plan, approve, review, verify). Most failures with AI agents happen when developers apply the wrong steering level to a task.

---

## How It All Fits Together

Here's a concrete example of all four concepts working together:

**Task:** Add a "forgot password" feature to a Flutter app.

```
🧠 Power: Claude Sonnet (balanced model — complex task, not novel research)

The agent loads:

📖 CLAUDE.md: "Use Riverpod, GoRouter, Dio with interceptors"

📋 Skills loaded:
  /feature-spec    → "Write spec → get approval → implement"
  /flutter-test    → "Widget test each new component"
  
🔌 MCP servers available:
  GitHub MCP → create PR, push branch
  Firebase MCP → verify auth configuration
  Linear MCP → update ticket status

🎮 Steering:
  Plan mode: ON (agent proposes, you approve)
  PreCommit hook: runs `flutter analyze && flutter test`
  Permission mode: default (asks before touching non-project files)

---

You: "Add forgot password flow"

Agent (Plan mode):
  "Here's my plan:
   1. Add email input screen
   2. Add reset link verification screen
   3. Add new password screen
   4. Wire up Firebase Auth password reset
   5. Widget tests for each screen
   6. Integration test for the full flow
   OK?"

You: "Looks good, add loading states"

Agent:
  Updates plan → implements → runs tests → updates Linear ticket
  → "Done. What's next?"
```

Each concept plays a role:
- **Power** determines it *can* do the task
- **Skills** define *how* it does Flutter features
- **MCP** gives it access to GitHub, Firebase, Linear
- **Steering** ensures you stay in control

---

## The Bottom Line

These four concepts — Skills, MCP, Steering, Power — are not competing ideas. They're four layers of one stack, and understanding how they fit together is the difference between "I tried AI coding and it was a mess" and "AI agents are the most productive tool I've ever used."

| Concept | Ask yourself | 
|---|---|
| **Power** | What model does this task actually need? |
| **Skills** | What procedures should the agent already know? |
| **MCP** | What external systems should the agent access? |
| **Steering** | How much control does this task need from me? |

If you're getting into AI agents in 2026, skip the hype posts about "which model is best." Learn these four concepts first. Every product decision, every workflow choice, every tool evaluation — they all come back to these.

---

*This article is based on hands-on experience with Claude Code, Codex, Cursor, and Warp ADE in production projects.*
