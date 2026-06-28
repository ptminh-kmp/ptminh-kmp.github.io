---
title: "AWS cho AI/Agent Developers — Day 3: LLM Caching với ElastiCache + Bedrock"
description: "Giảm latency và cost LLM 40-70% với semantic caching trên Redis và Bedrock prompt caching. Config-driven cache policies, invalidation strategies."
published: 2026-06-28
pubDate: 2026-06-28T02:00:00.000Z
slug: aws-for-ai-agent-developers-elasticache-bedrock-caching-vi
tags:
  - aws
  - elasticache
  - bedrock
  - llm-caching
  - redis
  - semantic
  - cost-optimization
category: aws
lang: vi
series:
  name: "AWS for AI/Agent Developers"
  order: 3
  total: 6
---

LLM calls là thứ đắt nhất và chậm nhất trong agent system. Một generation tốn $0.01-0.10 và 2-10 giây. Trong production, mỗi ms và cent nhân lên rất nhanh.

Hai caching strategies:

1. **Bedrock Prompt Caching** — Cache server-side, không cần code. Amazon cache exact-match prompts trong ~5 phút.
2. **Semantic Cache trên Redis** — Embed prompt → lưu vector → tìm semantic similarity. Works với mọi model, mọi provider.

Kết hợp → giảm 40-70% cost, 60-90% latency.

```
Agent ─▶ Semantic Cache ─▶ Redis ─▶ [miss] ─▶ Bedrock ─▶ LLM
         (ElastiCache)        │                    │
                              │                    │
                        similarity > 0.92     Prompt Cache
                        → return cached       (built-in, 5min)
```

---

## Strategy 1: Bedrock Prompt Caching

Mặc định có sẵn, không cần config. Cache window ~5 phút.

```bash
# Gửi duplicate prompt → Bedrock tự cache trong ~5 phút
aws bedrock-runtime converse \
  --model-id anthropic.claude-3-5-sonnet-20241022-v2:0 \
  --messages '[{"role":"user","content":[{"text":"What is MCP?"}]}]'
```

**Hạn chế:** Exact match thôi, model-specific, region-specific.

---

## Strategy 2: Semantic Cache trên Redis

### Setup ElastiCache

```bash
aws elasticache create-serverless-cache \
  --serverless-cache-name llm-semantic-cache \
  --engine redis --major-engine-version 7
```

### Code chính

```typescript
export class SemanticCache {
  private redis: RedisClientType;
  private bedrock: BedrockRuntimeClient;
  private configs: Record<string, CacheConfig>;

  // Tìm cache hit
  async get(prompt: string, configKey = "claude-sonnet") {
    const embedding = await this.embedPrompt(prompt);

    const results = await this.redis.ft.search("idx:llm-cache",
      `@modelId:{${config}} @embedding:[VECTOR_RANGE 0.08 $vec]=>{$YIELD_DISTANCE:1}`,
      { PARAMS: { vec: vectorToString(embedding) }, SORTBY: "VECTOR_DISTANCE", LIMIT: {from:0, size:1} }
    );

    if (!results.total) return null;

    // Check similarity threshold + TTL
    const similarity = 1 - parseFloat(results.documents[0].value.distance);
    if (similarity < threshold || age > maxAge) return null;

    return { response, hitCount, similarity };
  }

  // Embedding dùng Amazon Titan Embeddings
  private async embedPrompt(prompt: string): Promise<number[]> {
    const result = await this.bedrock.send(new InvokeModelCommand({
      modelId: "amazon.titan-embed-text-v2:0",
      body: JSON.stringify({ inputText: prompt, dimensions: 1024, normalize: true }),
    }));
    return JSON.parse(new TextDecoder().decode(result.body)).embedding;
  }
}
```

### Index Redis (run once)

```bash
redis-cli -h <endpoint> FT.CREATE idx:llm-cache ON HASH PREFIX 1 cache: \
  SCHEMA prompt TEXT response TEXT \
  embedding VECTOR FLAT 6 TYPE FLOAT32 DIM 1024 DISTANCE_METRIC COSINE \
  modelId TAG timestamp NUMERIC hitCount NUMERIC
```

---

## Config-Driven Cache Policies

```json
{
  "claude-sonnet": { "similarityThreshold": 0.92, "maxCacheAgeMs": 300000, "enabled": true },
  "claude-haiku":  { "similarityThreshold": 0.90, "maxCacheAgeMs": 60000,  "enabled": true },
  "code-review":   { "similarityThreshold": 0.85, "maxCacheAgeMs": 600000, "enabled": true }
}
```

---

## Khi nào skip cache?

| Trường hợp | Ví dụ | Strategy |
|-----------|-------|----------|
| Time-sensitive | "Giá Bitcoin bây giờ?" | Check keywords: current, now, latest |
| User-specific | "Inbox của tôi?" | Include userId trong cache key |
| Write operations | "Gửi email cho John" | Bypass cache hoàn toàn |
| Context-dependent | "Tôi vừa học gì?" | Skip — phụ thuộc conversation context |

```typescript
function shouldBypass(prompt: string): boolean {
  const writeKw = ["send","create","delete","write","schedule"];
  const timeSensitive = [/\b(current|today|now|latest)\b/i, /\bprice\b/i];
  return writeKw.some(k => prompt.startsWith(k)) || timeSensitive.some(p => p.test(prompt));
}
```

---

## Cost Analysis

| | Không cache | Có cache | Tiết kiệm |
|--|-----------|----------|-----------|
| 500K calls/tháng | $4,500 | $1,350-2,700 | $1,800-3,150 |
| Avg latency | 3-5s | 20-100ms | 95%+ |
| Infra cost | $0 | ~$40 (ElastiCache + embedding) | — |

**Hoàn vốn sau ~2 tuần.**

---

## Checklist

- [ ] Bedrock prompt caching verified (CloudWatch)
- [ ] ElastiCache Redis cluster tạo
- [ ] Redis vector search index tạo
- [ ] Embedding với Titan Embeddings
- [ ] Semantic cache integration
- [ ] Config-driven policies
- [ ] Cache invalidation strategies
- [ ] CloudWatch metrics + custom metrics
- [ ] Cost tracking before/after

---

| Day | Chủ đề |
|-----|--------|
| 1 | Deploy MCP Server lên ECS Fargate ✅ |
| 2 | Agent State với DynamoDB Global Tables ✅ |
| 3 | **LLM Caching với ElastiCache + Bedrock ✅** |
| 4 | Serverless Agent với Lambda + Bedrock |
| 5 | Multi-Region Agent Routing với Route53 |
| 6 | CI/CD cho AI Agents với CodePipeline |

---

*Series: AWS cho AI/Agent Developers. Day 3: LLM caching với Bedrock Prompt Caching + Redis semantic cache. Config-driven, full control.*
