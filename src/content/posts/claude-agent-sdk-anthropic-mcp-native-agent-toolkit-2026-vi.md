---
title: "Claude Agent SDK: Bộ công cụ Agent MCP-Native của Anthropic"
description: "Tìm hiểu sâu về Claude Agent SDK — framework agent đẳng cấp đầu tiên của Anthropic với MCP native, tools-as-resources, computer use và agent loop pattern. Xây dựng agent MCP-native từ nền tảng."
published: 2026-05-24
pubDate: 2026-05-24T10:00:00.000Z
slug: claude-agent-sdk-anthropic-mcp-native-agent-toolkit-2026-vi
tags:
  - claude
  - anthropic
  - agent-sdk
  - mcp
  - ai-agents
  - agent-framework
  - computer-use
  - tool-use
category: ai-agents
lang: vi
series:
  name: "AI Agent Frameworks 2026 — So sánh Production"
  order: 4
  total: 6
---

LangGraph, CrewAI và AutoGen đều hỗ trợ MCP như một tính năng có thể plug-in. Claude Agent SDK khác: **MCP là nền tảng, không phải add-on.**

Framework agent của Anthropic được xây dựng song song với spec MCP. Mọi agent trong SDK này nói MCP native — kết nối tools, đọc resources và quản lý prompts thông qua protocol. Nếu bạn đã theo dõi series MCP và Kiro của blog này, đây là framework được thiết kế từ đầu cho thế giới mà những bài đó mô tả.

Ra mắt đầu năm 2026, Claude Agent SDK nằm dưới Claude Code trong product stack của Anthropic. Claude Code là trải nghiệm IDE đầy đủ. SDK là thứ bạn dùng để xây dựng agent của riêng mình, tự động hóa workflow và nhúng khả năng của Claude vào ứng dụng.

---

## Điều Gì Làm Nó Khác Biệt

Ba quyết định thiết kế đặt Claude Agent SDK khác mọi framework khác:

### 1. Kiến Trúc MCP-Native

Mọi framework khác coi MCP là một tùy chọn tích hợp. Claude Agent SDK không có "MCP adapter" — agent loop tự nó giao tiếp qua MCP.

```python
from claude_agent import Agent, MCPConfig

agent = Agent(
    model="claude-sonnet-4",
    mcp_servers=[
        MCPConfig(command="npx", args=["-y", "@modelcontextprotocol/server-github"]),
        MCPConfig(command="node", args=["./my-mcp-server/index.js"]),
    ]
)
```

Agent kết nối MCP servers khi khởi động. Tools được tự động phát hiện qua MCP `tools/list` endpoint. Không cần đăng ký tool thủ công, không decorators, không function wrapping.

### 2. Tools là Resources, Không phải Functions

```python
# SDK: tool_use trả về MCP resource với structured content
agent.use_tool("search_docs", {"query": "authentication flow"})
# Trả về: typed content blocks (text, image, JSON)
```

Tools tạo typed content blocks thay vì raw strings. Agent suy luận về tool outputs chính xác hơn.

### 3. Computer Use Built In

SDK bao gồm khả năng `Computer` — tính năng cho phép Claude nhìn screenshot, di chuyển cursor và tương tác với desktop apps:

```python
from claude_agent.tools import Computer

agent = Agent(
    model="claude-sonnet-4",
    tools=[Computer()]
)
```

Hữu ích cho:
- **Testing UI workflows** — QA tự động dùng interface thực
- **Legacy system integration** — Tương tác hệ thống không API
- **Desktop automation** — Quản lý file, điều khiển ứng dụng

---

## Kiến Trúc Cốt Lõi

### Agent Loop

```python
agent = Agent(
    model="claude-sonnet-4",
    mcp_servers=[github_server, db_server, docs_server],
    system_prompt="Bạn là DevOps engineer."
)

response = await agent.run("Deploy bản build mới nhất lên staging")
```

Bạn có thể hook vào loop:

```python
agent.on("tool_call", lambda tool, args: log_tool_usage(tool, args))
agent.on("tool_result", lambda result: validate_output(result))
```

### Memory

```python
from claude_agent import Agent, FileMemory, PostgresMemory

agent = Agent(memory=FileMemory(path="./agent_memory"))
agent = Agent(memory=PostgresMemory(connection_string=os.getenv("DB_URL")))
```

Memory lưu: conversation history, preferences, tool output cache, session state.

### Thinking Mode

```python
agent = Agent(model="claude-sonnet-4", thinking_budget=16000)

result = await agent.run_with_thinking(
    "Debug connection pool exhaustion",
    stream_thinking=True
)
```

---

## Tool Composition

```python
from claude_agent import Tool, compose_tools

@Tool
def search_github_issues(repo: str, query: str): ...

@Tool
def read_issue(issue_url: str): ...

incident_response = compose_tools(
    "incident_response",
    tools=[search_github_issues, read_issue],
)

agent.add_tool(incident_response)
```

Composed tool xuất hiện như một capability đơn lẻ. SDK orchestrate sub-tools.

---

## Claude Agent SDK vs Claude Code

| | Claude Agent SDK | Claude Code |
|--|-----------------|-------------|
| **Mục đích** | Xây dựng agent tùy chỉnh | Coding tương tác |
| **Interface** | Python SDK | Terminal / IDE |
| **MCP** | Native | Plugin |
| **Computer Use** | Có | Không |
| **Custom logic** | Full control | Qua rules files |
| **Triển khai** | Infrastructure của bạn | Terminal của Anthropic |

Claude Code là sản phẩm shipped. SDK là thứ bạn build với.

---

## Khi Nào Chọn

### Phù hợp
- **Kiến trúc MCP-heavy** — Nhiều MCP servers, SDK xử lý native
- **Computer Use workflows** — UI testing, desktop automation
- **Stack chỉ Anthropic** — Claude là model provider duy nhất
- **Custom agent loops** — Cần inspect, log, modify decision loop

### Tránh khi
- **Cần multi-model** — SDK chỉ Claude
- **Team không dùng MCP** — SDK assume MCP
- **Cần cross-repo orchestration** — Đó là lãnh thổ Kiro
- **Team ưa LangChain** — SDK không integration với LangChain

---

## Tiếp Theo

| Bài | Framework |
|-----|-----------|
| 1 | LangGraph |
| 2 | CrewAI |
| 3 | AutoGen |
| 4 | **Claude Agent SDK** (bài này) |
| 5 | OpenAI Agents SDK |
| 6 | **So sánh cuối** |

---

*Series: AI Agent Frameworks 2026 — So sánh Production. Bài 4: Claude Agent SDK. Bài 5: OpenAI Agents SDK → sắp tới.*
