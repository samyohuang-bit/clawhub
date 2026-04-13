# Agent-Commerce: Billing Dashboard Design

## Overview

The billing dashboard is a section within ClawHub where users can:
- View current plan and usage
- See real-time costs and forecasts
- Manage payment methods and invoices
- Purchase prepaid credits
- Configure usage alerts

For skill authors: see revenue, payouts, and usage analytics for their skills.

## User Dashboard

### Pages

```
/billing
├── /billing              # Overview: plan, balance, usage summary
├── /billing/usage        # Detailed usage breakdown (by skill, time, type)
├── /billing/invoices     # Invoice history
├── /billing/plan         # Plan management (upgrade/downgrade)
├── /billing/credits      # Prepaid credit purchase
└── /billing/settings     # Alerts, payment method, billing email

/billing/author
├── /billing/author       # Revenue overview
├── /billing/author/skills # Per-skill revenue breakdown
└── /billing/author/payouts # Payout history
```

### Dashboard Components

#### 1. Plan Card
```
┌─────────────────────────────────────────┐
│  📦 Pro Plan                     $29/mo │
│                                         │
│  ████████████░░░░░░  3,421 / 5,000 calls│
│                                         │
│  Current period: Apr 1 - Apr 30         │
│  Next billing: May 1                    │
│                                         │
│  [Upgrade Plan]  [Manage Billing]       │
└─────────────────────────────────────────┘
```

#### 2. Usage Chart
```
┌─────────────────────────────────────────┐
│  Usage Over Time              [7d|30d|90d]│
│                                         │
│  5K ┤                                   │
│  4K ┤         ╭──╮                      │
│  3K ┤    ╭──╮│  │╭──╮                   │
│  2K ┤╭──╮│  ││  ││  │╭──╮              │
│  1K ┤│  ││  ││  ││  ││  │              │
│     ┤╰──╯╰──╯╰──╯╰──╯╰──╯              │
│     Mon Tue Wed Thu Fri Sat Sun          │
│                                         │
│  By type: ■ Agent calls ■ Tokens ■ API  │
└─────────────────────────────────────────┘
```

#### 3. Cost Breakdown
```
┌─────────────────────────────────────────┐
│  Cost Breakdown This Month              │
│                                         │
│  Agent Calls ............... $12.40     │
│  ├─ my-skill .............. $8.00 (800) │
│  ├─ other-skill ........... $4.40 (550) │
│  Tokens .................... $3.20      │
│  API Requests .............. $0.80      │
│  ─────────────────────────────────      │
│  Total ..................... $16.40     │
│                                         │
│  Included in plan: -$0.00 (over limit)  │
│  Credits applied: -$5.00                │
│  ─────────────────────────────────      │
│  Amount due: $11.40                     │
└─────────────────────────────────────────┘
```

#### 4. Usage Forecast
```
┌─────────────────────────────────────────┐
│  📊 Usage Forecast                      │
│                                         │
│  At current pace, you'll use:           │
│  6,200 calls this month                 │
│                                         │
│  ⚠️ You'll exceed your Pro plan limit   │
│  Estimated overage: $9.60               │
│                                         │
│  Suggestion: Upgrade to Team ($99/mo)   │
│  to save $40/mo on overages             │
│                                         │
│  [Upgrade Now]  [Dismiss]               │
└─────────────────────────────────────────┘
```

#### 5. Prepaid Credits
```
┌─────────────────────────────────────────┐
│  💳 Prepaid Credits                     │
│                                         │
│  Current balance: 2,340 credits         │
│                                         │
│  ┌────────┐ ┌────────┐ ┌────────────┐  │
│  │ Starter│ │ Power  │ │ Ultimate   │  │
│  │  $10   │ │  $45   │ │   $150     │  │
│  │ 1,500  │ │ 8,000  │ │  30,000    │  │
│  │ calls  │ │ calls  │ │  calls     │  │
│  │        │ │ ⭐Best │ │            │  │
│  │ [Buy]  │ │ [Buy]  │ │  [Buy]     │  │
│  └────────┘ └────────┘ └────────────┘  │
│                                         │
│  Recent purchases:                      │
│  Apr 10: 1,500 credits ($10) ✓          │
│  Mar 25: 8,000 credits ($45) ✓          │
└─────────────────────────────────────────┘
```

#### 6. Alerts Configuration
```
┌─────────────────────────────────────────┐
│  🔔 Usage Alerts                        │
│                                         │
│  ☑ Email at 80% of plan limit           │
│  ☑ Email at 100% of plan limit          │
│  ☑ Email when daily usage spikes 2x     │
│  ☐ Slack webhook notifications          │
│                                         │
│  Billing email: user@example.com        │
│  [Save Settings]                        │
└─────────────────────────────────────────┘
```

## Author Dashboard

### Revenue Overview
```
┌─────────────────────────────────────────┐
│  💰 Author Revenue — April 2026         │
│                                         │
│  Total revenue:    $234.50              │
│  Platform fee:     -$35.18 (15%)        │
│  Your earnings:    $199.32              │
│                                         │
│  Pending payout:   $199.32 (May 1)      │
│  Lifetime earned:  $1,847.20            │
│                                         │
│  Per skill:                               │
│  ┌──────────────────────────────────┐   │
│  │ my-calendar-skill     $142.00    │   │
│  │ ├─ 14,200 calls @ $0.01/call    │   │
│  │ └─ 285 unique users              │   │
│  │ my-data-skill          $92.50    │   │
│  │ ├─ 9,250 calls @ $0.01/call     │   │
│  │ └─ 147 unique users              │   │
│  └──────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

## Technical Implementation

### API Endpoints for Dashboard

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/billing/dashboard` | Overview data (plan, balance, current usage) |
| GET | `/api/billing/usage/timeseries` | Usage over time (for charts) |
| GET | `/api/billing/usage/by-skill` | Usage broken down by skill |
| GET | `/api/billing/forecast` | Predicted usage and costs |
| GET | `/api/billing/invoices` | List invoices |
| GET | `/api/billing/author/revenue` | Author revenue breakdown |
| GET | `/api/billing/author/payouts` | Payout history |

### Chart Library

Use [Recharts](https://recharts.org) or [Chart.js](https://www.chartjs.org/) for:
- Line charts: usage over time
- Bar charts: cost breakdown
- Donut charts: usage by type
- Area charts: forecast visualization

### Real-Time Updates

- Dashboard polls `/api/billing/dashboard` every 30 seconds
- WebSocket for push notifications (usage alerts, payment events)
- Optimistic UI for credit purchases

### Stripe Integration

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  ClawHub UI  │────▶│  API Server  │────▶│   Stripe     │
│              │     │              │     │              │
│  • Checkout  │     │  • Create    │     │  • Payment   │
│  • Manage    │     │    session   │     │    Intent    │
│  • Invoices  │     │  • Webhook   │     │  • Invoice   │
│              │◀────│    handler   │◀────│  • Webhook   │
└──────────────┘     └──────────────┘     └──────────────┘
```

### Stripe Webhook Events to Handle

| Event | Action |
|-------|--------|
| `invoice.paid` | Mark invoice as paid, add credits |
| `invoice.payment_failed` | Send failure notification |
| `customer.subscription.updated` | Update plan in DB |
| `customer.subscription.deleted` | Downgrade to free |
| `payment_intent.succeeded` | Credit purchase complete |

## Page Components (React)

```
components/billing/
├── PlanCard.tsx          # Current plan display with usage bar
├── UsageChart.tsx        # Line/bar chart of usage over time
├── CostBreakdown.tsx     # Itemized cost table
├── UsageForecast.tsx     # Predicted usage with alerts
├── CreditPurchase.tsx    # Credit pack purchase UI
├── InvoiceList.tsx       # Invoice history table
├── AlertSettings.tsx     # Notification preferences
├── AuthorRevenue.tsx     # Author revenue overview
├── SkillRevenueCard.tsx  # Per-skill revenue detail
└── PayoutHistory.tsx     # Payout timeline
```
