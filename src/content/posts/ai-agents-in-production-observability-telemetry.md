---
title: "AI Agents in Production — Day 1: Observability & Telemetry"
description: "Stop running agents in the dark. Implement structured observability for AI agents — trace every tool call, track token costs, detect infinite loops, and build a real-time monitoring dashboard."
published: 2026-06-13
pubDate: 2026-06-13T05:00:00.000Z
slug: ai-agents-in-production-observability-telemetry
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
lang: en
series:
  name: "AI Agents in Production"
  order: 1
  total: 6
---

Your agent runs. It calls tools. It talks to the LLM. But what actually happens inside? How many tokens did the last task cost? Did it get stuck in a loop? Did it call `delete_repository` accidentally?

Without observability, your agent is a black box. You only notice problems when something breaks — or when the bill arrives.

In this first post of the "AI Agents in Production" series, we instrument an MCP-based agent from scratch and build a complete observability layer.

---

## What We're Building

```
┌─────────────────────────────────────┐
│         Agent Runtime                │
│  ┌─────────┐  ┌──────────┐          │
│  │ LLM     │  │ MCP Tools │          │
│  │ Calls   │  │ Calls     │          │
│  └────┬────┘  └────┬─────┘          │
│       │            │                 │
│  ┌────▼────────────▼─────┐           │
│  │   Telemetry Middleware │           │
│  └────┬──────────────────┘           │
│       │                              │
│  ┌────▼────┐                         │
│  │  Logs   │ → stdout / file         │
│  │  Traces │ → OpenTelemetry         │
│  │  Metrics│ → Prometheus            │
│  └─────────┘                         │
└─────────────────────────────────────┘
```

Three observability signals:

| Signal | What | Where it goes |
|--------|------|---------------|
| **Logs** | Structured JSON per event | stdout, file, OpenObserve |
| **Traces** | Tool call chains with duration | OpenTelemetry collector |
| **Metrics** | Token count, costs, error rates | Prometheus + Grafana |

---

## Step 1: The Problem — An Uninstrumented Agent

Here's a typical MCP agent interaction. It looks simple:

```typescript
// Uninstrumented — no visibility
const result = await tool.call("search_issues", {
  query: "repo:owner/name is:open bug"
});
```

But questions you can't answer:
- How long did this tool call take?
- How many tokens did the LLM spend deciding which tool to call?
- Did it retry? Was the first attempt a failure?
- What's the running cost of this session?

Let's fix this.

---

## Step 2: Structured Logging for Tool Calls

The foundation of observability is **structured logs** — every event is a JSON object, not a text string.

### Create `src/telemetry/logger.ts`

```typescript
// src/telemetry/logger.ts — Structured logger for agent events

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

  constructor(sessionId?: string) {
    this.sessionId = sessionId || crypto.randomUUID();
    this.startTime = Date.now();
  }

  private log(level: LogLevel, event: string, data: Record<string, unknown>, error?: string) {
    const entry: LogEvent = {
      timestamp: new Date().toISOString(),
      level,
      sessionId: this.sessionId,
      event,
      data,
      duration_ms: Date.now() - this.startTime,
    };
    if (error) entry.error = error;
    console.log(JSON.stringify(entry));

    // Also keep in-memory for the session
    this.events.push(entry);
  }

  // In-memory buffer for session replay
  private events: LogEvent[] = [];

  info(event: string, data: Record<string, unknown> = {}) { this.log("info", event, data); }
  warn(event: string, data: Record<string, unknown> = {}) { this.log("warn", event, data); }
  error(event: string, data: Record<string, unknown> = {}, error?: string) { this.log("error", event, data, error); }
  debug(event: string, data: Record<string, unknown> = {}) { this.log("debug", event, data); }

  getEvents(): LogEvent[] { return this.events; }
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

### Why structured logs matter:

```
# Text log — useless for analysis
[INFO] Tool called: search_issues

# Structured log — queryable, filterable, aggregatable
{"timestamp":"2026-06-13T01:23:45Z","level":"info","sessionId":"sess_abc",
 "event":"tool_call","data":{"tool":"search_issues","input":{"query":"..."},"duration_ms":340}}
```

With JSON logs, you can pipe them into any log aggregator (OpenObserve, Loki, Datadog) and query:
```sql
SELECT avg(duration_ms), count(*) FROM logs
WHERE event = 'tool_call' AND level = 'error'
GROUP BY tool
```

---

## Step 3: Tool Call Wrapper with Full Telemetry

This is the core — a wrapper that intercepts every tool call, tracks everything, and handles errors.

### Create `src/telemetry/tool-tracer.ts`

```typescript
// src/telemetry/tool-tracer.ts — Instrumented tool call wrapper

import { AgentLogger } from "./logger.js";
import crypto from "crypto";

/**
 * Wraps an MCP tool call with full telemetry:
 * - Input/output logging
 * - Duration tracking
 * - Token approximation
 * - Error capture
 * - Cost estimation
 */
export class ToolTracer {
  private logger: AgentLogger;

  // Approximate prices per 1K tokens (as of mid-2026)
  private static readonly MODEL_PRICES: Record<string, { input: number; output: number }> = {
    "claude-sonnet-4-20250514": { input: 0.003, output: 0.015 },
    "claude-haiku-3-20250313": { input: 0.00025, output: 0.00125 },
    "gpt-4o-mini": { input: 0.00015, output: 0.0006 },
    "gpt-4o": { input: 0.0025, output: 0.01 },
    "deepseek-chat": { input: 0.00027, output: 0.0011 },
  };

  constructor(logger: AgentLogger) {
    this.logger = logger;
  }

  /**
   * Roughly estimate tokens from text.
   * ~4 chars per token for English, ~2 for CJK.
   */
  static estimateTokens(text: string): number {
    // Count words and estimate
    const words = text.split(/\s+/).length;
    const chars = text.length;
    return Math.ceil((words + chars / 4) / 2);
  }

  /**
   * Calculate estimated cost for a model call.
   */
  static estimateCost(
    model: string,
    inputTokens: number,
    outputTokens: number
  ): number {
    const prices = ToolTracer.MODEL_PRICES[model];
    if (!prices) return 0; // Unknown model — can't estimate
    return (inputTokens / 1000) * prices.input + (outputTokens / 1000) * prices.output;
  }

  /**
   * Wrap a tool call with telemetry.
   * Returns the result or throws with full context.
   */
  async traceToolCall<T>(
    toolName: string,
    input: Record<string, unknown>,
    callFn: () => Promise<T>,
    options: {
      model?: string;
      llmInputTokens?: number;
      llmOutputTokens?: number;
      maxRetries?: number;
    } = {}
  ): Promise<{ result: T; traceId: string; durationMs: number }> {
    const traceId = crypto.randomUUID().slice(0, 8);
    const startTime = Date.now();
    const serializedInput = JSON.stringify(input);

    // Log the call start
    this.logger.info("tool_call_start", {
      tool: toolName,
      traceId,
      input: serializedInput.slice(0, 1000), // Truncate for logs
      inputSize: serializedInput.length,
    });

    let lastError: Error | null = null;
    let attempt = 0;
    const maxAttempts = options.maxRetries || 1;

    while (attempt < maxAttempts) {
      attempt++;
      try {
        const result = await callFn();
        const durationMs = Date.now() - startTime;

        // Estimate token costs if we have model info
        const inputTokens = options.llmInputTokens || ToolTracer.estimateTokens(serializedInput);
        const outputTokens = options.llmOutputTokens || (
          typeof result === "string"
            ? ToolTracer.estimateTokens(result)
            : 0
        );
        const cost = options.model
          ? ToolTracer.estimateCost(options.model, inputTokens, outputTokens)
          : 0;

        // Log success
        this.logger.info("tool_call_complete", {
          tool: toolName,
          traceId,
          attempt,
          duration_ms: durationMs,
          inputTokens,
          outputTokens,
          costUsd: parseFloat(cost.toFixed(6)),
          resultSize: JSON.stringify(result).length,
        });

        return { result, traceId, durationMs };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        this.logger.warn("tool_call_retry", {
          tool: toolName,
          traceId,
          attempt,
          maxAttempts,
          error: lastError.message,
        });

        if (attempt >= maxAttempts) {
          // All retries exhausted
          this.logger.error("tool_call_failed", {
            tool: toolName,
            traceId,
            attempt,
            duration_ms: Date.now() - startTime,
          }, lastError.message);

          throw lastError;
        }

        // Wait before retry (exponential backoff)
        const delay = Math.min(1000 * Math.pow(2, attempt - 1) + Math.random() * 500, 16000);
        await new Promise(r => setTimeout(r, delay));
      }
    }

    throw lastError!; // Should never reach here
  }
}
```

### Usage in an agent loop:

```typescript
const logger = new AgentLogger(sessionId);
const tracer = new ToolTracer(logger);

async function runAgent() {
  try {
    logger.info("session_start", { model: "claude-sonnet-4-20250514" });

    const { result, traceId, durationMs } = await tracer.traceToolCall(
      "search_issues",
      { query: "repo:owner/name bug", limit: 10 },
      () => mcpClient.callTool("search_issues", { query: "...", limit: 10 }),
      { model: "claude-sonnet-4-20250514", maxRetries: 3 }
    );

    logger.info("session_end", { traceId, finalDuration: durationMs });
    return result;
  } catch (error) {
    logger.error("session_failed", {}, String(error));
    throw error;
  }
}

// At the end, print session summary
console.log("\n📊 Session Summary:");
console.table(logger.getSessionStats());
```

---

## Step 4: Detecting Infinite Loops

Agents get stuck. It's a fact of life. Here's how to detect and break out.

### Create `src/telemetry/loop-detector.ts`

```typescript
// src/telemetry/loop-detector.ts — Detect infinite loops in agent behavior

interface ToolPattern {
  tool: string;
  inputHash: string; // SHA256 of serialized input
  timestamp: number;
}

export class LoopDetector {
  private history: ToolPattern[] = [];
  private windowSize: number;
  private maxRepeats: number;

  /**
   * @param windowSize Number of recent calls to check for repeats
   * @param maxRepeats Max allowed repeats before triggering
   */
  constructor(windowSize: number = 10, maxRepeats: number = 3) {
    this.windowSize = windowSize;
    this.maxRepeats = maxRepeats;
  }

  private hashInput(input: Record<string, unknown>): string {
    return crypto.createHash("sha256").update(JSON.stringify(input)).digest("hex");
  }

  /**
   * Record a tool call and check if we're in a loop.
   * Returns true if loop detected.
   */
  record(tool: string, input: Record<string, unknown>): boolean {
    const pattern: ToolPattern = {
      tool,
      inputHash: this.hashInput(input),
      timestamp: Date.now(),
    };

    this.history.push(pattern);

    // Keep history to window size
    if (this.history.length > this.windowSize) {
      this.history.shift();
    }

    return this.checkLoop();
  }

  /**
   * Check if the same tool+input was called maxRepeats times recently.
   */
  private checkLoop(): boolean {
    if (this.history.length < 2) return false;

    const last = this.history[this.history.length - 1];
    const repeats = this.history.filter(
      (h) => h.tool === last.tool && h.inputHash === last.inputHash
    ).length;

    return repeats >= this.maxRepeats;
  }

  /**
   * Get suggested action for the detected loop.
   */
  getSuggestion(): string {
    if (this.history.length === 0) return "No calls yet.";

    // Find the most repeated pattern
    const patternCounts = new Map<string, number>();
    for (const h of this.history) {
      const key = `${h.tool}:${h.inputHash}`;
      patternCounts.set(key, (patternCounts.get(key) || 0) + 1);
    }

    // Sort by frequency
    const sorted = [...patternCounts.entries()].sort((a, b) => b[1] - a[1]);

    if (sorted[0][1] >= this.maxRepeats) {
      return `⚠️ Loop detected! Tool "${sorted[0][0].split(":")[0]}" called ${sorted[0][1]} times with same input. Consider: different search terms, breaking the task into smaller steps, or escalating to a human.`;
    }

    return "No loop detected.";
  }
}
```

### Integration into the agent loop:

```typescript
const loopDetector = new LoopDetector(15, 4);

async function safeAgentStep(tool: string, input: Record<string, unknown>, callFn: () => Promise<any>) {
  if (loopDetector.record(tool, input)) {
    logger.warn("loop_detected", { tool, input, suggestion: loopDetector.getSuggestion() });
    throw new AgentLoopError(`Infinite loop detected on tool: ${tool}`);
  }
  return callFn();
}
```

---

## Step 5: Exporting Metrics to Prometheus

### Create `src/telemetry/metrics.ts`

```typescript
// src/telemetry/metrics.ts — Prometheus metrics for agent runtime

export class AgentMetrics {
  // In-memory counters — expose via /metrics endpoint
  private counters: Map<string, number> = new Map();
  private histograms: Map<string, number[]> = new Map();

  increment(counter: string, value: number = 1) {
    this.counters.set(counter, (this.counters.get(counter) || 0) + value);
  }

  recordDuration(metric: string, durationMs: number) {
    if (!this.histograms.has(metric)) {
      this.histograms.set(metric, []);
    }
    this.histograms.get(metric)!.push(durationMs);

    // Keep only last 1000 samples
    const arr = this.histograms.get(metric)!;
    if (arr.length > 1000) arr.shift();
  }

  /**
   * Expose as Prometheus-format text.
   */
  toPrometheus(): string {
    const lines: string[] = [];

    lines.push("# HELP agent_tool_calls_total Total tool calls");
    lines.push("# TYPE agent_tool_calls_total counter");
    for (const [key, value] of this.counters) {
      if (key.startsWith("tool_call:")) {
        lines.push(`agent_tool_calls_total{tool="${key.replace("tool_call:", "")}"} ${value}`);
      }
    }

    // Error rate
    const totalCalls = [...this.counters.entries()]
      .filter(([k]) => k.startsWith("tool_call:"))
      .reduce((sum, [, v]) => sum + v, 0);
    const totalErrors = this.counters.get("errors") || 0;
    lines.push("# HELP agent_error_rate Error rate (0-1)");
    lines.push("# TYPE agent_error_rate gauge");
    lines.push(`agent_error_rate ${totalCalls > 0 ? (totalErrors / totalCalls).toFixed(4) : 0}`);

    // Duration percentiles
    for (const [key, values] of this.histograms) {
      if (values.length === 0) continue;
      const sorted = [...values].sort((a, b) => a - b);
      const p50 = sorted[Math.floor(sorted.length * 0.5)];
      const p95 = sorted[Math.floor(sorted.length * 0.95)];
      const p99 = sorted[Math.floor(sorted.length * 0.99)];
      lines.push(`# HELP ${key}_duration_ms Tool call duration`);
      lines.push(`# TYPE ${key}_duration_ms gauge`);
      lines.push(`${key}_duration_ms{p50="${p50}"} 1`);
      lines.push(`${key}_duration_ms{p95="${p95}"} 1`);
      lines.push(`${key}_duration_ms{p99="${p99}"} 1`);
    }

    // LLM cost
    const totalCost = this.counters.get("total_cost_usd") || 0;
    lines.push("# HELP agent_total_cost_usd Total LLM cost in USD");
    lines.push("# TYPE agent_total_cost_usd counter");
    lines.push(`agent_total_cost_usd ${totalCost.toFixed(6)}`);

    return lines.join("\n");
  }
}
```

### Add a metrics endpoint to your SSE server:

```typescript
app.get("/metrics", (req, res) => {
  res.set("Content-Type", "text/plain; charset=utf-8");
  res.send(metrics.toPrometheus());
});
```

---

## Step 6: Session Replay — Debug After the Fact

When something goes wrong, you need to replay what happened. The in-memory event buffer lets you do exactly that.

### Create `src/telemetry/session-store.ts`

```typescript
// src/telemetry/session-store.ts — Session event storage with TTL

import { AgentLogger } from "./logger.js";

interface SessionRecord {
  id: string;
  logger: AgentLogger;
  createdAt: number;
  lastActivity: number;
}

export class SessionStore {
  private sessions: Map<string, SessionRecord> = new Map();
  private ttlMs: number;
  private cleanupInterval: ReturnType<typeof setInterval>;

  constructor(ttlMs: number = 30 * 60 * 1000) { // 30 min TTL
    this.ttlMs = ttlMs;
    // Clean stale sessions every 5 minutes
    this.cleanupInterval = setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  create(sessionId?: string): AgentLogger {
    const logger = new AgentLogger(sessionId);
    this.sessions.set(logger["sessionId"], {
      id: logger["sessionId"],
      logger,
      createdAt: Date.now(),
      lastActivity: Date.now(),
    });
    return logger;
  }

  get(sessionId: string): AgentLogger | undefined {
    const record = this.sessions.get(sessionId);
    if (record) {
      record.lastActivity = Date.now();
      return record.logger;
    }
    return undefined;
  }

  getSessionEvents(sessionId: string) {
    const logger = this.get(sessionId);
    return logger?.getEvents() || [];
  }

  getActiveSessions(): number {
    return this.sessions.size;
  }

  /**
   * Expose session data for admin dashboard.
   */
  getDashboardData() {
    const sessions = [...this.sessions.values()];
    return {
      activeSessions: sessions.length,
      sessions: sessions.map((s) => ({
        id: s.id,
        createdAt: new Date(s.createdAt).toISOString(),
        lastActivity: new Date(s.lastActivity).toISOString(),
        ageMin: ((Date.now() - s.createdAt) / 60000).toFixed(1),
        events: s.logger.getEvents().length,
        errors: s.logger.getEvents().filter((e) => e.level === "error").length,
        stats: s.logger.getSessionStats(),
      })),
    };
  }

  /**
   * Clean sessions that haven't had activity past TTL.
   */
  private cleanup() {
    const now = Date.now();
    for (const [id, record] of this.sessions) {
      if (now - record.lastActivity > this.ttlMs) {
        this.sessions.delete(id);
      }
    }
  }

  stop() {
    clearInterval(this.cleanupInterval);
  }
}
```

---

## Step 7: Putting It All Together

Here's the complete integration into an SSE MCP server:

### `src/server-with-telemetry.ts`

```typescript
import express from "express";
import { ToolTracer } from "./telemetry/tool-tracer.js";
import { AgentLogger } from "./telemetry/logger.js";
import { LoopDetector } from "./telemetry/loop-detector.js";
import { AgentMetrics } from "./telemetry/metrics.js";
import { SessionStore } from "./telemetry/session-store.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createSSEServer } from "./sse-server.js";
import { loadConfig } from "./env.js";

const config = loadConfig();
const server = new McpServer({ name: "github-issue-manager", version: "1.0.2" });
const metrics = new AgentMetrics();
const sessions = new SessionStore();

// ──── Instrumented tool registration helper ────

function instrumentedTool(
  name: string,
  description: string,
  schema: any,
  handler: (args: any) => Promise<any>
) {
  server.tool(name, description, schema, async (args) => {
    const logger = sessions.get("current-session") || sessions.create();
    const tracer = new ToolTracer(logger);
    const loopDetector = new LoopDetector();

    metrics.increment(`tool_call:${name}`);

    const startTime = Date.now();

    // Loop detection
    if (loopDetector.record(name, args)) {
      metrics.increment("errors");
      return {
        content: [{ type: "text", text: `⚠️ Loop detected: "${name}" was called repeatedly with the same inputs. Try a different query or break this into smaller steps.` }],
        isError: false,
      };
    }

    try {
      const { result, traceId, durationMs } = await tracer.traceToolCall(
        name, args, () => handler(args), { maxRetries: 2 }
      );
      metrics.recordDuration(`tool:${name}`, durationMs);
      return result;
    } catch (error) {
      metrics.increment("errors");
      metrics.increment(`error:${name}`);
      return {
        content: [{ type: "text", text: `Error calling ${name}: ${error}` }],
        isError: true,
      };
    }
  });
}

// Register all tools with instrumentation
instrumentedTool("list_issues", "...", { /*schema*/ }, async (args) => { /*handler*/ });
instrumentedTool("get_issue", "...", { /*schema*/ }, async (args) => { /*handler*/ });
// ... etc for all tools

// ──── Metrics + Admin endpoints ────

const instance = createSSEServer(server, config.port, (app) => {
  app.get("/metrics", (req, res) => {
    res.set("Content-Type", "text/plain; charset=utf-8");
    res.send(metrics.toPrometheus());
  });

  app.get("/admin/sessions", (req, res) => {
    res.json(sessions.getDashboardData());
  });

  app.get("/admin/sessions/:id", (req, res) => {
    const events = sessions.getSessionEvents(req.params.id);
    if (events.length === 0) {
      return res.status(404).json({ error: "Session not found" });
    }
    res.json(events);
  });
});

process.on("SIGTERM", async () => { sessions.stop(); await instance.shutdown(); });
```

---

## Step 8: Running and Visualizing

### Start the instrumented server:

```bash
npm run build
export GITHUB_TOKEN="ghp_..."
node build/server-with-telemetry.js
```

### Check live metrics:

```bash
curl http://localhost:3001/metrics
```

```output
# HELP agent_tool_calls_total Total tool calls
# TYPE agent_tool_calls_total counter
agent_tool_calls_total{tool="search_issues"} 12
agent_tool_calls_total{tool="get_issue"} 5
agent_tool_calls_total{tool="create_issue"} 2
# HELP agent_error_rate Error rate (0-1)
# TYPE agent_error_rate gauge
agent_error_rate 0.0526
# HELP agent_total_cost_usd Total LLM cost in USD
# TYPE agent_total_cost_usd counter
agent_total_cost_usd 0.042310
```

### Grafana dashboard:

```
┌─────────────────────────────────────┐
│  Active Sessions: 3                 │
│  Total Tool Calls: 47              │
│  Error Rate: 5.3%                  │
│  Total Cost: $0.14 today           │
├─────────────────────────────────────┤
│  Tool Call Duration (p95)          │
│  ┌─────────────────────────────┐   │
│  │ search_issues: 340ms █████  │   │
│  │ get_issue:     210ms ████   │   │
│  │ create_issue:  890ms ██████ │   │
│  └─────────────────────────────┘   │
├─────────────────────────────────────┤
│  Recent Errors                      │
│  - 12:34:56 search_issues timeout   │
│  - 12:35:10 create_issue 403       │
│  - 12:36:02 loop detected (!)      │
└─────────────────────────────────────┘
```

---

## Summary

| Concept | Implementation | Purpose |
|---------|---------------|---------|
| Structured logs | `AgentLogger` → JSON per event | Queryable history |
| Tool tracing | `ToolTracer` → duration + cost | Performance + cost |
| Loop detection | `LoopDetector` → pattern matching | Prevent infinite loops |
| Metrics | `AgentMetrics` → Prometheus format | Real-time monitoring |
| Session store | `SessionStore` → TTL-based | Debug after the fact |
| Admin API | `/metrics`, `/admin/sessions` | Dashboard integration |

### Production checklist:
- [ ] All tool calls wrapped with `ToolTracer`
- [ ] Loop detection enabled (max 3-5 repeats)
- [ ] Prometheus metrics exposed on `/metrics`
- [ ] Session store TTL configured (default 30 min)
- [ ] Logs forwarded to centralized aggregator
- [ ] Error rate alert threshold (< 10%)
- [ ] Cost tracking per session

---

| Day | Topic |
|-----|-------|
| 1 | **Observability & Telemetry** ✅ |
| 2 | Caching Strategies |
| 3 | Error Handling & Resilience |
| 4 | A/B Testing Prompts & Configs |
| 5 | Multi-Region & High Availability |
| 6 | Building an Internal Agent Platform |

---

*Series: AI Agents in Production. Day 1: Instrument every tool call, track costs, detect loops, and export metrics to Prometheus. Full TypeScript source code included.*
