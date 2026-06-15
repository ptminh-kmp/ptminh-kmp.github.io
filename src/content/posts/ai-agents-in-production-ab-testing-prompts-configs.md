---
title: "AI Agents in Production — Day 4: A/B Testing Prompts & Configs"
description: "Ship changes to your agent without breaking production. Implement prompt versioning, gradual rollouts, A/B experiments, and automated evaluation pipelines with weight-based traffic splitting."
published: 2026-06-15
pubDate: 2026-06-15T23:45:00.000Z
slug: ai-agents-in-production-ab-testing-prompts-configs
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
lang: en
series:
  name: "AI Agents in Production"
  order: 4
  total: 6
---

You wouldn't ship a code change without testing it. Why ship a prompt change without one?

A single word in a system prompt can flip agent behavior from "helpful" to "hallucinating." An LLM model upgrade (GPT-4o → GPT-4.1) changes tool-calling accuracy by 5-15%. Without A/B testing, you're flying blind.

This post builds an experimentation platform for AI agents:

```
┌────────────────────────────────────┐
│      Agent A/B Platform            │
│                                    │
│  ┌──────────────┐  ┌────────────┐ │
│  │ Prompt Store │  │ Experiment │ │
│  │ - Versioned  │  │ - Traffic  │ │
│  │ - Tagged     │  │ - Split    │ │
│  │ - Metadata   │  │ - Variants │ │
│  └──────────────┘  └────────────┘ │
│                                    │
│  ┌──────────────┐  ┌────────────┐ │
│  │ Evaluation   │  │ Rollout   │ │
│  │ - Score      │  │ - Gradual │ │
│  │ - Compare    │  │ - Canary  │ │
│  │ - Auto-decide│  │ - Rollback│ │
│  └──────────────┘  └────────────┘ │
└────────────────────────────────────┘
```

---

## Step 1: Why A/B Test Prompts?

Prompt engineering isn't a one-time activity. It's a continuous cycle:

```
Write → Test → Measure → Iterate → Ship
```

**What can go wrong:**
- Changing one example in a few-shot prompt breaks edge cases silently
- A new system instruction improves average quality but crashes on specific inputs
- Upgrading from GPT-4o to GPT-4.1 changes response format subtly
- A seemingly neutral tone tweak makes the agent less trustworthy

**What we're measuring:**

| Metric | What it tells you | Source |
|--------|-------------------|--------|
| Tool call accuracy | Agent chooses the right tool? | Day 1 tracer |
| Latency | Response time impact | Day 1 metrics |
| Token consumption | Cost per request | Day 1 metrics |
| Cache hit rate | Prompt change affects repeat queries? | Day 2 cache |
| Error rate | Prompt causing more failures? | Day 3 error handler |
| User satisfaction | Subjective quality (human eval) | External |

---

## Step 2: The Prompt Store — Versioned Config Management

Instead of hardcoding prompts, store them as versioned configs.

### `src/experiments/prompt-store.ts`

```typescript
// src/experiments/prompt-store.ts — Versioned prompt and configuration store

import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

export interface PromptVersion {
  id: string;              // sha256(content + timestamp)
  name: string;            // "system-prompt" | "issue-extractor" | etc.
  content: string;         // The actual prompt text
  tags: string[];          // ["production", "canary", "rolled-back"]
  metadata: {
    author: string;
    createdAt: number;
    parentId: string | null; // Previous version for diff tracking
    model: string;          // Target LLM model
    description: string;
  };
}

export interface PromptConfig {
  name: string;
  activeVersion: string;   // Current production version ID
  rolloutPercent: number;  // 0-100, traffic percentage for this variant
}

export class PromptStore {
  private versions: Map<string, PromptVersion> = new Map();
  private configs: Map<string, PromptConfig> = new Map();
  private storeDir: string;

  constructor(storeDir = "./prompts") {
    this.storeDir = storeDir;
  }

  async init(): Promise<void> {
    await fs.mkdir(this.storeDir, { recursive: true });
    await this.load();
  }

  /**
   * Save a new prompt version.
   */
  async save(version: Omit<PromptVersion, "id">): Promise<PromptVersion> {
    const id = crypto
      .createHash("sha256")
      .update(version.content + Date.now())
      .digest("hex")
      .slice(0, 16);

    const full: PromptVersion = { ...version, id };
    this.versions.set(id, full);

    const filePath = path.join(this.storeDir, `${full.name}-${id}.json`);
    await fs.writeFile(filePath, JSON.stringify(full, null, 2));

    return full;
  }

  /**
   * Activate a version for production traffic.
   */
  async activate(name: string, versionId: string, rolloutPercent = 100): Promise<void> {
    if (!this.versions.has(versionId)) {
      throw new Error(`Version ${versionId} not found`);
    }

    this.configs.set(name, { name, activeVersion: versionId, rolloutPercent });

    // Tag the version
    const version = this.versions.get(versionId)!;
    if (!version.tags.includes("active")) version.tags.push("active");
    await this.persistVersion(version);
  }

  /**
   * Get the prompt content for a given name.
   * If rollout < 100%, returns based on traffic splitting.
   */
  get(name: string, seed?: string): { version: PromptVersion; isTestVariant: boolean } | null {
    // Default: return active version
    const config = this.configs.get(name);
    if (!config) return null;

    const version = this.versions.get(config.activeVersion);
    if (!version) return null;

    // Rollout check — deterministic based on seed
    const isInRollout = seed
      ? this.isInPercentage(config.rolloutPercent, seed)
      : true;

    return {
      version,
      isTestVariant: !isInRollout,
    };
  }

  /**
   * List all versions for a prompt.
   */
  listVersions(name: string): PromptVersion[] {
    return Array.from(this.versions.values())
      .filter(v => v.name === name)
      .sort((a, b) => b.metadata.createdAt - a.metadata.createdAt);
  }

  /**
   * Rollback to a previous version.
   */
  async rollback(name: string): Promise<PromptVersion | null> {
    const versions = this.listVersions(name);
    if (versions.length < 2) return null;

    const current = versions[0];
    const previous = versions[1];

    // Tag current as rolled-back
    current.tags.push("rolled-back");
    await this.persistVersion(current);

    // Activate previous
    await this.activate(name, previous.id, 100);
    return previous;
  }

  // ──── Private ────

  private async load(): Promise<void> {
    const files = await fs.readdir(this.storeDir).catch(() => []);
    for (const file of files) {
      if (!file.endsWith(".json")) continue;
      const data = await fs.readFile(path.join(this.storeDir, file), "utf-8");
      const version: PromptVersion = JSON.parse(data);
      this.versions.set(version.id, version);
      if (version.tags.includes("active")) {
        this.configs.set(version.name, {
          name: version.name,
          activeVersion: version.id,
          rolloutPercent: 100,
        });
      }
    }
  }

  private async persistVersion(version: PromptVersion): Promise<void> {
    const filePath = path.join(this.storeDir, `${version.name}-${version.id}.json`);
    await fs.writeFile(filePath, JSON.stringify(version, null, 2));
  }

  /**
   * Deterministic percentage check using a seed string.
   * Same seed + same percentage = same result every time.
   */
  private isInPercentage(percent: number, seed: string): boolean {
    const hash = crypto.createHash("md5").update(seed).digest("hex");
    const num = parseInt(hash.slice(0, 8), 16) % 100;
    return num < percent;
  }
}
```

### Usage:

```typescript
const store = new PromptStore("./prompts");
await store.init();

// Save production prompt
const v1 = await store.save({
  name: "system-prompt",
  content: "You are a helpful GitHub issue manager...",
  tags: ["initial"],
  metadata: {
    author: "ei",
    createdAt: Date.now(),
    parentId: null,
    model: "gpt-4o",
    description: "Initial system prompt",
  },
});

// Save experimental variant
const v2 = await store.save({
  name: "system-prompt",
  content: "You are a precise GitHub issue manager. Always validate issue numbers exist before referencing them...",
  tags: ["experiment"],
  metadata: {
    author: "ei",
    createdAt: Date.now(),
    parentId: v1.id,
    model: "gpt-4.1",
    description: "Add validation instructions",
  },
});

// Activate v2 for 10% of traffic
await store.activate("system-prompt", v2.id, 10);

// In agent runtime — deterministic split by session ID
const { version, isTestVariant } = store.get("system-prompt", sessionId)!;
```

---

## Step 3: Experiment Manager — A/B Traffic Splitting

### `src/experiments/experiment-manager.ts`

```typescript
// src/experiments/experiment-manager.ts — A/B experiment lifecycle

import { PromptStore, PromptVersion } from "./prompt-store.js";

export interface ExperimentConfig {
  name: string;                    // "system-prompt-v2-vs-v1"
  description: string;
  promptName: string;              // Which prompt to experiment on
  variants: {
    label: string;                 // "control" | "treatment"
    versionId: string;
    weight: number;                // Traffic share (must sum to 100)
  }[];
  metrics: string[];               // ["tool_accuracy", "latency_p50", "error_rate"]
  startAt: number;
  durationMs: number;              // Auto-stop after this duration
  minSampleSize: number;           // Minimum requests before declaring result
  significanceLevel: number;       // 0.05 = 95% confidence
}

export interface ExperimentResult {
  name: string;
  status: "running" | "completed" | "cancelled";
  samplesPerVariant: Record<string, number>;
  metricsPerVariant: Record<string, Record<string, number>>;
  winner: string | null;          // Winning variant label, or null if inconclusive
  confidence: number | null;
  startedAt: number;
  completedAt: number | null;
}

export class ExperimentManager {
  private experiments: Map<string, ExperimentResult> = new Map();
  private store: PromptStore;

  constructor(store: PromptStore) {
    this.store = store;
  }

  /**
   * Start a new A/B experiment.
   */
  async start(config: ExperimentConfig): Promise<void> {
    // Validate weights sum to 100
    const totalWeight = config.variants.reduce((s, v) => s + v.weight, 0);
    if (totalWeight !== 100) {
      throw new Error(`Variant weights must sum to 100, got ${totalWeight}`);
    }

    // Verify all version IDs exist
    for (const variant of config.variants) {
      const version = this.store.get(config.promptName);
      if (!version) {
        throw new Error(`Prompt "${config.promptName}" has no active version`);
      }
    }

    // Activate variants with their weights
    for (const variant of config.variants) {
      await this.store.activate(config.promptName, variant.versionId, variant.weight);
    }

    // Track experiment state
    this.experiments.set(config.name, {
      name: config.name,
      status: "running",
      samplesPerVariant: Object.fromEntries(config.variants.map(v => [v.label, 0])),
      metricsPerVariant: Object.fromEntries(
        config.variants.map(v => [v.label, Object.fromEntries(config.metrics.map(m => [m, 0]))])
      ),
      winner: null,
      confidence: null,
      startedAt: Date.now(),
      completedAt: null,
    });
  }

  /**
   * Record a data point for an experiment.
   */
  record(
    experimentName: string,
    variantLabel: string,
    metrics: Record<string, number>
  ): void {
    const exp = this.experiments.get(experimentName);
    if (!exp || exp.status !== "running") return;

    exp.samplesPerVariant[variantLabel]++;

    for (const [key, value] of Object.entries(metrics)) {
      if (key in exp.metricsPerVariant[variantLabel]) {
        // Running average
        const n = exp.samplesPerVariant[variantLabel];
        const current = exp.metricsPerVariant[variantLabel][key];
        exp.metricsPerVariant[variantLabel][key] = current + (value - current) / n;
      }
    }
  }

  /**
   * Check if experiment has enough data and stop.
   */
  evaluate(experimentName: string): ExperimentResult | null {
    const exp = this.experiments.get(experimentName);
    if (!exp) return null;

    // Check if minimum sample size reached
    const minSamples = Math.min(...Object.values(exp.samplesPerVariant));
    if (minSamples < 100) return exp; // Not enough data yet

    // Stub: winner detection via metric comparison
    // In production, use proper statistical tests (chi-square, t-test)
    const [control, treatment] = Object.keys(exp.metricsPerVariant);
    const controlScore = Object.values(exp.metricsPerVariant[control]).reduce((a, b) => a + b, 0);
    const treatmentScore = Object.values(exp.metricsPerVariant[treatment]).reduce((a, b) => a + b, 0);

    if (Math.abs(controlScore - treatmentScore) > 0.05) {
      exp.winner = controlScore > treatmentScore ? control : treatment;
      exp.confidence = 0.95;
      exp.status = "completed";
      exp.completedAt = Date.now();
    }

    return exp;
  }

  /**
   * Cancel experiment and restore control to 100%.
   */
  async cancel(experimentName: string, promptName: string): Promise<void> {
    const exp = this.experiments.get(experimentName);
    if (!exp) return;

    exp.status = "cancelled";
    exp.completedAt = Date.now();

    // Restore control version to 100%
    const controlVersion = this.store.listVersions(promptName).find(
      v => v.tags.includes("initial") || v.tags.includes("active")
    );
    if (controlVersion) {
      await this.store.activate(promptName, controlVersion.id, 100);
    }
  }

  getExperiment(name: string): ExperimentResult | null {
    return this.experiments.get(name) ?? null;
  }

  listExperiments(): ExperimentResult[] {
    return Array.from(this.experiments.values());
  }
}
```

---

## Step 4: Gradual Rollout Strategy

Instead of flipping a switch, roll out changes gradually:

```typescript
// src/experiments/rollout.ts — Gradual rollout (canary deployment)

export interface RolloutPlan {
  name: string;
  promptName: string;
  versionId: string;
  steps: {
    percent: number;
    durationMs: number;
    evaluationCriteria?: { metric: string; threshold: number };
  }[];
}

export class GradualRollout {
  private store: PromptStore;
  private activeRollouts: Map<string, RolloutPlan & { currentStep: number; startedAt: number }> = new Map();

  constructor(store: PromptStore) {
    this.store = store;
  }

  async start(plan: RolloutPlan): Promise<void> {
    this.activeRollouts.set(plan.name, { ...plan, currentStep: 0, startedAt: Date.now() });
    await this.applyStep(plan, 0);
  }

  /**
   * Advance to next step — called by a scheduler or on agent startup.
   */
  async advance(name: string): Promise<boolean> {
    const rollout = this.activeRollouts.get(name);
    if (!rollout) return false;

    const nextStep = rollout.currentStep + 1;
    if (nextStep >= rollout.steps.length) {
      await this.store.activate(rollout.promptName, rollout.versionId, 100);
      this.activeRollouts.delete(name);
      return true; // Fully rolled out
    }

    // Check evaluation criteria for current step
    const currentStepConfig = rollout.steps[rollout.currentStep];
    if (currentStepConfig.evaluationCriteria) {
      // Fetch metrics and decide whether to proceed
      const passed = await this.evaluateStep(rollout, currentStepConfig);
      if (!passed) {
        // Auto-rollback
        await this.rollback(name);
        return false;
      }
    }

    await this.applyStep(rollout, nextStep);
    rollout.currentStep = nextStep;
    return false;
  }

  private async applyStep(rollout: RolloutPlan & { currentStep: number; startedAt: number }, stepIndex: number): Promise<void> {
    const step = rollout.steps[stepIndex];
    await this.store.activate(rollout.promptName, rollout.versionId, step.percent);
    console.log(`[Rollout] ${rollout.name}: ${step.percent}% (step ${stepIndex + 1}/${rollout.steps.length})`);
  }

  private async evaluateStep(
    rollout: RolloutPlan & { currentStep: number; startedAt: number },
    criteria: { metric: string; threshold: number }
  ): Promise<boolean> {
    // Stub — fetch from metrics endpoint
    console.log(`[Rollout] Evaluating ${rollout.name}: ${criteria.metric} > ${criteria.threshold}`);
    return true;
  }

  async rollback(name: string): Promise<void> {
    const rollout = this.activeRollouts.get(name);
    if (!rollout) return;

    console.warn(`[Rollout] ${name}: ROLLING BACK`);
    // Find the previous stable version
    const versions = this.store.listVersions(rollout.promptName);
    const stable = versions.find(v => v.tags.includes("active") && v.id !== rollout.versionId)
      || versions[versions.length - 1];

    if (stable) {
      await this.store.activate(rollout.promptName, stable.id, 100);
    }

    this.activeRollouts.delete(name);
  }
}
```

### Rollout plan example:

```typescript
const rollout = new GradualRollout(store);

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

## Step 5: Evaluation Pipeline

### `src/experiments/evaluator.ts`

```typescript
// src/experiments/evaluator.ts — Automated prompt evaluation

export interface EvalCase {
  input: string;          // User query
  expectedTool: string;   // Expected tool name
  expectedArgs?: Record<string, unknown>;
  expectedResponse?: string;
  category: string;       // "edge-case" | "happy-path" | "error-case"
}

export interface EvalResult {
  case: EvalCase;
  actualTool: string;
  matchedTool: boolean;
  latencyMs: number;
  tokensUsed: number;
  error: string | null;
}

export class PromptEvaluator {
  private cases: EvalCase[] = [];

  addCase(testCase: EvalCase): void {
    this.cases.push(testCase);
  }

  addBatch(testCases: EvalCase[]): void {
    this.cases.push(...testCases);
  }

  async evaluate(
    promptVersion: string,
    executor: (input: string) => Promise<{ tool: string; latencyMs: number; tokens: number }>
  ): Promise<{ results: EvalResult[]; summary: EvalSummary }> {
    const results: EvalResult[] = [];

    for (const testCase of this.cases) {
      const start = Date.now();
      try {
        const response = await executor(testCase.input);
        results.push({
          case: testCase,
          actualTool: response.tool,
          matchedTool: response.tool === testCase.expectedTool,
          latencyMs: response.latencyMs,
          tokensUsed: response.tokens,
          error: null,
        });
      } catch (error) {
        results.push({
          case: testCase,
          actualTool: "error",
          matchedTool: false,
          latencyMs: Date.now() - start,
          tokensUsed: 0,
          error: String(error),
        });
      }
    }

    return {
      results,
      summary: this.aggregate(results),
    };
  }

  private aggregate(results: EvalResult[]): EvalSummary {
    const total = results.length;
    const correct = results.filter(r => r.matchedTool).length;
    const byCategory = this.groupByCategory(results);

    return {
      totalCases: total,
      accuracy: total > 0 ? correct / total : 0,
      totalErrors: results.filter(r => r.error).length,
      avgLatencyMs: results.reduce((s, r) => s + r.latencyMs, 0) / total,
      avgTokens: results.reduce((s, r) => s + r.tokensUsed, 0) / total,
      byCategory: Object.fromEntries(
        Array.from(byCategory.entries()).map(([cat, items]) => [
          cat,
          {
            accuracy: items.filter(r => r.matchedTool).length / items.length,
            count: items.length,
          },
        ])
      ),
    };
  }

  private groupByCategory(results: EvalResult[]): Map<string, EvalResult[]> {
    const map = new Map<string, EvalResult[]>();
    for (const r of results) {
      const list = map.get(r.case.category) || [];
      list.push(r);
      map.set(r.case.category, list);
    }
    return map;
  }
}

export interface EvalSummary {
  totalCases: number;
  accuracy: number;
  totalErrors: number;
  avgLatencyMs: number;
  avgTokens: number;
  byCategory: Record<string, { accuracy: number; count: number }>;
}
```

---

## Step 6: Admin API Endpoints

```typescript
import { PromptStore } from "./experiments/prompt-store.js";
import { ExperimentManager } from "./experiments/experiment-manager.js";
import { GradualRollout } from "./experiments/rollout.js";
import { PromptEvaluator, EvalCase } from "./experiments/evaluator.js";

const store = new PromptStore();
const experiments = new ExperimentManager(store);
const rollouts = new GradualRollout(store);
const evaluator = new PromptEvaluator();

// Store endpoints
app.get("/experiments/prompts", (req, res) => {
  const name = req.query.name as string;
  res.json({ versions: store.listVersions(name) });
});

app.post("/experiments/prompts", async (req, res) => {
  const version = await store.save({
    name: req.body.name,
    content: req.body.content,
    tags: req.body.tags || [],
    metadata: req.body.metadata,
  });
  res.json(version);
});

app.post("/experiments/prompts/:name/activate", async (req, res) => {
  const { versionId, rolloutPercent } = req.body;
  await store.activate(req.params.name, versionId, rolloutPercent || 100);
  res.json({ status: "activated" });
});

app.post("/experiments/prompts/:name/rollback", async (req, res) => {
  const prev = await store.rollback(req.params.name);
  res.json({ status: "rolled-back", version: prev });
});

// Experiment endpoints
app.post("/experiments/start", async (req, res) => {
  await experiments.start(req.body);
  res.json({ status: "started" });
});

app.get("/experiments/:name", (req, res) => {
  res.json(experiments.evaluate(req.params.name));
});

app.post("/experiments/:name/cancel", async (req, res) => {
  await experiments.cancel(req.params.name, req.body.promptName);
  res.json({ status: "cancelled" });
});

// Rollout endpoints
app.post("/experiments/rollout", async (req, res) => {
  await rollouts.start(req.body);
  res.json({ status: "rollout-started" });
});

app.post("/experiments/rollout/:name/advance", async (req, res) => {
  const completed = await rollouts.advance(req.params.name);
  res.json({ status: completed ? "completed" : "advanced" });
});

app.post("/experiments/rollout/:name/rollback", async (req, res) => {
  await rollouts.rollback(req.params.name);
  res.json({ status: "rolled-back" });
});

// Evaluation
app.post("/experiments/evaluate", async (req, res) => {
  const { results, summary } = await evaluator.evaluate(
    req.body.promptVersion,
    req.body.executor
  );
  res.json({ results, summary });
});
```

---

## Step 7: Integration with Agent Runtime

```typescript
// In agent runtime — resolve prompt at request time
function buildAgentSystemPrompt(sessionId: string): string {
  // Traffic-split by session ID for deterministic routing
  const result = store.get("system-prompt", sessionId);
  const content = result?.version.content || DEFAULT_SYSTEM_PROMPT;

  // Record which variant this session saw
  logger.info("prompt_resolved", {
    sessionId,
    promptVersion: result?.version.id,
    variant: result?.isTestVariant ? "test" : "control",
  });

  return content;
}
```

---

## What a Good Evaluation Report Looks Like

```
=== Prompt Evaluation: system-prompt-v2 (hypothetical) ===

Overall Accuracy: 91.4%  (+4.2% vs baseline ✅)

By Category:
  happy-path:  96.8% (+2.1%)
  edge-case:   82.5% (+8.9% ✅ — major improvement)
  error-case:  88.9% (+1.0%)

Latency: Avg 1,432ms (+120ms, p95 within limits)
Tokens:  Avg 412 (-18 tokens ✅ cheaper)

Rollout Decision: PROCEED — meeting all thresholds
Next Step: Increase to 25% (currently at 5%)
```

---

## Comparison: A/B Testing Approaches

| Approach | What changes | Traffic split | Risk | Time to result |
|----------|-------------|---------------|------|----------------|
| **Manual edit** | Direct prompt edit | 100% instantly | High | Instant |
| **Version rollback** | Switch between versions | 100% flip | Medium | Seconds |
| **Canary rollout** | Gradual % increase | 1→5→25→50→100% | Low | Days |
| **A/B experiment** | Random split 50/50 | 50% control, 50% test | Low | Hours |
| **Shadow testing** | Run both, compare offline | 0% user-facing | Minimal | Days |

---

## Production Considerations

### Deterministic traffic splitting
Always use a stable seed (session ID, user ID) for variant assignment. The same user should see the same variant across requests — otherwise you get inconsistent experiences.

```typescript
// Good — deterministic
const variant = hash(seed) % 100 < experimentWeight ? "treatment" : "control";

// Bad — random
const variant = Math.random() < 0.5 ? "treatment" : "control";
```

### Metrics fatigue
Don't track 20 metrics per experiment. Pick 3-5 that matter. More metrics = higher chance of false positives.

### Auto-rollback thresholds
Set maximum acceptable degradation for each metric:

```typescript
const AUTO_ROLLBACK_CONFIG = {
  error_rate: { maxIncrease: 0.02 },      // +2% max
  latency_p95: { maxIncrease: 0.10 },      // +10% max
  token_cost: { maxIncrease: 0.20 },       // +20% max
  tool_accuracy: { maxDecrease: 0.03 },    // -3% max
};
```

### Prompt storage
- Store prompts in a database, not the filesystem, in multi-server setups
- Use Redis pub/sub to notify all replicas of version changes
- Every prompt change is a new version — never edit in place

---

## Summary

| Concept | Implementation | Benefit |
|---------|---------------|---------|
| Versioned prompt store | `PromptStore` with tags + metadata | Every change is traceable |
| Traffic splitting | Deterministic hash-based assignment | Consistent user experience |
| A/B experiments | `ExperimentManager` with weights + auto-evaluation | Data-driven decisions |
| Gradual rollout | `GradualRollout` with canary steps + auto-rollback | Low-risk deployment |
| Eval pipeline | `PromptEvaluator` with test cases + summary | Quantified quality |
| Admin API | Full CRUD for prompts, experiments, rollouts | Human-in-the-loop |

### Checklist:
- [ ] Prompts stored as versioned configs (not hardcoded)
- [ ] Traffic splitting uses deterministic seed (session ID)
- [ ] Experiment has clear success metrics
- [ ] Minimum sample size defined before declaring winner
- [ ] Auto-rollback thresholds configured
- [ ] Evaluation test cases cover happy path + edge cases
- [ ] Rollback tested before promotion
- [ ] Fallback to stable version on error

---

| Day | Topic |
|-----|-------|
| 1 | Observability & Telemetry ✅ |
| 2 | Caching Strategies ✅ |
| 3 | Error Handling & Resilience ✅ |
| 4 | **A/B Testing Prompts & Configs ✅** |
| 5 | Multi-Region & High Availability |
| 6 | Building an Internal Agent Platform |

---

*Series: AI Agents in Production. Day 4: A/B testing platform with versioned prompt store, experiment manager, gradual rollout, and automated evaluation pipeline. Full TypeScript source code included.*
