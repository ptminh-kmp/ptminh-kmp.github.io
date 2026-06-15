---
title: "AI Agents trong Production — Day 3: Error Handling & Resilience"
description: "Agent sẽ fail. Xử lý nó một cách graceful. Retry với exponential backoff, circuit breaker, fallback chain, và graceful degradation."
published: 2026-06-15
pubDate: 2026-06-15T05:00:00.000Z
slug: ai-agents-in-production-error-handling-resilience-vi
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
lang: vi
series:
  name: "AI Agents in Production"
  order: 3
  total: 6
---

Agent sẽ fail. Không phải *nếu* — mà là *khi nào*.

GitHub API trả về 429. LLM timeout. Tool throw exception. Không có resilience → một failure giết chết cả session.

Bài này xây 3 lớp phòng thủ:

```
Layer 1: Retry + Backoff    →  thử lại với delay tăng dần
Layer 2: Circuit Breaker    →  ngừng gọi nếu fail quá nhiều
Layer 3: Fallback Chain     →  degraded nhưng không chết
```

---

## Step 1: Failure Taxonomy

| Failure | Ví dụ | Phổ biến? | Cứu được? |
|---------|-------|-----------|-----------|
| Rate limit | 429 từ GitHub API | ✅ | Có (đợi + retry) |
| Timeout | LLM > 30s | Thi thoảng | Có (retry) |
| Auth expired | Token hết hạn | Hiếm | Không (báo user) |
| Network error | DNS/TCP fail | Thi thoảng | Có (retry) |
| Tool lỗi | GitHub 500 | Hiếm | Có thể |
| Infinite loop | Gọi cùng tool mãi | ✅ | Phát hiện ở Day 1 |

---

## Step 2: Retry với Exponential Backoff + Jitter

### `src/resilience/retry.ts`

```typescript
export interface RetryConfig {
  maxAttempts: number;     // Tổng attempts (mặc định: 3)
  baseDelayMs: number;     // Delay ban đầu (mặc định: 1000)
  maxDelayMs: number;      // Delay tối đa (mặc định: 30000)
  jitterFactor: number;    // Nhiễu ngẫu nhiên 0-1 (mặc định: 0.2)
  retryableErrors: string[];  // Lỗi nào thì retry
}

export const DEFAULT_RETRY: RetryConfig = {
  maxAttempts: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30_000,
  jitterFactor: 0.2,
  retryableErrors: ["429","503","timeout","rate limit","ECONNRESET"],
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
      if (attempt >= config.maxAttempts) break;
      if (!isRetryable(lastError.message, config.retryableErrors)) break;

      const delay = calculateDelay(attempt, config);
      totalDelayMs += delay;
      await new Promise(r => setTimeout(r, delay));
    }
  }
  throw lastError!;
}

function isRetryable(msg: string, patterns: string[]): boolean {
  return patterns.some(p => msg.toLowerCase().includes(p.toLowerCase()));
}

function calculateDelay(attempt: number, config: RetryConfig): number {
  const exp = Math.min(config.baseDelayMs * Math.pow(2, attempt - 1), config.maxDelayMs);
  return Math.floor(exp + exp * config.jitterFactor * Math.random());
}
```

**Tại sao có jitter?** Không có jitter → tất cả clients retry cùng lúc → thundering herd.

---

## Step 3: Circuit Breaker

Retry giúp với transient failures. Nhưng nếu GitHub 503 trong 5 phút, retry 50 lần là vô ích. Circuit breaker ngừng gọi và fail fast.

### `src/resilience/circuit-breaker.ts`

```typescript
type CircuitState = "closed" | "open" | "half-open";

export class CircuitBreaker {
  private state = new Map<string, {
    status: CircuitState; failures: number;
    lastFailure: number; halfOpenSuccesses: number;
  }>();
  private threshold: number;
  private cooldownMs: number;

  constructor(threshold = 5, cooldownMs = 30_000) {
    this.threshold = threshold;
    this.cooldownMs = cooldownMs;
  }

  async call<T>(tool: string, fn: () => Promise<T>): Promise<T> {
    const s = this.getState(tool);

    if (s.status === "open") {
      const elapsed = Date.now() - s.lastFailure;
      if (elapsed >= this.cooldownMs) {
        this.transition(tool, "half-open");
      } else {
        throw new CircuitOpenError(`"${tool}" circuit open. Retry in ${this.cooldownMs - elapsed}ms`);
      }
    }

    try {
      const result = await fn();
      this.onSuccess(tool);
      return result;
    } catch (error) {
      this.onFailure(tool);
      throw error;
    }
  }

  private onSuccess(tool: string) {
    const s = this.getState(tool);
    if (s.status === "half-open") {
      s.halfOpenSuccesses++;
      if (s.halfOpenSuccesses >= 1) this.transition(tool, "closed");
    } else if (s.status === "closed") {
      s.failures = 0;
    }
  }

  private onFailure(tool: string) {
    const s = this.getState(tool);
    s.failures++; s.lastFailure = Date.now();
    if (s.status === "half-open") this.transition(tool, "open");
    else if (s.status === "closed" && s.failures >= this.threshold)
      this.transition(tool, "open");
  }

  private transition(tool: string, newStatus: CircuitState) {
    const s = this.getState(tool);
    console.warn(`[Breaker] ${tool}: ${s.status} → ${newStatus}`);
    s.status = newStatus;
    if (newStatus === "closed") { s.failures = 0; s.halfOpenSuccesses = 0; }
  }

  private getState(tool: string) {
    if (!this.state.has(tool))
      this.state.set(tool, { status: "closed", failures: 0, lastFailure: 0, halfOpenSuccesses: 0 });
    return this.state.get(tool)!;
  }

  getStatus(tool: string) { const s = this.getState(tool); return { status: s.status, failures: s.failures }; }
  reset(tool: string) { this.transition(tool, "closed"); }
}

export class CircuitOpenError extends Error {
  public retryAfterMs: number;
  constructor(msg: string, retryAfterMs = 0) { super(msg); this.name = "CircuitOpenError"; this.retryAfterMs = retryAfterMs; }
}
```

### State machine:

```
CLOSED ──(fail ≥ threshold)──▶ OPEN ──(cooldown)──▶ HALF-OPEN
  ▲                                                  │
  └────(success ≥ limit)◄────────────────────────────┘
                                    │
                                    └──(fail)──▶ OPEN
```

---

## Step 4: Fallback Chain

Khi retry + circuit breaker đều hết, agent trả về gì? Error 500? Không — graceful degradation.

### `src/resilience/fallback.ts`

```typescript
export interface FallbackStep<T> {
  name: string;
  execute: () => Promise<T>;
  isAvailable?: () => boolean; // Bỏ qua step này nếu unavailable
}

export class FallbackChain<T> {
  private steps: FallbackStep<T>[];

  constructor(steps: FallbackStep<T>[]) {
    if (steps.length === 0) throw new Error("Need ≥ 1 step");
    this.steps = steps;
  }

  async execute(): Promise<{ value: T; step: string; warnings: string[] }> {
    const warnings: string[] = [];

    for (const step of this.steps) {
      if (step.isAvailable && !step.isAvailable()) {
        warnings.push(`${step.name}: skip (unavailable)`);
        continue;
      }
      try {
        const value = await step.execute();
        return { value, step: step.name, warnings };
      } catch (e) {
        warnings.push(`${step.name}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
    throw new Error(`All fallback exhausted:\n${warnings.join("\n")}`);
  }
}
```

---

## Step 5: Kết hợp — ResilientToolCaller

### `src/resilience/index.ts`

```typescript
export class ResilientToolCaller {
  private breaker: CircuitBreaker;

  constructor(options?: { failureThreshold?: number; cooldownMs?: number }) {
    this.breaker = new CircuitBreaker(options?.failureThreshold || 5, options?.cooldownMs || 30_000);
  }

  async call<T>(
    tool: string,
    fn: () => Promise<T>,
    fallbackSteps?: FallbackStep<T>[]
  ): Promise<T | { value: T; warnings: string[] }> {
    try {
      return await withRetry(() => this.breaker.call(tool, fn));
    } catch (error) {
      if (fallbackSteps && fallbackSteps.length > 0) {
        const chain = new FallbackChain(fallbackSteps);
        try {
          return await chain.execute();
        } catch {
          // Both primary + fallback failed — graceful degradation
          return {
            value: (`⚠️ "${tool}" unavailable.\nAutomatic retry in 30s.\nTry again or use different tool.`) as unknown as T,
            warnings: [`${tool}: all paths failed`],
          };
        }
      }
      return {
        value: (`⚠️ "${tool}" temporarily unavailable.`) as unknown as T,
        warnings: [`${tool}: ${error}`],
      };
    }
  }

  getBreakerStatus(tool: string) { return this.breaker.getStatus(tool); }
  resetBreaker(tool: string) { this.breaker.reset(tool); }
}
```

---

## Step 6: Integration

```typescript
import { ResilientToolCaller } from "./resilience/index.js";

const resilient = new ResilientToolCaller({ failureThreshold: 5, cooldownMs: 30_000 });

function resilientTool(name: string, desc: string, schema: any, handler: (a: any) => Promise<any>) {
  server.tool(name, desc, schema, async (args) => {
    const result = await resilient.call(
      name,
      () => handler(args),
      name === "get_issue" ? [{ name: "cached", execute: async () => ({ content: [{ type: "text", text: "⚠️ Live data unavailable." }] }) }] : undefined
    );
    return typeof result === "object" && "value" in result ? (result as any).value : result;
  });
}
```

---

## Resilience theo Tool Type

| Loại | Retry | Breaker | Fallback |
|------|-------|---------|----------|
| Read | 3 lần, 1s | 5 fail → 30s | Cached data |
| Write | 2 lần, 2s | 3 fail → 60s | Queue retry |
| Search | 3 lần, 1s | 5 fail → 30s | Simplify query |
| Batch | 1 lần | 2 fail → 120s | Process individually |

---

## Checklist

- [ ] Mỗi tool có retry strategy
- [ ] Circuit breaker threshold theo từng tool type
- [ ] Read tools có fallback
- [ ] Circuits tự động half-open sau cooldown
- [ ] Graceful degradation message thân thiện
- [ ] Breaker status expose qua admin endpoint

---

| Day | Chủ đề |
|-----|--------|
| 1 | Observability & Telemetry ✅ |
| 2 | Caching Strategies ✅ |
| 3 | **Error Handling & Resilience ✅** |
| 4 | A/B Testing Prompts & Configs |
| 5 | Multi-Region & High Availability |
| 6 | Building an Internal Agent Platform |

---

*Series: AI Agents trong Production. Day 3: Ba lớp resilience (retry → circuit breaker → fallback chain) với graceful degradation.*
