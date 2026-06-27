---
title: "AWS for AI/Agent Developers — Day 2: Agent State with DynamoDB Global Tables"
description: "Agents are stateful. Store conversation history, session state, and tool results in DynamoDB. Add Global Tables for multi-region replication and DAX for caching."
published: 2026-06-27
pubDate: 2026-06-27T02:00:00.000Z
slug: aws-for-ai-agent-developers-dynamodb-agent-state
tags:
  - aws
  - dynamodb
  - agent-state
  - session-management
  - multi-region
  - serverless
  - typescript
category: aws
lang: en
series:
  name: "AWS for AI/Agent Developers"
  order: 2
  total: 6
---

Day 1 deployed the MCP server. Now we give it a memory.

Agents are fundamentally stateful. Every tool call, every LLM response, every decision builds on what came before. Without persistent state, your agent forgets everything when a container restarts or a region fails over.

DynamoDB is the perfect state store for agents:
- **Single-digit millisecond latency** — fast enough for real-time agent sessions
- **Managed scaling** — handles burst traffic from popular agents
- **Global Tables** — multi-region replication with last-writer-wins conflict resolution
- **TTL** — automatically expire stale sessions
- **DAX** — in-memory cache for hot session data

Today we build the state layer from the AI Agents in Production series (Day 5) but with real DynamoDB instead of an in-memory mock:

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Agent      │────▶│  Agent       │────▶│  DynamoDB    │
│   Runtime    │     │  State       │     │              │
│              │     │  Service     │     │  ┌────────┐  │
│  Tool Call   │     │              │     │  │ Session│  │
│  LLM Request │     │  Read/Write  │     │  │ Table  │  │
│  Session     │     │  with TTL    │     │  └────────┘  │
│  Checkpoint  │     │  Versioning  │     │  ┌────────┐  │
└──────────────┘     └──────────────┘     │  │ Tools  │  │
                                          │  │ Cache  │  │
                                          │  └────────┘  │
                                          └──────────────┘
```

---

## What We're Storing

An agent needs three types of state:

| Data | Table | Key | TTL | Example |
|------|-------|-----|-----|---------|
| **Session** | `agent-sessions` | `session#<id>` | 1 hour | Conversation history, agent state |
| **Tool cache** | `agent-tool-cache` | `tool#<name>#<hash>` | 5-60 min | Tool results (from Day 2 of AI Agents series) |
| **User preferences** | `agent-user-preferences` | `user#<id>#<agent>` | 7 days | Per-user agent settings |

---

## Step 1: Create the DynamoDB Tables

### Session table — the main state store

```bash
# Session table with Global Tables support
aws dynamodb create-table \
  --table-name agent-sessions \
  --attribute-definitions \
    AttributeName=pk,AttributeType=S \
    AttributeName=sk,AttributeType=S \
  --key-schema \
    AttributeName=pk,KeyType=HASH \
    AttributeName=sk,KeyType=RANGE \
  --billing-mode PAY_PER_REQUEST \
  --tags Key=Environment,Key=production

# Enable TTL (auto-delete after 1 hour)
aws dynamodb update-time-to-live \
  --table-name agent-sessions \
  --time-to-live-specification Enabled=true,AttributeName=ttl
```

**Key design:**

| Attribute | Type | Example | Purpose |
|-----------|------|---------|---------|
| `pk` | String | `session#abc123` | Partition key — session identifier |
| `sk` | String | `meta` | Sort key — `meta`, `msg#001`, `msg#002` |
| `data` | Map | — | Session data blob |
| `version` | Number | 42 | Monotonic for conflict resolution |
| `ttl` | Number | 1719427200 | DynamoDB TTL (epoch seconds) |
| `lastActiveRegion` | String | `us-east-1` | Track active region |

### Tool cache table

```bash
aws dynamodb create-table \
  --table-name agent-tool-cache \
  --attribute-definitions AttributeName=pk,AttributeType=S \
  --key-schema AttributeName=pk,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST

aws dynamodb update-time-to-live \
  --table-name agent-tool-cache \
  --time-to-live-specification Enabled=true,AttributeName=ttl
```

---

## Step 2: Agent State Service with DynamoDB

### `src/state/dynamo-state.ts`

```typescript
// src/state/dynamo-state.ts — Agent state store backed by DynamoDB

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
  DeleteCommand,
  BatchWriteCommand,
} from "@aws-sdk/lib-dynamodb";

export interface AgentSession {
  sessionId: string;
  conversation: Array<{
    role: "user" | "assistant" | "tool";
    content: string;
    timestamp: number;
    metadata?: Record<string, unknown>;
  }>;
  state: Record<string, unknown>;
  version: number;
  lastToolCall: string | null;
  lastActiveRegion: string;
  lastActiveAt: number;
}

export interface ToolCacheEntry {
  toolName: string;
  paramsHash: string;
  result: unknown;
  cachedAt: number;
  expiresAt: number;
  hitCount: number;
}

export class DynamoAgentState {
  private docClient: DynamoDBDocumentClient;
  private sessionTable: string;
  private cacheTable: string;

  constructor(options: {
    region: string;
    sessionTable?: string;
    cacheTable?: string;
  }) {
    const client = new DynamoDBClient({ region: options.region });
    this.docClient = DynamoDBDocumentClient.from(client);
    this.sessionTable = options.sessionTable || "agent-sessions";
    this.cacheTable = options.cacheTable || "agent-tool-cache";
  }

  // ──── Session Operations ────

  /**
   * Save or update a session checkpoint.
   * Uses conditional write for version-wins conflict resolution.
   */
  async saveSession(session: AgentSession): Promise<void> {
    const ttl = Math.floor(Date.now() / 1000) + 3600; // 1 hour TTL

    const item = {
      pk: `session#${session.sessionId}`,
      sk: "meta",
      data: {
        conversation: session.conversation.slice(-50), // Keep last 50 messages
        state: session.state,
      },
      version: session.version,
      lastToolCall: session.lastToolCall,
      lastActiveRegion: session.lastActiveRegion,
      lastActiveAt: session.lastActiveAt,
      ttl,
    };

    await this.docClient.send(new PutCommand({
      TableName: this.sessionTable,
      Item: item,
      // Only write if version is higher (prevent stale writes)
      ConditionExpression: "attribute_not_exists(version) OR version < :newVersion",
      ExpressionAttributeValues: {
        ":newVersion": session.version,
      },
    }));
  }

  /**
   * Load a session from DynamoDB.
   */
  async loadSession(sessionId: string): Promise<AgentSession | null> {
    const result = await this.docClient.send(new GetCommand({
      TableName: this.sessionTable,
      Key: {
        pk: `session#${sessionId}`,
        sk: "meta",
      },
      ConsistentRead: true, // Strong consistency for session reads
    }));

    if (!result.Item) return null;

    return this.hydrateSession(sessionId, result.Item);
  }

  /**
   * Append a single message to a session.
   * More efficient than rewriting the entire conversation.
   */
  async appendMessage(
    sessionId: string,
    message: AgentSession["conversation"][0]
  ): Promise<void> {
    const msgId = `msg#${String(message.timestamp).padStart(14, "0")}`;
    const ttl = Math.floor(Date.now() / 1000) + 3600;

    await this.docClient.send(new PutCommand({
      TableName: this.sessionTable,
      Item: {
        pk: `session#${sessionId}`,
        sk: msgId,
        role: message.role,
        content: message.content,
        timestamp: message.timestamp,
        metadata: message.metadata,
        ttl,
      },
    }));
  }

  /**
   * Load full conversation (meta + all messages).
   */
  async loadConversation(sessionId: string): Promise<AgentSession["conversation"]> {
    const result = await this.docClient.send(new QueryCommand({
      TableName: this.sessionTable,
      KeyConditionExpression: "pk = :pk",
      ExpressionAttributeValues: {
        ":pk": `session#${sessionId}`,
      },
      ConsistentRead: true,
    }));

    if (!result.Items || result.Items.length === 0) return [];

    // Sort messages by timestamp and extract conversation
    const messages = result.Items
      .filter(item => item.sk !== "meta")
      .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0))
      .map(item => ({
        role: item.role as "user" | "assistant" | "tool",
        content: item.content as string,
        timestamp: item.timestamp as number,
        metadata: item.metadata as Record<string, unknown> | undefined,
      }));

    return messages;
  }

  /**
   * Delete a session (cleanup on session end).
   */
  async deleteSession(sessionId: string): Promise<void> {
    // Get all items for this session
    const items = await this.docClient.send(new QueryCommand({
      TableName: this.sessionTable,
      KeyConditionExpression: "pk = :pk",
      ExpressionAttributeValues: { ":pk": `session#${sessionId}` },
    }));

    if (!items.Items || items.Items.length === 0) return;

    // Batch delete all items
    const deleteRequests = items.Items.map(item => ({
      DeleteRequest: {
        Key: { pk: item.pk, sk: item.sk },
      },
    }));

    // Batch in chunks of 25 (DynamoDB limit)
    for (let i = 0; i < deleteRequests.length; i += 25) {
      await this.docClient.send(new BatchWriteCommand({
        RequestItems: {
          [this.sessionTable]: deleteRequests.slice(i, i + 25),
        },
      }));
    }
  }

  // ──── Tool Cache Operations ────

  /**
   * Store a tool result in the cache table.
   */
  async cacheToolResult(
    toolName: string,
    params: Record<string, unknown>,
    result: unknown,
    ttlMs: number
  ): Promise<void> {
    const paramsHash = this.hashParams(params);
    const now = Date.now();
    const ttl = Math.floor((now + ttlMs) / 1000);

    await this.docClient.send(new PutCommand({
      TableName: this.cacheTable,
      Item: {
        pk: `tool#${toolName}#${paramsHash}`,
        result: typeof result === "string" ? result : JSON.stringify(result),
        cachedAt: now,
        expiresAt: now + ttlMs,
        hitCount: 0,
        ttl,
      },
    }));
  }

  /**
   * Get a cached tool result.
   */
  async getCachedToolResult<T>(
    toolName: string,
    params: Record<string, unknown>
  ): Promise<{ result: T; hitCount: number } | null> {
    const paramsHash = this.hashParams(params);

    const result = await this.docClient.send(new GetCommand({
      TableName: this.cacheTable,
      Key: { pk: `tool#${toolName}#${paramsHash}` },
    }));

    if (!result.Item) return null;

    // Update hit count (fire and forget)
    this.incrementCacheHit(toolName, paramsHash).catch(() => {});

    return {
      result: typeof result.Item.result === "string"
        ? JSON.parse(result.Item.result)
        : result.Item.result as T,
      hitCount: (result.Item.hitCount || 0) + 1,
    };
  }

  /**
   * Invalidate cache for a tool pattern.
   */
  async invalidateCache(toolName: string, paramsHash?: string): Promise<void> {
    if (paramsHash) {
      // Delete specific entry
      await this.docClient.send(new DeleteCommand({
        TableName: this.cacheTable,
        Key: { pk: `tool#${toolName}#${paramsHash}` },
      }));
    } else {
      // Query all entries for this tool and delete
      const items = await this.docClient.send(new QueryCommand({
        TableName: this.cacheTable,
        KeyConditionExpression: "begins_with(pk, :prefix)",
        ExpressionAttributeValues: { ":prefix": `tool#${toolName}#` },
      }));

      if (items.Items && items.Items.length > 0) {
        const deletes = items.Items.map(item => ({
          DeleteRequest: { Key: { pk: item.pk } },
        }));
        for (let i = 0; i < deletes.length; i += 25) {
          await this.docClient.send(new BatchWriteCommand({
            RequestItems: { [this.cacheTable]: deletes.slice(i, i + 25) },
          }));
        }
      }
    }
  }

  // ──── Admin / Stats ────

  /**
   * Get table statistics.
   */
  async getStats(): Promise<{
    activeSessions: number;
    cacheEntries: number;
  }> {
    const [sessionInfo, cacheInfo] = await Promise.all([
      this.docClient.send(new GetCommand({
        TableName: this.sessionTable,
        Key: { pk: "stats", sk: "meta" },
      })),
      this.docClient.send(new GetCommand({
        TableName: this.cacheTable,
        Key: { pk: "stats", sk: "meta" },
      })),
    ]);

    return {
      activeSessions: (sessionInfo.Item?.count as number) || 0,
      cacheEntries: (cacheInfo.Item?.count as number) || 0,
    };
  }

  // ──── Private ────

  private hydrateSession(sessionId: string, item: Record<string, any>): AgentSession {
    const data = item.data || {};
    return {
      sessionId,
      conversation: data.conversation || [],
      state: data.state || {},
      version: item.version || 1,
      lastToolCall: item.lastToolCall || null,
      lastActiveRegion: item.lastActiveRegion || "unknown",
      lastActiveAt: item.lastActiveAt || Date.now(),
    };
  }

  private hashParams(params: Record<string, unknown>): string {
    const crypto = require("crypto");
    return crypto
      .createHash("sha256")
      .update(JSON.stringify(params))
      .digest("hex")
      .slice(0, 16);
  }

  private async incrementCacheHit(
    toolName: string,
    paramsHash: string
  ): Promise<void> {
    await this.docClient.send(new PutCommand({
      TableName: this.cacheTable,
      Item: {
        pk: `tool#${toolName}#${paramsHash}`,
        hitCount: 1,
      },
      // Atomic increment using UpdateItem would be better
      // This is a simplified example
    }));
  }
}
```

---

## Step 3: DAX — In-Memory Cache for Hot Sessions

DynamoDB is fast (single-digit ms), but DAX cuts that to microseconds — important for sessions that get read repeatedly during a single agent interaction.

```bash
# Create DAX cluster
aws dax create-cluster \
  --cluster-name agent-state-dax \
  --node-type dax.r5.large \
  --replication-factor 2 \
  --iam-role-arn "arn:aws:iam::<account>:role/dax-service-role" \
  --subnet-group-name <dax-subnet-group> \
  --security-group-ids <dax-sg-id>

# Deploy DAX client endpoint
# DAX endpoint: dax://agent-state-dax.xxxxx.clusters.dax.amazonaws.com
```

### DAX integration:

```typescript
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";

// Standard DynamoDB (for writes and cache misses)
const standardClient = DynamoDBDocumentClient.from(
  new DynamoDBClient({ region: "us-east-1" })
);

// With DAX — install: npm install amazon-dax-client
// import AmazonDaxClient from "amazon-dax-client";
// const daxClient = DynamoDBDocumentClient.from(
//   new AmazonDaxClient({ endpoints: ["agent-state-dax.xxxxx.clusters.dax.amazonaws.com"] })
// );

export class ReadOptimizedState extends DynamoAgentState {
  /**
   * Load session from DAX, fall back to DynamoDB.
   */
  async loadSessionFast(sessionId: string): Promise<AgentSession | null> {
    try {
      // Try DAX first
      // const result = await daxClient.send(...);
      // return result;
      return await this.loadSession(sessionId);
    } catch {
      return await this.loadSession(sessionId);
    }
  }
}
```

---

## Step 4: Enable Global Tables for Multi-Region

From AI Agents in Production Day 5: sessions must survive region failovers.

```bash
# Enable Global Tables on the session table
aws dynamodb update-table \
  --table-name agent-sessions \
  --replica-updates \
    RegionName=eu-west-1 \
    RegionName=ap-southeast-1

# Same for tool cache
aws dynamodb update-table \
  --table-name agent-tool-cache \
  --replica-updates \
    RegionName=eu-west-1 \
    RegionName=ap-southeast-1
```

**How it works:**

```
us-east-1 (primary)
  ├── Replica: eu-west-1       ← reads  + writes
  └── Replica: ap-southeast-1  ← reads  + writes

Write conflict resolution: Last writer wins (based on timestamp)
Read: Strong consistency within region, eventual across regions
Failover: Any replica can become primary — just change client endpoint
```

DynamoDB Global Tables are **multi-master** — you can read and write from any region. Conflict resolution uses last-writer-wins, which works well for our versioned session model.

---

## Step 5: Integration with Agent Runtime

```typescript
// src/agent-with-real-state.ts

import { DynamoAgentState } from "./state/dynamo-state.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import crypto from "crypto";

const currentRegion = process.env.AWS_REGION || "us-east-1";
const state = new DynamoAgentState({
  region: currentRegion,
  sessionTable: "agent-sessions",
  cacheTable: "agent-tool-cache",
});

const server = new McpServer({
  name: "github-issue-manager",
  version: "2.0.0", // Now with state!
});

/**
 * Middleware: load or create session on each request.
 */
server.tool("list_issues", "List issues", {
  sessionId: String,  // Client provides session ID
  owner: String,
  repo: String,
  state: { type: String, optional: true },
}, async (args) => {
  const { sessionId, ...params } = args;

  try {
    // Load session
    let session = await state.loadSession(sessionId);

    if (!session) {
      // New session — create it
      session = {
        sessionId,
        conversation: [],
        state: { created: Date.now() },
        version: 1,
        lastToolCall: null,
        lastActiveRegion: currentRegion,
        lastActiveAt: Date.now(),
      };
    }

    // Add user message to conversation
    const userMsg = {
      role: "user" as const,
      content: `List issues for ${params.owner}/${params.repo} (${params.state || "open"})`,
      timestamp: Date.now(),
    };
    session.conversation.push(userMsg);

    // Execute tool (simulated — replace with real GitHub API call)
    const result = { issues: ["#1 Fix login bug", "#2 Add tests"] };
    session.version++;

    // Add result to conversation
    session.conversation.push({
      role: "tool" as const,
      content: JSON.stringify(result),
      timestamp: Date.now(),
    });

    // Checkpoint to DynamoDB
    await state.saveSession(session);

    // Cache the tool result
    await state.cacheToolResult("list_issues", params, result, 60_000);

    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  } catch (error) {
    return {
      content: [{ type: "text", text: `Error: ${error}` }],
      isError: true,
    };
  }
});

server.tool("check_session", "Check session state", {
  sessionId: String,
}, async (args) => {
  const session = await state.loadSession(args.sessionId);
  return {
    content: [{
      type: "text",
      text: session
        ? `Session found. Version: ${session.version}. Messages: ${session.conversation.length}`
        : "No session found",
    }],
  };
});
```

---

## Step 6: Admin API Endpoints

```typescript
// Express endpoints for state management

// Get session details
app.get("/state/sessions/:id", async (req, res) => {
  const session = await state.loadSession(req.params.id);
  if (!session) return res.status(404).json({ error: "Session not found" });
  res.json({
    sessionId: session.sessionId,
    version: session.version,
    messageCount: session.conversation.length,
    lastActiveRegion: session.lastActiveRegion,
    lastActiveAt: session.lastActiveAt,
  });
});

// Get full conversation
app.get("/state/sessions/:id/conversation", async (req, res) => {
  const conversation = await state.loadConversation(req.params.id);
  res.json(conversation);
});

// Delete session
app.delete("/state/sessions/:id", async (req, res) => {
  await state.deleteSession(req.params.id);
  res.json({ status: "deleted" });
});

// Cache operations
app.delete("/state/cache/:toolName", async (req, res) => {
  await state.invalidateCache(req.params.toolName);
  res.json({ status: "cache-invalidated", tool: req.params.toolName });
});

// Stats
app.get("/state/stats", async (req, res) => {
  const stats = await state.getStats();
  res.json(stats);
});
```

---

## Step 7: Cost Estimation

| Component | Configuration | Monthly cost |
|-----------|--------------|-------------|
| DynamoDB sessions | 10K RCU/WCU on-demand, 1GB | ~$15-30 |
| DynamoDB tool cache | 5K RCU/WCU on-demand, 500MB | ~$8-15 |
| Global Tables (3 regions) | 3× replication write cost | ~$20-40 |
| DAX (2 nodes) | dax.r5.large | ~$200 |
| **Total with DAX** | | **~$250-300/mo** |
| **Total without DAX** | | **~$45-85/mo** |

DAX is expensive. Start without it — DynamoDB's single-digit ms latency is sufficient for most agent workloads. Add DAX when you see >1000 reads/second per session.

---

## Summary

| Concept | Implementation | What it solves |
|---------|---------------|----------------|
| Session storage | `agent-sessions` table with meta + messages | Structured state, not just a blob |
| Version-wins writes | `ConditionExpression` in PutCommand | Prevents stale data in concurrent sessions |
| Tool cache | `agent-tool-cache` table with TTL | Fast reads for repeated tool calls |
| Message appending | Individual items with sort key | Efficient partial updates |
| Multi-region | DynamoDB Global Tables | Session survival across region failover |
| Read optimization | DAX (optional) | Microsecond reads for hot sessions |
| TTL cleanup | DynamoDB TTL at item level | Auto-expire stale sessions, no Lambda needed |

### Checklist:

- [ ] `agent-sessions` table created with pk/sk and TTL
- [ ] `agent-tool-cache` table created with TTL
- [ ] State service integrated with agent runtime
- [ ] Version-wins conflict resolution implemented
- [ ] Message appending uses individual items (not full rewrite)
- [ ] Global Tables enabled for multi-region (if applicable)
- [ ] Admin endpoints exposed for debugging
- [ ] Cost monitored — add DAX only when needed

---

| Day | Topic |
|-----|-------|
| 1 | Deploy MCP Server on ECS Fargate ✅ |
| 2 | **Agent State with DynamoDB Global Tables ✅** |
| 3 | LLM Caching with ElastiCache + Bedrock |
| 4 | Serverless Agent with Lambda + Bedrock |
| 5 | Multi-Region Agent Routing with Route53 |
| 6 | CI/CD for AI Agents with CodePipeline |

---

*Series: AWS for AI/Agent Developers. Day 2: Agent state management with DynamoDB — sessions, tool cache, Global Tables for multi-region replication, and DAX for hot reads. Full TypeScript source code included.*
