---
lang: en
title: "AutoHarness: A Self-Learning Skill Layer for Claude Code"
description: "Tigerless Labs' autoharness lets Claude Code learn skills from your real sessions, merge near-duplicates, and archive what stops being used — daemon-free and without a benchmark. Here's how it works and why it matters."
published: 2026-10-09
category: AI
tags: ["Claude Code", "AI Agents", "Skills", "Self-learning", "Anthropic", "MCP", "Open Source", "AutoHarness"]
author: minhpt
mermaid: true

---

*Every model generation, we rebuild the harness by hand — the prompts, the tools, the scaffolding that turns a raw model into a working agent. The models get better; the harness around them gets rewritten from scratch. AutoHarness makes a bet on one slice of that problem: what if the skill layer could maintain itself?*

## What is AutoHarness?

**autoharness** is a self-learning skill layer for **Claude Code**, built by **Tigerless Labs** (MIT licensed). It watches the sessions you're already working in, distills what it learns into skills, and manages their whole lifecycle:

- **Learns** skills from your real sessions — no separate data-collection or replay loop
- **Merges** same-scenario skills into one instead of stacking near-duplicates
- **Updates** them as you work (a correction becomes a patch, not a new skill)
- **Prunes** the ones that stop getting used
- **Touches only the skills it wrote itself** — your own hand-written skills are left completely alone

The headline claim is a good hook: **same model, different harness — 42% → 78% on CORE-Bench**. That's swyx's "Big Model vs Big Harness" argument in practice. The harness does much of the work, yet it's still rebuilt by hand every generation. autoharness bets that at least the skill layer can maintain itself.

## The four problems it actually solves

Most "agent memory" ideas drown in the same three failures: nothing is ever deleted, duplicates pile up, and there's no honest signal for whether anything helped. AutoHarness is unusually explicit about these:

1. **It learns from real work.** Reflection fires after a threshold of tool calls in a session — not on a timer, not on turns that only talk. A working stretch triggers learning; a conversation never does.
2. **It groups instead of hoarding.** A new episode doesn't automatically add a skill. A reflector compares it against the existing library and folds same-scenario skills into one — and records which skill absorbed which, so a merge is never mistaken for a death.
3. **It validates in use, not on a benchmark.** A skill survives by being *adhered to* in later turns (loads over the requests it was available for). No oracle on the active path, no tokens spent on a dedicated eval.
4. **It keeps its library visible.** Every session opens with a grouped index of the skills it wrote, so recall doesn't depend on the host happening to surface them. The host's native recall is left untouched; the index is added on top.

## How it works

AutoHarness runs as a pipeline beside Claude Code, and everything it does lands on disk as plain files. The components:

| Component | Role |
|---|---|
| **CAP** (capture) | Hook-driven pipe: grabs each turn, redacts at egress. Holds the trigger — a deterministic tool-call count. |
| **REF** (reflect) | Reads the episode, compares against the skill index, decides add / merge / patch / delete. Proposes only — no write tools. |
| **promoter** | The only writer. Lints the intent (safety, structure, completeness, self-authored-only) and atomically renames it into the live skill directory. |
| **IDX** (surface) | Builds the session-start index of self-authored skills, grouped by category. |
| **MNG** (lifecycle) | Daemon-free lifecycle: recomputed lazily once per session. Ranks skills by usage rate. |
| **curator** | The rarer whole-library pass — folds near-duplicates under umbrellas. |
| **LED** (ledger) | Per-skill append-only sidecar: why each skill was born or changed, with evidence. |

A learned skill is a plain `SKILL.md` in `.claude/skills/` — nothing proprietary. Alongside it:

```
.claude/skills/<name>/
  SKILL.md                     # the skill itself — native format
  .ledger.jsonl                # why it was born / changed (append-only)
  .sidecar.json                # lifecycle counters
  references/evidence-*.md     # the redacted transcript slice that taught it
  scripts/ templates/ ...      # optional support files
```

That `.ledger.jsonl` is the part I like most. Every create/update logs its scenario and decision with a pointer to the actual (redacted) evidence — the raw material to build a benchmark from real usage *if you ever want one*.

## How a skill survives

The lifecycle design is where AutoHarness is most opinionated:

- **Probation:** a new skill is recalled normally but can't be archived until it's had a fair sample of requests (100 in the project layer, 300 globally).
- **Graduation:** at maturity, a skill is archived only if it was *never loaded and never viewed*. "No evidence of use" is treated as different from "evidence of no use."
- **Capacity contention:** after graduation, the only death is contention — nothing is archived until a layer's mature pool exceeds its cap, then the lowest usage rates go first.
- **Archive, never delete:** an archived skill is a directory moved out of recall. Move it back and it revives, history intact.

Three counters are kept strictly separate: a **load** (the model invoked the skill — the only thing the survival rate counts), a **view** (a session read into the skill's directory — recall value, but not adherence), and a **patch** (the skill was improved, so a later load reads as reuse-after-improvement).

## Install and configure

```
/plugin marketplace add tigerless-labs/autoharness
/plugin install autoharness@autoharness
```

Then `/reload-plugins` (or restart Claude Code). It requires **Python 3.11+ as `python3` on your PATH** and has **zero third-party dependencies** — it runs entirely as Python. Zero config by default; everything is tunable via `AUTOHARNESS_*` environment variables (reflection cadence, index size, maturity gates, capacity caps, notifications).

There's exactly one thing to invoke: **`/learn`** distills the session you're in right now, through the same proposal-and-validation chain the background pass uses.

## How it compares

| | Grow unbounded | Offline-gated self-edit | Timer + daemon | **autoharness** |
|---|---|---|---|---|
| Bounds the skill layer | No | Yes | Yes | **Yes** |
| Validation signal | None | Held-out benchmark | Wall-clock inactivity | **Adherence in use** |
| Starts a learning pass | — | Offline batch | Idle time / elapsed days | **Work done in the session** |
| Puts its own library in view | No | No | Yes | **Yes** |
| Needs a benchmark/oracle | No | Yes | No | **No** |
| Needs a resident daemon | No | No | Yes | **No** |

## My take

AutoHarness is interesting less because of the CORE-Bench number and more because of its **design constraints**. Three stand out:

1. **Adherence over benchmarks.** Measuring survival by "was this skill actually loaded when it was available" is a much more honest signal than a held-out score — and it needs no oracle.
2. **Daemon-free lifecycle.** Everything is recomputed lazily at session start, so there's nothing resident to babysit and a closed laptop doesn't age your skills out.
3. **Strict ownership.** The "only touch what I wrote" rule is what makes this shippable. A learning layer that can rewrite your hand-written skills is a liability; one that can't is just a helpful librarian.

This is also a pattern I recognize from the other side: my own assistant runtime has a skill workshop with a weekly collection review that rewrites, merges, and drops the skills *it* generated — and it converges only when the autonomy mode allows it. AutoHarness is the same idea, scoped to Claude Code and pushed further with the ledger, the adherence metric, and archive-not-delete.

If you run Claude Code daily and keep re-teaching it the same lessons, this is worth a look. The real test isn't the benchmark — it's whether, a month in, the library it wrote looks like your work.
