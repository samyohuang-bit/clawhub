/** Stripe integration for ClawHub billing */

import Stripe from "stripe";
import { queryOne, transaction } from "./db";
import { addCredits } from "./billing";

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY not configured");
    _stripe = new Stripe(key);
  }
  return _stripe;
}

// Credit pack definitions
export const CREDIT_PACKS = {
  starter: { credits: 1500, priceCents: 1000, name: "Starter Pack" },
  power: { credits: 8000, priceCents: 4500, name: "Power Pack" },
  ultimate: { credits: 30000, priceCents: 15000, name: "Ultimate Pack" },
} as const;

export type CreditPack = keyof typeof CREDIT_PACKS;

/**
 * Create a Stripe checkout session for credit purchase.
 */
export async function createCheckoutSession(
  userId: string,
  pack: CreditPack,
  successUrl: string,
  cancelUrl: string
): Promise<string> {
  const stripe = getStripe();
  const packInfo = CREDIT_PACKS[pack];

  // Get or create Stripe customer
  const account = await queryOne<{ stripe_customer_id: string | null }>(
    `SELECT stripe_customer_id FROM accounts WHERE user_id = $1`,
    [userId]
  );

  let customerId = account?.stripe_customer_id;

  if (!customerId) {
    const user = await queryOne<{ email: string | null; display_name: string | null }>(
      `SELECT email, display_name FROM users WHERE id = $1`,
      [userId]
    );

    const customer = await stripe.customers.create({
      email: user?.email ?? undefined,
      name: user?.display_name ?? undefined,
      metadata: { clawhub_user_id: userId },
    });

    customerId = customer.id;

    await queryOne(
      `UPDATE accounts SET stripe_customer_id = $2 WHERE user_id = $1`,
      [userId, customerId]
    );
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: `ClawHub ${packInfo.name}`,
            description: `${packInfo.credits.toLocaleString()} agent call credits`,
          },
          unit_amount: packInfo.priceCents,
        },
        quantity: 1,
      },
    ],
    mode: "payment",
    success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: cancelUrl,
    metadata: {
      clawhub_user_id: userId,
      pack,
      credits: String(packInfo.credits),
    },
  });

  return session.url!;
}

/**
 * Create a Stripe checkout session for plan subscription.
 */
export async function createSubscriptionSession(
  userId: string,
  plan: "pro" | "team",
  successUrl: string,
  cancelUrl: string
): Promise<string> {
  const stripe = getStripe();

  const priceIds: Record<string, string> = {
    pro: process.env.STRIPE_PRO_PRICE_ID ?? "",
    team: process.env.STRIPE_TEAM_PRICE_ID ?? "",
  };

  const priceId = priceIds[plan];
  if (!priceId) throw new Error(`No Stripe price ID for plan: ${plan}`);

  // Get or create customer
  const account = await queryOne<{ stripe_customer_id: string | null }>(
    `SELECT stripe_customer_id FROM accounts WHERE user_id = $1`,
    [userId]
  );

  let customerId = account?.stripe_customer_id;

  if (!customerId) {
    const user = await queryOne<{ email: string | null; display_name: string | null }>(
      `SELECT email, display_name FROM users WHERE id = $1`,
      [userId]
    );

    const customer = await stripe.customers.create({
      email: user?.email ?? undefined,
      name: user?.display_name ?? undefined,
      metadata: { clawhub_user_id: userId },
    });
    customerId = customer.id;

    await queryOne(
      `UPDATE accounts SET stripe_customer_id = $2 WHERE user_id = $1`,
      [userId, customerId]
    );
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    payment_method_types: ["card"],
    line_items: [{ price: priceId, quantity: 1 }],
    mode: "subscription",
    success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: cancelUrl,
    metadata: {
      clawhub_user_id: userId,
      plan,
    },
  });

  return session.url!;
}

/**
 * Handle Stripe webhook events.
 */
export async function handleWebhook(
  body: string,
  signature: string
): Promise<{ received: boolean }> {
  const stripe = getStripe();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) throw new Error("STRIPE_WEBHOOK_SECRET not configured");

  const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      await handleCheckoutCompleted(session);
      break;
    }

    case "invoice.paid": {
      const invoice = event.data.object as Stripe.Invoice;
      await handleInvoicePaid(invoice);
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      await handleInvoiceFailed(invoice);
      break;
    }

    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      await handleSubscriptionUpdated(subscription);
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      await handleSubscriptionDeleted(subscription);
      break;
    }
  }

  return { received: true };
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.clawhub_user_id;
  if (!userId) return;

  // Credit purchase
  if (session.metadata?.pack) {
    const credits = parseInt(session.metadata.credits, 10);
    await addCredits(userId, credits, session.amount_total ?? 0, session.payment_intent as string);
  }

  // Subscription
  if (session.metadata?.plan && session.mode === "subscription") {
    const { changePlan } = await import("./billing");
    await changePlan(userId, session.metadata.plan);
  }
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;
  if (!customerId) return;

  // Find user by Stripe customer ID
  const account = await queryOne<{ user_id: string }>(
    `SELECT user_id FROM accounts WHERE stripe_customer_id = $1`,
    [customerId]
  );
  if (!account) return;

  // Record invoice
  await queryOne(
    `INSERT INTO invoices (account_id, amount_cents, status, stripe_invoice_id, paid_at)
     VALUES ((SELECT id FROM accounts WHERE user_id = $1), $2, 'paid', $3, now())`,
    [account.user_id, invoice.amount_paid, invoice.id]
  );
}

async function handleInvoiceFailed(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;
  if (!customerId) return;

  const account = await queryOne<{ user_id: string }>(
    `SELECT user_id FROM accounts WHERE stripe_customer_id = $1`,
    [customerId]
  );
  if (!account) return;

  await queryOne(
    `INSERT INTO invoices (account_id, amount_cents, status, stripe_invoice_id)
     VALUES ((SELECT id FROM accounts WHERE user_id = $1), $2, 'failed', $3)`,
    [account.user_id, invoice.amount_due, invoice.id]
  );
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;
  const priceId = subscription.items.data[0]?.price.id;

  // Map price ID to plan
  const planMap: Record<string, string> = {
    [process.env.STRIPE_PRO_PRICE_ID ?? ""]: "pro",
    [process.env.STRIPE_TEAM_PRICE_ID ?? ""]: "team",
  };

  const plan = planMap[priceId ?? ""];
  if (!plan) return;

  await queryOne(
    `UPDATE accounts SET plan = $2 WHERE stripe_customer_id = $1`,
    [customerId, plan]
  );
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;

  await queryOne(
    `UPDATE accounts SET plan = 'free' WHERE stripe_customer_id = $1`,
    [customerId]
  );
}
