---
title: "Agent Security 2026: Tool Access Control — Least Privilege cho AI Agents"
description: "Cách bảo vệ tool access cho AI agents trong production. Least privilege principles, MCP server scoping, tool call validation, parameter whitelisting, credential management và production patterns cho securing agent tool access."
published: 2026-06-03
pubDate: 2026-06-03T05:20:00.000Z
slug: agent-security-tool-access-control-least-privilege-mcp-scoping-vi
tags:
  - agent-security
  - tool-access
  - least-privilege
  - mcp
  - credential-management
  - production
  - authorization
category: agent-security
lang: vi
series:
  name: "Agent Security 2026 — Production Patterns"
  order: 2
  total: 5
---

Agent với unrestricted tool access là vũ khí đã lên đạn.

Bài trước covered prompt injection — cách attacker làm agent làm điều không nên. Bài này covers nửa kia: **khi agent hành động thiện chí nhưng có quá nhiều quyền.** Bug trong tool routing, MCP server quá permissive, hoặc thiếu parameter validation có thể gây damage hơn bất kỳ injection attack nào.

Trong production, tool access control theo nguyên tắc đã dẫn dắt software security 50 năm: **least privilege.** Cho agent đúng tools nó cần, không hơn. Scope mỗi tool đến minimum set of actions. Validate mọi call. Rotate credentials aggressively.

---

## Vấn Đề: Agents Quá Powerful

```python
# Dở: Một MCP server với tất cả
agent = Agent(mcp_servers=[{"name": "super-mcp", ...}])
# Exposes 30 tools: read/write DB, deploy, email, admin...
```

Agent có access 30 tools. Nó dùng 5 tools thường xuyên. 25 tools còn lại là attack surface.

### Threat Model

```
Agent bị compromised (injection)
    → Agent gọi dangerous tool
    → Tool execute với credentials của MCP server
    → Blast radius = whatever MCP server's credentials allow
```

---

## Principle 1: One MCP Server, One Responsibility

```python
# Tốt: Split MCP servers
agent = Agent(mcp_servers=[
    {
        "name": "read-only-db",
        "env": {"DATABASE_URL": os.getenv("READ_ONLY_DB_URL")}
        # Read-only credentials. Không write access.
    },
    {
        "name": "github-pr",
        "env": {"GITHUB_TOKEN": os.getenv("GITHUB_PR_TOKEN")}
        # Token scoped to pull requests only
    },
])
```

### MCP Server Credential Scoping

| Server | Minimum Credential | Default Risk |
|--------|-------------------|-------------|
| Database | Read-only user, specific tables | Full admin → critical risk |
| GitHub | Fine-grained PAT: contents:read | Full repo → full access |
| File system | Specific directory | Home dir → full home |
| Cloud | Single-service, read-only role | Admin role → everything |
| Slack | Channel-scoped bot token | Workspace token → all channels |

---

## Principle 2: Scope Tools trong MCP Servers

```python
class DatabaseMCPServer:
    def __init__(self, access_level: str):
        self.access_level = access_level  # "readonly" | "write" | "admin"
    
    def register_tools(self, mcp):
        @mcp.tool()
        async def query_database(sql: str) -> list[dict]:
            if not sql.strip().upper().startswith("SELECT"):
                raise PermissionError("Only SELECT allowed")
        
        if self.access_level in ("write", "admin"):
            @mcp.tool()
            async def insert_record(table: str, data: dict) -> int:
                if table in ("users", "payments"):
                    raise PermissionError(f"Cannot insert into {table}")
```

Agent routing based on role:

```python
def get_server_for_agent(agent_role: str):
    if agent_role == "support": return readonly_db
    elif agent_role == "engineer": return write_db
    elif agent_role == "admin": return admin_db
    else: return readonly_db  # Default: read-only
```

---

## Principle 3: Validate Every Tool Call at Runtime

### Parameter-Level Validation

```python
TOOL_RULES = {
    "query_database": {
        "forbidden_tables": ["secrets", "credentials", "audit_log"],
        "max_results": 1000,
    },
    "send_email": {
        "allowed_domains": ["company.com"],
        "max_recipients": 10,
    },
    "deploy_service": {
        "forbidden_services": ["production-api"],
        "require_human_approval": True,
    },
}
```

### Context-Aware Validation

```python
class ContextAwareValidator:
    def is_expected_tool(self, tool_name: str, context):
        """Tool call phải hợp lý với conversation."""
        if tool_name == "delete_user" and context.last_tool != "verify_identity":
            return False  # Phải verify identity trước khi delete
```

---

## Principle 4: Credential Management

```python
class CredentialManager:
    rotation_schedule = {
        "database": timedelta(hours=1),
        "github": timedelta(hours=2),
        "cloud_api": timedelta(minutes=30),
    }
    
    def get_credential(self, service, agent_id, session_id):
        # Generate scoped, short-lived token
        if service == "database":
            return self.generate_db_token(
                username=f"agent_{agent_id[:8]}",
                database="readonly",
                ttl=self.rotation_schedule["database"],
            )
    
    def revoke_session_credentials(self, session_id):
        for token in self.issued_tokens[session_id]:
            self.revoke_token(token)
```

---

## Principle 5: Human-in-the-Loop cho Dangerous Actions

```python
APPROVAL_REQUIRED_TOOLS = [
    "deploy_production", "delete_user_account",
    "modify_billing", "grant_admin_access",
    "bulk_email", "database_migration",
]

async def request_approval(tool_name, params, agent_reasoning):
    # Send to approval queue
    # Wait 5 minutes for human response
    # If timeout → alert team, return False
```

---

## Production Checklist

- [ ] MCP servers split by responsibility
- [ ] Mỗi MCP server chạy với minimum required credentials
- [ ] Credentials scoped (read-only, specific tables)
- [ ] Tool-level access control based on agent role
- [ ] Parameter validation trên mọi tool call
- [ ] Context-aware validation (expected sequences)
- [ ] Credentials rotated aggressively
- [ ] Human approval gate cho dangerous tools
- [ ] Output validation trên mọi tool result
- [ ] Mọi tool call logged với agent_id, session_id
- [ ] Tool access test suite trong CI
- [ ] Default: deny. Explicitly allow.

---

## Tiếp Theo

| Bài | Chủ đề |
|-----|--------|
| 1 | Prompt Injection & Defense |
| 2 | **Tool Access Control** (bài này) |
| 3 | MCP Server Security |
| 4 | Agent Auditing & Compliance |
| 5 | Production Security Patterns |

---

*Series: Agent Security 2026 — Production Patterns. Bài 2: Tool Access Control — least privilege cho AI agents.*
