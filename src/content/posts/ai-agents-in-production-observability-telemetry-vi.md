---
title: "AI Agents trong Production — Day 1: Observability & Telemetry"
description: "Đừng chạy agent trong bóng tối. Instrument từng tool call, track token cost, detect infinite loops, và xây dashboard monitoring real-time."
published: 2026-06-13
pubDate: 2026-06-13T05:00:00.000Z
slug: ai-agents-in-production-observability-telemetry-vi
tags:
  - ai-agents
  - production
  - observability
  - monitoring
  - tracing
  - opentelemetry
  - telemetry
  - mcp
category: ai-agents
lang: vi
series:
  name: "AI Agents in Production"
  order: 1
  total: 6
---

Agent chạy. Nó gọi tool. Nó hỏi LLM. Nhưng bên trong xảy ra chuyện gì?

Không có observability → agent là black box. Chỉ biết có vấn đề khi bill về hoặc crash.

Bài này: instrument toàn bộ MCP agent, build observability layer từ A-Z.

---

## 3 Signals của Observability

| Signal | Là gì | Đi đâu |
|--------|-------|--------|
| **Logs** | JSON cấu trúc mỗi event | stdout, file, OpenObserve |
| **Traces** | Chuỗi tool calls + duration | OpenTelemetry |
| **Metrics** | Token count, cost, error rate | Prometheus + Grafana |

---

## Step 1: Structured Logging

### `src/telemetry/logger.ts`

```typescript
type LogLevel = "debug" | "info" | "warn" | "error";

interface LogEvent {
  timestamp: string;
  level: LogLevel;
  sessionId: string;
  event: string;
  data: Record<string, unknown>;
  duration_ms?: number;
  error?: string;
}

export class AgentLogger {
  private sessionId: string;
  private startTime: number;
  private events: LogEvent[] = [];

  constructor(sessionId?: string) {
    this.sessionId = sessionId || crypto.randomUUID();
    this.startTime = Date.now();
  }

  private log(level: LogLevel, event: string, data: Record<string, unknown>, error?: string) {
    const entry: LogEvent = {
      timestamp: new Date().toISOString(),
      level, event, data,
      sessionId: this.sessionId,
      duration_ms: Date.now() - this.startTime,
    };
    if (error) entry.error = error;
    console.log(JSON.stringify(entry));
    this.events.push(entry);
  }

  info(event: string, data = {}) { this.log("info", event, data); }
  warn(event: string, data = {}) { this.log("warn", event, data); }
  error(event: string, data = {}, error?: string) { this.log("error", event, data, error); }

  getEvents() { return this.events; }
  getSessionStats() {
    return {
      sessionId: this.sessionId,
      totalEvents: this.events.length,
      errors: this.events.filter(e => e.level === "error").length,
      duration_ms: Date.now() - this.startTime,
    };
  }
}
```

**Text log:**
```
[INFO] Tool called: search_issues
```
→ Không query được, không filter được.

**Structured log:**
```json
{"timestamp":"2026-06-13T01:23:45Z","level":"info","event":"tool_call",
 "data":{"tool":"search_issues","duration_ms":340}}
```
→ `SELECT avg(duration_ms) WHERE event='tool_call' AND level='error'`

---

## Step 2: Tool Call Wrapper

### `src/telemetry/tool-tracer.ts`

```typescript
export class ToolTracer {
  private logger: AgentLogger;

  static readonly MODEL_PRICES: Record<string, { input: number; output: number }> = {
    "claude-sonnet-4-20250514": { input: 0.003, output: 0.015 },
    "claude-haiku-3-20250313": { input: 0.00025, output: 0.00125 },
    "gpt-4o-mini": { input: 0.00015, output: 0.0006 },
    "gpt-4o": { input: 0.0025, output: 0.01 },
    "deepseek-chat": { input: 0.00027, output: 0.0011 },
  };

  constructor(logger: AgentLogger) { this.logger = logger; }

  static estimateTokens(text: string): number {
    const words = text.split(/\s+/).length;
    const chars = text.length;
    return Math.ceil((words + chars / 4) / 2);
  }

  static estimateCost(model: string, inputTokens: number, outputTokens: number): number {
    const prices = ToolTracer.MODEL_PRICES[model];
    if (!prices) return 0;
    return (inputTokens / 1000) * prices.input + (outputTokens / 1000) * prices.output;
  }

  async traceToolCall<T>(
    toolName: string, input: Record<string, unknown>,
    callFn: () => Promise<T>,
    options: { model?: string; maxRetries?: number } = {}
  ): Promise<{ result: T; traceId: string; durationMs: number }> {
    const traceId = crypto.randomUUID().slice(0, 8);
    const startTime = Date.now();

    this.logger.info("tool_call_start", { tool: toolName, traceId });

    let lastError: Error | null = null;
    const maxAttempts = options.maxRetries || 1;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const result = await callFn();
        const durationMs = Date.now() - startTime;
        const inputTokens = ToolTracer.estimateTokens(JSON.stringify(input));
        const cost = options.model
          ? ToolTracer.estimateCost(options.model, inputTokens, 0)
          : 0;

        this.logger.info("tool_call_complete", {
          tool: toolName, traceId,
          duration_ms: durationMs,
          costUsd: parseFloat(cost.toFixed(6)),
        });

        return { result, traceId, durationMs };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        this.logger.warn("tool_call_retry", { tool: toolName, traceId, attempt });

        if (attempt >= maxAttempts) {
          this.logger.error("tool_call_failed", { tool: toolName, traceId });
          throw lastError;
        }
        await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt - 1)));
      }
    }
    throw lastError!;
  }
}
```

---

## Step 3: Loop Detection

### `src/telemetry/loop-detector.ts`

```typescript
interface ToolPattern {
  tool: string;
  inputHash: string;
  timestamp: number;
}

export class LoopDetector {
  private history: ToolPattern[] = [];
  private windowSize: number;
  private maxRepeats: number;

  constructor(windowSize = 10, maxRepeats = 3) {
    this.windowSize = windowSize;
    this.maxRepeats = maxRepeats;
  }

  private hashInput(input: Record<string, unknown>): string {
    return crypto.createHash("sha256").update(JSON.stringify(input)).digest("hex");
  }

  record(tool: string, input: Record<string, unknown>): boolean {
    const pattern: ToolPattern = {
      tool, inputHash: this.hashInput(input), timestamp: Date.now(),
    };
    this.history.push(pattern);
    if (this.history.length > this.windowSize) this.history.shift();
    return this.checkLoop();
  }

  private checkLoop(): boolean {
    if (this.history.length < 2) return false;
    const last = this.history[this.history.length - 1];
    const repeats = this.history.filter(h => h.tool === last.tool && h.inputHash === last.inputHash).length;
    return repeats >= this.maxRepeats;
  }

  getSuggestion(): string {
    const counts = new Map<string, number>();
    for (const h of this.history) {
      const key = `${h.tool}:${h.inputHash}`;
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
    if (top && top[1] >= this.maxRepeats) {
      return `⚠️ Loop: tool "${top[0].split(":")[0]}" called ${top[1]} times with same input`;
    }
    return "No loop detected.";
  }
}
```

**Gắn vào agent loop:**

```typescript
const detector = new LoopDetector(15, 4);

async function safeCall(tool: string, input: any, fn: () => Promise<any>) {
  if (detector.record(tool, input)) {
    throw new Error(`Infinite loop: ${tool}`);
  }
  return fn();
}
```

---

## Step 4: Prometheus Metrics

### `src/telemetry/metrics.ts`

```typescript
export class AgentMetrics {
  private counters = new Map<string, number>();
  private histograms = new Map<string, number[]>();

  increment(counter: string, value = 1) {
    this.counters.set(counter, (this.counters.get(counter) || 0) + value);
  }

  recordDuration(metric: string, ms: number) {
    if (!this.histograms.has(metric)) this.histograms.set(metric, []);
    this.histograms.get(metric)!.push(ms);
    if (this.histograms.get(metric)!.length > 1000) this.histograms.get(metric)!.shift();
  }

  toPrometheus(): string {
    const lines: string[] = [];
    // Tool calls
    for (const [k, v] of this.counters) {
      if (k.startsWith("tool_call:")) {
        lines.push(`agent_tool_calls_total{tool="${k.replace("tool_call:", "")}"} ${v}`);
      }
    }
    // Error rate
    const total = [...this.counters.entries()]
      .filter(([k]) => k.startsWith("tool_call:")).reduce((s, [, v]) => s + v, 0);
    const errors = this.counters.get("errors") || 0;
    lines.push(`agent_error_rate ${total > 0 ? (errors / total).toFixed(4) : 0}`);
    // Cost
    lines.push(`agent_total_cost_usd ${(this.counters.get("total_cost_usd") || 0).toFixed(6)}`);
    return lines.join("\n");
  }
}
```

Expose qua `/metrics` endpoint:

```typescript
app.get("/metrics", (req, res) => {
  res.set("Content-Type", "text/plain");
  res.send(metrics.toPrometheus());
});
```

---

## Step 5: Session Store

### `src/telemetry/session-store.ts`

```typescript
export class SessionStore {
  private sessions = new Map<string, { logger: AgentLogger; lastActivity: number }>();
  private ttlMs: number;

  constructor(ttlMs = 30 * 60_000) {
    this.ttlMs = ttlMs;
    setInterval(() => this.cleanup(), 5 * 60_000);
  }

  create(id?: string): AgentLogger {
    const logger = new AgentLogger(id);
    this.sessions.set(logger["sessionId"], { logger, lastActivity: Date.now() });
    return logger;
  }

  get(id: string): AgentLogger | undefined {
    const r = this.sessions.get(id);
    if (r) { r.lastActivity = Date.now(); return r.logger; }
  }

  getDashboardData() {
    return {
      activeSessions: this.sessions.size,
      sessions: [...this.sessions.values()].map(s => ({
        events: s.logger.getEvents().length,
        errors: s.logger.getEvents().filter(e => e.level === "error").length,
        stats: s.logger.getSessionStats(),
      })),
    };
  }

  private cleanup() {
    const now = Date.now();
    for (const [id, r] of this.sessions) {
      if (now - r.lastActivity > this.ttlMs) this.sessions.delete(id);
    }
  }
}
```

---

## Step 6: Kết hợp vào Server

```typescript
import express from "express";
import { ToolTracer } from "./telemetry/tool-tracer.js";
import { AgentLogger } from "./telemetry/logger.js";
import { LoopDetector } from "./telemetry/loop-detector.js";
import { AgentMetrics } from "./telemetry/metrics.js";
import { SessionStore } from "./telemetry/session-store.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createSSEServer } from "./sse-server.js";

const server = new McpServer({ name: "github-issue-manager", version: "1.0.3" });
const metrics = new AgentMetrics();
const sessions = new SessionStore();

// Instrumented tool wrapper
function instrumentedTool(name: string, desc: string, schema: any, handler: (a: any) => Promise<any>) {
  server.tool(name, desc, schema, async (args) => {
    const logger = sessions.create();
    const tracer = new ToolTracer(logger);
    const detector = new LoopDetector();
    metrics.increment(`tool_call:${name}`);

    if (detector.record(name, args)) {
      return { content: [{ type: "text", text: `⚠️ Loop detected on ${name}` }] };
    }

    try {
      const { result, durationMs } = await tracer.traceToolCall(name, args, () => handler(args));
      metrics.recordDuration(`tool:${name}`, durationMs);
      return result;
    } catch (e) {
      metrics.increment("errors");
      return { content: [{ type: "text", text: `Error: ${e}` }], isError: true };
    }
  });
}

// Gắn vào Express
const instance = createSSEServer(server, 3001, (app) => {
  app.get("/metrics", (req, res) => {
    res.set("Content-Type", "text/plain");
    res.send(metrics.toPrometheus());
  });
  app.get("/admin/sessions", (req, res) => {
    res.json(sessions.getDashboardData());
  });
});
```

---

## Test

```bash
npm run build
export GITHUB_TOKEN="ghp_..."
node build/server-with-telemetry.js
```

```bash
curl http://localhost:3001/metrics
```

```
agent_tool_calls_total{tool="search_issues"} 12
agent_tool_calls_total{tool="get_issue"} 5
agent_error_rate 0.0526
agent_total_cost_usd 0.042310
```

---

## Tổng kết

| Concept | Implementation | Mục đích |
|---------|---------------|----------|
| Structured logs | `AgentLogger` | Query được |
| Tool tracing | `ToolTracer` | Performance + cost |
| Loop detection | `LoopDetector` | Chặn infinite loops |
| Metrics | `AgentMetrics` → Prometheus | Monitoring real-time |
| Session store | `SessionStore` | Debug sau fact |

---

| Day | Chủ đề |
|-----|--------|
| 1 | **Observability & Telemetry** ✅ |
| 2 | Caching Strategies |
| 3 | Error Handling & Resilience |
| 4 | A/B Testing Prompts & Configs |
| 5 | Multi-Region & High Availability |
| 6 | Building an Internal Agent Platform |
