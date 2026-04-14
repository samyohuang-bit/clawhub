import { NextRequest, NextResponse } from "next/server";
import { handleWebhook } from "@/lib/stripe";

/**
 * POST /api/billing/webhook
 *
 * Stripe webhook endpoint. Handles:
 * - checkout.session.completed (credit purchase / subscription)
 * - invoice.paid / invoice.payment_failed
 * - customer.subscription.updated / deleted
 *
 * Note: This route must NOT parse the body as JSON — Stripe needs the raw body
 * for signature verification.
 */
export async function POST(request: NextRequest) {
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  try {
    const body = await request.text();
    const result = await handleWebhook(body, signature);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      { error: error.message ?? "Webhook handling failed" },
      { status: 400 }
    );
  }
}

// Disable body parsing for Stripe webhook signature verification
export const config = {
  api: {
    bodyParser: false,
  },
};
