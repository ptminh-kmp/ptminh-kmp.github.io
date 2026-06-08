---
title: "Build MCP Server từ Scratch — Day 2: Resources, Prompts & Advanced Tools"
description: "Thêm Resources và Prompts vào MCP server của bạn. Expose issue comments như readable content, tạo reusable prompt templates, thêm advanced tools với pagination và batch operations, test cả ba capabilities với MCP Inspector."
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

Day 1 cho chúng ta MCP server với 5 tools. Hôm nay thêm hai capabilities còn lại: **Resources** và **Prompts**.

```
Day 1: Tools only          Day 2: Tools + Resources + Prompts
tools/list                 tools/list + resources/list + prompts/list
tools/call                 tools/call + resources/read + prompts/get
```

---

## Resources: Expose Data cho LLM

Resources là read-only files LLM có thể browse và đọc. Mỗi resource có URI, name và MIME type.

### Ba resources cho issue manager

| Resource URI | Mô tả |
|-------------|-------|
| `issue://{owner}/{repo}/{number}` | Issue chi tiết dạng markdown |
| `issue://{owner}/{repo}/{number}/comments` | Comments như conversation thread |
| `issue://{owner}/{repo}/open` | Danh sách open issues |

### Code

```typescript
server.resource(
  "issue-detail",
  new ResourceTemplate("issue://{owner}/{repo}/{number}", { list: undefined }),
  async (uri, { owner, repo, number }) => {
    const issue = await github.getIssue(owner as string, repo as string, parseInt(number as string));
    return {
      contents: [{
        uri: uri.href,
        mimeType: "text/markdown",
        text: `# ${issue.title}\n\n**Status:** ${issue.state}...`,
      }],
    };
  },
);
```

Ba resources: chi tiết issue, comments, open issues list — mỗi cái trả về markdown.

---

## Prompts: Reusable Templates

Prompts là templates user có thể invoke — giống macros. User chọn prompt, điền params, LLM nhận structured input.

### Ba prompts

```typescript
server.prompt(
  "triage-issue",
  "Template cho triaging GitHub issue",
  { owner: z.string(), repo: z.string(), issue_number: z.number() },
  ({ owner, repo, issue_number }) => ({
    messages: [{
      role: "user",
      content: {
        type: "text",
        text: `Please triage issue #${issue_number} in ${owner}/${repo}...`
      }
    }]
  })
);
```

| Prompt | Params | Output |
|--------|--------|--------|
| `triage-issue` | owner, repo, issue_number | Severity, labels, priority, assignee, next steps |
| `weekly-summary` | owner, repo | Grouped by new/updated/stale |
| `bug-report-template` | (none) | Pre-formatted bug report form |

User mở Claude Desktop, gõ `/`, chọn prompt, điền params → LLM tự động chạy workflow.

---

## Advanced Tools

### Paginated issue listing

```typescript
server.tool(
  "list_issues_paginated",
  "List issues với full pagination",
  { owner, repo, state, page, per_page, sort, direction },
  async ({ owner, repo, page }) => {
    // Parse GitHub Link header cho page info
    // Trả về formatted issues + page indicator
  }
);
```

### Batch labeling

```typescript
server.tool(
  "batch_label_issues",
  "Add labels cho nhiều issues cùng lúc",
  { owner, repo, issue_numbers: z.array(z.number()), labels: z.array(z.string()) },
  async ({ owner, repo, issue_numbers, labels }) => {
    // Loop qua từng issue, update label
    // Trả về summary: succeeded/failed counts
  }
);
```

---

## Sau Day 2 Server Có

| Capability | Items |
|-----------|-------|
| **Tools** (7) | list, get, create, update, search, paginated, batch |
| **Resources** (3) | issue-detail, issue-comments, open-issues |
| **Prompts** (3) | triage-issue, weekly-summary, bug-report-template |

Full MCP citizen — support cả 3 spec capabilities.

---

## Chuẩn Bị Cho Day 3

Hiện tại server chỉ chạy localhost qua stdio. Hạn chế.

**Ngày mai:** Thêm **SSE transport**, deploy với Docker, server accessible từ bất kỳ máy nào.

---

| Day | Chủ đề | Status |
|-----|--------|--------|
| 1 | Setup & Architecture | ✅ |
| 2 | **Resources, Prompts & Advanced Tools** | ✅ **Done** |
| 3 | SSE Transport & Remote Deployment | Coming next |
| 4 | Authentication & Production Hardening | — |
| 5 | Testing, Publishing & Ecosystem | — |

---

*Series: Building an MCP Server from Scratch. Day 2: Resources, prompts và advanced tools.*
