import { NextRequest, NextResponse } from "next/server";
import { queryOne } from "@/lib/db";
import type { Skill } from "@/types";

/**
 * GET /api/v1/skills/:slug
 *
 * This is the endpoint OpenClaw CLI calls for skill detail.
 */

interface RouteParams {
  params: Promise<{ slug: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { slug } = await params;

  try {
    const skill = await queryOne<Skill & { author_username: string }>(
      `SELECT
        s.slug, s.name, s.summary, s.description, s.tags,
        s.latest_version, s.stars, s.downloads, s.status,
        s.created_at, s.updated_at,
        u.username as author_username,
        u.display_name as author_display_name,
        u.avatar_url as author_avatar_url
      FROM skills s
      JOIN users u ON u.id = s.author_id
      WHERE s.slug = $1 AND s.status != 'deleted'`,
      [slug]
    );

    if (!skill) {
      return NextResponse.json({ error: "Skill not found" }, { status: 404 });
    }

    // Fetch versions
    const versions = await queryOne(
      `SELECT semver, changelog, published_at, download_count
       FROM skill_versions
       WHERE skill_slug = $1
       ORDER BY published_at DESC`,
      [slug]
    );

    return NextResponse.json({
      ok: true,
      data: {
        ...skill,
        versions: versions ? [versions] : [],
      },
    });
  } catch (error) {
    console.error("Skill fetch error:", error);
    return NextResponse.json({ error: "Skill not found" }, { status: 404 });
  }
}
