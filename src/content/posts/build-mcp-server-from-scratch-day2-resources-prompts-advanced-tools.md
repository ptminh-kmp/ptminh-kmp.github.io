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

```bash
# Project structure after Day 1
github-issue-mcp/
├── src/
│   ├── index.ts         # Entry point — 5 tools via StdioServerTransport
│   └── github-client.ts # GitHub API client
├── package.json
├── tsconfig.json
└── build/
```

The `src/index.ts` from Day 1 had `list_issues`, `get_issue`, `create_issue`, `update_issue`, and `search_issues`. Today we replace that file with a much richer version: 7 tools, 3 resources, 3 prompts.

---

## Step 1: Install (if needed)

```bash
cd github-issue-mcp
npm ls @modelcontextprotocol/sdk zod

# If missing:
npm install @modelcontextprotocol/sdk zod
```

---

## Step 2: The Complete Server Code (src/index.ts)

Replace the entire `src/index.ts` with this file. All 7 tools, 3 resources, and 3 prompts in one place, clearly separated by section headers.

```typescript
// src/index.ts — Complete MCP server (Tools + Resources + Prompts)
// Uses stdio transport. Day 3 switches to SSE for remote access.

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { GitHubClient } from "./github-client.js";

// ════════════════════════════════════════════════════════════
// CONFIGURATION
// ════════════════════════════════════════════════════════════

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
if (!GITHUB_TOKEN) {
  console.error("❌ GITHUB_TOKEN environment variable is required");
  console.error("   Create one at: https://github.com/settings/tokens");
  console.error("   Required scopes: issues:read, issues:write");
  process.exit(1);
}

// ════════════════════════════════════════════════════════════
// INITIALIZE
// ════════════════════════════════════════════════════════════

const server = new McpServer({
  name: "github-issue-manager",
  version: "1.0.1",   // Bumped from 1.0.0 — now with resources + prompts
});

const github = new GitHubClient(GITHUB_TOKEN);
const GITHUB_API_BASE = "https://api.github.com";

// Log startup info — mask token for safety
console.error(`🚀 Starting GitHub Issue Manager v1.0.1`);
console.error(`   Token: ${GITHUB_TOKEN.slice(0, 8)}...${GITHUB_TOKEN.slice(-4)}`);

// ════════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════════

/**
 * Parse GitHub's pagination Link header.
 * 
 * GitHub returns a header like:
 *   <https://api.github.com/...?page=2>; rel="next",
 *   <https://api.github.com/...?page=5>; rel="last"
 * 
 * Returns { next, last, first, prev } as URL strings.
 */
function parseLinkHeader(link: string | null): Record<string, string> {
  if (!link) return {};
  const result: Record<string, string> = {};
  for (const part of link.split(", ")) {
    const match = part.match(/<([^>]+)>;\s*rel="([^"]+)"/);
    if (match) result[match[2]] = match[1];
  }
  return result;
}

/**
 * Authenticated fetch against the GitHub API.
 * Every call includes Bearer token, correct Accept header,
 * User-Agent (required by GitHub), and API version.
 */
async function githubFetch(url: string) {
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "github-issue-mcp-server/1.0",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });
  return response;
}

// ════════════════════════════════════════════════════════════
// ──── TOOLS ────
// ════════════════════════════════════════════════════════════

// Tool 1 — List issues (from Day 1, enhanced formatting)
server.tool(
  "list_issues",
  "List issues from a GitHub repository, filtered by state",
  {
    owner: z.string().describe("Repository owner (user or organization)"),
    repo: z.string().describe("Repository name"),
    state: z.enum(["open", "closed", "all"]).default("open").describe("Issue state filter"),
    limit: z.number().min(1).max(100).default(20).describe("Maximum issues to return"),
  },
  async ({ owner, repo, state, limit }) => {
    try {
      const issues = await github.listIssues(owner, repo, state, limit);

      if (issues.length === 0) {
        return {
          content: [{ type: "text", text: `No ${state} issues found in ${owner}/${repo}.` }],
        };
      }

      // Format each issue with labels, assignees, dates
      const formatted = issues.map((issue: any) => {
        const labels = issue.labels.map((l: any) => `[${l.name}]`).join(" ");
        const assignees = issue.assignees.map((a: any) => `@${a.login}`).join(", ");
        return [
          `#${issue.number}: ${issue.title}`,
          `  State: ${issue.state} | Created: ${issue.created_at.slice(0, 10)} | Comments: ${issue.comments}`,
          `  Labels: ${labels || "(none)"}`,
          `  Assignees: ${assignees || "(none)"}`,
          `  URL: ${issue.html_url}`,
        ].join("\n");
      }).join("\n\n");

      return {
        content: [{
          type: "text",
          text: `## Issues in ${owner}/${repo} (${state})\n\n${formatted}`,
        }],
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error listing issues: ${error}` }],
        isError: true,
      };
    }
  },
);

// Tool 2 — Get single issue (from Day 1)
server.tool(
  "get_issue",
  "Get detailed information about a single GitHub issue by number",
  {
    owner: z.string().describe("Repository owner"),
    repo: z.string().describe("Repository name"),
    issue_number: z.number().int().positive().describe("Issue number (e.g., 42)"),
  },
  async ({ owner, repo, issue_number }) => {
    try {
      const issue = await github.getIssue(owner, repo, issue_number);
      const labels = issue.labels.map((l: any) => `[${l.name}]`).join(" ");
      const assignees = issue.assignees.map((a: any) => `@${a.login}`).join(", ");

      const details = [
        `# ${issue.title}`,
        `**Issue #${issue.number}** | **State:** ${issue.state}`,
        `**Author:** @${issue.user.login} | **Created:** ${issue.created_at} | **Updated:** ${issue.updated_at}`,
        `**Labels:** ${labels || "(none)"}`,
        `**Assignees:** ${assignees || "(none)"}`,
        `**Comments:** ${issue.comments}`,
        `**URL:** ${issue.html_url}`,
        ``,
        `---`,
        issue.body || "*No description provided*",
      ].join("\n");

      return { content: [{ type: "text", text: details }] };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error fetching issue: ${error}` }],
        isError: true,
      };
    }
  },
);

// Tool 3 — Create issue (from Day 1)
server.tool(
  "create_issue",
  "Create a new issue in a GitHub repository",
  {
    owner: z.string().describe("Repository owner"),
    repo: z.string().describe("Repository name"),
    title: z.string().min(1).max(256).describe("Issue title"),
    body: z.string().optional().describe("Issue body/description (Markdown)"),
    labels: z.array(z.string()).optional().describe("Labels to apply (e.g., ['bug'])"),
    assignees: z.array(z.string()).optional().describe("Usernames to assign (e.g., ['user1'])"),
  },
  async ({ owner, repo, title, body, labels, assignees }) => {
    try {
      const issue = await github.createIssue(owner, repo, { title, body, labels, assignees });
      return {
        content: [{
          type: "text",
          text: `✅ Issue created!\n**#${issue.number}:** ${issue.title}\n**URL:** ${issue.html_url}`,
        }],
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error creating issue: ${error}` }],
        isError: true,
      };
    }
  },
);

// Tool 4 — Update issue (from Day 1)
server.tool(
  "update_issue",
  "Update an existing issue — change title, body, labels, assignees, or close/reopen",
  {
    owner: z.string().describe("Repository owner"),
    repo: z.string().describe("Repository name"),
    issue_number: z.number().int().positive().describe("Issue number to update"),
    title: z.string().max(256).optional().describe("New title"),
    body: z.string().optional().describe("New body"),
    state: z.enum(["open", "closed"]).optional().describe("Close or reopen the issue"),
    labels: z.array(z.string()).optional().describe("New labels"),
    assignees: z.array(z.string()).optional().describe("New assignees"),
  },
  async ({ owner, repo, issue_number, title, body, state, labels, assignees }) => {
    try {
      const issue = await github.updateIssue(owner, repo, issue_number, {
        title, body, state, labels, assignees,
      });
      return {
        content: [{
          type: "text",
          text: `✅ Issue #${issue_number} updated!\n` +
            `**#${issue.number}:** ${issue.title}\n**State:** ${issue.state}\n**URL:** ${issue.html_url}`,
        }],
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error updating issue: ${error}` }],
        isError: true,
      };
    }
  },
);

// Tool 5 — Search issues (from Day 1)
server.tool(
  "search_issues",
  "Search GitHub issues across repositories using GitHub's search syntax",
  {
    query: z.string().min(1).describe("Search query (e.g., 'repo:owner/name is:open bug')"),
    limit: z.number().min(1).max(50).default(10).describe("Maximum results"),
  },
  async ({ query, limit }) => {
    try {
      const result = await github.searchIssues(query, limit);
      if (result.issues.length === 0) {
        return { content: [{ type: "text", text: `No issues found for: "${query}"` }] };
      }
      const formatted = result.issues.map((issue: any) => {
        const repoHint = issue.html_url
          .replace("https://github.com/", "")
          .replace(/\/issues\/\d+/, "");
        return `#${issue.number} (${repoHint}): ${issue.title}\n  ${issue.state} | ${issue.html_url}`;
      }).join("\n\n");
      return {
        content: [{ type: "text", text: `## Results (${result.total_count} total)\n\n${formatted}` }],
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error: ${error}` }],
        isError: true,
      };
    }
  },
);

// Tool 6 — NEW: Paginated issue listing
server.tool(
  "list_issues_paginated",
  "Browse issues with full pagination — essential for large repositories with hundreds of issues",
  {
    owner: z.string().describe("Repository owner"),
    repo: z.string().describe("Repository name"),
    state: z.enum(["open", "closed", "all"]).default("open"),
    page: z.number().int().min(1).default(1).describe("Page number (starts at 1)"),
    per_page: z.number().int().min(1).max(100).default(30).describe("Items per page (max 100)"),
    sort: z.enum(["created", "updated", "comments"]).default("updated").describe("Sort field"),
    direction: z.enum(["asc", "desc"]).default("desc").describe("Sort direction"),
  },
  async ({ owner, repo, state, page, per_page, sort, direction }) => {
    try {
      const url = `${GITHUB_API_BASE}/repos/${owner}/${repo}/issues?` +
        new URLSearchParams({ state, page: String(page), per_page: String(per_page), sort, direction });

      const response = await githubFetch(url);
      if (!response.ok) {
        throw new Error(`GitHub API: ${response.status} ${response.statusText}`);
      }

      const issues: any[] = await response.json() as any[];
      const pagination = parseLinkHeader(response.headers.get("link"));

      if (issues.length === 0) {
        return {
          content: [{ type: "text", text: `No issues found on page ${page} of ${owner}/${repo}.` }],
        };
      }

      const formatted = issues.map((issue: any) => {
        const labels = issue.labels.map((l: any) => `[${l.name}]`).join(" ");
        return [
          `#${issue.number}: ${issue.title}`,
          `  ${issue.state} | 💬 ${issue.comments} | ${issue.html_url}`,
        ].join("\n");
      }).join("\n\n");

      // Build header with pagination info
      let header = `## Issues in ${owner}/${repo} (page ${page})`;
      if (pagination.last) {
        const lastPage = parseInt(
          new URL(pagination.last).searchParams.get("page") || "1", 10
        );
        header += `\n📄 Page ${page} of ${lastPage}`;
      }
      if (pagination.next) header += `\n➡️ Next page available`;

      return {
        content: [{ type: "text", text: `${header}\n\n${formatted}` }],
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error: ${error}` }],
        isError: true,
      };
    }
  },
);

// Tool 7 — NEW: Batch label multiple issues
server.tool(
  "batch_label_issues",
  "Apply labels to multiple issues at once — extremely useful during triage sessions",
  {
    owner: z.string().describe("Repository owner"),
    repo: z.string().describe("Repository name"),
    issue_numbers: z.array(z.number().int().positive()).min(1).max(25).describe("Issue numbers to label (max 25)"),
    labels: z.array(z.string()).min(1).max(10).describe("Labels to apply (max 10)"),
  },
  async ({ owner, repo, issue_numbers, labels }) => {
    const results: { number: number; success: boolean; error?: string }[] = [];

    // Process each issue sequentially to avoid rate limiting
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
          failCount > 0
            ? `\n### Failures:\n${results.filter(r => !r.success).map(r => `- #${r.number}: ${r.error}`).join("\n")}`
            : "",
        ].join("\n"),
      }],
    };
  },
);

// ════════════════════════════════════════════════════════════
// ──── RESOURCES ────
// ════════════════════════════════════════════════════════════

// Resource 1 — Single issue as markdown content
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

      const labels = issue.labels.map((l: any) => `\`${l.name}\``).join(" ");
      const assignees = issue.assignees.map((a: any) => `@${a.login}`).join(", ");

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
        contents: [{
          uri: uri.href,
          mimeType: "text/markdown",
          text: markdown,
        }],
      };
    } catch (error) {
      throw new Error(`Failed to fetch issue: ${error}`);
    }
  },
);

// Resource 2 — Issue comments as a threaded conversation
server.resource(
  "issue-comments",
  new ResourceTemplate("issue://{owner}/{repo}/{number}/comments", { list: undefined }),
  async (uri, { owner, repo, number }) => {
    try {
      const url = `${GITHUB_API_BASE}/repos/${owner}/${repo}/issues/${number}/comments`;
      const response = await githubFetch(url);

      if (!response.ok) {
        throw new Error(`GitHub API: ${response.status}`);
      }

      const comments: any[] = await response.json() as any[];

      if (comments.length === 0) {
        return {
          contents: [{
            uri: uri.href,
            mimeType: "text/markdown",
            text: `*No comments yet.*`,
          }],
        };
      }

      const formatted = comments
        .map((c: any) => {
          const date = new Date(c.created_at).toLocaleDateString();
          return [
            `---`,
            `**@${c.user.login}** commented on ${date}`,
            ``,
            c.body || "*No text*",
          ].join("\n");
        })
        .join("\n\n");

      return {
        contents: [{
          uri: uri.href,
          mimeType: "text/markdown",
          text: `# Comments for #${number}\n\n${formatted}`,
        }],
      };
    } catch (error) {
      throw new Error(`Failed to fetch comments: ${error}`);
    }
  },
);

// Resource 3 — Open issues listing
server.resource(
  "open-issues",
  new ResourceTemplate("issue://{owner}/{repo}/open", { list: undefined }),
  async (uri, { owner, repo }) => {
    try {
      const issues = await github.listIssues(owner as string, repo as string, "open");

      if (issues.length === 0) {
        return {
          contents: [{
            uri: uri.href,
            mimeType: "text/markdown",
            text: `✨ No open issues!`,
          }],
        };
      }

      const list = issues
        .map((issue: any) => {
          return [
            `- **[#${issue.number}](${issue.html_url}): ${issue.title}**`,
          ].join("\n");
        })
        .join("\n");

      return {
        contents: [{
          uri: uri.href,
          mimeType: "text/markdown",
          text: `# Open Issues in ${owner}/${repo}\n\nTotal: ${issues.length}\n\n${list}`,
        }],
      };
    } catch (error) {
      throw new Error(`Failed to list issues: ${error}`);
    }
  },
);

// ════════════════════════════════════════════════════════════
// ──── PROMPTS ────
// ════════════════════════════════════════════════════════════

// Prompt 1 — Triage workflow
server.prompt(
  "triage-issue",
  "Template for triaging a new GitHub issue: analyze severity, suggest labels, propose next steps",
  {
    owner: z.string().describe("Repository owner"),
    repo: z.string().describe("Repository name"),
    issue_number: z.number().int().positive().describe("Issue number to triage"),
  },
  ({ owner, repo, issue_number }) => ({
    messages: [{
      role: "user",
      content: {
        type: "text",
        text: [
          `Please triage issue #${issue_number} in ${owner}/${repo}.`,
          ``,
          `First, fetch the issue details using get_issue tool. Then analyze:`,
          ``,
          `1. **Severity Assessment** — Bug, feature request, or question?`,
          `   - If bug: critical (blocks work), major (breaks feature), minor (cosmetic)?`,
          `2. **Label Suggestions** — What labels fit?`,
          `3. **Priority** — Immediate, this sprint, or backlog?`,
          `4. **Assignee** — Which team or person should look?`,
          `5. **Next Steps** — What should the reporter do next?`,
        ].join("\n"),
      },
    }],
  }),
);

// Prompt 2 — Weekly summary
server.prompt(
  "weekly-summary",
  "Generate a weekly summary of issue activity for a repository",
  {
    owner: z.string().describe("Repository owner"),
    repo: z.string().describe("Repository name"),
  },
  ({ owner, repo }) => ({
    messages: [{
      role: "user",
      content: {
        type: "text",
        text: [
          `Generate a weekly summary for ${owner}/${repo}.`,
          ``,
          `1. List open issues using the open-issues resource`,
          `2. Group: 🔥 New this week  |  📝 Recently updated  |  🧊 Stale (30+ days)`,
          `3. Include number, title, labels, last update for each`,
          `4. Give a count summary at top`,
        ].join("\n"),
      },
    }],
  }),
);

// Prompt 3 — Bug report template
server.prompt(
  "bug-report-template",
  "Pre-formatted bug report template for filing an issue",
  {},
  () => ({
    messages: [{
      role: "user",
      content: {
        type: "text",
        text: [
          `Use this template to file a bug report:`,
          ``,
          `## Bug Report`,
          `### Describe the Bug`,
          `### To Reproduce`,
          `### Expected Behavior`,
          `### Screenshots`,
          `### Environment (OS, Browser, Version)`,
        ].join("\n"),
      },
    }],
  }),
);

// ════════════════════════════════════════════════════════════
// ──── START THE SERVER ────
// ════════════════════════════════════════════════════════════

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("✅ github-issue-manager running on stdio");
  console.error("   Capabilities: 7 tools · 3 resources · 3 prompts");
  console.error("   Resources: issue://{owner}/{repo}/{number}, /comments, /open");
  console.error("   Prompts: triage-issue, weekly-summary, bug-report-template");
}

main().catch((error) => {
  console.error("❌ Fatal error:", error);
  process.exit(1);
});
```

---

## Step 3: Resources Deep Dive

The full code above includes 3 resources. Let's examine each one.

### Resource 1 — `issue-detail`: Read a Single Issue

**URI template:** `issue://{owner}/{repo}/{number}`

This resource returns a GitHub issue as formatted markdown. The LLM reads it like a document — title, status, labels, and body all in one readable format.

**How the code works:**
1. The template extracts `{owner}`, `{repo}`, `{number}` from the URI
2. We call `github.getIssue()` to fetch the issue from GitHub
3. We assemble a markdown string with all key fields
4. We return it with `mimeType: "text/markdown"` — tells the LLM it's readable text

**What the LLM receives:**
```markdown
# My Issue Title
**Status:** 🟢 Open
**Author:** @user1 | **Labels:** `bug` `priority`
**URL:** https://github.com/owner/repo/issues/42
---
Steps to reproduce: 1. Click X 2. See error Y
```

**Why this matters:** Without resources, the LLM would call `get_issue` tool every time. With resources, the host fetches content *before* the LLM starts generating — it's part of the context from the start.

### Resource 2 — `issue-comments`: Read the Discussion Thread

**URI template:** `issue://{owner}/{repo}/{number}/comments`

Returns all comments as a threaded conversation. Each comment has author + date.

**How the code works:**
1. Fetch comments directly from GitHub REST API
2. If no comments, return friendly message
3. Otherwise, map each comment to markdown with `---` separator

**What the LLM receives:**
```markdown
# Comments for #42

---
**@alice** commented on 6/1/2026
I can reproduce this on macOS.

---
**@bob** commented on 6/2/2026
Fixed in PR #100.
```

### Resource 3 — `open-issues`: Overview of All Open Issues

**URI template:** `issue://{owner}/{repo}/open`

Quick summary of all open issues — great for "what's outstanding?".

**How the code works:**
1. Call `github.listIssues()` with state `"open"`
2. Format as markdown list with hyperlinks
3. Empty state: "✨ No open issues!"

**What the LLM receives:**
```markdown
# Open Issues (3)

- [#42](https://...): Login button broken
- [#43](https...): Dark mode toggle
- [#44](https...): API docs
```

### Resources vs Tools: Why Both?

| Situation | Uses | Reason |
|-----------|------|--------|
| "What's the status of #42?" | Resource | Read-only, formatted content |
| "Close issue #42" | Tool `update_issue` | Side-effect, changes state |
| "What open issues exist?" | Resource | Read-only LLM browses |
| "Set labels on #42" | Tool `update_issue` | Side-effect |

**Resources = files (read-only, structured). Tools = commands (can modify state).** MCP separates them so the host caches resources efficiently and requires confirmation for tool calls.

---

## Step 4: Prompts Deep Dive

Prompts are reusable templates. User selects a prompt → server renders structured instructions → LLM follows the workflow.

### Prompt 1 — `triage-issue`: Guided Issue Analysis

**Parameters:** `owner`, `repo`, `issue_number`

When user invokes:
1. User opens prompt menu in Claude Desktop
2. Selects "triage-issue"
3. Form appears: owner, repo, issue_number
4. User fills and submits
5. Server renders analysis request
6. LLM calls `get_issue`, analyzes, returns structured triage

**Rendered:**
```
Please triage issue #42 in owner/repo.
1. Severity — Bug, feature, or question?
2. Labels — What fits?
3. Priority — Now, this sprint, or backlog?
4. Assignee — Who should look?
5. Next steps — What's missing?
```

### Prompt 2 — `weekly-summary`: One-Click Reporting

Without this prompt, "give me a weekly summary" produces inconsistent results. The prompt standardizes the format every time.

**Rendered:**
```
1. List open issues
2. Group: 🔥 New | 📝 Updated | 🧊 Stale (30d+)
3. Include number, title, labels, last update
4. Count summary at top
```

Result is always the same structure — reliable, predictable.

### Prompt 3 — `bug-report-template`: Structured Data Entry

Returns a blank template. The LLM asks the user for details and calls `create_issue` when complete.

**Rendered:**
```
## Bug Report
### Describe the Bug
### To Reproduce
### Expected Behavior
### Environment
```

### Why Prompts Matter

**LLMs produce inconsistent output with vague instructions.** A prompt locks down the workflow — user always gets the same quality of result.

---

## Step 5: Build & Test

```bash
npm run build
export GITHUB_TOKEN="ghp_your_token_here"
npx @modelcontextprotocol/inspector node build/index.js
```

Open Inspector. Three tabs:

**🛠 Tools Tab** — All 7 tools listed. Test each with params.

**📄 Resources Tab** — Read each URI template:
- `issue://myuser/myrepo/1` → markdown with issue detail
- `issue://myuser/myrepo/1/comments` → threaded conversation
- `issue://myuser/myrepo/open` → open issues overview

**💬 Prompts Tab** — Select, fill params, see rendered template.

### Test in Claude Desktop

```json
{
  "mcpServers": {
    "github-issue-manager": {
      "command": "node",
      "args": ["/path/to/github-issue-mcp/build/index.js"],
      "env": { "GITHUB_TOKEN": "ghp_your_token_here" }
    }
  }
}
```

Try:
- *"What are open issues in ptminh-kmp/ptminh-kmp.github.io?"* → reads resource
- Type `/` → select `weekly-summary` → structured report
- *"Add label 'bug' to issues 1, 2, 3"* → batch_label tool

---

## Server Capabilities After Day 2

```
📁 github-issue-manager v1.0.1
├── 🛠 Tools (7): list, get, create, update, search, paginated, batch
├── 📄 Resources (3): issue-detail, comments, open-issues
└── 💬 Prompts (3): triage, weekly-summary, bug-report-template
```

| Capability | Count | Purpose |
|-----------|-------|---------|
| Tools | 7 | Actions — read/write GitHub issues |
| Resources | 3 | Read-only data as markdown |
| Prompts | 3 | Scaffolded workflows |

Your server is now a **full MCP citizen** — supporting all three capabilities.

---

## Prepare for Day 3

Current: stdio transport, localhost only.

**Day 3:** SSE transport + Docker. Accessible from any machine.

```
Day 2: Child process (localhost only)
Day 3: HTTP server (network accessible)
```

---

| Day | Topic | Status |
|-----|-------|--------|
| 1 | Setup & Architecture | ✅ |
| 2 | **Resources, Prompts & Advanced Tools** | ✅ **Done** |
| 3 | SSE Transport & Remote Deployment | Coming next |
| 4 | Authentication & Production Hardening | — |
| 5 | Testing, Publishing & Ecosystem | — |

---

*Series: Building an MCP Server from Scratch. Day 2: Resources (read-only issue content), Prompts (triage, summary, bug report), and Advanced Tools (paginated listing, batch labeling). Full TypeScript source code included.*
