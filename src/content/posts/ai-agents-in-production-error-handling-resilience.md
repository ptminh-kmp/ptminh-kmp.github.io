---
title: "AI Agents in Production — Day 3: Error Handling & Resilience"
description: "Agents fail. Handle it gracefully. Implement retry with exponential backoff, circuit breakers, fallback chains, and graceful degradation — so your agent survives production chaos."
published: 2026-06-15
pubDate: 2026-06-15T05:00:00.000Z
slug: ai-agents-in-production-error-handling-resilience
tags:
  - ai-agents
  - production
  - error-handling
  - resilience
  - circuit-breaker
  - retry
  - fallback
  - typescript
category: ai-agents
lang: en
series:
  name: "AI Agents in Production"
  order: 3
  total: 6
---

Your agent will fail. Not if — when.

The GitHub API returns 429 (rate limited). The LLM times out. A tool throws an unhandled exception. The network drops a packet. Without resilience, one failure kills the entire session.

This post builds a three-layer defense system:

```
┌────────────────────────────────────┐
│         Agent Runtime              │
│                                    │
│  Layer 1: Retry + Backoff          │
│  ├── Exponential backoff + jitter  │
│  └── Configurable max attempts     │
│                                    │
│  Layer 2: Circuit Breaker          │
│  ├── Per-tool state machine        │
│  ├── Closed → Open → Half-Open     │
│  └── Failure threshold + cooldown  │
│                                    │
│  Layer 3: Fallback Chain           │
│  ├── Graceful degradation          │
│  └── User-facing error messages    │
└────────────────────────────────────┘
```

---

## Step 1: The Failure Taxonomy

Before writing code, map the failure modes every agent encounters.

| Failure | Example | How often | Recoverable? |
|---------|---------|-----------|--------------|
| **Rate limit** | 429 from GitHub API | Common | Yes (wait + retry) |
| **Timeout** | LLM takes >30s | Occasional | Yes (retry) |
| **Auth expired** | Token revoked | Rare | No (escalate) |
| **Invalid input** | Wrong params to tool | Common | No (fix prompt) |
| **Network error** | DNS / TCP failure | Occasional | Yes (retry) |
| **Tool misbehaves** | GitHub returns 500 | Rare | Maybe |
| **LLM refuses** | Content policy blocks | Occasional | No (rephrase) |
| **Infinite loop** | Same call repeated | Common | Detected in Day 1 |

---

## Step 2: Retry with Exponential Backoff + Jitter

This is the first line of defense. When a tool call fails, wait and try again.

### `src/resilience/retry.ts`

```typescript
// src/resilience/retry.ts — Configurable retry with exponential backoff and jitter

export interface RetryConfig {
  maxAttempts: number;        // Total attempts including first (default: 3)
  baseDelayMs: number;        // Initial delay (default: 1000)
  maxDelayMs: number;         // Cap on delay (default: 30000)
  jitterFactor: number;       // Random jitter 0-1 (default: 0.2)
  retryableErrors: string[];  // Error messages that trigger retry
}

export const DEFAULT_RETRY: RetryConfig = {
  maxAttempts: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30_000,
  jitterFactor: 0.2,
  retryableErrors: [
    "429", "503", "502", "504",  // HTTP status codes
    "timeout", "timed out",
    "rate limit", "rate_limit",
    "too many requests",
    "ECONNRESET", "ETIMEDOUT",
    "network error", "network failure",
    "internal server error",
    "service unavailable",
  ],
};

interface RetryResult<T> {
  value: T;
  attempts: number;
  totalDelayMs: number;
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  config: RetryConfig = DEFAULT_RETRY
): Promise<RetryResult<T>> {
  let lastError: Error | null = null;
  let totalDelayMs = 0;

  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      const value = await fn();
      return { value, attempts: attempt, totalDelayMs };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Don't retry on last attempt
      if (attempt >= config.maxAttempts) break;

      // Check if error is retryable
      if (!isRetryable(lastError.message, config.retryableErrors)) break;

      // Calculate delay: exponential backoff + jitter
      const delay = calculateDelay(attempt, config);
      totalDelayMs += delay;

      console.warn(
        `[Retry] Attempt ${attempt}/${config.maxAttempts} failed. ` +
        `Retrying in ${delay}ms. Error: ${lastError.message}`
      );

      await sleep(delay);
    }
  }

  throw lastError!;
}

function isRetryable(message: string, patterns: string[]): boolean {
  return patterns.some(pattern =>
    message.toLowerCase().includes(pattern.toLowerCase())
  );
}

function calculateDelay(attempt: number, config: RetryConfig): number {
  const exponential = config.baseDelayMs * Math.pow(2, attempt - 1);
  const capped = Math.min(exponential, config.maxDelayMs);
  const jitter = capped * config.jitterFactor * Math.random();
  return Math.floor(capped + jitter);
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
```

### Test:

```typescript
// Simulate a flaky API
let callCount = 0;
const result = await withRetry(async () => {
  callCount++;
  if (callCount < 3) throw new Error("429 rate limit exceeded");
  return "success!";
});

console.log(result); // { value: "success!", attempts: 3, totalDelayMs: 3400 }
```

---

## Step 3: Circuit Breaker

Retry helps with transient failures. But if the GitHub API has been returning 503 for 5 minutes, retrying 50 times is wasteful. The circuit breaker stops calling and starts failing fast.

### `src/resilience/circuit-breaker.ts`

```typescript
// src/resilience/circuit-breaker.ts — Per-tool circuit breaker (state machine)

type CircuitState = "closed" | "open" | "half-open";

export interface BreakerConfig {
  failureThreshold: number;   // Failures before opening (default: 5)
  cooldownMs: number;         // Time before half-open (default: 30_000)
  halfOpenMaxRequests: number;// Successes needed to close (default: 1)
  onStateChange?: (tool: string, from: CircuitState, to: CircuitState) => void;
}

const DEFAULT_BREAKER: BreakerConfig = {
  failureThreshold: 5,
  cooldownMs: 30_000,
  halfOpenMaxRequests: 1,
};

export class CircuitBreaker {
  private state: Map<string, {
    status: CircuitState;
    failures: number;
    lastFailure: number;
    halfOpenSuccesses: number;
  }> = new Map();

  private config: BreakerConfig;

  constructor(config: Partial<BreakerConfig> = {}) {
    this.config = { ...DEFAULT_BREAKER, ...config };
  }

  // ──── Public API ────

  /**
   * Call a function through the circuit breaker.
   * Throws immediately if circuit is open.
   */
  async call<T>(tool: string, fn: () => Promise<T>): Promise<T> {
    const state = this.getState(tool);

    if (state.status === "open") {
      const timeSinceFailure = Date.now() - state.lastFailure;
      if (timeSinceFailure >= this.config.cooldownMs) {
        // Transition to half-open — allow one probe request
        this.transition(tool, state, "half-open");
      } else {
        const retryAfter = this.config.cooldownMs - timeSinceFailure;
        throw new CircuitOpenError(
          `Circuit breaker open for "${tool}". Retry in ${retryAfter}ms.`,
          retryAfter
        );
      }
    }

    try {
      const result = await fn();
      this.onSuccess(tool);
      return result;
    } catch (error) {
      this.onFailure(tool);
      throw error; // Re-throw — let caller decide if retry is appropriate
    }
  }

  /**
   * Manually reset a tripped circuit.
   */
  reset(tool: string) {
    const state = this.getState(tool);
    this.transition(tool, state, "closed");
  }

  /**
   * Get current status for monitoring.
   */
  getStatus(tool: string): { status: CircuitState; failures: number; lastFailure: number | null } {
    const state = this.getState(tool);
    return {
      status: state.status,
      failures: state.failures,
      lastFailure: state.lastFailure > 0 ? state.lastFailure : null,
    };
  }

  /**
   * Get status for all tracked tools.
   */
  getAllStatus(): Record<string, CircuitState> {
    const result: Record<string, CircuitState> = {};
    for (const [tool, state] of this.state) {
      result[tool] = state.status;
    }
    return result;
  }

  // ──── Internal ────

  private getState(tool: string) {
    if (!this.state.has(tool)) {
      this.state.set(tool, {
        status: "closed",
        failures: 0,
        lastFailure: 0,
        halfOpenSuccesses: 0,
      });
    }
    return this.state.get(tool)!;
  }

  private onSuccess(tool: string) {
    const state = this.getState(tool);
    if (state.status === "half-open") {
      state.halfOpenSuccesses++;
      if (state.halfOpenSuccesses >= this.config.halfOpenMaxRequests) {
        this.transition(tool, state, "closed");
      }
    } else if (state.status === "closed") {
      // Reset failure counter on success
      state.failures = 0;
    }
  }

  private onFailure(tool: string) {
    const state = this.getState(tool);
    state.failures++;
    state.lastFailure = Date.now();

    if (state.status === "half-open") {
      // Single failure in half-open → back to open
      this.transition(tool, state, "open");
    } else if (state.status === "closed" && state.failures >= this.config.failureThreshold) {
      this.transition(tool, state, "open");
    }
  }

  private transition(tool: string, state: any, newStatus: CircuitState) {
    const oldStatus = state.status;
    state.status = newStatus;
    if (newStatus === "closed") {
      state.failures = 0;
      state.halfOpenSuccesses = 0;
    }
    if (this.config.onStateChange) {
      this.config.onStateChange(tool, oldStatus, newStatus);
    }
    console.warn(`[CircuitBreaker] ${tool}: ${oldStatus} → ${newStatus}`);
  }
}

export class CircuitOpenError extends Error {
  public retryAfterMs: number;

  constructor(message: string, retryAfterMs: number) {
    super(message);
    this.name = "CircuitOpenError";
    this.retryAfterMs = retryAfterMs;
  }
}
```

### State machine visual:

```
         failures ≥ threshold
  ┌──────────────────────────────┐
  │                              ▼
┌──────┐   cooldown elapsed   ┌──────┐
│ CLOSED│────────────────────▶│ OPEN │
│       │◀────────────────────│      │
└──────┘   successes ≥ limit  └──────┘
    ▲                              │
    │     half-open failure         │
    └──────────────────────────────┘
            ┌──────────┐
            │HALF-OPEN │
            └──────────┘
```

---

## Step 4: Fallback Chain

When retry and circuit breaker both exhaust, what does the agent actually return to the user? A 500 error page? No — graceful degradation.

### `src/resilience/fallback.ts`

```typescript
// src/resilience/fallback.ts — Graceful degradation fallback chain

import { CircuitBreaker, CircuitOpenError } from "./circuit-breaker.js";
import { withRetry, RetryConfig } from "./retry.js";

export interface FallbackStep<T> {
  name: string;
  execute: () => Promise<T>;
  isAvailable?: () => boolean; // Optional — skip this step if unavailable
}

export interface FallbackResult<T> {
  value: T;
  finalStep: string;
  attempts: number;
  totalDurationMs: number;
  warnings: string[];
}

export class FallbackChain<T> {
  private steps: FallbackStep<T>[];
  private circuitBreaker: CircuitBreaker;
  private retryConfig: RetryConfig;

  constructor(
    steps: FallbackStep<T>[],
    circuitBreaker?: CircuitBreaker,
    retryConfig?: RetryConfig
  ) {
    if (steps.length === 0) throw new Error("Fallback chain must have at least one step");
    this.steps = steps;
    this.circuitBreaker = circuitBreaker || new CircuitBreaker();
    this.retryConfig = retryConfig || { maxAttempts: 2, baseDelayMs: 500, maxDelayMs: 5000, jitterFactor: 0.2, retryableErrors: [] };
  }

  async execute(): Promise<FallbackResult<T>> {
    const startTime = Date.now();
    const warnings: string[] = [];
    let totalAttempts = 0;

    for (const step of this.steps) {
      // Check availability
      if (step.isAvailable && !step.isAvailable()) {
        warnings.push(`${step.name}: unavailable, skipping`);
        continue;
      }

      try {
        const { value, attempts } = await withRetry(
          () => this.circuitBreaker.call(step.name, step.execute),
          this.retryConfig
        );
        totalAttempts += attempts;

        return {
          value,
          finalStep: step.name,
          attempts: totalAttempts,
          totalDurationMs: Date.now() - startTime,
          warnings,
        };
      } catch (error) {
        totalAttempts++;
        if (error instanceof CircuitOpenError) {
          warnings.push(`${step.name}: circuit open (retry in ${error.retryAfterMs}ms)`);
        } else {
          warnings.push(`${step.name}: ${error instanceof Error ? error.message : String(error)}`);
        }
        // Continue to next fallback step
      }
    }

    // All steps failed
    throw new FallbackExhaustedError(
      `All fallback steps exhausted. Warnings:\n${warnings.join("\n")}`,
      warnings,
      Date.now() - startTime
    );
  }
}

export class FallbackExhaustedError extends Error {
  public warnings: string[];
  public totalDurationMs: number;

  constructor(message: string, warnings: string[], totalDurationMs: number) {
    super(message);
    this.name = "FallbackExhaustedError";
    this.warnings = warnings;
    this.totalDurationMs = totalDurationMs;
  }
}
```

---

## Step 5: Putting It All Together

Combine retry + circuit breaker + fallback into one resilient tool call wrapper.

### `src/resilience/index.ts`

```typescript
// src/resilience/index.ts — Unified resilience wrapper for MCP tools

import { CircuitBreaker, CircuitOpenError } from "./circuit-breaker.js";
import { withRetry, RetryConfig } from "./retry.js";
import { FallbackChain, FallbackStep, FallbackResult, FallbackExhaustedError } from "./fallback.js";
import { AgentLogger } from "../telemetry/logger.js";
import { AgentMetrics } from "../telemetry/metrics.js";

export interface ResilienceOptions {
  retryConfig?: Partial<RetryConfig>;
  breakerConfig?: Partial<{
    failureThreshold: number;
    cooldownMs: number;
  }>;
  logger?: AgentLogger;
  metrics?: AgentMetrics;
}

export class ResilientToolCaller {
  private circuitBreaker: CircuitBreaker;
  private logger?: AgentLogger;
  private metrics?: AgentMetrics;

  constructor(options: ResilienceOptions = {}) {
    this.circuitBreaker = new CircuitBreaker({
      failureThreshold: options.breakerConfig?.failureThreshold || 5,
      cooldownMs: options.breakerConfig?.cooldownMs || 30_000,
      onStateChange: (tool, from, to) => {
        console.warn(`[Breaker] ${tool}: ${from} → ${to}`);
        this.metrics?.increment(`breaker:${tool}:${to}`);
      },
    });
    this.logger = options.logger;
    this.metrics = options.metrics;
  }

  /**
   * Call a tool with full resilience: retry → circuit breaker → fallback.
   */
  async call<T>(
    toolName: string,
    primaryFn: () => Promise<T>,
    fallbackSteps?: FallbackStep<T>[],
    options?: {
      logResult?: (result: T) => void;
      retryConfig?: Partial<RetryConfig>;
    }
  ): Promise<FallbackResult<T> | T> {
    const retryConfig: RetryConfig = {
      maxAttempts: options?.retryConfig?.maxAttempts || 3,
      baseDelayMs: options?.retryConfig?.baseDelayMs || 1000,
      maxDelayMs: options?.retryConfig?.maxDelayMs || 30_000,
      jitterFactor: options?.retryConfig?.jitterFactor || 0.2,
      retryableErrors: options?.retryConfig?.retryableErrors || [
        "429", "503", "timeout", "rate limit", "ECONNRESET",
      ],
    };

    if (fallbackSteps && fallbackSteps.length > 0) {
      // Use fallback chain
      const firstStep: FallbackStep<T> = {
        name: toolName,
        execute: () => withRetry(primaryFn, retryConfig).then(r => {
          this.logger?.info("tool_success", { tool: toolName, attempts: r.attempts });
          this.metrics?.increment(`tool:${toolName}:success`);
          return r.value;
        }),
      };

      const chain = new FallbackChain<T>(
        [firstStep, ...fallbackSteps],
        this.circuitBreaker
      );

      return await chain.execute();
    } else {
      // No fallback — just retry + circuit breaker
      try {
        const result = await withRetry(
          () => this.circuitBreaker.call(toolName, primaryFn),
          retryConfig
        );
        this.metrics?.increment(`tool:${toolName}:success`);
        this.logger?.info("tool_success", { tool: toolName, attempts: result.attempts });
        return result.value;
      } catch (error) {
        this.metrics?.increment(`tool:${toolName}:failure`);
        this.logger?.error("tool_failure", { tool: toolName });

        if (error instanceof CircuitOpenError) {
          return this.gracefulDegradation(toolName, error.retryAfterMs) as T;
        }

        throw error;
      }
    }
  }

  /**
   * Last resort: return a user-friendly message instead of crashing.
   */
  private gracefulDegradation(tool: string, retryAfterMs: number): FallbackResult<string> {
    const message = [
      `⚠️ The "${tool}" tool is temporarily unavailable due to repeated failures.`,
      ``,
      `This usually means:`,
      `- The external API (GitHub, database, etc.) is down or rate limiting`,
      `- There's a network issue between the agent and the service`,
      ``,
      `⏱️ The system will automatically retry in ${Math.ceil(retryAfterMs / 1000)} seconds.`,
      `Try again in a moment, or rephrase your request to use a different tool.`,
      ``,
      `_If this persists, contact your administrator._`,
    ].join("\n");

    return {
      value: message as unknown as T,
      finalStep: "graceful-degradation",
      attempts: 0,
      totalDurationMs: 0,
      warnings: [`${tool}: circuit open for ${retryAfterMs}ms`],
    };
  }

  getBreakerStatus(tool: string) {
    return this.circuitBreaker.getStatus(tool);
  }

  getAllBreakerStatus() {
    return this.circuitBreaker.getAllStatus();
  }

  resetBreaker(tool: string) {
    this.circuitBreaker.reset(tool);
  }
}
```

---

## Step 6: Integration with the Agent

### `src/server-with-resilience.ts`

```typescript
import { ResilientToolCaller } from "./resilience/index.js";
import { FallbackStep } from "./resilience/fallback.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { AgentLogger } from "./telemetry/logger.js";
import { AgentMetrics } from "./telemetry/metrics.js";

const server = new McpServer({ name: "github-issue-manager", version: "1.0.4" });
const metrics = new AgentMetrics();
const resilient = new ResilientToolCaller({
  breakerConfig: { failureThreshold: 5, cooldownMs: 30_000 },
  metrics,
});

function resilientTool(
  name: string,
  description: string,
  schema: any,
  handler: (args: any) => Promise<any>
) {
  server.tool(name, description, schema, async (args) => {
    const logger = new AgentLogger();

    try {
      // Define fallbacks for critical read tools
      const fallbacks: FallbackStep<any>[] = [];
      if (name === "get_issue" || name === "list_issues") {
        fallbacks.push({
          name: `${name}-cached`,
          execute: async () => {
            // Return cached/limited data or a reasonable default
            return { content: [{ type: "text", text: "⚠️ Live data unavailable. Showing cached information may be stale." }], isError: false };
          },
          isAvailable: () => true,
        });
      }

      const result = await resilient.call(
        name,
        () => handler(args),
        fallbacks.length > 0 ? fallbacks : undefined,
        { logResult: (r) => logger.info("result", { tool: name }) }
      );

      // FallbackResult has `value` — unwrap it
      return result && typeof result === "object" && "value" in result
        ? (result as any).value
        : result;

    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `❌ Failed after multiple attempts.\n\nError: ${error}`,
        }],
        isError: true,
      };
    }
  });
}

// Register all tools through resilient wrapper
resilientTool("list_issues", "List issues", { /* schema */ }, async (args) => { /* handler */ });
resilientTool("get_issue", "Get issue", { /* schema */ }, async (args) => { /* handler */ });
resilientTool("create_issue", "Create issue", { /* schema */ }, async (args) => { /* handler */ });
// ... remaining tools
```

---

## Step 7: Admin Endpoints

### Expose breaker status and metrics:

```typescript
app.get("/resilience/breakers", (req, res) => {
  res.json({
    breakers: resilient.getAllBreakerStatus(),
    metrics: {
      // From Prometheus metrics
    },
  });
});

// Manual breaker reset (admin only)
app.post("/resilience/breakers/:tool/reset", (req, res) => {
  resilient.resetBreaker(req.params.tool);
  res.json({ status: "reset", tool: req.params.tool });
});
```

---

## Step 8: Testing the Resilience Stack

### Unit test — retry succeeds on 3rd attempt:

```typescript
let count = 0;
const result = await resilient.call(
  "test-tool",
  async () => {
    count++;
    if (count < 3) throw new Error("429 rate limit");
    return "ok";
  }
);
// result.value === "ok"
// result.attempts === 3
```

### Unit test — circuit breaker opens after 5 failures:

```typescript
const breaker = new CircuitBreaker({ failureThreshold: 5, cooldownMs: 1000 });

for (let i = 0; i < 5; i++) {
  await expect(
    breaker.call("flaky", async () => { throw new Error("fail"); })
  ).rejects.toThrow();
}

// 6th call should fail fast
await expect(
  breaker.call("flaky", async () => "should not reach")
).rejects.toThrow(CircuitOpenError);
```

### Unit test — fallback chain exhausts:

```typescript
const chain = new FallbackChain<string>([
  { name: "primary", execute: async () => { throw new Error("fail"); } },
  { name: "backup", execute: async () => { throw new Error("also fail"); } },
]);

await expect(chain.execute()).rejects.toThrow(FallbackExhaustedError);
```

---

## Resilience Strategy by Tool Type

| Tool type | Retry | Circuit breaker | Fallback | Degradation |
|-----------|-------|-----------------|----------|-------------|
| Read (get_issue) | 3 attempts, 1s base | 5 failures → 30s cooldown | Cached/limited data | "Live data unavailable" |
| Write (create_issue) | 2 attempts, 2s base | 3 failures → 60s cooldown | Queue for retry | "Try again later" |
| Search | 3 attempts, 1s base | 5 failures → 30s cooldown | Simplify query | "Search unavailable" |
| List/paginated | 2 attempts, 1s base | 5 failures → 30s cooldown | Return previous page | "Browsing limited" |
| Batch operations | 1 attempt (no retry) | 2 failures → 120s cooldown | Process individually | "Batch unavailable" |

---

## Monitoring the Resilience Layer

Add these metrics to the `/metrics` endpoint from Day 1:

```typescript
// In AgentMetrics
// retry_attempts_total{tool="get_issue"}
// circuit_breaker_state{tool="get_issue",state="open"}
// fallback_activated_total{tool="get_issue",step="cached"}
// graceful_degradation_total{tool="get_issue"}
```

**Alert thresholds:**
- Circuit breaker open for > 5 minutes → pager duty
- Fallback activated > 10% of calls → investigate
- Graceful degradation triggered → review tool health

---

## Summary

| Concept | Implementation | What it solves |
|---------|---------------|----------------|
| Retry + backoff | `withRetry()` | Transient failures (429, timeout) |
| Jitter | Random delay within 20% | Thundering herd problem |
| Circuit breaker | `CircuitBreaker` | Prevents cascading failures |
| State machine | Closed → Open → Half-Open | Self-healing after cooldown |
| Fallback chain | `FallbackChain` | Degraded but not dead |
| Graceful degradation | Human-readable error | User knows what happened |
| Admin reset | POST endpoint | Manual intervention path |

### Checklist:
- [ ] Each tool has a retry strategy defined
- [ ] Circuit breaker thresholds set per tool type
- [ ] Read tools have fallback (cached/limited data)
- [ ] Circuits auto-reset after cooldown (half-open)
- [ ] Write tools never silently retry destructive ops
- [ ] Graceful degradation messages are user-friendly
- [ ] Breaker status exposed via admin endpoint
- [ ] Alerts configured for stuck-open circuits

---

| Day | Topic |
|-----|-------|
| 1 | Observability & Telemetry ✅ |
| 2 | Caching Strategies ✅ |
| 3 | **Error Handling & Resilience ✅** |
| 4 | A/B Testing Prompts & Configs |
| 5 | Multi-Region & High Availability |
| 6 | Building an Internal Agent Platform |

---

*Series: AI Agents in Production. Day 3: Three-layer resilience (retry + backoff → circuit breaker → fallback chain) with graceful degradation. Full TypeScript source code included.*
