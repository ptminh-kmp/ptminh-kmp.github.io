---
lang: vi
title: "PostgreSQL MCP Server: Nói Chuyện Với Database Bằng Natural Language"
description: "Hướng dẫn PostgreSQL MCP Server — cho AI agent query database bằng natural language. Inspect schemas, chạy SELECT, phân tích data, xây dashboard. Cài đặt với Docker (postgres-mcp). Cẩn thận token explosion với large schemas."
published: 2026-05-04
category: AI
tags: ["MCP", "PostgreSQL", "Database", "SQL", "Claude Code", "AI Agents", "Developer Tools", "Tutorial", "Data"]
author: minhpt
mermaid: false
---

AI agent có thể viết SQL hoàn hảo. Nhưng nó không connect được database. Bạn copy-paste query, nó phân tích, bạn copy-paste kết quả lại. Back-and-forth này tốn thời gian và ngắt flow.

**PostgreSQL MCP Server** giải quyết bằng cách cho agent direct, read-only database access. Nó có thể inspect schemas, chạy SELECT queries, phân tích data patterns, và suggest optimizations — tất cả qua natural language.

---

## Cài Đặt

### CrystalDBA/postgres-mcp (Docker, Khuyến nghị)

```bash
claude mcp add postgres \
  --command docker \
  --args "run -i --rm -e DATABASE_URL postgres-mcp" \
  --env DATABASE_URL="postgresql://user:password@localhost:5432/mydb"
```

### Official MCP Server (npx, không Docker)

```bash
claude mcp add postgres \
  --env DATABASE_URL="postgresql://user:password@localhost:5432/mydb" \
  -- npx -y @modelcontextprotocol/server-postgres
```

###  Neon (Serverless PostgreSQL)

```bash
claude mcp add neon \
  --transport http \
  neon https://mcp.neon.tech/YOUR_NEON_API_KEY/v1/mcp
```

---

## Tools Overview

| Tool | Chức năng | Ví dụ |
|---|---|---|
| **query** | Chạy SELECT | "Top 10 khách hàng theo doanh thu" |
| **list_tables** | List tất cả tables | "Có tables nào trong public schema?" |
| **describe_table** | Show columns, types, constraints | "Mô tả bảng orders" |
| **get_schema** | Full database schema | "Cho xem toàn bộ cấu trúc database" |

---

## Security: Read-Only User

Đây là security consideration quan trọng nhất của database MCP:

### Tạo read-only user trước

```sql
CREATE USER mcp_reader WITH PASSWORD 'secure' LOGIN;
GRANT pg_read_all_data TO mcp_reader;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO mcp_reader;
```

### Không bao giờ dùng admin user
```bash
# ❌ Sai — full write access
DATABASE_URL="postgresql://admin:super_secret@prod-db:5432/production"

# ✅ Đúng — read-only
DATABASE_URL="postgresql://mcp_reader:secure@localhost:5432/mydb?sslmode=require"
```

| Measure | Why |
|---|---|
| **Read-only user** | Ngăn accidental writes, truncation, drops |
| **SSL mode required** | Mã hóa data in transit |
| **Statement timeout** | `SET statement_timeout = '30s'` — ngăn runaway queries |

---

## Token Cost Warning

PostgreSQL MCP có vấn đề: **token explosion từ large schemas**.

| Scenario | Token Cost |
|---|---|
| Query 3-4 joins | 500 - 2,000 tokens |
| List 20 tables | 1,000 - 3,000 tokens |
| Describe wide table (30+ columns) | 3,000 - 8,000 tokens |
| Full schema (50+ tables) | 10,000 - 50,000+ tokens ⚠️ |

**Mitigations:** Chỉ describe tables cần thiết, dùng `describe_table orders` thay vì `get_schema`, connect tới views-only schema nếu có thể.

---

## Workflows Thực Tế

### Workflow 1: Ad-Hoc Analytics

```bash
$ claude "MRR trend 6 tháng gần đây?"

Agent:
  1. Inspect: subscriptions, payments tables
  2. Chạy query với date_trunc, GROUP BY
  3. Trả về: trend 6 tháng kèm % tăng trưởng
```

### Workflow 2: Schema Understanding

```bash
$ claude "Cần xây API endpoint cho user profiles. Database có gì?"

Agent:
  1. List_tables → users, profiles, addresses
  2. Describe từng table
  3. "Data model dùng 1:1 giữa users và profiles.
     Tôi sẽ gen endpoint với joins chính xác."
```

### Workflow 3: Data Validation

```bash
$ claude "Vừa chạy schema migration. Verify data integrity."

Agent:
  So sánh row counts, check foreign keys, validate null percentages
  → "Migration clean. 15,342 users migrated. 0 orphaned profiles."
```

---

## Tổng Kết

PostgreSQL MCP Server biến database từ tool riêng thành extension của bộ não AI agent. Nó inspect schemas, phân tích data, validate migrations, suggest optimizations — qua natural language.

**Nguyên tắc vàng: tạo read-only database user riêng cho MCP.** Agent phân tích được mọi thứ nhưng không sửa được gì.

---

*Series: Practical MCP Servers for Developers — 2026 Edition. Day 5 of 6.*
