import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { createCheckoutSession, createSubscriptionSession, type CreditPack } from "@/lib/stripe";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "change-me-in-production"
);

/**
 * POST /api/billing/checkout
 *
 * Create a Stripe checkout session.
 * Body: { type: "credits", pack: "starter"|"power"|"ultimate" }
 *    or { type: "subscription", plan: "pro"|"team" }
 */
export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;
  if (!token) {
    return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
  }

  let userId: string;
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    userId = payload.sub as string;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid token" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const { type, pack, plan } = body;

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://clawhub.ai";
  const successUrl = `${baseUrl}/billing`;
  const cancelUrl = `${baseUrl}/billing`;

  try {
    let url: string;

    if (type === "credits" && pack) {
      url = await createCheckoutSession(userId, pack as CreditPack, successUrl, cancelUrl);
    } else if (type === "subscription" && plan) {
      url = await createSubscriptionSession(userId, plan, successUrl, cancelUrl);
    } else {
      return NextResponse.json(
        { ok: false, error: "Invalid request: provide type + pack/plan" },
        { status: 400 }
      );
    }

    return NextResponse.json({ ok: true, data: { url } });
  } catch (error: any) {
    console.error("Checkout error:", error);
    return NextResponse.json(
      { ok: false, error: error.message ?? "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
