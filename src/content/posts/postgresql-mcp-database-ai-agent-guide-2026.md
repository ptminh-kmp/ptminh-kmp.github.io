---
lang: en
title: "PostgreSQL MCP Server: Talk to Your Database Through Natural Language"
description: "Complete guide to PostgreSQL MCP Server — let your AI agent query your database through natural language. Inspect schemas, run SELECT queries, analyze data, and build dashboards. Installation with Docker (postgres-mcp by CrystalDBA) and official MCP server from modelcontextprotocol/servers. Watch out for token explosion with large schemas."
published: 2026-05-04
category: AI
tags: ["MCP", "PostgreSQL", "Database", "SQL", "Claude Code", "AI Agents", "Developer Tools", "Tutorial", "Data"]
author: minhpt
mermaid: false
---

Your AI agent can write perfect SQL. But it can't connect to your database. You copy-paste queries, it analyzes results, you copy-paste back. This back-and-forth wastes time and breaks the agent's flow.

**PostgreSQL MCP Server** solves this by giving your agent direct, read-only database access. It can inspect schemas, run SELECT queries, analyze data patterns, and even suggest optimizations — all through natural language.

---

## What Is PostgreSQL MCP?

There are two popular PostgreSQL MCP implementations:

1. **Official MCP server** from `modelcontextprotocol/servers` — simple, Python-based, maintained by the MCP foundation
2. **CrystalDBA/postgres-mcp** — production-ready, Docker-based, with enhanced security features

Both expose the same core functionality: let your AI agent run SQL queries against a PostgreSQL database through MCP tools.

**Without PostgreSQL MCP:**
```bash
$ claude "How many active users signed up last week?"
  → Agent: "I can't access the database. Can you run this query?"
  ← You: run `SELECT COUNT(*) FROM users WHERE created_at > NOW() - INTERVAL '7 days' AND active = true`
  → Agent: "12,847 users. Would you like to break it down by day?"
  ← You: run another query, paste again...
```

**With PostgreSQL MCP:**
```bash
$ claude "How many active users signed up last week?"

  Agent:
    1. Inspects table schemas (users, subscriptions, activity_logs)
    2. Queries: SELECT COUNT(*) FROM users WHERE created_at > NOW() - INTERVAL '7 days' AND active = true
    3. "12,847 users. Here's the daily breakdown:
       Mon: 1,847 | Tue: 1,934 | Wed: 2,211 | ..."

  You: "Break it down by country"
  Agent: runs another query instantly → returns results
```

---

## Installation

### Method 1: CrystalDBA/postgres-mcp (Docker, Recommended)

This is the most production-ready option with Docker isolation:

```bash
claude mcp add postgres \
  --command docker \
  --args "run -i --rm -e DATABASE_URL postgres-mcp" \
  --env DATABASE_URL="postgresql://user:password@localhost:5432/mydb"
```

**Cursor (`.cursor/mcp.json`):**
```json
{
  "mcpServers": {
    "postgres": {
      "command": "docker",
      "args": [
        "run", "-i", "--rm",
        "-e", "DATABASE_URL",
        "crystaldba/postgres-mcp"
      ],
      "env": {
        "DATABASE_URL": "postgresql://user:password@localhost:5432/mydb"
      }
    }
  }
}
```

### Method 2: Official MCP Server (Node.js/npx)

Lighter-weight, no Docker needed:

```bash
claude mcp add postgres \
  --env DATABASE_URL="postgresql://user:password@localhost:5432/mydb" \
  -- npx -y @modelcontextprotocol/server-postgres
```

### Method 3: Neon (Serverless PostgreSQL)

If you use [Neon](https://neon.tech), they have an official remote MCP:

```bash
claude mcp add neon \
  --transport http \
  neon https://mcp.neon.tech/YOUR_NEON_API_KEY/v1/mcp
```

### Connection String Format

```
postgresql://[user]:[password]@[host]:[port]/[database]?sslmode=require
```

**Security warning:** Always use a **read-only database user**. Never connect with a user that has INSERT, UPDATE, or DELETE privileges. Create a dedicated MCP user:

```sql
CREATE USER mcp_reader WITH PASSWORD 'secure_password';
GRANT CONNECT ON DATABASE mydb TO mcp_reader;
GRANT USAGE ON SCHEMA public TO mcp_reader;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO mcp_reader;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO mcp_reader;
```

---

## Tools Overview

| Tool | What It Does | Example |
|---|---|---|
| **query** | Run a SELECT query | "Show me the top 10 customers by revenue" |
| **list_tables** | List all tables in a schema | "What tables are in the public schema?" |
| **describe_table** | Show column names, types, constraints | "Describe the orders table" |
| **get_schema** | Full database schema | "Show me the full database structure" |

---

## Real-World Workflows

### Workflow 1: Ad-Hoc Analytics

```bash
$ claude "What's our MRR trend for the last 6 months?"

Agent:
  1. Inspects: subscriptions, payments tables
  2. Runs: SELECT date_trunc('month', created_at) as month,
            SUM(CASE WHEN status = 'active' THEN amount ELSE 0 END) as mrr
           FROM subscriptions
           WHERE created_at > NOW() - INTERVAL '6 months'
           GROUP BY 1 ORDER BY 1
  3. Returns: "MRR trend:
     Dec 2025: $42,150
     Jan 2026: $44,820 (+6.3%)
     Feb 2026: $47,300 (+5.5%)
     Mar 2026: $49,110 (+3.8%)
     Apr 2026: $52,440 (+6.8%)
     May 2026: $54,200 (partial month)"
```

### Workflow 2: Schema Understanding for Code Generation

```bash
$ claude "I need to build an API endpoint for user profiles. 
   What does the database look like?"

Agent:
  1. Queries: list_tables → users, profiles, addresses, preferences
  2. Describes: users(id, email, created_at, status)
                profiles(user_id, display_name, avatar_url, bio)
  3. "The data model uses a 1:1 relationship between users and profiles.
     I'll generate the API endpoint with the correct joins."
```

### Workflow 3: Data Validation After Migration

```bash
$ claude "We just ran the schema migration. Verify the data integrity."

Agent:
  1. Compares: row counts before and after
  2. Checks: foreign key constraints, null percentages
  3. Validates: no orphaned records
  4. Reports: "Migration clean. 15,342 users migrated.
     0 orphaned profiles. All foreign keys valid."
```

### Workflow 4: Performance Analysis

```bash
$ claude "Find slow queries and suggest indexes"

Agent:
  1. Queries pg_stat_activity and pg_stat_statements
  2. Analyzes: "The `orders` table query filters by `status`
     but has no index on that column. Also, `user_email` lookups
     are doing sequential scans."
  3. Suggests: "Create these indexes:
     - CREATE INDEX idx_orders_status ON orders(status);
     - CREATE INDEX idx_users_email ON users(email);"
```

---

## Security: The Read-Only Rule

This is the most critical security consideration of any database MCP:

### ❌ What NOT to do
```bash
# Never! This connects with full write access
DATABASE_URL="postgresql://admin:super_secret@prod-db:5432/production"
```

### ✅ What to do
```bash
# Create a read-only user first
CREATE USER mcp_reader WITH PASSWORD 'secure' LOGIN;
GRANT pg_read_all_data TO mcp_reader;

# Then use it
DATABASE_URL="postgresql://mcp_reader:secure@localhost:5432/mydb?sslmode=require"
```

### Additional Security Measures

| Measure | Why |
|---|---|
| **Read-only user** | Prevents accidental writes, truncation, drops |
| **SSL mode required** | Encrypts data in transit |
| **Dedicated MCP user** | Audit trail — you know which queries came from the agent |
| **Statement timeout** | `SET statement_timeout = '30s'` — prevents runaway queries |
| **Connection pooling** | Use PgBouncer to limit concurrent connections |
| **No production access** | Use a staging or analytics replica, never production primary |

---

## Token Cost Warning

PostgreSQL MCP has a specific problem: **token explosion from large schemas**.

| Scenario | Token Cost |
|---|---|
| Query with 3-4 joins | 500 - 2,000 tokens |
| List 20 tables | 1,000 - 3,000 tokens |
| Describe a wide table (30+ columns) | 3,000 - 8,000 tokens |
| Get full schema (50+ tables) | 10,000 - 50,000+ tokens ⚠️ |

**Mitigations:**
- Only describe tables you need, not the full schema
- Use namespaced schemas to reduce scope
- Filter: `describe_table users` instead of `get_schema`
- Consider a views-only approach: expose views instead of raw tables

---

## PostgreSQL MCP vs. Alternatives

| Approach | Pros | Cons |
|---|---|---|
| **PostgreSQL MCP** | Natural language, live queries, schema-aware | Token-heavy with large schemas |
| **pgAdmin / DBeaver** | Full GUI, visual query builder | Not AI-integrated |
| **SQL CLI (psql)** | Fast, familiar, scriptable | Manual, no AI analysis |
| **BI Tools (Metabase, Superset)** | Dashboards, charts | Heavy setup, overkill for ad-hoc |

---

## Troubleshooting

**"Connection refused"**
- Is PostgreSQL running? `pg_isready`
- Is the connection string correct?
- Network access: is the Docker container on the same network?

**"Permission denied for table"**
- Did you GRANT SELECT to the MCP user?
- Check: `SELECT * FROM information_schema.table_privileges WHERE grantee = 'mcp_reader'`

**"Query timed out"**
- Set `statement_timeout` in the connection string
- The agent might be querying too many tables — be more specific

**"Too many tokens"**
- Use `describe_table users` instead of `get_schema`
- Limit queries to specific schemas
- Connect to a slimmed-down view schema if possible

---

## Summary

PostgreSQL MCP Server turns your database from a separate tool into an extension of your AI agent's brain. It can inspect schemas, analyze data, validate migrations, and suggest optimizations — all through natural language.

**The golden rule: create a read-only database user specifically for MCP.** Your agent can analyze anything but modify nothing.

---

*Series: Practical MCP Servers for Developers — 2026 Edition. Day 5 of 6.*
