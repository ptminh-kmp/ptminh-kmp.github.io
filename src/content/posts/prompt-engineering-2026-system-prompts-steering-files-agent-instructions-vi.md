---
title: "Prompt Engineering 2026: System Prompts vs Steering Files vs Agent Instructions"
description: "Cách prompt engineering đã thay đổi trong kỷ nguyên agent. So sánh system prompts, Kiro steering files, Claude Code .claude.md rules, Cursor .cursorrules và Agent SDK instructions. Production patterns cho từng approach."
published: 2026-05-28
pubDate: 2026-05-28T15:10:00.000Z
slug: prompt-engineering-2026-system-prompts-steering-files-agent-instructions-vi
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
lang: vi
series:
  name: "Prompt Engineering 2026 — Production Patterns"
  order: 1
  total: 5
---

Năm 2023, prompt engineering là viết câu hỏi hay hơn cho ChatGPT.

Năm 2026, prompt engineering là thứ hoàn toàn khác. Bạn không nói chuyện với chatbot nữa — bạn đang lập trình một agent. System prompts đã trở thành configuration files. Instructions được version-control. Prompt của bạn định nghĩa tool access, safety boundaries và behavioral guardrails.

Series này covers 5 pillars của prompt engineering hiện đại. Bài đầu tiên thiết lập bức tranh tổng thể: ba cơ chế chính để điều khiển hành vi agent và khi nào dùng cái nào.

---

## Ba Cơ Chế

| Cơ chế | Ở đâu | Scope | Thay đổi | Version Control |
|--------|-------|-------|---------|-----------------|
| **System prompt** | LLM API call | Per-session | Mỗi lần gọi | Thường không |
| **Steering files** | Project directory | Per-repository | Commit cùng code | ✅ Git-tracked |
| **Agent instructions** | Agent definition | Per-agent | Config deploy | ✅ Git-tracked |

Mỗi cơ chế có vai trò khác nhau. Teams thông minh dùng cả ba.

---

## 1. System Prompts: Nền Tảng

### 2023 style (dở):

```text
Bạn là expert software engineer 20 năm kinh nghiệm...
Hãy helpful, harmless, honest...
Tuân theo 47 rules khi viết code...
[500 từ instructions nữa]
```

### 2026 style (tốt):

```text
Bạn là DevOps engineer cho payments platform.
Repo context nằm trong MCP tools. Dùng chúng trước khi code.
Khi không chắc, check steering file. Khi bí, escalate.
```

Tại sao ngắn hơn? Vì system prompts giờ delegate cho các cơ chế khác:
- **MCP tools** cung cấp context on demand
- **Steering files** định nghĩa project-specific rules
- **Agent instructions** encode task-specific behavior

---

## 2. Steering Files: Per-Project Behavior

Steering files là innovation lớn nhất trong prompt engineering kể từ system prompt.

### Kiro Steering (`./kiro/steering.md`)
### Claude Code Rules (`./.claude.md`)
### Cursor Rules (`./.cursorrules`)

### Tại sao steering files thắng:

| Khía cạnh | System Prompt | Steering File |
|-----------|--------------|---------------|
| **Visibility** | Ẩn trong API calls | Hiện trong repo root |
| **Review** | Code review gì? | ✅ PR-reviewed |
| **Freshness** | Stale nếu ko update per call | ✅ Luôn current |
| **Sharing** | Per-developer | ✅ Per-project |

---

## 3. Agent Instructions: Per-Instance Behavior

Granular nhất. Định nghĩa agent cụ thể làm gì, dùng tool nào, handoff ra sao.

```python
# Claude Agent SDK
payment_agent = Agent(
    instructions="""Xử lý payment transactions.
    - Dùng Payment MCP cho mọi transaction
    - Flag transactions > $10,000 cho human review
    - Không retry failed payment quá 3 lần
    """
)
```

---

## Layered Prompt Architecture

```
Layer 1: System Prompt (model-level)
  └─ "Bạn là software engineer. Follow rules trong steering file."
      │
Layer 2: Steering File (project-level)
  └─ ".kiro/steering.md" → tech stack, conventions
      │
Layer 3: Agent Instructions (instance-level)
  └─ "Xử lý payment. Dùng Payment MCP. Escalate > $10k."
```

---

## Anti-Patterns

1. **System prompt 2000 từ** → Giữ dưới 200 từ, delegate phần còn lại
2. **Bỏ qua steering files** → Agent viết Express.js trong project Hono
3. **Nhồi project rules vào agent instructions** → Dùng steering file cho việc đó

---

## Tiếp Theo

| Bài | Chủ đề |
|-----|--------|
| 1 | **System Prompts vs Steering Files vs Agent Instructions** (bài này) |
| 2 | MCP Tools as Prompts |
| 3 | Structured Prompting |
| 4 | Prompt Testing & Evaluation |
| 5 | Production Patterns & Anti-Patterns |

---

*Series: Prompt Engineering 2026 — Production Patterns. Bài 1: Ba cơ chế điều khiển hành vi agent.*
