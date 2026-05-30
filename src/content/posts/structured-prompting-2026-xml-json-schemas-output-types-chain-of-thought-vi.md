---
title: "Structured Prompting 2026: XML, JSON Schema, Output Types và Chain-of-Thought"
description: "Production patterns cho structured prompting. Cách dùng XML tags, JSON schemas, Pydantic output types và chain-of-thought để có output đáng tin cậy, parseable từ AI agents trong 2026."
published: 2026-05-30
pubDate: 2026-05-30T04:25:00.000Z
slug: structured-prompting-2026-xml-json-schemas-output-types-chain-of-thought-vi
tags:
  - prompt-engineering
  - structured-prompting
  - xml
  - json-schema
  - chain-of-thought
  - output-types
  - production
category: prompt-engineering
lang: vi
series:
  name: "Prompt Engineering 2026 — Production Patterns"
  order: 3
  total: 5
---

Unstructured prompts sinh unstructured output. Structured prompts sinh output predictable, parseable, testable.

Trong production systems, bạn không thể parse free-text responses. Bạn cần guaranteed fields, typed values và machine-readable output. Structured prompting giải quyết việc này — và năm 2026 có 4 patterns chính.

---

## Bốn Patterns

| Pattern | Input Style | Output Style | Best For |
|---------|------------|-------------|----------|
| **XML Tags** | `<tag>content</tag>` | Structured text | System prompts, tool calls |
| **JSON Schemas** | JSON definition | JSON output | API integration, validation |
| **Output Types** | Pydantic/Zod model | Typed object | Type-safe applications |
| **Chain-of-Thought** | Reasoning traces | Step-by-step + answer | Complex reasoning |

---

## 1. XML Tags

```text
<task>Viết PostgreSQL query tìm users chưa login 90 ngày</task>
<schema>users table: id (UUID), email (text), last_login (timestamp)</schema>
<constraints>
- Dùng parameterized queries
- Return only user_id và email
</constraints>
<output_format>Return ONLY SQL query. Không giải thích.</output_format>
```

### Best Practices
- Tag names ngắn, descriptive: `<task>`, `<context>`, `<output>`
- Nest sparingly — deep nesting confuses models
- Consistent casing — `<tag>` every time
- Đóng mọi tag
- Để blank lines giữa các tags

---

## 2. JSON Schemas

```python
schema = {
    "type": "object",
    "properties": {
        "severity": {
            "type": "string",
            "enum": ["critical", "high", "medium", "low"]
        },
        "root_cause": {"type": "string"},
        "action_items": {
            "type": "array",
            "items": {"type": "string"}
        }
    },
    "required": ["severity", "root_cause", "action_items"]
}
```

### Tại sao JSON schemas thắng trong production:
- **Validatable** — `jsonschema` hoặc `pydantic` validate output
- **Parseable** — `json.loads()` là xong
- **Type-safe** — Boolean là boolean, number là number
- **Auto-retry** — Output invalid JSON → frameworks retry với error message
- **API-ready** — Pass output trực tiếp vào downstream systems

---

## 3. Output Types

```python
# Pydantic
class CodeReview(BaseModel):
    file_path: str
    issues: list[dict]
    score: int = Field(ge=1, le=10)
    verdict: Literal["approve", "changes_requested", "blocked"]
```

```typescript
// Zod
const CodeReviewSchema = z.object({
  filePath: z.string(),
  score: z.number().min(1).max(10),
  verdict: z.enum(["approve", "changes_requested", "blocked"]),
});
```

Output types thắng unstructured nhờ: parse errors ít, type safety, self-documenting, IDE support, testability.

---

## 4. Chain-of-Thought

CoT prompting buộc model reasoning step-by-step trước khi trả lời:

```python
prompt = """Solve step by step, then output JSON.

Problem: Payment $156.78, fee 2.9% + $0.30. Net amount?

Step by step:
1. Percentage fee: $156.78 × 0.029 = $4.55
2. Fixed fee: $0.30
3. Total fee: $4.85
4. Net: $156.78 - $4.85 = $151.93

JSON output:
{
    "gross_amount": 156.78,
    "net_amount": 151.93,
    "total_fee": 4.85
}
"""
```

---

## Kết Hợp Cả Bốn Patterns

```python
prompt = """
<task>Phân tích incident deployment dưới đây</task>
<context>Service: payment-api, Time: 02:15 UTC, Error: Connection pool exhaustion</context>

<reasoning>Suy luận step-by-step trước khi trả lời</reasoning>

<output_format>
Return JSON matching schema: { "root_cause": "string", "severity": "critical|high|medium|low", "prevention": ["string"] }
</output_format>
"""
```

1. **XML tags** — Tách context khỏi instructions
2. **Chain-of-thought** — Buộc reasoning trước output
3. **JSON schema** — Constrain output structure
4. **Pydantic validation** — Đảm bảo response dùng được programmatically

---

## Anti-Patterns

1. **Mix formats** — JSON trong XML trong YAML → Pick one format
2. **Over-specifying** — 20+ fields → Giữ schema dưới 8 fields
3. **No fallback for parse failures** — Luôn có try/except + regex fallback

---

## Production Checklist

- [ ] Output format specified BEFORE user input
- [ ] JSON schemas include field descriptions
- [ ] Schemas validated with Pydantic/Zod pre-deployment
- [ ] Parse failures có fallback strategy
- [ ] CoT tách biệt khỏi final output
- [ ] XML tags consistent (case, nesting, closing)
- [ ] Schema complexity matches task complexity

---

## Tiếp Theo

| Bài | Chủ đề |
|-----|--------|
| 1 | System Prompts vs Steering Files vs Agent Instructions |
| 2 | MCP Tools as Prompts |
| 3 | **Structured Prompting** (bài này) |
| 4 | Prompt Testing & Evaluation |
| 5 | Production Patterns & Anti-Patterns |

---

*Series: Prompt Engineering 2026 — Production Patterns. Bài 3: Structured Prompting.*
