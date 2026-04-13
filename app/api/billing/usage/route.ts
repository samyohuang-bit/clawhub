import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/billing/usage — Record usage event(s)
 * GET  /api/billing/usage  — Query usage
 *
 * Phase 1: Free tier with 100-call monthly limit
 * Phase 2: Stripe integration, plan management
 */

export async function POST(request: NextRequest) {
  // TODO: Verify auth token
  // TODO: Validate usage events
  // TODO: Check quota (free tier: 100 calls/month)
  // TODO: Store in TimescaleDB

  const body = await request.json();

  return NextResponse.json(
    {
      ok: false,
      error: "Usage recording not yet implemented",
      hint: "Free tier: 100 agent calls/month",
    },
    { status: 501 }
  );
}

export async function GET(request: NextRequest) {
  // TODO: Verify auth token
  // TODO: Query usage_events table with filters

  return NextResponse.json({
    ok: true,
    data: {
      events: [],
      total: 0,
      period: {
        start: new Date().toISOString(),
        end: new Date().toISOString(),
      },
    },
  });
}
