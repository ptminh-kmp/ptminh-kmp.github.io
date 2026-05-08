---
title: "Kiro: Môi trường phát triển Agentic của AWS — Hồi kết của Vibe Coding?"
description: "Tìm hiểu sâu về Kiro (kiro.dev) — agentic IDE và autonomous coding agent của Amazon. Cách hoạt động, giá cả, và tại sao nó có thể là công cụ AI coding kỷ luật nhất hiện nay."
published: 2026-05-08
pubDate: 2026-05-08T10:00:00.000Z
slug: kiro-agentic-development-environment-aws-2026
tags:
  - kiro
  - aws
  - ai-agents
  - spec-driven-development
  - agentic-ide
  - autonomous-agent
  - frontier-agents
category: ai-agents
lang: vi
series:
  name: "Practical Kiro — Môi trường phát triển Agentic của AWS"
  order: 1
  total: 6
---

Khi Matt Garman, CEO của AWS, đứng trên sân khấu re:Invent 2025 và hứa hẹn một AI agent có thể "tự động tìm ra cách hoàn thành công việc," cả thế giới developer chú ý. Khi công cụ đó bị cáo buộc gây ra sự cố AWS kéo dài 13 tiếng một tháng sau đó, mọi người bắt đầu quan tâm nhiều hơn nữa.

Kiro (kiro.dev) là câu trả lời của Amazon cho một câu hỏi mà mọi công cụ AI coding đang vật lộn: **làm thế nào để cho AI agent đủ tự chủ để hữu ích mà không mất kiểm soát?**

Câu trả lời, Amazon đặt cược, là **specs**.

## Kiro là gì?

Kiro là một **agentic development environment** — không chỉ là IDE với tính năng AI copilot, mà là một thiết kế lại hoàn toàn cách developer cộng tác với AI agent xuyên suốt vòng đời phần mềm. Nó được xây dựng và vận hành bởi một đội nhỏ, có chính kiến trong AWS.

Không giống hầu hết các công cụ AI coding vội vã từ prompt đến code, Kiro áp dụng một pipeline có cấu trúc:

```
Prompt → Specs → Task Plan → Implementation → Tests → Deploy
```

Con người review và phê duyệt ở mọi giai đoạn. Agent không đoán bạn muốn gì — nó yêu cầu đặc tả trước.

Kiro có ba hình thức:
1. **Kiro IDE** — bản fork VS Code (Code OSS) với tích hợp agent sâu
2. **Kiro CLI** — AI agent dòng lệnh cho workflow terminal-first
3. **Kiro Autonomous Agent (Web)** — agent async, xuyên repo, làm việc độc lập hàng giờ hoặc ngày

### Ba Chế Độ của Kiro

| Chế độ | Use Case | Tương tác |
|--------|----------|-----------|
| **Vibe Mode** | Chỉnh sửa nhanh, chat | Real-time, hội thoại |
| **Spec Mode** | Implement tính năng | Có cấu trúc, nhiều bước |
| **Autonomous** | Xuyên repo, chạy lâu | Async, không cần can thiệp |

## Tại Sao Spec-Driven Development Lại Quan Trọng

Insight cốt lõi mà đội ngũ Kiro có: các công cụ AI coding cực kỳ giỏi tạo code, nhưng cực kỳ tệ trong việc tạo **code đúng**.

Khi bạn nói "thêm trang đăng nhập" với hầu hết các công cụ AI, chúng sẽ tạo ra trang đăng nhập — nhưng chúng sẽ không xử lý:
- Giới hạn tốc độ khi đăng nhập thất bại
- Logic refresh session token
- Điều kiện tranh chấp (race condition) khi đăng nhập đồng thời
- Thông báo lỗi dễ tiếp cận cho screen reader
- Bảo vệ CSRF
- Giới hạn yêu cầu reset mật khẩu

Cách tiếp cận spec-driven của Kiro buộc agent phải **suy nghĩ trước khi code**. Đưa cùng một prompt, nó đầu tiên tạo ra đặc tả có cấu trúc:

```yaml
Feature: Xác thực người dùng

User Stories:
  1. Là người dùng, tôi muốn đăng nhập bằng email/mật khẩu
  2. Là người dùng, tôi muốn reset mật khẩu đã quên
  3. Là người dùng, tôi muốn duy trì đăng nhập qua nhiều phiên

Acceptance Criteria:
  - Form đăng nhập kiểm tra định dạng email
  - Mật khẩu phải từ 8 ký tự trở lên
  - Đăng nhập thất bại hiển thị thông báo lỗi cụ thể
  - Session tồn tại trong 30 ngày với "remember me"
  - Reset mật khẩu gửi email trong vòng 30 giây

Edge Cases:
  - Xử lý đăng nhập đồng thời
  - Giới hạn tốc độ yêu cầu reset mật khẩu
  - Xử lý token reset hết hạn một cách an toàn
```

**Bạn review, chỉnh sửa, và phê duyệt** trước khi bất kỳ dòng code nào được viết. Agent sau đó tạo ra kế hoạch task có thứ tự phụ thuộc:

```yaml
Task 1: Tạo User model và migration (không phụ thuộc)
Task 2: Xây dựng authentication service (phụ thuộc Task 1)
Task 3: Tạo login API endpoint (phụ thuộc Task 2)
Task 4: Xây dựng login form component (phụ thuộc Task 3)
Task 5: Thêm session management (phụ thuộc Task 2)
Task 6: Viết unit tests (phụ thuộc Task 2-5)
Task 7: Viết integration tests (phụ thuộc Task 3-5)
```

Mỗi task bao gồm chi tiết implementation, yêu cầu test, và tiêu chí thành công. Agent làm việc tuần tự, và bạn có thể phê duyệt hoặc từ chối ở mỗi bước.

### "Vibe Coding" vs "Spec-Driven Development"

Sự tương phản này có chủ đích. Thuật ngữ "vibe coding" của Andrej Karpathy đã nắm bắt zeitgeist — prompt, generate, iterate, repeat. Nó nhanh, vui, và thường sai theo những cách tinh vi.

Ngôn ngữ marketing của Kiro đối lập trực tiếp:

> "Chúng tôi coi agent là công cụ mạnh nhất từng được phát triển để xây dựng phần mềm… Agent cần đầu vào có cấu trúc và thông tin ngữ cảnh nhiều hơn một prompt ngôn ngữ tự nhiên để xây dựng đúng thứ cần xây."

Nói cách khác: vibe tốt cho prototype. **Specs là cho production.**

## Steering Files: Dạy Agent Cách Bạn Code

Kiro sử dụng **steering files** — tương đương với CLAUDE.md của Claude Code hoặc AGENTS.md của Codex CLI — để nói cho AI biết dự án của bạn hoạt động thế nào:

```markdown
# .kiro/steering.md

## Code Standards
- Sử dụng TypeScript strict mode
- Tuân theo quy tắc đặt tên hiện tại của repository
- Mọi function mới phải có JSDoc comments

## Architecture
- Backend: Express.js với TypeORM
- Frontend: React với TailwindCSS
- State management: Zustand

## Testing
- Unit tests: Vitest
- E2E: Playwright
- Tối thiểu 80% coverage cho code mới

## Security
- Không bao giờ commit file .env
- Sử dụng parameterized queries
- Làm sạch mọi input người dùng
```

Bạn có thể có:
- **Global steering** (`~/.kiro/steering.md`) — áp dụng cho mọi dự án
- **Project steering** (`.kiro/steering.md`) — riêng dự án, ưu tiên cao hơn

Steering files được tải ở đầu mỗi phiên làm việc, vì vậy agent không bao giờ quên cách bạn muốn mọi thứ được thực hiện.

## Agent Hooks: Tự động hóa vượt ra khỏi Chat

Agent hooks là các tự động hóa hướng sự kiện chạy tại các trigger cụ thể:

| Trigger | Hook điển hình | Mục đích |
|---------|---------------|----------|
| Lưu file | Tái tạo tests | Giữ tests đồng bộ với thay đổi |
| API thay đổi | Cập nhật tài liệu | Docs không bao giờ lỗi thời |
| Commit | Quét bảo mật | Phát hiện lỗ hổng trước khi ship |
| Build | Chạy linting | Áp dụng tiêu chuẩn code |

Ví dụ cấu hình:

```yaml
# .kiro/hooks.yaml
hooks:
  - trigger: on_save
    pattern: "src/components/**/*.tsx"
    action: "tạo lại unit tests cho component này"

  - trigger: on_commit
    action: "quét staged files để tìm hardcoded secrets"

  - trigger: on_api_change
    pattern: "src/api/**/*.ts"
    action: "cập nhật tài liệu API trong docs/"
```

Đây không phải là script — chúng là **hướng dẫn ngôn ngữ tự nhiên** mà agent hiểu và thực thi. Bạn nói bạn muốn gì, và agent tìm ra cách làm.

## Powers: Hệ sinh thái Plugin của Kiro

**Powers** của Kiro tương đương với plugin, nhưng được cung cấp bởi MCP (Model Context Protocol). Thay vì tự xây dựng mọi tích hợp, Kiro tận dụng hệ sinh thái MCP và thêm catalog với hơn 100 tích hợp được cấu hình sẵn.

Một số Powers đáng chú ý:

| Power | Chức năng |
|-------|-----------|
| **Figma** | Design-to-code, ánh xạ component, design system rules |
| **Postman** | Kiểm thử API, quản lý collection |
| **Stripe** | Tích hợp thanh toán, subscription, billing |
| **Datadog** | Debug production, truy vấn log/metric/APM |
| **Snyk** | Quét bảo mật và khắc phục |
| **Neon** | Serverless Postgres với branching |
| **Supabase** | Full-stack backend (auth, DB, storage) |
| **SonarQube** | Chất lượng code, phân tích nợ kỹ thuật |
| **Firebase** | Auth, Firestore, Cloud Functions, hosting |

Mỗi Power về cơ bản là một MCP server + cấu hình riêng của Kiro để làm việc liền mạch với specs và hooks.

### Hỗ trợ MCP gốc

Kiro có hỗ trợ MCP (Model Context Protocol) gốc được tích hợp sẵn. Bạn có thể kết nối tối đa 5 MCP server đồng thời, cung cấp cho agent hơn 100 định nghĩa công cụ trước khi viết một dòng code nào.

Điều này quan trọng vì Kiro có thể sử dụng các công cụ MCP **trong quá trình tạo spec và thực thi task** — không chỉ trong lúc coding. Ví dụ, khi lên kế hoạch tích hợp Stripe, nó có thể truy vấn Stripe MCP server để biết chi tiết API và kết hợp vào spec.

## Autonomous Agent: Coding ở Quy mô Lớn

Phần tham vọng nhất của Kiro là **Autonomous Agent** (giao diện Web, kiro.dev/agent). Đây là nơi Kiro không còn là trợ lý IDE nữa mà trở thành một công nhân tự động thực sự.

### Cách Hoạt Động

Bạn mô tả một task một lần. Kiro:
1. Khởi tạo một **sandbox cách ly** phản chiếu môi trường dev của bạn
2. Clone repositories và phân tích codebase
3. Phân rã công việc thành yêu cầu và tiêu chí chấp nhận
4. Điều phối các **sub-agent** chuyên biệt:
   - **Research & Planning** agent — tìm ra cách tiếp cận
   - **Code** agent — thực hiện thay đổi
   - **Verification** agent — kiểm tra chất lượng trước khi tiến tiếp
5. Mở pull request kèm giải thích chi tiết về thay đổi

### Siêu năng lực Thực sự: Công việc Xuyên Repo

Đây là nơi Kiro vượt trội so với đối thủ. Hãy xem xét tình huống:

> Bạn cần nâng cấp một thư viện quan trọng được sử dụng trong 15 microservices.

**Không có Kiro:** Mở từng repo, cập nhật dependencies, sửa breaking changes, chạy tests, tạo PR. Lặp lại 15 lần. Mất nhiều ngày.

**Với AI assistant khác:** Vẫn cần mở từng repo riêng. Agent quên mọi thứ khi bạn đóng phiên.

**Với Kiro Autonomous Agent:** Mô tả một lần. Nó xác định tất cả repo bị ảnh hưởng, phân tích cách mỗi service sử dụng thư viện, cập nhật code theo patterns của bạn, chạy full test suites, và mở 15 pull request đã được kiểm thử — trong khi bạn làm việc khác.

Agent **không dựa trên session**. Nó duy trì ngữ cảnh xuyên suốt các task. Khi bạn để lại feedback trên một PR về error handling, nó nhớ và áp dụng pattern đó cho các thay đổi sau.

### Sandbox và Bảo mật

Mỗi task tự động chạy trong sandbox cách ly riêng với kiểm soát truy cập mạng có thể cấu hình:

| Mức mạng | Truy cập |
|----------|----------|
| **Integration only** | GitHub proxy |
| **Common dependencies** | Package registries (npm, PyPI, Maven) |
| **Open internet** | Truy cập đầy đủ |
| **Custom** | Danh sách cho phép tên miền |

Bạn cũng có thể cấu hình biến môi trường và secrets (mã hóa, không bao giờ lộ trong logs hoặc PRs).

Agent tự động phát hiện DevFiles hoặc Dockerfiles để cấu hình môi trường, hoặc phân tích cấu trúc dự án nếu không tìm thấy.

### Kiến trúc Sub-Agent

Agent tự động sử dụng cách tiếp cận đa agent nội bộ:

```
Task Input
    ↓
Research & Planning Agent ──→ (Web search, phân tích codebase)
    ↓
Code Agent ──→ (Implementation, thay đổi đa file)
    ↓
Verification Agent ──→ (Tests, linting, quét bảo mật)
    ↓
Pull Request ──→ (Giải thích chi tiết, quyết định implementation)
```

Mỗi sub-agent có vai trò cụ thể, và chúng phối hợp thông qua task spec. Điều này khác hoàn toàn so với một lệnh gọi LLM đơn lẻ — nó là một **hệ thống đa agent** được thiết kế cho độ tin cậy.

## Giá cả

Kiro sử dụng hệ thống **credit**. Credits được tiêu thụ theo tỷ lệ dựa trên độ phức tạp của task (tối thiểu 0.01 credit).

| Gói | Giá | Credits | Overage |
|-----|-----|---------|---------|
| **Free** | $0 | 50/tháng (500 bonus khi đăng ký) | — |
| **Pro** | $20/tháng | 1,000 | $0.04/credit |
| **Pro+** | $40/tháng | 2,000 | $0.04/credit |
| **Power** | $200/tháng | 10,000 | $0.04/credit |

**Tác động model:** Auto mode (mặc định) tiêu tốn 1x credits. Sonnet 4 tiêu tốn 1.3x credits. Auto sử dụng hỗn hợp các model được tối ưu cho chi phí và chất lượng.

Bản xem trước autonomous agent **miễn phí trong giai đoạn preview** cho người dùng Pro, Pro+, và Power (có giới hạn hàng tuần). Teams có thể đăng ký waitlist.

## Kiến trúc: Xây dựng trên VS Code

Kiro IDE được xây dựng trên **Code OSS** (nền tảng mã nguồn mở của VS Code), đồng nghĩa với:
- Tương thích hoàn toàn với hầu hết VS Code extensions
- Phím tắt, theme, và workflow quen thuộc
- Terminal tích hợp, Git integration, và debugging
- Hỗ trợ MCP gốc

Bạn có thể nghĩ về Kiro như: **VS Code + AI agent layer + spec engine + MCP infrastructure + autonomous runtime**.

## So sánh: Kiro vs Các Công cụ AI Coding Khác

| Tính năng | Kiro | Claude Code | Cursor | GitHub Copilot |
|-----------|------|-------------|--------|----------------|
| Spec-driven dev | ✅ Gốc | ❌ | ❌ | ❌ |
| Agent hooks | ✅ Khai báo | ✅ Script-based | ❌ | ❌ |
| Autonomous mode | ✅ Async, xuyên repo | ❌ Session-based | ❌ | ❌ |
| Sub-agents | ✅ Đa agent | ❌ Đơn | ❌ | ❌ |
| Steering files | ✅ Global + project | ✅ CLAUDE.md | ❌ .cursorrules | ❌ |
| MCP native | ✅ Đầy đủ | ✅ Đầy đủ | ✅ Một phần | ✅ Một phần |
| Cross-repo tasks | ✅ Gốc | ❌ | ❌ | ❌ |
| Powers ecosystem | ✅ 100+ | ❌ Chỉ MCP | ❌ Extensions | ❌ |
| Giá entry | Free / $20 | Free / $20 | Free / $20 | $10 (Copilot) |

### Khi Nào Nên Chọn Kiro

Kiro tỏa sáng khi:
- Bạn cần phát triển AI **có cấu trúc, có kiểm toán**
- Công việc của bạn trải rộng **nhiều repository**
- Bạn muốn **task tự động chạy lâu** (giờ đến ngày)
- Bạn cần **kiểm soát bảo mật** về những gì agent có thể truy cập
- Team muốn tiêu chuẩn coding nhất quán được AI thực thi

Kiro có thể không phù hợp khi:
- Bạn thích **"vibe" coding nhanh, lặp** cho prototype
- **Ngân sách hạn chế** — $200/tháng cho Power khá cao
- Bạn muốn ở lại **VS Code thuần** (không phải fork)
- Bạn cần công cụ **chạy offline**

## Tranh cãi về Autonomous Agent

Tháng 12/2025, Kiro gây chú ý vì một sự cố nơi nó bị cáo buộc đã xóa và tạo lại môi trường production, gây ra sự cố AWS Cost Explorer kéo dài 13 tiếng tại một region Trung Quốc. Amazon chính thức phủ nhận Kiro hoàn toàn chịu trách nhiệm.

Dù ai có lỗi, sự cố này nhấn mạnh một sự thật quan trọng: **autonomous AI agent có quyền truy cập production là một công cụ sắc bén**. Các rào cản bảo vệ quan trọng không kém khả năng của agent.

Đội ngũ Kiro đã phản hồi bằng cách tăng cường cách ly sandbox, thêm kiểm soát mạng chi tiết hơn, và bắt buộc spec approval checkpoints cho các task liên quan đến production.

Chúng tôi sẽ đề cập sâu về bài học bảo mật vào Day 5 của series này.

## Tiếp Theo Trong Series Này

Đây là Day 0 của series 6 phần về Kiro. Những bài sắp tới:

- **Day 1** → Cài đặt: Kiro IDE, CLI, và cấu hình đầu tiên
- **Day 2** → Spec-driven development workflow trong thực tế
- **Day 3** → Agent Hooks, Powers, và tích hợp MCP
- **Day 4** → Autonomous Agent: coding async xuyên repo
- **Day 5** → Bảo mật, best practices, và bài học từ sự cố AWS

Kiro đại diện cho một triết lý hoàn toàn khác cho phát triển với AI. Nó không cố gắng viết code nhanh hơn — nó cố gắng **kỷ luật hơn** về code nào được viết.

Cho những developer đã thất vọng với các công cụ AI tạo ra code trông có vẻ đúng nhưng thực chất sai, cách tiếp cận spec-first của Kiro đáng để xem xét nghiêm túc. Cho các team xây dựng hệ thống production, nó có thể là sự chặt chẽ về kỹ thuật mà bạn đang chờ đợi.

---

*Series: Practical Kiro — Môi trường phát triển Agentic của AWS. Day 0: Tổng quan. Day 1: Cài đặt → sắp tới.*
