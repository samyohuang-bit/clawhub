/** Billing module — usage recording, quota checking, plan management */

import { query, queryOne, transaction } from "./db";

export interface PlanLimits {
  plan: string;
  calls_per_month: number;
  tokens_per_month: number;
  price_cents: number;
  overage_call_cents: number;
  overage_token_cents_per_k: number;
}

export interface UsageEvent {
  event_type: "agent_call" | "token" | "compute_sec" | "api_request";
  quantity: number;
  unit: "calls" | "tokens" | "seconds" | "requests";
  skill_slug?: string;
  metadata?: Record<string, unknown>;
}

export interface AccountBalance {
  plan: string;
  planLimits: PlanLimits;
  currentUsage: { calls: number; tokens: number };
  remaining: { calls: number; tokens: number };
  credits: number;
  period: { start: string; end: string };
}

/**
 * Get account by user ID, creating if needed.
 */
export async function getOrCreateAccount(userId: string) {
  let account = await queryOne(
    `SELECT a.*, pl.calls_per_month, pl.tokens_per_month, pl.price_cents,
            pl.overage_call_cents, pl.overage_token_cents_per_k
     FROM accounts a
     JOIN plan_limits pl ON pl.plan = a.plan
     WHERE a.user_id = $1`,
    [userId]
  );

  if (!account) {
    account = await queryOne(
      `INSERT INTO accounts (user_id) VALUES ($1)
       RETURNING *, (SELECT calls_per_month FROM plan_limits WHERE plan = 'free') as calls_per_month,
       (SELECT tokens_per_month FROM plan_limits WHERE plan = 'free') as tokens_per_month`,
      [userId]
    );
  }

  return account;
}

/**
 * Get current billing period (calendar month).
 */
function getCurrentPeriod() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return {
    start: start.toISOString(),
    end: end.toISOString(),
  };
}

/**
 * Get account balance with current usage.
 */
export async function getAccountBalance(userId: string): Promise<AccountBalance> {
  const account = await getOrCreateAccount(userId);
  const period = getCurrentPeriod();

  // Get current month usage
  const usage = await queryOne<{ calls: string; tokens: string }>(
    `SELECT
      COALESCE(SUM(CASE WHEN event_type = 'agent_call' THEN quantity ELSE 0 END), 0) as calls,
      COALESCE(SUM(CASE WHEN event_type = 'token' THEN quantity ELSE 0 END), 0) as tokens
    FROM usage_events
    WHERE account_id = $1
      AND created_at >= $2
      AND created_at < $3`,
    [account.id, period.start, period.end]
  );

  const calls = parseInt(usage?.calls ?? "0", 10);
  const tokens = parseInt(usage?.tokens ?? "0", 10);

  return {
    plan: account.plan,
    planLimits: {
      plan: account.plan,
      calls_per_month: account.calls_per_month,
      tokens_per_month: account.tokens_per_month,
      price_cents: account.price_cents ?? 0,
      overage_call_cents: account.overage_call_cents ?? 0,
      overage_token_cents_per_k: account.overage_token_cents_per_k ?? 0,
    },
    currentUsage: { calls, tokens },
    remaining: {
      calls: Math.max(0, account.calls_per_month - calls),
      tokens: Math.max(0, account.tokens_per_month - tokens),
    },
    credits: account.credits,
    period,
  };
}

/**
 * Record usage events (batched).
 * Returns quota status.
 */
export async function recordUsage(
  userId: string,
  events: UsageEvent[]
): Promise<{ ok: boolean; quotaExceeded: boolean; balance: AccountBalance }> {
  const account = await getOrCreateAccount(userId);

  // Check quota before recording
  const balance = await getAccountBalance(userId);

  // Count total agent_call events in batch
  const callEvents = events.filter((e) => e.event_type === "agent_call");
  const totalCalls = callEvents.reduce((sum, e) => sum + e.quantity, 0);

  // Check if this would exceed quota
  const quotaExceeded =
    account.plan === "free" &&
    balance.currentUsage.calls + totalCalls > account.calls_per_month;

  if (quotaExceeded) {
    return { ok: false, quotaExceeded: true, balance };
  }

  // Record events
  await transaction(async (client) => {
    for (const event of events) {
      await client.query(
        `INSERT INTO usage_events (account_id, event_type, quantity, unit, skill_slug, metadata)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          account.id,
          event.event_type,
          event.quantity,
          event.unit,
          event.skill_slug ?? null,
          JSON.stringify(event.metadata ?? {}),
        ]
      );
    }
  });

  // Return updated balance
  const updatedBalance = await getAccountBalance(userId);
  return { ok: true, quotaExceeded: false, balance: updatedBalance };
}

/**
 * Check if account can make an agent call.
 */
export async function checkQuota(
  userId: string
): Promise<{ allowed: boolean; remaining: number; plan: string }> {
  const balance = await getAccountBalance(userId);

  if (balance.plan !== "free") {
    // Paid plans always allowed (overage billing)
    return {
      allowed: true,
      remaining: balance.remaining.calls,
      plan: balance.plan,
    };
  }

  // Free plan: hard limit
  return {
    allowed: balance.remaining.calls > 0 || balance.credits > 0,
    remaining: balance.remaining.calls + balance.credits,
    plan: balance.plan,
  };
}

/**
 * Upgrade/downgrade plan.
 */
export async function changePlan(
  userId: string,
  newPlan: string
): Promise<void> {
  const validPlans = ["free", "pro", "team", "enterprise"];
  if (!validPlans.includes(newPlan)) {
    throw new Error(`Invalid plan: ${newPlan}`);
  }

  await query(
    `UPDATE accounts SET plan = $2, updated_at = now() WHERE user_id = $1`,
    [userId, newPlan]
  );
}

/**
 * Add prepaid credits.
 */
export async function addCredits(
  userId: string,
  credits: number,
  amountCents: number,
  stripePaymentId?: string
): Promise<void> {
  await transaction(async (client) => {
    // Update account credits
    await client.query(
      `UPDATE accounts SET credits = credits + $2, updated_at = now() WHERE user_id = $1`,
      [userId, credits]
    );

    // Record purchase
    const account = await queryOne<{ id: string }>(
      `SELECT id FROM accounts WHERE user_id = $1`,
      [userId]
    );

    if (account) {
      await client.query(
        `INSERT INTO credit_purchases (account_id, amount_cents, credits, stripe_payment_id)
         VALUES ($1, $2, $3, $4)`,
        [account.id, amountCents, credits, stripePaymentId ?? null]
      );
    }
  });
}

/**
 * Get usage breakdown by skill (for cost analysis).
 */
export async function getUsageBySkill(
  userId: string,
  month?: string
): Promise<{ skill_slug: string; calls: number; tokens: number }[]> {
  const period = month
    ? {
        start: `${month}-01`,
        end: `${month.slice(0, 7)}-01`,
      }
    : getCurrentPeriod();

  return query(
    `SELECT
      COALESCE(skill_slug, '(internal)') as skill_slug,
      COALESCE(SUM(CASE WHEN event_type = 'agent_call' THEN quantity ELSE 0 END), 0) as calls,
      COALESCE(SUM(CASE WHEN event_type = 'token' THEN quantity ELSE 0 END), 0) as tokens
    FROM usage_events ue
    JOIN accounts a ON a.id = ue.account_id
    WHERE a.user_id = $1
      AND ue.created_at >= $2
      AND ue.created_at < $3
    GROUP BY skill_slug
    ORDER BY calls DESC`,
    [userId, period.start, period.end]
  );
}
