---
title: "Building an MCP Server from Scratch — Day 4: Authentication & Production Hardening"
description: "Secure your MCP server for production. API key authentication, Express middleware, rate limiting, CORS policies, environment validation, graceful shutdown, and Docker security hardening."
published: 2026-06-09
pubDate: 2026-06-09T05:00:00.000Z
slug: build-mcp-server-from-scratch-day4-authentication-production-hardening
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
lang: en
series:
  name: "Building an MCP Server from Scratch"
  order: 4
  total: 5
---

Day 3 gave us a working SSE server over HTTP and Docker. But right now **anyone** who knows the URL can talk to your MCP server. Your GitHub token is exposed to anyone who connects.

In production, you need:

1. **Authentication** — Only authorized clients connect
2. **Rate limiting** — Prevent abuse and API cost spikes
3. **CORS** — Control which origins can access
4. **Input validation** — Reject malformed requests early
5. **Environment validation** — Fail fast on misconfiguration
6. **Graceful shutdown** — Properly close connections on restart

Let's harden the server.

---

## Step 1: Authentication Middleware

We'll add **API key authentication** via header. Each client gets a unique key. The server checks every SSE connection and every message POST against it.

Install dependencies (none new — we use built-in `crypto`):

```bash
cd github-issue-mcp
npm ls express @modelcontextprotocol/sdk zod
```

### Create `src/auth.ts`

```typescript
// src/auth.ts — API key authentication

import crypto from "crypto";

/**
 * Simple API key authentication.
 * Keys configured via AUTH_KEYS env var (comma-separated).
 */
export class AuthService {
  private validKeys: Set<string>;

  constructor() {
    const keysFromEnv = process.env.AUTH_KEYS;
    if (keysFromEnv) {
      this.validKeys = new Set(keysFromEnv.split(",").map((k) => k.trim()));
      console.error(`🔑 Auth configured: ${this.validKeys.size} API key(s)`);
    } else {
      // Development mode — generate random key
      const defaultKey = crypto.randomBytes(32).toString("hex");
      this.validKeys = new Set([defaultKey]);
      console.error(`🔑 No AUTH_KEYS set. Generated dev key:`);
      console.error(`   ${defaultKey}`);
    }
  }

  validate(apiKey: string | undefined): boolean {
    if (!apiKey) return false;
    return this.validKeys.has(apiKey);
  }

  middleware() {
    return (req: any, res: any, next: any) => {
      const apiKey = req.headers["x-api-key"] as string | undefined;
      if (!apiKey) {
        res.status(401).json({ error: "Missing X-API-Key header" });
        return;
      }
      if (!this.validate(apiKey)) {
        res.status(403).json({ error: "Invalid API key" });
        return;
      }
      // Store key on request for rate limiter
      req.apiKey = apiKey;
      next();
    };
  }
}
```

### What this does:

- Reads API keys from `AUTH_KEYS` env var (comma-separated)
- Dev mode: generates a random 64-char hex key
- Middleware returns **401** if header missing, **403** if invalid key
- Stores the validated key on `req.apiKey` for downstream middleware

### Usage:

```bash
export AUTH_KEYS="sk-mcp-dev-abc123,sk-mcp-dev-xyz789"
node build/server.js
```

```bash
curl -H "X-API-Key: sk-mcp-dev-abc123" http://localhost:3001/sse
```

---

## Step 2: Rate Limiting

Without rate limiting, a rogue client could hammer your server, burning through GitHub API quota and compute costs.

### Create `src/rate-limit.ts`

```typescript
// src/rate-limit.ts — Sliding-window rate limiter

export class RateLimiter {
  private buckets: Map<string, { count: number; windowStart: number }> = new Map();
  private maxRequests: number;
  private windowMs: number;

  constructor(maxRequests: number = 60, windowMs: number = 60_000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    console.error(`⏱️ Rate limit: ${maxRequests} req / ${windowMs / 1000}s`);
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
    for (const [key, bucket] of this.buckets) {
      if (now - bucket.windowStart >= this.windowMs) {
        this.buckets.delete(key);
      }
    }
  }

  middleware() {
    return (req: any, res: any, next: any) => {
      const apiKey = req.apiKey || "anonymous";
      if (!this.check(apiKey)) {
        res.status(429).json({ error: "Too many requests", retryAfterMs: this.windowMs });
        return;
      }
      next();
    };
  }
}
```

### Why rate limiting matters:

| Scenario | Without Limit | With Limit |
|----------|--------------|------------|
| Malicious client | Unlimited calls → API costs spike | Blocked after 60/min |
| Buggy agent loop | `create_issue` forever | Blocked, developer debugs |
| Multiple clients | One hogs all resources | Each gets fair share |

---

## Step 3: CORS Configuration

CORS controls which web origins can access your SSE endpoint. For Claude Desktop (not a browser) this isn't needed. For a web UI, it's required.

### Create `src/cors.ts`

```typescript
// src/cors.ts — CORS middleware

export function corsMiddleware(allowedOrigins: string[] = ["*"]) {
  return (req: any, res: any, next: any) => {
    const origin = req.headers.origin;

    if (allowedOrigins.includes("*")) {
      res.setHeader("Access-Control-Allow-Origin", "*");
    } else if (origin && allowedOrigins.includes(origin)) {
      res.setHeader("Access-Control-Allow-Origin", origin);
    }

    if (req.method === "OPTIONS") {
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-API-Key");
      res.setHeader("Access-Control-Max-Age", "86400");
      res.status(204).end();
      return;
    }

    next();
  };
}
```

---

## Step 4: Environment Validation

Fail fast is better than fail mysteriously. Validate all required config at startup.

### Create `src/env.ts`

```typescript
// src/env.ts — Environment validation

export interface AppConfig {
  port: number;
  githubToken: string;
  authKeys: string[];
  rateLimitMax: number;
  rateLimitWindowMs: number;
  allowedOrigins: string[];
  nodeEnv: string;
}

export function loadConfig(): AppConfig {
  const errors: string[] = [];

  const githubToken = process.env.GITHUB_TOKEN;
  if (!githubToken) errors.push("GITHUB_TOKEN is required");

  const authKeysStr = process.env.AUTH_KEYS;
  if (!authKeysStr && process.env.NODE_ENV === "production") {
    errors.push("AUTH_KEYS is required in production mode");
  }

  const port = parseInt(process.env.PORT || "3001", 10);
  if (isNaN(port) || port <= 0 || port > 65535) {
    errors.push("PORT must be 1-65535");
  }

  if (errors.length > 0) {
    console.error("❌ Configuration errors:");
    errors.forEach((e) => console.error(`   - ${e}`));
    console.error("\nRequired: GITHUB_TOKEN");
    console.error("Production: AUTH_KEYS");
    console.error("Optional: PORT, RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_MS, ALLOWED_ORIGINS, NODE_ENV");
    process.exit(1);
  }

  const authKeys = authKeysStr
    ? authKeysStr.split(",").map((k) => k.trim()).filter(Boolean)
    : [];

  console.error(`✅ Config validated | Port: ${port} | Auth: ${authKeys.length || "auto"} keys`);

  return {
    port,
    githubToken: githubToken!,
    authKeys,
    rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || "60", 10),
    rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "60000", 10),
    allowedOrigins: process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(",").map((s) => s.trim())
      : ["*"],
    nodeEnv: process.env.NODE_ENV || "development",
  };
}
```

---

## Step 5: Graceful Shutdown

When your server restarts (or receives SIGTERM/SIGINT), you need to:

1. Stop accepting new connections
2. Wait for existing SSE streams to complete
3. Close the HTTP server
4. Exit cleanly

### Update `src/sse-server.ts` with middleware support + shutdown:

```typescript
// src/sse-server.ts — Updated with middleware + graceful shutdown

import express from "express";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export interface SSEServerInstance {
  server: import("http").Server;
  shutdown: () => Promise<void>;
  getActiveConnections: () => number;
}

export function createSSEServer(
  mcpServer: McpServer,
  port: number = 3001,
  configureMiddleware?: (app: express.Application) => void
): SSEServerInstance {
  const app = express();

  // Apply middleware first (auth, cors, rate limit, etc.)
  if (configureMiddleware) configureMiddleware(app);

  const transports: Map<string, SSEServerTransport> = new Map();

  app.get("/sse", async (req, res) => {
    const transport = new SSEServerTransport("/messages", res);
    transports.set(transport.sessionId, transport);

    res.on("close", () => {
      transports.delete(transport.sessionId);
      console.error(`[SSE] Session closed: ${transport.sessionId}`);
    });

    try {
      await mcpServer.connect(transport);
    } catch (error) {
      console.error(`[SSE] Connect error: ${error}`);
      res.status(500).end();
    }
  });

  app.post("/messages", express.json(), async (req, res) => {
    const sessionId = req.query.sessionId as string;
    const transport = transports.get(sessionId);
    if (!transport) {
      res.status(404).json({ error: "Session not found" });
      return;
    }
    await transport.handlePostMessage(req, res);
  });

  app.get("/health", (req, res) => {
    res.json({
      status: "ok",
      uptime: process.uptime(),
      activeConnections: transports.size,
    });
  });

  const httpServer = app.listen(port, () => {
    console.error(`✅ MCP SSE server on port ${port}`);
  });

  async function shutdown(): Promise<void> {
    console.error("Shutting down...");
    transports.clear();
    return new Promise((resolve) => {
      httpServer.close(() => {
        console.error("HTTP server closed");
        resolve();
      });
    });
  }

  return { server: httpServer, shutdown, getActiveConnections: () => transports.size };
}
```

The key change: `configureMiddleware` callback lets the entry point wire up auth, CORS, and rate limiting without the SSE module knowing about them.

---

## Step 6: The Complete Production Entry Point

Now `src/server.ts` — the hardened entry point with all middleware wired up:

```typescript
// src/server.ts — Production hardened entry point
// Auth + Rate limiting + CORS + Env validation + Graceful shutdown

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

// Validate environment FIRST (fail fast)
const config = loadConfig();

// Initialize services
const github = new GitHubClient(config.githubToken);
const auth = new AuthService();
const rateLimiter = new RateLimiter(config.rateLimitMax, config.rateLimitWindowMs);
const GITHUB_API_BASE = "https://api.github.com";

const server = new McpServer({
  name: "github-issue-manager",
  version: "1.0.2",
});

// ──── Helpers ────
function parseLinkHeader(link: string | null): Record<string, string> {
  if (!link) return {};
  const result: Record<string, string> = {};
  for (const part of link.split(", ")) {
    const match = part.match(/<([^>]+)>;\s*rel="([^"]+)"/);
    if (match) result[match[2]] = match[1];
  }
  return result;
}

async function githubFetch(url: string) {
  return fetch(url, {
    headers: {
      Authorization: `Bearer ${config.githubToken}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "github-issue-mcp-server/1.0",
    },
  });
}

// ──── Wire middleware ────
const instance = createSSEServer(server, config.port, (app) => {
  app.use(corsMiddleware(config.allowedOrigins));
  app.use(express.json());

  // Auth + rate limit on every request except /health
  app.use((req, res, next) => {
    if (req.path === "/health") return next();
    auth.middleware()(req, res, next);
  });
  app.use((req, res, next) => {
    if (req.path === "/health") return next();
    rateLimiter.middleware()(req, res, next);
  });

  // Clean stale rate limit buckets every 5 min
  setInterval(() => rateLimiter.cleanup(), 5 * 60 * 1000);
});

// ──── TOOLS (7) ────
server.tool("list_issues", "List issues", {
  owner: z.string(), repo: z.string(),
  state: z.enum(["open","closed","all"]).default("open"),
  limit: z.number().min(1).max(100).default(20),
}, async ({ owner, repo, state, limit }) => {
  try {
    const issues = await github.listIssues(owner, repo, state, limit);
    if (!issues.length) return { content: [{ type: "text", text: `No ${state} issues.` }] };
    const formatted = issues.map((i: any) =>
      `#${i.number}: ${i.title}\n  ${i.state} | ${i.created_at.slice(0,10)}\n  ${i.html_url}`
    ).join("\n\n");
    return { content: [{ type: "text", text: `## Issues in ${owner}/${repo} (${state})\n\n${formatted}` }] };
  } catch (e) { return { content: [{ type: "text", text: `Error: ${e}` }], isError: true }; }
});

server.tool("get_issue", "Get issue details", {
  owner: z.string(), repo: z.string(), issue_number: z.number().int().positive(),
}, async ({ owner, repo, issue_number }) => {
  try {
    const issue = await github.getIssue(owner, repo, issue_number);
    return { content: [{ type: "text", text:
      `# ${issue.title}\n**#${issue.number}** | **State:** ${issue.state}\n**URL:** ${issue.html_url}\n---\n${issue.body || "*No description*"}` }] };
  } catch (e) { return { content: [{ type: "text", text: `Error: ${e}` }], isError: true }; }
});

server.tool("create_issue", "Create issue", {
  owner: z.string(), repo: z.string(),
  title: z.string().min(1).max(256),
  body: z.string().optional(), labels: z.array(z.string()).optional(),
  assignees: z.array(z.string()).optional(),
}, async ({ owner, repo, title, body, labels, assignees }) => {
  try {
    const issue = await github.createIssue(owner, repo, { title, body, labels, assignees });
    return { content: [{ type: "text", text: `✅ Created #${issue.number}: ${issue.title}\n${issue.html_url}` }] };
  } catch (e) { return { content: [{ type: "text", text: `Error: ${e}` }], isError: true }; }
});

server.tool("update_issue", "Update issue", {
  owner: z.string(), repo: z.string(), issue_number: z.number().int().positive(),
  title: z.string().max(256).optional(), body: z.string().optional(),
  state: z.enum(["open","closed"]).optional(),
  labels: z.array(z.string()).optional(), assignees: z.array(z.string()).optional(),
}, async ({ owner, repo, issue_number, ...changes }) => {
  try {
    const issue = await github.updateIssue(owner, repo, issue_number, changes);
    return { content: [{ type: "text", text: `✅ Updated #${issue_number}\nState: ${issue.state}\n${issue.html_url}` }] };
  } catch (e) { return { content: [{ type: "text", text: `Error: ${e}` }], isError: true }; }
});

server.tool("search_issues", "Search issues", {
  query: z.string().min(1), limit: z.number().min(1).max(50).default(10),
}, async ({ query, limit }) => {
  try {
    const result = await github.searchIssues(query, limit);
    if (!result.issues.length) return { content: [{ type: "text", text: `No results for: "${query}"` }] };
    const formatted = result.issues.map((i: any) =>
      `#${i.number}: ${i.title}\n  ${i.state} | ${i.html_url}`
    ).join("\n\n");
    return { content: [{ type: "text", text: `## Results (${result.total_count} total)\n\n${formatted}` }] };
  } catch (e) { return { content: [{ type: "text", text: `Error: ${e}` }], isError: true }; }
});

server.tool("list_issues_paginated", "Paginated listing", {
  owner: z.string(), repo: z.string(),
  state: z.enum(["open","closed","all"]).default("open"),
  page: z.number().int().min(1).default(1),
  per_page: z.number().int().min(1).max(100).default(30),
  sort: z.enum(["created","updated","comments"]).default("updated"),
  direction: z.enum(["asc","desc"]).default("desc"),
}, async ({ owner, repo, state, page, per_page, sort, direction }) => {
  try {
    const url = `${GITHUB_API_BASE}/repos/${owner}/${repo}/issues?${
      new URLSearchParams({ state, page: String(page), per_page: String(per_page), sort, direction })}`;
    const res = await githubFetch(url);
    const issues: any[] = await res.json() as any[];
    const pagination = parseLinkHeader(res.headers.get("link"));
    if (!issues.length) return { content: [{ type: "text", text: `No issues page ${page}.` }] };
    const formatted = issues.map((i: any) =>
      `#${i.number}: ${i.title}\n  ${i.state} | 💬 ${i.comments}\n  ${i.html_url}`
    ).join("\n\n");
    let header = `## Issues (page ${page})`;
    if (pagination.last) header += ` — Page ${page}/${parseInt(new URL(pagination.last).searchParams.get("page") || "1")}`;
    return { content: [{ type: "text", text: `${header}\n\n${formatted}` }] };
  } catch (e) { return { content: [{ type: "text", text: `Error: ${e}` }], isError: true }; }
});

server.tool("batch_label_issues", "Batch label issues", {
  owner: z.string(), repo: z.string(),
  issue_numbers: z.array(z.number().int().positive()).min(1).max(25),
  labels: z.array(z.string()).min(1).max(10),
}, async ({ owner, repo, issue_numbers, labels }) => {
  const results: { n: number; ok: boolean; err?: string }[] = [];
  for (const n of issue_numbers) {
    try { await github.updateIssue(owner, repo, n, { labels }); results.push({ n, ok: true }); }
    catch (e) { results.push({ n, ok: false, err: String(e) }); }
  }
  const s = results.filter(r => r.ok).length;
  return { content: [{ type: "text",
    text: `## Labels: ${labels.join(", ")}\n✅ ${s}/${issue_numbers.length}${
      results.some(r => !r.ok) ? `\n❌ Failed:\n${results.filter(r => !r.ok).map(r => `- #${r.n}: ${r.err}`).join("\n")}` : ""
    }` }] };
});

// ──── RESOURCES (3) ────
server.resource("issue-detail",
  new ResourceTemplate("issue://{owner}/{repo}/{number}", { list: undefined }),
  async (uri, { owner, repo, number }) => {
    const issue = await github.getIssue(owner as string, repo as string, parseInt(number as string));
    return { contents: [{ uri: uri.href, mimeType: "text/markdown",
      text: `# ${issue.title}\n**Status:** ${issue.state === "open" ? "🟢" : "🔴"}\n**URL:** ${issue.html_url}\n---\n${issue.body || "*No description*"}` }] };
  });

server.resource("issue-comments",
  new ResourceTemplate("issue://{owner}/{repo}/{number}/comments", { list: undefined }),
  async (uri, { owner, repo, number }) => {
    const url = `${GITHUB_API_BASE}/repos/${owner}/${repo}/issues/${number}/comments`;
    const res = await githubFetch(url);
    const comments: any[] = await res.json() as any[];
    if (!comments.length) return { contents: [{ uri: uri.href, mimeType: "text/markdown", text: "*No comments*" }] };
    return { contents: [{ uri: uri.href, mimeType: "text/markdown",
      text: `# Comments\n\n${comments.map((c: any) => `---\n**@${c.user.login}** on ${new Date(c.created_at).toLocaleDateString()}\n\n${c.body || "*No text*"}`).join("\n\n")}` }] };
  });

server.resource("open-issues",
  new ResourceTemplate("issue://{owner}/{repo}/open", { list: undefined }),
  async (uri, { owner, repo }) => {
    const issues = await github.listIssues(owner as string, repo as string, "open");
    if (!issues.length) return { contents: [{ uri: uri.href, mimeType: "text/markdown", text: "✨ No open issues!" }] };
    return { contents: [{ uri: uri.href, mimeType: "text/markdown",
      text: `# Open Issues (${issues.length})\n\n${issues.map((i: any) => `- [#${i.number}](${i.html_url}): ${i.title}`).join("\n")}` }] };
  });

// ──── PROMPTS (3) ────
server.prompt("triage-issue", "Triage issue", {
  owner: z.string(), repo: z.string(), issue_number: z.number(),
}, ({ owner, repo, issue_number }) => ({
  messages: [{ role: "user", content: { type: "text",
    text: `Triage #${issue_number} in ${owner}/${repo}.\n1. Severity\n2. Labels\n3. Priority\n4. Assignee\n5. Next steps` } }],
}));

server.prompt("weekly-summary", "Weekly summary", {
  owner: z.string(), repo: z.string(),
}, ({ owner, repo }) => ({
  messages: [{ role: "user", content: { type: "text",
    text: `Weekly summary for ${owner}/${repo}.\nGroup: New | Updated | Stale (30d+).` } }],
}));

server.prompt("bug-report-template", "Bug report template", {}, () => ({
  messages: [{ role: "user", content: { type: "text",
    text: `Template:\n## Bug Report\n### Describe\n### To Reproduce\n### Expected\n### Environment` } }],
}));

// ──── Graceful shutdown ────
process.on("SIGTERM", async () => { await instance.shutdown(); process.exit(0); });
process.on("SIGINT", async () => { await instance.shutdown(); process.exit(0); });

console.error("\n🚀 github-issue-manager v1.0.2 — production hardened");
console.error("   Auth: X-API-Key | Health: /health (no auth)");
```

---

## Step 7: Update package.json

Bump version:

```json
{
  "name": "github-issue-mcp",
  "version": "1.0.2",
  "scripts": {
    "build": "tsc",
    "start": "node build/server.js",
    "inspect": "npx @modelcontextprotocol/inspector"
  }
}
```

---

## Step 8: Full Test

### Build and run:

```bash
npm run build

export GITHUB_TOKEN="ghp_your_token_here"
export AUTH_KEYS="sk-mcp-1,sk-mcp-2"
export NODE_ENV=production

node build/server.js
```

Expected output:

```
✅ Config validated | Port: 3001 | Auth: 2 keys
🔑 Auth configured: 2 API key(s)
⏱️ Rate limit: 60 req / 60s
✅ MCP SSE server on port 3001
🚀 github-issue-manager v1.0.2 — production hardened
```

### Test auth:

```bash
# No key → 401
curl http://localhost:3001/sse
# {"error":"Missing X-API-Key header"}

# Wrong key → 403
curl -H "X-API-Key: wrong" http://localhost:3001/sse
# {"error":"Invalid API key"}

# Correct key → SSE opens
curl -H "X-API-Key: sk-mcp-1" http://localhost:3001/sse
# event: endpoint
```

### Test rate limit:

```bash
for i in $(seq 1 70); do
  curl -s -o /dev/null -w "%{http_code}\n" \
    -H "X-API-Key: sk-mcp-1" \
    -X POST "http://localhost:3001/messages?sessionId=test" \
    -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
done
# First 60 → 200 / After 60 → 429
```

### Test health (no auth):

```bash
curl http://localhost:3001/health
# {"status":"ok","uptime":12,"activeConnections":0}
```

---

## Step 9: Docker with Auth

Update Docker Compose:

```yaml
services:
  mcp-server:
    build: .
    container_name: github-issue-mcp
    ports:
      - "127.0.0.1:3001:3001"
    environment:
      - GITHUB_TOKEN=${GITHUB_TOKEN}
      - AUTH_KEYS=${AUTH_KEYS}
      - NODE_ENV=production
      - RATE_LIMIT_MAX=60
      - RATE_LIMIT_WINDOW_MS=60000
    healthcheck:
      test: ["CMD", "wget", "--spider", "http://localhost:3001/health"]
      interval: 30s
      retries: 3
    restart: unless-stopped
    read_only: true
```

Run:

```bash
export GITHUB_TOKEN="ghp_..."
export AUTH_KEYS="sk-mcp-prod-1,sk-mcp-prod-2"
docker compose up -d
```

---

## Step 10: Claude Desktop Config

```json
{
  "mcpServers": {
    "github-issue-manager": {
      "type": "sse",
      "url": "https://mcp.example.com/sse",
      "headers": {
        "X-API-Key": "sk-mcp-prod-1"
      }
    }
  }
}
```

The `headers` field lets you pass the API key with every request. Restart Claude Desktop — it should connect to your production-hardened server.

---

## What You Learned

| Concept | Implementation |
|---------|---------------|
| API key auth | `AuthService` → Express middleware → 401/403 |
| Rate limiting | Sliding window → per-key buckets → 429 |
| CORS | Control origins → handle preflight OPTIONS |
| Env validation | `loadConfig()` → fail fast on startup |
| Graceful shutdown | SIGTERM/SIGINT → close transports → close HTTP |
| Middleware chain | CORS → Body parser → Auth → Rate limit → SSE |

---

| Day | Topic | Status |
|-----|-------|--------|
| 1 | Setup & Architecture | ✅ |
| 2 | Resources, Prompts & Advanced Tools | ✅ |
| 3 | SSE Transport & Docker | ✅ |
| 4 | **Auth & Production Hardening** | ✅ **Done** |
| 5 | Testing, Publishing & Ecosystem | Final |
