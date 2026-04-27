---
lang: en
title: "MuleSoft Anypoint Code Builder 2026: A Complete Guide to Building Integrations in VS Code"
description: "Step-by-step tutorial on MuleSoft's Anypoint Code Builder — the next-gen IDE built on VS Code. Covers installation, DataWeave mapping, debugging, deployment, and the latest February 2026 features."
published: 2026-04-27
category: Tutorial
tags: ["MuleSoft", "Anypoint Code Builder", "VS Code", "Integration", "DataWeave", "API-Led Connectivity", "Tutorial"]
author: minhpt
mermaid: false
---

If you've built integrations with MuleSoft, you know Anypoint Studio. The Eclipse-based IDE has been the standard for years — powerful, but showing its age. Slow startup, limited extension ecosystem, and a UI that hasn't changed much since 2015.

Enter **Anypoint Code Builder (ACB)**. Launched in 2024 and now in its second year of monthly updates, ACB is MuleSoft's next-generation IDE built on **Visual Studio Code**. It brings modern IDE features, AI-assisted development, and a cleaner workflow to MuleSoft integration development.

This guide covers everything: installation, first project, DataWeave mapping, debugging, deployment, and what's new in the February 2026 release.

## What is Anypoint Code Builder?

Anypoint Code Builder is MuleSoft's official IDE for building integrations, APIs, and automations on the Anypoint Platform. Key differences from Anypoint Studio:

| Feature | Anypoint Studio (Classic) | Anypoint Code Builder |
|---------|--------------------------|----------------------|
| **Base** | Eclipse RCP | VS Code |
| **Startup** | 60-120 seconds | 5-10 seconds |
| **Extensions** | Limited to Mule | Full VS Code marketplace |
| **AI assistant** | None | MuleSoft Vibes (built-in) |
| **DataWeave** | Separate editor | Inline + graphical mapping |
| **Git integration** | Basic | Native VS Code Git |
| **Multi-root workspaces** | No | Yes |
| **Updates** | Quarterly | Monthly |

For developers with 8+ years in the MuleSoft ecosystem, ACB is a meaningful upgrade — not just a reskin.

## Prerequisites

- **VS Code** 1.90+ ([download](https://code.visualstudio.com))
- **Java** 17+ (JDK, not just JRE)
- **Mule runtime** 4.6+ (for local testing)
- **Anypoint Platform account** (free tier available)
- **Git** (optional, for version control)

## Installation Guide

### Step 1: Install the Extension Pack

Open VS Code, go to Extensions (`Ctrl+Shift+X`), and search for **"Anypoint Code Builder"** or **"MuleSoft"**. Install the official extension pack from Salesforce:

```bash
# Or install via command line:
code --install-extension salesforce.mule-dx-pack
```

The pack includes:
- `mule-dx-pack` — Core Mule development (XML editors, canvas, debugger)
- `mule-dx-data-weave-client` — DataWeave language support with preview, debug, and test
- `mule-dx-api-designer` — RAML and OAS API specification editor
- `mule-dx-deploy` — One-click deployment to CloudHub, RTF, or on-prem
- `mule-dx-vibes` — MuleSoft Vibes AI assistant (optional)

### Step 2: Configure Java and Mule Runtime

After installation, ACB will prompt you to configure:

```
1. Open Command Palette (Ctrl+Shift+P)
2. Run: "Mule: Set Java Home"
3. Point to your JDK 17+ installation (e.g., /usr/lib/jvm/java-17-openjdk)
4. Run: "Mule: Set Runtime Home"
5. Point to Mule 4.6+ runtime directory
```

Verify with:
- Open any `.xml` file — syntax highlighting and validation should activate
- Status bar shows Mule runtime version

### Step 3: Login to Anypoint Platform

```bash
# Command Palette → "Mule: Login to Anypoint Platform"
# Or click the user icon in the activity bar
```

This connects ACB to:
- Anypoint Exchange (shared assets, connectors, templates)
- Anypoint Design Center (API specs)
- Anypoint Monitoring (for deployed apps)
- Anypoint Visualizer (for agent interactions)

## Creating Your First Integration Project

### Using a Template (Recommended)

```
1. Command Palette → "Mule: Create Mule Project"
2. Select template: "HTTP API with Database" or blank project
3. Name: "hello-mule-integration"
4. Choose output directory
```

ACB generates a complete project structure:

```
hello-mule-integration/
├── src/
│   ├── main/
│   │   ├── mule/
│   │   │   └── hello-integration.xml    → Main flow definition
│   │   └── java/                        → Custom Java classes (optional)
│   └── test/
│       └── munit/
│           └── hello-integration-test.xml → MUnit test
├── pom.xml                              → Maven project config
├── exchange.json                        → Exchange metadata
└── .vscode/
    ├── settings.json                    → ACB project settings
    └── launch.json                      → Debug configuration
```

### Visual Canvas vs. Code View

ACB gives you two ways to build flows:

**Canvas View** (`flow.xml` → Design tab):
- Drag-and-drop connectors, transformers, and routers
- Visually wire flows with the same palette you know from Studio
- Click any component to configure it directly on the canvas
- Dynamic context menus filtered by project type

**Code View** (`flow.xml` → Source tab):
- Raw XML with language server validation
- Autocomplete for all Mule components
- Real-time error highlighting
- Code snippets for common patterns

Toggle between them with one click. Changes in either view are reflected in the other — no sync issues.

### Building a Simple HTTP → Database Flow

Here's a practical example — accept HTTP POST, transform JSON, insert into database:

**1. Canvas Design:** Drag these components from the palette:
- HTTP Listener (config: port 8081, path `/create`)
- Set Payload (DataWeave transformation)
- Database Insert (config: your DB connection)

**2. DataWeave Transformation:**

```dataweave
%dw 2.0
output application/json
---
{
  "fullName": payload.firstName ++ " " ++ payload.lastName,
  "email": payload.email as String,
  "createdAt": now() as String {format: "yyyy-MM-dd'T'HH:mm:ssZ"},
  "source": "ACB-via-HTTP"
}
```

**3. Connect to Database:**
- Add a Database connector from the palette
- Configure connection (MySQL/PostgreSQL/Oracle)
- Set SQL: `INSERT INTO users(name, email, created_at, source) VALUES(:name, :email, :createdAt, :source)`
- Map DataWeave output fields to SQL parameters

### Running Locally

```
1. Open the Run and Debug panel (Ctrl+Shift+D)
2. Select "Launch Mule Application" configuration
3. Press F5 or click the green play button
4. ACB starts Mule runtime, deploys your app, and shows logs in the Debug Console
5. Test: curl -X POST http://localhost:8081/create -H "Content-Type: application/json" -d '{"firstName":"John","lastName":"Doe","email":"john@example.com"}'
```

The debugger supports breakpoints in both XML and DataWeave editors. Set breakpoints, inspect payload variables, and step through flows.

## DataWeave Development in ACB

DataWeave in ACB is a significant upgrade from Studio:

### Inline DataWeave Preview

When editing DataWeave expressions, ACB shows a live preview panel:

```dataweave
%dw 2.0
input payload application/json
output application/json
---
{
  "user": payload.firstName ++ " " ++ payload.lastName,
  "isActive": payload.status == "active",
  "tags": if (payload.role == "admin") ["admin", "power-user"] else ["standard"]
}
```

- **Input tab:** Paste a sample JSON/XML/CSV payload
- **Output tab:** See the transformation result update in real-time
- **Warnings:** ACB highlights type mismatches, null-safety issues
- **Performance hints:** Shows estimated complexity for large payloads

### Graphical Data Mapping (New in Feb 2026)

The February 2026 release introduced **graphical DataWeave mapping** — drag source fields to target fields, and ACB generates the DataWeave expression automatically:

```
Source (JSON):                      Target (CSV):
┌─────────────────────┐            ┌─────────────────────┐
│ firstName ──────────┼───────────▶│ name                 │
│ lastName  ──────────┼───++──┘    │                      │
│ email     ──────────┼───────────▶│ email                │
│ role      ──────────┼───────────▶│ role                 │
│ status    ──────────┼───if──┐   │ active               │
└─────────────────────┘        │   └─────────────────────┘
                               │   ┌─────────────────────┐
                               └──▶│ if: status == "active" then "Yes" else "No"
                                   └─────────────────────┘
```

For complex transformations, the graphical view is a massive time-saver. For simple ones, inline DW is faster. ACB supports both.

### DataWeave Testing

ACB includes a built-in DataWeave test runner:

```dataweave
// hello-test.dwl
%dw 2.0
import * from dw::test
---
describe "User Transformation" do {
  it "concatenates first and last name" do {
    input = {firstName: "John", lastName: "Doe"}
    expected = "John Doe"
    actual = do {
      input.firstName ++ " " ++ input.lastName
    }
    expect(actual, expected)
  }
  
  it "handles null gracefully" do {
    input = {firstName: null, lastName: "Doe"}
    expected = " Doe"
    actual = do {
      (input.firstName default "") ++ " " ++ (input.lastName default "")
    }
    expect(actual, expected)
  }
}
```

Run via: Right-click `.dwl` file → "Run DataWeave Test"

## Debugging Mule Applications

ACB's debugger is one of its biggest improvements over Studio:

### Setting Breakpoints

- **XML flows:** Click the line number gutter in flow XML
- **DataWeave:** Click line numbers in DW editor
- **Conditional breakpoints:** Right-click breakpoint → "Edit Breakpoint" → set condition

### Debug Session

When you hit a breakpoint:

1. **Variables panel** shows the current Mule message — payload, attributes, variables
2. **Call stack** shows flow execution path with XML line numbers
3. **Watch expressions** let you evaluate DataWeave expressions on-the-fly
4. **Step controls:** Step Over (F10), Step Into (F11), Continue (F5)
5. **Inline values** — ACB shows variable values directly in the XML editor next to the component

### Debug Console

The Debug Console shows:
- Mule runtime logs with color-coded levels
- DataWeave evaluation results
- HTTP request/response tracing
- Real-time error stack traces with clickable source links

## Deployment Options

### Option 1: Deploy to CloudHub (Easiest)

```
1. Command Palette → "Mule: Deploy to CloudHub"
2. Select target environment (DEV/QA/PROD)
3. Configure: app name, region, vCore size, workers
4. Click Deploy
```

ACB handles: packaging → uploading → deploying → health check. Took me 2 minutes on a test run.

### Option 2: Deploy to Runtime Fabric

```
1. Command Palette → "Mule: Deploy to Runtime Fabric"
2. Select RTF target (Kubernetes-based)
3. Configure: replicas, CPU/memory limits, ingress
4. Optional: set environment variables for config injection
```

### Option 3: Export for CI/CD

```
1. Command Palette → "Mule: Export Deployable Archive"
2. Generates: target/hello-mule-integration-1.0.0-mule-application.jar
3. Use in your pipeline: mvn clean package -DskipTests
```

ACB generates standard Maven projects — compatible with any CI/CD pipeline (GitHub Actions, Jenkins, GitLab CI).

## What's New in February 2026

The February 2026 release brought several notable improvements:

### Unified Workspaces
- Import existing Anypoint Studio workspaces directly — ACB creates pointers to your files (no duplication)
- Multi-root workspace support: DataWeave and API components work across multiple projects in one workspace
- Context-aware command palette: shows only relevant actions for the current file/project

### Modernized Canvas
- Updated visual design with improved hierarchy and context awareness
- Less rigid, more fluid feel — closer to modern dev tools
- Configuration tabs accessible directly from canvas components
- Reduced visual clutter, improved focus on flow logic

### Custom Metadata Editor
- Define input/output schemas visually without leaving the canvas
- Graphical custom metadata editor for complex data structures
- Real-time validation against Exchange-defined types

### Graphical DataWeave Mapping (mentioned above)
- Drag-and-drop field mapping with automatic DW expression generation
- Works for JSON, XML, CSV, and flat file transformations

### Simplified Error Handling
- Errors consolidated into unified view (no more hunting across panels)
- Faster scan and action on runtime errors during development
- Clearer error categorization with fix suggestions

### AI: MuleSoft Vibes

ACB includes **MuleSoft Vibes** — an AI assistant trained on MuleSoft documentation, common patterns, and the Exchange ecosystem:

- **Natural language to flow:** "Create an HTTP endpoint that accepts orders, validates them, and inserts into Salesforce" → generates the full XML flow
- **DataWeave generation:** "Transform this Salesforce Account to a CSV row" → generates DataWeave expression
- **Error resolution:** Paste an error → Vibes suggests fixes with code examples
- **Documentation lookup:** "How do I configure OAuth 2.0 for Salesforce connector?" → answers with exact config steps

## Comparison: ACB vs Anypoint Studio

| Criterion | Studio | ACB |
|-----------|--------|-----|
| **Performance** | Heavy, 60-120s startup | Lightweight, 5-10s startup |
| **Extensions** | Mule-only | Full VS Code marketplace + Mule |
| **AI** | None | MuleSoft Vibes built-in |
| **DataWeave** | Separate tab, manual test | Inline preview + graphical mapping |
| **Debugging** | Basic | Variable inspection, inline values, conditional breakpoints |
| **Git** | EGit (basic) | Native VS Code Git (rebase, stash, diff) |
| **Terminal** | Embedded Eclipse console | Full VS Code terminal (zsh, bash, pwsh) |
| **Multi-root** | No | Yes |
| **Update frequency** | Quarterly | Monthly |
| **Learning curve** (from Studio) | — | 1-2 days to adjust |
| **Price** | Included in Anypoint Platform | Same — no extra cost |

## Tips for Studio Veterans

- **The palette is the same** — components are identical. If you know the Mule palette, you know ACB.
- **Keyboard shortcuts differ** — configure your keybindings.json to match Studio shortcuts
- **DataWeave is identical** — no syntax changes. The editor is better, but the language is the same.
- **Exchange access is better** — import shared assets directly from the activity bar
- **Multiple projects** — use multi-root workspaces instead of separate Studio windows

## Common Issues & Fixes

| Issue | Solution |
|-------|----------|
| "Java 17 not found" | Install JDK 17, set JAVA_HOME, restart VS Code |
| "Runtime not configured" | Run "Mule: Set Runtime Home" pointing to Mule 4.6+ |
| "Extension not activating" | Check VS Code version ≥ 1.90, disable conflicting extensions |
| "Canvas not rendering" | Clear VS Code cache (`Developer: Reload Window`), update GPU drivers |
| "DataWeave preview empty" | Provide sample input in the Input tab of the preview panel |
| "Vibes not responding" | Verify Anypoint Platform login, check network/proxy settings |

## The Verdict

Anypoint Code Builder isn't just "Anypoint Studio in VS Code." It's a genuine improvement in every dimension: speed, features, debug experience, and ecosystem access.

For MuleSoft developers — especially those who've been on the platform for years — ACB is the upgrade you've been waiting for. The February 2026 release adds enough polish (graphical DataWeave mapping, unified workspaces, simplified errors) that there's really no reason not to switch.

The learning curve is minimal if you know Studio. The productivity gains are immediate. And with monthly updates, it's only getting better.

---

*Disclaimer: The author has 8+ years of experience with MuleSoft integration development. This guide is based on hands-on experience with Anypoint Code Builder through the February 2026 release.*
