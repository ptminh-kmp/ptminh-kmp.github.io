---
title: "AutoGen (Microsoft): Hội thoại Multi-Agent và Sinh Code"
description: "Tìm hiểu sâu về AutoGen của Microsoft — được xây dựng lại từ đầu năm 2025 cho production. Hội thoại agent, code generation agents, group chats, tool use và mẫu triển khai thực tế với Azure."
published: 2026-05-23
pubDate: 2026-05-23T10:00:00.000Z
slug: autogen-microsoft-multi-agent-conversations-code-generation-2026-vi
tags:
  - autogen
  - microsoft
  - multi-agent
  - ai-agents
  - agent-framework
  - code-generation
  - group-chat
  - azure
category: ai-agents
lang: vi
series:
  name: "AI Agent Frameworks 2026 — So sánh Production"
  order: 3
  total: 6
---

LangGraph cho bạn graphs. CrewAI cho bạn đội. AutoGen cho bạn **hội thoại**.

Framework AutoGen của Microsoft được xây dựng lại từ đầu năm 2025 và khác hoàn toàn bản gốc. Kiến trúc mới bỏ hệ thống autobuild cũ để lấy mô hình agent-as-program — agents là các object Python thông thường giao tiếp qua tin nhắn có kiểu. Nó tích hợp Azure AI native, bảo mật doanh nghiệp và sandbox thực thi code không cần Docker.

Hơn 47,000 sao GitHub (trước khi rebuild) và cuộc sống thứ hai sau khi viết lại. AutoGen là cược của Microsoft vào hội thoại multi-agent như pattern tương tác chính cho hệ thống AI.

---

## AutoGen Là Gì?

AutoGen là framework hội thoại multi-agent từ Microsoft Research. Agents giao tiếp qua tin nhắn có cấu trúc — hãy nghĩ về nó như nền tảng nhắn tin nơi mỗi người tham gia là một AI agent với khả năng cụ thể.

```python
from autogen_agent import Agent, ChatAgent, ToolAgent
from autogen_runtime import Runtime, GroupChat

class DataAnalyst(ChatAgent):
    def __init__(self):
        super().__init__(name="analyst")
        self.system_prompt = "Bạn phân tích dữ liệu và tạo biểu đồ"
        self.tools = [query_database, generate_chart]

class CodeReviewer(ChatAgent):
    def __init__(self):
        super().__init__(name="reviewer")
        self.system_prompt = "Bạn review code cho bugs và bảo mật"
        self.tools = [run_linter, check_security]
```

Agents đăng ký với `Runtime` và tham gia `GroupChat`. Tin nhắn chảy giữa các agent dựa trên routing rules hoặc vai trò được chỉ định.

---

## Thay Đổi Lớn: 2025 Rebuild

| Khía cạnh | AutoGen Gốc | AutoGen 2025 |
|-----------|-------------|--------------|
| **Agent model** | Autobuild (dynamic) | Agent-as-program (explicit) |
| **Giao tiếp** | Implicit message passing | Typed messages, declared contracts |
| **State** | Ẩn trong agent internals | Explicit trên Runtime |
| **Debugging** | Black box | Full execution traces |
| **Thực thi code** | Docker bắt buộc | Built-in sandbox (không Docker) |
| **Azure integration** | Thủ công | Native Azure AI + Entra ID |
| **Memory** | Không có | Persistent xuyên session |

---

## Khái Niệm Cốt Lõi

### Agents

```python
class CustomerSupportAgent(ChatAgent):
    def __init__(self):
        super().__init__(name="support")
        self.system_prompt = """Bạn là agent L1 support.
        Xử lý vấn đề thông thường:
        - Reset password: dùng reset_password tool
        - Billing: chuyển đến billing_agent
        - Technical: chuyển đến tech_agent
        """
        self.tools = [reset_password, lookup_account, search_kb]
```

### Typed Messages

Tin nhắn có trường kiểu, không phải text tự do:

```python
@dataclass
class SupportTicket(Message):
    ticket_id: str
    customer_email: str
    issue_type: str  # "billing" | "technical" | "account"
    description: str
    priority: int
```

Đây là khác biệt lớn so với CrewAI. Tin nhắn typed có nghĩa:
- Agents có thể xác thực cấu trúc tin nhắn
- Routing dựa trên structured fields
- Debug dễ hơn

### GroupChat

```python
chat = GroupChat(
    agents=[triage, billing, tech, escalation],
    routing="round_robin",
    max_turns=10,
    admin_agent=escalation
)
```

| Mode | Hành vi | Use Case |
|------|---------|----------|
| `round_robin` | Mỗi agent nói lần lượt | Tranh luận, brainstorming |
| `role_based` | Tin nhắn route bởi `to` field | Support, workflow |
| `broadcast` | Tất cả agents nhận mọi tin nhắn | Chia sẻ thông tin |
| `custom` | Hàm routing tự định nghĩa | Orchestration phức tạp |

---

## Sandbox Thực Thi Code

Tính năng nổi bật của AutoGen — sandbox built-in, không cần Docker:

```python
from autogen_code import CodeExecutionAgent

coder = CodeExecutionAgent(
    name="code_runner",
    language="python",
    sandbox="built-in",
    timeout=30,
    max_output_size=10000
)
```

Sandbox hoạt động bằng cách:
1. Tạo process riêng cho mỗi lần thực thi
2. Giới hạn truy cập filesystem vào thư mục temp
3. Giới hạn network (allowlist configurable)
4. Áp dụng memory và CPU limits
5. Kill process vượt quá timeout

---

## Tích Hợp Azure

AutoGen là framework duy nhất tích hợp Azure AI native:

```python
from autogen_azure import AzureRuntime

runtime = AzureRuntime(
    model="gpt-4o",
    deployment="my-deployment",
    endpoint=os.getenv("AZURE_OPENAI_ENDPOINT"),
    auth="entra_id",
    content_filter=True
)
```

Cho enterprise đã dùng Azure, integration này tự justify AutoGen.

---

## AutoGen vs LangGraph vs CrewAI

| Khía cạnh | AutoGen | LangGraph | CrewAI |
|-----------|---------|-----------|--------|
| **Core metaphor** | Hội thoại | Graphs | Vai trò |
| **Message model** | Typed messages | Shared state | Freeform text |
| **Thực thi code** | Built-in sandbox | External tools | External tools |
| **Azure native** | Có | Không | Không |
| **Học** | Trung bình | Cao | Thấp |
| **Tốt nhất cho** | Code gen, enterprise support | Workflow phức tạp, compliance | Prototyping nhanh |

---

## Giới Hạn

1. **Phụ thuộc Azure nặng** — Content filtering, managed identity chỉ hoạt động với Azure
2. **Typed messages cần planning upfront** — Chậm prototyping nhưng tốt cho correctness
3. **GroupChat có thể deadlock** — Cần `max_turns` limit
4. **Ecosystem nhỏ hơn** — Ít community tools hơn LangChain

---

## Tiếp Theo

| Bài | Framework |
|-----|-----------|
| 1 | LangGraph |
| 2 | CrewAI |
| 3 | **AutoGen** (bài này) |
| 4 | Claude Agent SDK |
| 5 | OpenAI Agents SDK |
| 6 | **So sánh cuối** |

---

*Series: AI Agent Frameworks 2026 — So sánh Production. Bài 3: AutoGen. Bài 4: Claude Agent SDK → sắp tới.*
