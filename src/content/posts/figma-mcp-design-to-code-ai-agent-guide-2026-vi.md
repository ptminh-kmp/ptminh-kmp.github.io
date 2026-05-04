---
lang: vi
title: "Figma MCP Server: Từ Design Đến Code Với AI Agent — Hướng Dẫn Chi Tiết"
description: "Hướng dẫn Figma MCP Server chính thức. Kết nối AI agent trực tiếp với Figma design files — đọc layer structures, auto-layout, variants, design tokens, và generate production code. Cầu nối giữa design và development giờ đã tự động."
published: 2026-05-04
category: AI
tags: ["MCP", "Figma", "Design-to-Code", "Claude Code", "AI Agents", "Developer Tools", "Tutorial", "Frontend"]
author: minhpt
mermaid: false
---

Design-to-code handoff luôn là phần đau đớn nhất của frontend development. Bạn nhìn Figma file, extract thủ công colors, text styles, spacing, Auto Layout rules, rồi translate thành code. Tốn thời gian, dễ sai, và không ai thích.

**Figma MCP Server chính thức** thay đổi điều này. Nó cho AI agent access trực tiếp vào design files — layer structure, Auto Layout, variants, design tokens, component properties — và tự động generate production code từ design data thực tế.

---

## Cài Đặt

### Remote OAuth (Đơn giản nhất)

```bash
claude mcp add figma \
  --transport http \
  figma-remote-mcp https://mcp.figma.com/mcp
```

Sau đó restart Claude Code, chạy `/mcp`, chọn `figma-remote-mcp` và OAuth qua browser.

### Personal Access Token (Local)

Tạo Figma PAT tại `Settings → Account → Personal Access Tokens`:

```bash
claude mcp add figma \
  --env FIGMA_ACCESS_TOKEN=figd_your_token \
  -- npx -y figma-mcp-server
```

### Cursor

```json
{
  "mcpServers": {
    "figma": {
      "command": "npx",
      "args": ["-y", "figma-mcp-server"],
      "env": {
        "FIGMA_ACCESS_TOKEN": "figd_your_token_here"
      }
    }
  }
}
```

---

## Tools Overview

| Tool | Chức năng |
|---|---|
| **figma_get_file** | File metadata và page list |
| **figma_get_page** | Tất cả frames và components trên page |
| **figma_get_node** | Chi tiết node cụ thể (layer, frame, component) |
| **figma_get_styles** | Tất cả design styles (colors, text, effects) |
| **figma_get_component** | Component details và instances |
| **figma_search_nodes** | Search nodes theo tên |
| **figma_get_image** | Export URLs cho node images |

---

## Workflows Thực Tế

### Workflow 1: Design-to-Code

```bash
$ claude "Login screen mới trong Figma file 'Sprint-42'.
   Generate React component."

Agent:
  1. Đọc file, tìm "Login Screen" page
  2. Lấy frames: login-container, email-input, submit-button
  3. Extract design tokens: colors, typography, spacing
  4. Đọc Auto Layout rules
  5. Generate React component với exact styles
```

### Workflow 2: Design Token Extraction

```bash
$ claude "Extract tất cả design tokens và gen Tailwind config."

Agent:
  1. figma_get_styles → đọc colors, typography, effects
  2. figma_get_component → đọc variants
  3. Gen tailwind.config.ts với tokens chính xác
```

### Workflow 3: Component Variant Coverage

```bash
$ claude "Check Button component có đủ required states không?"

Agent:
  So sánh Figma variants (default, hover, active, disabled, loading)
  với codebase hiện tại
  → "Missing: hover, active, loading. Generating code cho 3 states."
```

---

## Token Costs

| Operation | Token Cost |
|---|---|
| Get file info (5 pages) | 1,000 - 3,000 |
| Get page details (1 complex page) | 5,000 - 15,000 |
| Get single node | 500 - 2,000 |
| Get all styles | 3,000 - 10,000 |
| Full screen gen | 10,000 - 40,000 |

**Mẹo giảm cost:** Target specific nodes, extract styles 1 lần, dùng `figma_get_node` với specific IDs.

---

## Bảo Mật

- **Scoped tokens**: PAT có thể scope tới specific files
- **OAuth an toàn hơn**: Dùng short-lived tokens thay vì permanent PATs
- **Read-only**: Figma MCP chỉ đọc, không modify files
- **File keys nhạy cảm**: Giữ Figma file key khỏi public code

---

## Tổng Kết

Figma MCP Server là cầu nối design-development mà frontend teams chờ đợi. Nó biến Dev Mode — vốn đã mạnh — thành thứ AI agent đọc và hành động tự động.

**Pipeline design-to-code:** Figma MCP (đọc design) → Context7 (docs framework mới) → Agent (gen code) → GitHub MCP (tạo PR).

---

*Series: Practical MCP Servers for Developers — 2026 Edition. Day 6 of 6 — Series Complete.*
