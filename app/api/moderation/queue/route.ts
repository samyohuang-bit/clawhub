import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { query as dbQuery, queryOne } from "@/lib/db";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "change-me-in-production"
);

/**
 * GET /api/moderation/queue — Get pending reports (moderator only)
 */
export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;
  if (!token) {
    return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
  }

  let userId: string;
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    userId = payload.sub as string;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid token" }, { status: 401 });
  }

  // Check moderator status
  const user = await queryOne<{ is_moderator: boolean }>(
    `SELECT is_moderator FROM users WHERE id = $1`, [userId]
  );
  if (!user?.is_moderator) {
    return NextResponse.json({ ok: false, error: "Moderator access required" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 200);
  const offset = (page - 1) * limit;

  try {
    const reports = await dbQuery(
      `SELECT
        r.id, r.skill_slug, r.reason, r.status, r.created_at,
        u.username as reporter_username,
        s.name as skill_name, s.status as skill_status
      FROM reports r
      JOIN users u ON u.id = r.reporter_id
      JOIN skills s ON s.slug = r.skill_slug
      WHERE r.status = 'pending'
      ORDER BY r.created_at DESC
      LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    return NextResponse.json({
      ok: true,
      data: { reports, page, limit },
    });
  } catch (error) {
    console.error("Queue error:", error);
    return NextResponse.json({ ok: false, error: "Failed to load queue" }, { status: 500 });
  }
}
