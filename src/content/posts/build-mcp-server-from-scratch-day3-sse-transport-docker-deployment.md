---
title: "Building an MCP Server from Scratch — Day 3: SSE Transport & Remote Deployment with Docker"
description: "Take your MCP server from localhost to remote. Full SSE transport implementation with Express.js, Docker multi-stage build, environment configuration, health checks, MCP Inspector over SSE, and connecting Claude Desktop remotely."
published: 2026-06-09
pubDate: 2026-06-09T01:15:00.000Z
slug: build-mcp-server-from-scratch-day3-sse-transport-docker-deployment
tags:
  - mcp
  - tutorial
  - sse
  - docker
  - typescript
  - deployment
  - step-by-step
  - express
category: ai-agents
lang: en
series:
  name: "Building an MCP Server from Scratch"
  order: 3
  total: 5
---

Right now our MCP server only works on localhost. The Claude Desktop on your machine launches the server as a child process, they talk over stdio, and everything is fine — as long as you're on one machine.

But production MCP servers need to be **remote**. You want one MCP server that multiple agents (or multiple users) can connect to. You want to deploy it on a VPS, a Docker container, or Kubernetes. You want health checks, restart policies, and log aggregation.

That means switching from **stdio** to **SSE (Server-Sent Events)** transport.

---

## How SSE Transport Works

SSE is a standard HTTP protocol where the server pushes events to the client over a long-lived HTTP connection. For MCP, the flow looks like this:

```
┌──────────────┐                  ┌──────────────┐
│   Client     │  1. GET /sse     │    Server    │
│ (Claude      │ ──────────────►  │  (Express.js)│
│  Desktop,    │                  │              │
│  Inspector)  │  2. POST /msg    │  Node.js     │
│              │ ◄──────────────  │              │
│              │  3. Event stream │              │
│              │ ◄══════════════  │              │
└──────────────┘                  └──────────────┘
```

1. Client connects to `GET /sse` — this opens the SSE stream
2. Server sends a `endpoint` event with the message endpoint URL (e.g., `/?sessionId=abc123`)
3. Client sends JSON-RPC messages via `POST /msg` with the session ID
4. Server sends JSON-RPC responses back through the SSE stream

The key difference from stdio: now there's an actual HTTP server involved. We need Express.js (or Fastify, Hono, etc.) to serve the endpoint.

---

## Step 1: Install SSE Dependencies

```bash
cd github-issue-mcp
npm install express
npm install -D @types/express
```

We already have `@modelcontextprotocol/sdk` and `zod` from Day 1. `express` and its TypeScript types are the only new things.

## Step 2: The SSE Server Module

Create `src/sse-server.ts` — this module manages the SSE transport lifecycle:

```typescript
// src/sse-server.ts — Manages SSE transport for multiple concurrent clients

import express from "express";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export function createSSEServer(mcpServer: McpServer, port: number = 3001) {
  const app = express();
  
  // ──── Track active sessions ────
  // Each SSE connection gets a unique session ID.
  // The transport stores the response object for streaming events back.
  const transports: Map<string, SSEServerTransport> = new Map();

  // ──── SSE connection endpoint ────
  // The client opens a GET /sse stream. The server keeps this connection
  // alive and pushes events (tool results, resource content, etc.) over it.
  app.get("/sse", async (req: express.Request, res: express.Response) => {
    console.error(`[SSE] New connection from ${req.ip}`);

    // Create a transport for this connection.
    // The first argument is the path where the client will POST messages.
    // The SDK appends ?sessionId=xxx automatically.
    const transport = new SSEServerTransport("/messages", res);
    
    // Store it by session ID so POST /messages can find it.
    transports.set(transport.sessionId, transport);
    console.error(`[SSE] Session created: ${transport.sessionId}`);
    console.error(`[SSE] Active connections: ${transports.size}`);

    // When the client disconnects or the stream closes, clean up.
    res.on("close", () => {
      transports.delete(transport.sessionId);
      console.error(`[SSE] Session closed: ${transport.sessionId}`);
      console.error(`[SSE] Active connections: ${transports.size}`);
    });

    try {
      // Connect the MCP server to this transport.
      // This triggers the initialization handshake:
      //   Client sends initialize → Server responds with capabilities
      //   Client sends initialized notification
      //   Client sends tools/list → Server responds
      await mcpServer.connect(transport);
    } catch (error) {
      console.error(`[SSE] Failed to connect transport: ${error}`);
      res.status(500).end();
    }
  });

  // ──── Message endpoint ────
  // The client sends JSON-RPC messages as HTTP POST requests here.
  // The session ID (from the SSE endpoint event) tells us which transport to use.
  app.post("/messages", express.json(), async (req: express.Request, res: express.Response) => {
    const sessionId = req.query.sessionId as string;
    console.error(`[MSG] POST from session: ${sessionId}`);

    const transport = transports.get(sessionId);
    
    if (!transport) {
      console.error(`[MSG] Session not found: ${sessionId}`);
      res.status(404).json({ error: "Session not found. Make sure you connect to /sse first." });
      return;
    }

    try {
      // Forward the POST body as an MCP protocol message.
      // The transport handles parsing JSON-RPC and sending the response
      // back through the SSE stream.
      await transport.handlePostMessage(req, res);
      console.error(`[MSG] Handled successfully for session: ${sessionId}`);
    } catch (error) {
      console.error(`[MSG] Error handling message: ${error}`);
      // Don't send another response — handlePostMessage already did
    }
  });

  // ──── Health check endpoint ────
  // Useful for Docker HEALTHCHECK, load balancers, and monitoring.
  app.get("/health", (req: express.Request, res: express.Response) => {
    res.json({
      status: "ok",
      uptime: process.uptime(),
      activeConnections: transports.size,
      serverName: "github-issue-manager",
      serverVersion: "1.0.1",
      timestamp: new Date().toISOString(),
    });
  });

  // ──── Start listening ────
  return app.listen(port, () => {
    console.error(`✅ MCP SSE server listening on port ${port}`);
    console.error(`   SSE endpoint: http://localhost:${port}/sse`);
    console.error(`   Message endpoint: http://localhost:${port}/messages`);
    console.error(`   Health check: http://localhost:${port}/health`);
  });
}
```

### What's happening here?

- **`GET /sse`**: The client opens a long-lived HTTP connection. The `SSEServerTransport` holds the response object and uses it to push events. Every connection gets a unique `sessionId`.

- **`POST /messages`**: The client sends JSON-RPC messages here. The `sessionId` query parameter routes the message to the right transport. The transport processes the JSON-RPC request and pushes the response through the SSE stream.

- **`GET /health`**: Standard health check. Returns the server status, active connection count, and uptime.

- **Session management**: The `Map<string, SSEServerTransport>` tracks active sessions. When a client disconnects, the `close` event removes the session. This is critical for memory management — leaked transports would keep response objects alive forever.


## Step 3: Create the SSE Entry Point

Now create `src/server.ts` — the new entry point that wires everything together:

```typescript
// src/server.ts — SSE-based MCP server entry point
// This replaces src/index.ts as the main entry point when running in SSE mode.

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { GitHubClient } from "./github-client.js";
import { createSSEServer } from "./sse-server.js";

// ════════════════════════════════════════════════════════════
// CONFIGURATION
// ════════════════════════════════════════════════════════════

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
if (!GITHUB_TOKEN) {
  console.error("❌ GITHUB_TOKEN environment variable is required");
  console.error("   Get one at: https://github.com/settings/tokens");
  console.error("   Required scopes: issues:read, issues:write");
  process.exit(1);
}

const PORT = parseInt(process.env.PORT || "3001", 10);

// ════════════════════════════════════════════════════════════
// INITIALIZE
// ════════════════════════════════════════════════════════════

const server = new McpServer({
  name: "github-issue-manager",
  version: "1.0.1",
});

const github = new GitHubClient(GITHUB_TOKEN);
const GITHUB_API_BASE = "https://api.github.com";

// Mask token for logging — show first 8 + last 4 chars only
const maskedToken = `${GITHUB_TOKEN.slice(0, 8)}...${GITHUB_TOKEN.slice(-4)}`;
console.error(`🚀 Starting GitHub Issue Manager v1.0.1`);
console.error(`   Token: ${maskedToken}`);
console.error(`   Port: ${PORT}`);

// ════════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════════

function parseLinkHeader(link: string | null) {
  if (!link) return {};
  const result: Record<string, string> = {};
  const parts = link.split(", ");
  for (const part of parts) {
    const match = part.match(/<([^>]+)>;\s*rel="([^"]+)"/);
    if (match) result[match[2]] = match[1];
  }
  return result;
}

async function githubFetch(url: string) {
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "github-issue-mcp-server/1.0",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });
  return response;
}

// ════════════════════════════════════════════════════════════
// TOOLS (7 tools from Day 1 + Day 2)
// ════════════════════════════════════════════════════════════

// Tool 1: List issues
server.tool(
  "list_issues",
  "List issues from a GitHub repository, filtered by state",
  {
    owner: z.string().describe("Repository owner (user or organization)"),
    repo: z.string().describe("Repository name"),
    state: z.enum(["open", "closed", "all"]).default("open").describe("Issue state filter"),
    limit: z.number().min(1).max(100).default(20).describe("Maximum issues to return"),
  },
  async ({ owner, repo, state, limit }) => {
    try {
      const issues = await github.listIssues(owner, repo, state, limit);
      if (issues.length === 0) {
        return { content: [{ type: "text", text: `No ${state} issues found in ${owner}/${repo}.` }] };
      }
      const formatted = issues.map((issue) => {
        const labels = issue.labels.map((l) => `[${l.name}]`).join(" ");
        const assignees = issue.assignees.map((a) => `@${a.login}`).join(", ");
        return [
          `#${issue.number}: ${issue.title}`,
          `  State: ${issue.state} | Created: ${issue.created_at.slice(0, 10)} | Comments: ${issue.comments}`,
          `  Labels: ${labels || "(none)"}`,
          `  Assignees: ${assignees || "(none)"}`,
          `  URL: ${issue.html_url}`,
        ].join("\n");
      });
      return { content: [{ type: "text", text: `## Issues in ${owner}/${repo} (${state})\n\n${formatted.join("\n\n")}` }] };
    } catch (error) {
      return { content: [{ type: "text", text: `Error listing issues: ${error}` }], isError: true };
    }
  },
);

// Tool 2: Get single issue
server.tool(
  "get_issue",
  "Get detailed information about a single GitHub issue by number",
  {
    owner: z.string().describe("Repository owner"),
    repo: z.string().describe("Repository name"),
    issue_number: z.number().int().positive().describe("Issue number (e.g., 42)"),
  },
  async ({ owner, repo, issue_number }) => {
    try {
      const issue = await github.getIssue(owner, repo, issue_number);
      const labels = issue.labels.map((l) => `[${l.name}]`).join(" ");
      const assignees = issue.assignees.map((a) => `@${a.login}`).join(", ");
      const details = [
        `# ${issue.title}`,
        `**Issue #${issue.number}** | **State:** ${issue.state}`,
        `**Author:** @${issue.user.login} | **Created:** ${issue.created_at} | **Updated:** ${issue.updated_at}`,
        `**Labels:** ${labels || "(none)"}`,
        `**Assignees:** ${assignees || "(none)"}`,
        `**Comments:** ${issue.comments}`,
        `**URL:** ${issue.html_url}`,
        ``,
        `---`,
        issue.body || "*No description provided*",
      ].join("\n");
      return { content: [{ type: "text", text: details }] };
    } catch (error) {
      return { content: [{ type: "text", text: `Error fetching issue: ${error}` }], isError: true };
    }
  },
);

// Tool 3: Create issue
server.tool(
  "create_issue",
  "Create a new issue in a GitHub repository",
  {
    owner: z.string().describe("Repository owner"),
    repo: z.string().describe("Repository name"),
    title: z.string().min(1).max(256).describe("Issue title"),
    body: z.string().optional().describe("Issue body (Markdown supported)"),
    labels: z.array(z.string()).optional().describe("Labels to apply (e.g., ['bug', 'priority'])"),
    assignees: z.array(z.string()).optional().describe("Usernames to assign (e.g., ['user1'])"),
  },
  async ({ owner, repo, title, body, labels, assignees }) => {
    try {
      const issue = await github.createIssue(owner, repo, { title, body, labels, assignees });
      return { content: [{ type: "text", text: `✅ Issue created!\n**#${issue.number}:** ${issue.title}\n**URL:** ${issue.html_url}` }] };
    } catch (error) {
      return { content: [{ type: "text", text: `Error: ${error}` }], isError: true };
    }
  },
);

// Tool 4: Update issue
server.tool(
  "update_issue",
  "Update an existing issue — change title, body, labels, assignees, or close/reopen",
  {
    owner: z.string().describe("Repository owner"),
    repo: z.string().describe("Repository name"),
    issue_number: z.number().int().positive(),
    title: z.string().max(256).optional(),
    body: z.string().optional(),
    state: z.enum(["open", "closed"]).optional().describe("Close or reopen the issue"),
    labels: z.array(z.string()).optional(),
    assignees: z.array(z.string()).optional(),
  },
  async ({ owner, repo, issue_number, title, body, state, labels, assignees }) => {
    try {
      const issue = await github.updateIssue(owner, repo, issue_number, { title, body, state, labels, assignees });
      return { content: [{ type: "text", text: `✅ Issue #${issue_number} updated!\n**#${issue.number}:** ${issue.title}\n**State:** ${issue.state}\n**URL:** ${issue.html_url}` }] };
    } catch (error) {
      return { content: [{ type: "text", text: `Error: ${error}` }], isError: true };
    }
  },
);

// Tool 5: Search issues
server.tool(
  "search_issues",
  "Search GitHub issues across repositories using GitHub search syntax",
  {
    query: z.string().min(1).describe("GitHub search query (e.g., 'repo:owner/name is:open bug')"),
    limit: z.number().min(1).max(50).default(10),
  },
  async ({ query, limit }) => {
    try {
      const result = await github.searchIssues(query, limit);
      if (result.issues.length === 0) return { content: [{ type: "text", text: `No issues found for: "${query}"` }] };
      const formatted = result.issues.map((issue) => {
        const repoHint = issue.html_url.replace("https://github.com/", "").replace(/\/issues\/\d+/, "");
        return `#${issue.number} (${repoHint}): ${issue.title}\n  ${issue.state} | ${issue.html_url}`;
      }).join("\n\n");
      return { content: [{ type: "text", text: `## Results (${result.total_count} total)\n\n${formatted}` }] };
    } catch (error) {
      return { content: [{ type: "text", text: `Error: ${error}` }], isError: true };
    }
  },
);

// Tool 6: Paginated listing
server.tool(
  "list_issues_paginated",
  "Browse issues with pagination — useful for repositories with many issues",
  {
    owner: z.string(), repo: z.string(),
    state: z.enum(["open", "closed", "all"]).default("open"),
    page: z.number().int().min(1).default(1),
    per_page: z.number().int().min(1).max(100).default(30),
    sort: z.enum(["created", "updated", "comments"]).default("updated"),
    direction: z.enum(["asc", "desc"]).default("desc"),
  },
  async ({ owner, repo, state, page, per_page, sort, direction }) => {
    try {
      const url = `${GITHUB_API_BASE}/repos/${owner}/${repo}/issues?${new URLSearchParams({ state, page: String(page), per_page: String(per_page), sort, direction })}`;
      const response = await githubFetch(url);
      if (!response.ok) throw new Error(`GitHub API: ${response.status}`);
      const issues: any[] = await response.json() as any[];
      const pagination = parseLinkHeader(response.headers.get("link"));
      if (issues.length === 0) return { content: [{ type: "text", text: `No issues on page ${page} of ${owner}/${repo}.` }] };
      const formatted = issues.map((i: any) => `#${i.number}: ${i.title}\n  ${i.state} | 💬 ${i.comments}\n  ${i.html_url}`).join("\n\n");
      let header = `## Issues in ${owner}/${repo} (page ${page})`;
      if (pagination.last) {
        const lastPage = parseInt(new URL(pagination.last).searchParams.get("page") || "1");
        header += `\n📄 Page ${page} of ${lastPage}`;
      }
      return { content: [{ type: "text", text: `${header}\n\n${formatted}` }] };
    } catch (error) {
      return { content: [{ type: "text", text: `Error: ${error}` }], isError: true };
    }
  },
);

// Tool 7: Batch label
server.tool(
  "batch_label_issues",
  "Apply labels to multiple issues at once — useful during triage sessions",
  {
    owner: z.string(), repo: z.string(),
    issue_numbers: z.array(z.number().int().positive()).min(1).max(25),
    labels: z.array(z.string()).min(1).max(10),
  },
  async ({ owner, repo, issue_numbers, labels }) => {
    const results = [];
    for (const n of issue_numbers) {
      try { await github.updateIssue(owner, repo, n, { labels }); results.push(`  ✅ #${n}`); }
      catch (e) { results.push(`  ❌ #${n}: ${e}`); }
    }
    return { content: [{ type: "text", text: `## Batch Label: ${labels.join(", ")}\n${results.join("\n")}` }] };
  },
);

// ════════════════════════════════════════════════════════════
// RESOURCES (3 resources from Day 2)
// ════════════════════════════════════════════════════════════

server.resource(
  "issue-detail",
  new ResourceTemplate("issue://{owner}/{repo}/{number}", { list: undefined }),
  async (uri, { owner, repo, number }) => {
    const issue = await github.getIssue(owner as string, repo as string, parseInt(number as string));
    const labels = issue.labels.map((l) => `\`${l.name}\``).join(" ");
    const markdown = [
      `# ${issue.title}`,
      `**Status:** ${issue.state === "open" ? "🟢 Open" : "🔴 Closed"}`,
      `**Author:** @${issue.user.login} | **Labels:** ${labels || "*none*"}`,
      `**URL:** ${issue.html_url}`,
      `---`,
      issue.body || "*No description*",
    ].join("\n");
    return { contents: [{ uri: uri.href, mimeType: "text/markdown", text: markdown }] };
  },
);

server.resource(
  "issue-comments",
  new ResourceTemplate("issue://{owner}/{repo}/{number}/comments", { list: undefined }),
  async (uri, { owner, repo, number }) => {
    const url = `${GITHUB_API_BASE}/repos/${owner}/${repo}/issues/${number}/comments`;
    const response = await githubFetch(url);
    const comments: any[] = await response.json() as any[];
    if (comments.length === 0) return { contents: [{ uri: uri.href, mimeType: "text/markdown", text: `# Comments\n\n*No comments yet.*` }] };
    const formatted = comments.map((c: any) => `---\n**@${c.user.login}** on ${new Date(c.created_at).toLocaleDateString()}\n\n${c.body || "*No text*"}`).join("\n\n");
    return { contents: [{ uri: uri.href, mimeType: "text/markdown", text: `# Comments for #${number}\n\n${formatted}` }] };
  },
);

server.resource(
  "open-issues",
  new ResourceTemplate("issue://{owner}/{repo}/open", { list: undefined }),
  async (uri, { owner, repo }) => {
    const issues = await github.listIssues(owner as string, repo as string, "open");
    if (issues.length === 0) return { contents: [{ uri: uri.href, mimeType: "text/markdown", text: `✨ No open issues!` }] };
    const list = issues.map((i) => `- [#${i.number}](${i.html_url}): ${i.title}`).join("\n");
    return { contents: [{ uri: uri.href, mimeType: "text/markdown", text: `# Open Issues (${issues.length})\n\n${list}` }] };
  },
);

// ════════════════════════════════════════════════════════════
// PROMPTS (3 prompts from Day 2)
// ════════════════════════════════════════════════════════════

server.prompt(
  "triage-issue",
  "Analyze a GitHub issue: severity, labels, priority, assignee, next steps",
  { owner: z.string(), repo: z.string(), issue_number: z.number() },
  ({ owner, repo, issue_number }) => ({
    messages: [{
      role: "user",
      content: { type: "text", text: [
        `Please triage issue #${issue_number} in ${owner}/${repo}.`,
        `Use get_issue to fetch details, then analyze:`,
        `1. Severity — Bug, feature, or question? If bug: critical/major/minor?`,
        `2. Labels — What labels fit?`,
        `3. Priority — Now, this sprint, or backlog?`,
        `4. Assignee — Who should look?`,
        `5. Next steps — What info is missing?`,
      ].join("\n") },
    }],
  }),
);

server.prompt(
  "weekly-summary",
  "Summarize this week's issue activity for a repository",
  { owner: z.string(), repo: z.string() },
  ({ owner, repo }) => ({
    messages: [{
      role: "user",
      content: { type: "text", text: [
        `Weekly summary for ${owner}/${repo}.`,
        `1. Read open issues resource`,
        `2. Group: 🔥 New this week | 📝 Updated | 🧊 Stale (30d+)`,
        `3. Count + list for each group`,
      ].join("\n") },
    }],
  }),
);

server.prompt(
  "bug-report-template",
  "Pre-formatted bug report template for filing an issue",
  {},
  () => ({
    messages: [{
      role: "user",
      content: { type: "text", text: [
        `Use this template to create a bug report:`,
        `## Bug Report`,
        `### Describe the Bug`,
        `### To Reproduce`,
        `### Expected Behavior`,
        `### Screenshots`,
        `### Environment`,
      ].join("\n") },
    }],
  }),
);

// ════════════════════════════════════════════════════════════
// START SERVER
// ════════════════════════════════════════════════════════════

createSSEServer(server, PORT);
```

## Step 4: Update package.json

```json
{
  "name": "github-issue-mcp",
  "version": "1.0.1",
  "type": "module",
  "scripts": {
    "build": "tsc",
    "start": "node build/server.js",
    "start:stdio": "node build/index.js",
    "dev": "tsc --watch"
  },
  "files": ["build"]
}
```

## Step 5: Build & Test

```bash
npm run build

export GITHUB_TOKEN="ghp_your_token_here"
node build/server.js
```

You should see:

```
🚀 Starting GitHub Issue Manager v1.0.1
   Token: ghp_abc...xyz
   Port: 3001
✅ MCP SSE server listening on port 3001
   SSE endpoint: http://localhost:3001/sse
   Message endpoint: http://localhost:3001/messages
   Health check: http://localhost:3001/health
```

### Test health endpoint:

```bash
curl http://localhost:3001/health
```

```json
{"status":"ok","uptime":5.23,"activeConnections":0,"serverName":"github-issue-manager","serverVersion":"1.0.1","timestamp":"2026-06-09T01:00:00.000Z"}
```

### Test with MCP Inspector over SSE:

```bash
npx @modelcontextprotocol/inspector -e http://localhost:3001/sse
```

This connects the inspector to your SSE endpoint. No subprocess spawning — it communicates over HTTP.

### Test raw SSE protocol (two terminals):

**Terminal 1 — Connect to SSE stream:**
```bash
curl -N http://localhost:3001/sse
```

Output:
```
event: endpoint
data: /messages?sessionId=abc123def456

event: initialized
```

**Terminal 2 — Send a JSON-RPC message:**
```bash
curl -X POST "http://localhost:3001/messages?sessionId=abc123def456" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'
```

**Back in Terminal 1**, you'll see the response event:
```
event: message
data: {"jsonrpc":"2.0","id":1,"result":{"tools":[{"name":"list_issues",...}]}}
```

This is exactly the protocol that Claude Desktop uses.

## Step 6: Dockerize

### Dockerfile (multi-stage build):

```dockerfile
# ──── Stage 1: Build ────
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json tsconfig.json ./
RUN npm ci
COPY src/ ./src/
RUN npm run build
RUN npm prune --production

# ──── Stage 2: Runtime ────
FROM node:20-alpine AS runtime
WORKDIR /app

# Security: create non-root user
RUN addgroup -S mcp && adduser -S mcp -G mcp

COPY --from=builder /app/build ./build
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

USER mcp

ENV PORT=3001 NODE_ENV=production
EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:${PORT}/health || exit 1

CMD ["node", "build/server.js"]
```

### .dockerignore:
```
node_modules
build
.git
*.md
src
.env*
```

### Build & run:
```bash
docker build -t github-issue-mcp .
docker run -d --name github-issue-mcp -p 3001:3001 -e GITHUB_TOKEN="ghp_..." github-issue-mcp
docker logs -f github-issue-mcp
```

### Docker Compose:
```yaml
version: "3.8"
services:
  mcp-server:
    build: .
    container_name: github-issue-mcp
    ports:
      - "127.0.0.1:3001:3001"
    environment:
      - GITHUB_TOKEN=${GITHUB_TOKEN}
    healthcheck:
      test: ["CMD", "wget", "--spider", "http://localhost:3001/health"]
      interval: 30s
      timeout: 3s
      retries: 3
    restart: unless-stopped
    read_only: true
    cap_drop:
      - ALL
```

## Step 7: Connect Claude Desktop Remotely

```json
{
  "mcpServers": {
    "github-issue-manager": {
      "type": "sse",
      "url": "https://mcp.example.com/sse"
    }
  }
}
```

Restart Claude Desktop. The hammer icon appears, and all tools/resources/prompts are available over the network.

---

## What You Learned

| Concept | In Practice |
|---------|-------------|
| SSE Transport | `SSEServerTransport` + Express.js HTTP server |
| Session management | `Map<sessionId, transport>` with cleanup on close |
| Multi-client | Each GET /sse gets its own session |
| Health checks | `GET /health` endpoint for Docker/K8s |
| Docker multi-stage | Build stage + runtime stage with non-root user |
| Remote Claude Desktop | `type: "sse"` config instead of stdio command |

---

| Day | Topic | Status |
|-----|-------|--------|
| 1 | Setup & Architecture | ✅ |
| 2 | Resources, Prompts & Advanced Tools | ✅ |
| 3 | **SSE Transport & Docker** | ✅ **Done** |
| 4 | Authentication & Production Hardening | Coming next |
| 5 | Testing, Publishing & Ecosystem | — |

---

*Series: Building an MCP Server from Scratch. Day 3: SSE transport, Express.js server, multi-client sessions, and Docker deployment.*
