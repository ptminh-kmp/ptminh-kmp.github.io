---
title: "Agent Security 2026: Tool Access Control — Least Privilege for AI Agents"
description: "How to secure tool access for AI agents in production. Least privilege principles, MCP server scoping, tool call validation, parameter whitelisting, credential management, and production patterns for securing agent tool access."
published: 2026-06-03
pubDate: 2026-06-03T05:20:00.000Z
slug: agent-security-tool-access-control-least-privilege-mcp-scoping
tags:
  - agent-security
  - tool-access
  - least-privilege
  - mcp
  - credential-management
  - production
  - authorization
category: agent-security
lang: en
series:
  name: "Agent Security 2026 — Production Patterns"
  order: 2
  total: 5
---

An agent with unrestricted tool access is a loaded weapon.

Last post covered prompt injection — how attackers make agents do things they shouldn't. This post covers the other half: **when the agent acts in good faith but has too much power.** A bug in tool routing, an overly permissive MCP server, or a missing parameter validation can cause more damage than any injection attack.

In production, tool access control follows the same principle that's guided software security for 50 years: **least privilege.** Give the agent exactly the tools it needs, nothing more. Scope each tool to the minimum set of actions. Validate every call. Rotate credentials aggressively.

---

## The Problem: Agents Are Too Powerful

```python
# Bad: One MCP server with everything
agent = Agent(
    mcp_servers=[{
        "name": "super-mcp",
        "command": "node",
        "args": ["./servers/all-in-one.js"],
        # Exposes 30 tools: read/write DB, manage users, deploy code, 
        # send emails, modify billing, access admin panels...
    }]
)
```

The agent has access to 30 tools. It uses 5 of them regularly. The other 25 are attack surface — any one of them can be invoked by an injection attack or a routing error.

### The Threat Model

```
Agent gets compromised (injection)
    │
    ▼
Agent calls dangerous tool
    │
    ▼
Tool executes with the MCP server's credentials
    │
    ▼
Blast radius = whatever the MCP server's credentials allow
```

The blast radius depends entirely on how you scope your MCP servers and their credentials.

---

## Principle 1: One MCP Server, One Responsibility

```python
# Good: Split MCP servers by responsibility
agent = Agent(
    mcp_servers=[
        {
            "name": "read-only-db",
            "command": "node",
            "args": ["./servers/db-reader.js"],
            "env": {
                "DATABASE_URL": os.getenv("READ_ONLY_DB_URL"),
                # Read-only credentials. No write access.
            }
        },
        {
            "name": "github-pr",
            "command": "node", 
            "args": ["./servers/github-limited.js"],
            "env": {
                "GITHUB_TOKEN": os.getenv("GITHUB_PR_TOKEN"),
                # Token scoped to: pull requests only
                # Not the full GitHub token
            }
        },
        {
            "name": "search-docs",
            "command": "npx",
            "args": ["-y", "@internal/docs-mcp"],
            # No credentials needed. Public docs only.
        }
    ]
)
```

Each MCP server runs with its own credentials, scoped to its specific responsibility. If the agent is compromised, the attacker only gets access to read-only DB and PR operations — not deployment, not billing, not admin.

### MCP Server Credential Scoping Table

| MCP Server | Minimum Credential | What You'd Normally Use | Risk Difference |
|-----------|-------------------|------------------------|-----------------|
| Database | Read-only user, scoped to specific tables | Full admin user | Critical vs read-only |
| GitHub API | Fine-grained PAT: `contents:read`, `pulls:read` | Classic PAT with full `repo` scope | Full repo vs read-only |
| File system | Specific directory only | Home directory | Full home vs sandboxed |
| Email | Send-only API key with rate limit | Admin SMTP credentials | Full inbox vs send-only |
| Cloud provider | Single-service, read-only role | Admin role with full access | Everything vs one service |
| Slack | Channel-scoped bot token | Full workspace token | One channel vs everything |

---

## Principle 2: Scope Tools Within MCP Servers

Even within a single MCP server, not every tool should be available to every agent.

### Tool-Level Scoping

```python
# MCP server with scoped tool registration
class DatabaseMCPServer:
    def __init__(self, access_level: str):
        self.access_level = access_level  # "readonly" | "write" | "admin"
    
    def register_tools(self, mcp):
        # All agents can read
        @mcp.tool()
        async def query_database(sql: str) -> list[dict]:
            """Execute SELECT queries only."""
            if not sql.strip().upper().startswith("SELECT"):
                raise PermissionError("Only SELECT queries allowed")
            return await self.execute(sql)
        
        @mcp.tool()
        async def get_table_schema(table: str) -> dict:
            """Get table structure."""
            return await self.get_schema(table)
        
        # Only agents with write access can modify
        if self.access_level in ("write", "admin"):
            @mcp.tool()
            async def insert_record(table: str, data: dict) -> int:
                """Insert a new record. Limited to non-sensitive tables."""
                if table in ("users", "payments", "audit_log"):
                    raise PermissionError(f"Cannot insert into {table}")
                return await self.insert(table, data)
        
        # Only admin agents can delete
        if self.access_level == "admin":
            @mcp.tool()
            async def delete_records(table: str, where: dict) -> int:
                """Delete records. Requires admin access."""
                return await self.delete(table, where)
```

### Tool Routing Based on Agent Role

```python
# Agent routing to different MCP instances
class MCPRouter:
    """Route agents to the right MCP server instance based on their role."""
    
    def __init__(self):
        self.readonly_db = DatabaseMCPServer("readonly")
        self.write_db = DatabaseMCPServer("write")
        self.admin_db = DatabaseMCPServer("admin")
    
    def get_server_for_agent(self, agent_role: str):
        if agent_role == "support":
            return self.readonly_db  # Read-only for support agents
        elif agent_role == "engineer":
            return self.write_db     # Can write to non-sensitive tables
        elif agent_role == "admin":
            return self.admin_db     # Full access (used rarely)
        else:
            return self.readonly_db  # Default: read-only
```

---

## Principle 3: Validate Every Tool Call at Runtime

Tool definitions are static. Tool calls are dynamic. Validate at call time.

### Parameter-Level Validation

```python
class ToolValidator:
    """Validate tool parameters before execution."""
    
    TOOL_RULES = {
        "query_database": {
            "allowed_schemas": ["public"],
            "forbidden_tables": ["secrets", "credentials", "audit_log"],
            "max_results": 1000,
            "allow_write": False,
        },
        "send_email": {
            "allowed_domains": ["company.com", "client.org"],
            "max_recipients": 10,
            "require_approval_threshold": 100,  # Approve if > 100 recipients
            "forbidden_patterns": [r'@competitor\.com', r'@.*\.ru$'],
        },
        "deploy_service": {
            "allowed_services": ["staging-api", "staging-worker"],
            "forbidden_services": ["production-api", "production-worker"],
            "require_human_approval": True,
        },
        "file_write": {
            "allowed_directories": ["/app/uploads", "/app/tmp"],
            "forbidden_extensions": [".sh", ".exe", ".bat", ".py"],
            "max_file_size_mb": 10,
        },
    }
    
    def validate(self, tool_name: str, params: dict) -> ValidationResult:
        if tool_name not in self.TOOL_RULES:
            return ValidationResult(False, f"Unknown tool: {tool_name}")
        
        rules = self.TOOL_RULES[tool_name]
        
        if "allowed_schemas" in rules:
            schema = params.get("schema", "public")
            if schema not in rules["allowed_schemas"]:
                return ValidationResult(False, f"Schema '{schema}' not allowed")
        
        if "forbidden_tables" in rules:
            table = params.get("table", "")
            if any(t in table for t in rules["forbidden_tables"]):
                return ValidationResult(False, f"Table '{table}' is restricted")
        
        if "max_results" in rules:
            limit = params.get("limit", rules["max_results"])
            if limit > rules["max_results"]:
                return ValidationResult(False, f"Max results: {rules['max_results']}")
        
        if "require_human_approval" in rules and rules["require_human_approval"]:
            return ValidationResult(True, requires_approval=True)
        
        return ValidationResult(True)
```

### Context-Aware Validation

```python
class ContextAwareValidator:
    """Validate tool calls based on conversation context."""
    
    def validate(self, tool_name: str, params: dict, context: ToolContext) -> ValidationResult:
        # Check if this tool call is expected based on conversation history
        if not self.is_expected_tool(tool_name, context):
            return ValidationResult(False, "Unexpected tool call in this context")
        
        # Check if the agent has already called a dangerous tool recently
        if self.is_suspicious_sequence(tool_name, context):
            return ValidationResult(False, "Suspicious tool sequence detected")
        
        # Check rate: too many tool calls in short time?
        if self.exceeds_rate_limit(context.agent_id, tool_name):
            return ValidationResult(False, "Rate limit exceeded for this tool")
        
        return ValidationResult(True)
    
    def is_expected_tool(self, tool_name: str, context: ToolContext) -> bool:
        """A tool call should make sense given the conversation."""
        last_tool = context.last_tool_call
        if tool_name == "delete_user" and last_tool != "verify_identity":
            return False  # Must verify identity before deletion
        if tool_name == "deploy_production" and last_tool != "run_tests":
            return False  # Must run tests before deployment
        return True
    
    def is_suspicious_sequence(self, tool_name: str, context: ToolContext) -> bool:
        """Detect rapid escalation of tool permissions."""
        recent_tools = context.recent_tool_calls(5)
        dangerous_tools = {"delete_*", "drop_*", "deploy_*", "admin_*"}
        dangerous_count = sum(1 for t in recent_tools if any(
            fnmatch.fnmatch(t, pattern) for pattern in dangerous_tools
        ))
        return dangerous_count >= 3  # 3+ dangerous calls in last 5 = suspicious
```

---

## Principle 4: Credential Management — Never Hardcode, Always Rotate

```python
import os
from datetime import datetime, timedelta
from cryptography.fernet import Fernet

class CredentialManager:
    """Manage credentials for MCP servers with auto-rotation."""
    
    def __init__(self):
        self.credentials = self.load_from_vault()
        self.rotation_schedule = {
            "database": timedelta(hours=1),       # 1 hour for DB
            "github": timedelta(hours=2),          # 2 hours for GitHub
            "cloud_api": timedelta(minutes=30),    # 30 min for cloud
            "internal_api": timedelta(days=1),     # 1 day for internal
        }
    
    def get_credential(self, service: str, agent_id: str, session_id: str) -> str:
        """Get a time-limited credential for this specific session."""
        credential = self.credentials[service]
        
        # Generate scoped, short-lived token
        if service == "database":
            return self.generate_db_token(
                username=f"agent_{agent_id[:8]}",
                database="readonly",
                ttl=self.rotation_schedule["database"],
            )
        elif service == "github":
            return self.generate_github_token(
                permissions=["contents:read", "pulls:read"],
                ttl=self.rotation_schedule["github"],
                session_id=session_id,  # Trackable to session
            )
        # ...
    
    def revoke_session_credentials(self, session_id: str):
        """Revoke all credentials issued for a session."""
        for token in self.issued_tokens[session_id]:
            self.revoke_token(token)
```

---

## Principle 5: Human-in-the-Loop for Dangerous Actions

Some tools should never be called without human approval.

```python
class HumanApprovalGate:
    """Require human approval for high-risk tool calls."""
    
    APPROVAL_REQUIRED_TOOLS = [
        "deploy_production",
        "delete_user_account",
        "modify_billing",
        "grant_admin_access",
        "bulk_email",
        "database_migration",
    ]
    
    async def request_approval(
        self,
        tool_name: str,
        params: dict,
        agent_reasoning: str,
    ) -> bool:
        """Request human approval for a tool call."""
        
        approval_request = {
            "tool": tool_name,
            "params": params,
            "reasoning": agent_reasoning,
            "requested_at": datetime.utcnow().isoformat(),
            "expires_at": (datetime.utcnow() + timedelta(minutes=5)).isoformat(),
            "approval_id": uuid4().hex,
        }
        
        # Send to approval queue
        await self.approval_queue.send(approval_request)
        
        # Wait for response (with timeout)
        try:
            response = await self.approval_queue.wait_for_response(
                approval_request["approval_id"],
                timeout=300,  # 5 minutes
            )
            return response["approved"]
        except TimeoutError:
            await self.alert_team(f"Approval request expired: {tool_name}")
            return False
    
    async def log_auto_blocked(self, tool_name: str, params: dict, reason: str):
        """Log when a tool call is blocked without human review."""
        await self.audit_log.append({
            "event": "tool_blocked",
            "tool": tool_name,
            "params": params,
            "reason": reason,
            "timestamp": datetime.utcnow().isoformat(),
        })
```

---

## Production Implementation: Putting It All Together

```python
class SecureToolOrchestrator:
    """Complete tool access control system."""
    
    def __init__(self):
        self.validator = ToolValidator()
        self.context_validator = ContextAwareValidator()
        self.credential_manager = CredentialManager()
        self.approval_gate = HumanApprovalGate()
        self.audit_log = AuditLogger()
    
    async def execute_tool(
        self,
        tool_name: str,
        params: dict,
        agent_id: str,
        session_id: str,
        context: ToolContext,
    ) -> ToolResult:
        
        # 1. Static validation (tool rules)
        validation = self.validator.validate(tool_name, params)
        if not validation.passed:
            await self.audit_log.blocked_call(
                agent_id, tool_name, params, f"Static validation: {validation.reason}"
            )
            return ToolResult(error=validation.reason)
        
        # 2. Context-aware validation
        context_check = self.context_validator.validate(tool_name, params, context)
        if not context_check.passed:
            await self.audit_log.blocked_call(
                agent_id, tool_name, params, f"Context validation: {context_check.reason}"
            )
            return ToolResult(error=context_check.reason)
        
        # 3. Human approval for dangerous tools
        if tool_name in self.approval_gate.APPROVAL_REQUIRED_TOOLS:
            approved = await self.approval_gate.request_approval(
                tool_name, params, context.agent_reasoning
            )
            if not approved:
                return ToolResult(error="Requires human approval")
        
        # 4. Get scoped credentials for this session
        credentials = self.credential_manager.get_credential(
            tool_name.split("_")[0], agent_id, session_id
        )
        
        # 5. Execute with monitoring
        start_time = time.time()
        try:
            result = await self.execute_with_credentials(
                tool_name, params, credentials
            )
            
            # 6. Validate output
            output_validation = self.validate_output(tool_name, result)
            if not output_validation.passed:
                await self.audit_log.blocked_output(
                    agent_id, tool_name, output_validation.reason
                )
                return ToolResult(error="Output validation failed")
            
            # 7. Log successful call
            await self.audit_log.tool_call(
                agent_id=agent_id,
                tool=tool_name,
                params=params,
                duration_ms=(time.time() - start_time) * 1000,
                success=True,
            )
            
            return ToolResult(data=result)
            
        except Exception as e:
            await self.audit_log.tool_call(
                agent_id=agent_id,
                tool=tool_name,
                params=params,
                duration_ms=(time.time() - start_time) * 1000,
                success=False,
                error=str(e),
            )
            return ToolResult(error=str(e))
```

---

## Testing Tool Access Control

```python
TOOL_ACCESS_TEST_CASES = [
    # Agent role, tool call, expected result
    ("support", "query_database", True),       # Support can read
    ("support", "insert_record", False),        # Support can't write
    ("support", "delete_records", False),       # Support can't delete
    ("engineer", "query_database", True),       # Engineer can read
    ("engineer", "insert_record", True),        # Engineer can write (limited)
    ("engineer", "delete_records", False),      # Engineer can't delete
    ("admin", "query_database", True),          # Admin can read
    ("admin", "delete_records", True),          # Admin can delete
    # Suspicious sequences
    ("engineer", ["query_users", "delete_users"], False),  # Must verify before delete
    # Parameter validation
    ("support", "query_database", {"table": "secrets"}, False),  # Can't query secrets
]

def test_tool_access_control(orchestrator):
    results = []
    for role, tool, expected in TOOL_ACCESS_TEST_CASES:
        context = ToolContext(agent_role=role)
        if isinstance(tool, list):
            # Sequential call test
            for t in tool[:1]:
                orchestrator.execute_tool(t, {}, role, "test", context)
            result = orchestrator.execute_tool(tool[-1], {}, role, "test", context)
        elif isinstance(tool, str):
            result = orchestrator.execute_tool(tool, {}, role, "test", context)
        
        passed = result.success == expected
        results.append({"role": role, "tool": tool, "expected": expected, "passed": passed})
    
    return results
```

---

## Production Checklist

- [ ] MCP servers split by responsibility (not one server for everything)
- [ ] Each MCP server runs with minimum required credentials
- [ ] Credentials are scoped (read-only, specific tables, specific actions)
- [ ] Tool-level access control based on agent role
- [ ] Parameter validation on every tool call (allowed values, forbidden patterns)
- [ ] Context-aware validation (expected tool sequences, suspicious patterns)
- [ ] Credentials rotated aggressively (hours not days)
- [ ] Human approval gate for dangerous tools
- [ ] Output validation on every tool result
- [ ] All tool calls logged with agent_id, session_id, params
- [ ] Tool access test suite runs in CI
- [ ] Default: deny. Explicitly allow what agents need.

---

## Next in the Series

| Post | Topic |
|------|-------|
| 1 | Prompt Injection & Defense |
| 2 | **Tool Access Control** (this) |
| 3 | MCP Server Security |
| 4 | Agent Auditing & Compliance |
| 5 | Production Security Patterns |

---

*Series: Agent Security 2026 — Production Patterns. Post 2: Tool Access Control — least privilege for AI agents.*
