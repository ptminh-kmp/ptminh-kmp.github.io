---
title: "CrewAI: Framework Multi-Agent dạng Vai trò — Đường đến Production Nhanh Nhất"
description: "Tìm hiểu sâu về CrewAI — framework multi-agent dạng vai trò đạt 32k+ sao GitHub trong chưa đầy hai năm. Vai trò agent, crews, phân công task, tích hợp tool và khi nào chọn nó thay vì LangGraph."
published: 2026-05-22
pubDate: 2026-05-22T10:00:00.000Z
slug: crewai-role-based-multi-agent-framework-guide-2026-vi
tags:
  - crewai
  - multi-agent
  - ai-agents
  - agent-framework
  - role-based
  - llm
  - orchestration
category: ai-agents
lang: vi
series:
  - "AI Agent Frameworks 2026 — Production Comparison"
order: 2
total: 6
lang: vi
series:
  name: "AI Agent Frameworks 2026 — So sánh Production"
  order: 2
  total: 6
---

Bài 1, chúng ta đã đề cập LangGraph — tiêu chuẩn production cho workflow agent phức tạp, có kiểm toán. LangGraph mạnh mẽ, nhưng nó đòi hỏi tư duy dạng graph. Đôi khi bạn không cần graph. Đôi khi bạn cần một **đội**.

CrewAI cho bạn một đội.

Thay vì định nghĩa nodes và edges, bạn định nghĩa agents với vai trò, mục tiêu và tính cách. Một crew các agent hợp tác để hoàn thành task — chuyển output, phân công công việc và tự sửa lỗi. Mô hình tư duy này dễ hiểu ngay lập tức với product managers, stakeholders và developers.

Hơn 32,000 sao GitHub và đang tăng nhanh. CrewAI gọi vốn năm 2025 và ra mắt enterprise features. Đó là đường nhanh nhất từ concept đến working demo — và ngày càng nhiều, từ demo đến production.

---

## CrewAI Là Gì?

CrewAI là framework orchestration multi-agent dạng vai trò. Bạn định nghĩa agents như các **vai trò** với mục tiêu và backstory cụ thể. Một **crew** là đội agent làm việc cùng nhau trên các task. Framework xử lý delegation, tool assignment và output passing.

```python
from crewai import Agent, Task, Crew, Process

researcher = Agent(
    role="Chuyên viên Phân tích Thị trường",
    goal="Tìm dữ liệu định giá và định vị của đối thủ",
    backstory="Bạn là nhà phân tích cao cấp đã theo dõi thị trường này 10 năm.",
    tools=[web_search, database_query],
    verbose=True
)

analyst = Agent(
    role="Chiến lược gia Định giá",
    goal="Đề xuất giá tối ưu dựa trên dữ liệu thị trường",
    backstory="Bạn đã tối ưu định giá cho hơn 50 thương hiệu e-commerce.",
    tools=[calculator, reporting_tool]
)

crew = Crew(
    agents=[researcher, analyst],
    tasks=[research_task, analysis_task],
    process=Process.sequential
)
```

Năm dòng định nghĩa một chuyên gia. Mười dòng định nghĩa một đội. Hai mươi dòng định nghĩa workflow hoàn chỉnh. Tính dễ đọc này là siêu năng lực của CrewAI — stakeholders phi kỹ thuật có thể đọc và đề xuất thay đổi định nghĩa agent mà không cần chạm code.

---

## Khái Niệm Cốt Lõi

### Agents (Vai trò)

Mỗi agent có:

| Trường | Mục đích | Ví dụ |
|--------|----------|-------|
| `role` | Chức danh | "Senior Data Scientist" |
| `goal` | Mục tiêu | "Trích xuất insights từ dữ liệu khách hàng" |
| `backstory` | Ngữ cảnh và tính cách | "Bạn đã làm e-commerce 8 năm" |
| `tools` | Công cụ có thể dùng | `[web_search, sql_query, calculator]` |
| `allow_delegation` | Có thể nhờ agent khác? | `True` |

`Backstory` không chỉ là trang trí. Nó ảnh hưởng trực tiếp đến cách LLM diễn giải hướng dẫn và ra quyết định. Agent "kiểm toán viên hoài nghi" và agent "chiến lược gia sáng tạo" sẽ tạo ra output rất khác nhau từ cùng một task.

### Tasks

Tasks mô tả những gì cần làm:

```python
research_task = Task(
    description="Nghiên cứu top 5 đối thủ và bảng giá",
    expected_output="Bảng markdown với tên đối thủ, giá và tính năng chính",
    agent=researcher,
    async_execution=False
)
```

### Crews và Processes

Crew định nghĩa cách agent hợp tác:

```python
crew = Crew(
    agents=[researcher, analyst, writer],
    tasks=[research_task, analysis_task, report_task],
    process=Process.sequential,
    verbose=True,
    memory=True
)
```

Hai process built-in:

| Process | Hành vi | Tốt nhất cho |
|---------|---------|--------------|
| `sequential` | Task chạy tuần tự | Pipeline rõ ràng, không phân nhánh |
| `hierarchical` | Manager agent phân công | Task phức tạp cần phối hợp |

---

## CrewAI vs LangGraph: Chọn Cái Nào

| Khía cạnh | CrewAI | LangGraph |
|-----------|--------|-----------|
| **Mô hình tư duy** | Vai trò và đội | Nodes và edges |
| **Thời gian thiết lập** | Giờ → demo | Ngày → production |
| **Dễ đọc phi kỹ thuật** | Xuất sắc | Kém |
| **Thực thi xác định** | Hạn chế | Full control |
| **Human-in-the-loop** | Qua callbacks | Native (pause/resume) |
| **Compliance audit** | Thủ công | Built-in graph traces |
| **Sao GitHub** | 32k | 126k |

**Chọn CrewAI khi:**
- Cần demo nhanh — giờ, không phải ngày
- Stakeholders phi kỹ thuật cần hiểu hành vi agent
- Workflow là pipeline tuần tự hoặc delegation đơn giản
- Đang prototype multi-agent trước khi chọn framework

**Chọn LangGraph khi:**
- Cần execution paths xác định, có audit
- Compliance và human-in-the-loop bắt buộc
- Workflow có branching, cycles, parallel execution phức tạp
- Xây dựng production với yêu cầu reliability cao

---

## Giới Hạn

1. **Kiểm soát graph hạn chế** — `sequential` và `hierarchical` cover 80% use case, 20% còn lại cần LangGraph
2. **Quản lý state** — Shared state hoạt động tốt cho pipeline nhưng messy với circular dependencies
3. **Observability** — CrewAI track metrics cơ bản, nhưng LangSmith chi tiết hơn
4. **Scale** — Ở 15k+ request/ngày, memory system có thể thành bottleneck

---

## Tiếp Theo

| Bài | Framework |
|-----|-----------|
| 1 | LangGraph |
| 2 | **CrewAI** (bài này) |
| 3 | AutoGen (Microsoft) |
| 4 | Claude Agent SDK (Anthropic) |
| 5 | OpenAI Agents SDK |
| 6 | **So sánh cuối** |

---

*Series: AI Agent Frameworks 2026 — So sánh Production. Bài 2: CrewAI. Bài 3: AutoGen → sắp tới.*
