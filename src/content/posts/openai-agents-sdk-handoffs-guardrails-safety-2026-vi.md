---
title: "OpenAI Agents SDK: Handoffs, Guardrails và An toàn"
description: "Tìm hiểu sâu về OpenAI Agents SDK — handoffs giữa các agent chuyên biệt, guardrails built-in, xác thực input/output, bộ lọc an toàn và triển khai production với hệ sinh thái OpenAI."
published: 2026-05-24
pubDate: 2026-05-24T12:00:00.000Z
slug: openai-agents-sdk-handoffs-guardrails-safety-2026-vi
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
lang: vi
series:
  name: "AI Agent Frameworks 2026 — So sánh Production"
  order: 5
  total: 6
---

Các framework chúng ta đã đề cập là open-source hoặc platform-agnostic. OpenAI Agents SDK khác — nó được thiết kế cho models và ecosystem của OpenAI trước tiên. Nhưng những gì nó thiếu về tính di động, nó bù đắp bằng ba lĩnh vực cụ thể mà không framework nào sánh kịp: **handoffs**, **guardrails** và **built-in safety**.

OpenAI ra mắt Agents SDK cuối năm 2025 như người kế nhiệm function calling API và Assistants API. Đây là framework agent thống nhất cho toàn bộ nền tảng OpenAI — GPT, o-series reasoning models, multimodal và tool use.

---

## OpenAI Agents SDK Là Gì?

Agents SDK là framework Python để xây dựng agents sử dụng OpenAI models. Nó wrap Chat Completions API với các abstraction cấp agent: agents với instructions và tools, handoff giữa các agent, guardrails cho input/output safety và tracing.

```python
from agents import Agent, Runner

agent = Agent(
    name="Support Agent",
    instructions="Bạn là customer support agent. Hãy hữu ích và ngắn gọn.",
    tools=[get_order_status, process_refund]
)

result = Runner.run_sync(agent, "Đơn hàng #12345 của tôi đâu?")
print(result.final_output)
```

---

## Handoffs: Tính năng Killer

Handoffs là khả năng nổi bật nhất của SDK. Agent có thể chuyển cuộc hội thoại sang agent khác một cách liền mạch. Agent nhận được toàn bộ conversation context.

```python
from agents import Agent, handoff, Runner

triage_agent = Agent(
    name="triage",
    instructions="Chuyển đến specialist phù hợp",
    handoffs=["billing", "technical", "account"],
)

billing_agent = Agent(
    name="billing",
    instructions="Xử lý billing và payments",
    tools=[process_refund, lookup_invoice],
)

# Handoff với customization
billing_handoff = handoff(
    agent=billing_agent,
    tool_name_override="transfer_to_billing",
    on_handoff=lambda ctx: log_transfer(ctx, "billing"),
)
```

Khác với function calling. Handoff chuyển *conversation state*, không chỉ data result.

---

## Guardrails: An toàn Built In

Guardrails chạy trước và sau mỗi lần gọi agent:

```python
from agents import Guardrail, Runner

class PIIGuardrail(Guardrail):
    async def check_input(self, agent, input_data):
        if contains_pii(input_data):
            return GuardrailResult(
                passed=False,
                message="Input chứa PII",
                transformed=redact_pii(input_data)
            )
        return GuardrailResult(passed=True)
```

### Built-in guardrails:
- `PIIGuardrail` — Email, phone, SSN, credit card
- `ToxicityGuardrail` — Hate speech, harassment
- `ContentGuardrail` — Topic restrictions
- `BudgetGuardrail` — Token/cost limits
- `ValidationGuardrail` — Output schema compliance

---

## Structured Outputs

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
    output_type=SupportResponse,
)

result = Runner.run_sync(agent, "Payment failed")
```

---

## OpenAI SDK vs Các Framework Khác

| Khía cạnh | OpenAI SDK | LangGraph | CrewAI | AutoGen | Claude SDK |
|-----------|-----------|-----------|--------|---------|------------|
| **Handoffs** | Best | Manual nodes | Hierarchical | GroupChat | Không |
| **Guardrails** | Best | Code tùy chỉnh | Code tùy chỉnh | Code tùy chỉnh | Code tùy chỉnh |
| **Structured output** | Native Pydantic | Manual | Manual | Typed messages | Native |
| **Multi-model** | Chỉ OpenAI | Any LLM | Any LLM | Any LLM | Chỉ Claude |
| **Graph control** | Linear chains | Full graphs | Sequential | Conversations | Agent loop |
| **Human-in-loop** | Hạn chế | Native | Callbacks | Callbacks | Hooks |
| **Tracing** | Dashboard | LangSmith | Cơ bản | Azure Monitor | Không |

---

## Khi Nào Chọn

### Phù hợp
- **Đã dùng OpenAI** — GPT-4o, o3, o4-mini
- **Input/output safety critical** — Guardrails mature nhất
- **Handoff patterns đơn giản** — Support, triage, escalation
- **Structured output bắt buộc** — Pydantic best-in-class

### Tránh khi
- **Cần multi-model** — Chỉ OpenAI
- **Cần human-in-the-loop mature** — LangGraph tốt hơn
- **Cần graph workflow phức tạp** — AutoGen/LangGraph tốt hơn
- **Cần self-hosted traces** — Chỉ OpenAI dashboard

---

## Tiếp Theo

| Bài | Framework |
|-----|-----------|
| 1 | LangGraph |
| 2 | CrewAI |
| 3 | AutoGen |
| 4 | Claude Agent SDK |
| 5 | **OpenAI Agents SDK** (bài này) |
| 6 | **So sánh cuối** — coming next |

---

*Series: AI Agent Frameworks 2026 — So sánh Production. Bài 5: OpenAI Agents SDK. Finale: So sánh cuối → sắp tới.*
