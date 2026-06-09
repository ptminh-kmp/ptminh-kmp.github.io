---
title: "Building an MCP Server from Scratch — Day 2: Resources, Prompts & Advanced Tools"
description: "Add Resources and Prompts to your MCP server. Expose issue comments as readable content, create reusable prompt templates, add advanced tools with pagination and streaming, and test all three capabilities together with MCP Inspector."
published: 2026-06-08
pubDate: 2026-06-08T23:40:00.000Z
slug: build-mcp-server-from-scratch-day2-resources-prompts-advanced-tools
tags:
  - mcp
  - tutorial
  - resources
  - prompts
  - typescript
  - advanced-tools
  - step-by-step
category: ai-agents
lang: en
series:
  name: "Building an MCP Server from Scratch"
  order: 2
  total: 5
---

Day 1 gave us a working MCP server with 5 tools. Today we add the other two MCP capabilities: **Resources** and **Prompts**.

```
Day 1: Tools only      →     Day 2: Tools + Resources + Prompts
┌─────────────────┐          ┌─────────────────────────────┐
│ tools/list       │          │ tools/list                  │
│ tools/call       │          │ tools/call                  │
│                  │          │ resources/list              │
│                  │          │ resources/read              │
│                  │          │ prompts/list                │
│                  │          │ prompts/get                 │
└─────────────────┘          └─────────────────────────────┘
```

By the end of this post, your server will be a **full MCP citizen** — supporting all three capabilities that MCP defines.

---

## Recap: Where We Left Off

```typescript
// src/index.ts — the entry point from Day 1
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { GitHubClient } from "./github-client.js";

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
if (!GITHUB_TOKEN) { process.exit(1); }

const server = new McpServer({
  name: "github-issue-manager",
  version: "1.0.0",
});

const github = new GitHubClient(GITHUB_TOKEN);

// Tool 1–5 from Day 1: list_issues, get_issue, create_issue, update_issue, search_issues

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("✅ Server running on stdio");
}
main();
```

We'll add Resources and Prompts to this same file (or split into modules — your call).

---

## Part 1: Adding Resources

**Resources** are how MCP servers expose data to the client. Think of them as read-only files that the LLM can browse and read. Each resource has a URI, a name, and a MIME type.

### What resources should our issue manager expose?

| Resource URI | Description |
|-------------|-------------|
| `issue://{owner}/{repo}/{number}` | A single issue as markdown |
| `issue://{owner}/{repo}/{number}/comments` | Issue comments as a thread |
| `issue://{owner}/{repo}/open` | List of open issues |

### Step 1: Add resource providers

Add these imports and code to `src/index.ts`:

```typescript
import { ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
```

### Step 2: Register resources

```typescript
// ============================================================
// Resource 1: Single issue as markdown content
// ============================================================
server.resource(
  "issue-detail",
  new ResourceTemplate("issue://{owner}/{repo}/{number}", { list: undefined }),
  async (uri, { owner, repo, number }) => {
    try {
      const issue = await github.getIssue(
        owner as string,
        repo as string,
        parseInt(number as string, 10)
      );

      const labels = issue.labels.map((l) => `\`${l.name}\``).join(" ");
      const assignees = issue.assignees.map((a) => `@${a.login}`).join(", ");

      const markdown = [
        `# ${issue.title}`,
        ``,
        `**Status:** ${issue.state === "open" ? "🟢 Open" : "🔴 Closed"}`,
        `**Author:** @${issue.user.login} | **Created:** ${new Date(issue.created_at).toLocaleDateString()}`,
        `**Labels:** ${labels || "*none*"}`,
        `**Assignees:** ${assignees || "*none*"}`,
        `**URL:** ${issue.html_url}`,
        ``,
        `---`,
        ``,
        issue.body || "*No description provided.*",
      ].join("\n");

      return {
        contents: [
          {
            uri: uri.href,
            mimeType: "text/markdown",
            text: markdown,
          },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to fetch issue: ${error}`);
    }
  },
);
```

### Step 3: Comments as a resource

```typescript
// ============================================================
// Resource 2: Issue comments as a threaded conversation
// ============================================================
server.resource(
  "issue-comments",
  new ResourceTemplate("issue://{owner}/{repo}/{number}/comments", { list: undefined }),
  async (uri, { owner, repo, number }) => {
    try {
      const url = `https://api.github.com/repos/${owner}/${repo}/issues/${number}/comments`;
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${GITHUB_TOKEN}`,
          Accept: "application/vnd.github+json",
          "User-Agent": "github-issue-mcp-server/1.0",
        },
      });
      
      if (!response.ok) {
        throw new Error(`GitHub API: ${response.status}`);
      }

      const comments: any[] = await response.json() as any[];
      
      if (comments.length === 0) {
        return {
          contents: [
            {
              uri: uri.href,
              mimeType: "text/markdown",
              text: `# Comments for ${owner}/${repo}#${number}\n\n*No comments yet.*`,
            },
          ],
        };
      }

      const formatted = comments.map((c) => {
        const date = new Date(c.created_at).toLocaleDateString();
        return [
          `---`,
          `**@${c.user.login}** commented on ${date}`,
          ``,
          c.body || "*No text*",
        ].join("\n");
      }).join("\n\n");

      return {
        contents: [
          {
            uri: uri.href,
            mimeType: "text/markdown",
            text: `# Comments for ${owner}/${repo}#${number}\n\n${formatted}`,
          },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to fetch comments: ${error}`);
    }
  },
);
```

### Step 4: Open issues listing as a resource

```typescript
// ============================================================
// Resource 3: Open issues listing
// ============================================================
server.resource(
  "open-issues",
  new ResourceTemplate("issue://{owner}/{repo}/open", { list: undefined }),
  async (uri, { owner, repo }) => {
    try {
      const issues = await github.listIssues(owner as string, repo as string, "open");

      if (issues.length === 0) {
        return {
          contents: [
            {
              uri: uri.href,
              mimeType: "text/markdown",
              text: `# Open Issues in ${owner}/${repo}\n\n✨ No open issues!`,
            },
          ],
        };
      }

      const list = issues.map((issue) => {
        return [
          `- **[#${issue.number}](${issue.html_url}): ${issue.title}**`,
          `  _Labels:_ ${issue.labels.map((l) => `\`${l.name}\``).join(", ") || "none"} | _Updated:_ ${new Date(issue.updated_at).toLocaleDateString()}`,
        ].join("\n");
      }).join("\n");

      return {
        contents: [
          {
            uri: uri.href,
            mimeType: "text/markdown",
            text: `# Open Issues in ${owner}/${repo}\n\nTotal: ${issues.length}\n\n${list}`,
          },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to list issues: ${error}`);
    }
  },
);
```

### How Resources Work

The client discovers resources by calling `resources/list` (at connection time, MCP hosts like Claude Desktop automatically enumerate them). When the LLM needs data, it calls `resources/read` with the URI:

```
LLM: "What are the details of issue #42 in my repo?"
  → Client calls resources/read on "issue://owner/repo/42"
  → Returns markdown to the LLM
  → LLM reads it as context
```

This is different from tools. Tools are _actions_ the LLM takes. Resources are _information_ the LLM reads. Tools modify state; resources don't.

---

## Part 2: Adding Prompts

**Prompts** are reusable templates that users can invoke. Think of them as macros — the user selects a prompt, fills in parameters, and gets structured output.

### What prompts should we add?

| Prompt | Description | Parameters |
|--------|-------------|------------|
| `triage-issue` | Template for triaging a new issue | owner, repo, issue_number |
| `weekly-summary` | Summary of the week's issue activity | owner, repo |
| `bug-report-template` | Template for filing a bug report | (none — self-contained) |

### Step 5: Add prompts

```typescript
// ============================================================
// Prompt 1: Triage an issue
// ============================================================
server.prompt(
  "triage-issue",
  "Template for triaging a new GitHub issue — analyze severity, suggest labels, and propose next steps",
  {
    owner: z.string().describe("Repository owner"),
    repo: z.string().describe("Repository name"),
    issue_number: z.number().int().positive().describe("Issue number to triage"),
  },
  ({ owner, repo, issue_number }) => ({
    messages: [
      {
        role: "user",
        content: {
          type: "text",
          text: [
            `Please triage issue #${issue_number} in ${owner}/${repo}.`,
            ``,
            `First, fetch the issue details from the issue-detail resource.`,
            `Then analyze:`,
            ``,
            `1. **Severity Assessment** — Is this a bug, feature request, or question?`,
            `   - If bug: Is it critical (blocks work), major (breaks feature), or minor (cosmetic)?`,
            `2. **Label Suggestions** — What labels would you recommend based on the content?`,
            `3. **Priority** — Should this be handled immediately, this sprint, or backlog?`,
            `4. **Assignee** — Based on the issue content, which team or person should look at this?`,
            `5. **Next Steps** — What should the reporter do next, or what info is missing?`,
            ``,
            `Use the get_issue tool to fetch the details if you need to.`,
          ].join("\n"),
        },
      },
    ],
  }),
);
```

### Step 6: Weekly summary prompt

```typescript
// ============================================================
// Prompt 2: Weekly issue summary
// ============================================================
server.prompt(
  "weekly-summary",
  "Generate a summary of the week's issue activity for a repository",
  {
    owner: z.string().describe("Repository owner"),
    repo: z.string().describe("Repository name"),
  },
  ({ owner, repo }) => ({
    messages: [
      {
        role: "user",
        content: {
          type: "text",
          text: [
            `Generate a weekly summary for ${owner}/${repo}.`,
            ``,
            `Please:`,
            `1. List all open issues using the open-issues resource`,
            `2. For each issue, check if it was created or updated this week`,
            `3. Group them into:`,
            `   - 🔥 **New this week** (created within 7 days)`,
            `   - 📝 **Recently updated** (updated within 7 days)`,
            `   - 🧊 **Stale** (no activity for 30+ days)`,
            `4. For each issue, include its number, title, labels, and last update date`,
            `5. Give a count summary at the top`,
            ``,
            `Format as a clean markdown report.`,
          ].join("\n"),
        },
      },
    ],
  }),
);
```

### Step 7: Bug report template

```typescript
// ============================================================
// Prompt 3: Bug report template (no parameters — self-contained)
// ============================================================
server.prompt(
  "bug-report-template",
  "Template for filing a bug report on GitHub — pre-formatted with all required fields",
  {},
  () => ({
    messages: [
      {
        role: "user",
        content: {
          type: "text",
          text: [
            `Please create an issue using the following bug report template. `,
            `Ask me for the missing details (repo, title, description) if I haven't provided them.`,
            ``,
            `## Bug Report Template`,
            ``,
            `### Describe the Bug`,
            `<!-- A clear and concise description of what the bug is -->`,
            ``,
            `### To Reproduce`,
            `1. Go to '...'`,
            `2. Click on '...'`,
            `3. Scroll down to '...'`,
            `4. See error`,
            ``,
            `### Expected Behavior`,
            `<!-- What should happen instead -->`,
            ``,
            `### Screenshots`,
            `<!-- If applicable, add screenshots -->`,
            ``,
            `### Environment`,
            `- OS: [e.g. macOS 15]`,
            `- Browser: [e.g. Chrome 125]`,
            `- Version: [e.g. 1.2.3]`,
            ``,
            `### Additional Context`,
            `<!-- Add any other context -->`,
          ].join("\n"),
        },
      },
    ],
  }),
);
```

### How Prompts Work

When a user invokes a prompt in Claude Desktop:

1. User selects "weekly-summary" from the prompt menu
2. User enters owner and repo
3. The prompt template is rendered with the parameters
4. The rendered text is sent as a user message to the LLM
5. The LLM follows the instructions, using tools and resources as needed

Prompts are essentially **scaffolding** for common workflows. They guide the LLM to use your tools and resources in the right way.

---

## Part 3: Adding Advanced Tools

Resources and prompts are great, but let's make our tools more powerful too.

### Step 8: Paginated issue listing

```typescript
// ============================================================
// Advanced Tool: List all issues with pagination
// ============================================================
server.tool(
  "list_issues_paginated",
  "List issues with full pagination support for large repositories",
  {
    owner: z.string().describe("Repository owner"),
    repo: z.string().describe("Repository name"),
    state: z.enum(["open", "closed", "all"]).default("open"),
    page: z.number().int().min(1).default(1).describe("Page number"),
    per_page: z.number().int().min(1).max(100).default(30).describe("Items per page"),
    sort: z.enum(["created", "updated", "comments"]).default("updated").describe("Sort field"),
    direction: z.enum(["asc", "desc"]).default("desc").describe("Sort direction"),
  },
  async ({ owner, repo, state, page, per_page, sort, direction }) => {
    try {
      const url = `${GITHUB_API_BASE}/repos/${owner}/${repo}/issues?` +
        new URLSearchParams({
          state,
          page: String(page),
          per_page: String(per_page),
          sort,
          direction,
        });

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${GITHUB_TOKEN}`,
          Accept: "application/vnd.github+json",
          "User-Agent": "github-issue-mcp-server/1.0",
        },
      });

      if (!response.ok) {
        throw new Error(`GitHub API: ${response.status}`);
      }

      const issues: GitHubIssue[] = await response.json() as GitHubIssue[];
      
      // Parse Link header for pagination info
      const linkHeader = response.headers.get("link");
      const pagination = this.parseLinkHeader(linkHeader);

      if (issues.length === 0) {
        return {
          content: [{ type: "text", text: `No issues found on page ${page}.` }],
        };
      }

      const formatted = issues.map((issue) => {
        const labels = issue.labels.map((l) => `[${l.name}]`).join(" ");
        return [
          `#${issue.number}: ${issue.title}`,
          `  ${issue.state} | ${issue.created_at.slice(0, 10)} | 💬 ${issue.comments}`,
          `  Labels: ${labels || "(none)"}`,
          `  ${issue.html_url}`,
        ].join("\n");
      }).join("\n\n");

      return {
        content: [{
          type: "text",
          text: [
            `## Issues in ${owner}/${repo} (page ${page})`,
            pagination.last ? `\n📄 Pages: ${pagination.last}` : "",
            `\n\n${formatted}`,
          ].join(""),
        }],
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error: ${error}` }],
        isError: true,
      };
    }
  },
);

// Helper: Parse GitHub's Link header
function parseLinkHeader(link: string | null): { first?: string; prev?: string; next?: string; last?: string } {
  if (!link) return {};
  const result: Record<string, string> = {};
  const parts = link.split(", ");
  for (const part of parts) {
    const match = part.match(/<([^>]+)>;\s*rel="([^"]+)"/);
    if (match) {
      result[match[2]] = match[1];
    }
  }
  return result;
}
```

### Step 9: Batch labeling tool

```typescript
// ============================================================
// Advanced Tool: Add labels to multiple issues at once
// ============================================================
server.tool(
  "batch_label_issues",
  "Add labels to multiple issues at once (useful for triage sprints)",
  {
    owner: z.string().describe("Repository owner"),
    repo: z.string().describe("Repository name"),
    issue_numbers: z.array(z.number().int().positive()).min(1).max(25).describe("Issue numbers to label"),
    labels: z.array(z.string()).min(1).max(10).describe("Labels to apply"),
  },
  async ({ owner, repo, issue_numbers, labels }) => {
    const results: { number: number; success: boolean; error?: string }[] = [];
    
    for (const issueNumber of issue_numbers) {
      try {
        await github.updateIssue(owner, repo, issueNumber, { labels });
        results.push({ number: issueNumber, success: true });
      } catch (error) {
        results.push({ number: issueNumber, success: false, error: String(error) });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const failCount = results.filter((r) => !r.success).length;

    return {
      content: [{
        type: "text",
        text: [
          `## Batch Label Results`,
          ``,
          `Labels applied: ${labels.join(", ")}`,
          `✅ Succeeded: ${successCount}/${issue_numbers.length}`,
          failCount > 0 ? `❌ Failed: ${failCount}/${issue_numbers.length}` : "",
          failCount > 0 ? `\n### Failures:\n${results.filter(r => !r.success).map(r => `- #${r.number}: ${r.error}`).join("\n")}` : "",
        ].join("\n"),
      }],
    };
  },
);
```

---

## Part 4: Testing All Three Capabilities

### Test with MCP Inspector

```bash
npm run build
npx @modelcontextprotocol/inspector node build/index.js
```

Check the three tabs in the Inspector UI:

| Tab | Action | Expected |
|-----|--------|----------|
| **Tools** | Call any of the 7 tools | Works as before |
| **Resources** | Read resource URIs | Returns markdown content |
| **Prompts** | Select a prompt, fill params | Returns rendered template |

### Test with Claude Desktop

Make sure `claude_desktop_config.json` is still pointing at your server. Then try these prompts:

1. **Resources test:**
   > "What's the content of resource issue://ptminh-kmp/ptminh-kmp.github.io/1"

   Claude should be able to access resources automatically. Ask:
   > "Tell me about the open issues in ptminh-kmp/ptminh-kmp.github.io"

2. **Prompts test:**
   In the Claude Desktop chat box, type `/` to see available prompts. Select `weekly-summary`, enter the repo details, and Claude will generate a structured summary.

3. **Advanced tools test:**
   > "Add the label 'bug' to issues 1, 2, and 3 in ptminh-kmp/ptminh-kmp.github.io"

---

## The Complete Server Now

After Day 2, your MCP server exposes:

| Capability | Items |
|-----------|-------|
| **Tools** (7) | list_issues, get_issue, create_issue, update_issue, search_issues, list_issues_paginated, batch_label_issues |
| **Resources** (3) | issue-detail, issue-comments, open-issues |
| **Prompts** (3) | triage-issue, weekly-summary, bug-report-template |

This is now a **complete MCP server** supporting all three spec capabilities.

---

## What You Learned Today

| Concept | In Practice |
|---------|-------------|
| Resources | URI templates → `issue://{owner}/{repo}/{number}` |
| MIME types | `text/markdown` for readable content |
| Prompts | Templates with Zod params → LLM instructions |
| Template rendering | Parameter interpolation → context-rich user messages |
| Advanced tools | Pagination with Link headers, batch operations |
| Three-capability server | Tools + Resources + Prompts working together |

---

## Prepare for Day 3

Right now our server only works on localhost via stdio. That's fine for development, but real MCP servers need to run remotely.

**Tomorrow:** We'll add **SSE (Server-Sent Events) transport**, deploy with Docker, and handle the connection lifecycle properly. Your server will be accessible from any machine.

---

| Day | Topic | Status |
|-----|-------|--------|
| 1 | Setup & Architecture | ✅ |
| 2 | **Resources, Prompts & Advanced Tools** | ✅ **Done** |
| 3 | SSE Transport & Remote Deployment | Coming next |
| 4 | Authentication & Production Hardening | — |
| 5 | Testing, Publishing & Ecosystem | — |

---

*Series: Building an MCP Server from Scratch. Day 2: Resources, prompts, advanced tools with pagination and batch operations.*
