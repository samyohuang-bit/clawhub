import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/v1/packages/:name
 *
 * Package detail endpoint — used by OpenClaw for plugin install.
 *
 * GET /api/v1/packages/:name/versions/:version
 * GET /api/v1/packages/:name/download
 *
 * These sub-routes are handled by separate route files.
 */

interface RouteParams {
  params: Promise<{ name: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { name } = await params;

  // TODO: Look up package in database
  return NextResponse.json(
    {
      error: "Package not found",
      name,
    },
    { status: 404 }
  );
}
