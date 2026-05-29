---
title: "MCP Tools as Prompts: How Tool Definitions Shape Agent Behavior"
description: "Your MCP tool definitions are prompts too. How tool names, descriptions, input schemas, and error messages influence agent decision-making. Production patterns for writing tools that steer agent behavior."
published: 2026-05-28
pubDate: 2026-05-28T23:20:00.000Z
slug: mcp-tools-as-prompts-shape-agent-behavior
tags:
  - prompt-engineering
  - mcp
  - tools
  - agent-behavior
  - tool-design
  - production
  - function-calling
category: prompt-engineering
lang: en
series:
  name: "Prompt Engineering 2026 — Production Patterns"
  order: 2
  total: 5
---

Your tools are prompts.

Every MCP server you connect, every function you register, every tool description you write — they all end up in the agent's context window alongside your system prompt and steering file. The agent reads them, reasons about them, and decides which to call.

Most teams spend hours crafting their system prompt but write tool definitions as an afterthought. This post shows why they're wrong.

---

## The Hidden Prompt: Tool Definitions

When you connect an MCP server, the agent's first step is to call `tools/list`. Every tool comes back with:

- **Tool name** — `search_docs` vs `search_internal_documentation_v2`
- **Description** — "Searches documentation" vs "Searches the internal knowledge base for product documentation. Use this before asking for clarification."
- **Input schema** — What parameters, what types, what defaults
- **Output format** — Structured content blocks or plain text

This metadata is injected into the agent's system context. The agent treats it as instructions about what it *can* do.

### Example: The Same Tool, Two Descriptions

```python
# Bad description — agent might not use it
{
    "name": "search_docs",
    "description": "Search documentation",
    "inputSchema": {
        "query": {"type": "string"}
    }
}
# Likely agent behavior: rarely calls it. Prefers to guess.
```

```python
# Good description — agent uses it as intended
{
    "name": "search_docs",
    "description": "Search the internal product documentation for technical references, API guides, and implementation patterns. Always call this before writing new code to check for existing patterns. Return up to 10 results ranked by relevance.",
    "inputSchema": {
        "query": {"type": "string", "description": "The search query. Include domain-specific terms for better results."},
        "max_results": {"type": "number", "description": "Number of results (1-10).", "default": 5}
    }
}
# Likely agent behavior: calls it frequently. Follows the "always call before writing code" instruction.
```

The difference isn't in what the tool *does*. It's in how the agent *perceives* it.

---

## The MCP Tool Prompt Spectrum

Every part of a tool definition is an instruction to the agent:

| Tool Element | Prompt Function | Example |
|-------------|----------------|---------|
| **Name** | Identifies capability | `send_email` vs `send_urgent_email_alert` |
| **Description** | Tells agent when to use it | "For production incidents only" |
| **Input schema** | Defines what arguments the agent must gather | Required fields force the agent to collect data before calling |
| **Default values** | Suggest common usage | `limit: 10` says "10 is normal" |
| **Output format** | Shapes how results appear | Structured JSON vs raw text changes how the agent reasons |
| **Error messages** | Guide recovery | "Retry with backoff" vs "Contact support" |

---

## Patterns for MCP Tool Prompting

### Pattern 1: Write Descriptions as Instructions

```python
# Bad: just describes
"description": "Fetches user data from the database"

# Good: describes AND instructs
"description": """Fetches user data from the database.
Always call this when you need user information instead of guessing.
Returns: user_id, email, role, created_at.
Never log the email field — it contains PII.
If the user is not found, check the archive database tool instead of reporting an error."""
```

The last sentence is particularly important. It prevents the agent from giving up after one failure.

### Pattern 2: Use Tool Names for Routing

```python
# Before: generic name, agent might not distinguish
tools = [
    { "name": "query", "description": "Query the production database" },
    { "name": "query", "description": "Query the staging database" },
]
# Agent gets confused about which to use

# After: explicit names for routing
tools = [
    { "name": "query_production", "description": "Query the production database. Use for customer-facing data." },
    { "name": "query_staging", "description": "Query the staging database. Use for testing and development." },
]
# Agent can now route correctly based on context
```

### Pattern 3: Input Schema as Guardrails

```python
{
    "name": "process_refund",
    "description": "Process a refund for a customer transaction",
    "inputSchema": {
        "transaction_id": {
            "type": "string",
            "description": "The transaction ID from the payment system. Must start with 'txn_'."
        },
        "amount": {
            "type": "number",
            "description": "Refund amount in cents. Maximum: 50000 ($500). Refunds over $100 require manager approval — do not process without it."
        },
        "reason": {
            "type": "string",
            "enum": ["duplicate_charge", "customer_request", "product_return", "service_issue"]
        }
    }
}
```

The input schema doubles as a guardrail. The agent reads the descriptions and adjusts its behavior accordingly — it won't attempt a $500+ refund without checking first.

### Pattern 4: Output Shaping via Resource Descriptions

```python
# MCP resource definition
{
    "uri": "docs://architecture",
    "name": "System Architecture Documentation",
    "description": "Architecture docs describing the microservices, data flow, and deployment topology. Read this before making architectural decisions.",
    "mimeType": "text/markdown"
}
```

Resources, like tools, have descriptions that instruct the agent. A well-described resource gets read at the right time.

---

## Case Study: Before and After

### Before (minimal tool definitions):

```python
tools = [
    { "name": "search", "description": "search database" },
    { "name": "read", "description": "read document" },
    { "name": "write", "description": "write to file" },
]
```

**Agent behavior:** Unpredictable. Sometimes searches, sometimes guesses. Often calls the wrong tool.

### After (prompt-aware tool definitions):

```python
tools = [
    { 
        "name": "search_knowledge_base",
        "description": "Search the internal knowledge base for documentation, guides, and reference materials. Call this whenever you need technical context about our codebase. Always search before writing new code — there might be an existing pattern or utility function.",
        "inputSchema": {
            "query": { "type": "string", "description": "Search terms. Be specific." },
            "max_results": { "type": "number", "default": 5 }
        }
    },
    {
        "name": "read_source_file",
        "description": "Read a source file from the codebase. Use this to understand existing code before making changes. Full file path required.",
        "inputSchema": {
            "path": { "type": "string", "description": "Absolute path to the file in the repository." }
        }
    },
    {
        "name": "write_code_change",
        "description": "Write or modify a source file. Always read the existing file first. Always run tests after writing. Never overwrite files without reading them first.",
        "inputSchema": {
            "path": { "type": "string" },
            "content": { "type": "string" }
        }
    }
]
```

**Agent behavior:** Consistent. Searches first, reads relevant code, then writes with testing.

---

## Tool-to-Tool Dependencies

You can express workflows through tool descriptions alone:

```python
{
    "name": "deploy_to_production",
    "description": """Deploy the current build to production.
    IMPORTANT: Only call this after ALL of the following:
    1. Call run_tests and confirm they pass
    2. Call run_security_scan and confirm no critical issues
    3. Call check_approval to confirm deployment is approved
    4. Call check_maintenance_window to verify we're in a deployment window
    
    If any step fails, do not deploy. Report the failure instead.
    """
}
```

The agent reads these prerequisites and executes the workflow. No orchestrator needed — the tool description IS the orchestrator.

---

## When Tool Prompting Is Not Enough

Tool prompts work for linear, sequential behavior. They break down when:

- **You need conditional branching** — "If A, do X. If B, do Y." Tool descriptions can hint, but they can't express conditionals well.
- **You need parallel execution** — Tools are called sequentially by the agent. For true parallelism, you need a framework like LangGraph.
- **You have 50+ tools** — The agent's context window fills up with tool definitions. Description length matters.
- **You need precise timing** — "Wait 5 minutes, then call this." Tool descriptions handle this poorly.

For these cases, use the layered approach: system prompt sets the rules, steering file provides context, agent instructions handle routing, and tool definitions are the execution layer.

---

## Minimizing Token Usage

Tool descriptions consume tokens. Every description competes with your system prompt for context window space.

| Strategy | Token Saved | Tradeoff |
|----------|------------|----------|
| Short tool names | ~5-10 per tool | Less descriptive routing |
| 1-sentence descriptions | ~50-100 per tool | Less behavioral guidance |
| Description only on key tools | ~200-500 per unused tool | Some tools become invisible |
| Move guidance to steering file | Varies | Agent must reference steering file |
| Use tool groups (MCP servers) | ~100-300 per server | Coarser granularity |

**Rule of thumb:** If a tool will be called frequently, invest in its description. If it's rarely called, keep it short — the agent will ignore it anyway.

---

## Production Checklist

- [ ] Every tool description includes "when to call this"
- [ ] Critical tools have post-call instructions ("after this, do X")
- [ ] Error-prone tools have recovery instructions ("if this fails, try Y")
- [ ] Tool names reflect their role (query_production vs query_staging)
- [ ] Input schema descriptions are as important as tool descriptions
- [ ] Tool descriptions total < 50% of available context
- [ ] Tool-output format is explicitly documented in the description

---

## Next in the Series

| Post | Topic |
|------|-------|
| 1 | System Prompts vs Steering Files vs Agent Instructions |
| 2 | **MCP Tools as Prompts** (this) |
| 3 | Structured Prompting — XML, JSON schemas, chain-of-thought |
| 4 | Prompt Testing & Evaluation — LLM-as-judge, versioning |
| 5 | Production Patterns & Anti-Patterns |

---

*Series: Prompt Engineering 2026 — Production Patterns. Post 2: MCP Tools as Prompts — your tool definitions are instructions to the agent.*
