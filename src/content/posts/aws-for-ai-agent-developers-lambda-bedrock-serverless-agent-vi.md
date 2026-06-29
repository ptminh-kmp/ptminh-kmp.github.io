---
title: "AWS cho AI/Agent Developers — Day 4: Serverless Agent với Lambda + Bedrock"
description: "Build agent mà không cần quản lý server nào. Lambda gọi Bedrock, execute tools, lưu state. API Gateway cung cấp HTTP + WebSocket endpoints."
published: 2026-06-29
pubDate: 2026-06-29T02:00:00.000Z
slug: aws-for-ai-agent-developers-lambda-bedrock-serverless-agent-vi
tags:
  - aws
  - lambda
  - bedrock
  - serverless
  - api-gateway
  - step-functions
  - agent-architecture
category: aws
lang: vi
series:
  name: "AWS for AI/Agent Developers"
  order: 4
  total: 6
---

Days 1-3 xài container (ECS). Hôm nay serverless.

Lambda là natural fit cho AI agents: invoke khi cần, chạy logic, trả tiền theo ms. Không container, không cluster, không cold-start worry khi agent query không thường xuyên.

Chúng ta build serverless agent:
- Nhận prompt qua API Gateway (HTTP + WebSocket)
- Gọi Bedrock cho LLM reasoning
- Execute tools (GitHub issues, search, ...)
- Lưu session state trong DynamoDB (Day 2)
- Cache với ElastiCache Redis (Day 3)
- Orchestrate multi-step workflows với Step Functions

```
Client ─▶ API Gateway ─▶ Lambda ─┬─▶ Bedrock
                                  ├─▶ DynamoDB (state)
                                  └─▶ Redis (cache)
```

---

## Step 1: Lambda Handler

```typescript
export const handler = async (event: any) => {
  const { prompt, sessionId } = JSON.parse(event.body);

  // 1. Check cache
  const cached = await redis.get(`exact:${hash(prompt)}`);
  if (cached) return respond(200, { response: cached, cached: true });

  // 2. Load session từ DynamoDB
  const session = await loadSession(sessionId);

  // 3. Call Bedrock
  const llm = await callBedrock(prompt, session?.context);

  // 4. Execute tools (nếu LLM yêu cầu)
  const toolResults = await executeTools(llm.toolCalls);

  // 5. Final response sau tools
  const final = toolResults.length
    ? await callBedrockWithTools(prompt, llm.text, toolResults)
    : { text: llm.text };

  // 6. Save session
  await saveSession(sessionId, {
    context: [...context, {role:"user",content:prompt}, {role:"assistant",content:final.text}],
  });

  return respond(200, { response: final.text, sessionId, cached: false });
};
```

**Agent tools** được define bằng Bedrock tool config:

```typescript
const tools = [{
  toolSpec: {
    name: "github_list_issues",
    description: "List issues từ GitHub repository",
    inputSchema: { json: { type: "object", properties: { owner: {type:"string"}, repo: {type:"string"} }, required: ["owner","repo"] } },
  },
}];
```

---

## Step 2: Deploy với SAM

### template.yaml

```yaml
AWSTemplateFormatVersion: '2010-09-09'
Transform: AWS::Serverless-2016-10-31

Globals:
  Function:
    Runtime: nodejs20.x
    Timeout: 30
    MemorySize: 512

Resources:
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
```

### Deploy

```bash
sam build && sam deploy --stack-name serverless-agent --capabilities CAPABILITY_IAM

# Lấy endpoint
aws cloudformation describe-stacks --stack-name serverless-agent --query 'Stacks[0].Outputs[0].OutputValue'
```

---

## Step 3: WebSocket cho Real-Time

HTTP request/response bị giới hạn 30s (Lambda timeout). WebSocket cho phép stream response.

```typescript
export const wsHandler = async (event: any) => {
  const connectionId = event.requestContext.connectionId;

  if (event.requestContext.routeKey === "$connect") {
    // Lưu connection
    return { statusCode: 200 };
  }

  // Xử lý async → gửi kết quả qua WebSocket
  processAgentQuery(JSON.parse(event.body).prompt, connectionId);
  return { statusCode: 202 };
};
```

---

## Step 4: Step Functions cho Multi-Step Workflows

Agent cần research → plan → execute → summarize. Step Functions orchestrate các bước.

```json
{
  "StartAt": "Analyze Request",
  "States": {
    "Analyze Request": {
      "Type": "Task",
      "Resource": "arn:aws:states:::sdk:bedrockruntime:converse",
      "Next": "Execute Steps"
    },
    "Execute Steps": {
      "Type": "Map",
      "ItemProcessor": {
        "StartAt": "Execute",
        "States": {
          "Execute": { "Type": "Task", "Resource": "arn:aws:lambda:::function:tool-executor", "End": true }
        }
      },
      "Next": "Summarize"
    },
    "Summarize": {
      "Type": "Task",
      "Resource": "arn:aws:states:::sdk:bedrockruntime:converse",
      "End": true
    }
  }
}
```

---

## Step 5: Gọi Agent

```bash
# HTTP
curl -X POST https://<api>.execute-api.us-east-1.amazonaws.com/prod/agent \
  -d '{"prompt":"List open issues in ptminh-kmp/xxx","sessionId":"demo-001"}'

# WebSocket
wscat -c wss://<ws-api>.execute-api.us-east-1.amazonaws.com/prod
> {"action":"message","prompt":"Hello","sessionId":"demo-001"}

# Lambda Function URL
curl -X POST https://<url>.lambda-url.us-east-1.on.aws/ \
  -d '{"prompt":"Hello","sessionId":"demo-002"}'
```

---

## Chi phí

| Component | Monthly |
|-----------|---------|
| Lambda (500K invocations, 512MB, 5s) | ~$25 |
| API Gateway (1M reqs + WebSocket) | ~$5 |
| Bedrock (Sonnet, 300K calls) | ~$1,350 |
| DynamoDB + Redis | ~$45 |
| **Total** | **~$1,435/tháng** |

So với ECS Fargate (~$1,419/mo) — tương đương. Chọn Lambda nếu traffic bursty, ECS nếu traffic ổn định.

---

## Checklist

- [ ] Lambda handler với Bedrock integration
- [ ] Tool execution (GitHub issues)
- [ ] SAM template
- [ ] WebSocket handler
- [ ] Step Functions workflow
- [ ] CORS configured
- [ ] IAM permissions
- [ ] Lambda timeout ≥30s
- [ ] VPC config cho Redis

---

| Day | Chủ đề |
|-----|--------|
| 1 | Deploy MCP Server lên ECS Fargate ✅ |
| 2 | Agent State với DynamoDB Global Tables ✅ |
| 3 | LLM Caching với ElastiCache + Bedrock ✅ |
| 4 | **Serverless Agent với Lambda + Bedrock ✅** |
| 5 | Multi-Region Agent Routing với Route53 |
| 6 | CI/CD cho AI Agents với CodePipeline |

---

*Series: AWS cho AI/Agent Developers. Day 4: Serverless agents — Lambda + Bedrock + API Gateway + WebSocket + Step Functions.*
