---
title: "Kiro Agent Hooks, Powers và MCP: Tự động hóa Quality Gates ở Quy mô Lớn"
description: "Tìm hiểu sâu về agent hooks (tự động hóa hướng sự kiện), Powers ecosystem (100+ tích hợp MCP) và cấu hình MCP tùy chỉnh của Kiro. Xây dựng quality gates tự động chạy khi save, commit và deploy."
published: 2026-05-11
pubDate: 2026-05-11T10:00:00.000Z
slug: kiro-hooks-powers-mcp-integrations-2026-vi
tags:
  - kiro
  - aws
  - agent-hooks
  - powers
  - mcp
  - automation
  - ci-cd
  - agentic-ide
category: ai-agents
lang: vi
series:
  name: "Practical Kiro — Môi trường phát triển Agentic của AWS"
  order: 4
  total: 6
---

Day 2, chúng ta đã đi qua quy trình spec-driven của Kiro từ prompt đến PR. Đó là mặt **chủ động** của phát triển — bảo Kiro xây gì. Hôm nay chúng ta đề cập mặt **bị động**: tự động hóa chạy mà bạn không cần yêu cầu.

Agent hooks kích hoạt theo sự kiện (lưu file, commit, build). Powers mở rộng Kiro với các công cụ bên ngoài qua MCP. Cùng nhau, chúng tạo thành hạ tầng quality gate của Kiro — một bộ kiểm tra tự động phát hiện vấn đề trước khi chúng đến production.

Nếu quy trình spec-driven là chân ga, thì hooks và powers là phanh và cảm biến.

---

## Agent Hooks: Tự động hóa Hướng Sự kiện

Agent hooks là hướng dẫn ngôn ngữ tự nhiên tự động chạy khi các sự kiện cụ thể xảy ra trong quy trình phát triển của bạn. Không giống Git hooks truyền thống (chạy shell scripts), hooks của Kiro được AI agent diễn giải, giúp chúng có nhận thức ngữ cảnh — nó biết _bạn đã thay đổi gì_ và _tại sao_.

### Các Loại Hook và Trigger

| Trigger | Khi nào kích hoạt | Use case điển hình |
|---------|-------------------|-------------------|
| `on_save` | File được lưu | Tái tạo tests, format code, type-check |
| `on_commit` | Git commit được tạo | Quét secrets, kiểm tra conventions, tạo changelog |
| `on_api_change` | API route hoặc schema thay đổi | Tự động cập nhật tài liệu API |
| `on_build` | Lệnh build chạy | Chạy linters, kiểm tra dependencies |
| `on_pr_open` | Pull request được tạo | Tạo mô tả PR, kiểm tra giới hạn kích thước |
| `on_pr_merge` | Pull request được merge | Gắn tag release, cập nhật changelog, deploy staging |

### Cấu hình

Hooks được đặt trong `.kiro/hooks.yaml` tại thư mục gốc dự án:

```yaml
# .kiro/hooks.yaml

hooks:
  # Khi lưu: tái tạo unit tests cho component đã thay đổi
  - trigger: on_save
    pattern: "src/components/**/*.tsx"
    action: "Tạo lại unit tests cho component này trong tests/components/"
    
  # Khi lưu: type-check file TypeScript đã thay đổi
  - trigger: on_save
    pattern: "src/**/*.ts"
    action: "Chạy TypeScript type checker trên file đã thay đổi và sửa lỗi type"
    
  # Khi commit: quét hardcoded secrets
  - trigger: on_commit
    action: "Quét tất cả staged files để tìm API keys, password, tokens hardcoded. Báo cáo chính xác file và dòng."
    
  # Khi commit: kiểm tra convention commit message
  - trigger: on_commit
    action: "Xác thực commit message theo định dạng conventional commits (type(scope): description). Nếu không đúng, gợi ý format chính xác."
    
  # Khi API thay đổi: cập nhật tài liệu
  - trigger: on_api_change
    pattern: "src/routes/**/*.ts"
    action: "Cập nhật tài liệu API trong docs/api/ phản ánh routes đã thay đổi"
    
  # Khi build: kiểm tra bảo mật
  - trigger: on_build
    action: "Chạy npm audit trên package.json. Nếu có lỗ hổng, phân loại theo mức độ nghiêm trọng và đề xuất cách sửa."

  # Khi PR mở: tạo mô tả
  - trigger: on_pr_open
    action: "Phân tích diff giữa branch này và main. Tạo mô tả PR gồm: tóm tắt thay đổi, file bị ảnh hưởng, breaking changes, và hướng dẫn kiểm thử."
```

### Cách Hooks Thực thi

Khi một trigger kích hoạt (ví dụ: bạn lưu file), Kiro:

1. **Khớp trigger** — kiểm tra file thay đổi có khớp `pattern` glob không
2. **Đọc context** — tải file hiện tại, thay đổi gần đây, và cấu trúc dự án
3. **Thực thi action** — diễn giải hướng dẫn ngôn ngữ tự nhiên và thực hiện công việc
4. **Báo cáo kết quả** — hiển thị thông báo trong IDE (thành công, cảnh báo, hoặc cờ)

Hook thực thi bất đồng bộ và chạy song song với công việc của bạn. Bạn sẽ thấy một indicator nhẹ rằng hook đang chạy, nhưng nó sẽ không chặn việc chỉnh sửa của bạn.

### Tham số Pattern

Trường `pattern` là glob giới hạn file nào kích hoạt hook:

```yaml
# Chỉ kích hoạt khi file TypeScript source thay đổi
pattern: "src/**/*.ts"

# Chỉ kích hoạt khi file API route thay đổi
pattern: "src/routes/**/*.ts"

# Chỉ kích hoạt khi file test thay đổi
pattern: "**/*.test.ts"

# Kích hoạt trên bất kỳ file JavaScript/TypeScript nào
pattern: "src/**/*.{js,ts,jsx,tsx}"
```

Không có pattern, hook kích hoạt cho bất kỳ file thay đổi nào khớp trigger.

### Safety: Tại sao Ngôn ngữ Tự nhiên > Scripts

Git hooks truyền thống là shell scripts — hook `pre-commit` chạy `npm test` hoặc pass hoặc fail. Hooks ngôn ngữ tự nhiên của Kiro thông minh hơn:

```yaml
# Thay vì: "run eslint on src/"
# Bạn viết:
- trigger: on_save
  pattern: "src/**/*.ts"
  action: "Kiểm tra file đã lưu cho các vấn đề coding phổ biến: unused imports, thiếu xử lý lỗi, hardcoded values lẽ ra nên là config. Sửa trực tiếp."
```

Agent hiểu **cái gì** bạn muốn kiểm tra, không chỉ **lệnh nào** để chạy. Nó có thể:
- Phân biệt giữa secret thật và test placeholder
- Hiểu rằng một import thiếu có thể là cố ý trong file WIP
- Áp dụng conventions dự án cụ thể từ steering file

Điều này làm cho hooks ít fragile hơn đáng kể so với shell scripts.

---

## Ví dụ Workflow Agent Hook

Đây là một workflow chất lượng CI thực tế chỉ dùng hooks:

**Kịch bản:** Bạn đang thêm API endpoint mới. Bạn viết route handler, lưu, và commit.

```yaml
# .kiro/hooks.yaml

# 1. Khi lưu: kiểm tra lỗi type ngay lập tức
- trigger: on_save
  pattern: "src/**/*.ts"
  action: "Kiểm tra file đã lưu cho lỗi TypeScript và sửa chúng"

# 2. Khi lưu: tự động tạo unit tests
- trigger: on_save
  pattern: "src/routes/**/*.ts"
  action: "Tạo Vitest unit tests cho route handler này"

# 3. Khi commit: quét bảo mật
- trigger: on_commit
  action: "Kiểm tra staged files cho: hardcoded secrets, SQL injection patterns, thiếu input validation. Liệt kê bất kỳ vấn đề nào."

# 4. Khi commit: cập nhật tài liệu API
- trigger: on_api_change
  pattern: "src/routes/**/*.ts"
  action: "Cập nhật tài liệu API trong docs/api/"

# 5. Khi build: quality gate đầy đủ
- trigger: on_build
  action: "Chạy test suite. Nếu test nào fail, phân tích lỗi và đề xuất sửa."
```

**Điều gì xảy ra:** Bạn lưu `routes/users.ts` → Kiro type-check → tạo unit tests → Bạn commit → Kiro quét secrets → cập nhật API docs → Bạn build → Kiro chạy tests.

Tất cả tự động, tất cả nhận thức ngữ cảnh, zero shell scripts.

---

## Powers: Chợ MCP của Kiro

Powers là các tích hợp MCP được cấu hình sẵn, có sẵn trực tiếp từ Kiro IDE. Hãy nghĩ về chúng như VS Code extension marketplace, nhưng dành cho công cụ AI agent.

### Cách Powers Hoạt động

Mỗi Power bao gồm:
- **MCP server** (implementation công cụ thực tế)
- **Cấu hình riêng Kiro** (steering file snippets, hook templates, spec patterns)
- **Thiết lập Auth** (OAuth flow, quản lý API key)
- **Ví dụ sử dụng** (prompt templates tối ưu cho công cụ này)

### Danh mục Powers

Kiro có hơn 100 Powers. Dưới đây là các danh mục ảnh hưởng nhất:

| Danh mục | Powers đáng chú ý | Tác động |
|----------|-------------------|----------|
| **Thanh toán** | Stripe, Checkout.com, StepPay | Tạo luồng thanh toán chính xác không cần đọc API docs |
| **Observability** | Datadog, New Relic, Dynatrace | Truy vấn metric production từ trong specs |
| **Bảo mật** | Snyk, Checkmarx, SonarQube, Aikido | Tự động sửa lỗ hổng trong quá trình codegen |
| **Cloud** | Terraform, Firebase, Supabase, Neon | Tạo IaC song song với application code |
| **Design** | Figma, Miro | Dịch design thành code với nhận thức design system |
| **Testing** | ScoutQA, Playwright | Tạo và chạy E2E tests |
| **API** | Postman, Context7 | Kiểm thử API và tài liệu thư viện |
| **Infrastructure** | Depot, CloudZero, Harness | Build container, phân tích chi phí, CI/CD |

### Spotlight: Figma Power

Figma Power là một trong những Power ấn tượng nhất của Kiro — nó kết nối file Figma với code generation:

```yaml
# Cách hoạt động:
# 1. Thả Figma URL vào Kiro spec
# 2. Kiro lấy design qua Figma MCP
# 3. Nó hiểu: component hierarchy, design tokens, layout, interactions
# 4. Tạo code khớp tech stack của bạn (React/Tailwind/TypeScript)
# 5. Dùng Code Connect để map Figma components vào component có sẵn
```

Điều này khác cơ bản so với các công cụ "screenshot to code". Figma Power hiểu design system của bạn, không chỉ vị trí pixel.

### Kích hoạt Power

Từ Kiro IDE:
1. Mở tab **Powers** (thanh bên trái)
2. Duyệt hoặc tìm kiếm — thử "PostgreSQL" để xem database Powers
3. Nhấn vào card Power → xem permissions và yêu cầu auth
4. Nhấn **Add**
5. Hoàn tất luồng auth (OAuth, nhập API key)

Power đã được kích hoạt. Kiro sẽ tự động dùng công cụ của nó trong quá trình tạo spec và thực thi task.

---

## Custom MCP Servers: Mang Công cụ Riêng Của Bạn

Ngoài Powers, bạn có thể kết nối bất kỳ MCP server nào. Đây là cách bạn tích hợp công cụ nội bộ, API độc quyền, và hệ thống legacy.

### Cấu hình

Sửa `.kiro/kiro.json` trong thư mục gốc dự án:

```json
{
  "mcpServers": {
    "internal-api-docs": {
      "command": "node",
      "args": ["/path/to/mcp-server/index.js"],
      "env": {
        "API_DOCS_URL": "${INTERNAL_API_URL}"
      }
    },
    "pagerduty": {
      "command": "npx",
      "args": ["-y", "@pagerduty/mcp-server"],
      "env": {
        "PAGERDUTY_API_KEY": "${PAGERDUTY_TOKEN}"
      }
    }
  }
}
```

### Quy tắc Bảo mật cho MCP

1. **Không bao giờ hardcode token** — dùng biến môi trường hoặc secret store của Kiro
2. **Read-only tokens trước** — bắt đầu với API keys read-only; nâng cấp khi cần
3. **Giới hạn phạm vi** — Kiro có thể kết nối tối đa 5 MCP server đồng thời; nhiều hơn = tiêu thụ token nhiều hơn + planning chậm hơn
4. **Kiểm tra quyền token** — xem mỗi MCP server token có thể truy cập gì

### MCP trong Autonomous Agent

Khi bạn chạy autonomous agent (giao diện Web), tích hợp MCP có sẵn trong quá trình thực thi task. Agent có thể truy vấn API bên ngoài, kiểm tra tài liệu, và gọi dịch vụ — tất cả trong sandbox cách ly.

Khác biệt chính so với IDE MCP: autonomous agent có thể **dùng MCP tools xuyên nhiều repo** trong một task duy nhất, duy trì ngữ cảnh xuyên suốt.

---

## Kết hợp Hooks + Powers + Steering

Sức mạnh thực sự đến từ việc kết hợp cả ba hệ thống:

**Steering** định nghĩa _cách_ bạn code → **Hooks** tự động hóa _điều gì_ xảy ra khi bạn code → **Powers** mở rộng _những gì_ bạn có thể tiếp cận

Đây là workflow kết hợp:

```
steering.md: Định nghĩa tiêu chuẩn code, kiến trúc, quy tắc bảo mật
                  ↓
          Bạn viết code
                  ↓
on_save hook: Type-check + format (nhận thức kiến trúc từ steering)
on_commit hook: Quét secrets + kiểm tra conventions
    ⤷ Dùng Powers: Snyk cho quét bảo mật
        ⤷ MCP server kiểm tra Snyk API
on_pr_open hook: Tạo mô tả PR + kiểm tra kích thước
    ⤷ Dùng Powers: GitHub cho PR metadata
        ⤷ MCP server gọi GitHub API
```

Mỗi lớp thêm ngữ cảnh cho lớp tiếp theo. Hook biết tiêu chuẩn code của bạn vì nó đọc steering file. Power biết cấu trúc dự án vì hook cung cấp nó.

---

## Nhận thức Chi phí Token

Agent hooks tiêu thụ credits giống như chat prompts. Hooks đơn giản (type-check khi lưu) tốn phần nhỏ credits. Hooks phức tạp (tạo tests + quét secrets khi commit) tốn nhiều hơn.

| Độ phức tạp Hook | Chi phí Credit (Auto mode) | Tương đương Chat |
|-----------------|---------------------------|------------------|
| Type-check khi lưu | 0.1 - 0.3 credits | ~10 prompt đơn giản |
| Tái tạo tests | 0.3 - 1.0 credits | ~30 prompts |
| Quét bảo mật đầy đủ khi commit | 0.5 - 2.0 credits | ~50 prompts |
| Tạo mô tả PR | 1.0 - 3.0 credits | ~100 prompts |

Hãy xem xét credits hàng tháng khi thiết kế hooks. Hook `on_commit` chạy 20 lần/ngày × 1 credit = 600 credits/tháng — hơn nửa gói Pro.

**Mẹo tối ưu:**
- Dùng `pattern` để giới hạn phạm vi hook
- Không xếp chuỗi hooks đắt tiền trên cùng một trigger
- Cân nhắc dùng Auto mode cho hooks (1x credits vs 1.3x cho Sonnet 4)

---

## Tiếp Theo

Với hooks, powers và MCP đã tích hợp vào workflow, Day 4 khám phá **Kiro Autonomous Agent (Web)** — coding async xuyên repo, chạy độc lập hàng giờ hoặc ngày, quản lý nhiều sub-agents và môi trường sandbox.

---

*Series: Practical Kiro — Môi trường phát triển Agentic của AWS. Day 3: Agent Hooks, Powers & MCP. Day 4: Autonomous Agent (Web) → sắp tới.*
