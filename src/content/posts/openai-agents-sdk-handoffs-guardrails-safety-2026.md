---
title: "OpenAI Agents SDK: Handoffs, Guardrails, and Safety"
description: "Deep dive into the OpenAI Agents SDK — handoffs between specialized agents, built-in guardrails, input/output validation, safety filters, and production deployment with OpenAI's ecosystem."
published: 2026-05-24
pubDate: 2026-05-24T12:00:00.000Z
slug: openai-agents-sdk-handoffs-guardrails-safety-2026
tags:
  - openai
  - agents-sdk
  - ai-agents
  - agent-framework
  - guardrails
  - safety
  - handoffs
  - tool-use
category: ai-agents
lang: en
series:
  name: "AI Agent Frameworks 2026 — Production Comparison"
  order: 5
  total: 6
---

The frameworks we've covered so far are open-source or platform-agnostic. The OpenAI Agents SDK is different — it's designed for OpenAI's models and ecosystem first. But what it lacks in portability, it makes up for in three specific areas that no other framework has matched: **handoffs**, **guardrails**, and **built-in safety**.

OpenAI launched the Agents SDK in late 2025 as the successor to the earlier function calling API and Assistants API. It's the unified agent framework for the entire OpenAI platform — GPT, o-series reasoning models, multimodal, and tool use.

---

## What Is the OpenAI Agents SDK?

The Agents SDK is a Python framework for building agents powered by OpenAI models. It wraps the Chat Completions API with agent-level abstractions: agents with instructions and tools, handoff between agents, guardrails for input/output safety, and tracing for observability.

```python
from agents import Agent, Runner

agent = Agent(
    name="Support Agent",
    instructions="You are a customer support agent. Be helpful and concise.",
    tools=[get_order_status, process_refund]
)

result = Runner.run_sync(agent, "Where is my order #12345?")
print(result.final_output)
```

Simple for basic use. Where it gets powerful is the agent ecosystem.

---

## Core Concept: Agents as Building Blocks

Every agent is defined by the same structure:

```python
from agents import Agent, Guardrail, handoff

agent = Agent(
    name="billing_agent",
    instructions="You handle billing inquiries. Transfer to escalation when needed.",
    model="gpt-4o",
    tools=[lookup_invoice, process_payment, refund_order],
    handoffs=[escalation_agent],  # Can transfer to other agents
    input_guardrails=[pii_check, budget_check],  # Check input before processing
    output_guardrails=[validation_check],  # Check output before returning
    output_type=BillingResponse,  # Structured output
)
```

Key fields:
- `instructions` — System prompt (supports file references via `file_search`)
- `model` — Any OpenAI model (gpt-4o, o3, o4-mini)
- `tools` — Functions or MCP-configured tools
- `handoffs` — Other agents this agent can transfer to
- `input_guardrails` — Validate/transform input before the agent processes it
- `output_guardrails` — Validate/filter output before returning to the user
- `output_type` — Pydantic model for structured output

---

## Handoffs: The Killer Feature

Handoffs are the SDK's standout capability. An agent can transfer a conversation to another agent seamlessly. The receiving agent gets the full conversation context.

```python
from agents import Agent, handoff, Runner

# Define specialized agents
triage_agent = Agent(
    name="triage",
    instructions="Route to the right specialist",
    handoffs=["billing", "technical", "account"],
)

billing_agent = Agent(
    name="billing",
    instructions="Handle billing and payments",
    tools=[process_refund, lookup_invoice],
)

tech_agent = Agent(
    name="technical",
    instructions="Handle technical issues",
    tools=[run_diagnostics, check_logs],
)

# Handoff configuration with customization
billing_handoff = handoff(
    agent=billing_agent,
    tool_name_override="transfer_to_billing",
    tool_description_override="Transfer to billing for payment issues",
    on_handoff=lambda ctx: log_transfer(ctx, "billing"),
)

triage_agent.handoffs = [billing_handoff, tech_agent]
```

### How handoffs work internally:

1. The agent decides to handoff based on its instructions
2. The SDK pauses the current agent
3. The receiving agent receives the full conversation history
4. The receiving agent continues the conversation
5. If needed, the receiving agent can handoff back

This is different from function calling. A handoff transfers *conversation state*, not just a data result. The receiving agent knows everything that was discussed before.

### Handoff Patterns

```python
# Round-robin delegation
analyst_agent = Agent(name="analyst", handoffs=[qa_agent])
qa_agent = Agent(name="qa", handoffs=[analyst_agent])

# Escalation chain
l1_agent = Agent(name="l1", handoffs=[l2_agent])
l2_agent = Agent(name="l2", handoffs=[l3_agent])
l3_agent = Agent(name="l3", handoffs=[human_agent])

# Parallel handoff (fan-out)
coordinator = Agent(name="coordinator", handoffs=[research_agent, writing_agent, review_agent])
```

---

## Guardrails: Safety Built In

Guardrails run before and after every agent invocation. They can validate, transform, or reject input/output.

```python
from agents import Guardrail, Runner

class PIIGuardrail(Guardrail):
    """Check for personally identifiable information"""
    
    async def check_input(self, agent, input_data):
        if contains_pii(input_data):
            return GuardrailResult(
                passed=False,
                message="Input contains PII. Please remove personal information.",
                transformed=redact_pii(input_data)  # Auto-redact
            )
        return GuardrailResult(passed=True)
    
    async def check_output(self, agent, output_data):
        if contains_pii(output_data):
            return GuardrailResult(
                passed=False,
                message="Output must not contain PII",
                transformed=redact_pii(output_data)
            )
        return GuardrailResult(passed=True)

agent = Agent(
    name="safe_agent",
    input_guardrails=[PIIGuardrail()],
    output_guardrails=[PIIGuardrail()]
)
```

### Built-in guardrails:

| Guardrail | What It Checks | Default Behavior |
|-----------|---------------|------------------|
| `PIIGuardrail` | Emails, phones, SSNs, credit cards | Auto-redact or reject |
| `ToxicityGuardrail` | Hate speech, harassment | Reject with explanation |
| `ContentGuardrail` | Topic restrictions (configurable) | Reject or redirect |
| `BudgetGuardrail` | Token/cost limits per session | Throttle or stop |
| `ValidationGuardrail` | Output schema compliance | Transform or retry |

### Custom guardrails

```python
class RateLimitGuardrail(Guardrail):
    async def check_input(self, agent, input_data):
        if await rate_limiter.exceeded(agent.name):
            return GuardrailResult(
                passed=False,
                message="Rate limit exceeded. Try again later."
            )
        return GuardrailResult(passed=True)

class CostGuardrail(Guardrail):
    async def check_input(self, agent, input_data):
        session_cost = await cost_tracker.current_session_cost()
        if session_cost > 5.00:  # $5 threshold
            return GuardrailResult(
                passed=False,
                message=f"Session cost (${session_cost:.2f}) exceeds limit. Simplify request."
            )
        return GuardrailResult(passed=True)
```

---

## Structured Outputs

The SDK has first-class support for structured outputs through Pydantic models:

```python
from pydantic import BaseModel
from agents import Agent, Runner

class SupportResponse(BaseModel):
    summary: str
    resolution: str | None
    requires_escalation: bool
    category: str

agent = Agent(
    name="support",
    instructions="Resolve support tickets",
    output_type=SupportResponse,  # Agent must return this shape
)

result = Runner.run_sync(agent, "My payment failed")
print(result.final_output)  # SupportResponse instance
# SupportResponse(summary='Payment declined', resolution='Try different card', requires_escalation=False, category='billing')
```

The agent is forced to produce output matching the schema. If it can't, guardrails can trigger a retry.

---

## Tracing and Observability

OpenAI Agents SDK ships with built-in tracing that integrates with OpenAI's dashboard:

```python
from agents import Runner, trace

# Automatic tracing in the dashboard
with trace("Support Workflow"):
    triage_result = Runner.run_sync(triage_agent, user_message)
    if triage_result.requires_handoff:
        specialist_result = Runner.run_sync(specialist_agent, user_message)
```

Every trace captures:
- LLM calls with input/output tokens
- Tool calls and their results
- Handoff decisions and timing
- Guardrail triggers and outcomes
- Total latency, cost, and token usage

The dashboard is OpenAI's — running on their infrastructure. This is both a feature (zero setup) and a drawback (no self-hosting).

---

## Production Patterns

### Pattern 1: Support System with Escalation

```python
l1 = Agent(name="l1", handoffs=[l2], tools=[search_kb, reset_password])
l2 = Agent(name="l2", handoffs=[l3], tools=[query_database, process_refund])
l3 = Agent(name="l3", handoffs=[human], tools=[admin_access, override_policy])

result = Runner.run_sync(l1, customer_message)
```

The agent automatically escalates through the chain. Each level has increasingly powerful tools.

### Pattern 2: Multi-Step Research

```python
researcher = Agent(
    name="researcher",
    tools=[web_search, fetch_url],
    handoffs=[writer]
)
writer = Agent(
    name="writer",
    tools=[format_document],
    handoffs=[reviewer]
)
reviewer = Agent(
    name="reviewer",
    input_guardrails=[FactCheckGuardrail()],
    output_guardrails=[StyleGuardrail()]
)
```

---

## When to Choose OpenAI Agents SDK

### Best Fit
- **You're already on OpenAI** — GPT-4o, o3, o4-mini users get the tightest integration
- **Input/output safety is critical** — Guardrails are more mature than any other framework
- **Simple handoff patterns** — Customer support, triage, escalation chains
- **Structured output requirements** — Pydantic model enforcement is best-in-class

### Avoid When
- **You need multi-model support** — OpenAI-only
- **You need human-in-the-loop** — The SDK has pause/resume, but it's less mature than LangGraph
- **You need complex graph workflows** — AutoGen's GroupChat and LangGraph's state graphs handle this better
- **You need self-hosted traces** — OpenAI dashboard only; no LangSmith equivalent

---

## OpenAI Agents SDK vs the Rest

| Dimension | OpenAI SDK | LangGraph | CrewAI | AutoGen | Claude SDK |
|-----------|-----------|-----------|--------|---------|------------|
| **Handoffs** | Best | Manual nodes | Hierarchical | GroupChat | No |
| **Guardrails** | Best | Custom code | Custom code | Custom code | Custom code |
| **Structured output** | Native Pydantic | Manual | Manual | Typed messages | Native |
| **Multi-model** | OpenAI only | Any LLM | Any LLM | Any LLM | Claude only |
| **Graph control** | Linear chains | Full graphs | Sequential/hierarchical | Conversations | Agent loop |
| **Human-in-loop** | Limited | Native | Via callbacks | Via callbacks | Via hooks |
| **Tracing** | Dashboard only | LangSmith | Basic | Azure Monitor | None |
| **Setup time** | 30 minutes | 2-3 days | Few hours | 1-2 days | 1 day |

---

## Next: The Finale

| Post | Framework |
|------|-----------|
| 1 | LangGraph |
| 2 | CrewAI |
| 3 | AutoGen |
| 4 | Claude Agent SDK |
| 5 | **OpenAI Agents SDK** (this) |
| 6 | **Head-to-Head Comparison** → coming next |

---

*Series: AI Agent Frameworks 2026 — Production Comparison. Post 5: OpenAI Agents SDK. Finale: Head-to-Head Comparison → coming next.*
