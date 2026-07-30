---
title: "Gemini Spark Đã Ra Mắt: AI Agent 24/7 Của Google — Tính Năng, Cách Truy Cập và Tại Sao Nó Quan Trọng"
description: "Tổng quan thực tế về Gemini Spark: AI agent luôn hoạt động của Google, được công bố tại I/O 2026 và đang triển khai toàn cầu. Tính năng, giá cả, availability."
published: 2026-07-30
pubDate: 2026-07-30T05:30:00.000Z
slug: google-gemini-spark-247-ai-agent-guide-vi
tags:
  - google
  - gemini
  - spark
  - ai-agent
  - ai
  - 24-7
  - workspace
  - mcp
category: ai-agents
lang: vi
---

Google đã khẳng định tại I/O 2026 (tháng 5/2026) rằng họ muốn Gemini trở thành "tầng vận hành" cho cách con người làm việc — và trung tâm của tầm nhìn đó là **Gemini Spark**.

Được mô tả là "personal AI agent 24/7," Spark chạy trên các VM Google Cloud chuyên dụng, hoạt động ngay cả khi điện thoại của bạn khóa hoặc laptop tắt, và có thể thực thi các tác vụ đa bước một cách tự động. Nó không phải chatbot chờ câu hỏi. Nó là một agent bền bỉ mà bạn chỉ cần hướng dẫn một lần và để nó chạy.

Lộ trình triển khai đã diễn ra nhanh chóng từ công bố đến hiện thực. Dưới đây là trạng thái hiện tại tính đến cuối tháng 7/2026.

---

## Gemini Spark Là Gì?

Gemini Spark là một AI agent luôn hoạt động, sống trên hạ tầng cloud của Google — không phải trên thiết bị của bạn. Nó được hỗ trợ bởi **Gemini 3.5 Flash** (model frontier mới nhất của Google, vượt trội hơn GPT-5.5 và Claude Opus 4.7 trên nhiều benchmark agentic coding) và được xây dựng trên **Antigravity** harness.

Khác biệt kiến trúc chính so với trợ lý truyền thống: Spark hoạt động bất đồng bộ. Bạn giao cho nó một tác vụ — "mỗi sáng thứ Hai, gửi email cho tôi tóm tắt tin nhắn khẩn qua đêm" — và nó thực thi theo lịch đó mà không cần bạn có mặt, nhắc lại, hoặc giữ ứng dụng mở.

Nguồn: [Google Blog — The Gemini app becomes more agentic (19/5/2026)](https://blog.google/innovation-and-ai/products/gemini-app/next-evolution-gemini-app/)

---

## Nó Có Thể Làm Gì?

Khả năng của Spark đã mở rộng đáng kể từ công bố tháng 5.

### Tính năng cốt lõi (có từ đầu)

- **Gmail triage & soạn thảo**: Đọc, tóm tắt và soạn email. Đặt lịch quét hộp thư định kỳ.
- **Tích hợp Google Calendar**: Quản lý sự kiện, kiểm tra availability, lên lịch họp.
- **Google Docs, Sheets, Slides**: Tạo tài liệu từ prompt, điền dữ liệu vào bảng tính, xây dựng presentation.
- **Google Tasks & Keep**: Biến ghi chú rải rác trong Keep thành task có cấu trúc trong Tasks.
- **Tác vụ định kỳ chủ động**: Đặt agent chạy lặp lại (VD: "kiểm tra hóa đơn nhà cung cấp mỗi thứ Hai").

Nguồn: [Google Cloud Blog — Innovations from Google I/O 26 (19/5/2026)](https://cloud.google.com/blog/products/ai-machine-learning/innovations-from-google-io-26-on-google-cloud)

### Cập nhật tháng 6/2026

- **macOS desktop app (Beta)**: Spark có thể truy cập file local trên Mac — sắp xếp PDF, lấy dữ liệu từ hóa đơn local vào Google Sheets, quản lý file. Sắp có remote execution: giao task từ điện thoại, Spark chạy trên Mac khi bạn vắng mặt.
- **Tích hợp bên thứ ba**: Canva (tạo design), Instacart (đặt hàng tạp hóa), OpenTable (đặt nhà hàng), Dropbox (truy cập file), Zillow Rentals (tìm nhà), Google Tasks và Keep.
- **Custom MCP (Model Context Protocol)**: Kết nối ứng dụng của riêng bạn vào Spark qua MCP. Điều này quan trọng: Spark có thể mở rộng ra ngoài hệ sinh thái Google.
- **Theo dõi chủ đề real-time**: Spark có thể theo dõi tin tức, thể thao, tài chính, thời tiết, mạng xã hội và email — và thông báo khi điều kiện được đáp ứng.

Nguồn: [Google Blog — Gemini Spark updates (30/6/2026)](https://blog.google/innovation-and-ai/products/gemini-app/gemini-spark-updates-june-2026/)

### Sắp tới

Google xác nhận các tính năng tương lai bao gồm nhắn tin và email trực tiếp cho Spark (nó có contact riêng), tạo sub-agent tùy chỉnh, và điều khiển browser local. Chưa có ngày cụ thể.

---

## Giá Cả và Availability

Đây là phần cần nhiều sự tinh tế nhất.

### Yêu cầu gói

| Gói | Spark Access | Giá |
|-----|-------------|-----|
| Miễn phí | ❌ Không | $0 |
| Google AI Plus | ❌ Không | $7.99/tháng |
| **Google AI Pro** | ✅ Đang triển khai (Mỹ & Ấn Độ, tiếng Anh) | **$19.99/tháng** |
| **Google AI Ultra** | ✅ Có ở các nước hỗ trợ | **$99.99/tháng** (trước $249.99) |

### Timeline

- **19/5/2026**: Công bố tại I/O. Trusted tester được dùng thử.
- **25/5/2026**: Beta cho US Google AI Ultra subscribers.
- **17/6/2026**: Mở rộng ra các nước có Gemini Apps (với một số ngoại lệ).
- **30/6/2026**: macOS desktop app beta ra mắt.
- **14/7/2026**: Thêm Australia, Canada, Hong Kong, Ấn Độ, Nhật, Hàn Quốc cho Ultra users.
- **16/7/2026**: **Mở rộng lớn đầu tiên** — Gemini Spark bắt đầu rollout cho **Google AI Pro** subscribers ở Mỹ (tiếng Anh). Giá entry giảm từ $99.99 xuống $19.99/tháng.
- **29/7/2026**: Mở rộng cho **Google AI Pro subscribers ở Ấn Độ**, rollout trong vài tuần tới.

### Các khu vực chưa được hỗ trợ

European Economic Area (EEA), Nigeria, Switzerland, United Kingdom. Chưa có ngày ra mắt.

Nguồn: [Google Support — What's new for Gemini Spark](https://support.google.com/gemini/answer/17171264) | [AI Agents Library — Availability tracker](https://www.aiagentslibrary.com/blog/gemini-spark-availability/)

---

## So Sánh với ChatGPT/Claude

| Khía cạnh | Gemini Spark | ChatGPT / Claude |
|-----------|-------------|------------------|
| **Tính bền bỉ** | 24/7 trên cloud, không cần thiết bị | Session-based, cần user prompt |
| **Tác vụ định kỳ** | Lịch native | Không có scheduling |
| **Cảnh báo chủ động** | Có — theo dõi chủ đề, trigger ngưỡng | Không — passive response |
| **Tích hợp Workspace** | Sâu với Google Workspace | Qua API/plugins, ít native |
| **Truy cập file system** | macOS desktop (local files) | Hạn chế |
| **MCP** | Có — custom MCP support | Hạn chế |
| **Giá** | $19.99–$99.99/tháng | $20–$200/tháng |

Khác biệt lớn nhất là **mô hình thực thi chủ động, theo lịch**. Spark không cần bạn xuất hiện và hỏi. Bạn định nghĩa workflow một lần, và nó chạy độc lập. Gần với cách trợ lý con người vận hành hơn là chatbot.

---

## Ý Nghĩa Cho Developers

### Tích hợp MCP

Google cam kết hỗ trợ MCP tùy chỉnh trong Spark, nghĩa là các nhà phát triển công cụ bên thứ ba có thể mở rộng khả năng của Spark — tương thích với hệ sinh thái MCP rộng hơn.

### Managed Agents API

Tại I/O, Google cũng công bố **Managed Agents API** — dịch vụ cho phép developers tạo agent tùy chỉnh với một API call duy nhất. Mỗi agent có sandbox Linux ephemeral riêng với skills, MCP servers và server-side tools. Được hỗ trợ bởi Antigravity và Gemini 3.5 Flash.

Nguồn: [Virtualization Review — Google I/O '26 Enterprise Agent Stack (19/5/2026)](https://virtualizationreview.com/articles/2026/05/19/google-io-26-fills-out-enterprise-agent-stack-with-managed-agents-adk-2,-d-,0.aspx)

### ADK 2.0

Agent Development Kit 2.0 (open source, [adk.dev](https://adk.dev)) hỗ trợ Python, Node.js, Go và Java. Đây là framework code-first để xây dựng multi-agent systems, với native deployment lên Google Cloud.

---

## Kết Luận

Gemini Spark đánh dấu một sự chuyển đổi kiến trúc thực sự trong consumer AI: từ session-based chatbot sang persistent, cloud-resident agent.

Việc rollout diễn ra nhanh chóng — từ 0 lên 1+ triệu người dùng đủ điều kiện trong hai tháng. Đợt rollout Pro (16/7) là cột mốc quan trọng, giảm rào cản từ $100 xuống $20/tháng ở Mỹ và Ấn Độ. Nếu Google tiếp tục mở rộng, Spark có thể tiếp cận một phần đáng kể trong hơn 900 triệu người dùng hoạt động hàng tháng của Gemini vào cuối năm 2026.

Cho developers và AI practitioners, sự kết hợp giữa Spark + Managed Agents + ADK 2.0 + MCP support tạo ra một platform story hấp dẫn. Google không chỉ ra mắt một sản phẩm — họ đang thiết lập một hệ sinh thái agent đa tầng với low-code paths (Agent Studio), managed runtime (Managed Agents API), pro-code frameworks (ADK), và consumer agent (Spark) — tất cả chạy trên cùng một hạ tầng chung.

Câu hỏi còn bỏ ngỏ: liệu người dùng có tin tưởng một agent 24/7 với quyền truy cập email, lịch, file và dịch vụ bên thứ ba không? Đó là nút thắt về adoption — không phải công nghệ.

---

### Tham khảo

1. [Google Blog — The Gemini app becomes more agentic (19/5/2026)](https://blog.google/innovation-and-ai/products/gemini-app/next-evolution-gemini-app/)
2. [Google Cloud Blog — Innovations from Google I/O 26 (19/5/2026)](https://cloud.google.com/blog/products/ai-machine-learning/innovations-from-google-io-26-on-google-cloud)
3. [Google Blog — Gemini Spark updates: macOS, connected apps (30/6/2026)](https://blog.google/innovation-and-ai/products/gemini-app/gemini-spark-updates-june-2026/)
4. [Google Support — What's new for Gemini Spark](https://support.google.com/gemini/answer/17171264)
5. [Forbes — Google I/O 2026 Turned Gemini Into An Agent Platform (21/5/2026)](https://www.forbes.com/sites/janakirammsv/2026/05/21/google-io-2026-turned-gemini-into-an-agent-platform/)
6. [Virtualization Review — Google I/O '26 Enterprise Agent Stack (19/5/2026)](https://virtualizationreview.com/articles/2026/05/19/google-io-26-fills-out-enterprise-agent-stack-with-managed-agents-adk-2,-d-,0.aspx)
7. [TechCrunch — Google introduces Gemini Spark (19/5/2026)](https://techcrunch.com/2026/05/19/google-introduces-gemini-spark-a-24-7-agentic-assistant-with-gmail-integration/)
8. [Mashable — Gemini Spark is a wildly ambitious AI agent (19/5/2026)](https://mashable.com/article/google-io-2026-gemini-spark-announced)
9. [AI Agents Library — Gemini Spark Availability (Cập nhật 29/7/2026)](https://www.aiagentslibrary.com/blog/gemini-spark-availability/)
10. [ADK Documentation — Agent Development Kit](https://adk.dev/)
