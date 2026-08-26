---
title: "Knotweave"
tagline: "Trace the path, connect every number, fill the grid."
description: "A minimalist number-path puzzle: connect the numbers in order with a single unbroken line that fills every cell. Hundreds of levels, a Daily Challenge, global leaderboards, and unlockable themes."
image: "https://pub-7195c0de97e0471b82c50ab420edc006.r2.dev/apps/knotweave/icon.png"
screenshots:
  - "https://pub-7195c0de97e0471b82c50ab420edc006.r2.dev/apps/knotweave/home.jpg"
  - "https://pub-7195c0de97e0471b82c50ab420edc006.r2.dev/apps/knotweave/select-stage.jpg"
  - "https://pub-7195c0de97e0471b82c50ab420edc006.r2.dev/apps/knotweave/gameplay.jpg"
  - "https://pub-7195c0de97e0471b82c50ab420edc006.r2.dev/apps/knotweave/shop.jpg"
  - "https://pub-7195c0de97e0471b82c50ab420edc006.r2.dev/apps/knotweave/daily-challenge.jpg"
  - "https://pub-7195c0de97e0471b82c50ab420edc006.r2.dev/apps/knotweave/win.jpg"
platform: "iOS, Android"
type: "Mobile Game"
techStack:
  - Flutter
  - Provider
  - Firebase Auth
  - Cloud Firestore
  - Firebase Cloud Messaging
  - Cloud Functions
  - Supabase
  - Google AdMob
  - Google Sign-In
status: "Android (iOS Coming Soon)"
demo: ""
appStoreUrl: "https://apps.apple.com/app/id6752108828"
playStoreUrl: "https://play.google.com/store/apps/details?id=com.minixium.zip_game"
category: "Games"
tags:
  - puzzle
  - numberlink
  - flutter
  - indie dev
  - mobile game
  - brain training
  - daily challenge
lang: en
draft: false
---

Every numbered-path puzzle I'd played had the same problem: the moment you finish connecting the numbers, the game calls it solved — even if half the board is still empty. That always felt like an unfinished puzzle to me. So I built one where that's not allowed.

That became **Knotweave**.

---

## The One Rule

Drag from **1** to **2**, to **3**, and so on — but your line has to pass through *every single cell* on the grid before it counts as solved. No empty squares left behind, no shortcuts. Walls between certain cells force you to route around them, which is where the real puzzle starts: the later levels aren't hard because the grid is big, they're hard because there's often only one path that actually works.

## Hundreds of Levels, Three Difficulties

Levels are organized into **Easy**, **Medium**, and **Hard** tracks, each with its own progression. Clear a level cleanly and you earn up to **3 stars**; stuck? A built-in hint system points you toward the next correct move — spend an in-game star to use one, so it's always available without ever needing real money.

## A New Puzzle Every Day

The **Daily Challenge** gives everyone the same fresh puzzle each day, split across all three difficulties, with its own leaderboard separate from the regular level boards. Clear it before the timer resets and see how your time stacks up against everyone else who played today.

## Climb the Leaderboard

Sign in and your best times count toward the **global Top 100**, ranked by lifetime stars earned. You can play entirely without an account — signing in only matters once you want your name on the board.

## Restyle Your Grid

The **Shop** unlocks alternate visual themes for the board — Fire, Lava, Snow, Forest, and more — so the puzzle you're staring at for the fifth time in a row at least looks different each time.

## Built to Get Out of Your Way

Light, colorful, and quick to open — no forced tutorials, no mandatory login. Sign in with Google, Sign in with Apple, or stay anonymous as a guest and link an account later without losing progress. Turn on daily reminders if you want a nudge when a new challenge drops, or leave notifications off entirely. Available in English and Vietnamese.

## Why I Built It This Way

Most puzzle games that call themselves "numberlink" let you win the moment the numbers connect, treating the empty cells as decoration. I wanted the empty cells to matter — a puzzle isn't done until the whole board is accounted for. Everything else — the difficulty ladder, the daily challenge, the themes — exists to give you a reason to come back and do it again tomorrow.

---

## Try It

Knotweave is available now on [Google Play](https://play.google.com/store/apps/details?id=com.minixium.zip_game), with the iOS version launching soon on the App Store. No account needed to play — just open the app and start tracing.

Found a bug or have a level idea? My contact details are in the app's Settings screen. I read everything.
