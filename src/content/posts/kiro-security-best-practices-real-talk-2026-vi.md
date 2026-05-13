---
title: "Kiro Bảo mật, Best Practices và Real Talk"
description: "Sự thật về bảo mật AI coding agent — phân tích sự cố AWS tháng 12/2025, chiến lược phân quyền, hardening sandbox, khi nào KHÔNG nên dùng Kiro, và so sánh trung thực với Claude Code, Cursor và GitHub Copilot."
published: 2026-05-13
pubDate: 2026-05-13T10:00:00.000Z
slug: kiro-security-best-practices-real-talk-2026-vi
tags:
  - kiro
  - aws
  - security
  - best-practices
  - ai-coding
  - comparison
  - agent-safety
  - incident-analysis
category: ai-agents
lang: vi
series:
  name: "Practical Kiro — Môi trường phát triển Agentic của AWS"
  order: 6
  total: 6
---

Đây là bài cuối của series Practical Kiro. Days 0-4 đã đề cập IDE, CLI, specs, hooks, powers và autonomous agent. Tất cả đều thú vị. Nhưng sự khác biệt giữa công cụ tuyệt vời và công cụ nguy hiểm là điều xảy ra khi mọi thứ sai.

Hôm nay chúng ta đề cập ba điều:

1. **Bảo mật** — permissions, sandboxing, và sự cố AWS tháng 12/2025
2. **Best practices** — những gì thực sự hoạt động trong production sau nhiều tháng dùng Kiro
3. **Real talk** — so sánh trung thực với Claude Code, Cursor, Copilot và khi nào không nên dùng Kiro

Hãy thành thật: không có công cụ AI coding nào an toàn theo mặc định. An toàn là thứ bạn phải xây dựng.

---

## Phần 1: Bảo mật — Sự cố AWS tháng 12/2025

Tháng 12/2025, một team AWS dùng phiên bản đầu của Kiro autonomous agent để refactor module IAM policy dùng chung trong service mesh của họ. Việc refactoring thành công — quá thành công. Agent, khi được yêu cầu "gom các policy trùng lặp," đã merge policy read-only và read-write thành một template duy nhất, vô tình cấp quyền write cho các service lẽ ra chỉ nên read.

Kết quả: một production incident khi một data pipeline service chỉ-read vô tình có khả năng sửa đổi trạng thái hạ tầng critical.

Tám giờ rollback, post-mortem, và khôi phục policy. Root cause: agent có quyền *tạo và áp dụng IAM policies* trong sandbox kết nối GitHub, và quy trình review của con người không phát hiện việc mở rộng quyền bị chôn vùi trong diff policy 200 dòng.

### Bài học từ Sự cố

Sự cố này tiết lộ một sự thật cơ bản về AI coding agents: **chúng cực kỳ giỏi làm theo hướng dẫn và cực kỳ tệ trong việc hiểu hậu quả.**

Agent đã làm chính xác những gì được yêu cầu — gom policies. Nó không hiểu rằng một số policies đó tạo thành ranh giới bảo mật không nên vượt qua. Ba thất bại cụ thể:

1. **Credentials overscoped** — Sandbox có full IAM write access thay vì read-only có phạm vi
2. **Trusted policy diff** — Diff 200 dòng bị collapse mặc định; việc mở rộng quyền vô hình
3. **Không có safety check policy** — Không có xác minh pre-commit rằng thay đổi giữ nguyên ranh giới truy cập ban đầu

### Cách Kiro Đã Sửa

Sau sự cố, Kiro thêm một số tính năng bảo mật hiện là tiêu chuẩn:

1. **Policy-aware sandboxing** — MCP integrations liên quan đến hạ tầng (IAM, Terraform, CloudFormation) chạy trong restricted sandbox theo mặc định
2. **Permission diff highlights** — Khi PR thay đổi IAM/service roles, agent tự động highlight delta quyền trong mô tả PR
3. **Guardrails configuration** — `.kiro/kiro.json` chấp nhận deny rules tường minh

### Thiết lập Guardrails

Trong `.kiro/kiro.json`:

```json
{
  "guardrails": {
    "deny": {
      "actions": [
        "grant_admin_access",
        "modify_network_security_groups",
        "delete_production_database"
      ],
      "resources": [
        "arn:aws:iam::*:role/production-*",
        "arn:aws:s3:::*-production"
      ],
      "patterns": [
        "AWS_SECRET_ACCESS_KEY",
        "DATABASE_URL_PRIMARY"
      ]
    },
    "requireApproval": {
      "files": ["**/Dockerfile", "**/docker-compose*.yml", "**/*-config/production.*"],
      "patterns": ["DELETE FROM", "DROP TABLE", "GRANT ALL"]
    }
  }
}
```

Cấu hình này bảo Kiro:
- **Deny** — Không bao giờ thực hiện các hành động này, chạm vào tài nguyên này, hoặc viết các pattern này
- **Require approval** — Đánh dấu các file/pattern này cần human review trước khi áp dụng

Danh sách `deny` tự động được kiểm tra ở ba giai đoạn: spec generation, task execution và PR creation. Nếu spec được tạo bao gồm hành động bị từ chối, Kiro từ chối trước khi code nào được viết.

### Vệ Sinh Token và Credential

Từ Day 3, chúng ta đã đề cập cơ bản (không hardcode token, read-only trước). Đây là hệ thống hoàn chỉnh:

| Loại Credential | Lưu ở đâu | Rotation | Audit |
|----------------|-----------|----------|-------|
| GitHub tokens | Kiro secret store / env vars | 90 ngày/lần | Kiểm tra với repo access |
| MCP server tokens | Kiro secret store | Theo policy provider | Logged mỗi request |
| Cloud provider keys | Role riêng (sandbox → assume role) | Mỗi session | CloudTrail integration |
| Service secrets | Kiro secret store hoặc 1Password CLI | Mỗi task | Không bao giờ log ra stdout |

Quy tắc quan trọng nhất: **không bao giờ kết nối Kiro với AWS credentials production của bạn.** Dùng staging/production-isolated sandbox. Autonomous agent chạy trong môi trường cloud riêng, nhưng nếu bạn cấu hình nó với full AWS access, khác biệt duy nhất giữa Kiro và một vụ rò rỉ bảo mật là khả năng review PR trước khi merge.

---

## Phần 2: Best Practices từ Production

Đây là các pattern nổi lên từ các team dùng Kiro hàng ngày trong nhiều tháng. Không phải lý thuyết — thực tiễn đã chứng minh.

### 1. Steering File Là Single Source of Truth

Steering file định nghĩa "hiến pháp" dự án của bạn. Mọi thành viên team và mọi AI agent đều tham chiếu nó. Hãy giữ nó:

- **Trong version control** — Track `.kiro/steering.md` trong git. Thay đổi cần qua PR review như bất kỳ thay đổi code nào.
- **Review hàng quý** — Khi dự án phát triển, cập nhật steering files phản ánh quyết định kiến trúc mới.
- **Ngắn gọn nhưng cụ thể** — Steering file 20 dòng tập trung vào các ràng buộc critical tốt hơn tuyên ngôn 200 dòng không ai đọc.

Steering files tốt tập trung vào: không nên làm gì, nên theo pattern nào, và cách xử lý bảo mật.

### 2. Spec Review Hoạt Động, Nếu Bạn Làm

Giai đoạn spec generation (Day 2) bắt được nhiều bugs hơn code review. Các team đầu tư 5 phút review spec trước khi phê duyệt thấy:

- **Ít hơn 40% PR iterations** so với bỏ qua spec review
- **Ít hơn 60% security escapes** — edge cases được đánh dấu trước khi code tồn tại
- **Task decomposition tốt hơn** — component thiếu được phát hiện sớm

Điểm đau: rất dễ liếc spec và bấm approve. Đừng. Đọc acceptance criteria và edge cases. Đó là nơi bugs ẩn náu.

### 3. Giới Hạn Concurrent Autonomous Tasks

Autonomous agent có thể chạy 10 task đồng thời (Day 4). Kinh nghiệm team gợi ý:

| Task Đồng Thời | Human Attention Cần | Lý Tưởng Cho |
|---------------|--------------------|--------------|
| 1-3 | 5-10 phút mỗi review cycle | Phát triển hàng ngày |
| 4-6 | 15-20 phút mỗi review cycle | Dự án migration |
| 7-10 | Giám sát full-time | Refactoring quy mô lớn |

Chạy 10 task đồng thời không giám sát là cách bạn thức dậy với 10 PRs đều cần rework đáng kể. Bắt đầu với 3. Chỉ tăng khi bạn tin tưởng chất lượng output của agent.

### 4. Hooks: Bắt Đầu Nhỏ, Mở Rộng Sau

Sai lầm phổ biến nhất với Kiro: tạo 15 hooks ngày đầu tiên. Mỗi hook đốt credits và có thể tạo noise.

**Bắt đầu với ba hooks này:**
```
on_commit: Quét secrets (không thể thương lượng)
on_save → "src/**/*.ts": Type-check (bắt lỗi sớm)
on_pr_open: Tạo mô tả PR (tiết kiệm thời gian)
```

Thêm hook khác chỉ khi có pain point cụ thể.

### 5. MCP: 3 Servers, Không Phải 5

Kiro hỗ trợ đến 5 MCP server đồng thời. Dùng ít hơn:

- **Bắt đầu với 1-2** — MCP servers liên quan nhất đến sprint hiện tại
- **Không bao giờ quá 3 cho công việc hàng ngày** — Nhiều server hơn = planning chậm hơn + token consumption cao hơn
- **Dùng Powers khi có thể** — Chúng đã được pre-tested và tối ưu cho Kiro

Thiết lập MCP phổ biến nhất: version control (GitHub/GitLab) + database (PostgreSQL/Supabase) + documentation (Context7/Notion).

### 6. Luôn Giữ Con Người Trong Vòng Lặp

Per-task approval mode của Kiro không chỉ là checkbox. Cho bất kỳ thứ gì chạm production infrastructure, security configuration, hoặc database schema:

1. Review spec trước khi thực thi
2. Review diff trước khi merge
3. Chạy staging tests trước production

Autonomous agent là trợ lý async, không phải người ra quyết định tự động. Hãy đối xử với nó như junior developer đọc docs nhanh nhưng thiếu judgment.

---

## Phần 3: Real Talk — So sánh Trung thực

Đây là nơi marketing dừng lại và sự trung thực bắt đầu.

### Kiro vs Claude Code

| Khía cạnh | Kiro | Claude Code |
|-----------|------|-------------|
| **Giá** | $0-$200/tháng | $20/tháng (Pro) + API usage |
| **Autonomous agent** | Có (Web interface) | Không |
| **Cross-repo** | Có | Không (single directory) |
| **Spec-driven mode** | Có | Không |
| **Hooks** | Agent hooks (natural language) | Git hooks (shell scripts) |
| **Powers/MCP market** | 100+ bundled | Community MCP |
| **Sandbox** | Cloud (autonomous only) | Terminal của bạn |
| **Tốt nhất cho** | Full workflow ownership | Quick inline tasks |

**Kết luận:** Claude Code tốt cho inline work — hỏi câu, nhận câu trả lời, tiếp tục. Kiro thắng cho dự án cần structured workflows, cross-repo changes và async execution. Nếu công việc chủ yếu là sửa file đơn lẻ và đặt câu hỏi, Claude Code rẻ hơn và nhanh hơn.

### Kiro vs Cursor

| Khía cạnh | Kiro | Cursor |
|-----------|------|--------|
| **Giá** | $0-$200/tháng | $20/tháng |
| **Agent mode** | Spec-driven (plan → execute → review) | Chat-driven (ask → code) |
| **Hooks** | Agent hooks (context-aware) | Rules (static) |
| **MCP** | Powers + custom MCP | MCP support (mới hơn, ít mature hơn) |
| **IDE base** | VS Code fork (proprietary) | VS Code fork |
| **Tab completion** | Không | Có |
| **Tốt nhất cho** | Complex, multi-step features | Rapid prototyping, quick edits |

**Kết luận:** Tab completion và inline editing của Cursor tốt hơn đáng kể cho rapid iteration. Spec-driven mode của Kiro mạnh hơn cho complex features nhưng cần đầu tư upfront nhiều hơn. Cho prototyping, Cursor nhanh hơn. Cho production features với yêu cầu rõ ràng, Kiro tạo output đáng tin cậy hơn.

### Kiro vs GitHub Copilot

| Khía cạnh | Kiro | GitHub Copilot |
|-----------|------|----------------|
| **Giá** | $0-$200/tháng | $10-$39/tháng |
| **Agent mode** | Full spec-driven + autonomous | Chat + Agent mode (đang phát triển) |
| **Context** | Steering file + hook config | Repository indexing |
| **MCP** | Powers + custom | Hạn chế |
| **Cross-repo** | Có | Không |
| **Tốt nhất cho** | Team-scale agentic development | Individual code completion |

**Kết luận:** Copilot là lựa chọn giá phải chăng nhất cho developer cá nhân chủ yếu cần code completion và chat. Kiro nhắm vào vấn đề khác: team cần orchestrate AI xuyên repo, enforce standards và tự động hóa quality checks. Chúng không thực sự cạnh tranh — Copilot là autocomplete tốt hơn, Kiro là development environment tốt hơn.

### Khi Nào Không Nên Dùng Kiro

Thành thật:

1. **Bạn là solo developer xây single-page apps** — Quá đắt. Dùng Copilot hoặc Claude Code.
2. **Team không code review** — Safety model của Kiro dựa vào human review. Không có nó, bạn đang cho AI write access vào hạ tầng.
3. **Bạn làm việc trong air-gapped environments** — Kiro cần internet cho auth và updates. Claude Code có thể chạy offline trong terminal.
4. **Dự án của bạn zero tests** — Spec-driven workflow tạo test files, nhưng nếu không có test suite hiện tại để verify, bạn mất lợi ích chính của verification phase.
5. **Bạn cần kiểm soát chi phí chi tiết** — Credit model của Kiro dựa trên consumption. Nếu team chạy 50 hooks mỗi ngày, chi phí tăng nhanh. Copilot $39/tháng flat dễ dự đoán hơn.

### Khi Nào Chắc Chắn Nên Dùng Kiro

1. **Bạn duy trì 10+ microservices** — Cross-repo refactoring một mình justify chi phí
2. **Team bạn struggle với code consistency** — Steering file enforce standards xuyên tất cả PRs
3. **Bạn đang migrate codebase lớn** — Framework upgrades, library changes, cloud migrations
4. **Security compliance bắt buộc** — Guardrails, deny lists và per-file approval modes
5. **Bạn muốn async development** — Ủy thác công việc và review kết quả sau

---

## Kết Luận Cuối Cùng

Kiro là môi trường AI coding tham vọng nhất hiện có. Quy trình spec-driven, agent hooks, powers ecosystem và autonomous agent đại diện cho cách tiếp cận thực sự mới với phát triển phần mềm — từ "AI như autocomplete" đến "AI như cộng tác viên async."

Nhưng tham vọng đi kèm phức tạp. Kiro đòi hỏi nhiều thiết lập, kỷ luật review và quản lý chủ động hơn các công cụ đơn giản hơn. Nó không phải cây đũa thần — đó là động cơ mạnh mẽ cần người vận hành có kỹ năng.

Các team thành công với Kiro chia sẻ một đặc điểm: họ coi nó như **cộng tác viên**, không phải sự thay thế. Họ review specs, duy trì steering files, cấu hình guardrails và giữ con người trong mọi vòng quyết định.

Dùng nó cho điều nó giỏi. Tôn trọng điều nó không giỏi. Và đừng bao giờ quên rằng người review vẫn là người chịu trách nhiệm cho code.

---

## Tổng Kết Series

| Day | Chủ đề | Takeaways chính |
|-----|--------|----------------|
| 0 | Kiro Overview | Ba giao diện: IDE, CLI, Web. $0-$200/tháng. Spec-driven, không phải chat-driven |
| 1 | Cài đặt & Thiết lập | Brew/macOS, download/Linux, CLI via curl. AWS Builder ID auth. Steering files |
| 2 | Quy trình Spec-Driven | 6 giai đoạn: Prompt → Spec → Task Plan → Implement → Review → Approve |
| 3 | Hooks, Powers, MCP | QA gates hướng sự kiện. 100+ Powers. Custom MCP servers. Steering+Hooks+Powers stack |
| 4 | Autonomous Agent | Async cross-repo coding. 3 sub-agents. Sandbox isolation. GitHub issue → PR lifecycle |
| 5 | Bảo mật & Best Practices | Sự cố tháng 12/2025. Guardrails. So sánh thực tế. Khi nào dùng / tránh |

---

*Series: Practical Kiro — Môi trường phát triển Agentic của AWS. 6 phần, hoàn tất.*
