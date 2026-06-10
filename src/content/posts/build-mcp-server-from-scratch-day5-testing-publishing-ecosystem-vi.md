---
title: "Build MCP Server từ Scratch — Day 5: Testing, Publishing & Ecosystem"
description: "Test MCP server với Vitest, CI/CD với GitHub Actions, publish lên npm, đăng ký trên MCP directories, và map toàn bộ ecosystem MCP."
published: 2026-06-10
pubDate: 2026-06-10T05:00:00.000Z
slug: build-mcp-server-from-scratch-day5-testing-publishing-ecosystem-vi
tags:
  - mcp
  - testing
  - vitest
  - npm
  - publishing
  - ecosystem
  - tutorial
  - typescript
category: ai-agents
lang: vi
series:
  name: "Building an MCP Server from Scratch"
  order: 5
  total: 5
---

Day 1 → 4 cho MCP server hoàn chỉnh, production-ready. Day 5: **test, publish, và ecosystem**.

---

## Hôm nay làm gì?

| Layer | Nội dung |
|-------|----------|
| Unit tests | Auth, rate limiter, CORS, env validation |
| Integration tests | Test MCP server qua stdio + JSON-RPC |
| GitHub Actions | CI pipeline tự động |
| npm publish | Package server để ai cũng dùng được |
| MCP directories | Đăng ký lên smithery.ai, mcp.so |
| Ecosystem map | Clients, SDKs, servers đáng biết |

---

## Step 1: Cài Test Dependencies

```bash
cd github-issue-mcp
npm install --save-dev vitest @types/node tsx
```

`vitest.config.ts`:

```typescript
import { defineConfig } from "vitest/config";
export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.test.ts"],
    coverage: { provider: "v8", include: ["src/**/*.ts"], exclude: ["src/**/*.test.ts"] },
  },
});
```

`package.json` scripts:

```json
{
  "scripts": {
    "build": "tsc",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "start": "node build/server.js"
  }
}
```

---

## Step 2: Unit Tests

### `src/auth.test.ts` — Test Auth Service

```typescript
import { describe, it, expect, beforeEach, vi } from "vitest";
import { AuthService } from "./auth";

describe("AuthService", () => {
  beforeEach(() => vi.unstubAllEnvs());

  it("dev mode — generate key, 401 if missing header", () => {
    const auth = new AuthService();
    const mw = auth.middleware();
    const req = { headers: {} } as any;
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any;
    const next = vi.fn();
    mw(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("accept valid keys from AUTH_KEYS", () => {
    vi.stubEnv("AUTH_KEYS", "sk-a,sk-b");
    const auth = new AuthService();
    expect(auth.validate("sk-a")).toBe(true);
    expect(auth.validate("sk-c")).toBe(false);
  });

  it("reject wrong key via middleware", () => {
    vi.stubEnv("AUTH_KEYS", "sk-valid");
    const auth = new AuthService();
    const req = { headers: { "x-api-key": "sk-wrong" } } as any;
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any;
    const next = vi.fn();
    auth.middleware()(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it("pass valid key, set req.apiKey", () => {
    vi.stubEnv("AUTH_KEYS", "sk-valid");
    const auth = new AuthService();
    const req = { headers: { "x-api-key": "sk-valid" } } as any;
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any;
    const next = vi.fn();
    auth.middleware()(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(req.apiKey).toBe("sk-valid");
  });
});
```

### `src/rate-limit.test.ts` — Test Rate Limiter

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { RateLimiter } from "./rate-limit";

describe("RateLimiter", () => {
  let rl: RateLimiter;
  beforeEach(() => { rl = new RateLimiter(5, 1000); });

  it("allow up to limit", () => {
    for (let i = 0; i < 5; i++) expect(rl.check("k1")).toBe(true);
  });

  it("block after limit", () => {
    for (let i = 0; i < 5; i++) rl.check("k1");
    expect(rl.check("k1")).toBe(false);
  });

  it("separate buckets per key", () => {
    for (let i = 0; i < 5; i++) { rl.check("a"); rl.check("b"); }
    expect(rl.check("a")).toBe(false);
    expect(rl.check("b")).toBe(false);
    expect(rl.check("c")).toBe(true); // fresh key
  });
});
```

### Chạy test:

```bash
npm test
```

```
✓ AuthService > dev mode — generate key, 401 if missing header
✓ AuthService > accept valid keys from AUTH_KEYS
✓ AuthService > reject wrong key via middleware
✓ AuthService > pass valid key, set req.apiKey
✓ RateLimiter > allow up to limit
✓ RateLimiter > block after limit
✓ RateLimiter > separate buckets per key
✓ CORS > ...
✓ env > ...
✓ Integration > respond to initialize
✓ Integration > list tools (7)
✓ Integration > list prompts (3)
```

---

## Step 3: GitHub Actions CI

`.github/workflows/ci.yml`:

```yaml
name: CI
on:
  push: { branches: [main] }
  pull_request: { branches: [main] }

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [18, 20, 22]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: "npm"
      - run: npm ci
      - run: npm run build
      - run: npm test
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

  docker:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      - run: docker build -t github-issue-mcp .
```

---

## Step 4: Publish lên npm

### Chuẩn bị `package.json`:

```json
{
  "name": "github-issue-mcp",
  "version": "1.0.2",
  "description": "MCP server for GitHub issue management",
  "type": "module",
  "bin": { "github-issue-mcp": "./build/server.js" },
  "files": ["build/", "README.md"],
  "keywords": ["mcp", "github", "issues", "model-context-protocol", "ai"],
  "license": "MIT"
}
```

### Publish:

```bash
npm login
npm publish --access public
```

### Dùng với Claude Desktop:

```json
{
  "mcpServers": {
    "github-issue-manager": {
      "command": "npx",
      "args": ["-y", "github-issue-mcp"],
      "env": { "GITHUB_TOKEN": "ghp_...", "AUTH_KEYS": "sk-mcp-dev" }
    }
  }
}
```

---

## Step 5: Đăng ký trên MCP Directories

| Directory | URL | Cách đăng ký |
|-----------|-----|-------------|
| **Smithery** | smithery.ai | Form, cung cấp npm name + env vars |
| **MCP.so** | mcp.so | Submit GitHub URL |
| **PulseMCP** | pulsemcp.com | Manual request |
| **OpenTools** | opentools.ai/mcp | Tự detect từ npm |

---

## Step 6: Ecosystem Map

### Clients hỗ trợ MCP

| Client | Type | Notes |
|--------|------|-------|
| Claude Desktop | Desktop | MCP-native |
| Claude Code | CLI | Stdio transport |
| VS Code (Cline, Continue) | IDE | Code actions |
| OpenAI Agents SDK | SDK | Tool discovery |

### SDKs

| SDK | Language | Notes |
|-----|----------|-------|
| `@modelcontextprotocol/sdk` | TS | Official |
| `mcp-python-sdk` | Python | Official |
| `mcp-go-sdk` | Go | Community |

### Hosting

| Cách | Pros |
|------|------|
| `npx` (stdio) | Không cần setup |
| Docker (SSE) | Portable |
| Fly.io / Railway | Global, managed |

---

## Step 7: Production Readiness Checklist

```markdown
- [ ] GITHUB_TOKEN minimal scopes
- [ ] AUTH_KEYS configured
- [ ] Rate limiting enabled
- [ ] CORS restricted
- [ ] Read-only filesystem (Docker)
- [ ] Non-root user in container
- [ ] Graceful shutdown
- [ ] Health check endpoint
- [ ] CI passes
- [ ] README updated
```

---

## Series Summary

| Day | Chủ đề | Nội dung |
|-----|--------|---------|
| 1 | Setup & Architecture | 5 tools, StdioServerTransport, Inspector |
| 2 | Resources, Prompts & Advanced Tools | 3 resources, 3 prompts, pagination, batch |
| 3 | SSE Transport & Docker | Express.js, session management, multi-stage build |
| 4 | Auth & Production Hardening | API key, rate limit, CORS, graceful shutdown |
| 5 | **Testing, Publishing & Ecosystem** | Vitest, CI, npm, MCP directories |

### Những gì đã build:

```
📁 github-issue-mcp v1.0.2
├── 🛠 7 tools · 📄 3 resources · 💬 3 prompts
├── 🔒 API key auth + rate limiting + CORS
├── 🐳 Docker (multi-stage, non-root, read-only)
├── ✅ 10+ unit tests + integration tests
└── 📦 npm package + MCP directories
```

---

*Series: Building an MCP Server from Scratch. Hoàn thành 5 ngày từ zero → production-ready MCP server.*
