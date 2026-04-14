import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { queryOne, transaction } from "@/lib/db";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "change-me-in-production"
);

/**
 * POST /api/moderation/action — Take moderation action (moderator only)
 *
 * Body: { skillSlug: string, action: "hide" | "unhide" | "delete" | "ban", reason?: string }
 */
export async function POST(request: NextRequest) {
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

  const body = await request.json().catch(() => ({}));
  const { skillSlug, action, reason } = body;

  if (!skillSlug || !action) {
    return NextResponse.json(
      { ok: false, error: "Missing required fields: skillSlug, action" },
      { status: 400 }
    );
  }

  const validActions = ["hide", "unhide", "delete", "ban"];
  if (!validActions.includes(action)) {
    return NextResponse.json(
      { ok: false, error: `Invalid action. Must be one of: ${validActions.join(", ")}` },
      { status: 400 }
    );
  }

  try {
    await transaction(async (client) => {
      // Update skill status
      const newStatus = action === "ban" ? "banned" : action === "delete" ? "deleted" : action === "hide" ? "hidden" : "active";

      await client.query(
        `UPDATE skills SET status = $2, updated_at = now() WHERE slug = $1`,
        [skillSlug, newStatus]
      );

      // Resolve pending reports for this skill
      await client.query(
        `UPDATE reports SET status = 'reviewed' WHERE skill_slug = $1 AND status = 'pending'`,
        [skillSlug]
      );
    });

    return NextResponse.json({
      ok: true,
      data: { skillSlug, action, message: `Skill ${action === "unhide" ? "restored" : action + "ed"}` },
    });
  } catch (error) {
    console.error("Moderation action error:", error);
    return NextResponse.json({ ok: false, error: "Failed to take action" }, { status: 500 });
  }
}
