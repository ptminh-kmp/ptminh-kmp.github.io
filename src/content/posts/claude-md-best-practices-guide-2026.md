---
lang: en
title: "The CLAUDE.md Bible: How to Make AI Coding Agents Actually Understand Your Project"
description: "CLAUDE.md is the single highest-leverage file in modern AI-assisted development. From project-level configuration to hooks, skills, auto memory, and folder-scoped rules — here's how to stop repeating yourself and make Claude Code, Codex, Cursor, and every other agent work the way you want."
published: 2026-04-30
category: DevOps
tags: ["Claude Code", "CLAUDE.md", "AI Coding", "Best Practices", "Codex", "Cursor", "Prompt Engineering", "Developer Tools"]
author: minhpt
mermaid: false
---

Every developer using AI coding agents has been here: you tell Claude Code to fix a bug, it rewrites your build system. You ask Codex to add a test, it imports a library you explicitly banned. You explain the same thing three sessions in a row — because every time the agent starts fresh.

The fix is called **CLAUDE.md** — a markdown file sitting in your project root that tells the agent who you are, how you build, and what you never want to see. And if you think it's just "a file with instructions," you're missing the full picture.

Let's fix that.

## What Is CLAUDE.md?

CLAUDE.md is a configuration file read by AI coding agents (Claude Code, Codex, Cursor Agent, Gemini CLI) at the start of every session. It provides persistent context — build commands, coding conventions, architectural decisions, style preferences — so the agent doesn't have to rediscover your project every time.

Think of it as your project's constitution. Once it's set, every agent session follows the same rules, every team member benefits from shared conventions, and you stop repeating yourself.

## CLAUDE.md vs. Auto Memory: Two Systems, One Goal

Claude and Codex both have two complementary memory systems. Understanding the difference matters:

| | CLAUDE.md | Auto Memory |
|---|---|---|
| **Who writes it** | You | The AI agent |
| **What it contains** | Rules, conventions, architecture | Learned patterns, corrections |
| **Scope** | Project/user/org | Per working directory |
| **Loaded** | Every session (full) | Every session (first 200 lines / 25KB) |
| **Best for** | Hard constraints | Preferences discovered over time |

**Rule of thumb:** Write CLAUDE.md for things you *know*. Let auto memory handle things the agent *discovers*.

## Where to Place Your CLAUDE.md Files

CLAUDE.md files follow a precedence hierarchy — more specific locations override broader ones:

| Scope | Location | Purpose |
|---|---|---|
| **Project** | `./CLAUDE.md` (repo root) | Shared conventions for all contributors |
| **Folder** | `./.claude/rules/*.md` | Rules scoped to specific directories |
| **User** | `~/.claude/CLAUDE.md` | Your personal defaults (every project) |
| **Session local** | `./.claude/CLAUDE.md` | Overrides for current session |

```text
Your repo/
├── CLAUDE.md               # Project-level (loaded first)
├── src/
│   ├── CLAUDE.md           # Scoped to /src
│   └── components/
│       └── CLAUDE.md       # Scoped to /src/components
├── .claude/
│   ├── CLAUDE.md           # Session local overrides
│   └── rules/
│       ├── backend.md      # Rules for /backend
│       └── frontend.md     # Rules for /frontend
└── tests/
    └── CLAUDE.md           # Test-specific rules
```

**Practical tip:** Start with one `CLAUDE.md` at the repo root. Add folder-scoped rules only when you find yourself repeating conventions that only apply to one part of the codebase.

## The Anatomy of a Great CLAUDE.md

Here's a template that works for most projects:

```markdown
# Project Overview

This is a Flutter mobile app for [what it does]. 
Tech stack: Flutter 3.24+, Dart 3.5+, Firebase, Riverpod.

## Build & Run

- Build: `flutter build apk --release`
- Run (dev): `flutter run`
- Test: `flutter test`
- Lint: `dart fix --apply`

## Architecture

- State management: Riverpod (not BLoC, not Provider)
- Navigation: GoRouter with shell routes
- DI: Riverpod providers only (no GetIt)
- API layer: Dio with interceptor-based auth

## Code Style

- Use `sealed class` not `freezed` for state classes
- Prefer `AsyncValue` over `FutureBuilder`
- Error handling: return `Either<Failure, T>` from repos
- Named parameters > positional (except for required IDs)
- No `print()` — use `Logger` from `logging` package

## Testing

- Unit tests for providers and repos
- Widget tests for screens
- Integration tests for critical flows
- Mock: `mocktail` (not `mockito`)

## Never

- Never use `BuildContext` outside of widget tree
- Never import `material.dart` in domain layer
- Never commit `print()` statements
- Never generate code with `build_runner` manually (use hooks)
```

### Why This Works

1. **Build commands first** — The agent needs to run tests after every change. Give it the exact command.
2. **Negative rules** — "Never" statements are more effective than "prefer" statements. Agents follow hard don'ts better than soft recommendations.
3. **Specific alternatives** — "not BLoC, not Provider" is better than "use Riverpod." Removing ambiguity about what *not* to use.
4. **Short and scannable** — Under 50 lines. Agents read this every session; long files waste tokens and dilute focus.

## Templates by Stack

### React / Next.js

```markdown
# Build
- Dev: `npm run dev`
- Test: `npm test`
- Build: `npm run build`
- Type check: `npx tsc --noEmit`

# Conventions
- File structure: Feature folders, not type folders
- Path aliases: `@/app`, `@/components`, `@/lib`
- Styling: Tailwind (no styled-components, no CSS modules)
- Data fetching: React Query (no SWR, no useEffect loading)
- State: Zustand for global, React context for auth only
- Components: Server components by default, 'use client' when needed

# Never
- Never import server-side code in client components
- Never use `any` — use `unknown` + type guards
- Never commit `console.log`
- Never use default exports (named exports only)
```

### Python / Django

```markdown
# Build
- Test: `pytest -x --cov`
- Lint: `ruff check . && mypy .`
- Format: `ruff format .`
- Run: `python manage.py runserver`

# Conventions
- Type hints required on all functions
- Django models: `class Meta` before fields
- Serializers: ModelSerializer with explicit fields
- Queries: select_related/prefetch_related for N+1
- Services: Service layer pattern (not fat models, not fat views)

# Never
- Never use `print()` — use `logger.info()` with structlog
- Never import `*` from anything
- Never put business logic in views
- Never use raw SQL unless the ORM can't express the query
```

### Go

```markdown
# Build
- Test: `go test ./... -count=1`
- Build: `go build ./cmd/app`
- Lint: `golangci-lint run`
- Fmt: `gofumpt -l -w .`

# Conventions
- Error handling: check and return immediately, no nesting
- Struct constructors: `func New() *Struct` pattern
- Interface design: Accept interfaces, return structs
- Concurrency: errgroup over WaitGroup, channels over mutexes
- Dependency injection: wire (not manual, not uber/fx)

# Never
- Never use `interface{}` — use `any`
- Never swallow errors with `_`
- Never use `panic` outside of init/shutdown
- Never use `init()` functions
```

### Flutter / Dart

```markdown
# Build
- Dev: `flutter run -t lib/main_dev.dart`
- Test: `flutter test --coverage`
- Build release: `flutter build apk --split-per-abi`
- Format: `dart format .`

# Conventions
- State: Riverpod (not BLoC, not Provider)
- Navigation: GoRouter with shell routes for bottom nav
- API: Dio with interceptor-based token refresh
- Models: toJson/fromJson by hand (no json_serializable)
- Error handling: sealed class Result<T> pattern

# Never
- Never use `BuildContext` after async gap
- Never put `BuildContext` in providers
- Never generate code with build_runner manually
- Never use dynamic — prefer Object? or a proper type
```

## Hooks: The Power Move Beyond CLAUDE.md

CLAUDE.md tells the agent *what you want*. Hooks tell the agent *what it must do*. They're event-driven scripts that run at specific points in the agent's workflow:

| Hook | When It Fires | Use Case |
|---|:---:|---|
| `PreToolUse` | Before the agent runs a tool | Block secrets, enforce rate limits |
| `PostToolUse` | After the agent runs a tool | Format output, update memory |
| `PreCommit` | Before git commit | Lint, type-check, test |
| `FormatOnWrite` | After writing any file | Auto-format, sort imports |

### A Block-Secrets Hook

```bash
#!/bin/bash
# .claude/hooks/PreToolUse/block-secrets.sh

if echo "$@" | grep -E '(api_key|secret|token|password)=' > /dev/null 2>&1; then
  echo "❌ Blocked: committing secrets is not allowed"
  exit 1
fi
exit 0
```

### A Test-Required Hook

```bash
#!/bin/bash
# .claude/hooks/PreCommit/run-tests.sh

flutter test --coverage || exit 1
```

## Skills: Reusable Instruction Sets

Skills are reusable CLAUDE.md-equivalents for specific tasks. You invoke them via slash commands:

```markdown
/clang-tidy-fix    — Run clang-tidy and apply all safe fixes
/changelog          — Generate CHANGELOG.md from conventional commits
/pr-describe        — Write a PR description from the git diff
/test-triage        — Find untested functions and generate test scaffolds
/docs-from-code     — Parse source comments and generate markdown docs
```

Skills live in `.claude/skills/` and each skill is a directory with a `SKILL.md`:

```text
.claude/skills/
├── changelog/
│   └── SKILL.md
├── test-triage/
│   └── SKILL.md
└── pr-describe/
    └── SKILL.md
```

## Auto Memory: Let the Agent Learn

Auto memory is the AI equivalent of taking notes. When you correct an agent, it writes that correction to a memory file. Next session, it starts with that knowledge.

```bash
# See what the agent has learned
cat .claude/memory.json
```

**Example auto-memory entries:**
- "Run `flutter test --coverage`, not `flutter test`"
- "Use `Logger` from `logging` package, not `print()`"
- "Deploy via `firebase deploy --only hosting`"

Auto memory is capped at 200 lines or 25KB. It's best for *discoverable* preferences (build commands that took you a while to find, debugging tricks) — not for rules you should write into CLAUDE.md.

## Practical Workflow with CLAUDE.md

Here's how a session looks with a well-configured CLAUDE.md:

```bash
# Start Claude Code
$ claude

# Loaded: CLAUDE.md (project), ~/.claude/CLAUDE.md (user)
# Auto memory: 14 learnings loaded

# Ask about codebase
$ "How does the auth flow work?"

  Claude reads the codebase, finds auth files,
  maps the flow from login → token → API calls.

# Make a change
$ "Add rate limiting to the API client"

  Claude reads CLAUDE.md, knows to use Dio with interceptors,
  adds rate limit interceptor, runs `flutter test` automatically.

# Correct a mistake
$ "No, use the sliding window algorithm, not token bucket"

  Claude fixes it, and writes this correction to auto memory.
  Next session, it'll know sliding window is preferred.
```

The difference from a session *without* CLAUDE.md? No explaining the tech stack. No clarifying the state management pattern. No "wait, I said Dio not HTTP." The agent just works.

## Performance Impact: Does CLAUDE.md Actually Help?

The claude-code-best-practices repository published benchmarks. The results on a real Next.js codebase:

| Metric | Without CLAUDE.md | With CLAUDE.md | Improvement |
|---|---|---|---|
| Correct build command first try | 34% | 91% | **+57pp** |
| Follows import convention | 28% | 95% | **+67pp** |
| Correct test framework | 41% | 97% | **+56pp** |
| No unwanted file changes | 52% | 89% | **+37pp** |
| Task completion time (avg) | 4m12s | 1m48s | **-57%** |
| Agent cost per task | ~$0.38 | ~$0.19 | **-50%** |

**Bottom line:** A well-written CLAUDE.md cuts both time and cost in half. The ROI on 20 minutes of writing is measured in hours saved.

## Common Mistakes

### 1. Too Long

❌ A 400-line CLAUDE.md with every edge case documented. Agents read it every session — long files dilute attention and waste prompt cache.

✅ Keep it under 80 lines. Move multi-step procedures to skills.

### 2. Too Generic

❌ "Write clean code" / "Follow best practices" / "Be careful"

✅ "Use Riverpod, not BLoC" / "Sealed class states, not freezed" / "Run `flutter test` after every change"

### 3. Ignoring Negative Rules

Agents follow "don't use X" more reliably than "use Y instead." Always include what you *don't* want:

```markdown
# Bad
Prefer Riverpod for state management.

# Good
Use Riverpod for state management. 
Never use BLoC, Provider, or GetIt.
```

### 4. No Build Commands

If your agent doesn't know how to run tests, it won't run tests. Always include:

```markdown
## Build & Test
- Build: `npm run build`
- Test: `npm test -- --watch=false --bail`
- Lint: `npm run lint`
- Type check: `npx tsc --noEmit`
```

### 5. No Auto Memory Review

Auto memory accumulates cruft. Old build commands, outdated fixes, wrong patterns. Review it periodically.

## CLAUDE.md Beyond Claude Code

While "CLAUDE.md" is named for Claude Code, the pattern works across:

- **Codex** — reads `.codex/CLAUDE.md` or root CLAUDE.md
- **Cursor** — reads `.cursorrules` (functionally equivalent)
- **Gemini CLI** — reads `GEMINI.md`
- **OpenCode** — reads `OPENCODE.md`

The naming changes but the principle is identical. Many teams maintain a single `CLAUDE.md` that works across all agents.

## Getting Started in 10 Minutes

```bash
# 1. Create your CLAUDE.md
cat > CLAUDE.md << 'EOF'
# [Project Name]
Tech stack: Flutter 3.24 / Dart 3.5, Riverpod, GoRouter

## Build & Run
- Dev: flutter run -t lib/main_dev.dart
- Test: flutter test --coverage
- Build: flutter build apk --release
- Format: dart format .

## Conventions
- State: Riverpod (no BLoC, no GetIt)
- API: Dio with interceptors
- Errors: sealed class Result<T>
- Tests: mocktail (not mockito)

## Never
- Never use BuildContext after async gap
- Never commit print() statements
- Never generate code with build_runner manually
- Never import material.dart in domain layer
EOF

# 2. Add it to git
git add CLAUDE.md
git commit -m "Add CLAUDE.md with project conventions"

# 3. Test it
claude "What's the first thing you notice about this project?"
```

## The Bottom Line

CLAUDE.md is the single highest-leverage file in modern AI-assisted development. It costs 20 minutes to write and saves hours daily. It eliminates the "explain yourself every session" problem. It makes your team's agent usage consistent. And it cuts costs by preventing wrong-tool, wrong-framework, wrong-pattern mistakes.

If you're using AI coding agents without CLAUDE.md, you're paying twice — once in token costs and once in frustration. Write it today.

---

*The CLAUDE.md templates in this post are adapted from the claude-code-best-practices repository and Anthropic's CLAUDE.md documentation.*
