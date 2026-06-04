---
title: "Agent Security 2026: MCP Server Security — Transport, Authentication và Production Hardening"
description: "Cách bảo mật MCP servers trong production. Transport security (stdio vs SSE vs WebSocket), OAuth authentication, API key management, request validation, rate limiting và production deployment patterns cho MCP."
published: 2026-06-04
pubDate: 2026-06-04T00:00:00.000Z
slug: agent-security-mcp-server-security-transport-authentication-hardening-vi
tags:
  - agent-security
  - mcp
  - mcp-security
  - transport
  - oauth
  - api-keys
  - production
category: agent-security
lang: vi
series:
  name: "Agent Security 2026 — Production Patterns"
  order: 3
  total: 5
---

MCP servers là API endpoints mới. Và như API endpoints, chúng cần transport security, authentication, authorization, input validation, rate limiting và monitoring.

Khác biệt? MCP servers được consume bởi AI agents — không phải browsers hay mobile apps. Agents gọi tools programmatically, pass parameters generated bởi LLM, và process structured responses. Security model cần tính đến non-deterministic inputs, prompt injection qua parameters, và fact rằng compromised agent có thể gọi bất kỳ tool nào trên MCP server.

---

## MCP Transport Security

| Transport | Default Security | Best For | Risk |
|-----------|-----------------|----------|------|
| **stdio** | Local process isolation | Local dev, CLI agents | Low |
| **SSE** | None (HTTP) | Remote MCP servers | Medium |
| **WebSocket** | None (WS) | Real-time streaming | Medium |

### stdio: Safer by Default

```json
{
  "mcpServers": {
    "local-db": {
      "command": "node", "args": ["./db-server.js"],
      "env": { "DATABASE_URL": "postgres://..." }
    }
  }
}
```

Không network port → không remote attacks. Process-level isolation. Credentials trong env, không trong command line.

### SSE: Remote MCP Challenge

```python
@app.middleware("http")
async def auth_middleware(request, call_next):
    api_key = request.headers.get("X-API-Key")
    if not api_key or not validate_api_key(api_key):
        return JSONResponse(status_code=401)
    
    client_ip = request.client.host
    if await rate_limiter.is_rate_limited(client_ip):
        return JSONResponse(status_code=429)
    
    return await call_next(request)
```

Yêu cầu: TLS (HTTPS), API key/OAuth, rate limiting, logging, CORS.

---

## Authentication Patterns

### API Key (Simple)
```python
VALID_API_KEYS = set(os.getenv("MCP_API_KEYS", "").split(","))
```

### OAuth 2.0 (Enterprise)
```python
oauth.register(name="mcp-provider", client_id=..., scope="mcp:read mcp:tools:execute")
```

### Short-Lived Session Tokens (Recommended)
```python
def create_session_token(agent_id, permissions, ttl=timedelta(hours=1)):
    payload = {
        "agent_id": agent_id, "permissions": permissions,
        "iat": datetime.utcnow(), "exp": datetime.utcnow() + ttl,
        "jti": uuid4().hex,  # For revocation
    }
    return jwt.encode(payload, SECRET, algorithm="HS256")
```

---

## Input Validation: Last Line of Defense

### Pydantic Validation với Security Rules

```python
class QueryDatabaseParams(BaseModel):
    sql: str
    
    @validator("sql")
    def validate_sql(cls, v):
        if not v.strip().upper().startswith("SELECT"):
            raise ValueError("Only SELECT allowed")
        forbidden = ["pg_sleep", "DROP", "ALTER", "TRUNCATE"]
        for pattern in forbidden:
            if pattern.lower() in v.lower():
                raise ValueError(f"Forbidden: {pattern}")
        return v
```

### Preventing Parameter Injection

Parameters từ LLM có thể chứa injection. Validate parameters như untrusted input:

```python
class ToolParameterSanitizer:
    def sanitize_body(self, body):
        body = re.sub(r'<(script|iframe)[^>]*>.*?</\1>', '[blocked]', body, flags=re.DOTALL)
        body = re.sub(r'javascript:', '', body, flags=re.IGNORECASE)
        return body[:10000]
    
    def sanitize_filename(self, filename):
        return os.path.basename(filename)  # Chống path traversal
```

---

## Rate Limiting & Cost Protection

```python
class MCPRateLimiter:
    async def check_rate_limit(self, agent_id, tool_name, api_key):
        checks = [
            self.redis.get(f"ratelimit:agent:{agent_id}") < 60,    # 60/min
            self.redis.get(f"ratelimit:tool:{agent_id}:{tool_name}") < 10,  # 10/min
            self.redis.get("ratelimit:global") < 1000,              # 1000/min
        ]
        return all(checks)
```

### Cost Attack Prevention

```python
BUDGET_LIMITS = {
    "per_request": 1.00,    # Max $1 mỗi request
    "per_hour": 10.00,      # Max $10/h mỗi agent
    "per_day": 50.00,       # Max $50/day mỗi agent
}
```

---

## Docker Deployment Security

```yaml
services:
  mcp-server:
    ports:
      - "127.0.0.1:3000:3000"  # Localhost only
    user: "1000:1000"           # Non-root
    read_only: true             # Read-only filesystem
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 256M
```

---

## Production Checklist

- [ ] TLS enabled cho mọi remote MCP connections
- [ ] stdio MCP cho local, SSE/WebSocket cho remote
- [ ] Authentication trên mọi MCP request (API key, OAuth, JWT)
- [ ] Short-lived session tokens với unique IDs
- [ ] Token revocation capability
- [ ] Pydantic/Zod validation trên mọi tool parameters
- [ ] Parameter sanitization cho untrusted content
- [ ] Multi-level rate limiting (per-agent, per-tool, per-key, global)
- [ ] Cost attack prevention (budget limits)
- [ ] Docker: non-root user, read-only fs, resource limits
- [ ] Audit logging mọi tool call
- [ ] Health check endpoints
- [ ] Process isolation cho stdio MCP servers

---

## Tiếp Theo

| Bài | Chủ đề |
|-----|--------|
| 1 | Prompt Injection & Defense |
| 2 | Tool Access Control |
| 3 | **MCP Server Security** (bài này) |
| 4 | Agent Auditing & Compliance |
| 5 | Production Security Patterns |

---

*Series: Agent Security 2026 — Production Patterns. Bài 3: MCP Server Security.*
