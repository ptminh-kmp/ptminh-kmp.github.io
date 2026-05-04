---
lang: vi
title: "Firecrawl MCP Server: Web Scraping & Search Cho AI Coding Agent"
description: "Hướng dẫn toàn diện Firecrawl MCP (110K★ GitHub). Biến bất kỳ website nào thành dữ liệu sạch cho LLM. Cài đặt chi tiết, 13+ tools gồm scrape, search, crawl, map, deep research. Ví dụ thực tế: đọc docs, nghiên cứu đối thủ, xây RAG knowledge base."
published: 2026-05-04
category: AI
tags: ["MCP", "Firecrawl", "Web Scraping", "Claude Code", "AI Agents", "Developer Tools", "Tutorial", "RAG"]
author: minhpt
mermaid: false
---

AI agent có thể code hoàn hảo nhưng không đọc được trang web — như đầu bếp nấu giỏi nhưng không order được nguyên liệu. **Firecrawl MCP Server** giải quyết vấn đề này: nó cho AI agent khả năng scrape, search, và xử lý bất kỳ website nào thành dữ liệu có cấu trúc.

Với 110K+ GitHub stars, Firecrawl là một trong những MCP server được triển khai rộng rãi nhất trong production. Nó chạy cho mọi thứ từ documentation scraper tự động đến competitive research agent.

---

## Firecrawl MCP Là Gì?

Firecrawl là nền tảng web scraping mã nguồn mở dành riêng cho AI/LLM consumption. MCP server của nó expose 13+ tools cho phép bất kỳ MCP-compatible AI client nào:

- **Scrape** URL thành markdown sạch (bỏ quảng cáo, nav, clutter)
- **Search** web với full page content
- **Crawl** toàn bộ website theo link structure
- **Map** architecture của website (khám phá tất cả paths)
- **Deep research** với autonomous agent tổng hợp nhiều nguồn
- **Tương tác trang** — click buttons, điền form, điều hướng

---

## Cài Đặt

### Bước 1: Lấy API Key

1. Đăng ký tại [firecrawl.dev](https://www.firecrawl.dev)
2. Lấy API key từ dashboard: `https://www.firecrawl.dev/app/api-keys`

Firecrawl có free tier (500 pages/tháng) — đủ cho personal use.

### Bước 2: Cài đặt

**Claude Code (npx):**
```bash
claude mcp add firecrawl \
  --env FIRECRAWL_API_KEY=fc-YOUR_API_KEY \
  -- npx -y firecrawl-mcp
```

**Remote URL (đơn giản nhất — không cần local process):**
```bash
claude mcp add firecrawl \
  --transport http \
  firecrawl https://mcp.firecrawl.dev/YOUR_API_KEY/v2/mcp
```

**Cursor (`.cursor/mcp.json`):**
```json
{
  "mcpServers": {
    "firecrawl-mcp": {
      "command": "npx",
      "args": ["-y", "firecrawl-mcp"],
      "env": {
        "FIRECRAWL_API_KEY": "fc-YOUR_API_KEY"
      }
    }
  }
}
```

### Bước 3: Verify

```bash
# Trong Claude Code
claude "Scrape https://example.com và tóm tắt"
# Hoặc search
claude "Search thông tin về Flutter 4.0 mới nhất"
```

---

## 13+ Tools

| Tool | Chức năng | Use Case |
|---|---|---|
| **firecrawl_scrape** | Scrape URL thành markdown | Tra cứu docs nhanh |
| **firecrawl_batch_scrape** | Scrape nhiều URL cùng lúc | Research nhiều trang |
| **firecrawl_crawl** | Crawl toàn bộ website | Documentation sites |
| **firecrawl_search** | Web search với full content | Tìm thông tin mới |
| **firecrawl_map** | Khám phá tất cả URLs trên site | Site architecture |
| **firecrawl_deep_research** | Research đa nguồn tự động | Competitive analysis |
| **firecrawl_extract** | Trích xuất dữ liệu có cấu trúc | Bảng giá, thông số |
| **firecrawl_click** | Click elements | Login flows |
| **firecrawl_screenshot** | Chụp screenshot | Xác minh trực quan |
| **firecrawl_session** | Quản lý browser sessions | Persistent auth |

---

## Workflows Thực Tế

### Workflow 1: Documentation Scraper

```bash
$ claude "Tôi cần dùng Stripe Checkout API.
   Scrape docs và tạo usage example."

Agent:
  1. Scrape docs.stripe.com/api/checkout/sessions
  2. Scrape docs.stripe.com/payments/checkout
  3. Tổng hợp: "Cách dùng Stripe Checkout:
     - Tạo session qua /v1/checkout/sessions
     - Required params: line_items, mode, success_url, cancel_url
     - Ví dụ code Node.js: ..."
```

### Workflow 2: Competitive Research

```bash
$ claude "Research 3 alternatives cho Vercel để host Next.js."

Agent:
  1. Search → "Next.js hosting alternatives 2026"
  2. Extract → bảng giá từ top 5 kết quả
  3. Deep research → "So sánh Vercel vs Netlify vs Railway"
  4. Build bảng so sánh:
     | Platform | Price | Next.js | Edge | Speed |
     | Vercel | $20/mo | Native | Yes | 5s |
     | Netlify | $19/mo | Plugin | Yes | 8s |
```

### Workflow 4: Build RAG Knowledge Base

```bash
$ claude "Xây knowledge base từ docs Tailwind CSS."

Agent:
  1. Map → tailwindcss.com/docs → phát hiện 200+ doc pages
  2. Crawl → scrape 200 pages thành markdown
  3. Ghi mỗi page thành file riêng
  4. Sẵn sàng cho vector embedding
```

---

## Firecrawl vs. Các Cách Khác

| Phương pháp | Pros | Cons |
|---|---|---|
| **Firecrawl MCP** | LLM-ready, tương tác browser, deep research | Cần API key, rate limits |
| **Paste URL thủ công** | Free, không setup | Chậm, ngắt flow |
| **curl/wget** | Free, scriptable | Raw HTML, không LLM-optimized |

---

## Self-Hosting

Firecrawl mã nguồn mở, có thể self-host qua Docker:

```bash
git clone https://github.com/firecrawl/firecrawl
cd firecrawl && docker compose up
```

Config MCP server trỏ tới self-hosted instance:
```json
{
  "mcpServers": {
    "firecrawl-selfhosted": {
      "command": "npx",
      "args": ["-y", "firecrawl-mcp"],
      "env": {
        "FIRECRAWL_API_KEY": "fc-selfhosted-key",
        "FIRECRAWL_BASE_URL": "http://localhost:3002"
      }
    }
  }
}
```

---

## Tổng Kết

Firecrawl MCP là web-reader thiết yếu cho AI agents. Nó biến web từ "bạn phải copy-paste" thành "để tôi fetch và analyze cho bạn."

**Cài nó thứ hai — ngay sau GitHub MCP.** Với cả hai, agent có thể đọc codebase (GitHub MCP) và cả internet (Firecrawl MCP). Mọi thứ khác là additive.

Bài tiếp theo: **Context7 MCP** — fix stale LLM training data bằng cách inject docs mới nhất.

---

*Series: Practical MCP Servers for Developers — 2026 Edition. Day 2 of 6.*
