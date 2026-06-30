---
title: "AWS cho AI/Agent Developers — Day 5: Multi-Region Agent Routing với Route53"
description: "Route agent tới region gần nhất. Latency-based routing, active-passive failover, CloudFront edge caching, Global Accelerator cho TCP/UDP."
published: 2026-06-30
pubDate: 2026-06-30T02:00:00.000Z
slug: aws-for-ai-agent-developers-multi-region-agent-routing-vi
tags:
  - aws
  - route53
  - multi-region
  - cloudfront
  - global-accelerator
  - high-availability
  - dns
  - failover
category: aws
lang: vi
series:
  name: "AWS for AI/Agent Developers"
  order: 5
  total: 6
---

Agent chạy một region. User ở khắp nơi. Latency giết trải nghiệm — LLM call 2s từ us-east-1 ổn, nhưng từ Đông Nam Á thành 4s. Thêm DNS, TLS, network hops → mất user.

Hôm nay build multi-region routing:

- **Route53 latency-based** — DNS resolve tới region gần user nhất
- **Active-passive failover** — us-east-1 die → eu-west-1 tự tiếp quản
- **CloudFront** — cache agent responses tại 450+ edge locations
- **Global Accelerator** — TCP/UDP agents không xài được DNS routing

```
                    Route53
                   /        \
           us-east-1      eu-west-1
           (Primary)      (Secondary)
              │                │
           ALB ─── DynamoDB Global Tables ─── ALB
              │                                │
           ECS Fargate                    ECS Fargate
```

---

## Step 1: Deploy Agent ở 2 Region

Copy infrastructure từ Days 1-4, deploy lên us-east-1 và eu-west-1.

```bash
# us-east-1 (primary)
aws ecs create-service --cluster mcp-server-cluster --region us-east-1 ...

# eu-west-1 (secondary)
aws ecs create-service --cluster mcp-server-cluster --region eu-west-1 ...
```

**State:** DynamoDB Global Tables từ Day 2 tự replicate. **Cache:** ElastiCache là regional — khi failover, session đọc từ DynamoDB (chậm hơn tí nhưng vẫn chạy).

---

## Step 2: Route53 Latency-Based

```bash
# Tạo record latency-based cho us-east-1 (PRIMARY)
aws route53 change-resource-record-sets \
  --hosted-zone-id ZONE_ID \
  --change-batch '{
    "Changes": [
      {
        "Action": "CREATE",
        "ResourceRecordSet": {
          "Name": "agent.yourdomain.com.",
          "Type": "A",
          "SetIdentifier": "us-east-1",
          "Region": "us-east-1",
          "Failover": "PRIMARY",
          "AliasTarget": {
            "HostedZoneId": "<alb-zone-id>",
            "DNSName": "<alb-dns>",
            "EvaluateTargetHealth": true
          },
          "HealthCheckId": "<health-check-us>"
        }
      },
      {
        "Action": "CREATE",
        "ResourceRecordSet": {
          "Name": "agent.yourdomain.com.",
          "Type": "A",
          "SetIdentifier": "eu-west-1",
          "Region": "eu-west-1",
          "Failover": "SECONDARY",
          "AliasTarget": {
            "HostedZoneId": "<alb-zone-id>",
            "DNSName": "<alb-dns>",
            "EvaluateTargetHealth": true
          },
          "HealthCheckId": "<health-check-eu>"
        }
      }
    ]
  }'
```

### Health Checks

```bash
aws route53 create-health-check \
  --health-check-config '{
    "Type": "HTTPS",
    "FullyQualifiedDomainName": "<alb-dns-us-east-1>",
    "Port": 443,
    "ResourcePath": "/health",
    "RequestInterval": 30,
    "FailureThreshold": 3
  }'
```

3 lần fail → Route53 chuyển traffic sang eu-west-1 trong ~90s.

---

## Step 3: CloudFront Edge Caching

```bash
aws cloudfront create-distribution \
  --origin-domain-name "agent.yourdomain.com" \
  --default-cache-behavior '{
    "ViewerProtocolPolicy": "redirect-to-https",
    "MinTTL": 60,
    "DefaultTTL": 300,
    "MaxTTL": 3600
  }'
```

**Cache ở edge:** docs, FAQ, tool schemas, health checks. **Không cache:** user-specific prompts, write operations, WebSocket.

---

## Step 4: Global Accelerator cho TCP/UDP

DNS failover mất 30-60s (TTL). Global Accelerator dùng Anycast IP—<1s failover.

```bash
aws globalaccelerator create-accelerator --name agent-global-accelerator

# Tạo listener port 443 TCP
aws globalaccelerator create-listener \
  --accelerator-arn <arn> \
  --port-ranges '[{"FromPort":443,"ToPort":443}]' \
  --protocol TCP

# Add us-east-1 và eu-west-1 làm endpoints
aws globalaccelerator create-endpoint-group \
  --listener-arn <arn> \
  --endpoint-group-region us-east-1 \
  --endpoint-configurations '[{"EndpointId":"<alb-arn>","Weight":100}]'
```

| | Route53 | Global Accelerator |
|---|---|---|
| Failover | 30-60s | <1s |
| Protocol | HTTP/HTTPS | TCP/UDP + HTTP |
| Cost | ~$7/mo | ~$18/mo |

---

## Step 5: Client-Side Region Detection

```typescript
const client = {
  async detectRegion() {
    const regions = ["us-east-1", "eu-west-1", "ap-southeast-1"];
    const latencies = await Promise.all(regions.map(async r => {
      const start = Date.now();
      await fetch(`https://agent-${r}.yourdomain.com/ping`);
      return { region: r, latency: Date.now() - start };
    }));
    return latencies.sort((a,b) => a.latency - b.latency)[0].region;
  },

  async ask(prompt: string) {
    const region = await this.detectRegion();
    return fetch(`https://agent-${region}.yourdomain.com/agent`, {
      method: "POST",
      body: JSON.stringify({ prompt, sessionId: this.sessionId, currentRegion: region }),
    });
  },
};
```

---

## Chi phí DR

| Component | Monthly |
|-----------|---------|
| Second region (ECS + ALB) | ~$55 |
| Global Tables replication | ~$20-40 |
| Route53 + health checks | ~$7 |
| CloudFront | ~$5 |
| Global Accelerator (optional) | ~$18 |
| **Tổng** | **~$87-125/tháng** |

So với single region ~$69/mo → ×1.5-2×. Đáng nếu downtime cost > $4/ngày.

---

## Checklist

- [ ] Agent deployed ở 2+ regions
- [ ] DynamoDB Global Tables (Day 2)
- [ ] Route53 latency records
- [ ] Health checks (/health)
- [ ] Active-passive failover
- [ ] CloudFront distribution
- [ ] Global Accelerator (optional)
- [ ] Failover test script
- [ ] Client-side region detection
- [ ] Budget cho second region

---

| Day | Chủ đề |
|-----|--------|
| 1 | Deploy MCP Server lên ECS Fargate ✅ |
| 2 | Agent State với DynamoDB Global Tables ✅ |
| 3 | LLM Caching với ElastiCache + Bedrock ✅ |
| 4 | Serverless Agent với Lambda + Bedrock ✅ |
| 5 | **Multi-Region Agent Routing với Route53 ✅** |
| 6 | CI/CD cho AI Agents với CodePipeline |

---

*Series: AWS cho AI/Agent Developers. Day 5: Multi-region routing — Route53 latency/failover, CloudFront edge caching, Global Accelerator.*
