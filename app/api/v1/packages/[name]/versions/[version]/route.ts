import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/v1/packages/:name/versions/:version
 *
 * Returns a specific version of a package.
 */

interface RouteParams {
  params: Promise<{ name: string; version: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { name, version } = await params;

  // TODO: Look up version in database
  return NextResponse.json(
    {
      error: "Version not found",
      name,
      version,
    },
    { status: 404 }
  );
}
