---
title: "AI Agents trong Production — Day 5: Multi-Region & High Availability"
description: "Agent là single point of failure. Triển khai đa region, failover tự động, replication state và cache — giữ agent chạy khi data center tắt điện."
published: 2026-06-17
pubDate: 2026-06-17T02:00:00.000Z
slug: ai-agents-in-production-multi-region-ha-vi
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
lang: vi
series:
  name: "AI Agents in Production"
  order: 5
  total: 6
---

Một agent single-region là một AWS outage cách xa sự vô dụng.

Bài này xây kiến trúc multi-region: region routing, global state replication, cache warmup, và automatic failover — để agent sống sót qua region failure.

---

## Vấn đề: Stateful Agent ≠ Web Server

| Khía cạnh | Web server | AI agent |
|-----------|-----------|----------|
| Session state | Stateless (JWT) | Stateful (conversation history) |
| Cache | CDN works | Per-region miss sau failover |
| Consistency | Eventual là đủ | Strong cho in-flight requests |
| Failover | Redirect | Restore conversation từ checkpoint |

**Key insight:** LLM calls đã chậm (1-5s) → có dư thời gian cho cross-region coordination.

---

## Step 1: Region-Aware Router

### `src/multi-region/region-router.ts`

```typescript
export class RegionRouter {
  private regions: RegionConfig[];

  resolve(clientRegion: string): RegionConfig {
    const healthy = this.regions.filter(r => r.status === "active");
    if (healthy.length === 0) return this.findClosest(clientRegion);
    return this.findClosest(clientRegion, healthy) || healthy[0];
  }

  async healthCheck(): Promise<Record<string, "active" | "degraded" | "down">> {
    // Fetch /health từ mỗi region với 5s timeout
    // Nếu OK → active, nếu error → degraded/down
  }

  markDown(regionName: string): void {
    const r = this.regions.find(r => r.name === regionName);
    if (r) { r.status = "down"; }
  }

  private findClosest(region: string, pool?: RegionConfig[]): RegionConfig | undefined {
    // Continent mapping: us- → americas, eu- → europe, ap- → asia-pacific
  }
}
```

**Cấu hình:**

```typescript
const router = new RegionRouter([
  { name: "us-east-1", endpoint: "https://agent-us.example.com", weight: 50, priority: 0, status: "active" },
  { name: "eu-west-1", endpoint: "https://agent-eu.example.com", weight: 30, priority: 1, status: "active" },
  { name: "ap-southeast-1", endpoint: "https://agent-ap.example.com", weight: 20, priority: 2, status: "active" },
]);
```

---

## Step 2: Global State Store

Cross-region session replication. Mỗi region checkpoint state vào global KV store.

### `src/multi-region/global-state.ts`

```typescript
export interface SessionSnapshot {
  sessionId: string;
  conversation: Array<{ role: string; content: string; timestamp: number }>;
  state: Record<string, unknown>;
  version: number;           // Monotonic — conflict resolution
  lastActiveRegion: string;
  lastActiveAt: number;
}

export class GlobalStateStore {
  private store = new Map<string, SessionSnapshot>();
  private currentRegion: string;

  async checkpoint(sessionId: string, snapshot: Partial<SessionSnapshot>): Promise<void> {
    // version-wins conflict resolution
    const existing = this.store.get(sessionId);
    if (existing && snapshot.version! <= existing.version) return;

    this.store.set(sessionId, {
      ...snapshot as SessionSnapshot,
      lastActiveRegion: this.currentRegion,
      lastActiveAt: Date.now(),
    });
  }

  async restore(sessionId: string): Promise<SessionSnapshot | null> {
    const snapshot = this.store.get(sessionId);
    if (!snapshot) return null;
    if (Date.now() - snapshot.lastActiveAt > 3600_000) {
      this.store.delete(sessionId); // TTL expired
      return null;
    }
    return snapshot;
  }

  startPeriodicCheckpoint(sessionId: string, getSnapshot: () => any): () => void {
    const interval = setInterval(() => this.checkpoint(sessionId, getSnapshot()), 5000);
    return () => clearInterval(interval);
  }

  async stats(): Promise<{ totalSessions: number; activeSessions: number; byRegion: Record<string, number> }> {
    // Thống kê session theo region
  }
}
```

### Production: DynamoDB Global Tables

```typescript
// Replace in-memory map với DynamoDB
export class DynamoGlobalState extends GlobalStateStore {
  async checkpoint(sessionId: string, snapshot: any): Promise<void> {
    await this.docClient.send(new PutCommand({
      TableName: "agent-sessions",
      Item: { pk: `session#${sessionId}`, ...snapshot, ttl: Math.floor(Date.now()/1000) + 3600 },
      ConditionExpression: "attribute_not_exists(version) OR version < :v",
      ExpressionAttributeValues: { ":v": snapshot.version },
    }));
  }
}
```

---

## Step 3: Cross-Region Cache Warmup

Sau failover, cache region mới cold → latency tăng. Giải pháp: broadcast cache entries đến peer regions.

### `src/multi-region/cache-replication.ts`

```typescript
export class CacheReplicator {
  async broadcast(key: string, value: string, ttlMs: number): Promise<void> {
    const entry = { key, value, ttlMs, sourceRegion: this.regionName, timestamp: Date.now() };

    await Promise.allSettled(
      this.peerEndpoints.map(ep =>
        fetch(`${ep}/cache/warmup`, {
          method: "POST", body: JSON.stringify(entry),
          signal: AbortSignal.timeout(2000),
        }).catch(() => {})
      )
    );
  }

  async receiveWarmup(entry: CacheWarmupEntry): Promise<void> {
    const age = Date.now() - entry.timestamp;
    if (age > 30_000) return; // Bỏ stale entries
    await this.sourceCache.set(entry.key, JSON.parse(entry.value), entry.ttlMs - age);
  }
}
```

---

## Step 4: Graceful Failover

### `src/multi-region/failover-manager.ts`

```typescript
export class FailoverManager {
  initiateFailover(reason: string): FailoverEvent {
    const healthy = this.router.getStatus().regions
      .filter(r => r.status === "active" && r.name !== this.currentRegion);
    if (healthy.length === 0) throw new Error("No healthy regions");

    const target = healthy.sort((a, b) => a.priority - b.priority)[0];

    // Final checkpoint tất cả active sessions
    for (const session of this.globalState.listActiveSessions()) {
      this.globalState.checkpoint(session.sessionId, { ...session, version: session.version + 1 });
    }

    this.currentRegion = target.name;
    return { fromRegion: this.currentRegion, toRegion: target.name, reason, timestamp: Date.now() };
  }

  dryRunFailover(): { targetRegion: string; sessionCount: number } {
    // Không switch — chỉ báo sẽ chuyển đi đâu
  }

  async restoreSession(sessionId: string): Promise<boolean> {
    const snapshot = await this.globalState.restore(sessionId);
    if (!snapshot) return false;
    // Khôi phục conversation + state
    return true;
  }

  startHealthChecks(intervalMs = 30000): void {
    setInterval(async () => {
      const status = await this.router.healthCheck();
      if (status[this.currentRegion] === "down") {
        this.initiateFailover("health-check-failure");
      }
    }, intervalMs);
  }
}
```

---

## Step 5: Session Checkpoint trong Runtime

### `src/multi-region/agent-with-checkpoint.ts`

```typescript
export class CheckpointAwareAgent {
  startSession(sessionId: string): CheckpointContext {
    const ctx = { sessionId, conversation: [], state: {}, version: 1 };
    this.stopCheckpoint = this.globalState.startPeriodicCheckpoint(sessionId, () => ctx);
    return ctx;
  }

  async handleToolCall(ctx: CheckpointContext, tool: string, result: unknown): Promise<void> {
    ctx.conversation.push({ role: "tool", content: JSON.stringify(result).slice(0, 1000), timestamp: Date.now() });
    ctx.version++;

    if (["create_issue", "update_issue"].includes(tool)) {
      await this.globalState.checkpoint(ctx.sessionId, ctx);
    }
  }

  async endSession(ctx: CheckpointContext): Promise<void> {
    this.stopCheckpoint?.();
    await this.globalState.checkpoint(ctx.sessionId, ctx);
  }
}
```

---

## Step 6: Admin API

```
GET  /regions                              → region status
POST /regions/health-check                  → trigger health check
POST /regions/failover                      → force failover (admin only)
GET  /regions/failover/dry-run              → failover simulation
GET  /regions/failover/history              → failover event log
GET  /regions/sessions                      → global session stats
GET  /regions/sessions/active              → active sessions list
```

---

## Failover Test Plan

| Scenario | Expected |
|----------|----------|
| Region A unresponsive | Route53 redirect → sessions continue |
| Region A 503 | Mark degraded → no new traffic |
| Network partition | Health check timeout → last-write-wins |
| Both A+B down | 503 + status page → notify on-call |
| Quick restart (<30s) | Cache warmup từ peers |
| Long outage (>1h) | Sessions expired via TTL |

---

## Summary

| Concept | Implementation |
|---------|---------------|
| Region routing | RegionRouter với priority + health |
| Global state | GlobalStateStore với version-wins |
| Checkpoint | 5s interval + post-mutation |
| Cache warmup | Broadcast → peer warmup endpoint |
| Failover | Automatic (health check) + manual |
| Dry run | Safe simulation trước khi switch |

### Checklist:
- [ ] ≥ 2 regions deployed
- [ ] Global state store (DynamoDB Global Tables)
- [ ] Session checkpointing trong runtime
- [ ] Cross-region cache warming
- [ ] Health check endpoint mỗi region
- [ ] Route53/LB với health checks
- [ ] Failover tested (dry-run → manual → auto)

---

| Day | Chủ đề |
|-----|--------|
| 1 | Observability & Telemetry ✅ |
| 2 | Caching Strategies ✅ |
| 3 | Error Handling & Resilience ✅ |
| 4 | A/B Testing Prompts & Configs ✅ |
| 5 | **Multi-Region & High Availability ✅** |
| 6 | Building an Internal Agent Platform |

---

*Series: AI Agents trong Production. Day 5: Kiến trúc multi-region với region-aware routing, global state replication, cache warmup, và automatic failover.*
