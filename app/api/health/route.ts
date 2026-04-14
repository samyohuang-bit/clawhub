import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/health — Health check endpoint for monitoring.
 */
export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "clawhub",
    version: "0.1.0",
    timestamp: new Date().toISOString(),
  });
}
