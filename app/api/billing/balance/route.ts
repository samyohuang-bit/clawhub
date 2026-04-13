import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/billing/balance
 *
 * Returns current account balance, plan info, and usage summary.
 */

export async function GET(request: NextRequest) {
  // TODO: Verify auth token
  // TODO: Look up account from DB
  // TODO: Calculate current period usage

  return NextResponse.json({
    ok: true,
    data: {
      plan: "free",
      planLimits: {
        callsPerMonth: 100,
        tokensPerMonth: 0,
      },
      currentUsage: {
        calls: 0,
        tokens: 0,
      },
      remaining: {
        calls: 100,
        tokens: 0,
      },
      credits: 0,
      period: {
        start: new Date().toISOString(),
        end: new Date().toISOString(),
      },
    },
  });
}
