import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { changePlan } from "@/lib/billing";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "change-me-in-production"
);

/**
 * POST /api/billing/plan
 *
 * Upgrade/downgrade plan.
 * Body: { plan: "free" | "pro" | "team" | "enterprise" }
 */
export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;

  if (!token) {
    return NextResponse.json(
      { ok: false, error: "Not authenticated" },
      { status: 401 }
    );
  }

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    const userId = payload.sub as string;

    const body = await request.json();
    const { plan } = body;

    if (!plan) {
      return NextResponse.json(
        { ok: false, error: "Missing plan" },
        { status: 400 }
      );
    }

    await changePlan(userId, plan);

    return NextResponse.json({
      ok: true,
      data: { plan, message: `Plan changed to ${plan}` },
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error.message ?? "Failed to change plan" },
      { status: 400 }
    );
  }
}
