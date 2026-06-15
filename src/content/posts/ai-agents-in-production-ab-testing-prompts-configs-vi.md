---
title: "AI Agents trong Production — Day 4: A/B Testing Prompts & Configs"
description: "Không ship prompt mới mà không test. Xây dựng nền tảng A/B testing: versioned prompts, traffic splitting, gradual rollout, và evaluator tự động."
published: 2026-06-15
pubDate: 2026-06-15T23:45:00.000Z
slug: ai-agents-in-production-ab-testing-prompts-configs-vi
tags:
  - ai-agents
  - production
  - ab-testing
  - prompt-engineering
  - experimentation
  - config-management
  - deployment
  - typescript
category: ai-agents
lang: vi
series:
  name: "AI Agents in Production"
  order: 4
  total: 6
---

Ship code change không test là điên. Ship prompt change không test cũng vậy.

Một từ trong system prompt có thể biến agent từ "helpful" thành "hallucinating". Nâng cấp LLM model (GPT-4o → GPT-4.1) thay đổi tool-calling accuracy 5-15%. Không có A/B testing là mò mẫm.

Bài này xây nền tảng experimentation cho AI agents:

```
Prompt Store → Experiment Manager → Gradual Rollout → Evaluation Pipeline
```

---

## Vì sao phải A/B test prompts?

**Có thể sai ở đâu:**
- Đổi one-shot example trong prompt → phá edge cases âm thầm
- System instruction mới tốt average nhưng tệ trên inputs cụ thể
- Nâng cấp GPT-4o lên GPT-4.1 đổi format response tinh vi
- Chỉnh tone nhẹ → agent mất độ tin cậy

**Metric nào theo dõi:**
- Tool call accuracy (Day 1)
- Latency (Day 1)
- Token consumption (Day 1)
- Error rate (Day 3)
- Cache hit rate (Day 2)

---

## Step 1: Prompt Store — Quản lý config versioned

Thay vì hardcode prompts, lưu versioned configs.

### `src/experiments/prompt-store.ts`

```typescript
// PromptVersion: id, name, content, tags, metadata (author, createdAt, parentId, model)
// PromptConfig: name, activeVersion, rolloutPercent

export class PromptStore {
  private versions = new Map<string, PromptVersion>();
  private configs = new Map<string, PromptConfig>();

  async save(version: Omit<PromptVersion, "id">): Promise<PromptVersion> {
    const id = crypto.createHash("sha256").update(version.content + Date.now()).digest("hex").slice(0, 16);
    const full: PromptVersion = { ...version, id };
    this.versions.set(id, full);
    await fs.writeFile(`./prompts/${full.name}-${id}.json`, JSON.stringify(full, null, 2));
    return full;
  }

  async activate(name: string, versionId: string, rolloutPercent = 100): Promise<void> {
    this.configs.set(name, { name, activeVersion: versionId, rolloutPercent });
    const v = this.versions.get(versionId)!;
    if (!v.tags.includes("active")) v.tags.push("active");
  }

  get(name: string, seed?: string): { version: PromptVersion; isTestVariant: boolean } | null {
    const config = this.configs.get(name);
    if (!config) return null;
    const version = this.versions.get(config.activeVersion);
    if (!version) return null;
    const isInRollout = seed ? this.isInPercentage(config.rolloutPercent, seed) : true;
    return { version, isTestVariant: !isInRollout };
  }

  async rollback(name: string): Promise<PromptVersion | null> {
    const versions = this.listVersions(name);
    if (versions.length < 2) return null;
    const current = versions[0], previous = versions[1];
    current.tags.push("rolled-back");
    await this.activate(name, previous.id, 100);
    return previous;
  }

  private isInPercentage(percent: number, seed: string): boolean {
    const hash = crypto.createHash("md5").update(seed).digest("hex");
    return parseInt(hash.slice(0, 8), 16) % 100 < percent;
  }

  listVersions(name: string): PromptVersion[] {
    return Array.from(this.versions.values()).filter(v => v.name === name)
      .sort((a, b) => b.metadata.createdAt - a.metadata.createdAt);
  }
}
```

### Usage:

```typescript
const v1 = await store.save({
  name: "system-prompt",
  content: "You are a helpful GitHub issue manager...",
  tags: ["initial"],
  metadata: { author: "ei", createdAt: Date.now(), parentId: null, model: "gpt-4o", description: "Initial" },
});

const v2 = await store.save({
  name: "system-prompt",
  content: "You are a precise GitHub issue manager. Always validate issue numbers...",
  tags: ["experiment"],
  metadata: { author: "ei", createdAt: Date.now(), parentId: v1.id, model: "gpt-4.1", description: "Add validation" },
});

// 10% traffic cho v2
await store.activate("system-prompt", v2.id, 10);

// Trong runtime — deterministic split theo sessionId
const { version, isTestVariant } = store.get("system-prompt", sessionId)!;
```

---

## Step 2: Experiment Manager — A/B Traffic Splitting

### `src/experiments/experiment-manager.ts`

```typescript
export interface ExperimentConfig {
  name: string;
  promptName: string;
  variants: { label: string; versionId: string; weight: number }[];
  metrics: string[];
  startAt: number;
  durationMs: number;
  minSampleSize: number;
  significanceLevel: number;
}

export class ExperimentManager {
  private experiments = new Map<string, ExperimentResult>();

  async start(config: ExperimentConfig): Promise<void> {
    const totalWeight = config.variants.reduce((s, v) => s + v.weight, 0);
    if (totalWeight !== 100) throw new Error(`Weights must sum to 100, got ${totalWeight}`);

    for (const variant of config.variants) {
      await store.activate(config.promptName, variant.versionId, variant.weight);
    }

    this.experiments.set(config.name, {
      name: config.name, status: "running",
      samplesPerVariant: Object.fromEntries(config.variants.map(v => [v.label, 0])),
      metricsPerVariant: Object.fromEntries(config.variants.map(v => [v.label, Object.fromEntries(config.metrics.map(m => [m, 0]))])),
      winner: null, confidence: null, startedAt: Date.now(), completedAt: null,
    });
  }

  record(name: string, variant: string, metrics: Record<string, number>): void {
    const exp = this.experiments.get(name);
    if (!exp || exp.status !== "running") return;
    exp.samplesPerVariant[variant]++;
    for (const [k, v] of Object.entries(metrics)) {
      const n = exp.samplesPerVariant[variant];
      exp.metricsPerVariant[variant][k] += (v - exp.metricsPerVariant[variant][k]) / n;
    }
  }
}
```

---

## Step 3: Gradual Rollout

Canary deployment từng bước:

```typescript
export class GradualRollout {
  async start(plan: RolloutPlan): Promise<void> {
    // plan.steps = [{ percent: 1, durationMs, evaluationCriteria }, { percent: 5, ... }, ...]
  }

  async advance(name: string): Promise<boolean> {
    // Đánh giá step hiện tại — nếu metrics vượt threshold → next step
    // Nếu fail → auto-rollback
  }
}

// Ví dụ rollout plan:
await rollout.start({
  name: "system-prompt-v2",
  promptName: "system-prompt",
  versionId: v2.id,
  steps: [
    { percent: 1, durationMs: 3600_000, evaluationCriteria: { metric: "error_rate", threshold: 0.01 } },
    { percent: 5, durationMs: 7200_000, evaluationCriteria: { metric: "error_rate", threshold: 0.02 } },
    { percent: 25, durationMs: 86400_000, evaluationCriteria: { metric: "tool_accuracy", threshold: 0.85 } },
    { percent: 50, durationMs: 86400_000 },
    { percent: 100, durationMs: 0 },
  ],
});
```

---

## Step 4: Evaluation Pipeline

```typescript
export interface EvalCase {
  input: string;                // User query
  expectedTool: string;         // Expected tool
  expectedArgs?: Record<string, unknown>;
  category: string;             // "happy-path" | "edge-case" | "error-case"
}

export class PromptEvaluator {
  private cases: EvalCase[] = [];

  async evaluate(promptVersion: string, executor: any): Promise<{ results: EvalResult[]; summary: EvalSummary }> {
    // Chạy từng test case → so sánh actual vs expected
    // Output: accuracy, latency, tokens, per-category breakdown
  }
}
```

---

## Step 5: Admin API Endpoints

```
GET  /experiments/prompts?name=system-prompt     → list versions
POST /experiments/prompts                          → save new version
POST /experiments/prompts/:name/activate           → activate with rollout %
POST /experiments/prompts/:name/rollback           → rollback
POST /experiments/start                            → start A/B experiment
GET  /experiments/:name                            → get result
POST /experiments/:name/cancel                     → cancel + restore control
POST /experiments/rollout                          → start gradual rollout
POST /experiments/rollout/:name/advance            → next step
POST /experiments/rollout/:name/rollback           → emergency rollback
```

---

## Lưu ý Production

### Deterministic traffic splitting
Luôn dùng seed ổn định (session ID, user ID). Cùng user phải thấy cùng variant.

```typescript
// ✅ Đúng
const variant = hash(seed) % 100 < weight ? "treatment" : "control";

// ❌ Sai
const variant = Math.random() < 0.5 ? "treatment" : "control";
```

### Auto-rollback thresholds
```typescript
const AUTO_ROLLBACK = {
  error_rate: { maxIncrease: 0.02 },
  latency_p95: { maxIncrease: 0.10 },
  tool_accuracy: { maxDecrease: 0.03 },
};
```

### Prompt storage
- Database (không filesystem) cho multi-server
- Redis pub/sub để notify tất cả replicas
- Mỗi thay đổi = version mới — không edit in place

---

## Checklist

- [ ] Prompts lưu versioned, không hardcode
- [ ] Traffic split deterministic (session ID)
- [ ] Experiment có success metrics rõ ràng
- [ ] Auto-rollback thresholds configured
- [ ] Evaluation test cases happy path + edge case
- [ ] Rollback tested trước khi promote

---

| Day | Chủ đề |
|-----|--------|
| 1 | Observability & Telemetry ✅ |
| 2 | Caching Strategies ✅ |
| 3 | Error Handling & Resilience ✅ |
| 4 | **A/B Testing Prompts & Configs ✅** |
| 5 | Multi-Region & High Availability |
| 6 | Building an Internal Agent Platform |

---

*Series: AI Agents trong Production. Day 4: A/B testing platform với versioned prompt store, experiment manager, gradual rollout, và evaluator pipeline.*
