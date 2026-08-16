---
title: "MiniGrid: Sudoku Game"
tagline: "Bite-sized Sudoku — from a 4×4 warm-up to the full 9×9 classic."
description: "A modern, minimalist Sudoku game with 4×4, 6×6, and 9×9 grids, a difficulty rating you can actually trust, daily challenges with streaks, and global leaderboards — all playable offline, no account required."
image: "/images/mini-sudoku/icon.png"
platform: "iOS, Android"
type: "Mobile Game"
techStack:
  - Flutter
  - Riverpod
  - Hive
  - Firebase Auth
  - Cloud Firestore
  - Firebase Remote Config
  - Google AdMob
status: "iOS (Android Coming Soon)"
demo: ""
appStoreUrl: "https://apps.apple.com/us/app/minigrid-sudoku-game/id6791644807"
playStoreUrl: ""
category: "Games"
tags:
  - sudoku
  - puzzle
  - flutter
  - indie dev
  - mobile game
  - brain training
  - offline game
lang: en
draft: false
---

Most Sudoku apps assume you're sitting down for fifteen minutes. I usually don't have fifteen minutes — I have the length of a coffee break, or the line at the pharmacy. What I wanted was a Sudoku that could stretch to fill either.

So instead of building yet another 9×9-only app, I built one where the grid size is the difficulty knob: a 4×4 you can clear in under a minute, a 6×6 for a proper coffee break, and the full 9×9 for when you actually have time to sit with it.

That became **MiniGrid: Sudoku Game**.

---

## What MiniGrid Actually Does

Pick a grid size — 4×4, 6×6, or 9×9 — and each one has its own numbered track of levels to work through, from easy to expert. Every level you clear earns up to **3 stars**, based on how clean the run was: zero mistakes and zero hints gets you all three.

Tap a cell, tap a number. Undo and redo step you back and forward through your moves, a notes mode lets you jot small candidate numbers in a cell instead of committing, and erase clears a cell you've talked yourself out of.

## A Difficulty Rating You Can Trust

Here's the thing that bugged me about most puzzle generators: they rate difficulty by counting how many cells are blank. That's a terrible proxy — a puzzle with 40 empty cells can be trivial, and one with 30 can require genuine guesswork.

MiniGrid rates difficulty by actually solving the puzzle the way a human would, tracking which techniques were needed:

| Difficulty | Technique required |
| --- | --- |
| **Easy** | Naked Single, Hidden Single |
| **Medium** | + Locked Candidate (pointing pairs) |
| **Hard** | + Naked Pair |
| **Expert** | None of the above suffice — real deduction required |

If the solver has to fall back to guessing, the puzzle doesn't ship as Easy just because it happens to have a lot of clues. The label on the level actually means something.

## Hints, Mistakes, and the Occasional Rewarded Ad

You get 5 mistakes per level before it's over — shown as hearts, so you always know exactly how much room you have left. You also get 3 free hints per level if you're genuinely stuck; watch a short ad for a bonus hint, or to revive a level you just lost, and keep going without starting over.

None of it is required. Notes, undo, and the difficulty ladder are usually enough to get you unstuck without spending a single hint.

## Daily Challenge & Streaks

Every calendar day, everyone gets the same puzzle — deterministically assigned, so there's no server curating a fresh one and no risk of it changing on you mid-game. Clear it and your streak grows; miss a day and, if you want, a rewarded ad lets you go back and catch up on yesterday's before the streak breaks.

Each day's challenge has its own leaderboard, separate from the regular level boards, so you're racing the same puzzle as everyone else who played today.

## Compete, or Don't

You never need an account to play. Progress is saved locally on your device the moment you make a move, so you can close the app mid-puzzle and pick up exactly where you left off — no login screen in the way.

Signing in only matters if you want your time to show up on a leaderboard. You can sign in with **Google** or **Sign in with Apple**, or stay anonymous with a guest profile and still climb the ranks under a name nobody can trace back to you. Start anonymous and decide to link a Google or Apple account later — your existing scores carry over, nothing is lost.

## Where Your Data Lives

| | Detail |
| --- | --- |
| **Puzzle progress** | Local only, via Hive — never leaves your device |
| **Leaderboard & account** | Firebase Auth + Firestore — only created if you choose to sign in |
| **Sign-in options** | Google, Sign in with Apple, or anonymous guest |
| **Ads** | Standard Google AdMob, used only for optional hint/revive rewards |

## Built For Quick, Everyday Play

Light, dark, or system theme. Sound and haptic feedback you can toggle independently. The interface follows your device language automatically — English, Vietnamese, Spanish, German, and Portuguese are all built in, with more planned.

## Why I Built It This Way

The grid-size range exists because "sit down and solve a puzzle" and "I have ninety seconds" are both real ways people want to play, and most apps only serve one of them. The difficulty rater exists because a level labeled "Easy" that secretly requires guessing is a broken promise to the player. And everything works offline by default because a logic puzzle shouldn't require a network request to open.

---

## Try It

MiniGrid is now available on the App Store (Android version coming soon). No account needed to play — just download the app and start filling in a grid.

Have a bug to report or a feature you'd like to see once it's out? My contact details are in the app's settings screen the day it ships. I read everything.
