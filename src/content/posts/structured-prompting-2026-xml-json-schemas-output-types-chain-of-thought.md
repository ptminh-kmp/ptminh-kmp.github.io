---
title: "Structured Prompting 2026: XML Tags, JSON Schemas, Output Types, and Chain-of-Thought"
description: "Production patterns for structured prompting. How to use XML tags, JSON schemas, Pydantic output types, and chain-of-thought to get reliable, parseable output from AI agents in 2026."
published: 2026-05-30
pubDate: 2026-05-30T04:25:00.000Z
slug: structured-prompting-2026-xml-json-schemas-output-types-chain-of-thought
tags:
  - prompt-engineering
  - structured-prompting
  - xml
  - json-schema
  - chain-of-thought
  - output-types
  - production
category: prompt-engineering
lang: en
series:
  name: "Prompt Engineering 2026 — Production Patterns"
  order: 3
  total: 5
---

Unstructured prompts produce unstructured output. Structured prompts produce predictable, parseable, testable output.

In production systems, you can't afford to parse free-text responses. You need guaranteed fields, typed values, and machine-readable output. This is where structured prompting comes in — and in 2026, there are four dominant patterns.

---

## The Four Patterns

| Pattern | Input Style | Output Style | Best For |
|---------|------------|-------------|----------|
| **XML Tags** | `<tag>content</tag>` | Structured text | System prompts, tool calls |
| **JSON Schemas** | JSON definition | JSON output | API integration, validation |
| **Output Types** | Pydantic/Zod model | Typed object | Type-safe applications |
| **Chain-of-Thought** | Reasoning traces | Step-by-step + answer | Complex reasoning tasks |

Each pattern solves a different problem. Smart teams combine them.

---

## 1. XML Tags: The Old Standard That Still Works

XML-style tags have been used in prompts since the GPT-3 era. They work because LLMs are trained on vast amounts of XML-like structured text (HTML, markdown, code).

### Pattern: Tagged Context Separation

```text
<task>Write a PostgreSQL query to find all users who haven't logged in for 90 days</task>

<schema>The users table has columns: id (UUID), email (text), last_login (timestamp), created_at (timestamp)</schema>

<constraints>
- Use parameterized queries to prevent SQL injection
- Return only user_id and email
- Order by last_login ascending
</constraints>

<output_format>Return ONLY the SQL query. No explanation.</output_format>
```

The agent reads each tag as a separate context block. It can reference them independently.

### Pattern: Step-by-Step with Tagged Sections

```text
<problem>
Debug why the payment service returns 503 errors after midnight UTC.
Relevant logs are in the MCP logging server.
</problem>

<thoughts>
1. Find the error pattern in logs
2. Identify the recurring job that runs at midnight
3. Check if the job conflicts with payment processing
4. Propose a fix
</thoughts>

<output>
Return your findings as:
<root_cause>one sentence</root_cause>
<evidence>relevant log lines</evidence>
<fix>concrete steps to implement</fix>
</output>
```

### Best Practices for XML Tags

- **Use short, descriptive tag names** — `<task>`, `<context>`, `<output>` not `<very_long_task_description>`
- **Nest sparingly** — Agents handle shallow nesting well, but deep nesting confuses them
- **Use consistent casing** — `<tag>` every time. Don't mix `<Tag>`, `<TAG>`, and `<tag>`
- **Close every tag** — Missing closing tags break the agent's parsing
- **Leave blank lines between tags** — Improves readability for the model

---

## 2. JSON Schemas: API-Ready Structured Output

JSON schemas are the native format for tool calling and structured output. Every major framework supports them.

### Pattern: Schema-First Prompting

```python
schema = {
    "type": "object",
    "properties": {
        "severity": {
            "type": "string",
            "enum": ["critical", "high", "medium", "low"],
            "description": "Impact severity"
        },
        "affected_services": {
            "type": "array",
            "items": {"type": "string"},
            "description": "List of affected service names"
        },
        "root_cause": {
            "type": "string",
            "description": "One-sentence root cause"
        },
        "action_items": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "priority": {"type": "number"},
                    "description": {"type": "string"},
                    "owner": {"type": "string"}
                }
            }
        }
    },
    "required": ["severity", "root_cause", "action_items"]
}

prompt = f"""Analyze this incident report and return a structured analysis.
You MUST return valid JSON matching this schema:
{json.dumps(schema, indent=2)}

Incident: {incident_text}"""
```

### Pattern: JSON Mode with Frameworks

```python
# OpenAI Agents SDK — native Pydantic
from pydantic import BaseModel
from agents import Agent

class IncidentReport(BaseModel):
    severity: str
    root_cause: str
    action_items: list[str]

agent = Agent(
    name="incident_analyzer",
    instructions="Analyze incidents and produce structured reports",
    output_type=IncidentReport  # Agent MUST output this shape
)

# Claude Agent SDK — content blocks
response = agent.generate(
    messages=[{"role": "user", "content": incident_text}],
    tools=[{
        "name": "submit_incident",
        "input_schema": {
            "type": "object",
            "properties": {
                "severity": {"type": "string"},
                "summary": {"type": "string"}
            },
            "required": ["severity", "summary"]
        }
    }],
    tool_choice={"type": "tool", "name": "submit_incident"}
)
# The agent outputs structured data through tool calls
```

### Why JSON schemas win in production:

- **Validatable** — `jsonschema` or `pydantic` can validate the output
- **Parseable** — No regex needed. `json.loads()` and you're done
- **Type-safe** — Booleans are booleans, numbers are numbers
- **Auto-retry** — If output is invalid JSON, frameworks can retry with error message
- **API-ready** — Pass the output directly to downstream systems

---

## 3. Output Types: Type-Safe Agent Output

In 2026, the most sophisticated pattern is defining output types before writing the prompt. The type definition constrains the prompt and the model simultaneously.

### Pydantic (Python)

```python
from pydantic import BaseModel, Field
from typing import Literal

class CodeReview(BaseModel):
    file_path: str = Field(description="Path to the reviewed file")
    issues: list[dict] = Field(description="List of issues found")
    score: int = Field(ge=1, le=10, description="Code quality score 1-10")
    verdict: Literal["approve", "changes_requested", "blocked"]

prompt = f"""Review the following code changes and return a structured review.
Your output MUST conform to this schema:
{CodeReview.model_json_schema()}

The score must be between 1 and 10.
The verdict must be exactly one of: approve, changes_requested, blocked.
"""
```

### Zod (TypeScript)

```typescript
import { z } from "zod";

const CodeReviewSchema = z.object({
  filePath: z.string(),
  issues: z.array(z.object({
    line: z.number(),
    severity: z.enum(["error", "warning", "suggestion"]),
    message: z.string(),
  })),
  score: z.number().min(1).max(10),
  verdict: z.enum(["approve", "changes_requested", "blocked"]),
});

const prompt = `
Review the following code and return a JSON object matching:
${JSON.stringify(CodeReviewSchema, null, 2)}

Parse the response with:
const result = CodeReviewSchema.parse(JSON.parse(response));
`;
```

### Why output types beat unstructured:

| Dimension | Unstructured | Output Types |
|-----------|-------------|-------------|
| **Parse errors** | Common, need fallback | None if valid |
| **Type safety** | No | Yes |
| **Self-documenting** | No | Schema IS documentation |
| **IDE support** | None | Autocomplete, validation |
| **Testability** | Hard (string matching) | Easy (object comparison) |

---

## 4. Chain-of-Thought: Reasoning Before Answering

Chain-of-thought prompting forces the model to reason step by step before producing the final answer. In 2026, this is built into models (o-series reasoning, Claude extended thinking), but explicit CoT prompting remains useful for structured tasks.

### Pattern: CoT with Structured Output

```python
prompt = """Solve this problem step by step, then output the answer in JSON.

Problem: A payment of $156.78 was made. The fee is 2.9% + $0.30.
What is the net amount received?

Think step by step:
1. Calculate the percentage fee: $156.78 × 0.029 = $4.55
2. Add the fixed fee: $4.55 + $0.30 = $4.85
3. Subtract from total: $156.78 - $4.85 = $151.93

Now output JSON:
{
    "gross_amount": 156.78,
    "percentage_fee": 4.55,
    "fixed_fee": 0.30,
    "total_fee": 4.85,
    "net_amount": 151.93
}
"""

# The model learns the pattern and applies it to the actual problem.
```

### Pattern: CoT with Model Reasoning Features

```python
# Claude Agent SDK — extended thinking
agent = Agent(
    model="claude-sonnet-4",
    thinking_budget=16000,  # Tokens for reasoning
)

result = await agent.run_with_thinking(
    "Analyze this deployment failure and produce a structured incident report",
    stream_thinking=True  # See the reasoning before the structured output
)
# The thinking trace shows the chain-of-thought.
# The final output is structured JSON.
```

### When CoT is essential:

- **Multi-step math/logic** — Percentage calculations, tax, interest
- **Complex debugging** — Root cause analysis with multiple data sources
- **Compliance workflows** — Documented reasoning for audit trails
- **Safety checks** — Model explains why something is safe/unsafe before deciding

---

## Combining All Four Patterns

The most robust prompts combine all four patterns:

```python
prompt = """
<task>Analyze the deployment incident below.</task>

<context>
Service: payment-api
Time: 2026-05-30 02:15 UTC
Error: Connection pool exhaustion
Impact: 15% of payment requests failed for 12 minutes
</context>

<reasoning>
Think step by step before answering:
1. What caused the pool exhaustion? (check for traffic spike, leaks, misconfiguration)
2. What was the blast radius? (which services were affected)
3. How was it resolved? (automatic recovery or manual intervention)
4. What prevents recurrence? (concrete actions)
</reasoning>

<output_format>
Return valid JSON matching this schema:
{
    "root_cause": "string",
    "severity": "critical|high|medium|low",
    "blast_radius": ["string"],
    "resolution": "string",
    "prevention": ["string"],
    "reasoning_trace": "string"
}
</output_format>
"""
```

1. **XML tags** separate context from instructions
2. **Chain-of-thought** forces reasoning before output
3. **JSON schema** constrains the output structure
4. **Output validation** ensures the response is usable programmatically

---

## Common Anti-Patterns

### Anti-pattern 1: Mixing formats

```text
# Bad — JSON inside XML inside YAML
<output>
{
  items: [
    - name: "thing"  # Mixed JSON and YAML
  ]
}
```

**Fix:** Pick one format. Use JSON for structured output. Use XML for context. Don't nest them.

### Anti-pattern 2: Over-specifying

```python
# Bad — too many constraints
prompt = """Return JSON with fields:
- field1: string (max 10 chars)
- field2: number (0-100, must be integer)
- field3: array (min 1, max 5 items)
- field4: object with nested field4a (required), field4b (optional)
- field5: enum ["a", "b", "c"] but only when field2 > 50
... 20 more fields
"""
```

**Fix:** Keep schema under 8 fields. Use nested objects for complex structures. Test with real model output.

### Anti-pattern 3: No fallback for parse failures

```python
# Bad — assumes model always returns valid JSON
data = json.loads(response)  # Crashes if model adds commentary

# Good — resilient parsing
try:
    data = json.loads(response)
except json.JSONDecodeError:
    # Attempt to extract JSON from markdown code block
    import re
    match = re.search(r'```(?:json)?\n(.*?)\n```', response, re.DOTALL)
    if match:
        data = json.loads(match.group(1))
    else:
        data = {"error": "parse_failed", "raw": response}
```

---

## Production Checklist

- [ ] Output format is specified BEFORE the user input, not after
- [ ] JSON schemas include descriptions for each field (guides the model)
- [ ] Schemas are validated against a Pydantic/Zod model before deployment
- [ ] Parse failures have a fallback strategy
- [ ] Chain-of-thought is separated from final output
- [ ] XML tags are consistent (case, nesting, closing)
- [ ] Schema complexity matches task complexity (don't over-specify)

---

## Next in the Series

| Post | Topic |
|------|-------|
| 1 | System Prompts vs Steering Files vs Agent Instructions |
| 2 | MCP Tools as Prompts |
| 3 | **Structured Prompting** (this) |
| 4 | Prompt Testing & Evaluation |
| 5 | Production Patterns & Anti-Patterns |

---

*Series: Prompt Engineering 2026 — Production Patterns. Post 3: Structured Prompting — XML tags, JSON schemas, output types, chain-of-thought.*
