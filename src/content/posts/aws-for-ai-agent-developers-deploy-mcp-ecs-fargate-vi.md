---
title: "AWS cho AI/Agent Developers — Day 1: Deploy MCP Server lên ECS Fargate"
description: "Đưa MCP server từ localhost lên production trên AWS. ECS Fargate với ALB, auto-scaling, Secrets Manager, và CI/CD pipeline."
published: 2026-06-26
pubDate: 2026-06-26T02:00:00.000Z
slug: aws-for-ai-agent-developers-deploy-mcp-ecs-fargate-vi
tags:
  - aws
  - mcp
  - ecs
  - fargate
  - docker
  - ci-cd
  - ai-agents
  - infrastructure
category: aws
lang: vi
series:
  name: "AWS for AI/Agent Developers"
  order: 1
  total: 6
---

Bạn xây MCP server. Nó chạy trên localhost. Giờ đưa lên internet để agent nào cũng gọi được.

ECS Fargate là sweet spot: không quản lý EC2, auto-scaling sẵn, có load balancer built-in. Ship Docker image, Fargate lo phần còn lại.

Bài này deploy MCP server lên ECS Fargate với ALB (HTTPS), Secrets Manager, auto-scaling, CI/CD.

---

## Step 1: Dockerize

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

FROM node:20-alpine AS runtime
WORKDIR /app
RUN addgroup -S mcp && adduser -S mcp -G mcp
COPY --from=builder /app/node_modules ./node_modules
COPY dist/ ./dist/
COPY package.json ./
USER mcp
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/health || exit 1
ENV NODE_ENV=production PORT=3001
CMD ["node", "dist/index.js"]
```

Multi-stage build: builder stage có devDependencies để compile, runtime chỉ có production code.

---

## Step 2: ECR

```bash
# Tạo repository với vulnerability scanning
aws ecr create-repository \
  --repository-name github-issue-mcp \
  --image-scanning-configuration scanOnPush=true

# Push image
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <account>.dkr.ecr.us-east-1.amazonaws.com
docker push <account>.dkr.ecr.us-east-1.amazonaws.com/github-issue-mcp:latest
```

---

## Step 3: Secrets Manager

```bash
aws secretsmanager create-secret \
  --name "github-issue-mcp/github-token" \
  --secret-string "ghp_your_token_here"
```

ECS injects secret vào container khi start. Không lưu trong image, không lưu trong git.

---

## Step 4: ECS Cluster + Service

```bash
# Cluster
aws ecs create-cluster --cluster-name mcp-server-cluster \
  --capacity-providers FARGATE FARGATE_SPOT

# Task definition (CPU 256, RAM 512MB, secret từ Secrets Manager)
aws ecs register-task-definition --family github-issue-mcp \
  --network-mode awsvpc --requires-compatibilities FARGATE \
  --cpu 256 --memory 512 \
  --container-definitions '[
    {"name":"mcp-server","image":"<account>.dkr.ecr.us-east-1.amazonaws.com/github-issue-mcp:latest",
     "portMappings":[{"containerPort":3001}],
     "secrets":[{"name":"GITHUB_TOKEN","valueFrom":"<secret-arn>"}],
     "logConfiguration":{"logDriver":"awslogs","options":{"awslogs-group":"/ecs/github-issue-mcp"}}}
  ]'

# Service (2 tasks, private subnets, ALB attached)
aws ecs create-service --cluster mcp-server-cluster \
  --service-name github-issue-mcp --task-definition github-issue-mcp \
  --desired-count 2 --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-private-a,subnet-private-b],securityGroups=[<task-sg>],assignPublicIp=DISABLED}" \
  --load-balancers "targetGroupArn=<tg-arn>,containerName=mcp-server,containerPort=3001"
```

---

## Step 5: ALB

```
Internet ─▶ HTTPS :443 ─▶ ALB ─▶ HTTP :3001 ─▶ ECS Task (private subnet)
```
- Security groups: ALB SG allow :443, Task SG allow :3001 từ ALB SG
- Target group health check: GET /health
- Cần ACM certificate cho HTTPS

---

## Step 6: Auto-Scaling

```bash
aws application-autoscaling register-scalable-target \
  --service-namespace ecs \
  --resource-id service/mcp-server-cluster/github-issue-mcp \
  --scalable-dimension ecs:service:DesiredCount \
  --min-capacity 2 --max-capacity 20

# Scale out khi request > 100/target
aws application-autoscaling put-scaling-policy \
  --service-namespace ecs \
  --resource-id service/mcp-server-cluster/github-issue-mcp \
  --scalable-dimension ecs:service:DesiredCount \
  --policy-name request-count-target \
  --policy-type TargetTrackingScaling \
  --target-tracking-scaling-policy-configuration '{
    "TargetValue": 100.0,
    "PredefinedMetricSpecification": {
      "PredefinedMetricType": "ALBRequestCountPerTarget"
    }
  }'
```

---

## Step 7: CI/CD

### buildspec.yml

```yaml
version: 0.2
phases:
  pre_build:
    commands:
      - npm ci && npm run build
      - aws ecr get-login-password | docker login --username AWS --password-stdin $ECR_REPOSITORY_URI
  build:
    commands:
      - docker build -t $ECR_REPOSITORY_URI:$CODEBUILD_RESOLVED_SOURCE_VERSION .
      - docker tag $ECR_REPOSITORY_URI:$CODEBUILD_RESOLVED_SOURCE_VERSION $ECR_REPOSITORY_URI:latest
  post_build:
    commands:
      - docker push $ECR_REPOSITORY_URI:$CODEBUILD_RESOLVED_SOURCE_VERSION
      - printf '[{"name":"mcp-server","imageUri":"%s"}]' $ECR_REPOSITORY_URI:$CODEBUILD_RESOLVED_SOURCE_VERSION > imagedefinitions.json
```

Mỗi push lên main → build → push ECR → ECS deploy → ALB drain + route.

---

## Kết nối Agent

```typescript
const client = new McpClient({
  transport: new SSEClientTransport({
    url: "https://alb-dns/sse",
    headers: { "Authorization": "Bearer <sse-secret>" },
  }),
});
```

---

## Chi phí (~$69/tháng)

| Component | Cost |
|-----------|------|
| Fargate (2 tasks) | ~$30 |
| ALB | ~$22 |
| ECR + Secrets + CW | ~$7 |
| CodePipeline | ~$10 |
| **Total** | **~$69** |

---

## Checklist

- [ ] Dockerfile multi-stage
- [ ] ECR scanOnPush
- [ ] Secrets Manager
- [ ] ECS task definition
- [ ] ALB + HTTPS + health check
- [ ] Auto-scaling
- [ ] CodePipeline
- [ ] CloudWatch dashboard

---

| Day | Chủ đề |
|-----|--------|
| 1 | **Deploy MCP Server lên ECS Fargate ✅** |
| 2 | Agent State với DynamoDB Global Tables |
| 3 | LLM Caching với ElastiCache + Bedrock |
| 4 | Serverless Agent với Lambda + Bedrock |
| 5 | Multi-Region Agent Routing với Route53 |
| 6 | CI/CD cho AI Agents với CodePipeline |

---

*Series: AWS cho AI/Agent Developers. Day 1: Deploy MCP server lên ECS Fargate với ALB, Secrets Manager, auto-scaling, và CI/CD.*
