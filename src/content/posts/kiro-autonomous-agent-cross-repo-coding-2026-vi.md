---
title: "Kiro Autonomous Agent: Coding Xuyên Repo ở Quy mô Lớn"
description: "Tìm hiểu sâu về autonomous agent của Kiro (giao diện Web) — coding async, xuyên repo, chạy độc lập hàng giờ hoặc ngày. Kiến trúc sub-agent, sandbox isolation, tích hợp GitHub và ví dụ workflow thực tế."
published: 2026-05-12
pubDate: 2026-05-12T10:00:00.000Z
slug: kiro-autonomous-agent-cross-repo-coding-2026-vi
tags:
  - kiro
  - aws
  - autonomous-agent
  - cross-repo
  - sub-agents
  - sandbox
  - frontier-agents
  - ci-cd
category: ai-agents
lang: vi
series:
  name: "Practical Kiro — Môi trường phát triển Agentic của AWS"
  order: 5
  total: 6
---

Day 0, chúng ta đã giới thiệu ba giao diện của Kiro: IDE, CLI và Autonomous Agent. Days 1-3 đề cập sâu về IDE và CLI. Hôm nay, chúng ta giải quyết phần tham vọng nhất — **Kiro Autonomous Agent** chạy trong giao diện Web tại [app.kiro.dev/agent](https://app.kiro.dev/agent).

Đây là chế độ cho phép bạn ủy thác công việc và đi làm việc khác. Agent làm việc độc lập hàng giờ hoặc ngày, duy trì ngữ cảnh xuyên suốt các phiên, điều phối thay đổi trên nhiều repository, và tự quản lý môi trường phát triển sandbox của riêng nó.

Nếu spec-driven development là Kiro nói cho bạn biết nó định xây gì, thì autonomous agent là Kiro nói cho bạn biết nó đã xây gì — trong khi bạn đang ngủ.

---

## Điều Gì Làm Nó Trở Nên "Autonomous"?

Thuật ngữ "autonomous" trong công cụ AI coding bị dùng tràn lan. Hầu hết các công cụ tự xưng là autonomous vẫn dựa trên session: mở chat, mô tả task, chờ hoàn thành, đóng chat — quên mọi thứ.

Agent của Kiro khác:

| Tính chất | IDE Agent | CLI Agent | **Autonomous Agent** |
|-----------|-----------|-----------|---------------------|
| **Persistent session** | Session-only | Session-only | **Xuyên suốt các phiên** |
| **Phạm vi ngữ cảnh** | Dự án hiện tại | Thư mục hiện tại | **Nhiều repository** |
| **Mô hình thực thi** | Đồng bộ (chờ) | Đồng bộ (chờ) | **Async (giao và quên)** |
| **Thời lượng** | Phút | Phút | **Giờ đến ngày** |
| **Sub-agents** | Không | Không | **Có (3 vai trò chuyên biệt)** |
| **Sandbox** | Máy của bạn | Máy của bạn | **Cloud sandbox cách ly** |
| **Đồng thời** | Tuần tự | Tuần tự | **Đến 10 task đồng thời** |
| **Tích hợp GitHub** | Thủ công | Thủ công | **Issue → PR full cycle** |
| **Học hỏi** | Không | Không | **Nhớ feedback xuyên suốt task** |

Hàng cuối cùng là quan trọng nhất: **autonomous agent học hỏi**. Khi bạn để lại feedback PR kiểu "luôn dùng error handling pattern của chúng tôi," nó nhớ và áp dụng pattern đó vào công việc tương lai — tự động.

---

## Kiến trúc: Cách Nó Hoạt Động

Khi bạn giao task cho autonomous agent, đây là những gì xảy ra bên dưới:

```
┌─ Bạn mô tả task ──────────────────────────────────┐
│ "Nâng cấp lodash trên tất cả 15 microservices"    │
└────────────────────────┬───────────────────────────┘
                         ↓
┌─ Phân tích Task ───────────────────────────────────┐
│ - Xác định repo bị ảnh hưởng                        │
│ - Phân tích cách mỗi service dùng lodash            │
│ - Tạo requirements và acceptance criteria           │
└────────────────────────┬───────────────────────────┘
                         ↓
┌─ Cấp phát Sandbox ─────────────────────────────────┐
│ - Khởi tạo môi trường cloud cách ly                 │
│ - Cấu hình truy cập mạng (Integration only)        │
│ - Clone repositories và đọc codebase                │
│ - Phát hiện môi trường dev (Dockerfile/DevFile)    │
└────────────────────────┬───────────────────────────┘
                         ↓
┌─ Điều phối Sub-Agent ──────────────────────────────┐
│                                                    │
│  Research Agent ──→ Code Agent ──→ Verify Agent    │
│  (lập kế hoạch)   (implement)  (chạy tests/safety)│
│                                                    │
│ Mỗi agent phối hợp qua task spec.                   │
│ Agent đặt câu hỏi khi không chắc chắn.             │
└────────────────────────┬───────────────────────────┘
                         ↓
┌─ Kết quả Pull Request ────────────────────────────┐
│ - Mở 15 PRs với giải thích chi tiết                │
│ - Mỗi PR có: file thay đổi, test results,          │
│   quyết định implementation, migration notes       │
│ - Tự sửa dựa trên feedback của bạn                 │
└────────────────────────────────────────────────────┘
```

## Mô Hình Sub-Agent

Autonomous agent sử dụng ba sub-agent chuyên biệt phối hợp với nhau:

### 1. Research & Planning Agent

Agent này không viết code. Nó phân tích:

- **Cấu trúc codebase** — Dự án tổ chức thế nào? Pattern nào đang dùng?
- **Dependencies** — Packages nào được import? Phiên bản? Breaking changes nào?
- **Kiến trúc** — Tuân theo quy tắc kiến trúc từ steering file
- **Công việc trước** — Tham khảo learnings từ task và PR feedback trước

Nó tạo ra task plan (bản kế hoạch có cấu trúc từ quy trình spec-driven Day 2) và chuyển giao.

### 2. Code Agent

Agent này thực hiện các thay đổi thực tế. Nó:

- Tạo file mới theo conventions của dự án
- Sửa file hiện tại không làm hỏng code kế cận
- Tạo migration scripts cho thay đổi database
- Cập nhật file cấu hình khi cần

Code agent tôn trọng quy tắc steering file về code style, kiến trúc và bảo mật.

### 3. Verification Agent

Agent này chạy sau mỗi thay đổi:

- Chạy test suite của dự án
- Chạy linting và type checking
- Quét lỗ hổng bảo mật (hardcoded secrets, SQL injection)
- Xác thực so với acceptance criteria của spec
- Báo cáo lỗi với file và dòng cụ thể

Nếu verification agent tìm thấy vấn đề, nó loop lại code agent để sửa trước khi tiếp tục.

### Giao tiếp Sub-Agent

Cả ba agent chia sẻ một **task spec** — tài liệu có cấu trúc giống từ Day 2. Đây là single source of truth mà chúng phối hợp xung quanh. Research agent viết kế hoạch, code agent thực hiện, verification agent kiểm tra — tất cả dựa trên cùng một spec.

Khi code agent gặp sự mơ hồ, nó tham vấn research agent. Khi verification agent tìm thấy lỗi, nó gửi stack trace lại cho code agent. Kiến trúc đa agent này đáng tin cậy hơn một lệnh gọi LLM đơn lẻ vì mỗi agent chuyên biệt và kiểm tra chéo lẫn nhau.

---

## Môi trường Sandbox

Mỗi task của autonomous agent chạy trong sandbox cách ly riêng — một cloud VM được cấp phát cho từng task.

### Thiết lập Môi trường

Agent tự động phát hiện:

1. **Dockerfile** — Nếu tìm thấy, build full container environment
2. **DevFile** — Theo spec cho tools, runtimes, và dependencies
3. **Cấu trúc dự án** — Nếu không có, phân tích package.json, requirements.txt, v.v.

Tính năng auto-detection này rất quan trọng cho tính nhất quán. CI pipeline và autonomous agent của bạn chạy trong môi trường tương đương.

### Kiểm soát Mạng

Cấu hình cho từng task với bốn cấp độ:

| Cấp độ | Truy cập | Use case |
|--------|----------|----------|
| **Integration only** | GitHub proxy | Mặc định an toàn cho code tasks |
| **Common dependencies** | npm, PyPI, Maven + GitHub proxy | Cập nhật dependencies |
| **Open internet** | Toàn bộ mạng | Web scraping, tích hợp API ngoài |
| **Custom** | Danh sách cho phép tên miền | Chính sách bảo mật doanh nghiệp |

Cho ví dụ nâng cấp lodash, "Common dependencies" là đủ — agent cần npm cho phiên bản lodash mới và GitHub để tạo PR.

### Quản lý Secrets

Biến môi trường và secrets được cấu hình cho từng task:

```json
{
  "env": {
    "NPM_TOKEN": "${NPM_TOKEN}",
    "GITHUB_TOKEN": "${GITHUB_TOKEN}"
  },
  "secrets": {
    "STRIPE_API_KEY": "${STRIPE_SECRET}"
  }
}
```

Secrets được:
- Mã hóa khi lưu trữ
- Không bao giờ lộ trong logs, error messages, hoặc mô tả PR
- Inject dưới dạng biến môi trường trong sandbox
- Giới hạn phạm vi trong một task hoặc session

---

## Tích hợp GitHub: Issues đến PR

Autonomous agent tích hợp sâu với GitHub. Bạn có thể giao công việc trực tiếp từ GitHub issues mà không cần mở Kiro.

### Gán Nhãn

Thêm label `kiro` vào bất kỳ GitHub issue nào:

```bash
# Từ GitHub UI: thêm label "kiro" vào issue #42
# Kiro nhận trong vòng vài phút
```

### Gán Qua Comment

Dùng `/kiro` trong comment GitHub issue để giao việc cụ thể:

```
/kiro Implement rate limiting trên /api/login endpoint
Dùng pattern rate-limiter middleware có sẵn từ src/middleware/.
Thêm tests cho: normal flow, exceeded limit, reset after window.
```

Kiro lắng nghe tất cả comment tiếp theo trên issue để:
- Làm rõ yêu cầu ban đầu
- Feedback về kết quả trung gian
- Steering adjustments

### PR Auto-Fix

Khi bạn để lại review feedback trên PR mà Kiro tạo:

```
"Hãy dùng format error response tiêu chuẩn: { error: string, code: string }"
```

Kiro không chỉ sửa PR đó. Nó **nhớ** preference và áp dụng vào công việc tương lai tự động. Đây là cơ chế học hỏi — feedback của bạn huấn luyện sự hiểu biết của agent về tiêu chuẩn team.

---

## Workflow Thực tế: Nâng cấp Library Xuyên 15 Microservices

Hãy theo dõi workflow chính xác khiến autonomous agent tỏa sáng.

**Task:** Nâng cấp lodash từ v4.17 lên v5.0 trong kiến trúc microservices. Đây là breaking change — `_.chain` bị xóa, một số hàm thay đổi signature.

### Bước 1: Định nghĩa Task

Trong autonomous agent chat tại [app.kiro.dev/agent](https://app.kiro.dev/agent):

> "Nâng cấp lodash từ 4.17 lên 5.0 trên tất cả microservices trong saaskit-org. Xử lý breaking changes: xóa _.chain, thay đổi signature _.flatten, thay đổi hành vi _.extend. Chạy tests sau mỗi lần nâng cấp. Mở PR riêng cho mỗi service."

### Bước 2: Phân tích

Agent:
1. Truy vấn GitHub cho tất cả repos trong `saaskit-org` có chứa lodash trong package.json
2. Tìm thấy 15 service bị ảnh hưởng
3. Phân tích pattern sử dụng lodash của mỗi service
4. Xác định breaking change nào áp dụng cho service nào
5. Tạo task plan sắp xếp theo rủi ro: service ít usage trước, service critical sau

### Bước 3: Thực thi

Cho mỗi service:

1. Clone → tạo branch → cập nhật lodash → sửa breaking changes → cập nhật tests → chạy test suite → tạo PR
2. Nếu tests fail, phân tích lỗi và thử lại với cách tiếp cận khác
3. Nếu thử lại vẫn fail, đánh dấu PR cần human review

Tất cả 15 service được xử lý bất đồng bộ. Mỗi service có sandbox riêng, đội sub-agent riêng, PR riêng.

### Bước 4: Kết quả PR

Mỗi PR bao gồm:
- Tóm tắt thay đổi lodash áp dụng
- Breaking changes đã xử lý và cách xử lý
- Kết quả test (passed/failed với coverage delta)
- Migration notes cho team
- Các quyết định cần human review

### Bước 5: Vòng phản hồi

Bạn review PR #1 và comment:

> "Cho việc xóa _.chain — dùng pipe pattern từ fp/ thay vì Promise.all thông thường"

Kiro cập nhật PR #1 và **áp dụng cùng pattern** cho PRs #2-15 tự động. Team đó không cần lặp lại feedback giống nhau.

### So sánh Thời gian

| Cách tiếp cận | Thời gian | Chất lượng |
|--------------|-----------|------------|
| Thủ công (15 devs) | 3-5 ngày | Không đồng nhất |
| IDE agent (tuần tự) | 1-2 ngày | Đồng nhất trong session, nhưng mỗi session cách ly |
| **Autonomous agent** | **3-6 giờ** | **Đồng nhất xuyên repo, học từ feedback** |

---

## Đồng thời và Giới hạn

Autonomous agent thực thi đến **10 task đồng thời**. Mỗi task có sandbox riêng, đội sub-agent, và phân bổ tài nguyên.

| Gói | Task đồng thời | Thời lượng Sandbox | Dung lượng Sandbox |
|-----|---------------|--------------------|--------------------|
| Pro | Đến 10 | 72 giờ mỗi task | 10 GB |
| Pro+ | Đến 10 | 72 giờ mỗi task | 25 GB |
| Power | Đến 10 | 7 ngày mỗi task | 50 GB |

Task vượt quá giới hạn thời gian có tùy chọn "gia hạn". Task hoàn thành được dọn dẹp tự động để giải phóng tài nguyên.

---

## Khi Nào Nên Dùng Autonomous Agent

### Phù hợp Hoàn hảo

- **Refactoring xuyên repo** — Đổi tên shared library, nâng cấp dependency, thay đổi API contract
- **Migration quy mô lớn** — Nâng cấp framework (React 18 → 19), database migration, thay đổi cloud provider
- **Giảm nợ kỹ thuật** — Thay thế API deprecated, xóa code không dùng, chuẩn hóa pattern xuyên repo
- **Vá bảo mật** — Sửa CVE trên toàn bộ tổ chức trong giờ thay vì tuần
- **Tự động hóa onboarding** — Thiết lập microservices mới theo patterns có sẵn

### Tránh Dùng Khi

- **Sửa một dòng** — Nhanh hơn tự làm
- **Công việc khám phá** — Vibe mode trong IDE tốt hơn cho rapid iteration
- **Production cực kỳ nhạy cảm** — Dùng per-file approval mode trong IDE
- **Task cần tương tác thời gian thực** — Agent async theo thiết kế

---

## Giám sát và Điều hướng

Autonomous agent cung cấp cập nhật trạng thái thời gian thực:

```
🔄 Đang phân tích 15 repos cho việc dùng lodash...
✅ 15 repos tìm thấy, 12 có direct import, 3 có transitive deps
🔄 Tạo task plan sắp xếp theo rủi ro migration...
✅ Task plan tạo: 15 tasks, ước tính 4-6 giờ
🔄 Đang thực thi Task 1: user-service (rủi ro thấp)...
   • 3 phút: lodash đã cập nhật
   • 30 giây: 2 breaking changes đã sửa
   • 45 giây: tất cả tests pass
   • 15 giây: PR đã mở
🔄 Đang thực thi Task 2: payment-service (rủi ro trung bình)...
   • 3 phút: lodash đã cập nhật
   • 2 phút: 7 breaking changes đã sửa
   • 1 phút: tests failed (thay thế _.extend)
   • 2 phút: đang thử lại với cách khác...
```

Bạn có thể tạm dừng, chuyển hướng, hoặc hủy các task riêng lẻ từ giao diện Web. Agent đặt câu hỏi khi gặp sự mơ hồ, nhưng bạn cũng có thể chủ động gửi hướng dẫn điều chỉnh giữa task.

---

## Tiếp Theo

Day 5 kết thúc series với **Bảo mật, Best Practices, và Real Talk** — phân tích sự cố AWS tháng 12/2025, chiến lược phân quyền, hardening sandbox, khi nào (và không) nên dùng Kiro, và khung quyết định cuối cùng để chọn Kiro so với các công cụ AI coding khác.

---

*Series: Practical Kiro — Môi trường phát triển Agentic của AWS. Day 4: Autonomous Agent (Web). Day 5: Bảo mật, Best Practices & Real Talk → sắp tới.*
