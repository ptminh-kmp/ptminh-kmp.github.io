---
title: "AWS for AI/Agent Developers — Day 4: Serverless Agent with Lambda + Bedrock"
description: "Build a complete agent without managing a single server. Lambda orchestrates Bedrock calls, tools, and state. API Gateway provides HTTP + WebSocket endpoints."
published: 2026-06-29
pubDate: 2026-06-29T02:00:00.000Z
slug: aws-for-ai-agent-developers-lambda-bedrock-serverless-agent
tags:
  - aws
  - lambda
  - bedrock
  - serverless
  - api-gateway
  - step-functions
  - agent-architecture
category: aws
lang: en
series:
  name: "AWS for AI/Agent Developers"
  order: 4
  total: 6
---

Days 1-3 used containers (ECS Fargate). Today we go serverless.

Lambda is a natural fit for AI agents: invoke it on demand, it runs your logic, and you pay only for the milliseconds you use. No container to manage, no cluster to scale, no cold-start worry when agents query infrequently.

We build a serverless agent that:
- Receives prompts via API Gateway (HTTP + WebSocket)
- Calls Bedrock for LLM reasoning
- Executes custom tools (GitHub, search, whatever)
- Stores session state in DynamoDB (from Day 2)
- Uses semantic cache from ElastiCache (from Day 3)
- Orchestrates multi-step workflows via Step Functions

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Client      │────▶│  API Gateway │────▶│  Lambda      │
│  (Agent      │     │              │     │  (Agent      │
│   Runtime)   │     │  HTTP + WS   │     │   Handler)   │
│              │     │              │     │              │
│  Prompts     │     │  Auth: IAM   │     │  Tools       │
│  SSE Stream  │     │  + JWT       │     │  Bedrock     │
│              │     │              │     │  State       │
└──────────────┘     └──────────────┘     └──────┬───────┘
                                                  │
                                    ┌─────────────┴─────────────┐
                                    │                           │
                              ┌─────▼─────┐             ┌───────▼───────┐
                              │ DynamoDB  │             │  Bedrock      │
                              │ (Session) │             │  (LLM)        │
                              └───────────┘             └───────────────┘
```

---

## Step 1: Lambda Agent Handler

### `src/handler.ts`

```typescript
// src/handler.ts — Lambda handler for serverless agent

import { BedrockRuntimeClient, ConverseCommand } from "@aws-sdk/client-bedrock-runtime";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import { createClient } from "redis";

const bedrock = new BedrockRuntimeClient({ region: process.env.AWS_REGION });
const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const redis = createClient({ url: process.env.REDIS_URL });

// Warm-start: connect Redis once
let redisConnected = false;

export const handler = async (event: any) => {
  // Parse the incoming request
  const body = typeof event.body === "string" ? JSON.parse(event.body) : event.body;
  const { prompt, sessionId, config } = body;

  if (!prompt) {
    return respond(400, { error: "Missing 'prompt' in request body" });
  }

  const sessionKey = sessionId || `session:${Date.now()}:${Math.random().toString(36).slice(2, 10)}`;

  try {
    // 1. Try semantic cache
    const cached = await checkCache(prompt);
    if (cached) {
      return respond(200, {
        response: cached,
        sessionId: sessionKey,
        cached: true,
      });
    }

    // 2. Load session from DynamoDB
    const session = await loadSession(sessionKey);

    // 3. Call Bedrock
    const llmResponse = await callBedrock(prompt, session.context);

    // 4. Tool execution (if LLM requests tools)
    const toolResults = await executeTools(llmResponse.toolCalls);

    // 5. Final response
    const finalResponse = toolResults.length > 0
      ? await callBedrockWithTools(prompt, llmResponse.text, toolResults)
      : { text: llmResponse.text };

    // 6. Save session
    await saveSession(sessionKey, {
      context: [...(session?.context || []), { role: "user", content: prompt }, { role: "assistant", content: finalResponse.text }],
      lastActive: Date.now(),
    });

    return respond(200, {
      response: finalResponse.text,
      sessionId: sessionKey,
      cached: false,
    });
  } catch (error: any) {
    console.error("Agent error:", error);
    return respond(500, {
      error: "Internal agent error",
      detail: process.env.DEBUG ? error.message : undefined,
    });
  }
};

// ──── Helpers ────

async function callBedrock(prompt: string, context?: any[]) {
  const messages = [
    ...(context || []).map((m: any) => ({
      role: m.role,
      content: [{ text: m.content }],
    })),
    { role: "user", content: [{ text: prompt }] },
  ];

  const command = new ConverseCommand({
    modelId: process.env.MODEL_ID || "anthropic.claude-3-5-sonnet-20241022-v2:0",
    messages,
    inferenceConfig: { maxTokens: 4096 },
    toolConfig: {
      tools: agentTools,
    },
  });

  const result = await bedrock.send(command);
  const response = result.output?.message;

  return {
    text: response?.content?.find((c: any) => c.text)?.text || "",
    toolCalls: response?.content?.filter((c: any) => c.toolUse) || [],
  };
}

async function callBedrockWithTools(prompt: string, llmText: string, toolResults: any[]) {
  const messages = [
    { role: "user", content: [{ text: prompt }] },
    { role: "assistant", content: [{ text: llmText }] },
    {
      role: "user",
      content: toolResults.map((r: any) => ({
        toolResult: {
          toolUseId: r.toolUseId,
          content: [{ text: JSON.stringify(r.result) }],
        },
      })),
    },
  ];

  const result = await bedrock.send(new ConverseCommand({
    modelId: process.env.MODEL_ID || "anthropic.claude-3-5-sonnet-20241022-v2:0",
    messages,
    inferenceConfig: { maxTokens: 4096 },
  }));

  return {
    text: result.output?.message?.content?.find((c: any) => c.text)?.text || "",
  };
}

const agentTools = [
  {
    toolSpec: {
      name: "github_list_issues",
      description: "List issues from a GitHub repository",
      inputSchema: {
        json: {
          type: "object",
          properties: {
            owner: { type: "string", description: "Repository owner" },
            repo: { type: "string", description: "Repository name" },
            state: { type: "string", enum: ["open", "closed", "all"], description: "Issue state" },
          },
          required: ["owner", "repo"],
        },
      },
    },
  },
  // Add more tools here
];

async function executeTools(toolCalls: any[]): Promise<any[]> {
  if (!toolCalls.length) return [];

  return Promise.all(toolCalls.map(async (call: any) => {
    const { name, input } = call.toolUse;

    switch (name) {
      case "github_list_issues":
        return {
          toolUseId: call.toolUse.toolUseId,
          result: await listGitHubIssues(input.owner, input.repo, input.state),
        };
      default:
        return {
          toolUseId: call.toolUse.toolUseId,
          result: { error: `Unknown tool: ${name}` },
        };
    }
  }));
}

async function listGitHubIssues(owner: string, repo: string, state?: string): Promise<any> {
  const token = process.env.GITHUB_TOKEN;
  const url = `https://api.github.com/repos/${owner}/${repo}/issues?state=${state || "open"}&per_page=5`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "serverless-agent",
    },
  });

  if (!response.ok) {
    return { error: `GitHub API error: ${response.status}` };
  }

  const issues = await response.json();
  return issues.map((i: any) => ({
    number: i.number,
    title: i.title,
    state: i.state,
    url: i.html_url,
  }));
}

async function checkCache(prompt: string): Promise<string | null> {
  if (shouldBypassCache(prompt)) return null;

  if (!redisConnected) {
    await redis.connect();
    redisConnected = true;
  }

  // Simplified cache check — see Day 3 for full semantic cache
  const cached = await redis.get(`exact:${simpleHash(prompt)}`);
  return cached;
}

async function loadSession(sessionId: string): Promise<any> {
  const result = await dynamo.send(new GetCommand({
    TableName: process.env.SESSION_TABLE || "agent-sessions",
    Key: { pk: `session#${sessionId}`, sk: "meta" },
  }));
  return result.Item?.data || null;
}

async function saveSession(sessionId: string, data: any): Promise<void> {
  await dynamo.send(new PutCommand({
    TableName: process.env.SESSION_TABLE || "agent-sessions",
    Item: {
      pk: `session#${sessionId}`,
      sk: "meta",
      data,
      ttl: Math.floor(Date.now() / 1000) + 3600,
    },
  }));
}

function shouldBypassCache(prompt: string): boolean {
  const writeKeywords = ["send", "create", "delete", "update", "write", "schedule"];
  return writeKeywords.some(k => prompt.toLowerCase().startsWith(k));
}

function simpleHash(s: string): string {
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    const char = s.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(16);
}

function respond(status: number, body: any) {
  return {
    statusCode: status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
    body: JSON.stringify(body),
  };
}
```

---

## Step 2: Deploy with SAM

### `template.yaml`

```yaml
AWSTemplateFormatVersion: '2010-09-09'
Transform: AWS::Serverless-2016-10-31

Parameters:
  ModelId:
    Type: String
    Default: anthropic.claude-3-5-sonnet-20241022-v2:0
  GitHubToken:
    Type: String
    NoEcho: true
  RedisUrl:
    Type: String
  SessionTable:
    Type: String
    Default: agent-sessions

Globals:
  Function:
    Runtime: nodejs20.x
    Timeout: 30          # Lambda max for Bedrock calls
    MemorySize: 512
    Environment:
      Variables:
        MODEL_ID: !Ref ModelId
        GITHUB_TOKEN: !Ref GitHubToken
        REDIS_URL: !Ref RedisUrl
        SESSION_TABLE: !Ref SessionTable
    Policies:
      - Statement:
          - Effect: Allow
            Action:
              - bedrock:Converse
              - bedrock:InvokeModel
            Resource: "*"
          - Effect: Allow
            Action:
              - dynamodb:GetItem
              - dynamodb:PutItem
            Resource: !Sub "arn:aws:dynamodb:${AWS::Region}:${AWS::AccountId}:table/${SessionTable}"
          - Effect: Allow
            Action:
              - ec2:CreateNetworkInterface
              - ec2:DescribeNetworkInterfaces
              - ec2:DeleteNetworkInterface
            Resource: "*"  # Lambda VPC access for Redis

Resources:
  # ── Lambda Function ──
  AgentFunction:
    Type: AWS::Serverless::Function
    Properties:
      CodeUri: ./dist
      Handler: handler.handler
      Events:
        ApiEvent:
          Type: Api
          Properties:
            Path: /agent
            Method: POST
            RestApiId: !Ref AgentApi
        WebSocketEvent:
          Type: WebSocket
          Properties:
            Route: $default
            RouteResponseEnabled: true
            WebSocketApiId: !Ref AgentWebSocket

  # ── API Gateway REST ──
  AgentApi:
    Type: AWS::Serverless::Api
    Properties:
      StageName: prod
      OpenApiVersion: '3.0.3'
      Auth:
        DefaultAuthorizer: AWS_IAM
      EndpointConfiguration:
        Type: REGIONAL

  # ── API Gateway WebSocket ──
  AgentWebSocket:
    Type: AWS::Serverless::SimpleTable
    Properties:
      PrimaryKey:
        Name: connectionId
        Type: String

FunctionUrl:
    Type: AWS::Serverless::Function
    Properties:
      FunctionName: !Ref AgentFunction
      AutoPublishAlias: live
      Qualifier: live

Outputs:
  ApiEndpoint:
    Description: "HTTP API endpoint"
    Value: !Sub "https://${AgentApi}.execute-api.${AWS::Region}.amazonaws.com/prod/agent"
  WebSocketEndpoint:
    Description: "WebSocket endpoint"
    Value: !Sub "wss://${AgentWebSocket}.execute-api.${AWS::Region}.amazonaws.com/prod"
  FunctionUrl:
    Value: !GetAtt AgentFunctionUrl.FunctionUrl
```

### Deploy:

```bash
sam build

sam deploy \
  --stack-name serverless-agent \
  --capabilities CAPABILITY_IAM \
  --parameter-overrides \
    GitHubToken=ghp_your_token_here \
    RedisUrl=redis://llm-semantic-cache.xxxxx.ng.0001.use1.cache.amazonaws.com:6379

# Get endpoint
aws cloudformation describe-stacks --stack-name serverless-agent \
  --query 'Stacks[0].Outputs[?OutputKey==`ApiEndpoint`].OutputValue' --output text
```

---

## Step 3: WebSocket for Real-Time Agent Responses

For long-running agent workflows, HTTP request/response (30s Lambda timeout) isn't enough. WebSocket keeps the connection open so the agent can stream responses.

### Lambda handler for WebSocket:

```typescript
export const wsHandler = async (event: any) => {
  const connectionId = event.requestContext.connectionId;
  const domain = event.requestContext.domainName;
  const stage = event.requestContext.stage;
  const callbackUrl = `https://${domain}/${stage}`;

  if (event.requestContext.routeKey === "$connect") {
    // Store connection
    await dynamo.send(new PutCommand({
      TableName: "agent-connections",
      Item: { connectionId, connectedAt: Date.now(), ttl: Math.floor(Date.now() / 1000) + 7200 },
    }));
    return { statusCode: 200 };
  }

  if (event.requestContext.routeKey === "$disconnect") {
    await dynamo.send(new DeleteCommand({
      TableName: "agent-connections",
      Key: { connectionId },
    }));
    return { statusCode: 200 };
  }

  // Handle message
  const body = JSON.parse(event.body);
  const { prompt, sessionId } = body;

  // Process asynchronously — send results back via WebSocket
  processAgentQuery(prompt, sessionId, connectionId, callbackUrl).catch(console.error);

  return { statusCode: 202 };  // Accepted — stream in progress
};
```

This pairs nicely with Step Functions for complex multi-step agents.

---

## Step 4: Multi-Step Workflows with Step Functions

For agents that need multiple LLM calls (research → plan → execute → summarize), use Step Functions.

```json
{
  "Comment": "Multi-step agent workflow",
  "StartAt": "Analyze Request",
  "States": {
    "Analyze Request": {
      "Type": "Task",
      "Resource": "arn:aws:states:::sdk:bedrockruntime:converse",
      "Parameters": {
        "ModelId": "anthropic.claude-3-5-sonnet-20241022-v2:0",
        "Messages": [{
          "Role": "user",
          "Content": [{
            "Text.$": "Analyze this request and list the steps needed: $$.Execution.Input.prompt"
          }]
        }]
      },
      "Next": "Execute Steps (Map)"
    },
    "Execute Steps (Map)": {
      "Type": "Map",
      "ItemProcessor": {
        "ProcessorConfig": { "Mode": "INLINE" },
        "StartAt": "Execute Single Step",
        "States": {
          "Execute Single Step": {
            "Type": "Task",
            "Resource": "arn:aws:lambda:us-east-1:ACCOUNT:function:tool-executor",
            "Parameters": {
              "Step.$": "$$.Map.Item.Value"
            },
            "End": true
          }
        }
      },
      "Next": "Summarize Results"
    },
    "Summarize Results": {
      "Type": "Task",
      "Resource": "arn:aws:states:::sdk:bedrockruntime:converse",
      "Parameters": {
        "ModelId": "anthropic.claude-3-5-sonnet-20241022-v2:0",
        "Messages": [{
          "Role": "user",
          "Content": [{
            "Text.$": "Summarize these results for the user: $$.Execution.Input.results"
          }]
        }]
      },
      "End": true
    }
  }
}
```

---

## Step 5: Invoking the Agent

```bash
# HTTP
curl -X POST https://<api-id>.execute-api.us-east-1.amazonaws.com/prod/agent \
  -H "Content-Type: application/json" \
  -d '{"prompt": "List open issues in ptminh-kmp/ptminh-kmp.github.io", "sessionId": "demo-001"}'

# WebSocket (requires wscat)
wscat -c wss://<ws-api-id>.execute-api.us-east-1.amazonaws.com/prod
> {"action": "message", "prompt": "List open issues", "sessionId": "demo-001"}
< {"type": "response", "content": "Found 3 open issues: ..."}

# Lambda Function URL (direct)
curl -X POST https://<function-url>.lambda-url.us-east-1.on.aws/ \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Hello agent", "sessionId": "demo-002"}'
```

---

## Step 6: Cost Estimation

| Component | Cost |
|-----------|------|
| Lambda (500K invocations, 512MB, 5s avg) | ~$25 |
| API Gateway (1M requests + WebSocket) | ~$5 |
| Bedrock (Sonnet, 300K calls after cache) | ~$1,350 |
| DynamoDB (on-demand) | ~$15 |
| ElastiCache (Redis) | ~$30 |
| Step Functions (100K state transitions) | ~$10 |
| **Total** | **~$1,435/mo** |

vs ECS Fargate equivalent (from Day 1): ~$69/mo compute + ~$1,350 Bedrock = ~$1,419/mo. They're comparable. Choose Lambda if your agent traffic is bursty or unpredictable, choose ECS if you have steady constant traffic.

---

## Summary

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Compute | Lambda (Node.js 20) | Serverless agent execution |
| API | API Gateway REST + WebSocket | Client-facing endpoints |
| Orchestration | Step Functions | Multi-step agent workflows |
| LLM | Bedrock (Claude Sonnet) | AI reasoning |
| State | DynamoDB | Sessions, connections |
| Cache | ElastiCache Redis | LLM response cache |

### Checklist:

- [ ] Lambda handler with Bedrock integration
- [ ] Tool execution (GitHub issues example)
- [ ] SAM template with API Gateway + Lambda
- [ ] WebSocket handler for real-time streaming
- [ ] Step Functions workflow for multi-step agents
- [ ] CORS configured on API Gateway
- [ ] IAM permissions for Bedrock + DynamoDB + Redis
- [ ] Lambda timeout tuned for Bedrock calls (30s+)
- [ ] VPC configuration for Redis access

---

| Day | Topic |
|-----|-------|
| 1 | Deploy MCP Server on ECS Fargate ✅ |
| 2 | Agent State with DynamoDB Global Tables ✅ |
| 3 | LLM Caching with ElastiCache + Bedrock ✅ |
| 4 | **Serverless Agent with Lambda + Bedrock ✅** |
| 5 | Multi-Region Agent Routing with Route53 |
| 6 | CI/CD for AI Agents with CodePipeline |

---

*Series: AWS for AI/Agent Developers. Day 4: Serverless agents — Lambda + Bedrock + API Gateway + WebSocket + Step Functions. Full SAM template included.*
