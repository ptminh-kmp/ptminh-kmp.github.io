---
title: ClearDebt and FIREpath
description: A debt payoff planner and a FIRE calculator, built with Flutter from scratch. My journey, the math behind them, and why I think they're genuinely useful.
image: https://rustfs.minixium.com/minixium-blog-bucket/clear-debt-and-fire/app_icon.png
platform: Mobile App
type: Mobile
techStack:
  - flutter
  - isar
  - Google Admob
status: Active
demo: ''
category: Mobie App
tags:
  - flutter
  - indie dev
  - personal finance
  - FIRE
  - debt payoff
  - mobile app
lang: en
draft: false
---

Three years ago, I was staring at a spreadsheet with six different debts across four different interest rates, trying to figure out which one to pay first.

I Googled "debt payoff app." Found a dozen results. Downloaded three of them. Two crashed. One hadn't been updated since 2019 and had a UI that looked like it was designed during the Obama administration.

So I did what developers do: I built my own.

That experiment turned into an app — **Clear Debt & FIRE** — and about eight months of weekends. Here's the full story.

***

## The Problem with Existing Apps

Let me be direct about why I thought there was space in this market.

The dominant app in this space, **Mint**, shut down in early 2024, leaving millions of users without a tool. The next option, **YNAB**, costs $14.99/month — which is genuinely a lot for someone who's already struggling with debt. Most free alternatives are either ad-filled nightmares or so stripped-down they're basically useless.

For FIRE calculators, the situation is even worse. **FFCalc**, which was free for years, recently locked its core features behind a $2.99/month paywall mid-subscription. User reviews tell the story: _"Two years ago it had income, interest rate inputs, all of it. Now it's asking $2.99/month. I'll just put together my own spreadsheet."_

The market needed something honest: free core features, no dark patterns, no bank sync required.

***

## ClearDebt — A Debt Payoff Planner That Actually Makes Sense

### What It Does

You enter your debts: name, balance, APR, minimum payment. That's it. ClearDebt calculates:

- **Your debt-free date** — the exact month and year you'll be done
- **Total interest you'll pay** — and how much you save with different strategies
- **Month-by-month breakdown** — what to pay to which debt, this month

### The Snowball vs Avalanche Debate

This is where most people get religious. Snowball (smallest balance first) vs Avalanche (highest interest rate first).

Here's the math-honest answer: **Avalanche almost always saves more money.** But **Snowball has higher completion rates** in real-world studies, because paying off a small debt creates a psychological win that keeps people motivated.

ClearDebt shows you both, side by side, with real numbers:

```plain
Strategy     | Debt-Free Date | Total Interest
Snowball     | March 2028     | $4,847
Avalanche    | January 2028   | $3,912
              ↑ 2 months faster, $935 saved
```

You can also drag a slider to add extra monthly payments and watch both dates update in real time. That's the "wow moment" — seeing that an extra $100/month cuts 14 months off your timeline.

### Monthly Breakdown

The feature I'm most proud of is the monthly breakdown screen. It answers the question that no other app I found could answer clearly:

> _"This month, I have $800 to put toward debt. Exactly how much goes where?"_

You see each debt, what the minimum payment is, which debt gets the extra money (based on your chosen strategy), and what your balance will be after. No ambiguity.

### The Technical Side

ClearDebt is built with **Flutter**, which means one codebase for both iOS and Android. The calculation engine is a pure Dart loop — no external math libraries needed, just:

```dart
while (balance > 0.01 && month < 360) {
  interest = balance × (apr / 100 / 12);
  payment = min(minPayment, balance + interest);
  balance = max(0, balance + interest - payment);
  // apply extra to priority debt
  month++;
}
```

That's the entire debt amortization algorithm. The rest is UI.

Data is stored with **Isar** (a fast embedded database) — completely on-device, no account required, no server.

***

## FIREpath — What If You Could Retire at 42?

The FIRE movement — Financial Independence, Retire Early — has 2.4 million followers on Reddit and growing. The core idea is deceptively simple:

> **Save and invest enough that investment returns cover your living expenses forever.**

The 4% Rule says: if you have 25× your annual expenses invested, you can withdraw 4% per year indefinitely. So if you spend $45,000/year, you need $1,125,000. At that point, you can stop working.

FIREpath helps you figure out when that happens for you.

### 6 FIRE Modes

This is what makes FIREpath different from a simple calculator. There are actually six distinct ways to approach FIRE:

| Mode | What It Means | Multiplier |
| --- | --- | --- |
| **Traditional** | Full retirement, 4% rule | 25× expenses |
| **Lean FIRE** | Minimalist lifestyle, retire earlier | 20× expenses |
| **Fat FIRE** | Comfortable retirement, bigger cushion | 33× expenses |
| **Barista FIRE** | Semi-retire + part-time work | Less — you cover the gap |
| **Coast FIRE** | Already invested enough to coast to retirement | Variable |
| **Slow FIRE** | Normal savings rate, no extreme frugality | 25× expenses |

The app calculates all six simultaneously and shows you the comparison in a single chart.

### Coast FIRE Is Underrated

My favorite feature is the **Coast FIRE detector**. A lot of people have already reached Coast FIRE without knowing it.

Coast FIRE means: _"I've invested enough that, without adding another cent, compound interest will grow my portfolio to my FIRE number by retirement age."_

If you're 35 with $200,000 invested and you want to retire at 62, your Coast number is roughly $169,000 (assuming 7% annual returns). You've already passed it. You could literally stop contributing to retirement accounts today.

FIREpath checks this automatically and flags it if you've crossed the threshold.

### What-If Scenarios

The what-if screen is where people spend the most time. Three sliders:

- **Savings rate** — from 10% to 80%
- **Annual return** — from 3% (conservative) to 12% (optimistic)
- **Annual expenses** — dial up or down

Every change instantly updates your FIRE date. The insight that surprises most people: **reducing expenses is twice as powerful as increasing income**, because it simultaneously lowers your FIRE number AND increases your savings rate.

***

## The Cross-App Synergy

There's an intentional connection between the two apps. The natural user journey is:

1. **Start with ClearDebt** — eliminate debt, which is almost always a better financial move than investing (hard to beat a 20% credit card APR)
2. **Once debt-free**, ClearDebt shows a prompt: _"You just freed up $X/month. See when you can FIRE →"_
3. **Move to FIREpath** — put that debt payment money toward investments and watch your FIRE date accelerate

It's two chapters of the same financial story.

***

## What I'd Do Differently

**Start with the calculation engine, write tests first.** I made the mistake of building UI before thoroughly testing the math. I had a subtle bug in my amortization logic that inflated interest savings by about 3%. Didn't catch it until a beta tester ran the numbers against a spreadsheet.

**Ship uglier, sooner.** Version 1 spent too long in polish mode. Nobody cares about micro-animations on an app they haven't downloaded yet.

**Keywords matter more than design for discoverability.** I spent a weekend on the App Store description and keywords after launch. Downloads went up 40% the following week. The app didn't change. The metadata did.

***

## Try Them

**ClearDebt & FIRE** — Free on [App Store](#) and [Google Play](#).

App works offline, requires no account, and doesn't touch your bank. Your financial data never leaves your device.

If you're carrying debt or wondering when you can retire, I hope they're useful. And if you find a bug or have a feature request, my email is in the app.

***

_Built with Flutter 3.19, Riverpod, Isar, fl_chart, and a lot of Sunday mornings._
