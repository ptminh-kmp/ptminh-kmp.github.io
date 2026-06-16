---
title: "AI Agents in Production — Day 5: Multi-Region & High Availability"
description: "Your agent is a single point of failure. Deploy across regions, handle region failover, replicate state, and keep the agent running when a data center goes dark."
published: 2026-06-17
pubDate: 2026-06-17T02:00:00.000Z
slug: ai-agents-in-production-multi-region-ha
tags:
  - ai-agents
  - production
  - multi-region
  - high-availability
  - failover
  - replication
  - infrastructure
  - typescript
category: ai-agents
lang: en
series:
  name: "AI Agents in Production"
  order: 5
  total: 6
---

A single-region agent is one AWS outage away from being useless.

When us-east-1 goes down (it will, eventually), your users get 502s. When your database is in one availability zone and that zone has a network partition, sessions go silent. Multi-region isn't optional for production agents — it's table stakes.

This post builds a multi-region agent architecture:

```
┌───────────────┐     ┌───────────────┐
│  Region A     │     │  Region B     │
│  (us-east-1)  │     │  (eu-west-1)  │
│               │     │               │
│  ┌─────────┐  │     │  ┌─────────┐  │
│  │ Agent   │  │     │  │ Agent   │  │
│  │ Runtime │  │     │  │ Runtime │  │
│  └────┬────┘  │     │  └────┬────┘  │
│       │       │     │       │       │
│  ┌────▼────┐  │     │  ┌────▼────┐  │
│  │ Redis   │  │     │  │ Redis   │  │
│  │ (local) │  │     │  │ (local) │  │
│  └─────────┘  │     │  └─────────┘  │
└───────┬───────┘     └───────┬───────┘
        │                     │
        └──────────┬──────────┘
                   │
           ┌───────────────┐
           │  Global       │
           │  State Store  │
           │  (DynamoDB /  │
           │   CockroachDB)│
           └───────────────┘
                   │
                   │
           ┌───────────────┐
           │  Global LB    │
           │  (Route53 +   │
           │   CloudFront) │
           └───────────────┘
```

---

## Step 1: The Multi-Region Problem

An agent's state is fundamentally different from a web server's state.

| Aspect | Web server | AI agent |
|--------|-----------|----------|
| Session state | Stateless (JWT) | Stateful (conversation history) |
| Cache | Global CDN works | Per-region semantic cache misses |
| Latency tolerance | <200ms | Can tolerate 1-2s (LLM is slower) |
| Consistency | Eventual is fine | Strong for in-flight requests |
| Failover | Redirect to healthy region | Restore conversation from checkpoint |

**Key insight:** LLM calls are already slow (1-5s). We have room for cross-region coordination without adding noticeable latency.

---

## Step 2: Region-Aware Agent Runtime

### `src/multi-region/region-router.ts`

```typescript
// src/multi-region/region-router.ts — Resolve which region handles a request

export interface RegionConfig {
  name: string;           // "us-east-1" | "eu-west-1" | "ap-southeast-1"
  endpoint: string;       // Agent endpoint URL
  weight: number;         // Traffic weight (0-100)
  priority: number;       // Lower = preferred (0 = primary)
  status: "active" | "degraded" | "down";
}

export class RegionRouter {
  private regions: RegionConfig[] = [];

  constructor(regions: RegionConfig[]) {
    this.regions = regions.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Get the optimal region for a request.
   * Prefers same-continent regions and healthy ones.
   */
  resolve(clientRegion: string): RegionConfig {
    const healthy = this.regions.filter(r => r.status === "active");
    if (healthy.length === 0) {
      // Everything is down — return the closest region anyway
      return this.findClosest(clientRegion);
    }

    // Try closest active region first
    const closest = this.findClosest(clientRegion, healthy);
    if (closest) return closest;

    // Fallback to any healthy region
    return healthy[0];
  }

  /**
   * Detect region failure and mark as down.
   */
  markDown(regionName: string): void {
    const region = this.regions.find(r => r.name === regionName);
    if (region) {
      region.status = "down";
      console.warn(`[Region] ${regionName}: marked DOWN`);
    }
  }

  /**
   * Health check all regions.
   */
  async healthCheck(): Promise<Record<string, "active" | "degraded" | "down">> {
    const results: Record<string, "active" | "degraded" | "down"> = {};

    for (const region of this.regions) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);

        const response = await fetch(`${region.endpoint}/health`, {
          signal: controller.signal,
        });
        clearTimeout(timeout);

        if (response.ok) {
          const body = await response.json();
          region.status = body.status || "active";
        } else {
          region.status = "degraded";
        }
      } catch {
        region.status = "down";
      }

      results[region.name] = region.status;
    }

    return results;
  }

  private findClosest(clientRegion: string, pool?: RegionConfig[]): RegionConfig | undefined {
    const candidates = pool || this.regions;
    // Simple continent mapping — in production, use geo-IP database
    const continent = this.mapToContinent(clientRegion);
    const sameContinent = candidates.filter(r => this.mapToContinent(r.name) === continent);

    if (sameContinent.length > 0) {
      return sameContinent.reduce((best, r) =>
        r.priority < best.priority ? r : best
      );
    }

    return undefined;
  }

  private mapToContinent(region: string): string {
    const prefix = region.startsWith("us-") || region.startsWith("ca-") ? "americas"
      : region.startsWith("eu-") ? "europe"
      : region.startsWith("ap-") || region.startsWith("sa-") ? "asia-pacific"
      : "other";
    return prefix;
  }

  getStatus(): { regions: RegionConfig[]; healthy: number; total: number } {
    return {
      regions: this.regions,
      healthy: this.regions.filter(r => r.status === "active").length,
      total: this.regions.length,
    };
  }
}
```

---

## Step 3: Global State Store — Session Replication

The hardest part of multi-region agents is state. An agent's conversation history must survive a region failover.

### `src/multi-region/global-state.ts`

```typescript
// src/multi-region/global-state.ts — Cross-region session state replication

export interface SessionSnapshot {
  sessionId: string;
  conversation: Array<{
    role: "user" | "assistant" | "tool";
    content: string;
    timestamp: number;
  }>;
  state: Record<string, unknown>;   // Agent internal state (paused tools, etc.)
  version: number;                    // Monotonic version for conflict resolution
  lastActiveRegion: string;
  lastActiveAt: number;
}

export interface GlobalStateConfig {
  checkpointIntervalMs: number;   // How often to checkpoint (default: 5000)
  ttlMs: number;                  // Session TTL after last activity (default: 3600_000)
  conflictStrategy: "last-write-wins" | "version-wins" | "merge";
}

const DEFAULT_GLOBAL_CONFIG: GlobalStateConfig = {
  checkpointIntervalMs: 5_000,
  ttlMs: 3_600_000,  // 1 hour
  conflictStrategy: "version-wins",
};

export class GlobalStateStore {
  private store: Map<string, SessionSnapshot> = new Map();
  private currentRegion: string;
  private config: GlobalStateConfig;

  constructor(currentRegion: string, config: Partial<GlobalStateConfig> = {}) {
    this.currentRegion = currentRegion;
    this.config = { ...DEFAULT_GLOBAL_CONFIG, ...config };
  }

  /**
   * Save a session checkpoint to the global store.
   * In production, this writes to DynamoDB / CockroachDB / Redis Enterprise.
   * For this example, we use an in-memory map (simulating a global KV store).
   */
  async checkpoint(sessionId: string, snapshot: Omit<SessionSnapshot, "lastActiveRegion" | "lastActiveAt">): Promise<void> {
    const existing = this.store.get(sessionId);

    const updated: SessionSnapshot = {
      ...snapshot,
      lastActiveRegion: this.currentRegion,
      lastActiveAt: Date.now(),
    };

    // Conflict resolution
    if (existing && this.config.conflictStrategy === "version-wins") {
      if (snapshot.version <= existing.version) {
        console.warn(`[GlobalState] Conflict: version ${snapshot.version} ≤ ${existing.version}, rejecting`);
        return;
      }
    }

    this.store.set(sessionId, updated);

    // Log activity for monitoring
    console.debug(`[GlobalState] Checkpoint: ${sessionId} v${snapshot.version} @ ${this.currentRegion}`);
  }

  /**
   * Restore a session from the global store.
   * Used during failover — new region picks up where old region left off.
   */
  async restore(sessionId: string): Promise<SessionSnapshot | null> {
    const snapshot = this.store.get(sessionId);
    if (!snapshot) return null;

    // Check TTL
    if (Date.now() - snapshot.lastActiveAt > this.config.ttlMs) {
      this.store.delete(sessionId);
      return null;
    }

    // Update the active region on restore
    snapshot.lastActiveRegion = this.currentRegion;
    snapshot.lastActiveAt = Date.now();

    console.log(`[GlobalState] Restored: ${sessionId} v${snapshot.version} (was in ${snapshot.lastActiveRegion})`);
    return snapshot;
  }

  /**
   * Checkpoint periodically during a session.
   */
  startPeriodicCheckpoint(
    sessionId: string,
    getSnapshot: () => Omit<SessionSnapshot, "lastActiveRegion" | "lastActiveAt">
  ): () => void {
    const interval = setInterval(() => {
      this.checkpoint(sessionId, getSnapshot());
    }, this.config.checkpointIntervalMs);

    return () => clearInterval(interval);
  }

  /**
   * List all active sessions globally.
   */
  listActiveSessions(): SessionSnapshot[] {
    const now = Date.now();
    return Array.from(this.store.values())
      .filter(s => now - s.lastActiveAt <= this.config.ttlMs)
      .sort((a, b) => b.lastActiveAt - a.lastActiveAt);
  }

  async stats(): Promise<{
    totalSessions: number;
    activeSessions: number;
    byRegion: Record<string, number>;
  }> {
    const allSessions = Array.from(this.store.values());
    const now = Date.now();
    const active = allSessions.filter(s => now - s.lastActiveAt <= this.config.ttlMs);
    const byRegion: Record<string, number> = {};

    for (const s of active) {
      byRegion[s.lastActiveRegion] = (byRegion[s.lastActiveRegion] || 0) + 1;
    }

    return {
      totalSessions: allSessions.length,
      activeSessions: active.length,
      byRegion,
    };
  }
}
```

### Real implementation sketch (DynamoDB):

```typescript
// In production, replace the in-memory map with DynamoDB:
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, GetCommand } from "@aws-sdk/lib-dynamodb";

export class DynamoGlobalState extends GlobalStateStore {
  private docClient: DynamoDBDocumentClient;
  private tableName: string;

  constructor(region: string, tableName: string) {
    super(region);
    this.tableName = tableName;
    this.docClient = DynamoDBDocumentClient.from(
      new DynamoDBClient({ region })
    );
  }

  async checkpoint(sessionId: string, snapshot: Omit<SessionSnapshot, "lastActiveRegion" | "lastActiveAt">): Promise<void> {
    await this.docClient.send(new PutCommand({
      TableName: this.tableName,
      Item: {
        pk: `session#${sessionId}`,
        ...snapshot,
        lastActiveRegion: this.currentRegion,
        lastActiveAt: Date.now(),
        ttl: Math.floor(Date.now() / 1000) + 3600, // DynamoDB TTL
      },
      // Conditional write for version-wins consistency
      ConditionExpression: "attribute_not_exists(version) OR version < :newVersion",
      ExpressionAttributeValues: { ":newVersion": snapshot.version },
    }));
  }

  async restore(sessionId: string): Promise<SessionSnapshot | null> {
    const result = await this.docClient.send(new GetCommand({
      TableName: this.tableName,
      Key: { pk: `session#${sessionId}` },
    }));
    return result.Item as SessionSnapshot ?? null;
  }
}
```

---

## Step 4: Multi-Region Cache

From Day 2, our cache is local to one region. After failover, semantic cache starts cold. Solution: replicate cache keys across regions.

### `src/multi-region/cache-replication.ts`

```typescript
// src/multi-region/cache-replication.ts — Cross-region cache warming

import { SemanticCache } from "../cache/semantic-cache.js";
import { ExactCache } from "../cache/exact-cache.js";

interface CacheWarmupEntry {
  key: string;
  value: string;
  ttlMs: number;
  sourceRegion: string;
  timestamp: number;
}

export class CacheReplicator {
  private sourceCache: SemanticCache | ExactCache;
  private peerEndpoints: string[];
  private regionName: string;

  constructor(
    cache: SemanticCache | ExactCache,
    regionName: string,
    peerEndpoints: string[]
  ) {
    this.sourceCache = cache;
    this.regionName = regionName;
    this.peerEndpoints = peerEndpoints;
  }

  /**
   * Broadcast a cache entry to peer regions.
   */
  async broadcast(key: string, value: string, ttlMs: number): Promise<void> {
    const entry: CacheWarmupEntry = {
      key,
      value,
      ttlMs,
      sourceRegion: this.regionName,
      timestamp: Date.now(),
    };

    const promises = this.peerEndpoints.map(endpoint =>
      fetch(`${endpoint}/cache/warmup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(entry),
        signal: AbortSignal.timeout(2000),
      }).catch(() => {
        console.warn(`[CacheReplicator] Failed to warm ${endpoint}`);
      })
    );

    await Promise.allSettled(promises);
  }

  /**
   * Warmup endpoint — receives entries from peer regions.
   */
  async receiveWarmup(entry: CacheWarmupEntry): Promise<void> {
    const stalenessMs = Date.now() - entry.timestamp;

    // Only accept entries less than 30 seconds old
    if (stalenessMs > 30_000) {
      console.debug(`[CacheReplicator] Skipping stale warmup from ${entry.sourceRegion} (${stalenessMs}ms old)`);
      return;
    }

    const remainingTtl = entry.ttlMs - stalenessMs;
    if (remainingTtl <= 0) return;

    await this.sourceCache.set(entry.key, JSON.parse(entry.value), remainingTtl);
    console.debug(`[CacheReplicator] Warmed: ${entry.key.slice(0, 40)}... from ${entry.sourceRegion}`);
  }
}
```

### Warmup endpoint:

```typescript
app.post("/cache/warmup", async (req, res) => {
  await cacheReplicator.receiveWarmup(req.body);
  res.json({ status: "warmed" });
});
```

---

## Step 5: Graceful Failover

When a region dies, the agent must hand off sessions to another region without the user noticing.

### `src/multi-region/failover-manager.ts`

```typescript
// src/multi-region/failover-manager.ts — Automatic region failover

import { RegionRouter } from "./region-router.js";
import { GlobalStateStore } from "./global-state.js";

export interface FailoverEvent {
  fromRegion: string;
  toRegion: string;
  sessionCount: number;
  reason: string;
  timestamp: number;
}

type FailoverListener = (event: FailoverEvent) => void;

export class FailoverManager {
  private router: RegionRouter;
  private globalState: GlobalStateStore;
  private currentRegion: string;
  private listeners: FailoverListener[] = [];
  private failoverHistory: FailoverEvent[] = [];
  private healthCheckInterval: ReturnType<typeof setInterval> | null = null;

  constructor(
    router: RegionRouter,
    globalState: GlobalStateStore,
    currentRegion: string
  ) {
    this.router = router;
    this.globalState = globalState;
    this.currentRegion = currentRegion;
  }

  /**
   * Start periodic health checks.
   */
  startHealthChecks(intervalMs = 30_000): void {
    this.healthCheckInterval = setInterval(async () => {
      const status = await this.router.healthCheck();

      if (status[this.currentRegion] === "down") {
        const failover = this.initiateFailover("health-check-failure");
        console.warn(`[Failover] Region ${this.currentRegion} is DOWN. Failover triggered.`);
        this.notifyListeners(failover);
      }
    }, intervalMs);
  }

  /**
   * Initiate failover to the next available region.
   */
  initiateFailover(reason: string): FailoverEvent {
    const healthyRegions = this.router.getStatus().regions.filter(r =>
      r.status === "active" && r.name !== this.currentRegion
    );

    if (healthyRegions.length === 0) {
      throw new Error("No healthy regions available for failover");
    }

    // Pick the highest priority healthy region
    const target = healthyRegions.sort((a, b) => a.priority - b.priority)[0];
    const activeSessions = this.globalState.listActiveSessions();
    const activeSessionCount = activeSessions.length;

    // Final checkpoint all active sessions
    for (const session of activeSessions) {
      this.globalState.checkpoint(session.sessionId, {
        conversation: session.conversation,
        state: session.state,
        version: session.version + 1,
      });
    }

    const event: FailoverEvent = {
      fromRegion: this.currentRegion,
      toRegion: target.name,
      sessionCount: activeSessionCount,
      reason,
      timestamp: Date.now(),
    };

    this.failoverHistory.push(event);
    this.currentRegion = target.name;

    return event;
  }

  /**
   * Test failover without actually switching.
   */
  dryRunFailover(): { targetRegion: string; sessionCount: number } {
    const healthyRegions = this.router.getStatus().regions.filter(r =>
      r.status === "active" && r.name !== this.currentRegion
    );
    const target = healthyRegions.sort((a, b) => a.priority - b.priority)[0];
    const activeSessions = this.globalState.listActiveSessions();

    return {
      targetRegion: target?.name || "none",
      sessionCount: activeSessions.length,
    };
  }

  /**
   * Restore a session — called by the new region after failover.
   */
  async restoreSession(sessionId: string): Promise<boolean> {
    const snapshot = await this.globalState.restore(sessionId);
    if (!snapshot) return false;

    console.log(`[Failover] Session ${sessionId} restored in ${this.currentRegion}`);
    return true;
  }

  onFailover(listener: FailoverListener): void {
    this.listeners.push(listener);
  }

  getHistory(): FailoverEvent[] {
    return this.failoverHistory;
  }

  stopHealthChecks(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }

  private notifyListeners(event: FailoverEvent): void {
    for (const listener of this.listeners) {
      try { listener(event); } catch (e) {
        console.error("[Failover] Listener error:", e);
      }
    }
  }
}
```

---

## Step 6: Admin Endpoints for Multi-Region

```typescript
// src/server-multi-region.ts

import { RegionRouter } from "./multi-region/region-router.js";
import { GlobalStateStore } from "./multi-region/global-state.js";
import { FailoverManager } from "./multi-region/failover-manager.js";
import { CacheReplicator } from "./multi-region/cache-replication.js";

const currentRegion = process.env.AWS_REGION || "us-east-1";

const router = new RegionRouter([
  { name: "us-east-1", endpoint: "https://agent-us.minixium.com", weight: 50, priority: 0, status: "active" },
  { name: "eu-west-1", endpoint: "https://agent-eu.minixium.com", weight: 30, priority: 1, status: "active" },
  { name: "ap-southeast-1", endpoint: "https://agent-ap.minixium.com", weight: 20, priority: 2, status: "active" },
]);

const globalState = new GlobalStateStore(currentRegion, { checkpointIntervalMs: 5_000 });
const failover = new FailoverManager(router, globalState, currentRegion);

failover.onFailover((event) => {
  console.log(`[Failover] ${event.fromRegion} → ${event.toRegion}: ${event.sessionCount} sessions`);
});

// Region status
app.get("/regions", (req, res) => {
  res.json(router.getStatus());
});

// Health check trigger
app.post("/regions/health-check", async (req, res) => {
  const results = await router.healthCheck();
  res.json(results);
});

// Force failover (admin only)
app.post("/regions/failover", async (req, res) => {
  try {
    const event = failover.initiateFailover(req.body.reason || "manual");
    res.json({ status: "failover-initiated", event });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// Dry run
app.get("/regions/failover/dry-run", (req, res) => {
  res.json(failover.dryRunFailover());
});

// Failover history
app.get("/regions/failover/history", (req, res) => {
  res.json(failover.getHistory());
});

// Global session state
app.get("/regions/sessions", async (req, res) => {
  const stats = await globalState.stats();
  res.json(stats);
});

// Active sessions
app.get("/regions/sessions/active", (req, res) => {
  const sessions = globalState.listActiveSessions().map(s => ({
    sessionId: s.sessionId,
    lastActiveRegion: s.lastActiveRegion,
    lastActiveAt: s.lastActiveAt,
    version: s.version,
    messageCount: s.conversation.length,
  }));
  res.json(sessions);
});
```

---

## Step 7: Session Checkpoint in the Agent Runtime

Integrate periodic checkpointing into the agent.

### `src/multi-region/agent-with-checkpoint.ts`

```typescript
import { GlobalStateStore } from "./global-state.js";
import { AgentLogger } from "../telemetry/logger.js";

export class CheckpointAwareAgent {
  private globalState: GlobalStateStore;
  private logger: AgentLogger;
  private stopCheckpointing: (() => void) | null = null;

  constructor(globalState: GlobalStateStore) {
    this.globalState = globalState;
    this.logger = new AgentLogger();
  }

  /**
   * Start a session with periodic checkpointing.
   */
  startSession(sessionId: string): CheckpointContext {
    const context: CheckpointContext = {
      sessionId,
      conversation: [],
      state: {},
      version: 1,
    };

    // Periodic checkpoint
    this.stopCheckpointing = this.globalState.startPeriodicCheckpoint(
      sessionId,
      () => ({
        sessionId,
        conversation: context.conversation,
        state: context.state,
        version: context.version,
      })
    );

    this.logger.info("session_started", {
      sessionId,
      region: (this.globalState as any).currentRegion,
    });

    return context;
  }

  /**
   * Handle a tool call — checkpoint after each mutation.
   */
  async handleToolCall(context: CheckpointContext, tool: string, result: unknown): Promise<void> {
    context.conversation.push({
      role: "tool",
      content: JSON.stringify(result).slice(0, 1000),
      timestamp: Date.now(),
    });
    context.version++;

    // Checkpoint after every mutation
    if (["create_issue", "update_issue", "delete_issue"].includes(tool)) {
      await this.globalState.checkpoint(context.sessionId, {
        sessionId: context.sessionId,
        conversation: context.conversation,
        state: context.state,
        version: context.version,
      });

      this.logger.info("session_checkpoint", {
        sessionId: context.sessionId,
        version: context.version,
        tool,
      });
    }
  }

  /**
   * End session — final checkpoint and cleanup.
   */
  async endSession(context: CheckpointContext): Promise<void> {
    if (this.stopCheckpointing) {
      this.stopCheckpointing();
    }

    await this.globalState.checkpoint(context.sessionId, {
      sessionId: context.sessionId,
      conversation: context.conversation,
      state: context.state,
      version: context.version,
    });

    this.logger.info("session_ended", {
      sessionId: context.sessionId,
      version: context.version,
      messageCount: context.conversation.length,
    });
  }
}

interface CheckpointContext {
  sessionId: string;
  conversation: Array<{ role: string; content: string; timestamp: number }>;
  state: Record<string, unknown>;
  version: number;
}
```

---

## Step 8: Infrastructure — What You Actually Deploy

### DNS Routing (Route53)

```
agent.minixium.com
  ├── us-east-1: weight 50 (primary)
  ├── eu-west-1: weight 30
  └── ap-southeast-1: weight 20
  Health check: /health → failover on consecutive failures
```

### Global State Table (DynamoDB Global Table)

| Attribute | Type | Notes |
|-----------|------|-------|
| pk | String | `session#<sessionId>` |
| conversation | List | Bounded to last 50 messages |
| state | Map | Agent internal state |
| version | Number | Monotonic for conflict resolution |
| lastActiveRegion | String | Which region last wrote |
| lastActiveAt | Number | Epoch ms |
| ttl | Number | DynamoDB TTL (1 hour) |

### Cross-Region Cache Replication

```
us-east-1 cache hit → broadcast to eu-west-1 and ap-southeast-1
                                       ↓
Other regions warm their cache → 502 → 200 on failover
```

---

## Failover Test Plan

| Scenario | Expected behavior | Validation |
|----------|------------------|------------|
| Region A unresponsive | Route53 redirects to B | All sessions continue |
| Region A returns 503 | Health check fails → mark degraded | No new traffic to A |
| Region A partially up | 50% requests fail → mark degraded | Graceful degradation |
| Network partition | Health check times out | Last-write-wins on restore |
| Both A and B down | Return 503 with status page | Notify on-call |
| Quick restart (<30s) | Cache warmup from peers | Replicator receives entries |
| Long outage (>1h) | Sessions expired via TTL | Users re-authenticate |

---

## Comparison: Single-Region vs Multi-Region

| Aspect | Single region | Multi-region |
|--------|--------------|--------------|
| Latency | Low for local users | Optimal for global users |
| Availability | 99.9% (regional) | 99.99% (multi-region) |
| Complexity | Simple | Global state + replication |
| Cache | Local only | Cross-region warmup |
| Cost | 1x infrastructure | 2-3x infra + data transfer |
| Recovery | Redeploy to another region | Automatic failover |
| Session handoff | Not needed | Periodic checkpointing |

---

## Summary

| Concept | Implementation | What it solves |
|---------|---------------|----------------|
| Region routing | `RegionRouter` with priority + health | Smart traffic distribution |
| Global state | `GlobalStateStore` with version+wins | Session continuity |
| Periodic checkpoint | `startPeriodicCheckpoint()` every 5s | Minimize data loss on failover |
| Cache warmup | `CacheReplicator` broadcasts to peers | Zero-cold-start after failover |
| Health checks | Periodic /health per region | Early detection |
| Failover | `FailoverManager` — automatic + manual | Region failure recovery |
| Dry run | `dryRunFailover()` | Safe testing |
| DynamoDB Global Tables | Production-ready state store | Strong consistency across regions |

### Checklist:
- [ ] Regional deployment configured (≥ 2 regions)
- [ ] Global state store deployed (DynamoDB Global Tables / CockroachDB)
- [ ] Session checkpointing integrated into agent runtime
- [ ] Cross-region cache warming implemented
- [ ] Health check endpoint configured per region
- [ ] Route53 / global LB configured with health checks
- [ ] Failover tested (dry-run → manual → automatic)
- [ ] Session TTL configured (1 hour default)
- [ ] Failover history exposed via admin endpoint
- [ ] Alert when no healthy regions remain

---

| Day | Topic |
|-----|-------|
| 1 | Observability & Telemetry ✅ |
| 2 | Caching Strategies ✅ |
| 3 | Error Handling & Resilience ✅ |
| 4 | A/B Testing Prompts & Configs ✅ |
| 5 | **Multi-Region & High Availability ✅** |
| 6 | Building an Internal Agent Platform |

---

*Series: AI Agents in Production. Day 5: Multi-region architecture with region-aware routing, global state replication, cache warmup, and automatic failover. Full TypeScript source code included.*
