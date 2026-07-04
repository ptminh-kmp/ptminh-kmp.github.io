---
title: "AWS cho AI/Agent Developers — Day 6: CI/CD cho AI Agents với CodePipeline"
description: "Automate toàn bộ agent lifecycle. Git push → Docker build → ECR push → ECS deploy → smoke test → promote. Blue/green, canary, rollback."
published: 2026-07-04
pubDate: 2026-07-04T02:00:00.000Z
slug: aws-for-ai-agent-developers-ci-cd-agent-deployments-vi
tags:
  - aws
  - codepipeline
  - cicd
  - ecs
  - deployment
  - blue-green
  - canary
  - rollback
category: aws
lang: vi
series:
  name: "AWS for AI/Agent Developers"
  order: 6
  total: 6
---

5 ngày qua chúng ta đã build:
- ✅ Day 1 — MCP server trên ECS Fargate
- ✅ Day 2 — DynamoDB Global Tables
- ✅ Day 3 — ElastiCache + Bedrock caching
- ✅ Day 4 — Lambda + Bedrock serverless
- ✅ Day 5 — Route53 multi-region

Hôm nay kết nối tất cả bằng CI/CD. Ship agent updates bằng tay không phải production.

**Pipeline:** GitHub → CodeBuild → Deploy staging → Smoke tests → Manual approval → Deploy us-east-1 → Deploy eu-west-1 → Invalidate CloudFront

```
Git push main → Build Docker → Deploy Staging → Smoke Tests
                                                   │
                                          Manual Approval
                                                   │
                                    ┌──────────────┴──────────────┐
                                    ▼                             ▼
                          us-east-1 Blue/Green          eu-west-1 Blue/Green
                                    │                             │
                                    └───────── CloudFront ────────┘
```

---

## Step 1: buildspec.yml

```yaml
phases:
  install:
    commands:
      - npm ci && npm run build
  pre_build:
    commands:
      - aws ecr get-login-password | docker login --username AWS --password-stdin $ECR_REPOSITORY_URI
  build:
    commands:
      - docker build -t $ECR_REPOSITORY_URI:latest .
      - docker tag $ECR_REPOSITORY_URI:latest $ECR_REPOSITORY_URI:$IMAGE_TAG
  post_build:
    commands:
      - docker push $ECR_REPOSITORY_URI:latest
      - docker push $ECR_REPOSITORY_URI:$IMAGE_TAG
      - printf '[{"name":"mcp-server","imageUri":"%s:%s"}]' $ECR_REPOSITORY_URI $IMAGE_TAG > imagedefinitions.json
```

---

## Step 2: Agent Smoke Tests

Không chỉ check HTTP 200 — còn phải check agent có trả lời đúng không.

```bash
# Test 1: Health check
curl -s -o /dev/null -w "%{http_code}" https://staging.agent.yourdomain.com/health

# Test 2: Agent trả lời prompt
curl -s -X POST https://staging.agent.yourdomain.com/agent \
  -d '{"prompt":"Say hello in one word","sessionId":"smoke-test"}'

# Test 3: Tool execution
curl -s -X POST https://staging.agent.yourdomain.com/agent \
  -d '{"prompt":"List issues","sessionId":"smoke-tool"}'

# Test 4: Session persistence
curl -s -X POST https://staging.agent.yourdomain.com/agent \
  -d '{"prompt":"My name is TestAgent","sessionId":"session-1"}'
curl -s -X POST https://staging.agent.yourdomain.com/agent \
  -d '{"prompt":"What is my name?","sessionId":"session-1"}'

# Test 5: Cache hit latency
# Gọi 2 lần → lần 2 phải nhanh hơn (<500ms)
```

---

## Step 3: Blue/Green Deployment

CodeDeploy quản lý blue/green cho ECS:

```
[Blue - Current] ── 100% traffic
[Green - New]    ── 0% traffic

1. Tạo Green task set với image mới
2. Route test traffic vào Green
3. Lambda validate agent response
4. Shift traffic: 10% → 50% → 100%
5. Nếu error rate cao → auto-rollback
6. Blue drain + terminate
```

**Canary:** `CodeDeployDefault.ECSLinear10PercentEvery1Minute`

---

## Step 4: Pipeline (CodePipeline)

7 stages:

| Stage | Action | 
|-------|--------|
| 1. Source | GitHub main branch |
| 2. Build | CodeBuild → Docker → ECR |
| 3. Deploy Staging | ECS deploy to staging |
| 4. Smoke Tests | Agent health + LLM + tools |
| 5. Manual Approval | Human checks the smoke test results |
| 6. Deploy us-east-1 | Blue/green production |
| 7. Deploy eu-west-1 | Blue/green DR region |
| 8. Invalidate CloudFront | Clear edge cache |

---

## Step 5: Rollback

```bash
# Auto-rollback khi error rate > threshold
aws deploy stop-deployment --deployment-id d-EXAMPLE --auto-rollback-enabled

# Manual: rollback task definition
aws ecs update-service --cluster mcp-server-cluster --service github-issue-mcp --task-definition github-issue-mcp:v42
```

---

## Step 6: Config Versioning

Agent không chỉ code — còn model, prompts, tools. Version control tất cả:

```
config/
├── models/production.yml     # Model ID, temperature
├── prompts/system-v2.txt     # System prompt
├── cache/policies.yml        # Similarity thresholds
└── tools/github.yml          # Tool definitions
```

---

## Chi phí

| Component | Monthly |
|-----------|---------|
| CodePipeline | ~$2 |
| CodeBuild | ~$5 |
| ECR | ~$1 |
| CodeDeploy | Free |
| CloudWatch alarms | ~$3 |
| **Total CI/CD** | **~$12/tháng** |

---

## Kết thúc Series 🎉

| Day | Chủ đề | AWS Services |
|-----|--------|-------------|
| 1 | Deploy MCP Server lên ECS Fargate | ECS, ECR, ALB, Secrets Manager |
| 2 | Agent State với DynamoDB | DynamoDB Global Tables, DAX |
| 3 | LLM Caching với ElastiCache + Bedrock | ElastiCache, Bedrock |
| 4 | Serverless Agent với Lambda + Bedrock | Lambda, API Gateway, Bedrock |
| 5 | Multi-Region Agent Routing với Route53 | Route53, CloudFront, Global Accelerator |
| 6 | **CI/CD cho AI Agents** | **CodePipeline, CodeBuild, CodeDeploy** |

Bây giờ bạn có đủ infrastructure để chạy AI agents trên AWS: compute, state, cache, serverless, routing, và automation.

---

*Series: AWS cho AI/Agent Developers. Day 6 (finale): CI/CD với CodePipeline, blue/green, canary, smoke tests, rollback. Git push lên production.*
