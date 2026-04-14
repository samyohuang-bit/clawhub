import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { queryOne } from "@/lib/db";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "change-me-in-production"
);

/**
 * POST /api/moderation/report — Report a skill
 *
 * Body: { skillSlug: string, reason: string }
 */
export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const token =
    cookieStore.get("auth_token")?.value ??
    request.headers.get("Authorization")?.replace("Bearer ", "");

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

  const body = await request.json().catch(() => ({}));
  const { skillSlug, reason } = body;

  if (!skillSlug || !reason) {
    return NextResponse.json(
      { ok: false, error: "Missing required fields: skillSlug, reason" },
      { status: 400 }
    );
  }

  try {
    // Check if skill exists
    const skill = await queryOne(
      `SELECT slug, status FROM skills WHERE slug = $1`, [skillSlug]
    );
    if (!skill) {
      return NextResponse.json({ ok: false, error: "Skill not found" }, { status: 404 });
    }

    // Check if user already reported this skill
    const existing = await queryOne(
      `SELECT id FROM reports WHERE skill_slug = $1 AND reporter_id = $2 AND status = 'pending'`,
      [skillSlug, userId]
    );
    if (existing) {
      return NextResponse.json(
        { ok: false, error: "You have already reported this skill" },
        { status: 409 }
      );
    }

    // Create report (auto-hide trigger fires at 3 reports)
    const report = await queryOne(
      `INSERT INTO reports (skill_slug, reporter_id, reason) VALUES ($1, $2, $3) RETURNING *`,
      [skillSlug, userId, reason]
    );

    return NextResponse.json({
      ok: true,
      data: { reportId: report.id, message: "Report submitted" },
    });
  } catch (error) {
    console.error("Report error:", error);
    return NextResponse.json({ ok: false, error: "Failed to submit report" }, { status: 500 });
  }
}
