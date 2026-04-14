import { NextRequest, NextResponse } from "next/server";
import { searchSkills } from "@/lib/search";

/**
 * GET /api/v1/search?q=...&limit=...
 *
 * This is the endpoint OpenClaw CLI calls for `openclaw skills search`.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") || "";
  const tags = searchParams.get("tags")?.split(",").filter(Boolean);
  const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 100);
  const page = parseInt(searchParams.get("page") || "1", 10);
  const sort = searchParams.get("sort") as
    | "relevance"
    | "stars"
    | "downloads"
    | "recent"
    | undefined;

  try {
    const result = await searchSkills(q, { tags, limit, page, sort });
    return NextResponse.json(result);
  } catch (error) {
    console.error("Search error:", error);
    // Graceful fallback — return empty results
    return NextResponse.json({
      results: [],
      total: 0,
      query: q,
      limit,
    });
  }
}
