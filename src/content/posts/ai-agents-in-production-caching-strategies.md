---
title: "AI Agents in Production — Day 2: Caching Strategies"
description: "Stop paying for the same LLM call twice. Implement semantic caching, tool result caching, session-aware TTLs, and cache invalidation for AI agents — with Redis and embeddings."
published: 2026-06-14
pubDate: 2026-06-14T05:00:00.000Z
slug: ai-agents-in-production-caching-strategies
tags:
  - ai-agents
  - production
  - caching
  - redis
  - semantic-cache
  - embeddings
  - performance
  - cost-optimization
category: ai-agents
lang: en
series:
  name: "AI Agents in Production"
  order: 2
  total: 6
---

Observability told us what the agent is doing. Now let's stop paying for the same work twice.

In a typical agent session, the LLM asks the same questions repeatedly:
- "What issues are open?" — asked 3 times with slightly different wording
- "Show me issue #42" — fetched 5 times because context windows reset
- `list_issues(owner="foo", repo="bar", state="open")` — called 4 times identically

Without caching, every call burns tokens and API quota. With caching, identical and semantically similar requests get served from cache in milliseconds.

---

## What We're Building

```
┌──────────────┐     ┌───────────────────┐     ┌─────────┐
│   Agent      │────▶│  Cache Middleware  │────▶│   LLM   │
│   Runtime    │     │                    │     │   API   │
│              │     │  ┌───────────┐    │     └─────────┘
│  Tool Call   │     │  │ Semantic  │    │     ┌─────────┐
│  LLM Request │     │  │ Cache     │    │────▶│  Redis  │
│  Resource    │     │  │ (Embed)   │    │     └─────────┘
│  Read        │     │  └───────────┘    │
└──────────────┘     │  ┌───────────┐    │
                     │  │ Exact     │    │
                     │  │ Cache     │    │
                     │  │ (TTL)     │    │
                     │  └───────────┘    │
                     │  ┌───────────┐    │
                     │  │ Tool      │    │
                     │  │ Result    │    │
                     │  │ Cache     │    │
                     │  └───────────┘    │
                     └───────────────────┘
```

Three layers:

| Layer | Strategy | Cache key | TTL | Hit rate |
|-------|----------|-----------|-----|----------|
| Exact match | Key = serialized input | `tool:list_issues:{"owner":"foo"...}` | 30-60s | Low (10-15%) |
| Semantic | Key = embedding similarity | `embed:query:text` → nearest neighbor | 5-30min | High (30-50%) |
| Tool result | Key = tool + params hash | `result:issues:sha256(params)` | 10-60s | Medium (20-30%) |

---

## Step 1: Install Dependencies

```bash
cd github-issue-mcp
npm install ioredis
npm install --save-dev @types/ioredis
```

You'll need Redis running locally:

```bash
docker run -d --name redis-cache -p 6379:6379 redis:7-alpine
```

---

## Step 2: The Core Cache Interface

All cache layers implement the same interface, so they're swappable and composable.

### `src/cache/interface.ts`

```typescript
// src/cache/interface.ts — Generic cache interface

export interface CacheEntry<T> {
  value: T;
  cachedAt: number;
  expiresAt: number;
  hitCount: number;
}

export interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  avgTtlRemaining: number;
}

export interface CacheLayer {
  get<T>(key: string): Promise<CacheEntry<T> | null>;
  set<T>(key: string, value: T, ttlMs: number): Promise<void>;
  del(key: string): Promise<void>;
  clear(pattern?: string): Promise<number>;
  stats(): Promise<CacheStats>;
}
```

---

## Step 3: Exact Match Cache (Redis-Backed)

### `src/cache/exact-cache.ts`

```typescript
// src/cache/exact-cache.ts — TTL-based exact key match via Redis

import Redis from "ioredis";
import { CacheEntry, CacheLayer, CacheStats } from "./interface.js";

export class ExactCache implements CacheLayer {
  private redis: Redis;
  private prefix: string;
  private internalHits = 0;
  private internalMisses = 0;

  constructor(redis?: Redis, prefix = "exact:") {
    this.redis = redis || new Redis();
    this.prefix = prefix;
  }

  async get<T>(key: string): Promise<CacheEntry<T> | null> {
    const data = await this.redis.get(`${this.prefix}${key}`);
    if (!data) {
      this.internalMisses++;
      return null;
    }

    const entry: CacheEntry<T> = JSON.parse(data);
    if (Date.now() > entry.expiresAt) {
      await this.redis.del(`${this.prefix}${key}`);
      this.internalMisses++;
      return null;
    }

    this.internalHits++;
    entry.hitCount++;
    // Update hit count in background (fire and forget)
    this.redis.set(
      `${this.prefix}${key}`,
      JSON.stringify(entry),
      "PX",
      entry.expiresAt - Date.now()
    );
    return entry;
  }

  async set<T>(key: string, value: T, ttlMs: number): Promise<void> {
    const entry: CacheEntry<T> = {
      value,
      cachedAt: Date.now(),
      expiresAt: Date.now() + ttlMs,
      hitCount: 0,
    };
    await this.redis.set(
      `${this.prefix}${key}`,
      JSON.stringify(entry),
      "PX",
      ttlMs
    );
  }

  async del(key: string): Promise<void> {
    await this.redis.del(`${this.prefix}${key}`);
  }

  async clear(pattern?: string): Promise<number> {
    const keys = await this.redis.keys(`${this.prefix}${pattern || "*"}`);
    if (keys.length === 0) return 0;
    return await this.redis.del(...keys);
  }

  async stats(): Promise<CacheStats> {
    const keys = await this.redis.keys(`${this.prefix}*`);
    return {
      hits: this.internalHits,
      misses: this.internalMisses,
      size: keys.length,
      avgTtlRemaining: 0, // Would need to scan each key
    };
  }
}
```

### Usage:

```typescript
const exactCache = new ExactCache();

// Store tool result for 30 seconds
const key = `tool:list_issues:${JSON.stringify({ owner: "foo", repo: "bar" })}`;
await exactCache.set(key, issues, 30_000);

// Retrieve later
const cached = await exactCache.get<typeof issues>(key);
if (cached) {
  console.log(`Cache HIT (${cached.hitCount} previous hits)`);
  return cached.value;
}
```

---

## Step 4: Semantic Cache (Embedding-Based)

Semantic cache uses embeddings to find similar queries. When the LLM asks "show open bugs" and later asks "list all open issues", semantic cache recognizes they're the same intent.

### `src/cache/semantic-cache.ts`

```typescript
// src/cache/semantic-cache.ts — Embedding similarity cache

import Redis from "ioredis";
import { CacheEntry, CacheLayer, CacheStats } from "./interface.js";

interface SemanticEntry {
  key: string;
  embedding: number[];
  value: string; // Serialized JSON
  cachedAt: number;
  expiresAt: number;
  hitCount: number;
}

export class SemanticCache implements CacheLayer {
  private redis: Redis;
  private prefix: string;
  private similarityThreshold: number;
  private internalHits = 0;
  private internalMisses = 0;

  // Simple hash-based embedding for demonstration.
  // In production, use OpenAI/text-embedding-3-small or voyage-large-2.
  private static readonly EMBEDDING_DIM = 64;

  constructor(
    redis?: Redis,
    prefix = "semantic:",
    similarityThreshold = 0.85
  ) {
    this.redis = redis || new Redis();
    this.prefix = prefix;
    this.similarityThreshold = similarityThreshold;
  }

  /**
   * Simple character-n-gram hash embedding.
   * Not as good as real embeddings, but demonstrates the concept.
   * Replace with an actual embedding API in production.
   */
  static textToEmbedding(text: string): number[] {
    const dim = SemanticCache.EMBEDDING_DIM;
    const vector = new Array(dim).fill(0);

    // Normalize: lowercase + remove punctuation
    const cleaned = text.toLowerCase().replace(/[^a-z0-9\s]/g, "");

    // Character trigrams as features
    for (let i = 0; i < cleaned.length - 2; i++) {
      const trigram = cleaned.slice(i, i + 3);
      let hash = 0;
      for (let j = 0; j < trigram.length; j++) {
        hash = ((hash << 5) - hash) + trigram.charCodeAt(j);
        hash = hash & hash; // Convert to 32-bit int
      }
      const idx = Math.abs(hash) % dim;
      vector[idx] += 1;
    }

    // L2 normalize
    const magnitude = Math.sqrt(vector.reduce((s, v) => s + v * v, 0));
    if (magnitude === 0) return vector;
    return vector.map((v) => v / magnitude);
  }

  /**
   * Cosine similarity between two vectors.
   */
  static cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
    return magnitude === 0 ? 0 : dotProduct / magnitude;
  }

  /**
   * Set a semantic cache entry.
   * Query text is embedded and stored alongside the response.
   */
  async set<T>(text: string, value: T, ttlMs: number): Promise<void> {
    const entry: SemanticEntry = {
      key: text,
      embedding: SemanticCache.textToEmbedding(text),
      value: JSON.stringify(value),
      cachedAt: Date.now(),
      expiresAt: Date.now() + ttlMs,
      hitCount: 0,
    };

    // Store by exact key for direct lookup
    await this.redis.set(
      `${this.prefix}${text}`,
      JSON.stringify(entry),
      "PX",
      ttlMs
    );

    // Also add to similarity index (stored as sorted set)
    await this.redis.zadd(
      `${this.prefix}index`,
      Date.now(),
      text
    );
  }

  /**
   * Find a semantically similar cached entry.
   * Returns the closest match above the similarity threshold.
   */
  async get<T>(query: string): Promise<CacheEntry<T> | null> {
    const queryEmbedding = SemanticCache.textToEmbedding(query);

    // Get all active cache entries from the index
    const entries = await this.redis.zrangebyscore(
      `${this.prefix}index`,
      Date.now() - 3600_000, // Last hour
      Date.now()
    );

    let bestMatch: { similarity: number; entry: SemanticEntry } | null = null;

    for (const key of entries) {
      const data = await this.redis.get(`${this.prefix}${key}`);
      if (!data) continue;

      const entry: SemanticEntry = JSON.parse(data);
      if (Date.now() > entry.expiresAt) {
        await this.redis.del(`${this.prefix}${key}`);
        continue;
      }

      const similarity = SemanticCache.cosineSimilarity(
        queryEmbedding,
        entry.embedding
      );

      if (similarity > (bestMatch?.similarity || 0)) {
        bestMatch = { similarity, entry };
      }
    }

    if (bestMatch && bestMatch.similarity >= this.similarityThreshold) {
      this.internalHits++;
      return {
        value: JSON.parse(bestMatch.entry.value) as T,
        cachedAt: bestMatch.entry.cachedAt,
        expiresAt: bestMatch.entry.expiresAt,
        hitCount: bestMatch.entry.hitCount + 1,
      };
    }

    this.internalMisses++;
    return null;
  }

  // ——— Interface methods ———
  async del(key: string): Promise<void> {
    await this.redis.del(`${this.prefix}${key}`);
    await this.redis.zrem(`${this.prefix}index`, key);
  }

  async clear(pattern?: string): Promise<number> {
    const keys = await this.redis.keys(`${this.prefix}${pattern || "*"}`);
    const indexKeys = keys.filter(k => !k.includes(":index"));
    if (indexKeys.length === 0) return 0;

    // Remove from both stores
    const keysToDel = indexKeys.map(k => k.replace(`${this.prefix}`, ""));
    await this.redis.zrem(`${this.prefix}index`, ...keysToDel);
    return await this.redis.del(...indexKeys);
  }

  async stats(): Promise<CacheStats> {
    const indexSize = await this.redis.zcard(`${this.prefix}index`);
    return {
      hits: this.internalHits,
      misses: this.internalMisses,
      size: indexSize,
      avgTtlRemaining: 0,
    };
  }
}
```

### Real embedding API alternative:

```typescript
// In production, replace textToEmbedding with a real embedding API:
export class RealEmbeddingCache extends SemanticCache {
  private embedApiKey: string;

  constructor(apiKey: string, redis?: Redis) {
    super(redis);
    this.embedApiKey = apiKey;
  }

  override async set<T>(text: string, value: T, ttlMs: number): Promise<void> {
    // Get real embedding from API
    const embedding = await this.fetchEmbedding(text);
    // ... store with embedding from API instead of hash
  }

  private async fetchEmbedding(text: string): Promise<number[]> {
    const response = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.embedApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "text-embedding-3-small",
        input: text,
      }),
    });
    const data = await response.json() as any;
    return data.data[0].embedding;
  }
}
```

### Semantic cache in action:

```
Query 1: "list all open issues in owner/repo"
  ↓ embed → [0.12, -0.34, 0.87, ...]
  ↓ store

Query 2: "show me the open bugs in owner/repo"
  ↓ embed → [0.11, -0.33, 0.85, ...]
  ↓ cosine similarity → 0.94 (above 0.85 threshold)
  ↓ CACHE HIT — return cached response
```

---

## Step 5: Tool Result Cache

Tool results have different caching rules than LLM responses. A `list_issues` call returns data that changes (new issues get created). A `get_issue` call returns stable data (issue details don't change often).

### `src/cache/tool-cache.ts`

```typescript
// src/cache/tool-cache.ts — Tool-specific caching rules

import { ExactCache } from "./exact-cache.js";
import { ToolTracer } from "../telemetry/tool-tracer.js";

/**
 * Caching rules per tool.
 * Short TTL for mutable data, longer for immutable.
 */
const TOOL_CACHE_RULES: Record<string, { ttlMs: number; staleWhileRevalidate: boolean }> = {
  // Read-only tools — safe to cache
  "get_issue":      { ttlMs: 60_000, staleWhileRevalidate: true },   // 1 min
  "list_issues":    { ttlMs: 30_000, staleWhileRevalidate: true },   // 30 sec
  "search_issues":  { ttlMs: 30_000, staleWhileRevalidate: true },   // 30 sec
  "list_issues_paginated": { ttlMs: 30_000, staleWhileRevalidate: true },

  // Mutating tools — never cache
  "create_issue":   { ttlMs: 0, staleWhileRevalidate: false },
  "update_issue":   { ttlMs: 0, staleWhileRevalidate: false },
  "batch_label_issues": { ttlMs: 0, staleWhileRevalidate: false },
};

export class ToolResultCache {
  private cache: ExactCache;

  constructor(cache?: ExactCache) {
    this.cache = cache || new ExactCache();
  }

  /**
   * Generate a deterministic cache key from tool name and params.
   * Sorted keys ensure {a:1,b:2} == {b:2,a:1}.
   */
  private makeKey(tool: string, params: Record<string, unknown>): string {
    const sorted = Object.keys(params)
      .sort()
      .reduce((acc: Record<string, unknown>, key: string) => {
        acc[key] = params[key];
        return acc;
      }, {});
    return `tool:${tool}:${JSON.stringify(sorted)}`;
  }

  /**
   * Try to get cached result. Returns null if not cached or TTL expired.
   * If staleWhileRevalidate, returns stale data + refreshes in background.
   */
  async get<T>(
    tool: string,
    params: Record<string, unknown>
  ): Promise<{ value: T; stale: boolean } | null> {
    const rules = TOOL_CACHE_RULES[tool];
    if (!rules || rules.ttlMs === 0) return null; // Don't cache

    const key = this.makeKey(tool, params);
    const entry = await this.cache.get<T>(key);

    if (!entry) return null;

    const age = Date.now() - entry.cachedAt;
    if (age > rules.ttlMs && rules.staleWhileRevalidate) {
      // Return stale data, caller refreshes in background
      return { value: entry.value, stale: true };
    }

    return { value: entry.value, stale: false };
  }

  /**
   * Store tool result in cache.
   * Also invalidates related caches (e.g., create_issue invalidates list_issues).
   */
  async set<T>(tool: string, params: Record<string, unknown>, value: T): Promise<void> {
    const rules = TOOL_CACHE_RULES[tool];
    if (!rules || rules.ttlMs === 0) return;

    const key = this.makeKey(tool, params);
    await this.cache.set(key, value, rules.ttlMs);

    // Invalidate related caches on mutation
    if (tool === "create_issue" || tool === "update_issue") {
      await this.cache.clear("tool:list_issues:*");
      await this.cache.clear("tool:search_issues:*");
    }
  }
}
```

### Stale-while-revalidate pattern:

```typescript
const cache = new ToolResultCache();

async function cachedToolCall<T>(
  tool: string,
  params: Record<string, unknown>,
  freshFn: () => Promise<T>
): Promise<T> {
  const cached = await cache.get<T>(tool, params);

  if (cached) {
    if (!cached.stale) {
      return cached.value; // Fresh enough, return immediately
    }
    // Stale — refresh in background, return stale data now
    freshFn().then(fresh => cache.set(tool, params, fresh));
    return cached.value;
  }

  // Cache miss — call fresh, store result
  const fresh = await freshFn();
  await cache.set(tool, params, fresh);
  return fresh;
}
```

---

## Step 6: Multi-Layer Cache Orchestrator

Combines all three layers into one interface with fallthrough.

### `src/cache/cache-orchestrator.ts`

```typescript
// src/cache/cache-orchestrator.ts — Multi-layer cache with fallthrough

import { ExactCache } from "./exact-cache.js";
import { SemanticCache } from "./semantic-cache.js";
import { ToolResultCache } from "./tool-cache.js";

export type CacheLayerType = "exact" | "semantic" | "tool";

export interface OrchestratorStats {
  exact: { hits: number; misses: number };
  semantic: { hits: number; misses: number };
  tool: { hits: number; misses: number };
}

export class CacheOrchestrator {
  public exact: ExactCache;
  public semantic: SemanticCache;
  public tool: ToolResultCache;

  constructor() {
    this.exact = new ExactCache();
    this.semantic = new SemanticCache();
    this.tool = new ToolResultCache();
  }

  /**
   * Try exact cache first, then semantic, then fall through to fresh.
   */
  async getCachedOrFetch<T>(
    input: { text?: string; tool?: string; params?: Record<string, unknown> },
    fetchFn: () => Promise<T>,
    options?: { semanticThreshold?: number }
  ): Promise<{ value: T; from: CacheLayerType }> {
    const { text, tool, params } = input;

    // 1. Try exact match (fastest)
    if (text) {
      const exact = await this.exact.get<T>(text);
      if (exact) {
        return { value: exact.value, from: "exact" };
      }
    }

    // 2. Try tool result cache
    if (tool && params) {
      const cached = await this.tool.get<T>(tool, params);
      if (cached && !cached.stale) {
        return { value: cached.value, from: "tool" };
      }
    }

    // 3. Try semantic cache
    if (text) {
      const semantic = await this.semantic.get<T>(text);
      if (semantic) {
        return { value: semantic.value, from: "semantic" };
      }
    }

    // 4. Cache miss — fetch fresh
    const fresh = await fetchFn();

    // Store in all applicable caches
    if (text) {
      await this.exact.set(text, fresh, 30_000);
      await this.semantic.set(text, fresh, 300_000);
    }
    if (tool && params) {
      await this.tool.set(tool, params, fresh);
    }

    return { value: fresh, from: "exact" as CacheLayerType }; // "fresh" = stored as exact
  }

  /**
   * Invalidate caches after a mutation.
   */
  async invalidateOnMutation(tool: string, params: Record<string, unknown>) {
    // Exact: clear matching entries
    if (tool === "create_issue" || tool === "update_issue") {
      await this.exact.clear("tool:list_issues:*");
      await this.exact.clear("tool:search_issues:*");
      await this.exact.clear("tool:get_issue:*");

      // Semantic: only invalidate entries containing affected repo
      const repoHint = params.repo ? `*${params.repo}*` : "*";
      await this.semantic.clear(repoHint);
    }
  }

  async stats(): Promise<OrchestratorStats> {
    const [exactStats, semanticStats, toolStats] = await Promise.all([
      this.exact.stats(),
      this.semantic.stats(),
      this.tool["cache"].stats(),
    ]);
    return {
      exact: { hits: exactStats.hits, misses: exactStats.misses },
      semantic: { hits: semanticStats.hits, misses: semanticStats.misses },
      tool: { hits: toolStats.hits, misses: toolStats.misses },
    };
  }
}
```

---

## Step 7: Integration with the Agent

Wire the cache orchestrator into the instrumented tool tracer from Day 1.

### `src/server-with-cache.ts`

```typescript
import { CacheOrchestrator } from "./cache/cache-orchestrator.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ToolTracer } from "./telemetry/tool-tracer.js";
import { AgentLogger } from "./telemetry/logger.js";

const server = new McpServer({ name: "github-issue-manager", version: "1.0.3" });
const cache = new CacheOrchestrator();

function instrumentedAndCachedTool(
  name: string,
  description: string,
  schema: any,
  handler: (args: any) => Promise<any>
) {
  server.tool(name, description, schema, async (args) => {
    const logger = new AgentLogger();
    const tracer = new ToolTracer(logger);
    const serializedQuery = JSON.stringify(args);

    try {
      const { value, from } = await cache.getCachedOrFetch(
        {
          text: `${name}: ${serializedQuery}`,
          tool: name,
          params: args,
        },
        // Fresh fetch function
        async () => {
          const { result } = await tracer.traceToolCall(name, args, () => handler(args));
          return result;
        }
      );

      // Log cache layer info
      logger.info("tool_call_result", {
        tool: name,
        cacheLayer: from,
        inputSize: serializedQuery.length,
      });

      return value;
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error: ${error}` }],
        isError: true,
      };
    }
  });
}

// Register tools with caching
instrumentedAndCachedTool("list_issues", "List issues", { /* ... */ }, async (args) => { /* ... */ });
instrumentedAndCachedTool("get_issue", "Get issue", { /* ... */ }, async (args) => { /* ... */ });
instrumentedAndCachedTool("search_issues", "Search issues", { /* ... */ }, async (args) => { /* ... */ });
// Mutations still get traced but not cached (handled by ToolResultCache rules)
instrumentedAndCachedTool("create_issue", "Create issue", { /* ... */ }, async (args) => { /* ... */ });
```

---

## Step 8: Cache Monitoring Dashboard

Expose cache statistics alongside metrics from Day 1.

```typescript
app.get("/cache/stats", async (req, res) => {
  const stats = await cache.stats();
  const totalHits = stats.exact.hits + stats.semantic.hits + stats.tool.hits;
  const totalMisses = stats.exact.misses + stats.semantic.misses + stats.tool.misses;
  const hitRate = totalHits + totalMisses > 0
    ? (totalHits / (totalHits + totalMisses) * 100).toFixed(1)
    : "N/A";

  res.json({
    hitRate: `${hitRate}%`,
    layers: stats,
    estimatedSavings: {
      exact: `$${(stats.exact.hits * 0.001).toFixed(3)}`, // ~$0.001 saved per exact hit
      semantic: `$${(stats.semantic.hits * 0.005).toFixed(2)}`,
      tool: `$${(stats.tool.hits * 0.003).toFixed(2)}`,
    },
  });
});
```

### Expected output:

```json
{
  "hitRate": "42.3%",
  "layers": {
    "exact": { "hits": 234, "misses": 512 },
    "semantic": { "hits": 89, "misses": 178 },
    "tool": { "hits": 156, "misses": 234 }
  },
  "estimatedSavings": {
    "exact": "$0.47",
    "semantic": "$0.18",
    "tool": "$0.31"
  }
}
```

---

## Cache Strategy Decision Matrix

| Type of data | Cache layer | TTL | Example | Cost saved |
|-------------|-------------|-----|---------|------------|
| LLM response "what issues are open?" | Semantic | 5 min | Same question, different words | Token cost × 3-5x |
| Tool result `get_issue(#42)` | Exact | 1 min | Same params, repeated call | API rate limit |
| Tool result `list_issues(open)` | Exact | 30s | Browsing different issues | API calls |
| `create_issue` result | None (0 TTL) | — | Mutation | — |
| System prompt | Manual prefetch | Session | Agent instructions | Token cost daily |
| Embedding vector | Semantic | 30 min | Text similarity search | Embedding API cost |

---

## Production Considerations

### Cache invalidation is hard

```typescript
// Problem: user creates issue, then lists issues — stale data shown
// Solution: invalidate list_issues cache on create_issue mutation
await cache.invalidateOnMutation("create_issue", { owner: "foo", repo: "bar" });
```

### Tune thresholds based on data

```typescript
// For issue titles (short, distinct) — lower threshold is fine
const semantic = new SemanticCache(redis, "semantic:", 0.80);

// For bug report bodies (long, similar) — higher threshold to avoid wrong matches
const semanticStrict = new SemanticCache(redis, "semantic:", 0.92);
```

### Cache warming for common queries

```typescript
// Pre-cache common queries at startup
async function warmCache() {
  const commonQueries = [
    "show open issues in my repository",
    "list all bugs",
    "what needs attention",
  ];
  for (const query of commonQueries) {
    await semantic.set(query, "placeholder", 300_000);
  }
}
```

---

## Summary

| Concept | Implementation | Benefit |
|---------|---------------|---------|
| Exact cache | `<tool>:<params>` → Redis TTL | Fastest, deterministic |
| Semantic cache | Embedding → cosine similarity → nearest neighbor | Catches rephrased queries |
| Tool result cache | `ToolResultCache` with per-tool rules | Predictable TTLs |
| Stale-while-revalidate | Return stale + refresh in background | Zero-latency reads |
| Cache orchestrator | Fallthrough: exact → tool → semantic → fresh | Best hit rate |
| Invalidation | Mutation-aware cascade clear | Data freshness |

### Checklist:
- [ ] Redis running and accessible
- [ ] Exact cache configured with per-tool TTLs
- [ ] Semantic cache threshold tuned (start at 0.85)
- [ ] Mutation tools invalidate related caches
- [ ] Stale-while-revalidate enabled for read tools
- [ ] Cache stats endpoint exposes hit rate
- [ ] Cost savings tracked in dashboard

---

| Day | Topic |
|-----|-------|
| 1 | Observability & Telemetry ✅ |
| 2 | **Caching Strategies ✅** |
| 3 | Error Handling & Resilience |
| 4 | A/B Testing Prompts & Configs |
| 5 | Multi-Region & High Availability |
| 6 | Building an Internal Agent Platform |

---

*Series: AI Agents in Production. Day 2: Three-layer caching (exact, semantic, tool-result) with Redis, embeddings, TTL-based invalidation, and stale-while-revalidate. Full TypeScript source code included.*
