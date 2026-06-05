---
title: "Agent Security 2026: Agent Auditing & Compliance — SOC2, GDPR và PCI cho AI Agents"
description: "Cách audit AI agents cho compliance frameworks. Audit trails, conversation logging, explainability, data retention, PII handling, SOC2 controls cho agents, GDPR right to explanation và PCI compliance cho agent payment processing."
published: 2026-06-04
pubDate: 2026-06-04T23:50:00.000Z
slug: agent-security-auditing-compliance-soc2-gdpr-pci-ai-agents-vi
tags:
  - agent-security
  - auditing
  - compliance
  - soc2
  - gdpr
  - pci
  - audit-trail
  - production
category: agent-security
lang: vi
series:
  name: "Agent Security 2026 — Production Patterns"
  order: 4
  total: 5
---

Agent đưa ra quyết định mà không auditable là liability.

Khi agent xử lý payment, modify database, gửi email — và có gì sai — bạn cần biết chính xác chuyện gì xảy ra. Agent nào. Tool nào. Parameters gì. Context gì dẫn đến quyết định. Ai approved (nếu có human). Agent đã nghĩ gì khi đưa ra quyết định.

Đây là compliance layer. Và nó là phần khó nhất khi deploy agents trong regulated environments.

---

## Ba Compliance Frameworks

| Framework | Yêu cầu | Tại sao Agents khó |
|-----------|---------|-------------------|
| **SOC 2** | Controls security, availability, processing integrity | Agent decisions non-deterministic |
| **GDPR** | Right to explanation, data minimization, deletion | Agents ingest data opaque ways |
| **PCI DSS** | Cardholder data protection, audit trails | Agents may log payment data inadvertently |

---

## Pillar 1: Audit Trails

### Agent Audit Record

```python
@dataclass
class AgentAuditRecord:
    audit_id: str
    agent_id: str
    agent_version: str            # Prompt version, steering file hash
    session_id: str
    user_id: str
    timestamp: datetime
    raw_input: str                # Original, encrypted
    sanitized_input: str          # PII-redacted
    tool_calls: list[dict]        # Tool name, params, result
    raw_output: str               # Encrypted
    sanitized_output: str         # PII-redacted
    contains_pii: bool
    contains_pci: bool
    human_approvals: list[dict]
    prev_hash: str                # Hash chain for immutability
    hash: str
```

### What to Log

| Event | Log | Retention |
|-------|-----|-----------|
| Session start | Agent version, user, session ID | 90 days |
| User message | Raw + sanitized | 90 days (raw PII: 30) |
| Tool call | Tool, params, result | 90 days |
| Tool call approval | Approver, timestamp | 7 years (regulated) |
| Guardrail trigger | Guardrail, action | 1 year |
| Session end | Summary, cost | 90 days |

---

## Pillar 2: Explainability

```python
class ReasoningCapturer:
    def capture_thinking(self, thought):
        self.reasoning_log.append({"type": "thought", "content": thought})
    
    def capture_tool_decision(self, tool, args):
        self.reasoning_log.append({"type": "tool_decision", "tool": tool})
    
    def get_explainability_report(self):
        # Generate human-readable explanation
        # Chain of thought + why each tool was called
```

### GDPR Right to Explanation

```python
async def generate_explanation(user_id, session_id):
    records = await audit.get_session_trail(session_id)
    return {
        "automated_decision": {"made": True, "logic": "LLM with tool access"},
        "decision_sequence": [
            {"input": r.sanitized_input, "tools": [t["tool"] for t in r.tool_calls]}
            for r in records
        ]
    }
```

---

## Pillar 3: PII/PCI Data Handling

```python
class PIIHandler:
    # Regex patterns: email, phone, SSN, credit card
    # NLP-based: Presidio Analyzer
    
    async def process_input(self, text):
        # 1. Fast regex detection
        # 2. NLP-based detection
        # 3. Redact with Presidio Anonymizer
        # 4. PCI: never store full PAN, only last 4 digits
```

### Data Retention

| Type | Standard | PII | PCI |
|------|----------|-----|-----|
| Conversation | 90 days | 30 days | 0 days (never store raw) |
| Tool calls | 90 days | 90 days | 365 days |
| Audit | 365 days | 365 days | 7 years |

---

## Pillar 4: SOC 2 Controls

| SOC 2 Criterion | Agent Control |
|----------------|--------------|
| CC6.1 Logical access | MCP server auth (API key + JWT) |
| CC6.6 Incident detection | Injection guardrails |
| CC7.2 Monitoring | Full audit logging |
| CC8.1 Change management | Prompt versioning (Git PR) |
| A1.2 Processing integrity | Tool call validation |

---

## Pillar 5: PCI Compliance

```python
class PCIComplianceLayer:
    async def process_payment(self, params):
        # PCI 3.4: Never log full card numbers
        params["card_number"] = f"****-****-****-{pan[-4:]}"
        # Send full PAN directly to processor, never store
        
        # PCI 10.2: Audit trail (no PAN, no CVV, no expiry)
        await self.pci_audit_log.append({
            "event": "payment_processed",
            "card_last_four": pan[-4:],
            "amount": params["amount"],
        })
```

---

## Production Checklist

- [ ] Mọi interaction có audit record đầy đủ
- [ ] Audit records encrypted at rest
- [ ] Hash chains cho immutability
- [ ] PII detected và redacted trước khi store
- [ ] PCI card data never stored (only last 4 digits)
- [ ] Reasoning traces captured cho explainability
- [ ] GDPR right to explanation endpoint
- [ ] GDPR right to erasure anonymizes
- [ ] Data retention policies applied automatically
- [ ] SOC 2 evidence collectable on demand
- [ ] Audit logs append-only

---

## Tiếp Theo

| Bài | Chủ đề |
|-----|--------|
| 1 | Prompt Injection & Defense |
| 2 | Tool Access Control |
| 3 | MCP Server Security |
| 4 | **Agent Auditing & Compliance** (bài này) |
| 5 | Production Security Patterns — coming next |

---

*Series: Agent Security 2026 — Production Patterns. Bài 4: Agent Auditing & Compliance.*
