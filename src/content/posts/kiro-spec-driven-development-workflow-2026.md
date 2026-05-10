---
title: "Kiro Spec-Driven Development: From Prompt to Pull Request"
description: "Walk through Kiro's spec-driven development workflow end-to-end — generating specs, task planning, implementation review, and the approval cycle. Real example with a subscription billing feature."
published: 2026-05-10
pubDate: 2026-05-10T10:00:00.000Z
slug: kiro-spec-driven-development-workflow-2026
tags:
  - kiro
  - aws
  - spec-driven-development
  - ai-agents
  - workflow
  - prompt-engineering
  - agentic-ide
category: ai-agents
lang: en
series:
  name: "Practical Kiro — AWS's Agentic Development Environment"
  order: 3
  total: 6
---

Spec-driven development is Kiro's superpower. On Day 0 we explained why it matters, on Day 1 we installed and configured everything. Today, we run through a complete spec-driven workflow — from a vague prompt to a merged pull request — using a real feature: building a subscription billing integration with Stripe.

By the end, you'll understand exactly how each stage works, where human judgment is required, and how to get the best results from Kiro's spec engine.

---

## The Setup

We'll use a fictional Node.js SaaS project called **SaaSKit** with:

- Express.js backend
- PostgreSQL via Drizzle ORM
- Stripe for payments
- Vitest for unit tests
- Zod for input validation

Our steering file (`.kiro/steering.md`) already defines the architecture, code standards, and security rules from Day 1. Let's see how Kiro uses that context.

---

## Stage 1: The Prompt

We start with a deliberately vague prompt in **Spec Mode**:

> "Add subscription billing so users can pay monthly"

In Vibe Mode, this prompt would produce a login page and a payments widget — completely wrong. In Spec Mode, Kiro does something different.

---

## Stage 2: Spec Generation

Kiro generates structured requirements. Here's what it produces:

```yaml
## Feature: Subscription Billing

### User Stories
1. As a user, I want to choose between Monthly ($29) and Annual ($290) plans
2. As a user, I want to enter my payment details and subscribe
3. As a user, I want to see my subscription status on my dashboard
4. As a user, I want to cancel my subscription at any time
5. As a user, I want my billing history visible in the app

### Functional Requirements
- [ ] Plan selection screen with Monthly/Annual toggle
- [ ] Stripe Checkout integration for payments
- [ ] Webhook handler for subscription events (created, updated, canceled)
- [ ] Database schema: subscriptions table with status, plan, stripe_customer_id
- [ ] Dashboard widget showing subscription status and next billing date
- [ ] Cancel subscription flow with confirmation dialog

### Acceptance Criteria
- [ ] Monthly plan charges $29.00 USD every 30 days
- [ ] Annual plan charges $290.00 USD every 365 days
- [ ] Users can upgrade from Monthly to Annual (prorated)
- [ ] Downgrade takes effect at next billing cycle
- [ ] Canceled subscriptions remain active until period end
- [ ] Webhook signature verification for all Stripe events
- [ ] All endpoints return 401 for unauthenticated requests
- [ ] Idempotent webhook processing (no duplicate charges)

### Edge Cases
- [ ] Stripe Checkout session expired
- [ ] Webhook delivery failure (retry logic)
- [ ] Customer cancels during trial period
- [ ] Payment method declined (retry with email notification)
- [ ] Concurrent subscription changes
- [ ] Currency mismatch (enforce USD only)
- [ ] Plan price changes mid-cycle (grandfather existing)

### Non-functional Requirements
- [ ] Webhook response within 5 seconds (Stripe timeout)
- [ ] Subscription status cached for dashboard (max 5 min stale)
- [ ] GDPR: export subscription data on request
- [ ] Audit log for all subscription state changes

### Database Schema (suggested)
```sql
CREATE TYPE subscription_status AS ENUM (
  'trialing', 'active', 'past_due', 'canceled', 'unpaid'
);

CREATE TABLE subscriptions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id),
  plan          VARCHAR(20) NOT NULL CHECK (plan IN ('monthly', 'annual')),
  status        subscription_status NOT NULL DEFAULT 'trialing',
  stripe_customer_id VARCHAR(255),
  stripe_subscription_id VARCHAR(255),
  current_period_start TIMESTAMPTZ,
  current_period_end   TIMESTAMPTZ,
  canceled_at    TIMESTAMPTZ,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);
```

### Spec Review Notes

Kiro flags dependencies and potential issues automatically:

```
⚠️ This feature requires Stripe API keys in environment variables
⚠️ Database migration needed (new subscriptions table + index on user_id)
⚠️ Webhook endpoint must be registered in Stripe dashboard
💡 Suggested: add /api/billing/webhook endpoint before Checkout routes
```

**Your job at this stage:** Review and approve the spec. This is the most important human checkpoint in the flow. Correct edge cases, add missing scenarios, validate the schema. Once approved, Kiro creates the task plan.

---

## Stage 3: Task Plan Generation

With the spec approved, Kiro generates a dependency-ordered task sequence:

```yaml
## Task Plan: Subscription Billing

### Task 1: Database Migration
- Create subscriptions table with enum support
- Add indexes on user_id, stripe_customer_id
- Create audit_logs table for billing events
- Dependencies: none
- Acceptance: rollback must be possible

### Task 2: Stripe Configuration Module
- Create services/stripe.ts with client initialization
- Define plan constants (monthly price ID, annual price ID)
- Add webhook signature verification utility
- Dependencies: Task 1 (schema referenced in code)

### Task 3: Subscription Model & Repository
- Create models/Subscription.ts with Drizzle schema
- Create repositories/SubscriptionRepository.ts
- CRUD operations + status transition validation
- Dependencies: Task 1

### Task 4: Checkout API Endpoint
- POST /api/billing/checkout — creates Stripe Checkout Session
- Plan selection, customer creation (or reuse)
- POST /api/billing/portal — Stripe Customer Portal
- Dependencies: Task 2, Task 3

### Task 5: Webhook Handler
- POST /api/billing/webhook — Stripe webhook receiver
- Handle events: checkout.session.completed, invoice.paid, customer.subscription.updated
- Event deduplication via Stripe-Signature header
- Dependencies: Task 2, Task 3

### Task 6: Dashboard Subscription Widget
- Frontend component showing status, plan, next billing date
- Cancel button with confirmation modal
- Billing history table
- Dependencies: Task 4, Task 5 (data shape known)

### Task 7: Unit Tests
- Test each repository method
- Test webhook handler with mock Stripe events
- Validate edge cases (expired checkout, declined payment)
- Dependencies: Tasks 1-5

### Task 8: Integration Tests
- Test full checkout → webhook → subscription creation flow
- Test cancel and re-subscribe cycle
- Test prorated upgrade
- Dependencies: Tasks 1-6
```

**Review the plan carefully.** Dependencies must be correct. If Task 5 needs a database column that Task 1 doesn't include, flag it now. Kiro will adjust the plan before executing.

---

## Stage 4: Implementation

Kiro starts executing tasks in dependency order. You can observe the agent working in real time — it opens files, reads context, writes code, and moves to the next task.

### How Kiro implements Task 1 (Database)

It reads the steering file, understands you use Drizzle ORM, generates:

```typescript
// db/schema/subscriptions.ts
import { pgTable, uuid, varchar, timestamp, pgEnum } from 'drizzle-orm/pg-core';
import { users } from './users';

export const subscriptionStatusEnum = pgEnum('subscription_status', [
  'trialing', 'active', 'past_due', 'canceled', 'unpaid'
]);

export const subscriptions = pgTable('subscriptions', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id),
  plan: varchar('plan', { length: 20 }).notNull(),
  status: subscriptionStatusEnum('status').notNull().default('trialing'),
  stripeCustomerId: varchar('stripe_customer_id', { length: 255 }),
  stripeSubscriptionId: varchar('stripe_subscription_id', { length: 255 }),
  currentPeriodStart: timestamp('current_period_start'),
  currentPeriodEnd: timestamp('current_period_end'),
  canceledAt: timestamp('canceled_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
```

It also generates the migration file automatically.

### How Kiro handles uncertainty

During Task 4 (Checkout API), Kiro encounters an ambiguity: should it use Stripe Checkout or Stripe Elements? It pauses and asks:

> "Your spec says 'Stripe Checkout integration'. I can implement using Stripe Checkout (hosted page, redirect) or Elements (embedded form). Checkout is simpler and PCI-compliant out of the box. Shall I proceed with Checkout?"

You respond, it continues. This question-asking behavior is critical — Kiro doesn't guess when trade-offs exist.

---

## Stage 5: Review & Accept

After all tasks complete, Kiro presents a summary of everything it changed:

```
## Implementation Summary — Subscription Billing

### Files Created (14)
- db/schema/subscriptions.ts (+63 lines)
- db/migrations/0005_subscriptions.sql (+28 lines)
- services/stripe.ts (+45 lines)
- repositories/SubscriptionRepository.ts (+112 lines)
- routes/billing.ts (+89 lines)
- webhooks/stripe.ts (+156 lines)
- frontend/widgets/SubscriptionStatus.tsx (+78 lines)
- frontend/widgets/BillingHistory.tsx (+52 lines)
- frontend/components/CancelModal.tsx (+34 lines)
- tests/unit/subscription-repo.test.ts (+145 lines)
- tests/unit/stripe-webhook.test.ts (+201 lines)
- tests/integration/billing-flow.test.ts (+178 lines)
- types/billing.ts (+22 lines)
- .env.example (updated, +3 lines)

### Files Modified (3)
- db/schema/index.ts (export subscriptions)
- routes/index.ts (register billing routes)
- frontend/router.tsx (add billing pages)

### Test Results
- Unit tests: 32 passed, 0 failed
- Integration tests: 8 passed, 0 failed
- Coverage: 87% (target 80% ✓)

### Open Questions
- [ ] Need to set STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET in production
- [ ] Webhook URL must be registered in Stripe dashboard: /api/billing/webhook
- [ ] Database migration must be run before deployment
```

**Review this summary against the original spec.** Did it implement all acceptance criteria? Are the edge cases addressed? If something is wrong, you can request changes and Kiro will adjust.

---

## Stage 6: The Approval Loop

Kiro's approval cycle works in three modes:

| Mode | Description | Best For |
|------|-------------|----------|
| **Auto-approve** | Kiro moves through tasks without waiting | Routine changes, well-scoped features |
| **Per-task approve** | Review each task before next starts | Complex features, new patterns |
| **Per-file approve** | Review every file diff inline | Security-sensitive changes, compliance |

For this subscription feature, **per-task approve** is appropriate. You'd review database schema changes before Kiro writes business logic, and review business logic before tests.

---

## Practical Tips for Great Specs

### Be specific about the "what", let Kiro figure out the "how"

```
✅ Good: "Users must confirm their email before accessing the dashboard"
❌ Bad:  "Send a confirmation email with a token in the link, verify it in the controller"
```

### Include edge cases upfront

The spec should mention:
- What happens when third-party APIs are down?
- What's the timeout behavior?
- How do we handle duplicate requests?
- What data should never be logged?

### Use examples for ambiguous requirements

```
✅ Good: "Proration: if user upgrades on day 15 of a 30-day cycle,
   charge (plan_price / 30) * 15 remaining days as a one-time adjustment"
```

### Keep steering files in sync

Every time you add a new dependency or change an architectural pattern, update your `.kiro/steering.md`. Kiro reads it at the start of every session — stale steering files produce outdated code.

---

## Spec Mode vs Vibe Mode: When to Use Each

| Situation | Mode | Why |
|-----------|------|-----|
| New feature with clear requirements | **Spec** | Structured output, edge case coverage |
| Bug fix with known root cause | **Vibe** | Faster turnaround, no spec overhead |
| Refactoring (rename, extract, move) | **Vibe** | Simple, well-understood transformations |
| Cross-repo change | **Spec** | Need dependency tracking across projects |
| Prototype / exploration | **Vibe** → **Spec** | Start fast, lock down when direction is clear |
| Security-critical code | **Spec** + per-file review | Maximum oversight |
| CI/CD autofix | **CLI vibe** | Headless, non-interactive |

---

## Common Pitfalls

### Over-specifying the implementation

Specs should describe **what** the system should do, not **how** the code should be written. The spec is a contract between you and the agent — let Kiro choose the implementation details within your steering file's boundaries.

### Accepting the first spec without review

The first generated spec is often 80% correct. The remaining 20% is where bugs hide. Always review edge cases, error handling, and security considerations before approving.

### Forgetting to update steering files

A steering file from a previous project that still says "use MongoDB" will produce wrong results. Keep steering files current — they're the single source of truth for your agent's understanding of your project.

### Skipping the task plan review

The task plan reveals dependency issues and missing components. If you skip this step, Kiro might implement tasks in an order that creates unnecessary merge conflicts or rework.

---

## What's Next

With the spec-driven workflow under your belt, Day 3 explores **Agent Hooks, Powers, and MCP Integrations** — how to automate quality gates, extend Kiro's capabilities, and build your own custom tool integrations.

---

*Series: Practical Kiro — AWS's Agentic Development Environment. Day 2: Spec-Driven Development Workflow. Day 3: Agent Hooks, Powers & MCP → coming next.*
