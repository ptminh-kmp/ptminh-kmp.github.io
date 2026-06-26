---
title: "AWS for AI/Agent Developers — Day 1: Deploy an MCP Server on ECS Fargate"
description: "Take your MCP server from localhost to production on AWS. ECS Fargate with ALB, auto-scaling, Secrets Manager, and a CI/CD pipeline so shipping is one git push away."
published: 2026-06-26
pubDate: 2026-06-26T02:00:00.000Z
slug: aws-for-ai-agent-developers-deploy-mcp-ecs-fargate
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
lang: en
series:
  name: "AWS for AI/Agent Developers"
  order: 1
  total: 6
---

You built an MCP server. It works on localhost. Now make it accessible to the internet — and to every agent that needs it.

ECS Fargate is the sweet spot for serving MCP servers: no EC2 to manage, auto-scaling out of the box, and a built-in load balancer. You ship a Docker image, Fargate does the rest.

This post deploys a GitHub Issue Manager MCP server onto AWS ECS Fargate, with:

- Application Load Balancer (HTTPS + WebSocket for SSE transport)
- Auto-scaling based on request count
- Secrets Manager for GitHub tokens
- ECR for Docker image storage
- CI/CD via CodePipeline

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Agent      │────▶│   ALB        │────▶│   ECS         │
│   (anywhere) │     │   (HTTPS)    │     │   Fargate     │
├──────────────┤     ├──────────────┤     ├──────────────┤
│  MCP Client  │     │  ┌────────┐ │     │  ┌──────────┐ │
│  (SSE)       │     │  │ :443   │ │     │  │ MCP      │ │
│              │     │  │ ─────▶ │ │     │  │ Server   │ │
└──────────────┘     │  │ :3001  │ │     │  │ (Docker) │ │
                     │  └────────┘ │     │  └──────────┘ │
                     └──────────────┘     └──────────────┘
```

---

## Prerequisites

```bash
# AWS CLI (logged in)
aws configure

# Docker
docker --version

# Node.js 18+
node --version

# An MCP server project. Any server with SSE transport works.
```

---

## Step 1: Dockerize the MCP Server

### `Dockerfile`

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

ENV NODE_ENV=production
ENV PORT=3001

CMD ["node", "dist/index.js"]
```

Key points:
- **Multi-stage build**: builder stage has devDependencies for compilation, runtime stays minimal
- **Non-root user**: security best practice for containers
- **Health check**: ECS uses this to determine container health
- **No hardcoded tokens**: secrets are injected at runtime via Secrets Manager

### Build and test locally:

```bash
docker build -t github-issue-mcp .
docker run -p 3001:3001 \
  -e GITHUB_TOKEN=your_token_here \
  -e AWS_REGION=us-east-1 \
  github-issue-mcp

# Verify
curl http://localhost:3001/health
```

---

## Step 2: Set Up ECR Repository

ECR is Docker Hub on AWS — private, fast, and integrated with ECS.

```bash
# Create repository with vulnerability scanning
aws ecr create-repository \
  --repository-name github-issue-mcp \
  --image-scanning-configuration scanOnPush=true

# Authenticate Docker
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin <account>.dkr.ecr.us-east-1.amazonaws.com

# Tag and push
docker tag github-issue-mcp:latest <account>.dkr.ecr.us-east-1.amazonaws.com/github-issue-mcp:latest
docker push <account>.dkr.ecr.us-east-1.amazonaws.com/github-issue-mcp:latest
```

`scanOnPush=true` scans every pushed image for vulnerabilities before it reaches production.

---

## Step 3: Store Secrets in AWS Secrets Manager

Never bake tokens into images. Never commit them to Git.

```bash
aws secretsmanager create-secret \
  --name "github-issue-mcp/github-token" \
  --description "GitHub Personal Access Token for MCP server" \
  --secret-string "ghp_your_token_here"
```

Also store the SSE shared secret if you implemented authentication (from the MCP security series):

```bash
aws secretsmanager create-secret \
  --name "github-issue-mcp/sse-shared-secret" \
  --secret-string "your-sse-secret-here"
```

---

## Step 4: Create ECS Cluster + Task Definition

### Cluster

```bash
aws ecs create-cluster \
  --cluster-name mcp-server-cluster \
  --capacity-providers FARGATE FARGATE_SPOT
```

Using `FARGATE_SPOT` as secondary capacity saves 30-50% on compute costs.

### Task Definition

The task definition tells ECS what container to run, what ports to expose, and which secrets to inject.

```bash
GITHUB_TOKEN_ARN=$(aws secretsmanager describe-secret \
  --secret-id "github-issue-mcp/github-token" --query ARN --output text)

aws ecs register-task-definition \
  --family github-issue-mcp \
  --network-mode awsvpc \
  --requires-compatibilities FARGATE \
  --cpu 256 \
  --memory 512 \
  --execution-role-arn "arn:aws:iam::<account>:role/ecsTaskExecutionRole" \
  --container-definitions '[
    {
      "name": "mcp-server",
      "image": "<account>.dkr.ecr.us-east-1.amazonaws.com/github-issue-mcp:latest",
      "essential": true,
      "portMappings": [{"containerPort": 3001, "protocol": "tcp"}],
      "environment": [
        {"name": "NODE_ENV", "value": "production"},
        {"name": "AWS_REGION", "value": "us-east-1"}
      ],
      "secrets": [
        {"name": "GITHUB_TOKEN", "valueFrom": "'"$GITHUB_TOKEN_ARN"'"}
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/github-issue-mcp",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]'
```

The `execution-role-arn` references an IAM role that gives ECS permission to pull images from ECR and write logs to CloudWatch.

---

## Step 5: Create ALB + Service

### Security groups

```bash
# ALB — receive HTTPS from anywhere
aws ec2 create-security-group --group-name mcp-alb-sg --description "ALB for MCP server"
aws ec2 authorize-security-group-ingress --group-id <alb-sg-id> \
  --protocol tcp --port 443 --cidr 0.0.0.0/0

# Tasks — receive traffic only from ALB
aws ec2 create-security-group --group-name mcp-task-sg --description "MCP server tasks"
aws ec2 authorize-security-group-ingress --group-id <task-sg-id> \
  --protocol tcp --port 3001 --source-group <alb-sg-id>
```

### Target group and ALB

```bash
# Target group — health check on /health
aws elbv2 create-target-group --name mcp-server-tg --protocol HTTP --port 3001 \
  --target-type ip --vpc-id <vpc-id> --health-check-path /health

# ALB
aws elbv2 create-load-balancer --name mcp-server-alb \
  --subnets subnet-<public-a> subnet-<public-b> --security-groups <alb-sg-id>

# HTTPS listener (requires ACM certificate)
aws elbv2 create-listener --load-balancer-arn <alb-arn> \
  --protocol HTTPS --port 443 \
  --certificates CertificateArn=<acm-cert-arn> \
  --default-actions Type=forward,TargetGroupArn=<tg-arn>
```

### ECS Service

```bash
aws ecs create-service \
  --cluster mcp-server-cluster \
  --service-name github-issue-mcp \
  --task-definition github-issue-mcp \
  --desired-count 2 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-<private-a>,subnet-<private-b>],securityGroups=[<task-sg-id>],assignPublicIp=DISABLED}" \
  --load-balancers "targetGroupArn=<tg-arn>,containerName=mcp-server,containerPort=3001" \
  --deployment-configuration "maximumPercent=200,minimumHealthyPercent=100"
```

**Private subnets** + no public IP: the ALB handles all inbound traffic. The tasks only need outbound access to the GitHub API.

---

## Step 6: Auto-Scaling

Scale on the metric that matters: request count per ALB target.

```bash
aws application-autoscaling register-scalable-target \
  --service-namespace ecs \
  --resource-id service/mcp-server-cluster/github-issue-mcp \
  --scalable-dimension ecs:service:DesiredCount \
  --min-capacity 2 --max-capacity 20

aws application-autoscaling put-scaling-policy \
  --service-namespace ecs \
  --resource-id service/mcp-server-cluster/github-issue-mcp \
  --scalable-dimension ecs:service:DesiredCount \
  --policy-name request-count-target \
  --policy-type TargetTrackingScaling \
  --target-tracking-scaling-policy-configuration '{
    "TargetValue": 100.0,
    "PredefinedMetricSpecification": {
      "PredefinedMetricType": "ALBRequestCountPerTarget",
      "ResourceLabel": "<alb-arn/tg-arn>"
    },
    "ScaleOutCooldown": 60,
    "ScaleInCooldown": 120
  }'
```

---

## Step 7: CI/CD with CodePipeline

### `buildspec.yml`

```yaml
version: 0.2
phases:
  install:
    commands:
      - npm ci
  pre_build:
    commands:
      - npm run build
      - aws ecr get-login-password --region $AWS_DEFAULT_REGION | docker login --username AWS --password-stdin $ECR_REPOSITORY_URI
  build:
    commands:
      - docker build -t $ECR_REPOSITORY_URI:$CODEBUILD_RESOLVED_SOURCE_VERSION .
      - docker tag $ECR_REPOSITORY_URI:$CODEBUILD_RESOLVED_SOURCE_VERSION $ECR_REPOSITORY_URI:latest
  post_build:
    commands:
      - docker push $ECR_REPOSITORY_URI:$CODEBUILD_RESOLVED_SOURCE_VERSION
      - docker push $ECR_REPOSITORY_URI:latest
      - printf '[{"name":"mcp-server","imageUri":"%s"}]' $ECR_REPOSITORY_URI:$CODEBUILD_RESOLVED_SOURCE_VERSION > imagedefinitions.json
artifacts:
  files: imagedefinitions.json
```

Now every git push to `main` triggers:
1. CodeBuild compiles TypeScript and builds the Docker image
2. Pushes to ECR
3. ECS deploys a new task definition with the updated image
4. ALB gradually drains old connections and routes to new tasks

---

## Step 8: Connecting an Agent

```typescript
const client = new McpClient({
  transport: new SSEClientTransport({
    url: "https://mcp-server-<alb-dns>.us-east-1.elb.amazonaws.com/sse",
    headers: {
      "Authorization": "Bearer <sse-shared-secret>",
    },
  }),
});
```

For SSE transport, enable stickiness on the ALB target group, or implement an external session store.

---

## Monitoring

### Dashboard

```bash
aws cloudwatch put-dashboard --dashboard-name MCP-Server --dashboard-body '{
  "widgets": [
    {
      "type": "metric",
      "properties": {
        "metrics": [
          ["AWS/ECS", "CPUUtilization", {"stat": "Average"}],
          ["AWS/ECS", "MemoryUtilization", {"stat": "Average"}]
        ],
        "period": 300, "stat": "Average", "region": "us-east-1",
        "title": "MCP Server Resource Usage"
      }
    },
    {
      "type": "metric",
      "properties": {
        "metrics": [
          ["AWS/ApplicationELB", "RequestCount", {"stat": "Sum"}],
          ["AWS/ApplicationELB", "TargetResponseTime", {"stat": "p95"}],
          ["AWS/ApplicationELB", "HTTPCode_Target_5XX_Count", {"stat": "Sum"}]
        ],
        "period": 300, "region": "us-east-1",
        "title": "ALB Metrics"
      }
    }
  ]
}'
```

---

## Cost Breakdown

| Component | Configuration | Monthly |
|-----------|--------------|---------|
| ECS Fargate | 2 tasks × 256/512 | ~$30 |
| ALB | 1 ALB | ~$22 |
| ECR | < 5GB storage | ~$1 |
| Secrets Manager | 2 secrets | ~$1 |
| CloudWatch | Logs + metrics | ~$5 |
| CodePipeline | 50+ builds | ~$10 |
| **Total** | | **~$69/mo** |

With FARGATE_SPOT for 50% of tasks: ~$50/mo.

---

## What We Used

| AWS Service | Purpose |
|-------------|---------|
| **ECR** | Private Docker registry |
| **Secrets Manager** | GitHub tokens, SSE shared secret |
| **ECS Fargate** | Serverless container runtime |
| **ALB** | HTTPS termination + routing + auto-scaling |
| **Application Auto Scaling** | Scale on request count |
| **CodePipeline + CodeBuild** | CI/CD from git push |
| **CloudWatch** | Logs, metrics, alarms |

---

## Checklist

- [ ] Dockerfile with multi-stage build
- [ ] ECR repository with scanOnPush
- [ ] Secrets in Secrets Manager
- [ ] ECS task definition with secret references
- [ ] ALB + HTTPS + health check
- [ ] Auto-scaling policy configured
- [ ] CodePipeline from git → build → deploy
- [ ] CloudWatch dashboard + alarms

---

| Day | Topic |
|-----|-------|
| 1 | **Deploy MCP Server on ECS Fargate ✅** |
| 2 | Agent State with DynamoDB Global Tables |
| 3 | LLM Caching with ElastiCache + Bedrock |
| 4 | Serverless Agent with Lambda + Bedrock |
| 5 | Multi-Region Agent Routing with Route53 |
| 6 | CI/CD for AI Agents with CodePipeline |

---

*Series: AWS for AI/Agent Developers. Day 1: Deploy an MCP server on ECS Fargate with ALB, Secrets Manager, auto-scaling, and CI/CD pipeline. Full AWS CLI commands included.*
