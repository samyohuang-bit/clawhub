import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/skills — List skills (paginated)
 * POST /api/skills — Publish a new skill
 *
 * In production, backed by PostgreSQL + S3 for file storage.
 */

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 100);
  const sort = searchParams.get("sort") || "recent";

  // TODO: Query database for skills with pagination
  return NextResponse.json({
    ok: true,
    data: {
      skills: [],
      total: 0,
      page,
      totalPages: 0,
    },
  });
}

export async function POST(request: NextRequest) {
  // TODO: Authenticate user via JWT
  // TODO: Validate skill bundle (must have SKILL.md)
  // TODO: Parse metadata from SKILL.md
  // TODO: Store files in S3
  // TODO: Create SkillVersion record in DB
  // TODO: Generate embedding for search indexing

  const body = await request.json();

  return NextResponse.json(
    {
      ok: false,
      error: "Publish endpoint not yet implemented",
      hint: "Use `clawhub publish <path>` CLI command instead",
    },
    { status: 501 }
  );
}
