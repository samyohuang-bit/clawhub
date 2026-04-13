import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/v1/packages/:name/download
 *
 * Downloads the latest (or specified) version of a package.
 * OpenClaw calls this during `openclaw skills install` and `openclaw plugins install`.
 */

interface RouteParams {
  params: Promise<{ name: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { name } = await params;
  const { searchParams } = new URL(request.url);
  const version = searchParams.get("version");

  // TODO: Fetch package bundle from S3, return as zip
  // Content-Type: application/zip
  // Content-Disposition: attachment; filename="{name}-{version}.zip"
  return NextResponse.json(
    {
      error: "Download not available",
      name,
      version: version || "latest",
    },
    { status: 501 }
  );
}
