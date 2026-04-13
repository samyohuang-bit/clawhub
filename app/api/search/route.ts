import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/search?q=...&tags=...&page=1&limit=20&sort=relevance
 *
 * Full-text + vector search for skills.
 * In production, this would call an embedding service + PostgreSQL with pgvector.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") || "";
  const tags = searchParams.get("tags")?.split(",").filter(Boolean) || [];
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 100);
  const sort = searchParams.get("sort") || "relevance";

  // TODO: Implement actual search with:
  // 1. Generate embedding for query using OpenAI
  // 2. Vector similarity search in pgvector
  // 3. Full-text search fallback
  // 4. Tag filtering
  // 5. Sorting and pagination

  return NextResponse.json({
    ok: true,
    data: {
      skills: [],
      total: 0,
      page,
      totalPages: 0,
    },
    meta: {
      query: q,
      tags,
      sort,
      limit,
    },
  });
}
