import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { getAccountBalance, checkQuota } from "@/lib/billing";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "change-me-in-production"
);

/**
 * GET /api/billing/balance
 *
 * Returns current account balance, plan info, and usage summary.
 */
export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  const token =
    cookieStore.get("auth_token")?.value ??
    request.headers.get("Authorization")?.replace("Bearer ", "");

  if (!token) {
    return NextResponse.json(
      { ok: false, error: "Not authenticated" },
      { status: 401 }
    );
  }

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    const userId = payload.sub as string;

    const balance = await getAccountBalance(userId);
    const quota = await checkQuota(userId);

    return NextResponse.json({
      ok: true,
      data: {
        ...balance,
        quotaAllowed: quota.allowed,
      },
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid token" },
      { status: 401 }
    );
  }
}
