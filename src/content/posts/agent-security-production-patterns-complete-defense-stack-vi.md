---
title: "Agent Security 2026: Production Security Patterns — Complete Agent Defense Stack"
description: "Bài cuối series Agent Security: cách assemble mọi thứ vào production defense stack. Defense in depth cho AI agents, 7-layer security architecture, incident response cho agent breaches, monitoring và production deployment hoàn chỉnh."
published: 2026-06-06
pubDate: 2026-06-06T00:15:00.000Z
slug: agent-security-production-patterns-complete-defense-stack-vi
tags:
  - agent-security
  - defense-in-depth
  - production
  - monitoring
  - incident-response
  - architecture
  - patterns
category: agent-security
lang: vi
series:
  name: "Agent Security 2026 — Production Patterns"
  order: 5
  total: 5
---

Đây là bài cuối.

4 bài trước covered prompt injection, tool access control, MCP server security, compliance auditing. Mỗi bài là một layer. Bài này show cách **stack chúng** vào một production defense system hoàn chỉnh.

Security cho AI agents không về single technique. Nó về **defense in depth** — nhiều layers catch failures ở mỗi level.

---

## 7-Layer Agent Defense Stack

```
User Message
    │
    ▼
L1: Input Guardrails → detect injection, PII, PCI
    │ Pass? ─── Block → Log + Alert
    ▼
L2: Agent Reasoning (system prompt + steering)
    │
    ▼
L3: Tool Call Validator → params, context, sequence
    │ Pass? ─── Block → Log + Alert
    ▼
L4: MCP Server Security → transport auth, rate limiting
    │
    ▼
L5: Tool Execution → isolated process, resource limits
    │
    ▼
L6: Output Guardrails → PII leak, hallucination risk
    │ Pass? ─── Block → Log + Retry
    ▼
L7: Audit & Monitoring → trail, anomaly, incident response
    │
    ▼
Response to User
```

---

## L1: Input Guardrails

```python
class InputGuardrail:
    async def process(self, message, context):
        checks = {
            "prompt_injection": await self.detect_injection(message),
            "pii": await self.detect_pii(message),
            "pci": await self.detect_pci(message),
            "content_safety": await self.check_content_safety(message),
        }
        critical = [n for n, r in checks.items() if not r.passed and r.severity == "critical"]
        if critical:
            await self.alert_security_team(...)
            return Blocked(reason=critical)
        message = self.redact_pii(message)
        return Passed(sanitized=message)
```

---

## L3: Tool Call Validator (Production)

```python
TOOL_POLICIES = {
    "query_database": {
        "allowed_for": ["support", "engineering"],
        "max_calls": 50,
        "forbidden_tables": ["secrets", "credentials"],
        "require_approval": False,
    },
    "deploy_service": {
        "allowed_for": ["engineering"],
        "allowed_environments": ["staging"],
        "require_approval": True,  # Production needs human
    },
    "delete_records": {
        "allowed_for": [],  # No agent can call directly
        "require_human_initiated": True,
    },
}
```

---

## L5: Tool Execution Isolation

```python
class IsolatedToolExecutor:
    async def execute(self, tool_name, params, credentials):
        with tempfile.TemporaryDirectory() as workdir:
            setrlimit(RLIMIT_AS, 256MB)    # 256MB memory
            setrlimit(RLIMIT_CPU, 30)       # 30s CPU
            setrlimit(RLIMIT_NOFILE, 100)   # 100 file descriptors
            
            proc = await create_subprocess_exec(
                "tool_executor", tool_name,
                cwd=workdir, preexec_fn=os.setsid,
            )
            # Timeout 30s → kill process group
```

---

## L6: Output Guardrails

```python
class OutputGuardrail:
    async def process(self, response):
        checks["pii_leak"] = check_pii(response)          # Don't expose data
        checks["hallucination"] = score_hallucination(response)
        checks["data_exposure"] = check_raw_dumps(response)  # No raw DB exports
        
        if any critical fails:
            return Blocked("I can't provide that response due to security policy.")
```

---

## Anomaly Detection Rules

- Tool call frequency spike > 3× historical average
- Unusual tool sequence (e.g., query → delete without verify)
- Cost anomaly > $10/min
- Suspicious parameter values (SQL injection patterns, path traversal)
- Repeated guardrail failures > 5 in 10 minutes

---

## Incident Response

```python
class AgentIncidentResponder:
    async def respond(self, incident):
        # 1. Contain: stop agent, revoke tokens, revoke credentials
        # 2. Investigate: full audit trail, identify compromised tools
        # 3. Assess damage: what data was accessed
        # 4. Report: timeline, tools, exposed data
        # 5. Remediate: apply security patches
```

---

## What We've Built (Series Summary)

| Bài | Layer | Key Techniques |
|-----|-------|----------------|
| 1 | Prompt Injection Defense | 5-layer defense, prompt fences, guardrails |
| 2 | Tool Access Control | Least privilege, context validation, human-in-loop |
| 3 | MCP Server Security | Transport auth, JWT, rate limiting, cost protection |
| 4 | Auditing & Compliance | Audit trails, SOC2, GDPR, PCI, retention |
| 5 | **Production Defense Stack** | 7-layer defense, monitoring, incident response |

---

## Production Checklist

- [ ] All 7 layers implemented và tested
- [ ] Input guardrails block injection/PII/PCI
- [ ] Tool policies defined cho mọi MCP tool
- [ ] Tool execution trong isolated processes
- [ ] Output guardrails prevent data leakage
- [ ] Real-time monitoring với anomaly detection
- [ ] Incident response playbook
- [ ] Complete audit trail (hash chain)
- [ ] Security team alerted on critical events
- [ ] Cost tracking + anomaly detection
- [ ] Tests cho mọi layer

---

*Series: Agent Security 2026 — Production Patterns. Bài 5 (final): Complete Agent Defense Stack.*
