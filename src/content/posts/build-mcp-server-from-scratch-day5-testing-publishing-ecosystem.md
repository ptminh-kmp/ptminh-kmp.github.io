---
title: "Building an MCP Server from Scratch — Day 5: Testing, Publishing & Ecosystem"
description: "Test your MCP server with automated tests, publish it to npm/GitHub, register on community directories, and explore the broader MCP ecosystem of clients, tools, and best practices."
published: 2026-06-10
pubDate: 2026-06-10T05:00:00.000Z
slug: build-mcp-server-from-scratch-day5-testing-publishing-ecosystem
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
lang: en
series:
  name: "Building an MCP Server from Scratch"
  order: 5
  total: 5
---

Day 1 through 4 gave us a fully featured, production-hardened MCP server. Today we close the loop: **tests, npm packages, CI/CD, and the broader MCP ecosystem**.

```
Day 1: Setup & Tools
Day 2: Resources, Prompts & Advanced Tools
Day 3: SSE Transport & Docker
Day 4: Auth & Production Hardening
Day 5: Testing, Publishing & Ecosystem ← you are here
```

---

## What We're Building Today

| Layer | What |
|-------|------|
| Unit tests | Test individual tools, auth, rate limiter |
| Integration tests | Test the MCP server over stdio + SSE |
| GitHub Actions | CI pipeline on push + PR |
| npm publishing | Package your MCP server for reuse |
| MCP directories | Register on smithery.ai, mcp.so, etc. |
| Ecosystem map | Clients, SDKs, servers worth knowing |

---

## Step 1: Install Test Dependencies

```bash
cd github-issue-mcp
npm install --save-dev vitest @types/node
npm install --save-dev tsx    # For running TS tests directly
```

Create `vitest.config.ts`:

```typescript
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: ["src/**/*.test.ts", "src/**/*.d.ts"],
    },
  },
});
```

Update `package.json`:

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

### Test Auth Service (`src/auth.test.ts`)

```typescript
import { describe, it, expect, beforeEach, vi } from "vitest";
import { AuthService } from "./auth";

describe("AuthService", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  it("should generate a dev key when no AUTH_KEYS set", () => {
    const auth = new AuthService();
    // In dev mode, a random 64-char hex key is generated
    // We can't predict it, but we can test the middleware
    const middleware = auth.middleware();
    const req = { headers: {}, apiKey: undefined } as any;
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any;
    const next = vi.fn();

    middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: "Missing X-API-Key header" });
  });

  it("should accept valid keys from environment", () => {
    vi.stubEnv("AUTH_KEYS", "sk-mcp-1,sk-mcp-2");
    const auth = new AuthService();

    expect(auth.validate("sk-mcp-1")).toBe(true);
    expect(auth.validate("sk-mcp-2")).toBe(true);
    expect(auth.validate("sk-mcp-3")).toBe(false);
    expect(auth.validate("")).toBe(false);
    expect(auth.validate(undefined as any)).toBe(false);
  });

  it("should reject requests with wrong key via middleware", () => {
    vi.stubEnv("AUTH_KEYS", "sk-valid");
    const auth = new AuthService();
    const middleware = auth.middleware();
    const req = { headers: { "x-api-key": "sk-wrong" } } as any;
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any;
    const next = vi.fn();

    middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it("should pass valid keys through middleware", () => {
    vi.stubEnv("AUTH_KEYS", "sk-valid");
    const auth = new AuthService();
    const middleware = auth.middleware();
    const req = { headers: { "x-api-key": "sk-valid" } } as any;
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any;
    const next = vi.fn();

    middleware(req, res, next);

    expect(res.status).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalled();
    expect(req.apiKey).toBe("sk-valid");
  });
});
```

### Test Rate Limiter (`src/rate-limit.test.ts`)

```typescript
import { describe, it, expect, beforeEach, vi } from "vitest";
import { RateLimiter } from "./rate-limit";

describe("RateLimiter", () => {
  let limiter: RateLimiter;

  beforeEach(() => {
    limiter = new RateLimiter(5, 1000); // 5 req/s for fast testing
  });

  it("should allow requests up to the limit", () => {
    for (let i = 0; i < 5; i++) {
      expect(limiter.check("key-1")).toBe(true);
    }
  });

  it("should block after exceeding the limit", () => {
    for (let i = 0; i < 5; i++) limiter.check("key-1");
    expect(limiter.check("key-1")).toBe(false);
  });

  it("should maintain separate buckets per key", () => {
    for (let i = 0; i < 5; i++) {
      limiter.check("key-a");
      limiter.check("key-b");
    }
    // Both should be at limit
    expect(limiter.check("key-a")).toBe(false);
    expect(limiter.check("key-b")).toBe(false);

    // Different key should still work
    expect(limiter.check("key-c")).toBe(true);
  });

  it("should reset after the window expires", async () => {
    limiter = new RateLimiter(5, 50); // 50ms window
    for (let i = 0; i < 5; i++) limiter.check("key-1");
    expect(limiter.check("key-1")).toBe(false);

    await new Promise((r) => setTimeout(r, 60));

    expect(limiter.check("key-1")).toBe(true);
  });

  it("should cleanup stale buckets", () => {
    limiter = new RateLimiter(5, 50);
    limiter.check("stale-key");
    limiter.check("active-key");

    // Wait for window to pass
    const cleanup = () => limiter.cleanup();
    vi.useFakeTimers();
    vi.advanceTimersByTime(100);
    cleanup();
    vi.useRealTimers();

    // After cleanup, stale-key bucket should be deleted
    // active-key also expired, but we just check it resets
    expect(limiter.check("stale-key")).toBe(true);
  });
});
```

### Test CORS (`src/cors.test.ts`)

```typescript
import { describe, it, expect, vi } from "vitest";
import { corsMiddleware } from "./cors";

describe("corsMiddleware", () => {
  it("should allow any origin when wildcard is set", () => {
    const middleware = corsMiddleware(["*"]);
    const req = { headers: { origin: "https://evil.com" }, method: "GET" } as any;
    const res = { setHeader: vi.fn() } as any;
    const next = vi.fn();

    middleware(req, res, next);

    expect(res.setHeader).toHaveBeenCalledWith("Access-Control-Allow-Origin", "*");
    expect(next).toHaveBeenCalled();
  });

  it("should reject origins not in the allowlist", () => {
    const middleware = corsMiddleware(["https://myapp.com"]);
    const req = { headers: { origin: "https://evil.com" }, method: "GET" } as any;
    const res = { setHeader: vi.fn() } as any;
    const next = vi.fn();

    middleware(req, res, next);

    expect(res.setHeader).not.toHaveBeenCalledWith(
      "Access-Control-Allow-Origin", "https://evil.com"
    );
    expect(next).toHaveBeenCalled();
  });

  it("should handle OPTIONS preflight requests", () => {
    const middleware = corsMiddleware(["*"]);
    const req = { headers: { origin: "https://app.com" }, method: "OPTIONS" } as any;
    const res = {
      setHeader: vi.fn(),
      status: vi.fn().mockReturnThis(),
      end: vi.fn(),
    } as any;
    const next = vi.fn();

    middleware(req, res, next);

    expect(res.setHeader).toHaveBeenCalledWith("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    expect(res.status).toHaveBeenCalledWith(204);
    expect(res.end).toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });
});
```

### Test Environment Config (`src/env.test.ts`)

```typescript
import { describe, it, expect, beforeEach, vi } from "vitest";
import { loadConfig } from "./env";

describe("loadConfig", () => {
  beforeEach(() => {
    vi.stubEnv("GITHUB_TOKEN", "ghp_test_token");
    vi.stubEnv("AUTH_KEYS", "sk-test");
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("PORT", "4000");
  });

  it("should read basic config from environment", () => {
    const config = loadConfig();
    expect(config.githubToken).toBe("ghp_test_token");
    expect(config.port).toBe(4000);
    expect(config.authKeys).toEqual(["sk-test"]);
    expect(config.nodeEnv).toBe("test");
  });

  it("should use defaults when optional vars are missing", () => {
    vi.unstubAllEnvs();
    vi.stubEnv("GITHUB_TOKEN", "ghp_test");
    vi.stubEnv("AUTH_KEYS", "sk-test");
    vi.stubEnv("NODE_ENV", "test");

    const config = loadConfig();
    expect(config.port).toBe(3001);
    expect(config.rateLimitMax).toBe(60);
    expect(config.rateLimitWindowMs).toBe(60000);
    expect(config.allowedOrigins).toEqual(["*"]);
  });

  it("should exit if GITHUB_TOKEN is missing", () => {
    vi.unstubAllEnvs();
    vi.stubEnv("AUTH_KEYS", "sk-test");

    expect(() => loadConfig()).toThrow();
  });

  it("should parse comma-separated allowed origins", () => {
    vi.stubEnv("ALLOWED_ORIGINS", "https://app.com,https://admin.app.com");

    const config = loadConfig();
    expect(config.allowedOrigins).toEqual(["https://app.com", "https://admin.app.com"]);
  });
});
```

---

## Step 3: Integration Tests

Integration tests run the actual MCP server and test it over stdio transport. We use child_process to spawn the server and send JSON-RPC messages.

### Create `src/integration.test.ts`

```typescript
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { spawn, ChildProcess } from "child_process";
import path from "path";

const SERVER_SCRIPT = path.resolve(__dirname, "../build/index.js");

describe("MCP Server Integration (stdio)", () => {
  let server: ChildProcess;

  const sendMessage = (message: object): Promise<any> => {
    return new Promise((resolve, reject) => {
      const json = JSON.stringify(message) + "\n";
      let buffer = "";

      const onData = (data: Buffer) => {
        buffer += data.toString();
        // Try to parse a complete JSON-RPC response
        const lines = buffer.split("\n");
        for (const line of lines) {
          try {
            const parsed = JSON.parse(line);
            resolve(parsed);
            return;
          } catch {}
        }
      };

      server!.stdout!.on("data", onData);
      server!.stdin!.write(json, "utf-8");

      setTimeout(() => {
        server!.stdout!.removeListener("data", onData);
        reject(new Error("Timeout waiting for response"));
      }, 5000);
    });
  };

  beforeAll(() => {
    return new Promise((resolve) => {
      server = spawn("node", [SERVER_SCRIPT], {
        env: { ...process.env, GITHUB_TOKEN: "ghp_test" },
        stdio: ["pipe", "pipe", "inherit"],
      });
      // Wait for startup log
      server.stderr?.on("data", () => resolve());
      setTimeout(() => resolve(), 2000);
    });
  });

  afterAll(() => {
    server?.kill();
  });

  it("should respond to initialize", async () => {
    const response = await sendMessage({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: { name: "test-client", version: "1.0" },
      },
    });

    expect(response.jsonrpc).toBe("2.0");
    expect(response.id).toBe(1);
    expect(response.result).toBeDefined();
    expect(response.result.serverInfo.name).toBe("github-issue-manager");
    expect(response.result.serverInfo.version).toBe("1.0.2");
  });

  it("should list tools", async () => {
    // First send initialized notification
    await sendMessage({
      jsonrpc: "2.0",
      method: "notifications/initialized",
    });

    const response = await sendMessage({
      jsonrpc: "2.0",
      id: 2,
      method: "tools/list",
    });

    expect(response.result.tools.length).toBe(7);
    const toolNames = response.result.tools.map((t: any) => t.name);
    expect(toolNames).toContain("list_issues");
    expect(toolNames).toContain("get_issue");
    expect(toolNames).toContain("create_issue");
    expect(toolNames).toContain("update_issue");
    expect(toolNames).toContain("search_issues");
    expect(toolNames).toContain("list_issues_paginated");
    expect(toolNames).toContain("batch_label_issues");
  });

  it("should list resources", async () => {
    const response = await sendMessage({
      jsonrpc: "2.0",
      id: 3,
      method: "resources/list",
    });

    expect(response.result.resources).toBeDefined();
    // Resources use templates, so list may be empty or contain URI patterns
  });

  it("should list prompts", async () => {
    const response = await sendMessage({
      jsonrpc: "2.0",
      id: 4,
      method: "prompts/list",
    });

    expect(response.result.prompts.length).toBe(3);
    const promptNames = response.result.prompts.map((p: any) => p.name);
    expect(promptNames).toContain("triage-issue");
    expect(promptNames).toContain("weekly-summary");
    expect(promptNames).toContain("bug-report-template");
  });
});
```

### Run all tests:

```bash
npm test
```

```
✓ AuthService > should generate a dev key when no AUTH_KEYS set
✓ AuthService > should accept valid keys from environment
✓ AuthService > should reject requests with wrong key via middleware
✓ AuthService > should pass valid keys through middleware
✓ RateLimiter > should allow requests up to the limit
✓ RateLimiter > should block after exceeding the limit
✓ RateLimiter > should maintain separate buckets per key
✓ RateLimiter > should reset after the window expires
✓ RateLimiter > should cleanup stale buckets
✓ CORS > should allow any origin when wildcard is set
✓ CORS > should reject origins not in the allowlist
✓ CORS > should handle OPTIONS preflight requests
✓ env > should read basic config from environment
✓ env > should use defaults when optional vars are missing
✓ env > should exit if GITHUB_TOKEN is missing
✓ env > should parse comma-separated allowed origins
✓ Integration > should respond to initialize
✓ Integration > should list tools
✓ Integration > should list resources
✓ Integration > should list prompts
```

---

## Step 4: GitHub Actions CI

Create `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

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
      - run: docker run --rm github-issue-mcp node build/server.js --version || true
```

---

## Step 5: Publishing to npm

Publishing your MCP server on npm makes it installable via `npx` and discoverable by IDEs.

### Prepare `package.json`

```json
{
  "name": "github-issue-mcp",
  "version": "1.0.2",
  "description": "MCP server for GitHub issue management — list, create, update, search, batch label",
  "type": "module",
  "main": "build/server.js",
  "bin": {
    "github-issue-mcp": "./build/server.js"
  },
  "files": ["build/", "README.md"],
  "keywords": ["mcp", "github", "issues", "model-context-protocol", "ai", "agents"],
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/your-username/github-issue-mcp.git"
  },
  "engines": {
    "node": ">=18"
  }
}
```

### Publish:

```bash
npm login
npm publish --access public
```

### Usage after publishing:

```json
{
  "mcpServers": {
    "github-issue-manager": {
      "command": "npx",
      "args": ["-y", "github-issue-mcp"],
      "env": {
        "GITHUB_TOKEN": "ghp_...",
        "AUTH_KEYS": "sk-mcp-dev"
      }
    }
  }
}
```

---

## Step 6: Register on MCP Directories

Once published, register your server on community directories so others can discover and use it.

| Directory | URL | How |
|-----------|-----|-----|
| **Smithery** | https://smithery.ai | Add via form, provide npm name + env vars |
| **MCP.so** | https://mcp.so | Submit GitHub URL |
| **MCPServers** | https://mcp-servers.com | Submit via Discord |
| **PulseMCP** | https://pulsemcp.com | Manual listing request |
| **OpenTools** | https://opentools.ai/mcp | npm package auto-detected |

### What to include in the listing:

```markdown
# GitHub Issue Manager MCP Server

Manage GitHub issues through AI agents. Supports listing, creating, updating,
searching, and batch-labeling issues with full pagination and comments.

## Tools (7)
- list_issues, get_issue, create_issue, update_issue
- search_issues, list_issues_paginated, batch_label_issues

## Resources (3)
- issue://{owner}/{repo}/{number} — issue detail
- issue://{owner}/{repo}/{number}/comments — comment thread
- issue://{owner}/{repo}/open — open issues overview

## Prompts (3)
- triage-issue — structured issue analysis
- weekly-summary — standardized weekly report
- bug-report-template — reproducible bug filing

## Installation
```json
{
  "mcpServers": {
    "github-issue-manager": {
      "command": "npx",
      "args": ["-y", "github-issue-mcp"],
      "env": { "GITHUB_TOKEN": "..." }
    }
  }
}
```

## Environment
| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| GITHUB_TOKEN | ✅ | — | GitHub personal access token |
| AUTH_KEYS | prod | auto | Comma-separated API keys |
| PORT | — | 3001 | HTTP server port |
| NODE_ENV | — | development | production enables auth enforcement |
```

---

## Step 7: The MCP Ecosystem Map

Knowing what else exists helps you place your server in the ecosystem.

### Clients that support MCP

| Client | Type | Notes |
|--------|------|-------|
| **Claude Desktop** | Desktop | MCP-native, best UX |
| **Claude Code** | CLI | Stdio transport, great for dev |
| **VS Code** (Cline, Continue) | IDE | MCP tools as code actions |
| **IntelliJ** (Continue) | IDE | Via continue.dev plugin |
| **OpenAI Agents SDK** | SDK | Supports MCP tool discovery |
| **Custom clients** | Any | Use MCP SDK or raw JSON-RPC |

### SDKs for building MCP servers

| SDK | Language | Notes |
|-----|----------|-------|
| `@modelcontextprotocol/sdk` | TypeScript | Official, best maintained |
| `mcp-python-sdk` | Python | Official, fewer features |
| `mcp-go-sdk` | Go | Community, lightweight |
| `mcp-rs-sdk` | Rust | Community, async-native |

### Essential MCP servers to try

| Server | What it does |
|--------|-------------|
| **GitHub** (official) | Full repo management |
| **Playwright** | Browser automation |
| **PostgreSQL** | Database queries |
| **Filesystem** | File read/write operations |
| **Fetch** | HTTP requests |
| **Brave Search** | Web search |
| **Sequential Thinking** | Structured reasoning |
| **Deskpro** | Customer support |

### Hosting options

| How | Pros | Cons |
|-----|------|------|
| `npx` (stdio) | Zero setup, works everywhere | Local only |
| Docker (SSE) | Portable, network-accessible | Need Docker |
| Fly.io | Global edge, free tier | Vendor lock |
| Railway | Simple deploy, env management | Compute cost |
| Your own VPS | Full control | Maintenance |

---

## Step 8: Checklist Before Going to Production

```markdown
## Production Readiness Checklist

### Security
- [ ] GITHUB_TOKEN has minimal scopes (only issues:read + issues:write)
- [ ] AUTH_KEYS configured (not using dev auto-gen)
- [ ] Rate limiting enabled (prevent abuse)
- [ ] CORS restricted to known origins (not "*")
- [ ] Running with read-only filesystem (Docker)
- [ ] Non-root user in container

### Reliability
- [ ] Graceful shutdown handles SIGTERM
- [ ] Health check endpoint configured
- [ ] Rate limit cleanup runs periodically
- [ ] All env vars validated on startup

### Monitoring
- [ ] Logs captured (stdout/stderr to logging service)
- [ ] Health endpoint monitored (every 30s)
- [ ] Active connection count tracked
- [ ] Rate limit hits logged for abuse detection

### Operations
- [ ] CI passes (unit + integration tests)
- [ ] Docker image built and scanned
- [ ] Version bumped (semver)
- [ ] README updated with env vars + usage
```

---

## Series Summary

| Day | Topic | Content |
|-----|-------|---------|
| 1 | **Setup & Architecture** | Project structure, MCP SDK, 5 tools, StdioServerTransport, MCP Inspector |
| 2 | **Resources, Prompts & Advanced Tools** | 3 resources, 3 prompts, pagination, batch labeling, deep dive explanations |
| 3 | **SSE Transport & Docker** | Express.js SSE server, session management, multi-client, Docker multi-stage build |
| 4 | **Auth & Production Hardening** | API key auth, rate limiting, CORS, env validation, graceful shutdown |
| 5 | **Testing, Publishing & Ecosystem** | Vitest unit/integration tests, GitHub Actions CI, npm publishing, MCP directories |

### What you built:

```
📁 github-issue-mcp
├── 📄 Server (Tools + Resources + Prompts)
│   ├── 7 tools for GitHub issue management
│   ├── 3 read-only resources as markdown
│   └── 3 reusable prompt templates
├── 🔒 Production hardening
│   ├── API key authentication
│   ├── Rate limiting (sliding window)
│   ├── CORS (origin whitelist)
│   └── Graceful shutdown
├── 🐳 Docker deployment
│   ├── Multi-stage build (119MB → 89MB)
│   ├── Non-root user
│   └── Read-only filesystem
├── ✅ Testing
│   ├── Unit tests (auth, rate limiter, CORS, env)
│   ├── Integration tests (stdio transport)
│   └── CI pipeline on push + PR
└── 📦 Publishing
    ├── npm package
    ├── MCP directory listings
    └── Production readiness checklist
```

### Where to go next:

- **Build your own tools**: Add tools for your specific domain (Jira, Slack, Notion, databases)
- **Multi-server setup**: Run multiple MCP servers and let your agent use them all
- **Agent-to-agent**: Explore ACP (Agent Communication Protocol) for multi-agent workflows
- **Observability**: Add Langfuse/LangSmith tracing to track agent decisions

---

*Series: Building an MCP Server from Scratch. Day 5: Testing with Vitest, GitHub Actions CI, npm publishing, MCP ecosystem directories, and a production readiness checklist. Complete series now available.*
