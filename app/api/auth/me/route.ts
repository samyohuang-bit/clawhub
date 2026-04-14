import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { generateApiToken, hashToken } from "@/lib/auth";
import { queryOne, transaction } from "@/lib/db";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "change-me-in-production"
);

/**
 * GET /api/auth/me
 *
 * Returns current authenticated user info.
 */
export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;

  if (!token) {
    return NextResponse.json(
      { ok: false, error: "Not authenticated" },
      { status: 401 }
    );
  }

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);

    const user = await queryOne(
      `SELECT id, username, github_id, display_name, avatar_url, email, is_moderator, created_at
       FROM users WHERE id = $1`,
      [payload.sub]
    );

    if (!user) {
      return NextResponse.json(
        { ok: false, error: "User not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true, data: user });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid token" },
      { status: 401 }
    );
  }
}

/**
 * POST /api/auth/token
 *
 * Generate an API token for CLI use.
 * Body: { label?: string }
 */
export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;

  if (!token) {
    return NextResponse.json(
      { ok: false, error: "Not authenticated" },
      { status: 401 }
    );
  }

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    const userId = payload.sub as string;

    const body = await request.json().catch(() => ({}));
    const label = body.label || "CLI token";

    // Generate token
    const { token: plainToken, hash } = generateApiToken();

    // Store hashed token
    await transaction(async (client) => {
      await client.query(
        `INSERT INTO api_tokens (user_id, token_hash, label) VALUES ($1, $2, $3)`,
        [userId, hash, label]
      );
    });

    // Return plaintext token (shown once)
    return NextResponse.json({
      ok: true,
      data: {
        token: plainToken,
        prefix: "chub_",
        label,
        createdAt: new Date().toISOString(),
      },
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid token" },
      { status: 401 }
    );
  }
}
