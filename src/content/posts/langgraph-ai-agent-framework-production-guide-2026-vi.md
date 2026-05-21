---
title: "LangGraph: Framework AI Agent dạng Graph — Hướng dẫn Production 2026"
description: "Tìm hiểu sâu về LangGraph (126k+ sao GitHub) — framework orchestration AI agent dạng graph. State graphs, human-in-the-loop, LangSmith observability, mẫu triển khai production và code ví dụ thực tế."
published: 2026-05-21
pubDate: 2026-05-21T10:00:00.000Z
slug: langgraph-ai-agent-framework-production-guide-2026-vi
tags:
  - langgraph
  - langchain
  - ai-agents
  - agent-framework
  - machine-learning
  - llm
  - production-ai
  - orchestration
category: ai-agents
lang: vi
series:
  name: "AI Agent Frameworks 2026 — So sánh Production"
  order: 1
  total: 6
---

Chào mừng đến với series mới: **AI Agent Frameworks 2026**. Trong sáu bài tiếp theo, chúng ta sẽ đề cập mọi framework agent chính đang được dùng trong production hiện nay — LangGraph, CrewAI, AutoGen, Claude Agent SDK, OpenAI Agents SDK, và bài so sánh cuối cùng với khung quyết định.

Chúng ta bắt đầu với leader không thể tranh cãi: **LangGraph**.

Với hơn 126,000 sao GitHub và được áp dụng trong healthcare, tài chính, logistics và e-commerce, LangGraph đã trở thành lựa chọn mặc định cho các team xây dựng AI agent nghiêm túc. Nhưng điều gì làm nó trở thành tiêu chuẩn production — và nó có phù hợp với dự án của bạn không?

---

## LangGraph Là Gì?

LangGraph là framework orchestration dạng graph từ đội ngũ LangChain. Thay vì xử lý workflow agent như chuỗi tuần tự (input → process → output), LangGraph mô hình hóa chúng như **state graphs** — các node được kết nối bằng edges với logic routing có điều kiện.

```python
from langgraph.graph import StateGraph, END
from typing import TypedDict

class AgentState(TypedDict):
    query: str
    context: list[str]
    response: str
    requires_human_review: bool

def route_after_analysis(state: AgentState) -> str:
    if state["requires_human_review"]:
        return "human_review"
    return "generate_response"

workflow = StateGraph(AgentState)
workflow.add_node("analyze", analyze_query)
workflow.add_node("retrieve", retrieve_context)
workflow.add_node("human_review", pause_for_human)
workflow.add_node("generate_response", generate)
workflow.add_conditional_edges("analyze", route_after_analysis)
```

Mọi quyết định đều tường minh. Mọi chuyển đổi trạng thái đều xác định. Đội compliance có thể kiểm tra chính xác đường đi của bất kỳ request nào.

---

## Các Khái Niệm Cốt Lõi

### 1. State Graph

State graph là trái tim của LangGraph. Không giống chain (tuyến tính, đường cố định) hay loop (lặp lại), graph cho phép:

- **Branching** — Các đường khác nhau dựa trên quyết định của agent
- **Cycles** — Agent có thể vào lại node trước đó (thử lại, tinh chỉnh)
- **Parallel execution** — Nhiều node chạy đồng thời
- **Human-in-the-loop** — Tạm dừng thực thi, thu thập input, tiếp tục

`AgentState` TypedDict định nghĩa schema chảy qua mọi node. Mỗi node đọc từ và ghi vào shared state này.

### 2. Nodes

Nodes là các đơn vị chức năng — mỗi node là một hàm Python (hoặc async):

```python
def analyze_query(state: AgentState) -> AgentState:
    llm = ChatOpenAI(model="gpt-4o")
    analysis = llm.invoke(f"Phân tích query: {state['query']}")
    state["context"].append(analysis.content)
    # Hàm phải trả về state đã cập nhật
    return state
```

Nodes có thể:
- Gọi LLM, API, database, hoặc bất kỳ công cụ ngoài nào
- Sửa đổi shared state
- Tạm dừng cho human input
- Trả về key mới mà các node sau tiêu thụ

### 3. Edges và Conditional Routing

Edges định nghĩa cách state chảy giữa các node. Ba loại:

```python
# 1. Normal edge: luôn đi từ node A đến node B
workflow.add_edge("analyze", "retrieve")

# 2. Conditional edge: định tuyến bởi hàm
workflow.add_conditional_edges("analyze", route_after_analysis)

# 3. Entry/exit points
workflow.set_entry_point("analyze")
workflow.add_edge("generate_response", END)
```

Hàm routing nhận state hiện tại và trả về tên node tiếp theo. Điều này rất quan trọng cho compliance — mọi quyết định routing là code, không phải phép màu.

### 4. Human-in-the-Loop

Đây là killer feature của LangGraph cho các ngành được quản lý:

```python
workflow.add_node("human_review", pause_for_human)

# Khi graph đến node này, nó tạm dừng và chờ
# Bạn có thể tiếp tục với:
thread = {"configurable": {"thread_id": "123"}}
# Sau đó:
graph.update_state(thread, {"human_approved": True})
```

Graph có thể tạm dừng ở bất kỳ node nào, chờ hàng giờ hoặc ngày cho human input, và tiếp tục chính xác nơi nó dừng — với full state được bảo toàn.

---

## LangSmith Observability

LangGraph đi kèm **LangSmith**, nền tảng observability trace mọi thực thi graph. Đây không phải tùy chọn — nó được thiết kế vào framework.

```
Trace: thread_abc123
├── analyze (2.4s, tokens: 1,234)
│   └── LLM call: gpt-4o (temperature: 0.1)
│       └── output: "Yêu cầu này cần human review do số tiền > $10K"
├── route_after_analysis → "human_review"
├── human_review (PAUSED - đang chờ input)
│   └── snapshot state: {query: "...", context: [...], requires_human_review: True}
```

Mọi trace hiển thị:
- **Latency** mỗi node (xác định bottleneck)
- **Token usage** mỗi LLM call (theo dõi chi phí)
- **State snapshots** mỗi bước (debugging)
- **Human review pauses** (audit trail)

---

## Triển khai Production

LangGraph thường được triển khai theo hai pattern:

### Pattern 1: API Server với Background Worker

```python
from fastapi import FastAPI
from langgraph.checkpoint import MemorySaver

app = FastAPI()
graph = build_graph()
checkpointer = MemorySaver()

@app.post("/agent/run")
async def run_agent(request: AgentRequest):
    result = await graph.ainvoke(
        {"query": request.query},
        {"configurable": {"thread_id": str(uuid4())}},
        checkpointer=checkpointer
    )
    return result
```

### Pattern 2: Async Task Queue với Redis Checkpoint

```python
from langgraph.checkpoint.redis import RedisSaver
checkpointer = RedisSaver(redis_client)
# Graph giờ có thể sống sót qua server restart
```

---

## Khi Nào Dùng LangGraph

### Phù hợp

| Kịch bản | Tại sao |
|----------|---------|
| Healthcare/Tài chính | Human-in-the-loop built-in |
| Quy trình cần audit | Routing quyết định là code deterministic |
| Multi-step agents phức tạp | Graph model handle branching, cycles, retries |
| Team có Python | Python native, không cần học DSL |
| Production volume cao | LangSmith observability |

### Không phù hợp

| Kịch bản | Tại sao |
|----------|---------|
| Chatbot agent đơn giản | Overkill. Dùng LangChain hoặc LLM trực tiếp |
| Prototype nhanh 1 ngày | CrewAI nhanh hơn |
| Team không Python | Chỉ Python — không JS/Go SDK |
| Cần real-time streaming | Hỗ trợ nhưng phức tạp hơn |

---

## Tiếp Theo

| Bài | Framework | Nội dung |
|-----|-----------|----------|
| 1 | **LangGraph** (bài này) | Graph orchestration, state management, LangSmith |
| 2 | CrewAI | Role-based multi-agent, prototyping nhanh nhất |
| 3 | AutoGen (Microsoft) | Multi-agent conversations, code generation |
| 4 | Claude Agent SDK | Anthropic agent toolkit, MCP-native |
| 5 | OpenAI Agents SDK | Handoffs, guardrails, built-in safety |
| 6 | **So sánh cuối** | Decision framework, chọn cái nào |

---

*Series: AI Agent Frameworks 2026 — So sánh Production. Bài 1: LangGraph. Bài 2: CrewAI → sắp tới.*
