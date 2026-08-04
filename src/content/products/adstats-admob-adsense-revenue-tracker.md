---
title: "AdStats: Revenue Tracker"
tagline: "Your AdMob & AdSense earnings, in one glance."
description: "Track your Google AdMob and AdSense revenue in real time, right from your phone. Live dashboard, growth comparison, home screen widgets, and privacy mode — built for developers and publishers."
image: "/images/adstats/icon.png"
screenshots:
  - "/images/adstats/screenshot-1.png"
  - "/images/adstats/screenshot-2.png"
  - "/images/adstats/screenshot-3.png"
platform: "iOS, Android"
type: "Mobile App"
techStack:
  - Flutter
  - Firebase Cloud Functions
  - Firestore
  - Hive
  - Google AdMob API
  - Google AdSense API
status: Active
demo: ""
appStoreUrl: "https://apps.apple.com/us/app/adstats-revenue-tracker/id6756091396"
playStoreUrl: "https://play.google.com/store/apps/details?id=com.minixium.adstats_app"
category: "Developer Tools"
tags:
  - flutter
  - admob
  - adsense
  - indie dev
  - monetization
  - mobile app
  - google ads
lang: en
draft: false
---

It's 11pm. You're in bed, and you open the AdMob app to check today's numbers. Three seconds later you close it and open a browser to check AdSense too, because that YouTube channel's earnings live somewhere else entirely. Two apps, two logins, two different chart styles, and no single number that tells you "how am I actually doing this month?"

I was doing that every single night. So I built the thing I actually wanted: one dashboard, both platforms, real numbers, thirty seconds tops.

That became **AdStats**.

---

## What AdStats Actually Does

You sign in once with your Google account — the same one connected to your AdMob and AdSense accounts — and AdStats pulls everything into a single home screen:

- **Today, Yesterday, This Month, Last Month** — the four numbers you actually check, front and center, no digging through menus
- **Growth comparison** — every period is automatically compared to the one before it, so you see the percentage change, not just a raw number
- **Combined AdMob + AdSense view** — app earnings and web/YouTube earnings, merged into one accurate picture instead of two disconnected apps
- **Per-app and per-website breakdown** — see exactly which app or site is carrying your revenue this month
- **Performance charts** — Earnings, Ad Requests, Impressions, Match Rate, eCPM for AdMob; Page Views, Page RPM, Clicks, CPC, CTR for AdSense — filterable by day, 7-day, 28-day, or any custom date range you pick

```plain
Today        $42.18   ↑ 12% vs yesterday
This Month   $891.40  ↑ 8%  vs last month
```

That's the entire mental model. No spreadsheets, no exporting CSVs, no tab-switching between two Google products that were clearly never designed to talk to each other.

---

## The Features That Make It Stick

### Home Screen Widgets

The dashboard is nice, but the widget is why people actually keep the app. Add the AdStats widget to your iOS or Android home screen and your earnings for today and yesterday just sit there, updating automatically every 30 minutes. You check your revenue the same way you check the weather — a glance, no unlocking required.

### Push Notifications

Every morning at 9:00 AM UTC, AdStats sends a push notification summarizing yesterday's earnings. You don't open the app to find out how you did — the app tells you.

### Privacy Mode

Checking your numbers on a laptop in a coffee shop, or handing your phone to someone to show them a screenshot? One tap blurs every dollar figure on screen. Nobody behind you needs to know your monetization strategy.

### Built on Official APIs Only

AdStats authenticates with real Google OAuth and pulls data exclusively through the official AdMob API and AdSense API — the same APIs Google itself exposes for this purpose. There's no scraping, no unofficial endpoints, nothing that could break silently or put your account at risk.

> AdStats is not affiliated with, endorsed, or sponsored by Google. It's an independent, third-party dashboard built on top of Google's official public APIs.

---

## Where Your Data Actually Lives

This mattered a lot to me, because it's exactly what I'd want to know before signing in with my own Google account:

| | Detail |
| --- | --- |
| **Login** | Google OAuth — AdStats never sees or stores your password |
| **Local cache** | Hive, on-device, 30-minute TTL — instant reopen, no waiting on network |
| **Server cache** | Firestore, 15-minute TTL — only so switching devices doesn't mean waiting for Google's API again |
| **Financial data collection** | None. Your earnings numbers are fetched live and cached briefly for speed — AdStats doesn't build a profile out of your revenue |

---

## Why I Built It This Way

I'm the kind of developer who checks revenue more often than is probably healthy. Every extra tap between "I want to know my earnings" and "I know my earnings" was a tap too many. So the whole app is designed around one rule: **the number you care about should never be more than one glance away.**

That's also why the widget exists before almost anything else did, and why the daily push notification doesn't wait for you to open the app.

Under the hood it's a fairly boring, deliberately boring stack: **Flutter** for one codebase across iOS and Android, **Firebase Cloud Functions** doing the actual Google API calls server-side (so your refresh token never touches a third-party server, only Firebase's), and a two-layer cache — **Hive** on the device, **Firestore** behind it — so the app feels instant even when the underlying API doesn't.

---

## Try It

**AdStats** is free to download on both platforms:

<div class="not-prose flex flex-wrap gap-3 my-6">
  <a href="https://play.google.com/store/apps/details?id=com.minixium.adstats_app" target="_blank" rel="noreferrer" style="display:inline-flex;align-items:center;gap:10px;border-radius:12px;background:#000;color:#fff;padding:10px 16px;text-decoration:none;font-weight:600;">
    ▶ Get it on Google Play
  </a>
  <a href="https://apps.apple.com/us/app/adstats-revenue-tracker/id6756091396" target="_blank" rel="noreferrer" style="display:inline-flex;align-items:center;gap:10px;border-radius:12px;background:#000;color:#fff;padding:10px 16px;text-decoration:none;font-weight:600;">
     Download on the App Store
  </a>
</div>

If you're an app developer or a website publisher running Google AdMob or AdSense and you're tired of checking two different apps to answer one simple question — how am I doing today — give it a try. It costs nothing to find out.

Found a bug or have a feature request? My contact email is in the app's account screen. I read every message.
