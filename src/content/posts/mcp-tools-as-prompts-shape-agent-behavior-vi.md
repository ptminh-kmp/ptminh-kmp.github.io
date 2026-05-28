---
title: "MCP Tools as Prompts: Định nghĩa Tool Điều Khiển Hành Vi Agent"
description: "Định nghĩa MCP tools của bạn cũng là prompts. Cách tên tool, mô tả, input schemas và error messages ảnh hưởng đến quyết định của agent. Production patterns cho viết tools điều khiển hành vi agent."
published: 2026-05-28
pubDate: 2026-05-28T23:20:00.000Z
slug: mcp-tools-as-prompts-shape-agent-behavior-vi
tags:
  - prompt-engineering
  - mcp
  - tools
  - agent-behavior
  - tool-design
  - production
  - function-calling
category: prompt-engineering
lang: vi
series:
  name: "Prompt Engineering 2026 — Production Patterns"
  order: 2
  total: 5
---

Tools của bạn là prompts.

Mọi MCP server bạn kết nối, mọi function bạn register, mọi tool description bạn viết — tất cả đều nằm trong context window của agent cùng với system prompt và steering file. Agent đọc chúng, suy luận về chúng và quyết định gọi tool nào.

Hầu hết teams dành hàng giờ để viết system prompt nhưng viết tool definitions như việc phụ. Bài này cho thấy tại sao họ sai.

---

## Prompt Ẩn: Tool Definitions

Khi bạn kết nối MCP server, bước đầu tiên của agent là gọi `tools/list`. Mỗi tool trả về:
- **Tool name** — `search_docs` vs `search_internal_documentation_v2`
- **Description** — "Searches docs" vs "Searches knowledge base. Gọi cái này trước khi viết code."
- **Input schema** — Parameters, types, defaults
- **Output format** — Structured content blocks hay plain text

Metadata này được inject vào system context của agent. Agent coi nó như instructions về những gì nó *có thể* làm.

---

## MCP Tool Prompt Spectrum

Mọi phần của tool definition đều là instruction cho agent:

| Tool Element | Prompt Function | Example |
|-------------|----------------|--------|
| **Name** | Identifies capability | `send_email` vs `send_urgent_email_alert` |
| **Description** | Cho agent biết khi nào dùng | "For production incidents only" |
| **Input schema** | Định nghĩa arguments agent phải gather | Required fields buộc agent collect data trước khi gọi |
| **Error messages** | Hướng dẫn recovery | "Retry với backoff" vs "Contact support" |

---

## Patterns

### Pattern 1: Viết Descriptions như Instructions

```python
# Dở: chỉ mô tả
"description": "Lấy user data từ database"

# Tốt: mô tả VÀ hướng dẫn
"description": """Lấy user data từ database.
Luôn gọi cái này khi cần user info thay vì đoán.
Returns: user_id, email, role, created_at.
Không bao giờ log email field — nó chứa PII.
Nếu user không tìm thấy, check archive database thay vì báo error."""
```

### Pattern 2: Dùng Tool Names để Routing

```python
# Trước: generic name, agent confused
"name": "query_production", "description": "Query production DB"
"name": "query_staging", "description": "Query staging DB"
# Agent route chính xác dựa trên context
```

### Pattern 3: Input Schema như Guardrails

```python
"inputSchema": {
    "amount": {
        "type": "number",
        "description": "Refund amount in cents. Max 50000 ($500). Refunds over $100 cần manager approval."
    }
}
```

Input schema hoạt động như guardrail. Agent đọc description và điều chỉnh behavior — nó sẽ không attempt refund $500+ mà không check.

---

## Case Study

### Before (minimal tool definitions):
**Agent behavior:** Không predictable. Thỉnh thoảng search, thỉnh thoảng guess. Hay gọi sai tool.

### After (prompt-aware tool definitions):
**Agent behavior:** Consistent. Search trước, đọc relevant code, rồi write với testing.

---

## Khi Tool Prompting Không Đủ

Tool prompts hoạt động cho linear, sequential behavior. Fail khi:
- **Cần conditional branching** — "Nếu A làm X, nếu B làm Y"
- **Cần parallel execution** — Cần framework như LangGraph
- **Có 50+ tools** — Context window đầy
- **Cần precise timing** — "Đợi 5 phút rồi gọi"

Dùng layered approach cho những case này.

---

## Production Checklist

- [ ] Mọi tool description bao gồm "khi nào gọi cái này"
- [ ] Critical tools có post-call instructions
- [ ] Error-prone tools có recovery instructions
- [ ] Tool names phản ánh role của chúng
- [ ] Input schema descriptions quan trọng như tool descriptions

---

## Tiếp Theo

| Bài | Chủ đề |
|-----|--------|
| 1 | System Prompts vs Steering Files vs Agent Instructions |
| 2 | **MCP Tools as Prompts** (bài này) |
| 3 | Structured Prompting |
| 4 | Prompt Testing & Evaluation |
| 5 | Production Patterns & Anti-Patterns |

---

*Series: Prompt Engineering 2026 — Production Patterns. Bài 2: MCP Tools as Prompts.*
