# Agent-Commerce: Metered Billing Architecture

## Overview

Agent-Commerce provides pay-per-use billing for AI agent API calls. It enables:
- **Skill authors** to monetize premium skills
- **Platform operators** to meter agent compute usage
- **Users** to pay only for what they use

## Core Concepts

### Billing Units

| Unit | Description | Example |
|------|-------------|---------|
| **Agent Call** | One invocation of an agent/skill | Running a skill |
| **Token** | Input/output tokens consumed | LLM token usage |
| **Compute Second** | GPU/CPU time consumed | Model inference time |
| **API Request** | External API call made | Web search, fetch |
| **Storage MB** | Data stored | Agent memory, files |

### Account Types

```
┌─────────────────────────────────────────────┐
│                 User Account                │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │ Free Tier│  │  Pro     │  │  Team    │  │
│  │ 100 calls│  │ $29/mo   │  │ $99/mo   │  │
│  │ /month   │  │ 5000     │  │ 25000    │  │
│  │          │  │ calls/mo │  │ calls/mo │  │
│  └──────────┘  └──────────┘  └──────────┘  │
│                                             │
│  + Overage: $0.01/call, $0.001/1K tokens   │
│  + Prepaid credits: buy in bulk             │
└─────────────────────────────────────────────┘
```

## Architecture

```
                    ┌─────────────┐
                    │  Agent SDK  │
                    │  (metering) │
                    └──────┬──────┘
                           │ usage event
                           ▼
                    ┌─────────────┐
                    │  Usage      │
                    │  Collector  │
                    │  (ingest)   │
                    └──────┬──────┘
                           │ batched events
                           ▼
              ┌────────────────────────┐
              │    Usage Store         │
              │    (TimescaleDB)       │
              │                        │
              │  ┌──────────────────┐  │
              │  │ usage_events     │  │
              │  │ user_id          │  │
              │  │ event_type       │  │
              │  │ quantity         │  │
              │  │ metadata (JSON)  │  │
              │  │ timestamp        │  │
              │  └──────────────────┘  │
              └────────────┬───────────┘
                           │
              ┌────────────┴───────────┐
              │                        │
              ▼                        ▼
     ┌─────────────┐         ┌─────────────┐
     │  Billing    │         │  Analytics  │
     │  Engine     │         │  Dashboard  │
     │             │         │             │
     │ • Aggregate │         │ • Usage     │
     │ • Invoice   │         │ • Trends    │
     │ • Charge    │         │ • Forecast  │
     │ • Credit    │         │ • Alerts    │
     └──────┬──────┘         └─────────────┘
            │
            ▼
     ┌─────────────┐
     │  Payment    │
     │  Gateway    │
     │ (Stripe)    │
     └─────────────┘
```

## Data Model

```sql
-- Accounts
CREATE TABLE accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    plan TEXT NOT NULL DEFAULT 'free',  -- free | pro | team | enterprise
    balance_cents INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Usage events (TimescaleDB hypertable for time-series)
CREATE TABLE usage_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES accounts(id),
    event_type TEXT NOT NULL,           -- agent_call, token, compute_sec, api_request
    quantity NUMERIC NOT NULL,
    unit TEXT NOT NULL,                  -- calls, tokens, seconds, requests, mb
    metadata JSONB DEFAULT '{}',
    skill_slug TEXT,                     -- which skill consumed it
    timestamp TIMESTAMPTZ NOT NULL DEFAULT now()
);
SELECT create_hypertable('usage_events', 'timestamp');

-- Billing periods
CREATE TABLE billing_periods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES accounts(id),
    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,
    total_cents INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'open',  -- open | closed | invoiced | paid
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Invoices
CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES accounts(id),
    billing_period_id UUID REFERENCES billing_periods(id),
    amount_cents INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft',  -- draft | sent | paid | failed
    stripe_invoice_id TEXT,
    due_at TIMESTAMPTZ,
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Prepaid credits
CREATE TABLE credit_purchases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES accounts(id),
    amount_cents INTEGER NOT NULL,
    credits INTEGER NOT NULL,            -- number of agent calls purchased
    stripe_payment_id TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);
```

## Pricing Model

### Plan Pricing

| Plan | Monthly Fee | Included Calls | Overage/Call | Overage/1K Tokens |
|------|------------|----------------|--------------|-------------------|
| Free | $0 | 100 | N/A (hard limit) | N/A |
| Pro | $29 | 5,000 | $0.008 | $0.002 |
| Team | $99 | 25,000 | $0.006 | $0.0015 |
| Enterprise | Custom | Custom | Negotiated | Negotiated |

### Credit Packs (Prepaid)

| Pack | Price | Calls | Effective Rate |
|------|-------|-------|----------------|
| Starter | $10 | 1,500 | $0.0067/call |
| Power | $45 | 8,000 | $0.0056/call |
| Ultimate | $150 | 30,000 | $0.005/call |

### Skill Author Revenue Share

- Platform takes 15% of skill-related billing
- Author receives 85%
- Minimum payout: $50
- Payout frequency: monthly (NET-30)

## Usage Event Flow

```
1. Agent starts a skill execution
2. Skill SDK calls UsageCollector.record(event)
3. Events batched every 5 seconds or 100 events
4. Batch sent to Usage Collector API
5. Collector validates and stores in TimescaleDB
6. Billing Engine aggregates at period close
7. Invoice generated, payment charged via Stripe
8. User notified of charges
```

### SDK Integration

```typescript
// In the agent SDK
const usage = new UsageCollector({ accountId, apiKey });

// Record an agent call
await usage.record({
  eventType: 'agent_call',
  quantity: 1,
  unit: 'calls',
  skillSlug: 'my-premium-skill',
  metadata: { model: 'claude-sonnet-4' }
});

// Record token usage
await usage.record({
  eventType: 'token',
  quantity: 1500,
  unit: 'tokens',
  metadata: { direction: 'input' }
});
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/billing/usage` | Record usage event (batched) |
| GET | `/api/billing/usage` | Query usage (with filters) |
| GET | `/api/billing/balance` | Get account balance & plan |
| POST | `/api/billing/credits` | Purchase prepaid credits |
| GET | `/api/billing/invoices` | List invoices |
| GET | `/api/billing/invoices/:id` | Get invoice details |
| POST | `/api/billing/plan` | Upgrade/downgrade plan |
| GET | `/api/billing/forecast` | Usage forecast & alerts |

## Rate Limiting & Quotas

```
┌────────────────────────────────────────────┐
│              Request Flow                  │
│                                            │
│  Agent → Rate Limiter → Quota Check → API  │
│            │                 │              │
│            ▼                 ▼              │
│    Per-minute limits   Monthly quota        │
│    (abuse prevention)  (billing control)    │
│                                            │
│  If quota exceeded:                        │
│    1. Return 429 with upgrade prompt       │
│    2. Allow prepaid credits to cover       │
│    3. Soft limit (warn before hard block)  │
└────────────────────────────────────────────┘
```

## Implementation Phases

### Phase 1: Foundation (Week 1-2)
- [ ] Database schema (accounts, usage_events)
- [ ] Usage Collector API (POST /api/billing/usage)
- [ ] Basic quota enforcement
- [ ] Free tier with 100-call limit

### Phase 2: Billing (Week 3-4)
- [ ] Stripe integration
- [ ] Plan management (upgrade/downgrade)
- [ ] Invoice generation
- [ ] Credit purchase flow

### Phase 3: Dashboard (Week 5-6)
- [ ] Usage analytics dashboard
- [ ] Cost breakdown by skill
- [ ] Forecasting & alerts
- [ ] Author revenue dashboard

### Phase 4: Author Monetization (Week 7-8)
- [ ] Skill pricing configuration
- [ ] Revenue share calculation
- [ ] Author payout system
- [ ] Usage-based skill pricing

## Security

- API keys scoped to account
- Usage events signed with HMAC
- Rate limiting per account + per IP
- Stripe handles PCI compliance (no card data stored)
- Audit log for all billing actions
