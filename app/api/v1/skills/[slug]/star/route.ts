import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { queryOne, query as dbQuery, transaction } from "@/lib/db";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "change-me-in-production"
);

async function getAuthUserId(request: NextRequest): Promise<string | null> {
  const cookieStore = await cookies();
  const token =
    cookieStore.get("auth_token")?.value ??
    request.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload.sub as string;
  } catch {
    return null;
  }
}

interface RouteParams {
  params: Promise<{ slug: string }>;
}

/**
 * POST /api/v1/skills/:slug/star — Star a skill
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { slug } = await params;
  const userId = await getAuthUserId(request);
  if (!userId) {
    return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
  }

  try {
    await transaction(async (client) => {
      // Check if already starred
      const existing = await client.query(
        `SELECT 1 FROM stars WHERE user_id = $1 AND skill_slug = $2`,
        [userId, slug]
      );
      if (existing.rows.length > 0) return;

      // Insert star
      await client.query(
        `INSERT INTO stars (user_id, skill_slug) VALUES ($1, $2)`,
        [userId, slug]
      );

      // Update skill star count
      await client.query(
        `UPDATE skills SET stars = stars + 1, updated_at = now() WHERE slug = $1`,
        [slug]
      );
    });

    const skill = await queryOne<{ stars: number }>(
      `SELECT stars FROM skills WHERE slug = $1`, [slug]
    );

    return NextResponse.json({
      ok: true,
      data: { slug, starred: true, stars: skill?.stars ?? 0 },
    });
  } catch (error) {
    console.error("Star error:", error);
    return NextResponse.json({ ok: false, error: "Failed to star skill" }, { status: 500 });
  }
}

/**
 * DELETE /api/v1/skills/:slug/star — Unstar a skill
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { slug } = await params;
  const userId = await getAuthUserId(request);
  if (!userId) {
    return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
  }

  try {
    await transaction(async (client) => {
      const result = await client.query(
        `DELETE FROM stars WHERE user_id = $1 AND skill_slug = $2`,
        [userId, slug]
      );
      if (result.rowCount && result.rowCount > 0) {
        await client.query(
          `UPDATE skills SET stars = GREATEST(stars - 1, 0), updated_at = now() WHERE slug = $1`,
          [slug]
        );
      }
    });

    const skill = await queryOne<{ stars: number }>(
      `SELECT stars FROM skills WHERE slug = $1`, [slug]
    );

    return NextResponse.json({
      ok: true,
      data: { slug, starred: false, stars: skill?.stars ?? 0 },
    });
  } catch (error) {
    console.error("Unstar error:", error);
    return NextResponse.json({ ok: false, error: "Failed to unstar skill" }, { status: 500 });
  }
}

/**
 * GET /api/v1/skills/:slug/star — Check star status
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { slug } = await params;
  const userId = await getAuthUserId(request);

  const skill = await queryOne<{ stars: number }>(
    `SELECT stars FROM skills WHERE slug = $1`, [slug]
  );

  let starred = false;
  if (userId) {
    const star = await queryOne(
      `SELECT 1 FROM stars WHERE user_id = $1 AND skill_slug = $2`,
      [userId, slug]
    );
    starred = !!star;
  }

  return NextResponse.json({
    ok: true,
    data: { slug, starred, stars: skill?.stars ?? 0 },
  });
}
