---
lang: vi
title: "Skills, MCP, Steering, Power: Bốn Khái Niệm Bạn Cần Hiểu Về AI Agent"
description: "Quên hết mấy bài hype đi. Đây là giải thích rõ ràng, có ví dụ thực tế về bốn khái niệm quan trọng nhất khi làm việc với AI coding agent trong 2026 — Skills (agent làm được gì), MCP (kết nối thế giới thế nào), Steering (điều khiển ra sao), và Power (model nào)."
published: 2026-04-30
category: AI
tags: ["AI Agents", "MCP", "Skills", "Steering", "Prompt Engineering", "Claude Code", "Agent Architecture", "Developer Tools"]
author: minhpt
mermaid: false
---

Nếu bạn theo dõi AI agents trong 2026, bạn đã thấy bốn từ này ở khắp mọi nơi: **Skills, MCP, Steering, Power.** Chúng xuất hiện ở mọi hội nghị, mọi blog post, mọi product launch.

Nhưng không ai dừng lại giải thích chúng thực sự *có nghĩa là gì* — đặc biệt là chúng liên quan với nhau thế nào. Skill có giống MCP server không? Steering chỉ là prompt engineering với cái tên hoa mỹ? Power có nghĩa là kích thước model hay context window?

Hãy giải quyết vấn đề đó. Với ví dụ thực tế.

## Một Phép Ẩn

Hãy nghĩ AI agent như một **chiếc xe đua**:

| Khái niệm | Ẩn dụ xe | Ý nghĩa |
|---|---|---|
| **Power** | Động cơ | AI model |
| **Skills** | Sổ tay tay đua | Cách chạy trên đường đua cụ thể |
| **MCP** | Đội pit crew & telemetry | Kết nối công cụ bên ngoài |
| **Steering** | Vô lăng & chân ga | Cách bạn điều khiển agent |

Xe đua vô dụng nếu chỉ có động cơ mạnh (Power) mà tay đua không biết đường đua (Skills), không nói chuyện được với pit crew (MCP), và bạn không lái được (Steering). Cả bốn phải hoạt động cùng nhau.

---

## 1. Power: Động Cơ

**Nó là gì:** AI model chạy agent — khả năng, tốc độ, chi phí, và context size.

**Phiên bản đơn giản:** Power là "bộ não nào trong đầu agent." Claude Opus 4.7? GPT-5.5? DeepSeek-V4? Đó là Power.

### Ví dụ thực tế

```bash
# Power thấp — Haiku (nhanh, rẻ, nông)
$ claude -m claude-haiku "Sửa lỗi chính tả trong README"
  → Sửa xong trong 2 giây, tốn $0.01

# Power trung bình — Sonnet (cân bằng)
$ claude -m claude-sonnet "Refactor module auth sang OAuth2"
  → 30 giây, $0.08, kết quả tốt

# Power cao — Opus (chậm, đắt, sâu)
$ claude -m claude-opus "Tìm memory leak trong codebase Rust 50K dòng"
  → 3 phút, $0.50, tìm ra
```

### Cách nghĩ về Power

**Đừng dùng Opus cho mọi thứ.** Như lái Ferrari đi chợ. Dùng model nhỏ nhất có thể xử lý được task:

- **Haiku:** Sửa lỗi chính tả, refactor đơn giản, documentation
- **Sonnet/GPT-5-mini:** Feature implementation, bug fix, code review
- **Opus/GPT-5.5:** Quyết định architecture phức tạp, system-wide refactoring
- **DeepSeek-V4:** Alternative rẻ cho coding, thường ngang Sonnet với giá Haiku

---

## 2. Skills: Sổ Tay Tay Đua

**Nó là gì:** Bộ hướng dẫn tái sử dụng dạy agent *cách* thực hiện tác vụ cụ thể — quy trình, conventions, guardrails.

**Phiên bản đơn giản:** Skills như thẻ công thức nấu ăn. Thay vì giải thích cách nấu mì mỗi lần, bạn đưa agent một thẻ: "luộc nước → bỏ mì → đổ nước → sốt." Agent đọc và làm theo.

### Skills vs. Prompt Thường

| | Prompt thường | Skill |
|---|---|---|
| **Ở đâu** | Trong tin nhắn | Trong `.claude/skills/` dạng SKILL.md |
| **Tái sử dụng** | Không (gõ lại mỗi lần) | Có (gọi bằng tên) |
| **Versioned** | Không | Có (git-tracked) |
| **Kết hợp** | Không | Có (nhiều skill cùng lúc) |

### Ví dụ skill test

```markdown
# Test Triage Skill

Khi được gọi:
1. Đọc tất cả source files trong staged diff
2. Với mỗi function thay đổi, kiểm tra có test không
3. Với function chưa có test, tạo scaffold test gồm:
   - Happy path, Error cases, Edge cases
4. Chạy test suite xác nhận không hỏng gì

## Cách gọi
Run: /test-triage
```

---

## 3. MCP: Đội Pit Crew

**Nó là gì:** Model Context Protocol — chuẩn mở (97M+ downloads/tháng) kết nối AI agent với công cụ, dữ liệu, dịch vụ bên ngoài.

**Phiên bản đơn giản:** MCP là "USB-C cho AI." Thay vì mỗi công ty tự xây connector riêng cho từng AI agent, MCP cung cấp một chuẩn duy nhất để cắm bất cứ thứ gì vào bất cứ agent nào.

### Ví dụ: Không MCP vs. Có MCP

**Không MCP:**
```bash
$ claude "Check trạng thái của PR #42"
  → Agent: "Tôi không truy cập được GitHub. Bạn paste link được không?"
  ← Bạn: paste URL
  → Agent: đọc nội dung... "PR đã được approved."
```

**Có MCP (GitHub MCP server):**
```bash
$ claude "Check trạng thái của PR #42"
  → Agent kết nối MCP server GitHub
  → MCP server authenticate và query API
  → Agent: "PR #42 được approved bởi @teammate. 3 comments đang chờ."
```

### Vấn đề: Context tax

MCP có một nhược điểm: **context tax.** Mỗi MCP server bạn kết nối đều thêm mô tả tool vào context window. Với 5+ MCP servers, bạn có thể đốt 10K+ tokens chỉ để mô tả tools trước khi bắt đầu việc thực sự.

Đây là lúc **Skills** quay lại — progressive loading: Skills chỉ load context khi được gọi, trong khi MCP tools luôn trong context.

Best practice 2026: **Skills → MCP pattern** — Skill quyết định *khi nào* dùng MCP server, giữ context nhỏ và chỉ trả context tax khi cần.

---

## 4. Steering: Vô Lăng & Chân Ga

**Nó là gì:** Các phương pháp bạn dùng để điều khiển agent — bảo nó *làm gì*, *làm thế nào*, và *khi nào dừng*.

### Các cấp độ Steering

| Cấp độ | Bạn làm gì | Agent tự chủ | Rủi ro |
|---|---|---|---|
| **Full manual** | Bạn viết code | Không | Thấp |
| **Plan-then-do** | Agent lên kế hoạch, bạn duyệt | Trung bình | Thấp |
| **Supervised** | Agent chạy, check-in | Cao | Trung bình |
| **Autonomous** | Agent tự do | Toàn phần | Cao |

### Công cụ Steering thực tế

**1. Plan mode**
```bash
$ claude "Thêm rate limiting vào API" --plan

  Agent: "Kế hoạch:
  1. Tạo rate limiter middleware
  2. Thêm Redis backend
  3. Gắn vào API router
  4. Thêm config env variables
  5. Viết tests
  OK?"

  Bạn: "Bỏ Redis, dùng in-memory trước."
  Agent: adjust plan và execute.
```

**2. Hooks (steering chủ động)**
```
PreCommit hook → tự động chạy tests
PreToolUse hook → chặn commit secrets
PostToolUse hook → format code sau mỗi edit
```

**3. Checkpoints**
```bash
$ claude "Xây màn hình login"
  → Implement UI
  ✓ Checkpoint: "Review màn hình login? [Y/n]"
  → Implement auth logic
  ✓ Checkpoint: "Chạy tests? [Y/n]"
```

### Nguyên tắc vàng

> **Độ phức tạp cao = steering chặt. Độ phức tạp thấp = steering lỏng.**

Sửa lỗi chính tả: steering lỏng (cứ để nó làm). Migration database: steering chặt (plan, duyệt, review, verify). Hầu hết thất bại với AI agents xảy ra khi developer áp dụng sai cấp độ steering cho task.

---

## Cả Bốn Hoạt Động Cùng Nhau

**Task:** Thêm tính năng "quên mật khẩu" vào Flutter app.

```
🧠 Power: Claude Sonnet (model cân bằng)

Agent load:
📖 CLAUDE.md: "Dùng Riverpod, GoRouter, Dio với interceptors"
📋 Skills: /feature-spec, /flutter-test
🔌 MCP servers: GitHub MCP, Firebase MCP, Linear MCP
🎮 Steering: Plan mode ON, PreCommit hook, permission default

Bạn: "Thêm forgot password flow"

Agent (Plan mode):
  "Kế hoạch:
  1. Màn hình nhập email
  2. Màn hình xác nhận reset link
  3. Màn hình nhập mật khẩu mới
  4. Firebase Auth password reset
  5. Widget tests cho mỗi màn hình
  6. Integration test full flow
  OK?"

Bạn: "Thêm loading states"

Agent: cập nhật plan → implement → chạy tests → update Linear
  → "Xong. Tiếp theo?"
```

---

## Kết Luận

Bốn khái niệm này — Skills, MCP, Steering, Power — không phải ý tưởng cạnh tranh. Chúng là bốn lớp của một stack, và hiểu chúng kết hợp thế nào là sự khác biệt giữa "tôi thử AI coding và nó hỗn loạn" và "AI agents là công cụ hiệu quả nhất tôi từng dùng."

| Khái niệm | Tự hỏi |
|---|---|
| **Power** | Model nào thực sự cần cho task này? |
| **Skills** | Quy trình nào agent nên biết sẵn? |
| **MCP** | Hệ thống bên ngoài nào agent cần truy cập? |
| **Steering** | Task này cần tôi kiểm soát bao nhiêu? |

Nếu bạn bắt đầu với AI agents trong 2026, bỏ qua mấy bài hype về "model nào tốt nhất." Học bốn khái niệm này trước. Mọi quyết định sản phẩm, mọi lựa chọn workflow, mọi đánh giá công cụ — tất cả đều quay về bốn điều này.

---

*Bài viết dựa trên kinh nghiệm thực tế với Claude Code, Codex, Cursor, và Warp ADE trong các dự án production.*
