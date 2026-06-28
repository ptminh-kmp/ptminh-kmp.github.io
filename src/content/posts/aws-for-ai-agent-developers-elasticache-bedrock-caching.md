---
title: "AWS for AI/Agent Developers — Day 3: LLM Caching with ElastiCache + Bedrock"
description: "Cut LLM latency and cost by 40-70% with semantic caching on Redis and Bedrock prompt caching. Config-driven cache policies, invalidation, and monitoring."
published: 2026-06-28
pubDate: 2026-06-28T02:00:00.000Z
slug: aws-for-ai-agent-developers-elasticache-bedrock-caching
tags:
  - aws
  - elasticache
  - bedrock
  - llm-caching
  - redis
  - semantics
  - cost-optimization
category: aws
lang: en
series:
  name: "AWS for AI/Agent Developers"
  order: 3
  total: 6
---

LLM calls are the most expensive and slowest part of any agent system. A single generation can cost $0.01-0.10 and take 2-10 seconds. In production, those milliseconds and cents multiply fast.

Two caching strategies cut that dramatically:

1. **Bedrock Prompt Caching** — Server-side cache on the model provider. No code change. Amazon's internal cache matches against recent prompts.
2. **Semantic Cache on Redis** — Application-side cache. Embed prompts, store semantically similar results. Works for any model, any provider.

Combined, you can reduce LLM costs by 40-70% and latency by 60-90% (from seconds to milliseconds).

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Agent      │────▶│  Cache       │────▶│  LLM         │
│   Runtime    │     │  Layer       │     │  (Bedrock)   │
│              │     │              │     │              │
│  Prompt      │     │  ┌────────┐ │     │  ┌────────┐  │
│  Generation  │     │  │ Redis  │ │     │  │ Claude │  │
│              │     │  │Cache   │ │     │  │ Sonnet │  │
│              │     │  └───┬────┘ │     │  └────────┘  │
│              │     │      │      │     │              │
│              │     │  ┌───┴────┐ │     │  Bedrock     │
│              │     │  │Semantic│ │     │  Prompt      │
│              │     │  │Matcher │ │     │  Cache       │
│              │     │  └────────┘ │     │  (Built-in)  │
└──────────────┘     └──────────────┘     └──────────────┘
```

---

## Strategy 1: Bedrock Prompt Caching (Zero Code)

Bedrock supports prompt caching for Anthropic Claude models. When you send a prompt identical to one sent recently, Bedrock returns the cached response almost instantly at ~90% cost reduction.

> **Cache hit:** ~$0.003 vs fresh call ~$0.03 (for Claude Sonnet, ~500 token prompt)

### Enable via AWS CLI:

```bash
# Bedrock prompt caching is model-specific and region-specific.
# It's enabled by default — no config needed.
# Cache window: ~5 minutes (sliding)

# Verify caching works by sending duplicate prompts:
aws bedrock-runtime converse \
  --model-id anthropic.claude-3-5-sonnet-20241022-v2:0 \
  --messages '[{"role":"user","content":[{"text":"What is MCP in 10 words?"}]}]'

# Send again — if within 5 min, Bedrock returns cached result.
# You'll see CacheReadInputTokens / CacheReadOutputTokens in CloudWatch.
```

**Limitations:**
- Cache window is ~5 minutes (sliding)
- Exact prompt match only — no semantic similarity
- Model-specific (Claude Sonnet 3.5 v2, Haiku 3.5)
- Region-specific

### Monitor cache hits in CloudWatch:

```bash
aws cloudwatch get-metric-statistics \
  --namespace AWS/Bedrock \
  --metric-name CacheReadInputTokens \
  --dimensions Name=ModelId,Value=anthropic.claude-3-5-sonnet-20241022-v2:0 \
  --start-time "2026-06-28T00:00:00Z" --end-time "2026-06-28T23:00:00Z" \
  --period 300 --statistics Sum
```

---

## Strategy 2: Semantic Cache on Redis (Full Control)

This is where the real savings live. Instead of exact matching, we:
1. Generate an embedding for each prompt
2. Store in Redis with embedding vector + response + metadata
3. On new prompt: check if a semantically similar prompt was cached
4. If similarity > threshold, return cached response

### Setup ElastiCache Redis

```bash
# Create Redis cluster with vector search support (Redis Stack)
aws elasticache create-serverless-cache \
  --serverless-cache-name llm-semantic-cache \
  --engine redis \
  --major-engine-version 7 \
  --description "LLM prompt semantic cache"

# Note endpoint from output
aws elasticache describe-serverless-caches \
  --serverless-cache-name llm-semantic-cache \
  --query 'ServerlessCaches[0].Endpoint'
```

### `src/cache/semantic-cache.ts`

```typescript
// src/cache/semantic-cache.ts — Redis-backed semantic cache for LLM prompts

import { createClient, RedisClientType } from "redis";
import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";

interface CacheEntry {
  prompt: string;
  response: string;
  embedding: number[];
  modelId: string;
  tokensIn: number;
  tokensOut: number;
  timestamp: number;
  hitCount: number;
}

interface CacheConfig {
  modelId: string;
  similarityThreshold: number;   // 0.0 - 1.0, default ~0.92
  maxCacheAgeMs: number;         // TTL per entry
  maxEntries: number;            // Evict when exceeded
  enabled: boolean;              // Quick toggle
}

const DEFAULT_CONFIGS: Record<string, CacheConfig> = {
  "claude-sonnet": {
    modelId: "anthropic.claude-3-5-sonnet-20241022-v2:0",
    similarityThreshold: 0.92,
    maxCacheAgeMs: 300_000,       // 5 minutes (matches Bedrock cache window)
    maxEntries: 10_000,
    enabled: true,
  },
  "claude-haiku": {
    modelId: "anthropic.claude-3-5-haiku-20241022-v1:0",
    similarityThreshold: 0.90,
    maxCacheAgeMs: 60_000,        // 1 minute (cheap model, short cache)
    maxEntries: 5_000,
    enabled: true,
  },
  // You can add custom configs per agent use-case
  "code-review": {
    modelId: "anthropic.claude-3-5-sonnet-20241022-v2:0",
    similarityThreshold: 0.85,    // Looser for code review patterns
    maxCacheAgeMs: 600_000,       // 10 minutes
    maxEntries: 20_000,
    enabled: true,
  },
};

export class SemanticCache {
  private redis: RedisClientType;
  private bedrock: BedrockRuntimeClient;
  private configs: Record<string, CacheConfig>;
  private embeddingModelId: string;

  constructor(options: {
    redisUrl?: string;
    region?: string;
    configs?: Record<string, CacheConfig>;
    embeddingModelId?: string;
  }) {
    this.redis = createClient({ url: options.redisUrl || process.env.REDIS_URL });
    this.bedrock = new BedrockRuntimeClient({ region: options.region || "us-east-1" });
    this.configs = options.configs || DEFAULT_CONFIGS;
    this.embeddingModelId = options.embeddingModelId || "amazon.titan-embed-text-v2:0";
  }

  async connect(): Promise<void> {
    await this.redis.connect();
  }

  /**
   * Get cached response for a prompt, or null if no match.
   */
  async get(
    prompt: string,
    configKey: string = "claude-sonnet"
  ): Promise<{
    response: string;
    hitCount: number;
    similarity: number;
  } | null> {
    const config = this.configs[configKey];
    if (!config || !config.enabled) return null;

    // Generate embedding for this prompt
    const embedding = await this.embedPrompt(prompt);

    // Search Redis for similar embeddings
    const results = await this.redis.ft.search(
      "idx:llm-cache",
      `@modelId:{${config.modelId}} @embedding:[VECTOR_RANGE 0.08 $vec]=>{$YIELD_DISTANCE:1}`, {
        PARAMS: { vec: this.vectorToString(embedding) },
        SORTBY: "VECTOR_DISTANCE",
        LIMIT: { from: 0, size: 1 },
        DIALECT: 2,
      }
    );

    if (!results.total) return null;

    const doc = results.documents[0];
    const similarity = 1 - parseFloat(doc.value.distance as string);

    // Check threshold
    if (similarity < config.similarityThreshold) return null;

    // Check TTL
    const age = Date.now() - (doc.value.timestamp as number);
    if (age > config.maxCacheAgeMs) {
      // Stale entry — delete and treat as miss
      await this.redis.del(`cache:${doc.id}`);
      return null;
    }

    // Increment hit count
    await this.redis.hIncrBy(`cache:${doc.id}`, "hitCount", 1);

    return {
      response: doc.value.response as string,
      hitCount: (doc.value.hitCount as number) + 1,
      similarity,
    };
  }

  /**
   * Store a prompt-response pair in the cache.
   */
  async set(
    prompt: string,
    response: string,
    tokensIn: number,
    tokensOut: number,
    modelId: string,
    configKey?: string
  ): Promise<void> {
    const key = `cache:${this.hash(prompt)}`;
    const embedding = await this.embedPrompt(prompt);

    // Check if we need to evict
    const currentCount = await this.redis.dbSize();
    const config = configKey ? this.configs[configKey] : null;
    if (config && currentCount >= config.maxEntries) {
      await this.evictOldest();
    }

    await this.redis.hSet(key, {
      prompt,
      response,
      embedding: this.vectorToString(embedding),
      modelId,
      tokensIn,
      tokensOut,
      timestamp: Date.now(),
      hitCount: 1,
    });

    // Add to search index
    await this.redis.ft.synUpdate("idx:llm-cache", key, 1, [key]);
  }

  /**
   * Invalidate cache entries matching a pattern.
   */
  async invalidate(pattern: string): Promise<number> {
    const keys = await this.redis.keys(`cache:${pattern}*`);
    if (keys.length === 0) return 0;
    const deleted = await this.redis.del(keys);
    return deleted;
  }

  /**
   * Clear all cache entries.
   */
  async clear(): Promise<void> {
    const keys = await this.redis.keys("cache:*");
    if (keys.length > 0) await this.redis.del(keys);
  }

  /**
   * Get cache stats.
   */
  async getStats(): Promise<{
    totalEntries: number;
    totalHits: number;
    oldestEntry: number;
    newestEntry: number;
  }> {
    const keys = await this.redis.keys("cache:*");
    let totalHits = 0;
    let oldestEntry = Date.now();
    let newestEntry = 0;

    for (const key of keys) {
      const entry = await this.redis.hGetAll(key);
      if (entry.hitCount) totalHits += parseInt(entry.hitCount);
      if (entry.timestamp) {
        const ts = parseInt(entry.timestamp);
        if (ts < oldestEntry) oldestEntry = ts;
        if (ts > newestEntry) newestEntry = ts;
      }
    }

    return {
      totalEntries: keys.length,
      totalHits,
      oldestEntry,
      newestEntry,
    };
  }

  // ──── Private ────

  /**
   * Generate embedding for a prompt using Amazon Titan Embeddings.
   */
  private async embedPrompt(prompt: string): Promise<number[]> {
    const command = new InvokeModelCommand({
      modelId: this.embeddingModelId,
      contentType: "application/json",
      body: JSON.stringify({
        inputText: prompt,
        dimensions: 1024,
        normalize: true,
      }),
    });

    const result = await this.bedrock.send(command);
    const body = JSON.parse(new TextDecoder().decode(result.body));

    return body.embedding;
  }

  private vectorToString(vector: number[]): string {
    return `[${vector.join(",")}]`;
  }

  private async evictOldest(): Promise<void> {
    // Find and remove the oldest 10% of entries
    const keys = await this.redis.keys("cache:*");
    const entries = [];

    for (const key of keys) {
      const entry = await this.redis.hGetAll(key);
      entries.push({ key, timestamp: parseInt(entry.timestamp || "0") });
    }

    entries.sort((a, b) => a.timestamp - b.timestamp);
    const toEvict = entries.slice(0, Math.ceil(entries.length * 0.1));

    if (toEvict.length > 0) {
      await this.redis.del(toEvict.map(e => e.key));
    }
  }

  private hash(prompt: string): string {
    const crypto = require("crypto");
    return crypto.createHash("md5").update(prompt).digest("hex").slice(0, 12);
  }
}
```

### Create the Redis search index:

```bash
# Run once after Redis cluster is ready — index setup via FT.CREATE
redis-cli -h <cache-endpoint> FT.CREATE idx:llm-cache ON HASH PREFIX 1 cache: \
  SCHEMA prompt TEXT SORTABLE \
  response TEXT SORTABLE \
  embedding VECTOR FLAT 6 TYPE FLOAT32 DIM 1024 DISTANCE_METRIC COSINE \
  modelId TAG SORTABLE \
  timestamp NUMERIC SORTABLE \
  hitCount NUMERIC SORTABLE
```

This creates a vector search index on the `embedding` field using cosine similarity. Redis Stack (available in ElastiCache Serverless) supports native vector search.

---

## Step 3: Integration with Agent Runtime

```typescript
// src/agent-with-cache.ts — LLM proxy with cache-first strategy

import { SemanticCache } from "./cache/semantic-cache.js";
import { BedrockRuntimeClient, ConverseCommand } from "@aws-sdk/client-bedrock-runtime";

export class CachedAgent {
  private bedrock: BedrockRuntimeClient;
  private cache: SemanticCache;

  constructor() {
    this.bedrock = new BedrockRuntimeClient({ region: "us-east-1" });
    this.cache = new SemanticCache({ redisUrl: process.env.REDIS_URL });
  }

  async generate(prompt: string, configKey: string = "claude-sonnet"): Promise<{
    response: string;
    cached: boolean;
    latency: number;
    cost?: number;
  }> {
    const start = Date.now();

    // 1. Try semantic cache
    const cached = await this.cache.get(prompt, configKey);
    if (cached) {
      return {
        response: cached.response,
        cached: true,
        latency: Date.now() - start,
        cost: 0,
      };
    }

    // 2. Cache miss — call Bedrock
    const command = new ConverseCommand({
      modelId: DEFAULT_CONFIGS[configKey]?.modelId || configKey,
      messages: [{ role: "user", content: [{ text: prompt }] }],
      inferenceConfig: { maxTokens: 4096 },
    });

    try {
      const result = await this.bedrock.send(command);
      const response = result.output?.message?.content?.[0]?.text || "";
      const tokensIn = result.usage?.inputTokens || 0;
      const tokensOut = result.usage?.outputTokens || 0;

      // 3. Store in cache (fire and forget)
      this.cache.set(prompt, response, tokensIn, tokensOut, configKey).catch(() => {});

      return {
        response,
        cached: false,
        latency: Date.now() - start,
        cost: this.estimateCost(tokensIn, tokensOut, configKey),
      };
    } catch (error) {
      return {
        response: `Error: ${error}`,
        cached: false,
        latency: Date.now() - start,
      };
    }
  }

  private estimateCost(tokensIn: number, tokensOut: number, configKey: string): number {
    // Approximate pricing per 1K tokens
    const rates: Record<string, { in: number; out: number }> = {
      "claude-sonnet": { in: 0.003, out: 0.015 },
      "claude-haiku": { in: 0.0008, out: 0.004 },
    };
    const rate = rates[configKey] || rates["claude-sonnet"];
    return (tokensIn / 1000) * rate.in + (tokensOut / 1000) * rate.out;
  }
}
```

---

## Step 4: Config-Driven Cache Policies

Instead of hardcoding cache behavior, use a config file:

```json
{
  "cache": {
    "claude-sonnet": {
      "modelId": "anthropic.claude-3-5-sonnet-20241022-v2:0",
      "similarityThreshold": 0.92,
      "maxCacheAgeMs": 300000,
      "maxEntries": 10000,
      "enabled": true
    },
    "claude-haiku": {
      "modelId": "anthropic.claude-3-5-haiku-20241022-v1:0",
      "similarityThreshold": 0.90,
      "maxCacheAgeMs": 60000,
      "maxEntries": 5000,
      "enabled": true
    },
    "code-review": {
      "modelId": "anthropic.claude-3-5-sonnet-20241022-v2:0",
      "similarityThreshold": 0.85,
      "maxCacheAgeMs": 600000,
      "maxEntries": 20000,
      "enabled": true
    }
  },
  "embedding": {
    "modelId": "amazon.titan-embed-text-v2:0",
    "dimensions": 1024
  }
}
```

---

## Step 5: Monitoring

### CloudWatch Dashboard

```bash
aws cloudwatch put-dashboard --dashboard-name LLM-Cache --dashboard-body '{
  "widgets": [
    {
      "type": "metric",
      "properties": {
        "metrics": [
          ["AWS/ElastiCache", "CacheHits", {"stat": "Sum"}],
          ["AWS/ElastiCache", "CacheMisses", {"stat": "Sum"}]
        ],
        "period": 300,
        "title": "Redis Cache Hit/Miss"
      }
    },
    {
      "type": "metric",
      "properties": {
        "metrics": [
          ["AWS/Bedrock", "CacheReadInputTokens", {"stat": "Sum"}],
          ["AWS/Bedrock", "InvocationCount", {"stat": "Sum"}]
        ],
        "period": 300,
        "title": "Bedrock Cache Metrics"
      }
    }
  ]
}'
```

### Application-level metrics via CloudWatch:

```typescript
// Emit custom metrics
import { CloudWatchClient, PutMetricDataCommand } from "@aws-sdk/client-cloudwatch";

const cw = new CloudWatchClient({ region: "us-east-1" });

async function emitCacheMetric(
  hit: boolean,
  latency: number,
  configKey: string,
  similarity?: number
): Promise<void> {
  await cw.send(new PutMetricDataCommand({
    Namespace: "Agent/LLMCache",
    MetricData: [
      {
        MetricName: hit ? "CacheHits" : "CacheMisses",
        Value: 1,
        Unit: "Count",
        Dimensions: [{ Name: "ModelConfig", Value: configKey }],
      },
      {
        MetricName: "Latency",
        Value: latency,
        Unit: "Milliseconds",
        Dimensions: [{ Name: "CacheStatus", Value: hit ? "hit" : "miss" }],
      },
      ...(similarity !== undefined
        ? [{
            MetricName: "SimilarityScore",
            Value: similarity,
            Unit: "None",
            Dimensions: [{ Name: "ModelConfig", Value: configKey }],
          }]
        : []),
    ],
  }));
}
```

---

## Step 6: Cache Invalidation Strategies

Not all prompts should be cached. Some need fresh responses every time:

| When to skip cache | Example | Strategy |
|-------------------|---------|----------|
| Time-sensitive | "What's the current price of Bitcoin?" | Check if prompt contains time-sensitive keywords |
| User-specific | "What's in my inbox?" | Include userId in cache key → user-specific caches |
| Write operations | "Send an email to John" | Bypass cache entirely for mutation intents |
| Context-dependent | "What did I just learn?" | Depends on full conversation context, not just latest prompt |

```typescript
function shouldBypassCache(prompt: string): boolean {
  const writeKeywords = ["send", "create", "delete", "update", "write", "schedule"];
  const timeSensitivePatterns = [
    /\b(current|today|now|latest|live)\b/i,
    /\bprice\b/i, /\brate\b/i, /\bstock\b/i,
    /\bweather\b/i,
  ];

  const isWrite = writeKeywords.some(k => prompt.toLowerCase().startsWith(k));
  const isTimeSensitive = timeSensitivePatterns.some(p => p.test(prompt));

  return isWrite || isTimeSensitive;
}
```

---

## Step 7: Cost Analysis

### Without caching:
- 500K LLM calls/month × Claude Sonnet
- Avg 500 input tokens + 500 output tokens
- Cost: 500K × ($0.0015 + $0.0075) = **$4,500/mo**
- Avg latency: 3-5 seconds

### With semantic cache (40-70% hit rate):
| Metric | No cache | With cache | Saved |
|--------|----------|------------|-------|
| Calls to LLM | 500K | 150-300K | 40-70% |
| Monthly cost | $4,500 | $1,350-2,700 | **$1,800-3,150** |
| Avg latency | 3-5s | 20-100ms | 95%+ |
| Embedding cost | $0 | ~$5-10 | — |
| ElastiCache | $0 | ~$30 | — |

### Payback: ~2 weeks for the cache infrastructure.

---

## Summary

| Layer | Technology | Cache scope | Latency | Cost reduction |
|-------|-----------|-------------|---------|-----------|
| Bedrock Prompt Cache | Built-in | 5-min exact match | ~100ms hit | ~90% |
| Redis Semantic Cache | ElastiCache | Configurable semantic | ~20-100ms hit | 40-70% |
| Agent-level TTL | Custom | Per-config | N/A | Avoids stale |

### Checklist:

- [ ] Bedrock prompt caching enabled (it's default — verify in CloudWatch)
- [ ] ElastiCache Redis cluster created (Serverless or self-designed)
- [ ] Redis vector search index created (FT.CREATE with VECTOR schema)
- [ ] Embedding generation using Titan Embeddings configured
- [ ] Semantic cache service integrated with agent runtime
- [ ] Config-driven cache policies (per model, per use-case)
- [ ] Cache invalidation strategies (time-sensitive, writes, context-dependent)
- [ ] Monitoring: CloudWatch dashboard + custom metrics
- [ ] Cost tracking: before/after comparison

---

| Day | Topic |
|-----|-------|
| 1 | Deploy MCP Server on ECS Fargate ✅ |
| 2 | Agent State with DynamoDB Global Tables ✅ |
| 3 | **LLM Caching with ElastiCache + Bedrock ✅** |
| 4 | Serverless Agent with Lambda + Bedrock |
| 5 | Multi-Region Agent Routing with Route53 |
| 6 | CI/CD for AI Agents with CodePipeline |

---

*Series: AWS for AI/Agent Developers. Day 3: LLM caching — Bedrock Prompt Caching (server-side, zero code) + Redis semantic caching (ElastiCache, config-driven, full control). Full TypeScript code, CloudWatch monitoring, cost analysis.*
