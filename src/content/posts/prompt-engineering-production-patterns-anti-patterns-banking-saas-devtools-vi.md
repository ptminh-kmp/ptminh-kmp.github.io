---
title: "Prompt Engineering 2026: Production Patterns & Anti-Patterns — Banking, SaaS và Dev Tools"
description: "Production patterns thực tế cho prompt engineering năm 2026. Banking compliance prompts, SaaS onboarding flows, dev tool agent instructions và 12 anti-patterns phổ biến cần tránh."
published: 2026-05-31
pubDate: 2026-05-31T23:50:00.000Z
slug: prompt-engineering-production-patterns-anti-patterns-banking-saas-devtools-vi
tags:
  - prompt-engineering
  - production-patterns
  - anti-patterns
  - banking
  - saas
  - dev-tools
  - compliance
category: prompt-engineering
lang: vi
series:
  name: "Prompt Engineering 2026 — Production Patterns"
  order: 5
  total: 5
---

Đây là prompt engineering trông như thế nào khi có real money, real users và real compliance requirements.

Sau 4 bài về mechanisms (system prompts, steering files, agent instructions), hidden prompt (MCP tools), formats (structured prompting) và evaluation pipeline — giờ chúng ta đặt tất cả cùng nhau với production patterns từ 3 domain.

---

## Domain 1: Banking & Fintech

### Pattern: Audit-Trail Prompting

```python
class BankingAgent:
    def run(self, query):
        response = self.agent.run(f"""
        <task>{query}</task>
        <compliance_rules>
        - Không process transactions > $10,000 không verification
        - Không share account details người khác
        - Mọi response phải có disclaimer
        </compliance_rules>
        <audit_required>
        Giải thích reasoning (customer sẽ không thấy):
        - Dùng thông tin gì?
        - Compliance rules nào áp dụng?
        - Đã verify identity chưa?
        </audit_required>
        """)
        self.audit_log.append({"response": response, "compliance_check": verify(response)})
```

### Pattern: Progressive Identity Verification

```python
verification_levels = {
    "balance_check": {"name", "last_4_digits"},
    "transfer": {"full_ssn", "2fa_code", "device_verification"},
}
```

---

## Domain 2: SaaS Customer-Facing Agents

### Pattern: Empathy-First Escalation

Response structure: Acknowledge → Diagnose → Resolve → Confirm.
- User frustrated (caps, swears) → skip diagnosis
- Can't resolve in 3 messages → escalate
- Never make user repeat info

### Pattern: Progressive Onboarding

```python
onboarding_stages = {
    "welcome": "Be warm. Don't mention billing yet.",
    "power_user": "Skip basics. Offer API access.",
    "churning": "Be proactive but not pushy.",
}
```

---

## Domain 3: Dev Tools & Internal Agents

### Pattern: Read-Then-Write Guard

```python
dev_agent = Agent(instructions="""
Mandatory workflow:
1. ALWAYS read file first
2. ALWAYS check existing tests
3. ALWAYS run tests after changes
4. NEVER overwrite without reading
5. NEVER deploy on Friday after 2 PM
""")
```

---

## 12 Anti-Patterns

1. **Everything System Prompt** — 2,500 words → Giữ ≤ 200 từ
2. **Giấu critical rules** — Rule quan trọng ở paragraph 47/83 → Đưa lên đầu
3. **Silent Failure** — Agent quyết định không làm nhưng không nói lý do
4. **Instructions giống nhau cho agents khác nhau** — Mỗi agent cần unique instructions
5. **Không steering file** — Project rules trong system prompt static
6. **Prompt có thể là tool** — "Calculate total..." → Viết tool
7. **Over-specifying output format** — 47 fields → JSON valid nhưng content hallucinated
8. **Không evaluation baseline** — "It felt better" → Đo lường
9. **Prompt changes không PR** — Tweak production → 2h sau P0 incident
10. **Ignore token budget** — 60K tokens consumed, 12K left cho conversation
11. **One prompt cho tất cả** — New users vs power users vs admins khác nhau
12. **Không rollback plan** — "Broken nhưng không có old version"

---

## Prompt Engineering Manifesto 2026

1. **Prompts là code.** Version, test, review.
2. **Steering files > system prompts.** Project rules trong repo.
3. **Tools là prompts.** Tool descriptions steer behavior hơn instructions.
4. **Structure output.** JSON schemas, Pydantic prevent parse failures.
5. **Test before deploy.** LLM-as-judge không perfect nhưng tốt hơn nothing.
6. **Rollback là feature.** Mọi prompt change phải reversible.
7. **Context finite.** Mỗi token trong prompt là token không available cho reasoning.
8. **Agents cần prompts khác nhau.** One prompt cho tất cả = sai 9/10 lần.
9. **Critical rules đầu tiên.** Safety, compliance, must-follow rules ở top.
10. **Khi nghi ngờ, thêm tool.** Prompts instruct; tools enable.

---

## Series Recap

| Bài | Chủ đề | Key Takeaway |
|-----|--------|-------------|
| 1 | System Prompts vs Steering Files vs Agent Instructions | Three layers, khác concerns |
| 2 | MCP Tools as Prompts | Tool definitions là instructions |
| 3 | Structured Prompting | XML, JSON, CoT, output types |
| 4 | Prompt Testing & Evaluation | LLM-as-judge, versioning, regression |
| 5 | **Production Patterns & Anti-Patterns** | **Banking, SaaS, dev tools, 12 anti-patterns** |

---

*Series: Prompt Engineering 2026 — Production Patterns. Hoàn thành 5 bài.*

*Tiếp theo: muốn khám phá gì?*
