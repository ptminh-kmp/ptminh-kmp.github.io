---
title: "Build MCP Server từ Scratch — Day 4: Authentication & Production Hardening"
description: "Bảo mật MCP server cho production. API key authentication, Express middleware, rate limiting, CORS, env validation, graceful shutdown, Docker security."
published: 2026-06-09
pubDate: 2026-06-09T05:00:00.000Z
slug: build-mcp-server-from-scratch-day4-authentication-production-hardening-vi
tags:
  - mcp
  - tutorial
  - authentication
  - security
  - typescript
  - express
  - production
  - rate-limiting
category: ai-agents
lang: vi
series:
  name: "Building an MCP Server from Scratch"
  order: 4
  total: 5
---

Day 3 cho SSE server + Docker. Nhưng hiện tại **ai biết URL cũng connect được** — GitHub token expose cho tất cả.

Production cần:

1. **Authentication** — Chỉ authorized clients mới connect được
2. **Rate limiting** — Chặn abuse, cost spike
3. **CORS** — Kiểm soát origins
4. **Environment validation** — Fail fast khi thiếu config
5. **Graceful shutdown** — Close connections an toàn khi restart

---

## Step 1: Auth Middleware (src/auth.ts)

API key authentication qua HTTP header `X-API-Key`. Dùng built-in `crypto`, không cần package mới.

```typescript
import crypto from "crypto";

export class AuthService {
  private validKeys: Set<string>;

  constructor() {
    const keysFromEnv = process.env.AUTH_KEYS;
    if (keysFromEnv) {
      this.validKeys = new Set(keysFromEnv.split(",").map((k) => k.trim().toLowerCase()));
      console.error(`🔑 ${this.validKeys.size} API key(s) configured`);
    } else {
      // Dev mode: gen key ngẫu nhiên
      const key = crypto.randomBytes(32).toString("hex");
      this.validKeys = new Set([key]);
      console.error(`🔑 Dev key generated:\n   ${key}`);
    }
  }

  validate(apiKey: string | undefined): boolean {
    return !!apiKey && this.validKeys.has(apiKey);
  }

  middleware() {
    return (req: any, res: any, next: any) => {
      const key = req.headers["x-api-key"] as string;
      if (!key) return res.status(401).json({ error: "Missing X-API-Key header" });
      if (!this.validate(key)) return res.status(403).json({ error: "Invalid API key" });
      req.apiKey = key;
      next();
    };
  }
}
```

**Cách hoạt động:**
- `AUTH_KEYS` env var: comma-separated API keys
- Dev mode: auto-gen key 64 ký tự hex
- 401 nếu thiếu header, 403 nếu key sai
- Lưu key vào `req.apiKey` cho rate limiter

---

## Step 2: Rate Limiting (src/rate-limit.ts)

Sliding-window rate limiter — mỗi API key có bucket riêng.

```typescript
export class RateLimiter {
  private buckets = new Map<string, { count: number; windowStart: number }>();
  private maxRequests: number;
  private windowMs: number;

  constructor(maxRequests = 60, windowMs = 60_000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  check(apiKey: string): boolean {
    const now = Date.now();
    const bucket = this.buckets.get(apiKey);
    if (!bucket || now - bucket.windowStart >= this.windowMs) {
      this.buckets.set(apiKey, { count: 1, windowStart: now });
      return true;
    }
    if (bucket.count >= this.maxRequests) return false;
    bucket.count++;
    return true;
  }

  cleanup() {
    const now = Date.now();
    for (const [k, b] of this.buckets) {
      if (now - b.windowStart >= this.windowMs) this.buckets.delete(k);
    }
  }

  middleware() {
    return (req: any, res: any, next: any) => {
      if (!this.check(req.apiKey || "anonymous")) {
        return res.status(429).json({ error: "Too many requests" });
      }
      next();
    };
  }
}
```

**Tại sao cần:**

| Kịch bản | Không rate limit | Có rate limit |
|----------|-----------------|---------------|
| Client độc hại | Unlimited calls → cost spike | Blocked sau 60 req/min |
| Buggy agent loop | `create_issue` mãi mãi | Blocked, dev debug |
| Nhiều clients | Một thằng chiếm hết | Mỗi thằng fair share |

---

## Step 3: CORS (src/cors.ts)

Kiểm soát origins cho browser-based MCP clients.

```typescript
export function corsMiddleware(allowedOrigins: string[] = ["*"]) {
  return (req: any, res: any, next: any) => {
    const origin = req.headers.origin;
    if (allowedOrigins.includes("*")) res.setHeader("Access-Control-Allow-Origin", "*");
    else if (origin && allowedOrigins.includes(origin)) res.setHeader("Access-Control-Allow-Origin", origin);

    if (req.method === "OPTIONS") {
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-API-Key");
      res.status(204).end();
      return;
    }
    next();
  };
}
```

---

## Step 4: Environment Validation (src/env.ts)

Fail fast — validate config ngay khi start.

```typescript
export interface AppConfig {
  port: number; githubToken: string; authKeys: string[];
  rateLimitMax: number; rateLimitWindowMs: number; allowedOrigins: string[]; nodeEnv: string;
}

export function loadConfig(): AppConfig {
  const errors: string[] = [];

  if (!process.env.GITHUB_TOKEN) errors.push("GITHUB_TOKEN is required");
  if (!process.env.AUTH_KEYS && process.env.NODE_ENV === "production") errors.push("AUTH_KEYS required in production");

  const port = parseInt(process.env.PORT || "3001", 10);
  if (isNaN(port) || port <= 0) errors.push("Invalid PORT");

  if (errors.length > 0) {
    console.error("❌ Config errors:"); errors.forEach(e => console.error(`   - ${e}`));
    console.error("\nRequired: GITHUB_TOKEN\nProduction: AUTH_KEYS");
    process.exit(1);
  }

  return {
    port, githubToken: process.env.GITHUB_TOKEN!,
    authKeys: (process.env.AUTH_KEYS || "").split(",").map(s => s.trim()).filter(Boolean),
    rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || "60"),
    rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "60000"),
    allowedOrigins: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(",").map(s => s.trim()) : ["*"],
    nodeEnv: process.env.NODE_ENV || "development",
  };
}
```

---

## Step 5: Updated SSE Server (src/sse-server.ts)

Thêm `configureMiddleware` callback + graceful shutdown.

```typescript
import express from "express";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export interface SSEServerInstance {
  server: import("http").Server;
  shutdown: () => Promise<void>;
  getActiveConnections: () => number;
}

export function createSSEServer(
  mcpServer: McpServer, port: number = 3001,
  configureMiddleware?: (app: express.Application) => void
): SSEServerInstance {
  const app = express();
  if (configureMiddleware) configureMiddleware(app);

  const transports = new Map<string, SSEServerTransport>();

  app.get("/sse", async (req, res) => {
    const transport = new SSEServerTransport("/messages", res);
    transports.set(transport.sessionId, transport);
    res.on("close", () => transports.delete(transport.sessionId));
    try { await mcpServer.connect(transport); }
    catch (e) { console.error(`SSE error: ${e}`); res.status(500).end(); }
  });

  app.post("/messages", express.json(), async (req, res) => {
    const t = transports.get(req.query.sessionId as string);
    if (!t) return res.status(404).json({ error: "Session not found" });
    await t.handlePostMessage(req, res);
  });

  app.get("/health", (req, res) => res.json({ status: "ok", uptime: process.uptime(), activeConnections: transports.size }));

  const httpServer = app.listen(port, () => console.error(`✅ MCP SSE on port ${port}`));

  return {
    server: httpServer,
    shutdown: () => { transports.clear(); return new Promise(r => httpServer.close(() => r())); },
    getActiveConnections: () => transports.size,
  };
}
```

---

## Step 6: Production Entry Point (src/server.ts)

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import express from "express";
import { GitHubClient } from "./github-client.js";
import { createSSEServer } from "./sse-server.js";
import { AuthService } from "./auth.js";
import { RateLimiter } from "./rate-limit.js";
import { corsMiddleware } from "./cors.js";
import { loadConfig } from "./env.js";

const config = loadConfig();
const github = new GitHubClient(config.githubToken);
const auth = new AuthService();
const rateLimiter = new RateLimiter(config.rateLimitMax, config.rateLimitWindowMs);
const GITHUB_API_BASE = "https://api.github.com";
const server = new McpServer({ name: "github-issue-manager", version: "1.0.2" });

function parseLinkHeader(l: string | null): Record<string, string> {
  if (!l) return {};
  const r: Record<string, string> = {};
  l.split(", ").forEach(p => { const m = p.match(/<([^>]+)>;\s*rel="([^"]+)"/); if (m) r[m[2]] = m[1]; });
  return r;
}

async function gf(url: string) {
  return fetch(url, { headers: { Authorization: `Bearer ${config.githubToken}`, Accept: "application/vnd.github+json", "User-Agent": "mcp/1.0" } });
}

// Middleware
const instance = createSSEServer(server, config.port, (app) => {
  app.use(corsMiddleware(config.allowedOrigins));
  app.use(express.json());
  app.use((req, res, next) => { if (req.path !== "/health") auth.middleware()(req, res, next); else next(); });
  app.use((req, res, next) => { if (req.path !== "/health") rateLimiter.middleware()(req, res, next); else next(); });
  setInterval(() => rateLimiter.cleanup(), 300_000);
});

// Tools (7) + Resources (3) + Prompts (3) — same as Day 2
server.tool("list_issues", "List issues", {
  owner: z.string(), repo: z.string(),
  state: z.enum(["open","closed","all"]).default("open"), limit: z.number().min(1).max(100).default(20),
}, async ({ owner, repo, state, limit }) => {
  try {
    const issues = await github.listIssues(owner, repo, state, limit);
    if (!issues.length) return { content: [{ type: "text", text: `No ${state} issues.` }] };
    return { content: [{ type: "text", text: `## Issues\n\n${issues.map((i: any) => `#${i.number}: ${i.title}\n  ${i.html_url}`).join("\n\n")}` }] };
  } catch (e) { return { content: [{ type: "text", text: `Error: ${e}` }], isError: true }; }
});

server.tool("get_issue", "Get issue", {
  owner: z.string(), repo: z.string(), issue_number: z.number().int().positive(),
}, async ({ owner, repo, issue_number }) => {
  try {
    const i = await github.getIssue(owner, repo, issue_number);
    return { content: [{ type: "text", text: `# ${i.title}\n**#${i.number}** | ${i.state}\n${i.html_url}\n---\n${i.body || ""}` }] };
  } catch (e) { return { content: [{ type: "text", text: `Error: ${e}` }], isError: true }; }
});

server.tool("create_issue", "Create issue", {
  owner: z.string(), repo: z.string(), title: z.string().min(1).max(256),
  body: z.string().optional(), labels: z.array(z.string()).optional(), assignees: z.array(z.string()).optional(),
}, async ({ owner, repo, title, body, labels, assignees }) => {
  try {
    const i = await github.createIssue(owner, repo, { title, body, labels, assignees });
    return { content: [{ type: "text", text: `✅ Created #${i.number}: ${i.title}\n${i.html_url}` }] };
  } catch (e) { return { content: [{ type: "text", text: `Error: ${e}` }], isError: true }; }
});

server.tool("update_issue", "Update issue", {
  owner: z.string(), repo: z.string(), issue_number: z.number().int().positive(),
  title: z.string().max(256).optional(), body: z.string().optional(),
  state: z.enum(["open","closed"]).optional(), labels: z.array(z.string()).optional(), assignees: z.array(z.string()).optional(),
}, async ({ owner, repo, issue_number, ...c }) => {
  try {
    const i = await github.updateIssue(owner, repo, issue_number, c);
    return { content: [{ type: "text", text: `✅ Updated #${issue_number}\nState: ${i.state}\n${i.html_url}` }] };
  } catch (e) { return { content: [{ type: "text", text: `Error: ${e}` }], isError: true }; }
});

server.tool("search_issues", "Search issues", {
  query: z.string().min(1), limit: z.number().min(1).max(50).default(10),
}, async ({ query, limit }) => {
  try {
    const r = await github.searchIssues(query, limit);
    if (!r.issues.length) return { content: [{ type: "text", text: `No results.` }] };
    return { content: [{ type: "text", text: `## Results (${r.total_count})\n\n${r.issues.map((i: any) => `#${i.number}: ${i.title}\n  ${i.html_url}`).join("\n\n")}` }] };
  } catch (e) { return { content: [{ type: "text", text: `Error: ${e}` }], isError: true }; }
});

server.tool("list_issues_paginated", "Paginated listing", {
  owner: z.string(), repo: z.string(), state: z.enum(["open","closed","all"]).default("open"),
  page: z.number().int().min(1).default(1), per_page: z.number().int().min(1).max(100).default(30),
  sort: z.enum(["created","updated","comments"]).default("updated"), direction: z.enum(["asc","desc"]).default("desc"),
}, async ({ owner, repo, state, page, per_page, sort, direction }) => {
  try {
    const url = `${GITHUB_API_BASE}/repos/${owner}/${repo}/issues?${new URLSearchParams({ state, page: String(page), per_page: String(per_page), sort, direction })}`;
    const res = await gf(url); const issues: any[] = await res.json() as any[]; const pg = parseLinkHeader(res.headers.get("link"));
    if (!issues.length) return { content: [{ type: "text", text: `No issues page ${page}.` }] };
    let h = `## Issues (page ${page})`;
    if (pg.last) h += ` / ${parseInt(new URL(pg.last).searchParams.get("page") || "1")}`;
    return { content: [{ type: "text", text: `${h}\n\n${issues.map((i: any) => `#${i.number}: ${i.title}\n  ${i.html_url}`).join("\n\n")}` }] };
  } catch (e) { return { content: [{ type: "text", text: `Error: ${e}` }], isError: true }; }
});

server.tool("batch_label_issues", "Batch label", {
  owner: z.string(), repo: z.string(), issue_numbers: z.array(z.number().int().positive()).min(1).max(25), labels: z.array(z.string()).min(1).max(10),
}, async ({ owner, repo, issue_numbers, labels }) => {
  const results: any[] = [];
  for (const n of issue_numbers) { try { await github.updateIssue(owner, repo, n, { labels }); results.push({ n, ok: true }); } catch (e) { results.push({ n, ok: false, err: String(e) }); } }
  return { content: [{ type: "text", text: `## ${labels.join(", ")}\n✅ ${results.filter(r => r.ok).length}/${issue_numbers.length}${results.some(r => !r.ok) ? `\n❌ ${results.filter(r => !r.ok).map(r => `#${r.n}: ${r.err}`).join("\n")}` : ""}` }] };
});

// Resources
server.resource("issue-detail", new ResourceTemplate("issue://{owner}/{repo}/{number}", { list: undefined }), async (uri, { owner, repo, number }) => {
  const i = await github.getIssue(owner as string, repo as string, parseInt(number as string));
  return { contents: [{ uri: uri.href, mimeType: "text/markdown", text: `# ${i.title}\n**Status:** ${i.state === "open" ? "🟢" : "🔴"}\n${i.html_url}\n---\n${i.body || ""}` }] };
});
server.resource("issue-comments", new ResourceTemplate("issue://{owner}/{repo}/{number}/comments", { list: undefined }), async (uri, { owner, repo, number }) => {
  const res = await gf(`${GITHUB_API_BASE}/repos/${owner}/${repo}/issues/${number}/comments`);
  const comments: any[] = await res.json() as any[];
  if (!comments.length) return { contents: [{ uri: uri.href, mimeType: "text/markdown", text: "*No comments*" }] };
  return { contents: [{ uri: uri.href, mimeType: "text/markdown", text: `# Comments\n\n${comments.map((c: any) => `**@${c.user.login}** on ${new Date(c.created_at).toLocaleDateString()}\n\n${c.body}`).join("\n\n")}` }] };
});
server.resource("open-issues", new ResourceTemplate("issue://{owner}/{repo}/open", { list: undefined }), async (uri, { owner, repo }) => {
  const issues = await github.listIssues(owner as string, repo as string, "open");
  if (!issues.length) return { contents: [{ uri: uri.href, mimeType: "text/markdown", text: "✨ No open issues!" }] };
  return { contents: [{ uri: uri.href, mimeType: "text/markdown", text: `# Open Issues (${issues.length})\n\n${issues.map((i: any) => `- [#${i.number}](${i.html_url}): ${i.title}`).join("\n")}` }] };
});

// Prompts
server.prompt("triage-issue", "Triage issue", { owner: z.string(), repo: z.string(), issue_number: z.number() },
  ({ owner, repo, issue_number }) => ({ messages: [{ role: "user", content: { type: "text", text: `Triage #${issue_number} in ${owner}/${repo}.\n1. Severity\n2. Labels\n3. Priority\n4. Assignee\n5. Next steps` } }] }));
server.prompt("weekly-summary", "Weekly summary", { owner: z.string(), repo: z.string() },
  ({ owner, repo }) => ({ messages: [{ role: "user", content: { type: "text", text: `Weekly summary for ${owner}/${repo}. Group: New | Updated | Stale.` } }] }));
server.prompt("bug-report-template", "Bug report", {}, () => ({ messages: [{ role: "user", content: { type: "text", text: "Template:\n## Bug Report\n### Describe\n### To Reproduce\n### Expected\n### Environment" } }] }));

process.on("SIGTERM", async () => { await instance.shutdown(); process.exit(0); });
process.on("SIGINT", async () => { await instance.shutdown(); process.exit(0); });
```

---

## Test

```bash
npm run build
export GITHUB_TOKEN="ghp_..."
export AUTH_KEYS="sk-mcp-1,sk-mcp-2"
export NODE_ENV=production
node build/server.js
```

```bash
# No key → 401
curl http://localhost:3001/sse

# Wrong key → 403
curl -H "X-API-Key: wrong" http://localhost:3001/sse

# Correct key → SSE opens
curl -H "X-API-Key: sk-mcp-1" http://localhost:3001/sse

# Health (no auth)
curl http://localhost:3001/health

# Rate limit test
for i in $(seq 1 70); do
  curl -s -o /dev/null -w "%{http_code}\n" \
    -H "X-API-Key: sk-mcp-1" \
    -X POST "http://localhost:3001/messages?sessionId=test" \
    -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
done
# First 60 → 200, after → 429
```

---

## Kết Quả

| Layer | Implementation | Status |
|-------|---------------|--------|
| Auth | X-API-Key header → 401/403 | ✅ |
| Rate limit | Sliding window per key → 429 | ✅ |
| CORS | Origin whitelist + OPTIONS | ✅ |
| Env validation | Fail fast on startup | ✅ |
| Graceful shutdown | SIGTERM/SIGINT → close | ✅ |
| Version | v1.0.2 | ✅ |

---

| Day | Chủ đề | Status |
|-----|--------|--------|
| 1 | Setup & Architecture | ✅ |
| 2 | Resources, Prompts & Advanced Tools | ✅ |
| 3 | SSE Transport & Docker | ✅ |
| 4 | **Auth & Production Hardening** | ✅ **Done** |
| 5 | Testing, Publishing & Ecosystem | Final |
