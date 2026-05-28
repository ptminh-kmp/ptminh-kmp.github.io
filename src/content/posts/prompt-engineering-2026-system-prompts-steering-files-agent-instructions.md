---
title: "Prompt Engineering 2026: System Prompts vs Steering Files vs Agent Instructions"
description: "How prompt engineering has evolved in the agent era. Compare system prompts, Kiro steering files, Claude Code .claude.md rules, Cursor .cursorrules, and Agent SDK instructions. Production patterns for each approach."
published: 2026-05-28
pubDate: 2026-05-28T15:10:00.000Z
slug: prompt-engineering-2026-system-prompts-steering-files-agent-instructions
tags:
  - prompt-engineering
  - system-prompt
  - steering
  - kiro
  - claude-code
  - cursor
  - agent-instructions
  - production
category: prompt-engineering
lang: en
series:
  name: "Prompt Engineering 2026 — Production Patterns"
  order: 1
  total: 5
---

In 2023, prompt engineering meant writing better questions for ChatGPT.

In 2026, prompt engineering means something completely different. You're not talking to a chatbot anymore — you're programming an agent. System prompts have become configuration files. Instructions are version-controlled. Your prompts define tool access, safety boundaries, and behavioral guardrails.

This series covers five pillars of modern prompt engineering. This first post establishes the landscape: the three main mechanisms for controlling agent behavior and when each one matters.

---

## The Three Mechanisms

| Mechanism | Where It Lives | Scope | Change Speed | Version Control |
|-----------|---------------|-------|-------------|-----------------|
| **System prompt** | LLM API call | Per-session | Changes every invocation | Usually not |
| **Steering files** | Project directory | Per-repository | Committed alongside code | ✅ Git-tracked |
| **Agent instructions** | Agent definition | Per-agent instance | Config deployment | ✅ Git-tracked |

Each mechanism has a different role. Smart teams use all three.

---

## 1. System Prompts: The Foundation

System prompts set the base persona and rules for every interaction. They're the oldest mechanism and still the most important — but they're getting shorter, not longer.

### 2023 style (bad):

```text
You are an expert software engineer with 20 years of experience in...
You are helpful, harmless, and honest...
Please follow these 47 rules when writing code...
Always ask clarifying questions...
Never output harmful content...
Format your responses with proper markdown...
[500 more words of instructions]
```

### 2026 style (good):

```text
You are a DevOps engineer for the payments platform.
Repo context is in your MCP tools. Use them before coding.
When unsure, check the steering file. When blocked, escalate.
```

Why shorter? Because system prompts now delegate to other mechanisms:

- **MCP tools** provide context on demand (no need to dump docs into the prompt)
- **Steering files** define project-specific rules (no need to repeat them per session)
- **Agent instructions** encode task-specific behavior (no need to describe the task in the system prompt)

### When system prompts matter most:

- **Safety rules** that must never change between sessions
- **Identity and tone** (customer-facing agents, brand voice)
- **Legal disclaimers** (do not give financial advice, do not diagnose)
- **Model selection hints** (reasoning budget, temperature, output length)

---

## 2. Steering Files: Per-Project Behavior

Steering files are the biggest innovation in prompt engineering since the system prompt itself. They're configuration files living in your project directory that tell agents how to behave in *this specific codebase*.

### Kiro Steering (`./kiro/steering.md`)

Kiro popularized the pattern. A markdown file in a `.kiro` directory that defines the project's rules, conventions, and constraints:

```markdown
# Steering File — Payments API

## Tech Stack
- Runtime: Node.js 22 + TypeScript 5.7
- Framework: Hono
- Database: PostgreSQL via Drizzle ORM
- Tests: Vitest
- Package manager: pnpm

## Conventions
- Use `camelCase` for variables, `PascalCase` for types
- Every public function needs JSDoc
- Error handling: return `Result<T, E>` never throw
- API routes follow RESTful patterns: `POST /v1/payments`

## Testing
- Unit tests in `__tests__/` next to source
- Integration tests require a running Postgres container
- Minimum 80% coverage on new code

## Security
- Never log PII (credit cards, emails, SSNs)
- All input validation via Zod
- Rate limiting is mandatory on all public endpoints
```

### Claude Code Rules (`./.claude.md` or `./.claude/rules.md`)

Anthropic's equivalent. A markdown file that Claude Code reads at startup:

```markdown
# Project Rules

## MCP Servers
- GitHub MCP for PR operations
- PostgreSQL MCP for database queries
- Custom internal API MCP for deployment

## Workflow
1. Always read the relevant test file first
2. Write tests before implementation
3. Run `pnpm test` after changes
4. Create a PR with description and screenshots
```

### Cursor Rules (`./.cursorrules`)

Cursor's approach. A single file or `.cursor/rules/` directory:

```markdown
You are an expert Flutter developer.

Rules:
- Use Riverpod for state management, not BLoC
- Freezed for immutable models
- GoRouter for navigation
- Always handle loading, error, and empty states
- Use slang for i18n
- Run `flutter analyze` before committing
```

### Why steering files win:

| Aspect | System Prompt | Steering File |
|--------|--------------|---------------|
| **Visibility** | Hidden in API calls | Visible in repo root |
| **Review** | Code review? What code? | ✅ PR-reviewed |
| **Freshness** | Stale if not updated per call | ✅ Always current |
| **Sharing** | Per-developer | ✅ Per-project |
| **Composability** | Single text blob | ✅ Can reference other files |

### Steering file patterns across frameworks:

| Framework | File | Format |
|-----------|------|--------|
| Kiro | `.kiro/steering.md` | Markdown |
| Claude Code | `.claude.md` or `.claude/rules.md` | Markdown |
| Claude Desktop | `claude_desktop_config.json` | JSON |
| Cursor | `.cursorrules` or `.cursor/rules/` | Markdown |
| Windsurf | `.windsurfrules` | Markdown |
| GitHub Copilot | `.github/copilot-instructions.md` | Markdown |

---

## 3. Agent Instructions: Per-Instance Behavior

Agent instructions are the most granular level. They define what a specific agent instance does — its tools, handoffs, and behavior within a multi-agent system.

### In Claude Agent SDK:

```python
from claude_agent import Agent

payment_agent = Agent(
    model="claude-sonnet-4",
    instructions="""You process payment transactions.
    - Use the Payment MCP for all transaction operations
    - Flag transactions over $10,000 for human review
    - Never retry a failed payment more than 3 times
    - Log all declined transactions to the audit trail
    - If the Payment MCP is unavailable, pause and alert, don't retry
    """,
    mcp_servers=[payment_mcp, audit_mcp, alerting_mcp],
)
```

### In OpenAI Agents SDK:

```python
from agents import Agent

triage_agent = Agent(
    name="triage",
    instructions="""Route support tickets:
    - Billing issues → transfer_to_billing
    - Technical issues → transfer_to_technical
    - Account issues → transfer_to_account
    - If unsure, ask clarifying questions before transferring
    """,
    handoffs=[billing_agent, tech_agent, account_agent],
    input_guardrails=[pii_check],
)
```

### In LangGraph (via node instructions):

```python
from langgraph.graph import StateGraph

def research_node(state):
    instruction = f"""Research the following topic thoroughly:
    {state['query']}
    
    Use the web search tool. Find at least 3 sources.
    Return findings as structured data with citations.
    """
    result = agent.invoke({"messages": [("user", instruction)]})
    return {"findings": result}
```

### When agent instructions work best:

- **Task-specific rules** not shared across agents
- **Tool restrictions** (this agent can access payments, that one can't)
- **Handoff logic** (when to escalate, who to transfer to)
- **Safety overrides** (this agent has stricter output validation)

---

## Putting It All Together: Layered Prompt Architecture

The most robust systems use all three layers:

```
Layer 1: System Prompt (model-level)
  └─ "You are a software engineer. Follow the rules in your steering file."
      │
Layer 2: Steering File (project-level)
  └─ ".kiro/steering.md" → tech stack, conventions, security rules
      │
Layer 3: Agent Instructions (instance-level)
  └─ "You handle payment processing. Use Payment MCP. Escalate over $10k."
```

Each layer handles a different concern. The system prompt is the foundation. The steering file is the project constitution. Agent instructions are the daily orders.

---

## Common Anti-Patterns

### Anti-pattern 1: The 2000-word system prompt

```text
# Bad — everything in one place
"You are... please follow... remember to... also ensure... do not... when writing code... [2000 words]"
```

**Fix:** Keep system prompts to 200 words. Delegate everything else to steering files and MCP context.

### Anti-pattern 2: Ignoring steering files

```
# Bad — agent has no project context
"Write a payment endpoint" → produces Express.js in a Hono project
```

**Fix:** Every project needs a steering file. Every agent reads it. Non-negotiable.

### Anti-pattern 3: Overloading agent instructions

```python
# Bad — project rules in instance instructions
agent = Agent(
    instructions="Tech stack: Node.js + Hono + Drizzle... [entire project README]"
)
```

**Fix:** That's what steering files are for. Agent instructions = what this agent does. Steering file = what this project uses.

---

## Production Checklist

- [ ] System prompt under 200 words
- [ ] Steering file exists at project root
- [ ] Steering file is version-controlled
- [ ] Agent instructions reference steering file by name
- [ ] Each agent has its own instruction set
- [ ] Instructions are tested with automated evaluation
- [ ] Steering file reviewed quarterly (it drifts)

---

## Next in the Series

| Post | Topic |
|------|-------|
| 1 | **System Prompts vs Steering Files vs Agent Instructions** (this) |
| 2 | MCP Tools as Prompts — How tool descriptions shape agent behavior |
| 3 | Structured Prompting — XML, JSON schemas, chain-of-thought |
| 4 | Prompt Testing & Evaluation — LLM-as-judge, versioning, regression |
| 5 | Production Patterns — Banking, SaaS, dev tools, anti-patterns |

---

*Series: Prompt Engineering 2026 — Production Patterns. Post 1: The three mechanisms for controlling agent behavior.*
