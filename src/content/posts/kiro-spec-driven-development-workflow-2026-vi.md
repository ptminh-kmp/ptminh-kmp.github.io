---
title: "Spec-Driven Development với Kiro: Từ Prompt đến Pull Request"
description: "Đi qua quy trình spec-driven development của Kiro từ đầu đến cuối — tạo specs, lập kế hoạch task, review implementation, và vòng phê duyệt. Ví dụ thực tế với tính năng subscription billing."
published: 2026-05-10
pubDate: 2026-05-10T10:00:00.000Z
slug: kiro-spec-driven-development-workflow-2026-vi
tags:
  - kiro
  - aws
  - spec-driven-development
  - ai-agents
  - workflow
  - prompt-engineering
  - agentic-ide
category: ai-agents
lang: vi
series:
  name: "Practical Kiro — Môi trường phát triển Agentic của AWS"
  order: 3
  total: 6
---

Spec-driven development là siêu năng lực của Kiro. Day 0 giải thích tại sao nó quan trọng, Day 1 chúng ta cài đặt và cấu hình. Hôm nay, chúng ta chạy qua một quy trình spec-driven hoàn chỉnh — từ một prompt mơ hồ đến pull request đã được merge — sử dụng một tính năng thực tế: xây dựng subscription billing với Stripe.

Kết thúc bài này, bạn sẽ hiểu chính xác từng giai đoạn hoạt động thế nào, khi nào cần phán đoán của con người, và làm sao để đạt kết quả tốt nhất từ spec engine của Kiro.

---

## Thiết lập

Chúng ta sẽ dùng một dự án SaaS Node.js giả định tên **SaaSKit** với:

- Express.js backend
- PostgreSQL qua Drizzle ORM
- Stripe cho thanh toán
- Vitest cho unit tests
- Zod cho input validation

Steering file (`.kiro/steering.md`) đã định nghĩa kiến trúc, tiêu chuẩn code, và quy tắc bảo mật từ Day 1. Hãy xem Kiro sử dụng ngữ cảnh đó thế nào.

---

## Giai đoạn 1: Prompt

Chúng ta bắt đầu với một prompt cố tình mơ hồ trong **Spec Mode**:

> "Thêm subscription billing để người dùng có thể trả tiền hàng tháng"

Trong Vibe Mode, prompt này sẽ tạo ra một trang đăng nhập và widget thanh toán — hoàn toàn sai. Trong Spec Mode, Kiro làm điều khác biệt.

---

## Giai đoạn 2: Tạo Spec

Kiro tạo ra các yêu cầu có cấu trúc. Đây là những gì nó tạo ra:

```yaml
## Tính năng: Subscription Billing

### User Stories
1. Là người dùng, tôi muốn chọn giữa gói Tháng ($29) và Năm ($290)
2. Là người dùng, tôi muốn nhập thông tin thanh toán và đăng ký
3. Là người dùng, tôi muốn xem trạng thái subscription trên dashboard
4. Là người dùng, tôi muốn hủy subscription bất cứ lúc nào
5. Là người dùng, tôi muốn xem lịch sử thanh toán trong ứng dụng

### Functional Requirements
- [ ] Màn hình chọn gói với toggle Tháng/Năm
- [ ] Tích hợp Stripe Checkout cho thanh toán
- [ ] Webhook handler cho các sự kiện subscription (tạo, cập nhật, hủy)
- [ ] Database schema: bảng subscriptions với status, plan, stripe_customer_id
- [ ] Dashboard widget hiển thị trạng thái subscription và ngày thanh toán tiếp theo
- [ ] Luồng hủy subscription với hộp thoại xác nhận

### Acceptance Criteria
- [ ] Gói Tháng tính $29.00 USD mỗi 30 ngày
- [ ] Gói Năm tính $290.00 USD mỗi 365 ngày
- [ ] Người dùng có thể nâng cấp từ Tháng lên Năm (prorated)
- [ ] Hạ cấp có hiệu lực ở chu kỳ thanh toán tiếp theo
- [ ] Subscription đã hủy vẫn hoạt động đến hết kỳ
- [ ] Xác minh chữ ký webhook cho tất cả sự kiện Stripe
- [ ] Tất cả endpoints trả về 401 cho request chưa xác thực
- [ ] Xử lý webhook idempotent (không tính phí trùng)

### Edge Cases
- [ ] Stripe Checkout session hết hạn
- [ ] Webhook gửi thất bại (logic retry)
- [ ] Khách hàng hủy trong thời gian dùng thử
- [ ] Phương thức thanh toán bị từ chối (retry với email thông báo)
- [ ] Thay đổi subscription đồng thời
- [ ] Không khớp tiền tệ (chỉ chấp nhận USD)
- [ ] Giá gói thay đổi giữa chu kỳ (grandfather existing)

### Non-functional Requirements
- [ ] Phản hồi webhook trong 5 giây (Stripe timeout)
- [ ] Trạng thái subscription được cache cho dashboard (tối đa 5 phút)
- [ ] GDPR: xuất dữ liệu subscription theo yêu cầu
- [ ] Audit log cho mọi thay đổi trạng thái subscription

### Database Schema (đề xuất)
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

### Ghi chú Review Spec

Kiro tự động đánh dấu các phụ thuộc và vấn đề tiềm ẩn:

```
⚠️ Tính năng này yêu cầu Stripe API keys trong biến môi trường
⚠️ Cần database migration (bảng subscriptions mới + index trên user_id)
⚠️ Webhook endpoint phải được đăng ký trong Stripe dashboard
💡 Gợi ý: thêm /api/billing/webhook endpoint trước Checkout routes
```

**Việc của bạn ở giai đoạn này:** Xem và phê duyệt spec. Đây là checkpoint quan trọng nhất của con người trong quy trình. Sửa edge cases, thêm kịch bản thiếu, xác thực schema. Khi đã phê duyệt, Kiro tạo task plan.

---

## Giai đoạn 3: Tạo Task Plan

Với spec đã được phê duyệt, Kiro tạo ra một chuỗi task có thứ tự phụ thuộc:

```yaml
## Task Plan: Subscription Billing

### Task 1: Database Migration
- Tạo bảng subscriptions với enum support
- Thêm indexes trên user_id, stripe_customer_id
- Tạo bảng audit_logs cho sự kiện thanh toán
- Phụ thuộc: không
- Chấp nhận: phải có thể rollback

### Task 2: Stripe Configuration Module
- Tạo services/stripe.ts với khởi tạo client
- Định nghĩa hằng số plan (monthly price ID, annual price ID)
- Thêm webhook signature verification utility
- Phụ thuộc: Task 1 (schema tham chiếu trong code)

### Task 3: Subscription Model & Repository
- Tạo models/Subscription.ts với Drizzle schema
- Tạo repositories/SubscriptionRepository.ts
- CRUD operations + xác thực chuyển đổi trạng thái
- Phụ thuộc: Task 1

### Task 4: Checkout API Endpoint
- POST /api/billing/checkout — tạo Stripe Checkout Session
- Chọn gói, tạo customer (hoặc tái sử dụng)
- POST /api/billing/portal — Stripe Customer Portal
- Phụ thuộc: Task 2, Task 3

### Task 5: Webhook Handler
- POST /api/billing/webhook — Stripe webhook receiver
- Xử lý sự kiện: checkout.session.completed, invoice.paid, customer.subscription.updated
- Khử trùng lặp sự kiện qua Stripe-Signature header
- Phụ thuộc: Task 2, Task 3

### Task 6: Dashboard Subscription Widget
- Frontend component hiển thị status, plan, ngày thanh toán tiếp theo
- Nút Cancel với modal xác nhận
- Bảng lịch sử thanh toán
- Phụ thuộc: Task 4, Task 5 (đã biết data shape)

### Task 7: Unit Tests
- Test từng method của repository
- Test webhook handler với mock Stripe events
- Xác thực edge cases (checkout hết hạn, thanh toán bị từ chối)
- Phụ thuộc: Tasks 1-5

### Task 8: Integration Tests
- Test full checkout → webhook → subscription creation flow
- Test cancel và re-subscribe cycle
- Test prorated upgrade
- Phụ thuộc: Tasks 1-6
```

**Xem kỹ task plan.** Các phụ thuộc phải chính xác. Nếu Task 5 cần một cột database mà Task 1 không bao gồm, hãy báo ngay. Kiro sẽ điều chỉnh plan trước khi thực thi.

---

## Giai đoạn 4: Implementation

Kiro bắt đầu thực thi các task theo thứ tự phụ thuộc. Bạn có thể quan sát agent làm việc trong thời gian thực — nó mở files, đọc context, viết code, và chuyển sang task tiếp theo.

### Cách Kiro thực thi Task 1 (Database)

Nó đọc steering file, hiểu bạn dùng Drizzle ORM, tạo ra:

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

Nó cũng tự động tạo file migration.

### Khi Kiro gặp sự không chắc chắn

Trong Task 4 (Checkout API), Kiro gặp một sự mơ hồ: nên dùng Stripe Checkout hay Stripe Elements? Nó dừng lại và hỏi:

> "Spec của bạn nói 'Stripe Checkout integration'. Tôi có thể implement bằng Stripe Checkout (trang lưu trữ, redirect) hoặc Elements (form nhúng). Checkout đơn giản hơn và tuân thủ PCI ngay lập tức. Tôi nên dùng Checkout?"

Bạn trả lời, nó tiếp tục. Hành vi đặt câu hỏi này rất quan trọng — Kiro không đoán khi có trade-off.

---

## Giai đoạn 5: Review & Chấp nhận

Sau khi tất cả task hoàn thành, Kiro trình bày tổng kết mọi thứ đã thay đổi:

```
## Tổng kết Implementation — Subscription Billing

### Files Created (14)
- db/schema/subscriptions.ts (+63 dòng)
- db/migrations/0005_subscriptions.sql (+28 dòng)
- services/stripe.ts (+45 dòng)
- repositories/SubscriptionRepository.ts (+112 dòng)
- routes/billing.ts (+89 dòng)
- webhooks/stripe.ts (+156 dòng)
- frontend/widgets/SubscriptionStatus.tsx (+78 dòng)
- frontend/widgets/BillingHistory.tsx (+52 dòng)
- frontend/components/CancelModal.tsx (+34 dòng)
- tests/unit/subscription-repo.test.ts (+145 dòng)
- tests/unit/stripe-webhook.test.ts (+201 dòng)
- tests/integration/billing-flow.test.ts (+178 dòng)
- types/billing.ts (+22 dòng)
- .env.example (cập nhật, +3 dòng)

### Files Modified (3)
- db/schema/index.ts (export subscriptions)
- routes/index.ts (đăng ký billing routes)
- frontend/router.tsx (thêm billing pages)

### Kết quả Test
- Unit tests: 32 passed, 0 failed
- Integration tests: 8 passed, 0 failed
- Coverage: 87% (mục tiêu 80% ✓)

### Câu hỏi Mở
- [ ] Cần đặt STRIPE_SECRET_KEY và STRIPE_WEBHOOK_SECRET trong production
- [ ] Webhook URL phải được đăng ký trong Stripe dashboard: /api/billing/webhook
- [ ] Database migration phải được chạy trước khi deploy
```

**Xem tổng kết này so với spec gốc.** Nó đã thực hiện tất cả acceptance criteria chưa? Các edge cases đã được xử lý chưa? Nếu có gì sai, bạn có thể yêu cầu thay đổi và Kiro sẽ điều chỉnh.

---

## Giai đoạn 6: Vòng Phê duyệt

Vòng phê duyệt của Kiro hoạt động ở ba chế độ:

| Chế độ | Mô tả | Tốt nhất cho |
|--------|-------|-------------|
| **Auto-approve** | Kiro chạy qua các task không cần chờ | Thay đổi thường, tính năng phạm vi rõ |
| **Per-task approve** | Xem từng task trước khi task tiếp theo bắt đầu | Tính năng phức tạp, patterns mới |
| **Per-file approve** | Xem từng file diff nội tuyến | Thay đổi nhạy cảm bảo mật, compliance |

Cho tính năng subscription này, **per-task approve** là phù hợp. Bạn sẽ xem thay đổi database schema trước khi Kiro viết business logic, và xem business logic trước khi tests.

---

## Mẹo Thực tế cho Specs Tốt

### Cụ thể về "cái gì", để Kiro tự tìm "cách nào"

```
✅ Tốt: "Người dùng phải xác nhận email trước khi truy cập dashboard"
❌ Tồi: "Gửi email xác nhận với token trong link, xác minh nó trong controller"
```

### Đưa edge cases vào ngay từ đầu

Spec nên đề cập:
- Điều gì xảy ra khi API bên thứ ba bị down?
- Hành vi timeout thế nào?
- Làm sao xử lý request trùng lặp?
- Dữ liệu nào không bao giờ được log?

### Dùng ví dụ cho yêu cầu mơ hồ

```
✅ Tốt: "Proration: nếu người dùng nâng cấp vào ngày 15 của chu kỳ 30 ngày,
   tính (plan_price / 30) * 15 ngày còn lại như một khoản điều chỉnh một lần"
```

### Giữ steering files đồng bộ

Mỗi lần bạn thêm dependency mới hoặc thay đổi architectural pattern, cập nhật `.kiro/steering.md`. Kiro đọc nó ở đầu mỗi phiên — steering file cũ tạo ra code lỗi thời.

---

## Spec Mode vs Vibe Mode: Khi nào dùng

| Tình huống | Mode | Tại sao |
|-----------|------|---------|
| Tính năng mới với yêu cầu rõ ràng | **Spec** | Đầu ra có cấu trúc, edge case coverage |
| Fix bug đã biết root cause | **Vibe** | Nhanh hơn, không spec overhead |
| Refactoring (rename, extract, move) | **Vibe** | Đơn giản, biến đổi rõ ràng |
| Thay đổi xuyên repo | **Spec** | Cần dependency tracking |
| Prototype / khám phá | **Vibe** → **Spec** | Bắt đầu nhanh, khóa lại khi rõ hướng |
| Code quan trọng bảo mật | **Spec** + per-file review | Giám sát tối đa |
| CI/CD autofix | **CLI vibe** | Headless, non-interactive |

---

## Cạm bẫy thường gặp

### Over-specifying implementation

Specs nên mô tả **cái gì** hệ thống nên làm, không phải **code nên viết thế nào**. Spec là hợp đồng giữa bạn và agent — để Kiro chọn chi tiết implementation trong giới hạn steering file.

### Chấp nhận spec đầu tiên mà không review

Spec đầu tiên thường đúng 80%. 20% còn lại là nơi bugs ẩn náu. Luôn review edge cases, xử lý lỗi, và considerations bảo mật trước khi phê duyệt.

### Quên cập nhật steering files

Steering file từ dự án cũ vẫn nói "dùng MongoDB" sẽ tạo ra kết quả sai. Giữ steering files hiện tại — chúng là single source of truth cho agent về dự án của bạn.

### Bỏ qua review task plan

Task plan tiết lộ vấn đề phụ thuộc và component thiếu. Nếu bạn bỏ qua bước này, Kiro có thể implement task theo thứ tự tạo ra merge conflict hoặc rework không cần thiết.

---

## Tiếp Theo

Với quy trình spec-driven development đã nắm vững, Day 3 sẽ khám phá **Agent Hooks, Powers, và Tích hợp MCP** — cách tự động hóa quality gates, mở rộng khả năng của Kiro, và xây dựng tích hợp công cụ tùy chỉnh của riêng bạn.

---

*Series: Practical Kiro — Môi trường phát triển Agentic của AWS. Day 2: Quy trình Spec-Driven Development. Day 3: Agent Hooks, Power & MCP → sắp tới.*
