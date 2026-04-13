import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/v1/download?name=<name>&version=<version>
 *
 * Generic download endpoint — alternative to the named path.
 */

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get("name");
  const version = searchParams.get("version");

  if (!name) {
    return NextResponse.json(
      { error: "Missing required parameter: name" },
      { status: 400 }
    );
  }

  // TODO: Fetch package bundle from S3, return as zip
  return NextResponse.json(
    {
      error: "Download not available",
      name,
      version: version || "latest",
    },
    { status: 501 }
  );
}
