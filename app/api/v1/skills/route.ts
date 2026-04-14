import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { queryOne, transaction } from "@/lib/db";
import crypto from "node:crypto";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "change-me-in-production"
);

/**
 * GET /api/v1/skills — List skills (paginated)
 * POST /api/v1/skills — Publish a new skill
 */

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 100);
  const sort = searchParams.get("sort") || "recent";
  const offset = (page - 1) * limit;

  let orderBy: string;
  switch (sort) {
    case "stars": orderBy = "s.stars DESC"; break;
    case "downloads": orderBy = "s.downloads DESC"; break;
    default: orderBy = "s.created_at DESC";
  }

  try {
    const { query } = await import("@/lib/db");

    const skills = await query(
      `SELECT
        s.slug, s.name, s.summary, s.tags,
        s.latest_version, s.stars, s.downloads,
        s.created_at, s.updated_at,
        u.username as author_username,
        u.avatar_url as author_avatar_url
      FROM skills s
      JOIN users u ON u.id = s.author_id
      WHERE s.status = 'active'
      ORDER BY ${orderBy}
      LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    const countResult = await queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM skills WHERE status = 'active'`
    );
    const total = parseInt(countResult?.count ?? "0", 10);

    return NextResponse.json({
      ok: true,
      data: { skills, total, page, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("List skills error:", error);
    return NextResponse.json({ ok: false, error: "Failed to list skills" }, { status: 500 });
  }
}

/**
 * POST /api/v1/skills — Publish a new skill
 *
 * Body: {
 *   slug: string,
 *   name: string,
 *   summary?: string,
 *   description?: string,   // SKILL.md content
 *   tags?: string[],
 *   version: string,        // semver
 *   changelog?: string,
 *   files: { path: string; content: string }[]
 * }
 */
export async function POST(request: NextRequest) {
  // Authenticate
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

  // Check account age (≥1 week to publish)
  const user = await queryOne<{ created_at: string; is_banned: boolean }>(
    `SELECT created_at, is_banned FROM users WHERE id = $1`, [userId]
  );
  if (!user) {
    return NextResponse.json({ ok: false, error: "User not found" }, { status: 404 });
  }
  if (user.is_banned) {
    return NextResponse.json({ ok: false, error: "Account is banned" }, { status: 403 });
  }

  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  if (new Date(user.created_at) > oneWeekAgo) {
    return NextResponse.json(
      { ok: false, error: "Account must be at least 1 week old to publish" },
      { status: 403 }
    );
  }

  // Parse body
  const body = await request.json().catch(() => ({}));
  const { slug, name, summary, description, tags, version, changelog, files } = body;

  if (!slug || !name || !version || !files?.length) {
    return NextResponse.json(
      { ok: false, error: "Missing required fields: slug, name, version, files" },
      { status: 400 }
    );
  }

  // Validate slug format
  if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(slug) || slug.length > 50) {
    return NextResponse.json(
      { ok: false, error: "Invalid slug: use lowercase alphanumeric and hyphens, 2-50 chars" },
      { status: 400 }
    );
  }

  // Validate semver
  if (!/^\d+\.\d+\.\d+/.test(version)) {
    return NextResponse.json({ ok: false, error: "Invalid semver" }, { status: 400 });
  }

  // Check if SKILL.md exists
  const hasSkillMd = files.some((f: any) => f.path === "SKILL.md");
  if (!hasSkillMd) {
    return NextResponse.json(
      { ok: false, error: "Skill bundle must include SKILL.md" },
      { status: 400 }
    );
  }

  // Compute content hash
  const contentHash = crypto
    .createHash("sha256")
    .update(JSON.stringify(files))
    .digest("hex");

  try {
    const result = await transaction(async (client) => {
      // Check if slug is available
      const existing = await client.query(
        `SELECT slug, author_id FROM skills WHERE slug = $1`, [slug]
      );

      if (existing.rows.length > 0) {
        if (existing.rows[0].author_id !== userId) {
          throw new Error("SLUG_TAKEN");
        }
        // Update existing skill
        await client.query(
          `UPDATE skills SET
            name = $2, summary = $3, description = $4, tags = $5,
            latest_version = $6, updated_at = now()
          WHERE slug = $1`,
          [slug, name, summary ?? "", description ?? "", tags ?? [], version]
        );
      } else {
        // Create new skill
        await client.query(
          `INSERT INTO skills (slug, name, summary, description, tags, author_id, latest_version)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [slug, name, summary ?? "", description ?? "", tags ?? [], userId, version]
        );
      }

      // Create version
      const versionResult = await client.query(
        `INSERT INTO skill_versions (skill_slug, semver, changelog, content_hash, files, published_by)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (skill_slug, semver) DO UPDATE SET
           changelog = EXCLUDED.changelog,
           content_hash = EXCLUDED.content_hash,
           files = EXCLUDED.files
         RETURNING *`,
        [slug, version, changelog ?? "", contentHash, JSON.stringify(files), userId]
      );

      return { slug, version: versionResult.rows[0] };
    });

    return NextResponse.json({ ok: true, data: result }, { status: 201 });
  } catch (error: any) {
    if (error.message === "SLUG_TAKEN") {
      return NextResponse.json(
        { ok: false, error: "Slug already taken by another user" },
        { status: 409 }
      );
    }
    console.error("Publish error:", error);
    return NextResponse.json({ ok: false, error: "Failed to publish skill" }, { status: 500 });
  }
}
