---
title: "AWS cho AI/Agent Developers — Day 2: Agent State với DynamoDB Global Tables"
description: "Agent cần bộ nhớ. Lưu conversation history, session state, tool results trong DynamoDB. Thêm Global Tables cho multi-region replication và DAX cho hot reads."
published: 2026-06-27
pubDate: 2026-06-27T02:00:00.000Z
slug: aws-for-ai-agent-developers-dynamodb-agent-state-vi
tags:
  - aws
  - dynamodb
  - agent-state
  - session-management
  - multi-region
  - serverless
  - typescript
category: aws
lang: vi
series:
  name: "AWS for AI/Agent Developers"
  order: 2
  total: 6
---

Day 1 deploy MCP server lên AWS. Hôm nay cho nó bộ nhớ.

Agent là stateful. Mỗi tool call, mỗi LLM response đều dựa trên cái trước đó. Không có persistent state → agent quên hết khi container restart hoặc region failover.

DynamoDB là state store lý tưởng cho agents:
- **Latency vài ms** — đủ nhanh cho real-time
- **Managed scaling** — chịu được burst traffic
- **Global Tables** — multi-region replication
- **TTL** — tự động xoá session cũ
- **DAX** — in-memory cache cho hot sessions

---

## Kiến trúc

```
Agent Runtime ─▶ DynamoAgentState Service ─▶ DynamoDB
                                                  │
                                          ┌───────┴───────┐
                                          │ Session Table │
                                          │ Tool Cache    │
                                          │ User Prefs    │
                                          └───────────────┘
                                                  │
                                          Global Tables
                                      us-east-1 ←→ eu-west-1
                                                  │
                                          DAX (optional)
                                      In-memory cache
```

---

## Step 1: Tạo DynamoDB Tables

### Session table

```bash
aws dynamodb create-table \
  --table-name agent-sessions \
  --attribute-definitions AttributeName=pk,AttributeType=S AttributeName=sk,AttributeType=S \
  --key-schema AttributeName=pk,KeyType=HASH AttributeName=sk,KeyType=RANGE \
  --billing-mode PAY_PER_REQUEST

aws dynamodb update-time-to-live \
  --table-name agent-sessions \
  --time-to-live-specification Enabled=true,AttributeName=ttl
```

**Key design:**
- `pk = session#<id>` — partition key
- `sk = meta | msg#<timestamp>` — sort key: meta cho session info, msg# cho từng message
- `version` — monotonic, conflict resolution
- `ttl` — DynamoDB TTL (1 hour)

### Tool cache table

```bash
aws dynamodb create-table \
  --table-name agent-tool-cache \
  --attribute-definitions AttributeName=pk,AttributeType=S \
  --key-schema AttributeName=pk,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST
```

---

## Step 2: State Service

### `src/state/dynamo-state.ts`

```typescript
export class DynamoAgentState {
  private docClient: DynamoDBDocumentClient;

  // Lưu session với version-wins conflict resolution
  async saveSession(session: AgentSession): Promise<void> {
    await this.docClient.send(new PutCommand({
      TableName: "agent-sessions",
      Item: {
        pk: `session#${session.sessionId}`, sk: "meta",
        data: { conversation: session.conversation.slice(-50), state: session.state },
        version: session.version,
        ttl: Math.floor(Date.now()/1000) + 3600,
      },
      // Chỉ ghi nếu version mới hơn
      ConditionExpression: "attribute_not_exists(version) OR version < :v",
      ExpressionAttributeValues: { ":v": session.version },
    }));
  }

  // Load session với strong consistency
  async loadSession(sessionId: string): Promise<AgentSession | null> {
    const result = await this.docClient.send(new GetCommand({
      TableName: "agent-sessions",
      Key: { pk: `session#${sessionId}`, sk: "meta" },
      ConsistentRead: true,
    }));
    return result.Item ? this.hydrate(sessionId, result.Item) : null;
  }

  // Append message — không rewrite cả conversation
  async appendMessage(sessionId: string, msg: Message): Promise<void> {
    await this.docClient.send(new PutCommand({
      TableName: "agent-sessions",
      Item: {
        pk: `session#${sessionId}`,
        sk: `msg#${String(msg.timestamp).padStart(14, "0")}`,
        role: msg.role, content: msg.content, timestamp: msg.timestamp, ttl: Math.floor(Date.now()/1000) + 3600,
      },
    }));
  }

  // Tool cache
  async cacheToolResult(tool: string, params: any, result: any, ttlMs: number): Promise<void> {
    await this.docClient.send(new PutCommand({
      TableName: "agent-tool-cache",
      Item: { pk: `tool#${tool}#${this.hash(params)}`, result, cachedAt: Date.now(), hitCount: 0, ttl: Math.floor((Date.now()+ttlMs)/1000) },
    }));
  }

  private hash(params: any): string {
    return require("crypto").createHash("sha256").update(JSON.stringify(params)).digest("hex").slice(0, 16);
  }
}
```

**Tại sao append message riêng?** Không cần đọc-write cả conversation mỗi lần agent nói. DynamoDB items riêng lẻ → update nhẹ hơn, cost thấp hơn.

---

## Step 3: DAX — Cache Cho Hot Sessions

DynamoDB vài ms. DAX microsecond. Quan trọng khi session được đọc nhiều lần trong cùng một tương tác.

```bash
aws dax create-cluster \
  --cluster-name agent-state-dax \
  --node-type dax.r5.large \
  --replication-factor 2
```

DAX đắt (~$200/tháng). Chỉ dùng khi >1000 reads/second. Bắt đầu không có DAX cũng được.

---

## Step 4: Global Tables — Multi-Region

Session phải sống sót qua region failover (AI Agents in Production Day 5).

```bash
aws dynamodb update-table --table-name agent-sessions \
  --replica-updates RegionName=eu-west-1 RegionName=ap-southeast-1
```

**Multi-master:** đọc ghi từ region nào cũng được. Conflict resolution: last-writer-wins. Works well với version-wins của chúng ta.

---

## Step 5: Integration

```typescript
const state = new DynamoAgentState({ region: "us-east-1" });

server.tool("list_issues", {}, async (args) => {
  let session = await state.loadSession(args.sessionId);
  if (!session) session = createNewSession(args.sessionId);

  const result = await callGitHubAPI(args);
  session.version++;
  session.conversation.push({ role: "tool", content: JSON.stringify(result), timestamp: Date.now() });

  await state.saveSession(session);     // Checkpoint
  await state.cacheToolResult("list_issues", args, result, 60_000);  // Cache

  return { content: [{ type: "text", text: JSON.stringify(result) }] };
});
```

---

## Chi phí

| Component | Monthly |
|-----------|---------|
| DynamoDB sessions (on-demand) | ~$15-30 |
| DynamoDB tool cache | ~$8-15 |
| Global Tables (3 regions) | ~$20-40 |
| DAX (2 nodes) | ~$200 |
| **Không DAX** | **~$45-85/tháng** |

---

## Checklist

- [ ] Session table với pk/sk + TTL
- [ ] Tool cache table với TTL
- [ ] Version-wins conflict resolution
- [ ] Message appending (không full rewrite)
- [ ] Global Tables cho multi-region
- [ ] Admin endpoints cho debugging
- [ ] Monitor cost — DAX chỉ khi cần

---

| Day | Chủ đề |
|-----|--------|
| 1 | Deploy MCP Server lên ECS Fargate ✅ |
| 2 | **Agent State với DynamoDB Global Tables ✅** |
| 3 | LLM Caching với ElastiCache + Bedrock |
| 4 | Serverless Agent với Lambda + Bedrock |
| 5 | Multi-Region Agent Routing với Route53 |
| 6 | CI/CD cho AI Agents với CodePipeline |

---

*Series: AWS cho AI/Agent Developers. Day 2: Agent state management với DynamoDB — sessions, tool cache, Global Tables, DAX.*
