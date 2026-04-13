import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/v1/skills/:slug
 *
 * This is the endpoint OpenClaw CLI calls for skill detail.
 * Params are extracted from the URL path.
 */

interface RouteParams {
  params: Promise<{ slug: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { slug } = await params;

  // TODO: Look up skill in database
  // Return format that OpenClaw expects:
  // { slug, name, summary, description, tags, versions, ... }
  return NextResponse.json(
    {
      error: "Skill not found",
      slug,
    },
    { status: 404 }
  );
}
