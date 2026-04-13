import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/v1/search?q=...&limit=...
 *
 * This is the endpoint OpenClaw CLI calls for `openclaw skills search`.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") || "";
  const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 100);

  // TODO: Implement semantic + full-text search with pgvector
  // For now, return empty results in the format OpenClaw expects
  return NextResponse.json({
    results: [],
    total: 0,
    query: q,
    limit,
  });
}
