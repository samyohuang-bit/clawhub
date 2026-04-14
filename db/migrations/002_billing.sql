-- 002_billing.sql
-- ClawHub Billing Schema
-- Extends the core schema with accounts, usage tracking, and invoicing.

BEGIN;

-- ============================================================
-- Accounts (billing profiles linked to users)
-- ============================================================
CREATE TABLE accounts (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    plan            TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'team', 'enterprise')),
    balance_cents   INTEGER NOT NULL DEFAULT 0,
    credits         INTEGER NOT NULL DEFAULT 0,
    stripe_customer_id TEXT,
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_accounts_user ON accounts(user_id);
CREATE INDEX idx_accounts_plan ON accounts(plan);

-- Auto-create account on user creation
CREATE OR REPLACE FUNCTION create_account_for_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO accounts (user_id) VALUES (NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_create_account
    AFTER INSERT ON users
    FOR EACH ROW EXECUTE FUNCTION create_account_for_user();

-- ============================================================
-- Plan limits
-- ============================================================
CREATE TABLE plan_limits (
    plan            TEXT PRIMARY KEY,
    calls_per_month INTEGER NOT NULL,
    tokens_per_month INTEGER NOT NULL DEFAULT 0,
    price_cents     INTEGER NOT NULL DEFAULT 0,
    overage_call_cents INTEGER NOT NULL DEFAULT 0,
    overage_token_cents_per_k INTEGER NOT NULL DEFAULT 0
);

INSERT INTO plan_limits (plan, calls_per_month, tokens_per_month, price_cents, overage_call_cents, overage_token_cents_per_k) VALUES
    ('free',       100,      0,           0,     0,    0),
    ('pro',        5000,     1000000,     2900,  8,    2),
    ('team',       25000,    5000000,     9900,  6,    1),
    ('enterprise', 100000,   20000000,    0,     0,    0);

-- ============================================================
-- Usage events (time-series for metering)
-- ============================================================
CREATE TABLE usage_events (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id      UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    event_type      TEXT NOT NULL CHECK (event_type IN ('agent_call', 'token', 'compute_sec', 'api_request')),
    quantity        NUMERIC NOT NULL CHECK (quantity > 0),
    unit            TEXT NOT NULL CHECK (unit IN ('calls', 'tokens', 'seconds', 'requests')),
    skill_slug      TEXT,
    metadata        JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_usage_account ON usage_events(account_id);
CREATE INDEX idx_usage_created ON usage_events(created_at DESC);
CREATE INDEX idx_usage_type ON usage_events(event_type);
CREATE INDEX idx_usage_skill ON usage_events(skill_slug) WHERE skill_slug IS NOT NULL;

-- Partition by month for performance (manual — or use TimescaleDB in production)
-- CREATE TABLE usage_events_2026_04 PARTITION OF usage_events
--     FOR VALUES FROM ('2026-04-01') TO ('2026-05-01');

-- ============================================================
-- Billing periods
-- ============================================================
CREATE TABLE billing_periods (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id      UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    period_start    TIMESTAMPTZ NOT NULL,
    period_end      TIMESTAMPTZ NOT NULL,
    total_cents     INTEGER NOT NULL DEFAULT 0,
    status          TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'invoiced', 'paid')),
    created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_billing_periods_account ON billing_periods(account_id);
CREATE INDEX idx_billing_periods_status ON billing_periods(status);

-- ============================================================
-- Invoices
-- ============================================================
CREATE TABLE invoices (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id      UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    billing_period_id UUID REFERENCES billing_periods(id),
    amount_cents    INTEGER NOT NULL,
    status          TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'failed', 'cancelled')),
    stripe_invoice_id TEXT,
    due_at          TIMESTAMPTZ,
    paid_at         TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_invoices_account ON invoices(account_id);
CREATE INDEX idx_invoices_status ON invoices(status);

-- ============================================================
-- Credit purchases (prepaid)
-- ============================================================
CREATE TABLE credit_purchases (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id      UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    amount_cents    INTEGER NOT NULL,
    credits         INTEGER NOT NULL,
    stripe_payment_id TEXT,
    created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_credit_purchases_account ON credit_purchases(account_id);

-- ============================================================
-- Skill pricing (author-defined)
-- ============================================================
CREATE TABLE skill_pricing (
    skill_slug      TEXT PRIMARY KEY REFERENCES skills(slug) ON DELETE CASCADE,
    price_per_call_cents INTEGER NOT NULL DEFAULT 0,
    is_free         BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- Author payouts
-- ============================================================
CREATE TABLE author_payouts (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    author_id       UUID NOT NULL REFERENCES users(id),
    period_start    DATE NOT NULL,
    period_end      DATE NOT NULL,
    total_calls     INTEGER NOT NULL DEFAULT 0,
    gross_cents     INTEGER NOT NULL DEFAULT 0,
    platform_fee_cents INTEGER NOT NULL DEFAULT 0,
    net_cents       INTEGER NOT NULL DEFAULT 0,
    status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'paid', 'failed')),
    paid_at         TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_payouts_author ON author_payouts(author_id);
CREATE INDEX idx_payouts_status ON author_payouts(status);

-- ============================================================
-- Usage summary view (for dashboard queries)
-- ============================================================
CREATE VIEW usage_summary AS
SELECT
    account_id,
    DATE_TRUNC('month', created_at) as month,
    event_type,
    SUM(quantity) as total_quantity,
    COUNT(*) as event_count
FROM usage_events
GROUP BY account_id, DATE_TRUNC('month', created_at), event_type;

-- ============================================================
-- Updated_at trigger for accounts
-- ============================================================
CREATE TRIGGER trigger_accounts_updated
    BEFORE UPDATE ON accounts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

COMMIT;
