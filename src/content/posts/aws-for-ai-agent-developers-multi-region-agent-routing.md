---
title: "AWS for AI/Agent Developers — Day 5: Multi-Region Agent Routing with Route53"
description: "Route agents to the nearest healthy region. Latency-based routing, active-passive failover, CloudFront edge caching for agent responses, and Global Accelerator for TCP/UDP agents."
published: 2026-06-30
pubDate: 2026-06-30T02:00:00.000Z
slug: aws-for-ai-agent-developers-multi-region-agent-routing
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
lang: en
series:
  name: "AWS for AI/Agent Developers"
  order: 5
  total: 6
---

Your agent runs in one region. Users everywhere. Latency kills the experience — a 2-second LLM call from us-east-1 feels fine locally, but from Southeast Asia it's 4 seconds. Add DNS resolution, TLS negotiation, network hops, and you've lost the user.

Today we build multi-region routing for agents:

- **Route53 latency-based routing** — DNS resolves to the region with lowest latency for each user
- **Active-passive failover** — if us-east-1 goes down, traffic shifts to eu-west-1
- **CloudFront** — cache agent responses at 450+ edge locations, not just 3 AWS regions
- **Global Accelerator** — TCP/UDP traffic for agents that can't use DNS-based routing

```
                         ┌─────────────────────────┐
                         │      Route53            │
                         │  Latency-based DNS      │
                         │  Health checks          │
                         │  Failover policies      │
                         └────┬──────────┬─────────┘
                              │          │
                    ┌─────────┘          └─────────┐
                    ▼                               ▼
           ┌────────────────┐             ┌────────────────┐
           │  us-east-1     │             │  eu-west-1     │
           │  (Primary)     │             │  (Secondary)   │
           │                │             │                │
           │  ┌──────────┐  │             │  ┌──────────┐  │
           │  │ ALB      │  │             │  │ ALB      │  │
           │  │ Agent    │  │             │  │ Agent    │  │
           │  │ Service  │  │             │  │ Service  │  │
           │  └──────────┘  │             │  └──────────┘  │
           │                │             │                │
           │  DynamoDB      │  ◄────►     │  DynamoDB      │
           │  Global Table  │             │  Global Table  │
           └────────────────┘             └────────────────┘
                              │
                              │
                    ┌─────────▼──────────┐
                    │  CloudFront (CDN)  │
                    │  450+ edge nodes   │
                    │  Cache agent GET   │
                    │  responses         │
                    └────────────────────┘
```

---

## Step 1: Deploy Agent in Two Regions

You already have the infrastructure from Days 1-4. Deploy it in us-east-1 (primary) and eu-west-1 (secondary).

```bash
# Deploy ECS-based agent in us-east-1 (Day 1)
aws ecs create-service \
  --cluster mcp-server-cluster \
  --service-name github-issue-mcp \
  --task-definition github-issue-mcp \
  --desired-count 2 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-us-east-1a,subnet-us-east-1b],securityGroups=[sg-xxx]}" \
  --load-balancers "targetGroupArn=<tg-arn-us-east-1>,containerName=mcp-server,containerPort=3001" \
  --region us-east-1

# Same thing in eu-west-1
aws ecs create-service \
  --cluster mcp-server-cluster \
  --service-name github-issue-mcp \
  --task-definition github-issue-mcp \
  --desired-count 2 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-eu-west-1a,subnet-eu-west-1b],securityGroups=[sg-yyy]}" \
  --load-balancers "targetGroupArn=<tg-arn-eu-west-1>,containerName=mcp-server,containerPort=3001" \
  --region eu-west-1
```

### State replication

DynamoDB Global Tables already replicate sessions across regions (Day 2). No extra work.

### Cache warming

ElastiCache Redis is regional. In failover, sessions that were in Redis hit DynamoDB instead (a bit slower, but still works).

---

## Step 2: Route53 Latency-Based Routing

### Create agent subdomain

```bash
# Create latency-based record set for us-east-1
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
          "AliasTarget": {
            "HostedZoneId": "'"$(aws elbv2 describe-load-balancers --names mcp-server-alb --region us-east-1 --query 'LoadBalancers[0].CanonicalHostedZoneId' --output text)"'",
            "DNSName": "'"$(aws elbv2 describe-load-balancers --names mcp-server-alb --region us-east-1 --query 'LoadBalancers[0].DNSName' --output text)"'",
            "EvaluateTargetHealth": true
          },
          "Failover": "PRIMARY",
          "HealthCheckId": "'"$HEALTH_CHECK_US"'""
        }
      },
      {
        "Action": "CREATE",
        "ResourceRecordSet": {
          "Name": "agent.yourdomain.com.",
          "Type": "A",
          "SetIdentifier": "eu-west-1",
          "Region": "eu-west-1",
          "AliasTarget": {
            "HostedZoneId": "'"$(aws elbv2 describe-load-balancers --names mcp-server-alb --region eu-west-1 --query 'LoadBalancers[0].CanonicalHostedZoneId' --output text)"'",
            "DNSName": "'"$(aws elbv2 describe-load-balancers --names mcp-server-alb --region eu-west-1 --query 'LoadBalancers[0].DNSName' --output text)"'",
            "EvaluateTargetHealth": true
          },
          "Failover": "SECONDARY",
          "HealthCheckId": "'"$HEALTH_CHECK_EU"'""
        }
      }
    ]
  }'
```

---

## Step 3: Health Checks

Route53 health checks determine whether a region is healthy. If us-east-1 fails, Route53 automatically routes traffic to eu-west-1.

```bash
# Health check for us-east-1 ALB
aws route53 create-health-check \
  --caller-reference "agent-us-east-1-$(date +%s)" \
  --health-check-config '{
    "Type": "HTTPS",
    "FullyQualifiedDomainName": "'"$(aws elbv2 describe-load-balancers --names mcp-server-alb --region us-east-1 --query 'LoadBalancers[0].DNSName' --output text)"'",
    "Port": 443,
    "ResourcePath": "/health",
    "RequestInterval": 30,
    "FailureThreshold": 3,
    "MeasureLatency": true,
    "EnableSNI": true
  }'

# Same for eu-west-1
aws route53 create-health-check \
  --caller-reference "agent-eu-west-1-$(date +%s)" \
  --health-check-config '{
    "Type": "HTTPS",
    "FullyQualifiedDomainName": "'"$(aws elbv2 describe-load-balancers --names mcp-server-alb --region eu-west-1 --query 'LoadBalancers[0].DNSName' --output text)"'",
    "Port": 443,
    "ResourcePath": "/health",
    "RequestInterval": 30,
    "FailureThreshold": 3,
    "MeasureLatency": true,
    "EnableSNI": true
  }'
```

### Calculate your latency budget:

| Hop | us-east-1 | eu-west-1 |
|-----|-----------|-----------|
| Client DNS | 20-50ms | 20-50ms |
| Route53 latency routing | 10ms | 10ms |
| TLS handshake | 30ms | 30ms |
| ALB processing | 5ms | 5ms |
| **LLM call (Bedrock)** | **2-5s** | **2-5s** |
| Tool execution | 200-500ms | 200-500ms |
| DynamoDB read | 5-10ms | 5-10ms |
| Response transfer | 50ms (local) / 200ms (transatlantic) | 50ms |

For users in Asia, us-east-1 adds 150-200ms vs eu-west-1. Route53 picks the closer region automatically.

---

## Step 4: CloudFront for Edge Caching

For agent responses that are cacheable (documentation lookups, static analysis results, common queries), CloudFront can serve from 450+ edge locations instead of routing to your agent infrastructure at all.

```bash
# Create CloudFront distribution pointing to our agent
aws cloudfront create-distribution \
  --origin-domain-name "agent.yourdomain.com" \
  --default-root-object "" \
  --default-cache-behavior '{
    "TargetOriginId": "agent-origin",
    "ViewerProtocolPolicy": "redirect-to-https",
    "AllowedMethods": {
      "Quantity": 2,
      "Items": ["GET", "HEAD"],
      "CachedMethods": {
        "Quantity": 2,
        "Items": ["GET", "HEAD"]
      }
    },
    "ForwardedValues": {
      "QueryString": true,
      "Cookies": { "Forward": "none" },
      "Headers": {
        "Quantity": 1,
        "Items": ["Authorization"]
      }
    },
    "MinTTL": 60,
    "DefaultTTL": 300,
    "MaxTTL": 3600
  }' \
  --enabled \
  --comment "Agent CDN - Cache agent responses at edge"
```

**What to cache at edge vs what to pass through:**

| Cacheable | Not cacheable |
|-----------|---------------|
| Static docs, FAQ responses | Real-time agent reasoning |
| Knowledge base lookups | User-specific prompts |
| Tool schema definitions | Session state changes |
| Health check responses | WebSocket streams |
| Config metadata | Write operations (create, delete) |

---

## Step 5: Global Accelerator for TCP/UDP Agents

Route53 handles DNS routing well, but DNS changes take time to propagate (TTL-dependent). Global Accelerator uses Anycast IPs — traffic enters the AWS network at the closest edge and is routed internally to the optimal region.

This is important for agents that need:
- **Fast failover** (<1s, vs DNS's 30-60s TTL propagation)
- **TCP/UDP protocols** (MCP STDIO alternative transports)
- **Non-HTTP agents** (gRPC, raw TCP sockets)

```bash
# Create Global Accelerator
ACCELERATOR_ARN=$(aws globalaccelerator create-accelerator \
  --name agent-global-accelerator \
  --ip-address-type IPV4 \
  --enabled \
  --query 'Accelerator.AcceleratorArn' --output text)

# Get the two Anycast IPs
aws globalaccelerator describe-accelerator \
  --accelerator-arn $ACCELERATOR_ARN \
  --query 'Accelerator.IpSets[0].IpAddresses'

# Create listener (port 443, TCP)
LISTENER_ARN=$(aws globalaccelerator create-listener \
  --accelerator-arn $ACCELERATOR_ARN \
  --port-ranges '[{"FromPort": 443, "ToPort": 443}]' \
  --protocol TCP \
  --client-affinity NONE \
  --query 'Listener.ListenerArn' --output text)

# Create endpoint group for us-east-1
aws globalaccelerator create-endpoint-group \
  --listener-arn $LISTENER_ARN \
  --endpoint-group-region us-east-1 \
  --traffic-dial-percentage 100 \
  --health-check-port 443 \
  --health-check-protocol HTTPS \
  --health-check-path /health \
  --endpoint-configurations '[{
    "EndpointId": "'"$(aws elbv2 describe-load-balancers --names mcp-server-alb --region us-east-1 --query 'LoadBalancers[0].LoadBalancerArn' --output text)"'",
    "Weight": 100
  }]'

# Same for eu-west-1
aws globalaccelerator create-endpoint-group \
  --listener-arn $LISTENER_ARN \
  --endpoint-group-region eu-west-1 \
  --traffic-dial-percentage 100 \
  --health-check-port 443 \
  --health-check-protocol HTTPS \
  --health-check-path /health \
  --endpoint-configurations '[{
    "EndpointId": "'"$(aws elbv2 describe-load-balancers --names mcp-server-alb --region eu-west-1 --query 'LoadBalancers[0].LoadBalancerArn' --output text)"'",
    "Weight": 50
  }]'
```

**Route53 vs Global Accelerator:**

| Feature | Route53 | Global Accelerator |
|---------|---------|-------------------|
| Protocol | HTTP/HTTPS only | TCP/UDP + HTTP/HTTPS |
| Failover time | 30-60s (DNS TTL) | <1s (Anycast) |
| Latency optimization | DNS-level | Network-level |
| Session persistence | Limited | Client affinity |
| Cost | Included with hosted zone | ~$0.025/hr per accelerator |

---

## Step 6: Full Agent Failover Test

```bash
#!/bin/bash
# failover-test.sh — Test multi-region agent failover

REGION_CHECK_ENDPOINT="agent.yourdomain.com/health"
PRIMARY_REGION="us-east-1"
SECONDARY_REGION="eu-west-1"

echo "=== 1. Normal state: both regions healthy ==="
curl -s -o /dev/null -w "Status: %{http_code}, Latency: %{time_total}s, IP: %{remote_ip}\n" \
  https://agent.yourdomain.com/health

echo ""
echo "=== 2. Get current routing from multiple locations ==="
for endpoint in "us-east-1" "eu-west-1" "ap-southeast-1"
do
  echo "Probing from $endpoint:"
  # Using Route53 resolver to simulate different client locations
  dig agent.yourdomain.com @8.8.8.8 +short
  dig agent.yourdomain.com @1.1.1.1 +short
  dig agent.yourdomain.com @208.67.222.222 +short
done

echo ""
echo "=== 3. Simulate us-east-1 failure ==="
# Block health check access to simulate ALB failure
aws ec2 revoke-security-group-ingress \
  --group-id <alb-sg-us-east-1> \
  --protocol tcp --port 443 \
  --source-group <health-check-sg>

echo "Waiting for Route53 health check to fail (90s)..."
sleep 90
# Kill ALB instances
aws autoscaling set-desired-capacity \
  --auto-scaling-group-name <asg-us-east-1> \
  --desired-capacity 0

echo ""
echo "=== 4. Verify failover to eu-west-1 ==="
curl -s -o /dev/null -w "Status: %{http_code}, Latency: %{time_total}s\n" \
  https://agent.yourdomain.com/health

echo ""
echo "=== 5. Restore us-east-1 ==="
aws autoscaling set-desired-capacity \
  --auto-scaling-group-name <asg-us-east-1> \
  --desired-capacity 2

aws autoscaling update-auto-scaling-group \
  --auto-scaling-group-name <asg-us-east-1> \
  --health-check-type ELB --health-check-grace-period 60

echo "Waiting for health check recovery..."
sleep 60

aws ec2 authorize-security-group-ingress \
  --group-id <alb-sg-us-east-1> \
  --protocol tcp --port 443 \
  --source-group <health-check-sg>

echo ""
echo "=== 6. Verify recovery ==="
curl -s -o /dev/null -w "Status: %{http_code}, Latency: %{time_total}s\n" \
  https://agent.yourdomain.com/health

echo ""
echo "=== Failover test complete ==="
```

---

## Step 7: Client-Side Multi-Region Awareness

For agents that need session awareness across regions (e.g., same conversation, different region), the client sends its region preference:

```typescript
const agentClient = {
  region: await detectClosestRegion(),

  async detectClosestRegion(): Promise<string> {
    // Probe each region endpoint
    const regions = ["us-east-1", "eu-west-1", "ap-southeast-1"];
    const latencies = await Promise.all(
      regions.map(async (region) => {
        const start = Date.now();
        try {
          await fetch(`https://agent-${region}.yourdomain.com/ping`);
          return { region, latency: Date.now() - start };
        } catch {
          return { region, latency: Infinity };
        }
      })
    );
    return latencies.sort((a, b) => a.latency - b.latency)[0].region;
  },

  async tell(prompt: string) {
    const region = this.region;
    const url = `https://agent-${region}.yourdomain.com/agent`;

    return fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt,
        sessionId: this.sessionId,
        currentRegion: region,
      }),
    });
  },
};
```

---

## Cost Breakdown

| Component | Monthly |
|-----------|---------|
| Second region (ECS Fargate, ALB) | ~$55/mo |
| DynamoDB Global Tables replication | ~$20-40/mo |
| Route53 latency records (2 regions) | ~$1/mo |
| Route53 health checks (2 checks × 3 locations) | ~$6/mo |
| CloudFront (10GB, 100K requests) | ~$5/mo |
| Global Accelerator (optional) | ~$18/mo |
| **Total additional for DR** | **~$87-125/mo** |

For a single region agent costing ~$69/mo (from Day 1), adding multi-region DR costs roughly 1.5-2× the base infrastructure. Worth it if agent downtime costs more than ~$4/day.

---

## Summary

| Layer | Technology | Purpose |
|-------|-----------|---------|
| DNS routing | Route53 latency-based | Route to nearest region |
| Failover | Route53 active-passive | Auto-detect and route around failures |
| Edge caching | CloudFront | Serve cacheable responses from 450+ locations |
| Anycast routing | Global Accelerator | TCP/UDP agents, sub-second failover |
| State replication | DynamoDB Global Tables | Session survival across regions |
| Health checks | Route53 health checks | Monitor region health |

### Checklist:

- [ ] Agent infrastructure deployed in 2+ regions
- [ ] DynamoDB Global Tables enabled (Day 2)
- [ ] Route53 latency-based records created
- [ ] Health checks configured (HTTPS /health endpoint)
- [ ] Active-passive failover with PRIMARY/SECONDARY
- [ ] CloudFront distribution for cacheble responses
- [ ] Global Accelerator for TCP/UDP agents (optional)
- [ ] Failover test script run and verified
- [ ] Client-side region detection configured
- [ ] Cost budgeted for second region

---

| Day | Topic |
|-----|-------|
| 1 | Deploy MCP Server on ECS Fargate ✅ |
| 2 | Agent State with DynamoDB Global Tables ✅ |
| 3 | LLM Caching with ElastiCache + Bedrock ✅ |
| 4 | Serverless Agent with Lambda + Bedrock ✅ |
| 5 | **Multi-Region Agent Routing with Route53 ✅** |
| 6 | CI/CD for AI Agents with CodePipeline |

---

*Series: AWS for AI/Agent Developers. Day 5: Multi-region agent routing — Route53 latency-based routing, active-passive failover, CloudFront edge caching, Global Accelerator for TCP/UDP.*
