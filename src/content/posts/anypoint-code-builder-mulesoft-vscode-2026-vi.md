---
lang: vi
title: "MuleSoft Anypoint Code Builder 2026: Hướng Dẫn Xây Dựng Integration Trong VS Code"
description: "Hướng dẫn chi tiết về Anypoint Code Builder — IDE thế hệ mới của MuleSoft trên VS Code. Bao gồm cài đặt, DataWeave mapping, debug, deploy, và các tính năng mới nhất tháng 2/2026."
published: 2026-04-27
category: Tutorial
tags: ["MuleSoft", "Anypoint Code Builder", "VS Code", "Integration", "DataWeave", "API-Led Connectivity", "Hướng dẫn"]
author: minhpt
mermaid: false
---

Nếu bạn đã từng xây dựng integration với MuleSoft, bạn biết Anypoint Studio. IDE dựa trên Eclipse đã là tiêu chuẩn trong nhiều năm — mạnh mẽ, nhưng đã cũ. Khởi động chậm, hệ sinh thái extension hạn chế, và giao diện gần như không thay đổi từ 2015.

**Anypoint Code Builder (ACB)** ra đời. Ra mắt năm 2024 và hiện đã có các bản cập nhật hàng tháng, ACB là IDE thế hệ mới của MuleSoft dựa trên **Visual Studio Code**. Nó mang đến các tính năng IDE hiện đại, phát triển có hỗ trợ AI, và workflow sạch hơn cho việc phát triển integration MuleSoft.

Bài viết này hướng dẫn đầy đủ: cài đặt, dự án đầu tiên, DataWeave mapping, debug, deploy, và những gì mới trong bản phát hành tháng 2/2026.

## Anypoint Code Builder là gì?

Anypoint Code Builder là IDE chính thức của MuleSoft để xây dựng integrations, APIs, và automations trên Anypoint Platform. Khác biệt chính so với Anypoint Studio:

| Tính năng | Anypoint Studio (Classic) | Anypoint Code Builder |
|-----------|--------------------------|----------------------|
| **Nền tảng** | Eclipse RCP | VS Code |
| **Khởi động** | 60-120 giây | 5-10 giây |
| **Extensions** | Chỉ Mule | Toàn bộ VS Code marketplace |
| **AI assistant** | Không có | MuleSoft Vibes (tích hợp sẵn) |
| **DataWeave** | Editor riêng | Inline + graphical mapping |
| **Git** | Cơ bản | Native VS Code Git |
| **Multi-root workspaces** | Không | Có |
| **Cập nhật** | Hàng quý | Hàng tháng |

## Cài Đặt

### Bước 1: Cài Extension Pack

Mở VS Code, Extensions (`Ctrl+Shift+X`), tìm **"Anypoint Code Builder"** hoặc **"MuleSoft"**. Cài pack chính thức từ Salesforce:

```bash
code --install-extension salesforce.mule-dx-pack
```

Pack bao gồm:
- `mule-dx-pack` — Core Mule (XML editors, canvas, debugger)
- `mule-dx-data-weave-client` — DataWeave language support
- `mule-dx-api-designer` — RAML và OAS API spec editor
- `mule-dx-deploy` — Deploy một click lên CloudHub, RTF, hoặc on-prem
- `mule-dx-vibes` — AI assistant MuleSoft Vibes

### Bước 2: Cấu hình Java và Mule Runtime

Sau khi cài, ACB sẽ yêu cầu cấu hình:

```
1. Command Palette (Ctrl+Shift+P)
2. Chạy: "Mule: Set Java Home"
3. Trỏ đến JDK 17+ (ví dụ: /usr/lib/jvm/java-17-openjdk)
4. Chạy: "Mule: Set Runtime Home"
5. Trỏ đến thư mục Mule 4.6+ runtime
```

### Bước 3: Đăng nhập Anypoint Platform

```bash
Command Palette → "Mule: Login to Anypoint Platform"
```

Điều này kết nối ACB với Exchange, Design Center, Monitoring, và Visualizer.

## Tạo Dự Án Integration Đầu Tiên

### Canvas View vs. Code View

ACB cung cấp hai cách xây dựng flow:

**Canvas View** — Kéo-thả connectors, transformers, routers. Cấu hình component trực tiếp trên canvas.

**Code View** — XML thuần với autocomplete, validation real-time, và code snippets.

Chuyển đổi giữa hai chế độ bằng một click. Thay đổi ở view nào cũng được phản ánh ở view kia.

### Xây Dựng Flow HTTP → Database

Ví dụ thực tế — nhận HTTP POST, transform JSON, insert vào database:

**DataWeave Transformation:**

```dataweave
%dw 2.0
output application/json
---
{
  "fullName": payload.firstName ++ " " ++ payload.lastName,
  "email": payload.email as String,
  "createdAt": now() as String {format: "yyyy-MM-dd'T'HH:mm:ssZ"},
  "source": "ACB-via-HTTP"
}
```

**Chạy local:**

```
1. Run and Debug (Ctrl+Shift+D)
2. Chọn "Launch Mule Application"
3. F5 để chạy
4. Kiểm tra: curl -X POST http://localhost:8081/create -H "Content-Type: application/json" -d '{"firstName":"John","lastName":"Doe"}'
```

## DataWeave Trong ACB

DataWeave trên ACB là một nâng cấp đáng kể so với Studio:

### Inline Preview

Khi chỉnh sửa DataWeave, ACB hiển thị live preview:
- **Input tab:** Dán sample payload
- **Output tab:** Kết quả transformation cập nhật real-time
- **Warnings:** Type mismatch, null-safety issues
- **Performance hints:** Độ phức tạp ước tính cho payload lớn

### Graphical DataWeave Mapping (Mới Tháng 2/2026)

Kéo-thả source fields sang target fields, ACB tự động sinh DataWeave expression:

```
Source (JSON):                      Target (CSV):
┌─────────────────────┐            ┌─────────────────────┐
│ firstName ──────────┼───────────▶│ name                 │
│ lastName  ──────────┼───++──┘    │                      │
│ email     ──────────┼───────────▶│ email                │
│ role      ──────────┼───────────▶│ role                 │
└─────────────────────┘            └─────────────────────┘
```

## Debugging

ACB cung cấp:

- **Breakpoints** trong cả XML và DataWeave editor
- **Conditional breakpoints** — chỉ dừng khi điều kiện thỏa
- **Variables panel** — hiển thị Mule message (payload, attributes, variables)
- **Call stack** — flow execution path với XML line numbers
- **Watch expressions** — đánh giá DataWeave expression on-the-fly
- **Inline values** — hiển thị giá trị biến trực tiếp trong XML editor

## Deploy

### Lên CloudHub (Dễ nhất)

```
1. Command Palette → "Mule: Deploy to CloudHub"
2. Chọn môi trường (DEV/QA/PROD)
3. Cấu hình: app name, region, vCore, workers
4. Click Deploy
```

### Export cho CI/CD

```
1. Command Palette → "Mule: Export Deployable Archive"
2. File .jar được tạo trong target/
3. Dùng pipeline: mvn clean package -DskipTests
```

ACB tạo Maven project chuẩn — tương thích với GitHub Actions, Jenkins, GitLab CI.

## Những Gì Mới Trong Tháng 2/2026

1. **Unified Workspaces** — Import workspace Studio trực tiếp, không duplication. Hỗ trợ multi-root workspaces.
2. **Modernized Canvas** — Giao diện mới, fluid hơn, ít clutter. Context menus được filter theo project/file.
3. **Custom Metadata Editor** — Định nghĩa input/output schema trực quan
4. **Graphical DataWeave Mapping** — Kéo-thả field mapping, tự sinh DW
5. **Simplified Error Handling** — Errors gộp vào một view, dễ scan và action
6. **MuleSoft Vibes AI** — "Tạo HTTP endpoint nhận order, validate, insert vào Salesforce" → sinh full XML flow

## MuleSoft Vibes (AI Assistant)

ACB tích hợp AI assistant được train trên toàn bộ tài liệu MuleSoft:

- **Natural language → flow:** Mô tả bằng tiếng Anh, nhận code
- **DataWeave generation:** "Transform Salesforce Account thành CSV row"
- **Error resolution:** Paste lỗi → Vibes đề xuất fix
- **Documentation lookup:** "Cấu hình OAuth 2.0 cho Salesforce connector thế nào?"

## So Sánh: ACB vs Anypoint Studio

| Tiêu chí | Studio | ACB |
|-----------|--------|-----|
| **Hiệu năng** | Nặng, 60-120s startup | Nhẹ, 5-10s startup |
| **Extensions** | Chỉ Mule | Full VS Code marketplace + Mule |
| **AI** | Không | MuleSoft Vibes |
| **DataWeave** | Tab riêng, test thủ công | Inline preview + graphical mapping |
| **Debug** | Cơ bản | Inline values, conditional breakpoints |
| **Git** | EGit | Native VS Code Git |
| **Multi-root** | Không | Có |
| **Cập nhật** | Hàng quý | Hàng tháng |

## Tips cho Studio Veteran

- **Palette giống hệt** — components giống Studio
- **Phím tắt khác** — cấu hình keybindings.json để match Studio shortcuts
- **DataWeave giống hệt** — không thay đổi syntax
- **Exchange tốt hơn** — import shared assets từ activity bar

## Kết Luận

Anypoint Code Builder không chỉ là "Anypoint Studio trong VS Code." Nó là một cải tiến thực sự ở mọi khía cạnh: tốc độ, tính năng, trải nghiệm debug, và khả năng kết nối hệ sinh thái.

Đối với các MuleSoft developer — đặc biệt là những người đã gắn bó nhiều năm — ACB là bản nâng cấp đáng giá. Bản phát hành tháng 2/2026 đã thêm đủ độ trau chuốt để không có lý do gì để không chuyển đổi.

Đường cong học tập là tối thiểu nếu bạn biết Studio. Lợi ích năng suất là ngay lập tức. Và với các bản cập nhật hàng tháng, nó chỉ ngày càng tốt hơn.

---

*Tuyên bố: Tác giả có 8+ năm kinh nghiệm với MuleSoft integration. Hướng dẫn này dựa trên trải nghiệm thực tế với Anypoint Code Builder đến bản tháng 2/2026.*
