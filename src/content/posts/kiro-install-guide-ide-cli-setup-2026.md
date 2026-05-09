---
title: "Kiro Installation Guide: IDE, CLI, and First Configuration"
description: "Step-by-step guide to installing Kiro IDE and CLI, signing in with AWS Builder ID, setting up steering files, and connecting your first MCP server."
published: 2026-05-09
pubDate: 2026-05-09T10:00:00.000Z
slug: kiro-install-guide-ide-cli-setup-2026
tags:
  - kiro
  - aws
  - installation
  - cli
  - ide
  - steering-files
  - mcp
  - agentic-ide
category: ai-agents
lang: en
series:
  name: "Practical Kiro — AWS's Agentic Development Environment"
  order: 2
  total: 6
---

Kiro comes in two primary surfaces: the **IDE** (a VS Code fork) and the **CLI** (terminal-based agent). On Day 0, we covered what Kiro is and why its spec-driven approach matters. Today, we install both and configure them for real work.

If you're coming from VS Code, the IDE will feel immediately familiar. If you live in the terminal, the CLI might be your daily driver. Either way, the setup takes minutes.

---

## Prerequisites

- **OS:** macOS, Linux, or Windows (WSL2 recommended for Windows)
- **Git** installed and configured
- **GitHub account** (for autonomous agent features)
- **Node.js 18+** (recommended for CLI usage)
- **Disk space:** ~500 MB for IDE, negligible for CLI

No AWS account required — Kiro uses AWS Builder ID, which is free and separate from your AWS billing account.

---

## 1. Installing Kiro IDE

Kiro IDE is a VS Code fork built on Code OSS, so extensions, keybindings, and themes carry over.

**Download:** Visit [kiro.dev/downloads](https://kiro.dev/downloads)

The download page auto-detects your OS. Grab the appropriate package:
- **macOS:** `.dmg` (Apple Silicon & Intel)
- **Linux:** `.deb` (Debian/Ubuntu), `.rpm` (Fedora), or `.AppImage`
- **Windows:** `.exe` installer

**Alternative — install via Homebrew (macOS/Linux):**

```bash
brew install kirodev/tap/kiro
```

**After installation:** Launch Kiro IDE. You'll be greeted by the sign-in screen — close it for now; we'll handle configuration next.

### What you get out of the box

Kiro IDE is VS Code with these additions:
- **Agent panel** — right sidebar for chat, specs, and agent interaction
- **Spec tab** — structured requirement editor (prompt → spec flow)
- **Steering file generator** — auto-creates `.kiro/steering.md` per project
- **Powers tab** — MCP server marketplace built into the IDE
- **Kiro terminal** — drop-down terminal with CLI pre-integrated

---

## 2. Installing Kiro CLI

The CLI is a single binary with no dependencies beyond Git.

```bash
curl -fsSL https://kiro.dev/install.sh | sh
```

This installs the `kiro` command to `/usr/local/bin`. Verify:

```bash
kiro --version
# Example output: Kiro CLI 2.3.1 (build abc1234)
```

**Manual install:** If you prefer not to pipe curl to shell, grab the binary from [kiro.dev/cli](https://kiro.dev/cli).

---

## 3. Authentication: AWS Builder ID

Both IDE and CLI require **AWS Builder ID** — Amazon's single sign-on for developer tools. It's free and separate from your AWS root account.

### Via IDE

1. Launch Kiro IDE
2. Click **Sign in with Builder ID** in the welcome screen
3. A browser window opens — complete the sign-in flow
4. You'll be redirected back to the IDE automatically

### Via CLI

```bash
kiro auth login
```

This opens a browser window. Complete the flow, and the CLI stores your session token locally.

**Verify authentication:**

```bash
kiro auth whoami
# Example output: Logged in as user@example.com (Builder ID: amzn1.account.xxxxx)
```

### Offline/Temporary tokens

If you're on a headless server (CI/CD, SSH), you can generate a session token:

```bash
kiro auth token --output env
# Sets KIRO_SESSION_TOKEN in your environment
```

This token expires after a configurable duration. For CI/CD pipelines, you typically regenerate it per job.

---

## 4. Steering Files: Teaching Kiro How You Code

Steering files are Kiro's mechanism for project-level AI configuration. They tell the agent about your code standards, architecture decisions, testing preferences, and security rules.

### Create a steering file

In your project root, create `.kiro/steering.md`:

```bash
mkdir -p .kiro
```

Here's a practical example for a Node.js/TypeScript project:

```markdown
# .kiro/steering.md

## Tech Stack
- Runtime: Node.js 22 LTS
- Language: TypeScript 5.x strict mode
- Framework: Hono.js (backend), React 19 with Vite (frontend)
- Database: PostgreSQL 16 via Drizzle ORM
- Testing: Vitest (unit), Playwright (E2E)

## Code Standards
- Use named exports, not default exports
- All functions must have TypeScript return types
- Error handling: use Result/Option pattern, not try/catch
- Maximum line length: 100 characters
- Imports: group by external/internal, sorted alphabetically

## Architecture Rules
- Backend follows clean architecture: routes → services → repositories
- Frontend follows feature-based folder structure
- API responses follow JSend specification
- All database queries must use parameterized statements

## Testing Requirements
- Minimum 80% line coverage for new code
- Every API endpoint needs integration tests
- Mock external services in unit tests
- E2E tests for critical user journeys only (login, checkout, search)

## Security Constraints
- Never log passwords, tokens, or PII
- All user input must be validated with Zod schemas
- Rate limiting required on all public endpoints
- CORS: restrict to known origins only
```

### Global vs. Project steering

Kiro loads **both** levels:

| File | Scope | Priority |
|------|-------|----------|
| `~/.kiro/steering.md` | All projects | Lower (base) |
| `.kiro/steering.md` | Current project only | Higher (override) |

Global steering is useful for cross-cutting conventions you want everywhere. Project steering can override specific sections.

### Reload steering files

Steering files are read fresh at the start of every session. Changes take effect immediately when you start a new chat or task. There's no cache to clear.

---

## 5. Connecting Your First MCP Server

Kiro natively supports MCP (Model Context Protocol). During spec generation and task execution, the agent can call external MCP tools.

### Via IDE (no config needed)

1. Open the **Powers** tab in the left sidebar
2. Browse or search for an MCP server (e.g., "GitHub", "Figma", "Context7")
3. Click **Add** — follow the auth flow if required
4. The server is active for all subsequent sessions

### Via CLI (`kiro.json`)

Add MCP servers in your project's `.kiro/kiro.json`:

```json
{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_TOKEN": "${GITHUB_TOKEN}"
      }
    }
  }
}
```

**Always use environment variables for tokens**, never hardcode secrets in JSON files.

### Via CLI (`~/.kiro/kiro.json`)

Global MCP servers go in your home directory:

```json
{
  "mcpServers": {
    "context7": {
      "command": "npx",
      "args": ["-y", "context7-mcp"]
    }
  }
}
```

Global servers are available in every project. Project-level servers merge on top.

### Which MCP servers to start with?

| Server | Why First | Token Needed |
|--------|-----------|-------------|
| **GitHub** | Issue management, PR creation, code review | GitHub PAT (read-only to start) |
| **Context7** | Up-to-date library docs (no stale training data) | None (free) |
| **Firecrawl** | Web scraping, documentation fetching | API key (free tier available) |

---

## 6. First Kiro Session

Open any project in Kiro IDE and try your first spec-driven prompt:

**Prompt:** "Add a health check endpoint to the API"

Kiro will:
1. Generate a spec — review and approve it
2. Create a task plan — you'll see the dependency graph
3. Implement — the agent writes real changes to your files
4. Run tests — if your project has a test framework configured
5. Ask for feedback — review before considering it done

Try in Vibe Mode first for small changes, then graduate to Spec Mode for new features.

---

## 7. CLI Workflow Example

The CLI is powerful for automation, especially in CI/CD pipelines. Here's a practical autofix workflow:

```bash
# In your CI config after a test failure
git checkout -b fix/ci-failure
kiro --print "Review the latest CI logs, find the failing test, and fix the root cause in the source code"
git add -A
git commit -m "fix: resolve CI test failure"
git push origin fix/ci-failure
gh pr create --title "fix: resolve CI test failure" --body "Automated fix via Kiro CLI"
```

The `--print` flag outputs the agent's response to stdout without opening an interactive session — perfect for headless automation.

---

## Troubleshooting Common Issues

| Issue | Likely Cause | Fix |
|-------|-------------|-----|
| `kiro: command not found` | CLI not in PATH | Reinstall or add `/usr/local/bin` to PATH |
| `Auth token expired`| Builder ID session expired | Run `kiro auth login` again |
| MCP server not responding | NPX cache issue | Clear cache: `npx clear-npx-cache` |
| IDE won't start | Extension conflict | Launch with `--disable-extensions` to isolate |
| Steering file ignored | Wrong path or YAML frontmatter | Verify `.kiro/steering.md` exists, check for YAML/Wiki formatting |
| Slow spec generation | Large project | Increase `.kiro/steering.md` specificity to narrow the agent's scope |

---

## What's Next

With Kiro installed and configured, you're ready for Day 2: **Spec-Driven Development Workflow in Practice** — where we'll build a real feature from prompt to pull request using specs, see how to refine requirements, and walk through the exact approval flow.

---

*Series: Practical Kiro — AWS's Agentic Development Environment. Day 1: Installation & Configuration. Day 2: Spec-Driven Development → coming next.*
