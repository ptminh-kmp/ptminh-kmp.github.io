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

Hãy nghĩ về AI agent như một **đội phát triển phần mềm**:

| Khái niệm | Ẩn dụ đội dev | Ý nghĩa |
|---|---|---|
| **Power** | Senior engineer | AI model — kinh nghiệm, tốc độ, khả năng architecture |
| **Skills** | Runbook & playbook của team | Quy trình từng bước cho mỗi loại task |
| **MCP** | Hạ tầng & API keys | Kết nối database, GitHub, Slack, v.v. |
| **Steering** | Sprint board & code review | Cách bạn assign task, duyệt plan, review output |

Một team có senior engineer xuất sắc (Power) mà không có runbook (Skills), không có access database (MCP), và chính sách review hỗn loạn (Steering) — thì chẳng ship được gì đáng tin cậy. Cả bốn phải hoạt động cùng nhau.

Cách khác để hình dung: Power là *con người*, Skills là *quy trình*, MCP là *hạ tầng*, Steering là *quản trị*.

---

## 1. Power: Senior Engineer

**Nó là gì:** AI model chạy agent — khả năng, tốc độ, chi phí, và context size.

**Phiên bản đơn giản:** Power là "ai đang code." Staff engineer 15 năm kinh nghiệm (Opus) có thể thiết kế distributed system từ đầu. Junior dev (Haiku) có thể sửa CSS bug cả ngày nhưng đừng giao architecture decisions.

### Các yếu tố của Power

| Yếu tố | Power thấp (Junior) | Power cao (Staff Engineer) | Impact |
|---|---|---|---|
| **Model size** | 7B parameters (Haiku) | Hàng trăm tỷ (Opus) | Chất lượng suy luận |
| **Context window** | 32K tokens | 200K+ tokens | Bao nhiêu code thấy cùng lúc |
| **Tốc độ** | Nhanh (junior xử lý ticket nhanh) | Chậm (staff nghĩ trước khi code) | Thời gian mỗi task |
| **Chi phí** | Rẻ ($0.03/task) | Đắt ($0.30+/task) | Ngân sách |
| **Độ sâu reasoning** | Làm theo pattern | Thiết kế pattern | Xử lý bug phức tạp |

### Ví dụ thực tế

```bash
# Power thấp — Haiku (junior: nhanh, rẻ, cần giám sát)
$ claude -m claude-haiku "Sửa lỗi chính tả trong README"
  → Sửa xong trong 2 giây, tốn $0.01
  (Task hoàn hảo cho junior — rõ ràng, ít rủi ro)

# Power trung bình — Sonnet (mid-level: reliable hàng ngày)
$ claude -m claude-sonnet "Refactor module auth sang OAuth2"
  → 30 giây, $0.08, kết quả tốt
  (Feature work tiêu chuẩn — sweet spot cho hầu hết task)

# Power cao — Opus (staff engineer: chậm, đắt, sâu)
$ claude -m claude-opus "Tìm memory leak trong codebase Rust 50K dòng"
  → 3 phút, $0.50, tìm ra
  (Gọi staff engineer khi junior và mid-level đều bí)
```

### Cách nghĩ về Power

**Đừng giao staff engineer sửa lỗi canh chỉnh button.** Dùng model rẻ nhất có thể làm được việc:

- **Haiku (junior):** Sửa lỗi chính tả, refactor đơn giản, documentation
- **Sonnet (mid-level):** Feature implementation, bug fix, code review — con ngựa kéo hàng ngày
- **Opus/GPT-5.5 (staff engineer):** Architecture phức tạp, redesign hệ thống, code mới — dùng có chọn lọc
- **DeepSeek-V4 (contractor):** Alternative rẻ, thường chất lượng mid-level với giá junior

Nghệ thuật quản lý Power là biết *khi nào* trả tiền cho bộ não staff engineer và *khi nào* junior làm đủ tốt. Hầu hết team đốt 70% ngân sách AI vào staff engineer làm việc junior.

---

## 2. Skills: Runbook Của Team

**Nó là gì:** Bộ hướng dẫn tái sử dụng dạy agent *cách* thực hiện tác vụ cụ thể — quy trình, conventions, guardrails.

**Phiên bản đơn giản:** Skills là wiki của team. Thay vì giải thích cách triage bug mỗi lần, bạn chỉ cho engineer cái runbook: "1. Tái hiện → 2. Tìm root cause → 3. Viết fix → 4. Thêm tests → 5. Tạo PR." Engineer làm theo từng bước.

### Skills vs. Prompt Thường

| | Prompt thường | Skill |
|---|---|---|
| **Ở đâu** | Trong tin nhắn | Trong `.claude/skills/` dạng SKILL.md |
| **Tái sử dụng** | Không (gõ lại mỗi lần) | Có (gọi bằng tên) |
| **Versioned** | Không | Có (git-tracked) |
| **Kết hợp** | Không | Có (nhiều skill cùng lúc) |
| **Auditable** | Mất trong lịch sử chat | File trên disk |

### Ví dụ thực tế

**Runbook bug triage (`.claude/skills/bug-triage/SKILL.md`):**
```markdown
# Bug Triage Skill

Khi được gọi:
1. Đọc error từ ticket hoặc API response gần nhất
2. Tái hiện bug local hoặc qua MCP queries
3. Tìm root cause trong codebase
4. Đề xuất fix kèm alternatives (Plan mode)
5. Sau khi approve: implement, test, tạo PR
6. Update ticket với summary

## Cách gọi
Run: /bug-triage
```

**Cách dùng:**
```bash
$ claude "/bug-triage"
  → Agent đọc skill, thực hiện từng bước.
```

### Tại sao Skills quan trọng

Không có Skills, bạn hoặc:
- **Giải thích lại mọi thứ mỗi lần** (như onboard lại intern mỗi sáng)
- **Để agent tự guess conventions** (rủi ro — nó sẽ đoán sai)

Có Skills, agent tải chính xác workflow của team — cùng runbook mà engineer người thật sẽ làm theo. Đây là lý do repo **mattpocock/skills** (44K★) hot trong 2026: nó là thư viện runbook đã được battle-test.

### Skills vs. CLAUDE.md

- **CLAUDE.md** = hiến pháp dự án ("dùng Riverpod, không BLoC")
- **Skills** = SOPs ("đây là cách ship feature: spec → approval → implement → review → deploy")

Cả hai đều cần. Một cái đặt luật, một cái đặt quy trình.

---

## 3. MCP: Hạ Tầng & APIs

**Nó là gì:** Model Context Protocol — chuẩn mở (97M+ downloads/tháng) kết nối AI agent với công cụ, dữ liệu, dịch vụ bên ngoài.

**Phiên bản đơn giản:** MCP là cách agent access hạ tầng của bạn. Thay vì mỗi tool tự xây connector AI riêng, MCP cung cấp một chuẩn duy nhất để cắm database, GitHub, Slack, Sentry, v.v. vào bất kỳ agent nào.

### MCP hoạt động thế nào (đơn giản hóa)

```
┌─────────────┐    MCP Protocol    ┌──────────────┐
│  AI Agent   │ ◄──────────────► │  MCP Server  │
│ (Claude,    │                    │ (GitHub,     │
│  ChatGPT,   │                    │  Slack,      │
│  Codex)     │                    │  PostgreSQL, │
│             │                    │  Sentry)     │
└─────────────┘                    └──────────────┘
```

Agent nói "tôi cần check error logs." Sentry MCP server xử lý API call, authentication, và formatting response. Agent không cần biết Sentry API — nó nói MCP.

### Ví dụ: Không MCP vs. Có MCP

**Không MCP (như dev không có VPN access):**
```bash
$ claude "Check lỗi gần đây trên production"
  → Agent: "Tôi không access được Sentry. Bạn paste logs được không?"
  ← Bạn: paste stack traces
  → Agent: đọc thủ công... "Có vẻ database timeout."
```

**Có MCP (như cho dev VPN + credentials):**
```bash
$ claude "Check lỗi gần đây trên production"
  → Agent kết nối Sentry MCP server
  → Sentry MCP query API, trả về kết quả đã lọc
  → Agent: "8 lỗi mới trong 1 giờ. Top 1: connection pool
     exhaustion trên /checkout. Để tôi check DB..."
  → Kết nối PostgreSQL MCP...
```

### Vấn đề: Context tax

MCP có một nhược điểm: **context tax.** Mỗi MCP server bạn thêm đều gửi mô tả tool vào context window của agent. Với 5+ MCP servers, bạn có thể đốt 10K+ tokens chỉ mô tả tools trước khi bắt đầu việc thực sự.

Đây là lúc **Skills** quay lại — Skills chỉ load context khi được gọi (như runbook bạn lấy từ kệ), trong khi MCP tool descriptions luôn trong bộ nhớ làm việc của agent.

| Cách tiếp cận | Context cost | Khi nào tools available |
|---|---|---|
| **MCP only** | Cao (luôn loaded) | Luôn luôn |
| **Skills only** | Thấp (load theo yêu cầu) | Chỉ khi được gọi |
| **Hybrid (Skills + MCP)** | Thấp (Skills orchestrate MCP) | Theo yêu cầu |

Best practice 2026: **Skills → MCP pattern** — Skill quyết định *khi nào* dùng MCP server, giữ context nhỏ và chỉ trả context tax khi cần.

---

## 4. Steering: Sprint Board & Code Review

**Nó là gì:** Các phương pháp bạn dùng để điều khiển agent — bảo nó *làm gì*, *làm thế nào*, và *khi nào dừng lại xin phép*.

**Phiên bản đơn giản:** Steering là development workflow của bạn áp dụng cho AI agent. Sprint planning, task assignment, design review, code review, CI gates — tất cả governance bạn áp cho engineer người thật, nhưng cho AI.

### Các cấp độ Steering

| Cấp độ | Bạn làm gì | Agent tự chủ | Rủi ro |
|---|---|---|---|
| **Full manual** | Bạn code, agent autocomplete | Không | Thấp |
| **Plan-then-do** | Agent design, bạn duyệt | Trung bình | Thấp |
| **Supervised** | Agent chạy, check-in milestones | Cao | Trung bình |
| **Autonomous** | Agent tự chọn task | Toàn phần | Cao |

### Công cụ Steering thực tế

**1. Plan mode (như viết design doc)**
```bash
$ claude "Thêm rate limiting vào API" --plan

  Agent: "Design của tôi:
  1. Tạo rate limiter middleware
  2. Thêm Redis backend cho distributed counting
  3. Gắn vào API router
  4. Thêm config env variables
  5. Viết tests
  Approve?"

  Bạn: "Bỏ Redis, dùng in-memory trước."
  Agent: adjust design và bắt đầu implement.
```

**2. Hooks (CI checks tự động)**
```
PreCommit hook → tự động chạy tests (như CI trước push)
PreToolUse hook → chặn commit secrets (như secrets scanner)
PostToolUse hook → format code sau edit (như formatter on save)
```

Hooks là "set and forget" steering — bạn đặt gates một lần, agent không bypass được.

**3. Permissions (access control)**
```bash
# Claude Code permission modes
claude --permission-mode default    # Hỏi cho mọi thứ ngoài project
claude --permission-mode relaxed    # Trust agent hoàn toàn
claude --permission-mode restricted # Read-only, phải hỏi để ghi
```

**4. Checkpoints (sprint demos)**
```bash
$ claude "Xây màn hình login"
  → Implement UI
  ✓ Checkpoint: "Review màn hình login? [Y/n]"
  → Implement auth logic
  ✓ Checkpoint: "Chạy tests? [Y/n]"
```

### Nguyên tắc vàng

> **Độ phức tạp cao = steering chặt. Độ phức tạp thấp = steering lỏng.**

Sửa lỗi chính tả: để agent tự làm (không design doc, không code review). Migration database: plan trước, approve, review output, verify staging. Hầu hết thất bại với AI agents xảy ra khi developer áp dụng sai steering level — hoặc micro-manage task vớ vẩn, hoặc để agent tự do trên task phức tạp.

---

## Cả Bốn Hoạt Động Cùng Nhau

**Task:** Bug từ khách hàng — endpoint `/checkout` trả về 500 khi có promo code trong giỏ hàng.

```
👨‍💻 Power: Claude Sonnet (mid-level engineer — đủ phức tạp để cần
    phán đoán tốt, nhưng staff engineer thì overkill)

Agent load workspace:

📖 CLAUDE.md (project README / onboarding docs):
  "Express.js, Prisma ORM, PostgreSQL, Promo codes tính theo timezone"

📋 Skills loaded (runbooks từ team wiki):
  /bug-triage    → "Tái hiện → tìm root cause → test → fix → verify → PR"
  /pr-describe   → "Viết PR: problem, root cause, fix, tests"

🔌 MCP servers (infrastructure access):
  GitHub MCP → browse source, tạo branch + PR
  PostgreSQL MCP → query bảng promo_codes live
  Sentry MCP → check error logs và stack traces
  Linear MCP → update bug ticket status

🎮 Steering:
  Plan mode: ON (dev propose architecture, TL approve)
  PreCommit hook: chạy `tsc --noEmit && vitest run`
  Permission mode: default (hỏi trước khi touch schema hoặc production config)

---

PM (qua Linear ticket): "Bug: checkout lỗi với promo code HELIO25"

Agent (/bug-triage runbook được gọi):
  1. Tái hiện bug
     → MCP PostgreSQL: "SELECT * FROM promo_codes WHERE code='HELIO25'"
     → Thấy code hết hạn lúc 2026-04-30T23:59:59Z
     → MCP Sentry: Check error logs gần đây cho /checkout
     → Tìm thấy: "Error: promo_code applied nhưng expiry check chạy trước validation"

  2. Đề xuất fix (Plan mode)
     "Root cause: Middleware validation kiểm tra expiry trước khi
      kiểm tra code đã applied chưa.
      Fix: Đảo thứ tự — apply trước, validate expiration sau.
      OK?"

  TL (bạn): "OK. Thêm regression test."

  3. Implement → viết fix → thêm test
  4. PreCommit hook chạy: tsc --noEmit, vitest — all green
     (Như CI chạy trước mỗi push)
  5. MCP GitHub: tạo branch, commit, mở PR
  6. MCP Linear: update ticket thành "Fix ready — PR #72"
  7. /pr-describe skill: viết PR description

  → "Fix ready trên branch fix/checkout-promo-order.
     Sent for code review."

---

Bạn (TL) mất: viết 1 comment trên ticket + 5 giây approve.
Agent xử lý: tái hiện, chẩn đoán, implement, test, document, và tạo PR.
```

Vai trò của từng khái niệm trong team engineering:

| Khái niệm | Vai trò trong team | Trong ví dụ |
|---|---|---|
| **Power** | Ai đang code | Sonnet — mid-level, đủ giỏi bug diagnosis, không overkill |
| **Skills** | Runbook của team | /bug-triage đưa quy trình 6 bước chính xác |
| **MCP** | Hạ tầng & APIs | PostgreSQL, Sentry, GitHub, Linear — tất cả qua một protocol |
| **Steering** | Sprint workflow & code review | Plan mode, PreCommit hook, approval gates — bạn là tech lead, không phải IC |

---

## Kết Luận

Bốn khái niệm này — Skills, MCP, Steering, Power — không phải ý tưởng cạnh tranh. Chúng là bốn lớp của một stack, và hiểu chúng kết hợp thế nào là sự khác biệt giữa "tôi thử AI coding và nó hỗn loạn" và "AI agents là công cụ hiệu quả nhất tôi từng dùng."

| Khái niệm | Tự hỏi |
|---|---|
| **Power** | Model nào thực sự cần cho task này? (Junior? Mid-level? Staff?) |
| **Skills** | Quy trình nào agent nên biết sẵn? |
| **MCP** | Hệ thống bên ngoài nào agent cần truy cập? |
| **Steering** | Task này cần tôi kiểm soát bao nhiêu? |

Nếu bạn bắt đầu với AI agents trong 2026, bỏ qua mấy bài hype về "model nào tốt nhất." Học bốn khái niệm này trước. Mọi quyết định sản phẩm, mọi lựa chọn workflow, mọi đánh giá công cụ — tất cả đều quay về bốn điều này.

---

*Bài viết dựa trên kinh nghiệm thực tế với Claude Code, Codex, Cursor, và Warp ADE trong các dự án production.*
