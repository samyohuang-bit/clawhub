import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/auth/me — Get current user info
 * POST /api/auth/login — GitHub OAuth login
 * POST /api/auth/token — Generate API token
 */

export async function GET(_request: NextRequest) {
  // TODO: Verify JWT from Authorization header
  return NextResponse.json(
    { ok: false, error: "Not authenticated" },
    { status: 401 }
  );
}

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");

  if (action === "login") {
    // TODO: GitHub OAuth flow
    // 1. Redirect to GitHub with client_id
    // 2. Handle callback with code
    // 3. Exchange code for access token
    // 4. Fetch GitHub user profile
    // 5. Create or update user in DB
    // 6. Issue JWT
    return NextResponse.json(
      { ok: false, error: "OAuth not yet implemented" },
      { status: 501 }
    );
  }

  if (action === "token") {
    // TODO: Generate API token for CLI use
    // 1. Verify authenticated user
    // 2. Generate secure random token
    // 3. Store hashed token in DB
    // 4. Return plaintext token (shown once)
    return NextResponse.json(
      { ok: false, error: "Token generation not yet implemented" },
      { status: 501 }
    );
  }

  return NextResponse.json(
    { ok: false, error: "Unknown action" },
    { status: 400 }
  );
}
