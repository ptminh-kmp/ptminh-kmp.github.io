---
title: "Build MCP Server từ Scratch — Day 3: SSE Transport & Docker Deployment"
description: "Đưa MCP server từ localhost ra remote. Full SSE transport với Express.js, Docker multi-stage, session management, health checks, Inspector over SSE, và kết nối Claude Desktop từ xa."
published: 2026-06-09
pubDate: 2026-06-09T01:15:00.000Z
slug: build-mcp-server-from-scratch-day3-sse-transport-docker-deployment-vi
tags:
  - mcp
  - tutorial
  - sse
  - docker
  - typescript
  - deployment
  - express
category: ai-agents
lang: vi
series:
  name: "Building an MCP Server from Scratch"
  order: 3
  total: 5
---

Hiện tại MCP server của chúng ta chỉ chạy localhost qua stdio. Claude Desktop launch server như child process, chúng nói chuyện qua stdin/stdout — ổn nếu bạn chỉ dùng một máy.

Nhưng production MCP servers cần **remote**. Bạn muốn một MCP server phục vụ nhiều agents/users cùng lúc. Deploy lên VPS, Docker, K8s. Có health checks, restart policies, log aggregation.

Cần chuyển từ **stdio** sang **SSE (Server-Sent Events)** transport.

---

## SSE Transport Flow

```
Client              Server (Express.js)
  │                      │
  ├── GET /sse ─────────►│  Mở SSE stream
  │                      ├── event: endpoint /messages?sessionId=xxx
  │◄═════════════════════┤  Push events qua stream
  │                      │
  ├── POST /messages ───►│  Gửi JSON-RPC message
  │   ?sessionId=xxx     │
  │◄── SSE: result ──────┤  Response qua stream
```

1. Client mở `GET /sse` → server giữ connection open
2. Server gửi `endpoint` event với session ID
3. Client POST JSON-RPC lên `/messages?sessionId=xxx`
4. Server push response qua SSE stream

---

## Cài Đặt

```bash
cd github-issue-mcp
npm install express
npm install -D @types/express
```

## SSE Server Module

`src/sse-server.ts` — quản lý transport lifecycle cho nhiều concurrent clients:

```typescript
import express from "express";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export function createSSEServer(mcpServer: McpServer, port: number = 3001) {
  const app = express();
  const transports: Map<string, SSEServerTransport> = new Map();

  // ──── SSE endpoint ────
  app.get("/sse", async (req, res) => {
    const transport = new SSEServerTransport("/messages", res);
    transports.set(transport.sessionId, transport);

    res.on("close", () => {
      transports.delete(transport.sessionId);
      console.error(`[SSE] Closed: ${transport.sessionId}`);
    });

    await mcpServer.connect(transport);
  });

  // ──── Message endpoint ────
  app.post("/messages", express.json(), async (req, res) => {
    const sessionId = req.query.sessionId as string;
    const transport = transports.get(sessionId);
    if (!transport) {
      res.status(404).json({ error: "Session not found" });
      return;
    }
    await transport.handlePostMessage(req, res);
  });

  // ──── Health check ────
  app.get("/health", (req, res) => {
    res.json({ status: "ok", uptime: process.uptime(), activeConnections: transports.size });
  });

  return app.listen(port, () => {
    console.error(`✅ MCP SSE server on port ${port}`);
    console.error(`   SSE: http://localhost:${port}/sse`);
  });
}
```

Giải thích:
- **`GET /sse`**: Client mở kết nối HTTP long-lived. `SSEServerTransport` giữ response object để push events.
- **`POST /messages`**: Client gửi JSON-RPC. `sessionId` query param route đến đúng transport.
- **Session management**: `Map<sessionId, transport>`. Khi client disconnect, `close` event cleanup.
- **`GET /health`**: Cho Docker HEALTHCHECK.

## Entry Point (src/server.ts)

Tương tự `src/index.ts` từ Day 1+2 nhưng gọi `createSSEServer(server, PORT)` thay vì `StdioServerTransport`.

## Build & Test

```bash
npm run build
export GITHUB_TOKEN="ghp_your_token_here"
node build/server.js
```

### Health check:
```bash
curl http://localhost:3001/health
# {"status":"ok","uptime":5.23,"activeConnections":0,"serverName":"github-issue-manager"}
```

### Inspector over SSE:
```bash
npx @modelcontextprotocol/inspector -e http://localhost:3001/sse
```

### Raw SSE test (2 terminals):

Terminal 1:
```bash
curl -N http://localhost:3001/sse
# event: endpoint
# data: /messages?sessionId=abc123
```

Terminal 2:
```bash
curl -X POST "http://localhost:3001/messages?sessionId=abc123" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'
```

Terminal 1 sẽ nhận response event — đây là cách Claude Desktop giao tiếp với MCP server.

---

## Docker

### Dockerfile (multi-stage):
```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json tsconfig.json ./
RUN npm ci && npm run build && npm prune --production

FROM node:20-alpine
WORKDIR /app
RUN addgroup -S mcp && adduser -S mcp -G mcp
COPY --from=builder /app/build ./build
COPY --from=builder /app/node_modules ./node_modules
USER mcp
ENV PORT=3001
EXPOSE 3001
HEALTHCHECK CMD wget --spider http://localhost:3001/health || exit 1
CMD ["node", "build/server.js"]
```

### Build & run:
```bash
docker build -t github-issue-mcp .
docker run -d -p 3001:3001 -e GITHUB_TOKEN="ghp_..." github-issue-mcp
```

### Docker Compose:
```yaml
services:
  mcp-server:
    build: .
    ports:
      - "127.0.0.1:3001:3001"
    environment:
      - GITHUB_TOKEN=${GITHUB_TOKEN}
    restart: unless-stopped
    read_only: true
```

---

## Connect Claude Desktop từ xa

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

Restart Claude Desktop → hammer icon → tools/resources/prompts available over network.

---

## Kết Quả

Server giờ chạy trên HTTP, có health check, Docker multi-stage build (150MB → 120MB final image), hỗ trợ nhiều concurrent clients.

---

| Day | Chủ đề | Status |
|-----|--------|--------|
| 1 | Setup & Architecture | ✅ |
| 2 | Resources, Prompts & Advanced Tools | ✅ |
| 3 | **SSE Transport & Docker** | ✅ **Done** |
| 4 | Authentication & Production Hardening | Next |
| 5 | Testing, Publishing & Ecosystem | — |

---

*Series: Building an MCP Server from Scratch. Day 3: SSE transport và Docker deployment.*
