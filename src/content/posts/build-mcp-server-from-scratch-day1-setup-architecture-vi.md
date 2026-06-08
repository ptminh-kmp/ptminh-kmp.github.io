---
title: "Build MCP Server từ Scratch — Day 1: Setup & Architecture (Node.js + TypeScript)"
description: "Hướng dẫn từng bước: Build MCP server đầu tiên từ số 0. Tìm hiểu MCP protocol architecture, server lifecycle, project setup với Node.js/TypeScript, tool đầu tiên và test với MCP Inspector."
published: 2026-06-08
pubDate: 2026-06-08T01:50:00.000Z
slug: build-mcp-server-from-scratch-day1-setup-architecture-vi
tags:
  - mcp
  - tutorial
  - typescript
  - nodejs
  - mcp-server
  - tool-building
  - step-by-step
category: ai-agents
lang: vi
series:
  name: "Building an MCP Server from Scratch"
  order: 1
  total: 5
---

MCP servers là infrastructure hot nhất hiện tại. Mỗi tuần có server mới: GitHub MCP, Figma MCP, PostgreSQL MCP. Nhưng đa số dev dùng chúng. Ít người build.

Series này thay đổi điều đó.

Qua 5 bài, bạn sẽ build một production-grade MCP server từ số 0. Không phải weather demo — server thực tế làm việc có ích. Mỗi bài kết thúc với code chạy được. Đến day 5, bạn có deployed, authenticated MCP server cắm vào Claude Desktop, Cursor hay bất kỳ MCP client nào.

---

## Chúng Ta Sẽ Build Gì?

**GitHub Issue Manager MCP server** — AI agent có thể:

- List issues trong repository
- Create issue với labels và assignees
- Search issues theo query
- Get issue details và comments
- Update issue status

---

## Kiến Trúc MCP

MCP dùng **JSON-RPC 2.0** — protocol nhẹ, client gửi request, server trả response.

| Capability | Ý nghĩa | JSON-RPC Method |
|-----------|---------|----------------|
| **Tools** | Functions LLM có thể gọi | `tools/call` |
| **Resources** | Data LLM có thể đọc | `resources/read` |
| **Prompts** | Templates user có thể invoke | `prompts/get` |

### Server Lifecycle

```
1. Client start server process (hoặc connect qua SSE)
2. Client gửi initialize → server trả capabilities
3. Client gửi initialized notification
4. Client gửi tools/list → server trả danh sách tools
5. Client gửi tools/call với tool name + args → server execute
6. Client terminate → server shutdown
```

---

## Project Setup

```bash
mkdir github-issue-mcp
cd github-issue-mcp

npm init -y
npm install @modelcontextprotocol/sdk zod
npm install -D typescript @types/node

mkdir src
```

`tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "Node16",
    "moduleResolution": "Node16",
    "outDir": "./build",
    "rootDir": "./src",
    "strict": true
  },
  "include": ["src/**/*"]
}
```

---

## Entry Point

`src/index.ts`:

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

const server = new McpServer({
  name: "github-issue-manager",
  version: "1.0.0",
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("✅ Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
```

**⚠️ Quan trọng:** Dùng `console.error()`, không dùng `console.log()`. Với stdio server, stdout mang JSON-RPC protocol. `console.log()` làm hỏng messages.

---

## 5 Tools Chính

### list_issues
```typescript
server.tool(
  "list_issues",
  "List issues from a GitHub repo",
  {
    owner: z.string(),
    repo: z.string(),
    state: z.enum(["open", "closed", "all"]).default("open"),
    limit: z.number().min(1).max(100).default(20),
  },
  async ({ owner, repo, state, limit }) => {
    const issues = await github.listIssues(owner, repo, state, limit);
    return { content: [{ type: "text", text: formatted }] };
  },
);
```

### Tương tự: get_issue, create_issue, update_issue, search_issues

Mỗi tool có Zod schema validation, error handling, formatted output.

---

## Build & Test

```bash
npm run build

export GITHUB_TOKEN="ghp_your_token_here"

# Test với MCP Inspector (GUI)
npx @modelcontextprotocol/inspector node build/index.js
```

Mở `http://localhost:5173` → thấy 5 tools sẵn sàng.

### Connect với Claude Desktop

```json
{
  "mcpServers": {
    "github-issue-manager": {
      "command": "node",
      "args": ["/path/to/build/index.js"],
      "env": { "GITHUB_TOKEN": "ghp_your_token_here" }
    }
  }
}
```

Hỏi Claude: *"Show me open issues in ptminh-kmp/ptminh-kmp.github.io"*

---

## Kết Quả

Bạn vừa build MCP server production-ready:
- 5 tools (list, get, create, update, search)
- MCP SDK + Zod type safety
- stdio transport
- Error handling
- Testable với Inspector và Claude Desktop

~250 dòng TypeScript. SDK handle hết JSON-RPC protocol.

---

## Chuẩn Bị Cho Day 2

Hiện tại server chỉ chạy stdio (cùng máy với client).

**Ngày mai:** Thêm **Resources** (đọc comments như content) và **Prompts** (templates cho issue workflows).

---

| Day | Chủ đề | Status |
|-----|--------|--------|
| 1 | Setup & Architecture | ✅ **Done** |
| 2 | Resources, Prompts & Advanced Tools | Coming next |
| 3 | SSE Transport & Remote Deployment | — |
| 4 | Authentication & Production Hardening | — |
| 5 | Testing, Publishing & Ecosystem | — |

---

*Series: Building an MCP Server from Scratch. Day 1: Setup và tools đầu tiên.*
