---
title: "AI Agents trong Production — Day 2: Caching Strategies"
description: "Đừng trả tiền cho cùng một LLM call hai lần. Triển khai semantic caching, exact caching, tool result caching với Redis và embeddings cho AI agent."
published: 2026-06-14
pubDate: 2026-06-14T05:00:00.000Z
slug: ai-agents-in-production-caching-strategies-vi
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
lang: vi
series:
  name: "AI Agents in Production"
  order: 2
  total: 6
---

Observability cho ta biết agent đang làm gì. Giờ hãy ngừng trả tiền cho cùng một việc hai lần.

Agent thường hỏi cùng câu hỏi với cách diễn đạt khác nhau:
- "Có issue nào đang open?" — hỏi 3 lần, wording khác nhau
- "Show issue #42" — fetch 5 lần vì context window bị reset
- `list_issues(open)` — gọi 4 lần với params giống hệt

Không cache → tốn token + API quota. Có cache → response trong milliseconds.

---

## 3 Layers

| Layer | Strategy | Cache key | TTL | Hit rate |
|-------|----------|-----------|-----|----------|
| Exact | Key = serialized input | `tool:list_issues:{...}` | 30-60s | 10-15% |
| Semantic | Key = embedding similarity | `embed:text` → nearest neighbor | 5-30min | 30-50% |
| Tool result | Key = tool + params hash | `result:issues:sha256(params)` | 10-60s | 20-30% |

---

## Step 1: Cài đặt

```bash
npm install ioredis
docker run -d --name redis-cache -p 6379:6379 redis:7-alpine
```

---

## Step 2: Cache Interface Chung

### `src/cache/interface.ts`

```typescript
export interface CacheEntry<T> {
  value: T;
  cachedAt: number;
  expiresAt: number;
  hitCount: number;
}

export interface CacheStats {
  hits: number; misses: number; size: number;
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

## Step 3: Exact Cache

### `src/cache/exact-cache.ts`

```typescript
import Redis from "ioredis";
import { CacheEntry, CacheLayer, CacheStats } from "./interface.js";

export class ExactCache implements CacheLayer {
  private redis: Redis;
  private prefix = "exact:";
  private hits = 0; private misses = 0;

  constructor(redis?: Redis) { this.redis = redis || new Redis(); }

  async get<T>(key: string): Promise<CacheEntry<T> | null> {
    const data = await this.redis.get(`${this.prefix}${key}`);
    if (!data) { this.misses++; return null; }
    const entry: CacheEntry<T> = JSON.parse(data);
    if (Date.now() > entry.expiresAt) {
      await this.redis.del(`${this.prefix}${key}`);
      this.misses++; return null;
    }
    this.hits++; entry.hitCount++;
    return entry;
  }

  async set<T>(key: string, value: T, ttlMs: number): Promise<void> {
    await this.redis.set(`${this.prefix}${key}`,
      JSON.stringify({ value, cachedAt: Date.now(), expiresAt: Date.now() + ttlMs, hitCount: 0 }),
      "PX", ttlMs);
  }

  async del(key: string): Promise<void> { await this.redis.del(`${this.prefix}${key}`); }

  async clear(pattern = "*"): Promise<number> {
    const keys = await this.redis.keys(`${this.prefix}${pattern}`);
    return keys.length ? await this.redis.del(...keys) : 0;
  }

  stats = async (): Promise<CacheStats> => ({
    hits: this.hits, misses: this.misses,
    size: (await this.redis.keys(`${this.prefix}*`)).length,
  });
}
```

---

## Step 4: Semantic Cache

Dùng embedding để tìm query tương tự.

### `src/cache/semantic-cache.ts`

```typescript
import Redis from "ioredis";
import { CacheEntry, CacheLayer } from "./interface.js";

interface SemanticEntry {
  key: string; embedding: number[]; value: string;
  cachedAt: number; expiresAt: number; hitCount: number;
}

export class SemanticCache implements CacheLayer {
  private redis: Redis;
  private prefix = "semantic:";
  private threshold: number;
  private hits = 0; private misses = 0;
  private static DIM = 64;

  constructor(redis?: Redis, threshold = 0.85) {
    this.redis = redis || new Redis();
    this.threshold = threshold;
  }

  // Hash-based embedding (demo). Production: dùng OpenAI/text-embedding-3-small
  static textToEmbedding(text: string): number[] {
    const vec = new Array(SemanticCache.DIM).fill(0);
    const cleaned = text.toLowerCase().replace(/[^a-z0-9\s]/g, "");
    for (let i = 0; i < cleaned.length - 2; i++) {
      const trigram = cleaned.slice(i, i + 3);
      let hash = 0;
      for (let j = 0; j < trigram.length; j++)
        hash = ((hash << 5) - hash) + trigram.charCodeAt(j);
      vec[Math.abs(hash) % SemanticCache.DIM] += 1;
    }
    const mag = Math.sqrt(vec.reduce((s, v) => s + v * v, 0));
    return mag === 0 ? vec : vec.map(v => v / mag);
  }

  static cosineSimilarity(a: number[], b: number[]): number {
    let dot = 0, na = 0, nb = 0;
    for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
    const m = Math.sqrt(na) * Math.sqrt(nb);
    return m === 0 ? 0 : dot / m;
  }

  async get<T>(query: string): Promise<CacheEntry<T> | null> {
    const qEmb = SemanticCache.textToEmbedding(query);
    const keys = await this.redis.zrangebyscore(`${this.prefix}index`, Date.now() - 3600_000, Date.now());

    let best: { sim: number; entry: SemanticEntry } | null = null;
    for (const key of keys) {
      const data = await this.redis.get(`${this.prefix}${key}`);
      if (!data) continue;
      const entry: SemanticEntry = JSON.parse(data);
      if (Date.now() > entry.expiresAt) { await this.redis.del(`${this.prefix}${key}`); continue; }
      const sim = SemanticCache.cosineSimilarity(qEmb, entry.embedding);
      if (sim > (best?.sim || 0)) best = { sim, entry };
    }

    if (best && best.sim >= this.threshold) {
      this.hits++; return { value: JSON.parse(best.entry.value), cachedAt: best.entry.cachedAt, expiresAt: best.entry.expiresAt, hitCount: best.entry.hitCount + 1 };
    }
    this.misses++; return null;
  }

  async set<T>(text: string, value: T, ttlMs: number): Promise<void> {
    const entry: SemanticEntry = {
      key: text, embedding: SemanticCache.textToEmbedding(text),
      value: JSON.stringify(value), cachedAt: Date.now(),
      expiresAt: Date.now() + ttlMs, hitCount: 0,
    };
    await this.redis.set(`${this.prefix}${text}`, JSON.stringify(entry), "PX", ttlMs);
    await this.redis.zadd(`${this.prefix}index`, Date.now(), text);
  }

  async del(key: string): Promise<void> { await this.redis.del(`${this.prefix}${key}`); await this.redis.zrem(`${this.prefix}index`, key); }
  async clear(pattern = "*"): Promise<number> { const keys = await this.redis.keys(`${this.prefix}${pattern}`); const k = keys.filter(k => !k.includes(":index")).map(k => k.replace(this.prefix, "")); if (!k.length) return 0; await this.redis.zrem(`${this.prefix}index`, ...k); return await this.redis.del(...k.map(k => `${this.prefix}${k}`)); }
  async stats() { return { hits: this.hits, misses: this.misses, size: await this.redis.zcard(`${this.prefix}index`) }; }
}
```

**Cách hoạt động:**

```
Query 1: "list all open issues"
  ↓ hash embedding → [0.12, -0.34, ...]
  ↓ store

Query 2: "show open bugs"
  ↓ hash embedding → [0.11, -0.33, ...]
  ↓ cosine similarity = 0.94 > 0.85
  ↓ CACHE HIT
```

---

## Step 5: Tool Result Cache

Tool khác nhau có caching rules khác nhau.

### `src/cache/tool-cache.ts`

```typescript
const TOOL_RULES: Record<string, { ttlMs: number; staleWhileRevalidate: boolean }> = {
  "get_issue":             { ttlMs: 60_000, staleWhileRevalidate: true },   // 1 phút
  "list_issues":           { ttlMs: 30_000, staleWhileRevalidate: true },   // 30 giây
  "search_issues":         { ttlMs: 30_000, staleWhileRevalidate: true },
  "list_issues_paginated": { ttlMs: 30_000, staleWhileRevalidate: true },
  "create_issue":          { ttlMs: 0, staleWhileRevalidate: false },       // Không cache
  "update_issue":          { ttlMs: 0, staleWhileRevalidate: false },
  "batch_label_issues":    { ttlMs: 0, staleWhileRevalidate: false },
};

export class ToolResultCache {
  private cache: ExactCache;

  private makeKey(tool: string, params: Record<string, unknown>): string {
    const sorted = Object.keys(params).sort().reduce((a, k) => { a[k] = params[k]; return a; }, {} as any);
    return `tool:${tool}:${JSON.stringify(sorted)}`;
  }

  async get<T>(tool: string, params: Record<string, unknown>): Promise<{ value: T; stale: boolean } | null> {
    const rules = TOOL_RULES[tool];
    if (!rules || rules.ttlMs === 0) return null;
    const entry = await this.cache.get<T>(this.makeKey(tool, params));
    if (!entry) return null;
    const age = Date.now() - entry.cachedAt;
    if (age > rules.ttlMs && rules.staleWhileRevalidate) return { value: entry.value, stale: true };
    return { value: entry.value, stale: false };
  }

  async set<T>(tool: string, params: Record<string, unknown>, value: T): Promise<void> {
    const rules = TOOL_RULES[tool]; if (!rules || rules.ttlMs === 0) return;
    await this.cache.set(this.makeKey(tool, params), value, rules.ttlMs);
    // Invalidate related caches
    if (["create_issue", "update_issue"].includes(tool)) {
      await this.cache.clear("tool:list_issues:*");
      await this.cache.clear("tool:search_issues:*");
    }
  }
}
```

---

## Step 6: Cache Orchestrator

Kết hợp 3 layers, fallthrough: exact → tool → semantic → fresh.

### `src/cache/cache-orchestrator.ts`

```typescript
export class CacheOrchestrator {
  public exact = new ExactCache();
  public semantic = new SemanticCache();
  public tool = new ToolResultCache();

  async getCachedOrFetch<T>(
    input: { text?: string; tool?: string; params?: Record<string, unknown> },
    fetchFn: () => Promise<T>
  ): Promise<{ value: T; from: string }> {
    // 1. Exact
    if (input.text) {
      const e = await this.exact.get<T>(input.text);
      if (e) return { value: e.value, from: "exact" };
    }
    // 2. Tool result
    if (input.tool && input.params) {
      const c = await this.tool.get<T>(input.tool, input.params);
      if (c && !c.stale) return { value: c.value, from: "tool" };
    }
    // 3. Semantic
    if (input.text) {
      const s = await this.semantic.get<T>(input.text);
      if (s) return { value: s.value, from: "semantic" };
    }
    // 4. Fetch fresh
    const fresh = await fetchFn();
    if (input.text) { await this.exact.set(input.text, fresh, 30_000); await this.semantic.set(input.text, fresh, 300_000); }
    if (input.tool && input.params) await this.tool.set(input.tool, input.params, fresh);
    return { value: fresh, from: "fresh" };
  }
}
```

---

## Step 7: Kiểm Tra

```bash
npm run build
export GITHUB_TOKEN="ghp_..."
node build/server-with-cache.js
```

```bash
curl http://localhost:3001/cache/stats
```

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

## Cache Decision Matrix

| Data type | Layer | TTL | Cost saved |
|-----------|-------|-----|------------|
| LLM response "what issues are open?" | Semantic | 5 min | Token cost × 3-5x |
| Tool result (read) | Exact | 1 min | API rate limit |
| Tool result (list) | Exact | 30s | API calls |
| Mutation | None (0 TTL) | — | — |
| Embedding | Semantic | 30 min | Embedding API cost |
| System prompt | Manual prefetch | Session | Token cost daily |

---

## Checklist

- [ ] Redis running
- [ ] Exact cache: per-tool TTLs
- [ ] Semantic cache: threshold tuned (start 0.85)
- [ ] Invalidation: mutations clear related caches
- [ ] Stale-while-revalidate cho read tools
- [ ] Cache stats endpoint

---

| Day | Chủ đề |
|-----|--------|
| 1 | Observability & Telemetry ✅ |
| 2 | **Caching Strategies ✅** |
| 3 | Error Handling & Resilience |
| 4 | A/B Testing Prompts & Configs |
| 5 | Multi-Region & High Availability |
| 6 | Building an Internal Agent Platform |

---

*Series: AI Agents trong Production. Day 2: Ba lớp cache (exact, semantic, tool-result) với Redis, embeddings, và stale-while-revalidate.*
