---
title: "Hướng dẫn cài đặt Kiro: IDE, CLI và cấu hình lần đầu"
description: "Hướng dẫn từng bước cài đặt Kiro IDE và CLI, đăng nhập AWS Builder ID, thiết lập steering files và kết nối MCP server đầu tiên."
published: 2026-05-09
pubDate: 2026-05-09T10:00:00.000Z
slug: kiro-install-guide-ide-cli-setup-2026-vi
tags:
  - kiro
  - aws
  - installation
  - cli
  - ide
  - steering-files
  - mcp
  - agentic-ide
category: ai-agents
lang: vi
series:
  name: "Practical Kiro — Môi trường phát triển Agentic của AWS"
  order: 2
  total: 6
---

Kiro có hai giao diện chính: **IDE** (bản fork VS Code) và **CLI** (agent dòng lệnh). Day 0 giải thích Kiro là gì và tại sao spec-driven approach quan trọng. Hôm nay, chúng ta cài đặt cả hai và cấu hình cho công việc thực tế.

Nếu bạn đến từ VS Code, IDE sẽ cảm thấy quen thuộc ngay lập tức. Nếu bạn sống trong terminal, CLI có thể là công cụ hàng ngày của bạn. Dù thế nào, việc cài đặt chỉ mất vài phút.

---

## Yêu cầu tiên quyết

- **Hệ điều hành:** macOS, Linux, hoặc Windows (khuyên dùng WSL2 cho Windows)
- **Git** đã cài và cấu hình
- **Tài khoản GitHub** (cho tính năng autonomous agent)
- **Node.js 18+** (khuyên dùng cho CLI)
- **Dung lượng ổ đĩa:** ~500 MB cho IDE, không đáng kể cho CLI

Không cần tài khoản AWS — Kiro dùng AWS Builder ID, miễn phí và tách biệt với tài khoản AWS billing.

---

## 1. Cài đặt Kiro IDE

Kiro IDE là bản fork VS Code xây dựng trên Code OSS, vì vậy extensions, phím tắt và themes đều tương thích.

**Tải về:** Truy cập [kiro.dev/downloads](https://kiro.dev/downloads)

Trang tải tự động phát hiện hệ điều hành của bạn. Chọn gói phù hợp:
- **macOS:** `.dmg` (Apple Silicon & Intel)
- **Linux:** `.deb` (Debian/Ubuntu), `.rpm` (Fedora), hoặc `.AppImage`
- **Windows:** Trình cài đặt `.exe`

**Cách thay thế — cài qua Homebrew (macOS/Linux):**

```bash
brew install kirodev/tap/kiro
```

**Sau khi cài đặt:** Khởi chạy Kiro IDE. Bạn sẽ thấy màn hình đăng nhập — tạm thời đóng nó lại; chúng ta sẽ cấu hình sau.

### Những gì bạn có ngay khi cài

Kiro IDE là VS Code với các bổ sung:
- **Agent panel** — thanh bên phải cho chat, specs và tương tác với agent
- **Spec tab** — trình soạn thảo yêu cầu có cấu trúc (prompt → spec flow)
- **Steering file generator** — tự động tạo `.kiro/steering.md` cho mỗi dự án
- **Powers tab** — chợ MCP server tích hợp trong IDE
- **Kiro terminal** — terminal thả xuống với CLI được tích hợp sẵn

---

## 2. Cài đặt Kiro CLI

CLI là một binary đơn lẻ, không phụ thuộc gì ngoài Git.

```bash
curl -fsSL https://kiro.dev/install.sh | sh
```

Lệnh này cài đặt lệnh `kiro` vào `/usr/local/bin`. Kiểm tra:

```bash
kiro --version
# Ví dụ: Kiro CLI 2.3.1 (build abc1234)
```

**Cài thủ công:** Nếu bạn không muốn pipe curl vào shell, tải binary từ [kiro.dev/cli](https://kiro.dev/cli).

---

## 3. Xác thực: AWS Builder ID

Cả IDE và CLI đều yêu cầu **AWS Builder ID** — giải pháp đăng nhập một lần của Amazon cho công cụ developer. Nó miễn phí và tách biệt với tài khoản AWS root của bạn.

### Qua IDE

1. Khởi chạy Kiro IDE
2. Nhấn **Sign in with Builder ID** trên màn hình chào
3. Trình duyệt mở ra — hoàn tất quy trình đăng nhập
4. Bạn sẽ được chuyển hướng lại IDE tự động

### Qua CLI

```bash
kiro auth login
```

Lệnh này mở trình duyệt. Hoàn tất quy trình, CLI lưu session token cục bộ.

**Xác minh xác thực:**

```bash
kiro auth whoami
# Ví dụ: Logged in as user@example.com (Builder ID: amzn1.account.xxxxx)
```

### Token tạm thời / Offline

Nếu bạn ở trên máy chủ không có giao diện (CI/CD, SSH), bạn có thể tạo session token:

```bash
kiro auth token --output env
# Đặt KIRO_SESSION_TOKEN trong môi trường của bạn
```

Token này hết hạn sau một khoảng thời gian cấu hình được. Cho CI/CD pipelines, bạn thường tạo lại token mỗi lần chạy.

---

## 4. Steering Files: Dạy Kiro Cách Bạn Code

Steering files là cơ chế của Kiro để cấu hình AI theo dự án. Chúng nói cho agent biết về tiêu chuẩn code, quyết định kiến trúc, sở thích kiểm thử, và quy tắc bảo mật của bạn.

### Tạo steering file

Trong thư mục gốc dự án, tạo `.kiro/steering.md`:

```bash
mkdir -p .kiro
```

Đây là ví dụ thực tế cho dự án Node.js/TypeScript:

```markdown
# .kiro/steering.md

## Tech Stack
- Runtime: Node.js 22 LTS
- Ngôn ngữ: TypeScript 5.x strict mode
- Framework: Hono.js (backend), React 19 với Vite (frontend)
- Database: PostgreSQL 16 qua Drizzle ORM
- Testing: Vitest (unit), Playwright (E2E)

## Code Standards
- Sử dụng named exports, không dùng default exports
- Mọi function phải có TypeScript return types
- Xử lý lỗi: dùng Result/Option pattern, không try/catch
- Độ dài dòng tối đa: 100 ký tự
- Imports: nhóm theo external/internal, sắp xếp alphabet

## Architecture Rules
- Backend theo clean architecture: routes → services → repositories
- Frontend theo cấu trúc feature-based folder
- API responses theo JSend specification
- Mọi truy vấn database phải dùng parameterized statements

## Testing Requirements
- Tối thiểu 80% line coverage cho code mới
- Mọi API endpoint cần integration tests
- Mock external services trong unit tests
- E2E tests chỉ cho critical user journeys (login, checkout, search)

## Security Constraints
- Không bao giờ log password, token, hoặc PII
- Mọi input người dùng phải được xác thực với Zod schemas
- Rate limiting bắt buộc trên tất cả public endpoints
- CORS: giới hạn cho known origins
```

### Global vs. Project steering

Kiro tải **cả hai** cấp độ:

| File | Phạm vi | Ưu tiên |
|------|---------|---------|
| `~/.kiro/steering.md` | Tất cả dự án | Thấp hơn (nền) |
| `.kiro/steering.md` | Dự án hiện tại | Cao hơn (ghi đè) |

Global steering hữu ích cho các quy ước chung bạn muốn áp dụng mọi nơi. Project steering có thể ghi đè các phần cụ thể.

### Tải lại steering files

Steering files được đọc mới khi bắt đầu mỗi phiên làm việc. Thay đổi có hiệu lực ngay khi bạn bắt đầu chat hoặc task mới. Không có cache để xóa.

---

## 5. Kết nối MCP Server Đầu Tiên

Kiro hỗ trợ MCP (Model Context Protocol) một cách tự nhiên. Trong quá trình tạo spec và thực thi task, agent có thể gọi các công cụ MCP bên ngoài.

### Qua IDE (không cần cấu hình)

1. Mở tab **Powers** ở thanh bên trái
2. Duyệt hoặc tìm MCP server (ví dụ: "GitHub", "Figma", "Context7")
3. Nhấn **Add** — làm theo luồng xác thực nếu cần
4. Server sẽ hoạt động cho tất cả các phiên sau

### Qua CLI (`kiro.json`)

Thêm MCP servers trong `.kiro/kiro.json` của dự án:

```json
{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_TOKEN": "${GITHUB_TOKEN}"
      }
    }
  }
}
}

**Luôn dùng biến môi trường cho token**, không bao giờ hardcode secrets trong file JSON.

### Qua CLI (`~/.kiro/kiro.json`)

MCP servers toàn cục đặt trong thư mục home:

```json
{
  "mcpServers": {
    "context7": {
      "command": "npx",
      "args": ["-y", "context7-mcp"]
    }
  }
}
```

Global servers có sẵn trong mọi dự án. Project-level servers được merge lên trên.

### Nên bắt đầu với MCP server nào?

| Server | Tại sao nên dùng đầu tiên | Token cần |
|--------|---------------------------|-----------|
| **GitHub** | Quản lý issue, tạo PR, code review | GitHub PAT (read-only khi bắt đầu) |
| **Context7** | Tài liệu thư viện cập nhật (không bị stale training data) | Không cần (miễn phí) |
| **Firecrawl** | Web scraping, lấy tài liệu | API key (có free tier) |

---

## 6. Phiên Kiro Đầu Tiên

Mở bất kỳ dự án nào trong Kiro IDE và thử prompt spec-driven đầu tiên của bạn:

**Prompt:** "Thêm health check endpoint cho API"

Kiro sẽ:
1. Tạo spec — bạn xem và phê duyệt
2. Tạo task plan — bạn thấy dependency graph
3. Implement — agent viết thay đổi thực tế vào file của bạn
4. Chạy tests — nếu dự án của bạn có test framework
5. Hỏi feedback — xem xét trước khi hoàn thành

Thử Vibe Mode trước cho các thay đổi nhỏ, sau đó chuyển sang Spec Mode cho tính năng mới.

---

## 7. Ví dụ CLI Workflow

CLI mạnh mẽ cho tự động hóa, đặc biệt trong CI/CD pipelines. Đây là workflow autofix thực tế:

```bash
# Trong CI config sau test failure
git checkout -b fix/ci-failure
kiro --print "Xem CI logs mới nhất, tìm test bị lỗi, và sửa root cause trong source code"
git add -A
git commit -m "fix: resolve CI test failure"
git push origin fix/ci-failure
gh pr create --title "fix: resolve CI test failure" --body "Automated fix via Kiro CLI"
```

Cờ `--print` xuất phản hồi của agent ra stdout mà không mở phiên tương tác — hoàn hảo cho headless automation.

---

## Khắc phục sự cố thường gặp

| Vấn đề | Nguyên nhân | Cách khắc phục |
|--------|-------------|----------------|
| `kiro: command not found` | CLI không trong PATH | Cài lại hoặc thêm `/usr/local/bin` vào PATH |
| `Auth token expired` | Session Builder ID hết hạn | Chạy `kiro auth login` lại |
| MCP server không phản hồi | Lỗi cache NPX | Xóa cache: `npx clear-npx-cache` |
| IDE không khởi động | Xung đột extension | Khởi chạy với `--disable-extensions` |
| Steering file bị bỏ qua | Sai đường dẫn | Kiểm tra `.kiro/steering.md` tồn tại |
| Tạo spec chậm | Dự án lớn | Tăng độ cụ thể của steering file |

---

## Tiếp Theo

Với Kiro đã được cài đặt và cấu hình, bạn sẵn sàng cho Day 2: **Spec-Driven Development Workflow trong thực tế** — nơi chúng ta sẽ xây dựng một tính năng thực tế từ prompt đến pull request sử dụng specs, xem cách tinh chỉnh yêu cầu, và đi qua quy trình phê duyệt chi tiết.

---

*Series: Practical Kiro — Môi trường phát triển Agentic của AWS. Day 1: Cài đặt & Cấu hình. Day 2: Spec-Driven Development → sắp tới.*
