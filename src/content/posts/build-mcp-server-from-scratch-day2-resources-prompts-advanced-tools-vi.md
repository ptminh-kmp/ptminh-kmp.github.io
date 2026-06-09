---
title: "Build MCP Server từ Scratch — Day 2: Resources, Prompts & Advanced Tools"
description: "Thêm Resources và Prompts vào MCP server. Full code + giải thích chi tiết từng resource, từng prompt, và 2 advanced tools mới (pagination, batch labeling)."
published: 2026-06-08
pubDate: 2026-06-08T23:40:00.000Z
slug: build-mcp-server-from-scratch-day2-resources-prompts-advanced-tools-vi
tags:
  - mcp
  - tutorial
  - resources
  - prompts
  - typescript
  - advanced-tools
  - step-by-step
category: ai-agents
lang: vi
series:
  name: "Building an MCP Server from Scratch"
  order: 2
  total: 5
---

Day 1 cho MCP server với 5 tools. Hôm nay thêm **Resources** và **Prompts**.

```
Day 1: Tools only          Day 2: Tools + Resources + Prompts
tools/list                 tools/list + resources/list + prompts/list
tools/call                 tools/call + resources/read + prompts/get
```

Cuối bài, server là **full MCP citizen** — support cả 3 capabilities.

---

## Recap

```bash
github-issue-mcp/
├── src/
│   ├── index.ts         # 5 tools, stdio transport
│   └── github-client.ts
├── package.json
└── tsconfig.json
```

Hôm nay thay thế `src/index.ts` — 7 tools, 3 resources, 3 prompts.

---

## Full Code: src/index.ts

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { GitHubClient } from "./github-client.js";

// ──── Config ────
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
if (!GITHUB_TOKEN) { console.error("Missing GITHUB_TOKEN"); process.exit(1); }

const server = new McpServer({ name: "github-issue-manager", version: "1.0.1" });
const github = new GitHubClient(GITHUB_TOKEN);
const GITHUB_API_BASE = "https://api.github.com";

// ──── Helpers ────
function parseLinkHeader(link: string | null): Record<string, string> {
  if (!link) return {};
  const result: Record<string, string> = {};
  for (const part of link.split(", ")) {
    const match = part.match(/<([^>]+)>;\s*rel="([^"]+)"/);
    if (match) result[match[2]] = match[1];
  }
  return result;
}

async function githubFetch(url: string) {
  return fetch(url, {
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "github-issue-mcp-server/1.0",
    },
  });
}

// ════════════════════════════════════════
// TOOLS (7 tools)
// ════════════════════════════════════════

// Tool 1 — List issues
server.tool("list_issues", "List issues", {
  owner: z.string(), repo: z.string(),
  state: z.enum(["open","closed","all"]).default("open"),
  limit: z.number().min(1).max(100).default(20),
}, async ({ owner, repo, state, limit }) => {
  try {
    const issues = await github.listIssues(owner, repo, state, limit);
    if (!issues.length) return { content: [{ type: "text", text: `No ${state} issues.` }] };
    const formatted = issues.map((i: any) =>
      `#${i.number}: ${i.title}\n  ${i.state} | Created: ${i.created_at.slice(0,10)} | 💬 ${i.comments}\n  ${i.html_url}`
    ).join("\n\n");
    return { content: [{ type: "text", text: `## Issues in ${owner}/${repo} (${state})\n\n${formatted}` }] };
  } catch (e) { return { content: [{ type: "text", text: `Error: ${e}` }], isError: true }; }
});

// Tool 2 — Get single issue
server.tool("get_issue", "Get issue details", {
  owner: z.string(), repo: z.string(),
  issue_number: z.number().int().positive(),
}, async ({ owner, repo, issue_number }) => {
  try {
    const issue = await github.getIssue(owner, repo, issue_number);
    return { content: [{ type: "text", text:
      `# ${issue.title}\n**#${issue.number}** | **State:** ${issue.state}` +
      `\n**Author:** @${issue.user.login} | **Created:** ${issue.created_at}` +
      `\n**URL:** ${issue.html_url}\n---\n${issue.body || "*No description*"}` }] };
  } catch (e) { return { content: [{ type: "text", text: `Error: ${e}` }], isError: true }; }
});

// Tool 3 — Create issue
server.tool("create_issue", "Create issue", {
  owner: z.string(), repo: z.string(),
  title: z.string().min(1).max(256),
  body: z.string().optional(),
  labels: z.array(z.string()).optional(),
  assignees: z.array(z.string()).optional(),
}, async ({ owner, repo, title, body, labels, assignees }) => {
  try {
    const issue = await github.createIssue(owner, repo, { title, body, labels, assignees });
    return { content: [{ type: "text", text: `✅ Created #${issue.number}: ${issue.title}\n${issue.html_url}` }] };
  } catch (e) { return { content: [{ type: "text", text: `Error: ${e}` }], isError: true }; }
});

// Tool 4 — Update issue
server.tool("update_issue", "Update issue", {
  owner: z.string(), repo: z.string(), issue_number: z.number().int().positive(),
  title: z.string().max(256).optional(), body: z.string().optional(),
  state: z.enum(["open","closed"]).optional(),
  labels: z.array(z.string()).optional(), assignees: z.array(z.string()).optional(),
}, async ({ owner, repo, issue_number, ...changes }) => {
  try {
    const issue = await github.updateIssue(owner, repo, issue_number, changes);
    return { content: [{ type: "text", text: `✅ Updated #${issue_number}\nState: ${issue.state}\n${issue.html_url}` }] };
  } catch (e) { return { content: [{ type: "text", text: `Error: ${e}` }], isError: true }; }
});

// Tool 5 — Search issues
server.tool("search_issues", "Search issues", {
  query: z.string().min(1), limit: z.number().min(1).max(50).default(10),
}, async ({ query, limit }) => {
  try {
    const result = await github.searchIssues(query, limit);
    if (!result.issues.length) return { content: [{ type: "text", text: `No results for: "${query}"` }] };
    const formatted = result.issues.map((i: any) => `#${i.number}: ${i.title}\n  ${i.state} | ${i.html_url}`).join("\n\n");
    return { content: [{ type: "text", text: `## Results (${result.total_count} total)\n\n${formatted}` }] };
  } catch (e) { return { content: [{ type: "text", text: `Error: ${e}` }], isError: true }; }
});

// Tool 6 — Paginated listing (MỚI)
server.tool("list_issues_paginated", "Paginated listing", {
  owner: z.string(), repo: z.string(),
  state: z.enum(["open","closed","all"]).default("open"),
  page: z.number().int().min(1).default(1),
  per_page: z.number().int().min(1).max(100).default(30),
  sort: z.enum(["created","updated","comments"]).default("updated"),
  direction: z.enum(["asc","desc"]).default("desc"),
}, async ({ owner, repo, state, page, per_page, sort, direction }) => {
  try {
    const url = `${GITHUB_API_BASE}/repos/${owner}/${repo}/issues?` +
      new URLSearchParams({ state, page: String(page), per_page: String(per_page), sort, direction });
    const res = await githubFetch(url);
    const issues: any[] = await res.json() as any[];
    const pagination = parseLinkHeader(res.headers.get("link"));
    if (!issues.length) return { content: [{ type: "text", text: `No issues page ${page}.` }] };
    const formatted = issues.map((i: any) =>
      `#${i.number}: ${i.title}\n  ${i.state} | 💬 ${i.comments}\n  ${i.html_url}`
    ).join("\n\n");
    let header = `## Issues (page ${page})`;
    if (pagination.last) {
      const last = parseInt(new URL(pagination.last).searchParams.get("page") || "1");
      header += ` — Page ${page}/${last}`;
    }
    return { content: [{ type: "text", text: `${header}\n\n${formatted}` }] };
  } catch (e) { return { content: [{ type: "text", text: `Error: ${e}` }], isError: true }; }
});

// Tool 7 — Batch label (MỚI)
server.tool("batch_label_issues", "Batch label", {
  owner: z.string(), repo: z.string(),
  issue_numbers: z.array(z.number().int().positive()).min(1).max(25),
  labels: z.array(z.string()).min(1).max(10),
}, async ({ owner, repo, issue_numbers, labels }) => {
  const results: { n: number; ok: boolean; err?: string }[] = [];
  for (const n of issue_numbers) {
    try { await github.updateIssue(owner, repo, n, { labels }); results.push({ n, ok: true }); }
    catch (e) { results.push({ n, ok: false, err: String(e) }); }
  }
  const s = results.filter(r => r.ok).length;
  return { content: [{ type: "text", text:
    `## Labels: ${labels.join(", ")}\n✅ ${s}/${issue_numbers.length}` +
    (results.some(r => !r.ok) ? `\n❌ Failed:\n${results.filter(r => !r.ok).map(r => `- #${r.n}: ${r.err}`).join("\n")}` : "")
  }] };
});

// ════════════════════════════════════════
// RESOURCES (3 resources)
// ════════════════════════════════════════

// Resource 1 — Issue detail dạng markdown
server.resource("issue-detail",
  new ResourceTemplate("issue://{owner}/{repo}/{number}", { list: undefined }),
  async (uri, { owner, repo, number }) => {
    const issue = await github.getIssue(owner as string, repo as string, parseInt(number as string));
    return { contents: [{
      uri: uri.href, mimeType: "text/markdown",
      text: `# ${issue.title}\n**Status:** ${issue.state === "open" ? "🟢" : "🔴"}\n**URL:** ${issue.html_url}\n---\n${issue.body || "*No description*"}`,
    }] };
  }
);

// Resource 2 — Comments dạng conversation thread
server.resource("issue-comments",
  new ResourceTemplate("issue://{owner}/{repo}/{number}/comments", { list: undefined }),
  async (uri, { owner, repo, number }) => {
    const url = `${GITHUB_API_BASE}/repos/${owner}/${repo}/issues/${number}/comments`;
    const res = await githubFetch(url);
    const comments: any[] = await res.json() as any[];
    if (!comments.length) return { contents: [{ uri: uri.href, mimeType: "text/markdown", text: "*No comments*" }] };
    const formatted = comments.map((c: any) =>
      `---\n**@${c.user.login}** on ${new Date(c.created_at).toLocaleDateString()}\n\n${c.body || "*No text*"}`
    ).join("\n\n");
    return { contents: [{ uri: uri.href, mimeType: "text/markdown", text: `# Comments\n\n${formatted}` }] };
  }
);

// Resource 3 — Danh sách open issues
server.resource("open-issues",
  new ResourceTemplate("issue://{owner}/{repo}/open", { list: undefined }),
  async (uri, { owner, repo }) => {
    const issues = await github.listIssues(owner as string, repo as string, "open");
    if (!issues.length) return { contents: [{ uri: uri.href, mimeType: "text/markdown", text: "✨ No open issues!" }] };
    const list = issues.map((i: any) => `- [#${i.number}](${i.html_url}): ${i.title}`).join("\n");
    return { contents: [{ uri: uri.href, mimeType: "text/markdown", text: `# Open Issues (${issues.length})\n\n${list}` }] };
  }
);

// ════════════════════════════════════════
// PROMPTS (3 prompts)
// ════════════════════════════════════════

server.prompt("triage-issue", "Triage GitHub issue", {
  owner: z.string(), repo: z.string(), issue_number: z.number(),
}, ({ owner, repo, issue_number }) => ({
  messages: [{ role: "user", content: { type: "text", text:
    `Triage issue #${issue_number} in ${owner}/${repo}.\n1. Severity\n2. Labels\n3. Priority\n4. Assignee\n5. Next steps` } }],
}));

server.prompt("weekly-summary", "Weekly issue summary", {
  owner: z.string(), repo: z.string(),
}, ({ owner, repo }) => ({
  messages: [{ role: "user", content: { type: "text", text:
    `Weekly summary for ${owner}/${repo}.\nGroup: New | Updated | Stale (30d+). Include count + list.` } }],
}));

server.prompt("bug-report-template", "Bug report template", {}, () => ({
  messages: [{ role: "user", content: { type: "text", text:
    `Template:\n## Bug Report\n### Describe\n### To Reproduce\n### Expected\n### Environment` } }],
}));

// ════════════════════════════════════════
// START
// ════════════════════════════════════════

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("✅ 7 tools · 3 resources · 3 prompts");
}
main().catch(e => { console.error("❌", e); process.exit(1); });
```

---

## Giải Thích Resources (3 resources)

Resources là **read-only data**—giống như file LLM có thể đọc. Mỗi resource có URI template + MIME type.

### Resource 1 — `issue-detail`: Xem Issue Chi Tiết

**URI:** `issue://{owner}/{repo}/{number}`

**Code hoạt động:**
1. Template lấy `{owner}`, `{repo}`, `{number}` từ URI
2. Gọi `github.getIssue()` fetch từ GitHub API
3. Trả về markdown với title, status, author, body

**LLM nhận được:**
```
# Login broken
**Status:** 🟢 Open
**Author:** @user1
**URL:** https://github.com/owner/repo/issues/42
---
Steps: click login → see error
```

**Resources vs Tools:** Resource là **data** (đọc, không side-effect). Tool là **hành động** (tạo/sửa/xóa). MCP phân tách rõ để host cache resource hiệu quả.

### Resource 2 — `issue-comments`: Đọc Conversation Thread

**URI:** `issue://{owner}/{repo}/{number}/comments`

**Code hoạt động:**
1. Fetch comments từ `/repos/{owner}/{repo}/issues/{number}/comments`
2. Format mỗi comment thành section với `---` separator
3. Nếu không có comments → "*No comments yet.*"

**LLM nhận được:**
```
--- 
**@alice** on 6/1/2026
I can reproduce this.

---
**@bob** on 6/2/2026
Fixed in PR #100.
```

### Resource 3 — `open-issues`: Danh Sách Open Issues

**URI:** `issue://{owner}/{repo}/open`

**Code hoạt động:**
1. Gọi `github.listIssues(state: "open")`
2. Format thành markdown list với hyperlink
3. Empty state: "✨ No open issues!"

**LLM nhận được:**
```
# Open Issues (3)

- [#42](https://...): Login broken
- [#43](https://...): Dark mode
- [#44](https://...): API docs
```

**Tại sao useful?** Đây là "directory" resource—LLM đọc list này rồi chọn issue để đọc chi tiết qua `issue://.../42`.

---

## Giải Thích Prompts (3 prompts)

Prompts là **reusable templates**—user chọn prompt, điền params, server render thành user message hướng dẫn LLM workflow cụ thể.

### Prompt 1 — `triage-issue`: Guided Issue Analysis

**Params:** `owner`, `repo`, `issue_number`

User chọn prompt → form hiện 3 fields → submit → LLM được instruction:
```
Triage issue #42 in owner/repo.
1. Severity — Bug, feature, or question?
2. Labels — What fits?
3. Priority — Now, sprint, or backlog?
4. Assignee — Who should look?
5. Next steps — What's missing?
```

LLM tự động gọi `get_issue`, phân tích, trả về triage structured.

### Prompt 2 — `weekly-summary`: One-Click Report

**Params:** `owner`, `repo`

Giải quyết vấn đề: LLM không consistent khi không có instruction rõ. Prompt lock down format mỗi lần.

```
Weekly summary for owner/repo.
Group: New | Updated | Stale (30d+). Include count + list.
```

Kết quả luôn consistent—reliable, predictable.

### Prompt 3 — `bug-report-template`: Structured Bug Form

**Params:** (none)

Render sẵn template bug report. LLM hỏi user chi tiết từng section rồi gọi `create_issue`.

### Tại Sao Prompts Quan Trọng?

LLMs cho kết quả **không consistent** nếu instruction mơ hồ. Prompts lock down workflow → user luôn nhận chất lượng giống nhau.

---

## Build & Test

```bash
npm run build
export GITHUB_TOKEN="ghp_your_token_here"
npx @modelcontextprotocol/inspector node build/index.js
```

Inspector UI hiện 3 tabs:

| Tab | Nội dung |
|-----|----------|
| 🛠 **Tools** | 7 tools — list, get, create, update, search, paginated, batch |
| 📄 **Resources** | 3 URI templates — `issue://.../number`, `/comments`, `/open` |
| 💬 **Prompts** | 3 templates — triage, summary, bug-report |

### Test Claude Desktop

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

Thử:
- *"What are open issues in my repo?"* → dùng `open-issues` resource
- Gõ `/tri` → chọn prompt triage-issue → fill params
- *"Add label bug to issues 1, 2, 3"* → gọi `batch_label_issues`

---

## Tổng Kết Sau Day 2

```
📁 github-issue-manager v1.0.1
├── 🛠 Tools (7): list/get/create/update/search/paginated/batch
├── 📄 Resources (3): issue-detail, comments, open-issues
└── 💬 Prompts (3): triage, weekly-summary, bug-report-template
```

| Capability | Count | Purpose |
|-----------|-------|---------|
| Tools | 7 | Actions — read/write GitHub issues |
| Resources | 3 | Read-only data as markdown |
| Prompts | 3 | Scaffolded workflows |

Full MCP citizen — support cả 3 capabilities.

---

**Day 3:** SSE transport + Docker. Server accessible từ xa.

---

| Day | Chủ đề | Status |
|-----|--------|--------|
| 1 | Setup & Architecture | ✅ |
| 2 | **Resources, Prompts & Advanced Tools** | ✅ **Done** |
| 3 | SSE Transport & Remote Deployment | 🆕 |
| 4 | Authentication | — |
| 5 | Testing & Publishing | — |
