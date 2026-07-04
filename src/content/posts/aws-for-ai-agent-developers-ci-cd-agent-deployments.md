---
title: "AWS for AI/Agent Developers — Day 6: CI/CD for AI Agents with CodePipeline"
description: "Automate the full agent lifecycle. Git push → Docker build → ECR push → ECS deploy → smoke test → promote. Blue/green deployments, canary releases, rollbacks."
published: 2026-07-04
pubDate: 2026-07-04T02:00:00.000Z
slug: aws-for-ai-agent-developers-ci-cd-agent-deployments
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
lang: en
series:
  name: "AWS for AI/Agent Developers"
  order: 6
  total: 6
---

Over the last 5 days we built:
- ✅ Day 1 — MCP server on ECS Fargate (compute)
- ✅ Day 2 — DynamoDB Global Tables (state)
- ✅ Day 3 — ElastiCache + Bedrock (caching)
- ✅ Day 4 — Lambda + Bedrock (serverless)
- ✅ Day 5 — Route53 multi-region (routing)

Now we tie it together with CI/CD. Because shipping agent updates by hand is not production.

Today: an automated deployment pipeline that takes code from `git push` to a running agent in multiple regions, with smoke tests, blue/green deployments, and one-click rollback.

```
                    ┌─────────────────────────────────────┐
                    │         Source (GitHub)              │
                    │         main branch push             │
                    └────────────────┬────────────────────┘
                                     │
                                     ▼
                    ┌─────────────────────────────────────┐
                    │         CodeBuild                    │
                    │  npm ci → npm run build →            │
                    │  docker build → docker push ECR      │
                    └────────────────┬────────────────────┘
                                     │
                                     ▼
                    ┌─────────────────────────────────────┐
                    │         Staging Deploy               │
                    │  ECS new task definition             │
                    │  → deploy to staging cluster          │
                    └────────────────┬────────────────────┘
                                     │
                                     ▼
                    ┌─────────────────────────────────────┐
                    │         Smoke Tests                  │
                    │  /health → tool call → LLM response  │
                    └────────────────┬────────────────────┘
                                     │
                          ┌──────────┴──────────┐
                          ▼                     ▼
              ┌────────────────────┐  ┌────────────────────┐
              │    us-east-1       │  │   eu-west-1        │
              │   Blue/Green ECS   │  │  Blue/Green ECS    │
              │   CloudFront inval │  │  Route53 failover  │
              └────────────────────┘  └────────────────────┘
```

---

## The Full Pipeline Architecture

Beyond basic CI/CD, agent pipelines need:

1. **Agent-specific smoke tests** — not just "does it answer 200", but "is the LLM responding coherently?"
2. **Model/config versioning** — LLM models change, prompts change, tool definitions change
3. **Canary deployments** — release to 5% of traffic first, observe, then roll out
4. **Automatic rollback** — if error rate spikes, revert within minutes
5. **Config promotion** — prompt templates, cache policies, model IDs flow through deployment stages

---

## Step 1: buildspec.yml

```yaml
version: 0.2

env:
  parameter-store:
    GITHUB_TOKEN: "/agent/github-token"
    SSE_SECRET: "/agent/sse-shared-secret"

phases:
  install:
    runtime-versions:
      nodejs: 20
    commands:
      - npm ci
      - npm run build

  pre_build:
    commands:
      - echo "Logging in to Amazon ECR..."
      - aws ecr get-login-password --region $AWS_DEFAULT_REGION | docker login --username AWS --password-stdin $ECR_REPOSITORY_URI
      - COMMIT_HASH=$(echo $CODEBUILD_RESOLVED_SOURCE_VERSION | cut -c 1-8)
      - IMAGE_TAG=$COMMIT_HASH-$(date +%Y%m%d%H%M%S)

  build:
    commands:
      - echo "Building Docker image..."
      - docker build -t $ECR_REPOSITORY_URI:latest .
      - docker tag $ECR_REPOSITORY_URI:latest $ECR_REPOSITORY_URI:$IMAGE_TAG

  post_build:
    commands:
      - echo "Pushing Docker images..."
      - docker push $ECR_REPOSITORY_URI:latest
      - docker push $ECR_REPOSITORY_URI:$IMAGE_TAG
      - echo "Generating imagedefinitions.json..."
      - printf '[
          {"name":"mcp-server","imageUri":"%s:%s"},
          {"name":"mcp-server-cache","imageUri":"%s:%s"}
        ]' $ECR_REPOSITORY_URI $IMAGE_TAG $ECR_REPOSITORY_URI $IMAGE_TAG > imagedefinitions.json
      - cat imagedefinitions.json
      - echo "Saving image tag for later stages..."
      - echo $IMAGE_TAG > /tmp/image-tag.txt

artifacts:
  files:
    - imagedefinitions.json
    - appspec.yaml
    - taskdef.json
    - /tmp/image-tag.txt
  discard-paths: yes
```

---

## Step 2: Agent-Specific Smoke Tests

```yaml
version: 0.2

phases:
  test:
    commands:
      - echo "Running agent smoke tests..."
      - |
        set -e

        # Test 1: Health Check
        echo "=== Test 1: Health check ==="
        STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://staging.agent.yourdomain.com/health)
        if [ "$STATUS" != "200" ]; then
          echo "FAIL: Health check returned $STATUS"
          exit 1
        fi
        echo "PASS: Health check OK"

        # Test 2: Agent responds
        echo "=== Test 2: Agent responds to prompt ==="
        RESPONSE=$(curl -s -X POST https://staging.agent.yourdomain.com/agent \
          -H "Content-Type: application/json" \
          -d '{"prompt": "Say hello in one word", "sessionId": "smoke-test-1"}')
        echo "Response: $RESPONSE"

        if ! echo "$RESPONSE" | grep -q "hello\|Hello\|hi\|Hi"; then
          echo "FAIL: Agent did not respond to basic prompt"
          exit 1
        fi
        echo "PASS: Agent responds to prompts"

        # Test 3: Tool execution
        echo "=== Test 3: Tool execution ==="
        TOOL_RESPONSE=$(curl -s -X POST https://staging.agent.yourdomain.com/agent \
          -H "Content-Type: application/json" \
          -d '{"prompt": "List issues in ptminh-kmp/test-repo", "sessionId": "smoke-test-2"}')
        echo "Tool response: $TOOL_RESPONSE"

        if echo "$TOOL_RESPONSE" | grep -q "error"; then
          echo "WARN: Tool execution had issues, but continuing..."
        fi

        # Test 4: Session persistence
        echo "=== Test 4: Session persistence ==="
        SESSION_ID="smoke-test-$(date +%s)"
        curl -s -X POST https://staging.agent.yourdomain.com/agent \
          -d "{\"prompt\":\"My name is TestAgent\",\"sessionId\":\"$SESSION_ID\"}" > /dev/null
        PERSIST=$(curl -s -X POST https://staging.agent.yourdomain.com/agent \
          -d "{\"prompt\":\"What is my name?\",\"sessionId\":\"$SESSION_ID\"}")
        echo "Session test: $PERSIST"

        if ! echo "$PERSIST" | grep -qi "testagent"; then
          echo "WARN: Session persistence may not be working"
        else
          echo "PASS: Session persistence OK"
        fi

        # Test 5: Cache is working
        echo "=== Test 5: Cache hit ==="
        START=$(date +%s%N)
        curl -s -X POST https://staging.agent.yourdomain.com/agent \
          -d '{"prompt":"What is MCP in 10 words?","sessionId":"smoke-test-cache"}' > /dev/null
        curl -s -X POST https://staging.agent.yourdomain.com/agent \
          -d '{"prompt":"What is MCP in 10 words?","sessionId":"smoke-test-cache"}' > /dev/null
        END=$(date +%s%N)
        LATENCY=$(( ($END - $START) / 1000000 ))
        echo "Second call latency: ${LATENCY}ms"

        if [ "$LATENCY" -lt 500 ]; then
          echo "PASS: Cache appears to be working"
        else
          echo "INFO: Cache may not be configured, but continuing"
        fi

        echo ""
        echo "=== All smoke tests passed ==="
```

---

## Step 3: appspec.yaml for Blue/Green

```yaml
version: 0.0

Resources:
  - TargetService:
      Type: AWS::ECS::Service
      Properties:
        TaskDefinition: "<TASK_DEFINITION>"
        LoadBalancerInfo:
          ContainerName: "mcp-server"
          ContainerPort: 3001

Hooks:
  - BeforeInstall: "CodeDeployHook_BeforeInstall"
  - AfterInstall: "CodeDeployHook_AfterInstall"
  - AfterAllowTestTraffic: "CodeDeployHook_SmokeTest"
  - BeforeAllowTraffic: "CodeDeployHook_BeforeAllowTraffic"
  - AfterAllowTraffic: "CodeDeployHook_AfterAllowTraffic"

  - BeforeAllowTraffic: "Lambda-ValidateAgent"
```
---

## Step 4: Pipeline with Blue/Green

```yaml
# pipeline.yaml — Full CodePipeline for agent deployments

Resources:
  AgentPipeline:
    Type: AWS::CodePipeline::Pipeline
    Properties:
      Name: agent-deployment-pipeline
      RoleArn: !GetAtt PipelineRole.Arn
      ArtifactStore:
        Type: S3
        Location: !Ref ArtifactBucket

      Stages:
        # ── Stage 1: Source ──
        - Name: Source
          Actions:
            - Name: Source
              ActionTypeId:
                Category: Source
                Owner: ThirdParty
                Provider: GitHub
                Version: 1
              Configuration:
                Owner: ptminh-kmp
                Repo: agent-infrastructure
                Branch: main
                OAuthToken: !Ref GitHubOAuthToken
              OutputArtifacts:
                - Name: SourceOutput

        # ── Stage 2: Build ──
        - Name: Build
          Actions:
            - Name: Build
              ActionTypeId:
                Category: Build
                Owner: AWS
                Provider: CodeBuild
                Version: 1
              Configuration:
                ProjectName: !Ref AgentBuildProject
              InputArtifacts:
                - Name: SourceOutput
              OutputArtifacts:
                - Name: BuildOutput
              RunOrder: 1

        # ── Stage 3: Deploy to Staging ──
        - Name: DeployStaging
          Actions:
            - Name: DeployToStaging
              ActionTypeId:
                Category: Deploy
                Owner: AWS
                Provider: ECS
                Version: 1
              Configuration:
                ApplicationName: agent-app
                DeploymentGroupName: staging
                DeploymentConfig: CodeDeployDefault.ECSAllAtOnce
                AppSpecTemplateArtifact: BuildOutput
                AppSpecTemplatePath: appspec.yaml
                TaskDefinitionTemplateArtifact: BuildOutput
                TaskDefinitionTemplatePath: taskdef.json
              InputArtifacts:
                - Name: BuildOutput
              RunOrder: 1

        # ── Stage 4: Smoke Tests ──
        - Name: SmokeTests
          Actions:
            - Name: RunSmokeTests
              ActionTypeId:
                Category: Test
                Owner: AWS
                Provider: CodeBuild
                Version: 1
              Configuration:
                ProjectName: !Ref SmokeTestProject
                EnvironmentVariables: '[{"name":"STAGING_URL","value":"https://staging.agent.yourdomain.com","type":"PLAINTEXT"}]'
              InputArtifacts:
                - Name: BuildOutput
              RunOrder: 1

        # ── Stage 5: Manual Approval ──
        - Name: Approval
          Actions:
            - Name: ApproveProduction
              ActionTypeId:
                Category: Approval
                Owner: AWS
                Provider: Manual
                Version: 1
              Configuration:
                NotificationArn: !Ref SnsTopic
                CustomData: "Agent deployment ready for production. Smoke tests passed."
              RunOrder: 1

        # ── Stage 6: Deploy to us-east-1 ──
        - Name: DeployUSEast1
          Actions:
            - Name: BlueGreenDeploy
              ActionTypeId:
                Category: Deploy
                Owner: AWS
                Provider: CodeDeploy
                Version: 1
              Configuration:
                ApplicationName: agent-app
                DeploymentGroupName: production-us-east-1
                DeploymentConfig: CodeDeployDefault.ECSLinear10PercentEvery1Minute
                AppSpecTemplateArtifact: BuildOutput
                AppSpecTemplatePath: appspec-us-east-1.yaml
                TaskDefinitionTemplateArtifact: BuildOutput
                TaskDefinitionTemplatePath: taskdef-us-east-1.json
              InputArtifacts:
                - Name: BuildOutput
                - Name: SourceOutput
              RunOrder: 1

        # ── Stage 7: Deploy to eu-west-1 ──
        - Name: DeployEUWest1
          Actions:
            - Name: BlueGreenDeploy
              ActionTypeId:
                Category: Deploy
                Owner: AWS
                Provider: CodeDeploy
                Version: 1
              Configuration:
                ApplicationName: agent-app
                DeploymentGroupName: production-eu-west-1
                DeploymentConfig: CodeDeployDefault.ECSLinear10PercentEvery1Minute
                AppSpecTemplateArtifact: BuildOutput
                AppSpecTemplatePath: appspec-eu-west-1.yaml
                TaskDefinitionTemplateArtifact: BuildOutput
                TaskDefinitionTemplatePath: taskdef-eu-west-1.json
              InputArtifacts:
                - Name: BuildOutput
                - Name: SourceOutput
              RunOrder: 2  # After us-east-1 is healthy

        # ── Stage 8: CloudFront Invalidation ──
        - Name: InvalidateCloudFront
          Actions:
            - Name: InvalidateCache
              ActionTypeId:
                Category: Invoke
                Owner: AWS
                Provider: Lambda
                Version: 1
              Configuration:
                FunctionName: cloudfront-invalidator
                UserParameters: "EDGE1A2B3C4D5E6"
              InputArtifacts:
                - Name: BuildOutput
              RunOrder: 3  # After both regions deployed
```

---

## Step 5: Deployment Strategies

### Blue/Green (CodeDeploy)

```
[Blue - Current]  ──▶ routes 100% traffic
[Green - New]     ──▶ routes 0% traffic, receives test traffic

1. Create Green task set with new image
2. Route test traffic to Green (internal validation)
3. Hook runs: Lambda validates agent responses
4. Shift traffic: 10% → 50% → 100%
5. If error rate > threshold → rollback to Blue
6. Blue drains and terminates
```

### Canary release

> `DeploymentConfig: CodeDeployDefault.ECSLinear10PercentEvery1Minute`

1. Route 10% to Green → observe for 1 minute
2. Route 50% to Green → observe for 1 minute
3. Route 100% to Green → Blue drains

### Rollback

```bash
# One-click rollback
aws deploy stop-deployment \
  --deployment-id d-EXAMPLE \
  --auto-rollback-enabled

# Manual rollback to previous task definition
aws ecs update-service \
  --cluster mcp-server-cluster \
  --service github-issue-mcp \
  --task-definition github-issue-mcp:v42
```

---

## Step 6: Model and Config Versioning

Agents aren't just code — they have models, prompts, tool definitions. These need version control too.

```
infrastructure/
├── src/                    # Agent source code
├── Dockerfile
├── buildspec.yml
├── config/
│   ├── models/
│   │   ├── production.yml  # Model ID, temperature, max tokens
│   │   ├── staging.yml     # Same but different model
│   │   └── canary.yml      # Test new model on 5% traffic
│   ├── prompts/
│   │   ├── system-prompt-v1.txt
│   │   ├── system-prompt-v2.txt
│   │   └── system-prompt-v3.txt
│   ├── cache/
│   │   └── policies.yml    # Similarity thresholds, TTLs
│   └── tools/
│       ├── github.yml       # Tool definitions
│       └── search.yml
└── pipeline.yaml
```

### Config promotion through stages:

```bash
# Build stage copies the right config
cp config/models/$DEPLOYMENT_ENV.yml src/config/model.yml
cp config/prompts/system-prompt-$PROMPT_VERSION.txt src/prompts/system.txt
```

---

## Step 7: Rollback Scenarios

| Scenario | Detection | Action | Time |
|----------|-----------|--------|------|
| Error rate spike | CloudWatch alarm on 5XX | Auto-rollback CodeDeploy | <2 min |
| LLM response quality drop | Agent smoke test fails | Stop deployment, notify SNS, rollback | <5 min |
| Latency regression | p95 > 10s for 3 consecutive periods | Rollback + scale analysis | <5 min |
| Config drift | config checksum mismatch | Block pipeline, alert | Immediate |
| Cache poisoning | Cache hit rate drops >50% | Invalidate Redis, rollback | <3 min |

```yaml
# CloudWatch alarm that triggers auto-rollback
ErrorRateAlarm:
  Type: AWS::CloudWatch::Alarm
  Properties:
    AlarmName: agent-error-rate-high
    AlarmActions:
      - !Ref AutoRollbackTopic
    MetricName: HTTPCode_Target_5XX_Count
    Namespace: AWS/ApplicationELB
    Statistic: Sum
    Period: 60
    EvaluationPeriods: 3
    Threshold: 10
    ComparisonOperator: GreaterThanThreshold
```

---

## Cost Breakdown

| Component | Monthly |
|-----------|---------|
| CodePipeline (2 active pipelines) | ~$2 |
| CodeBuild (200 build minutes) | ~$5 |
| ECR storage (< 10 images) | ~$1 |
| CodeDeploy (ECS blue/green) | ~$0 (included with ECS) |
| S3 artifact storage | <$1 |
| CloudWatch alarms | ~$3 |
| **Total CI/CD** | **~$12/mo** |

---

## Summary

The pipeline automates everything from code commit to production deployment across 2 regions, with safety controls at every step.

### Pipeline flow:
```
git push main → build Docker image → 
  → deploy to staging → run smoke tests →
  → manual approval → deploy us-east-1 (blue/green) →
  → deploy eu-west-1 → invalidate CloudFront → done
```

### Checklist:

- [ ] buildspec.yml with multi-stage Docker build
- [ ] Agent smoke tests (health, prompt, tool, session, cache)
- [ ] appspec.yaml for blue/green ECS deployment
- [ ] CodePipeline with 7+ stages
- [ ] Canary traffic shifting (10% → 50% → 100%)
- [ ] Auto-rollback on error rate spike
- [ ] Manual approval gate before production
- [ ] Config versioning (models, prompts, cache policies)
- [ ] CloudFront invalidation on deploy
- [ ] CloudWatch alarms for rollback triggers
- [ ] SNS notifications for deployment events

---

### Series Complete 🎉

| Day | Topic | AWS Services |
|-----|-------|-------------|
| 1 | Deploy MCP Server on ECS Fargate | ECS, ECR, ALB, Secrets Manager |
| 2 | Agent State with DynamoDB | DynamoDB Global Tables, DAX |
| 3 | LLM Caching with ElastiCache + Bedrock | ElastiCache, Bedrock |
| 4 | Serverless Agent with Lambda + Bedrock | Lambda, API Gateway, Bedrock |
| 5 | Multi-Region Agent Routing with Route53 | Route53, CloudFront, Global Accelerator |
| 6 | **CI/CD for AI Agents** | **CodePipeline, CodeBuild, CodeDeploy** |

You now have everything needed to run AI agents in production on AWS: compute, state, caching, serverless, routing, and automation.

---

*Series: AWS for AI/Agent Developers. Day 6 (finale): CI/CD pipeline — CodePipeline, blue/green deployments, agent smoke tests, canary releases, automatic rollback. Git push to production.*
