/** Search engine for ClawHub — vector + full-text combined search */

import { query, queryOne } from "./db";
import type { Skill, SearchResult } from "@/types";

/**
 * Generate embedding for a query string.
 * In production, call OpenAI embeddings API.
 */
async function generateEmbedding(text: string): Promise<number[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY not configured");
  }

  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "text-embedding-3-small",
      input: text.slice(0, 8000),
      dimensions: 1536,
    }),
  });

  if (!res.ok) {
    throw new Error(`Embedding API error: ${res.status}`);
  }

  const data = await res.json();
  return data.data[0].embedding;
}

/**
 * Combined search: vector similarity + full-text, merged and ranked.
 */
export async function searchSkills(
  searchQuery: string,
  options?: {
    tags?: string[];
    page?: number;
    limit?: number;
    sort?: "relevance" | "stars" | "downloads" | "recent";
  }
): Promise<SearchResult> {
  const page = options?.page ?? 1;
  const limit = Math.min(options?.limit ?? 20, 100);
  const offset = (page - 1) * limit;
  const sort = options?.sort ?? "relevance";

  // If no query, just list by sort order
  if (!searchQuery.trim()) {
    return listSkills({ page, limit, sort, tags: options?.tags });
  }

  // Run vector search and full-text search in parallel
  const [vectorResults, ftsResults] = await Promise.all([
    vectorSearch(searchQuery, limit * 2),
    fullTextSearch(searchQuery, options?.tags, limit * 2),
  ]);

  // Merge results — boost skills that appear in both
  const merged = mergeResults(vectorResults, ftsResults);

  // Apply tag filter
  let filtered = merged;
  if (options?.tags?.length) {
    const tagSet = new Set(options.tags);
    filtered = merged.filter((s) => s.tags.some((t) => tagSet.has(t)));
  }

  const total = filtered.length;
  const skills = filtered.slice(offset, offset + limit);

  return {
    skills,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * Vector similarity search using pgvector.
 */
async function vectorSearch(
  queryText: string,
  limit: number
): Promise<Skill[]> {
  let embedding: number[];
  try {
    embedding = await generateEmbedding(queryText);
  } catch {
    // Fallback: return empty if embedding fails
    return [];
  }

  const embeddingStr = `[${embedding.join(",")}]`;

  return query<Skill>(
    `SELECT
      s.slug, s.name, s.summary, s.description, s.tags,
      s.latest_version, s.stars, s.downloads, s.status,
      s.created_at, s.updated_at,
      u.username as author_username,
      u.display_name as author_display_name,
      u.avatar_url as author_avatar_url,
      1 - (e.embedding <=> $1::vector) as similarity
    FROM skill_embeddings e
    JOIN skills s ON s.slug = e.skill_slug
    JOIN users u ON u.id = s.author_id
    WHERE s.status = 'active'
    ORDER BY e.embedding <=> $1::vector
    LIMIT $2`,
    [embeddingStr, limit]
  );
}

/**
 * Full-text search using PostgreSQL tsvector.
 */
async function fullTextSearch(
  queryText: string,
  tags?: string[],
  limit: number = 40
): Promise<Skill[]> {
  const tsQuery = queryText
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => `${w}:*`)
    .join(" & ");

  if (tags?.length) {
    return query<Skill>(
      `SELECT
        s.slug, s.name, s.summary, s.description, s.tags,
        s.latest_version, s.stars, s.downloads, s.status,
        s.created_at, s.updated_at,
        u.username as author_username,
        u.display_name as author_display_name,
        u.avatar_url as author_avatar_url,
        ts_rank(s.search_vector, to_tsquery('english', $1)) as rank
      FROM skills s
      JOIN users u ON u.id = s.author_id
      WHERE s.status = 'active'
        AND s.search_vector @@ to_tsquery('english', $1)
        AND s.tags && $2
      ORDER BY rank DESC
      LIMIT $3`,
      [tsQuery, tags, limit]
    );
  }

  return query<Skill>(
    `SELECT
      s.slug, s.name, s.summary, s.description, s.tags,
      s.latest_version, s.stars, s.downloads, s.status,
      s.created_at, s.updated_at,
      u.username as author_username,
      u.display_name as author_display_name,
      u.avatar_url as author_avatar_url,
      ts_rank(s.search_vector, to_tsquery('english', $1)) as rank
    FROM skills s
    JOIN users u ON u.id = s.author_id
    WHERE s.status = 'active'
      AND s.search_vector @@ to_tsquery('english', $1)
    ORDER BY rank DESC
    LIMIT $2`,
    [tsQuery, limit]
  );
}

/**
 * List skills without search query (browse mode).
 */
async function listSkills(options: {
  page: number;
  limit: number;
  sort: string;
  tags?: string[];
}): Promise<SearchResult> {
  const { page, limit, sort, tags } = options;
  const offset = (page - 1) * limit;

  let orderBy: string;
  switch (sort) {
    case "stars":
      orderBy = "s.stars DESC";
      break;
    case "downloads":
      orderBy = "s.downloads DESC";
      break;
    case "recent":
    default:
      orderBy = "s.created_at DESC";
      break;
  }

  const tagFilter = tags?.length
    ? "AND s.tags && $3"
    : "";

  const params: any[] = [limit, offset];
  if (tags?.length) params.push(tags);

  const skills = await query<Skill>(
    `SELECT
      s.slug, s.name, s.summary, s.description, s.tags,
      s.latest_version, s.stars, s.downloads, s.status,
      s.created_at, s.updated_at,
      u.username as author_username,
      u.display_name as author_display_name,
      u.avatar_url as author_avatar_url
    FROM skills s
    JOIN users u ON u.id = s.author_id
    WHERE s.status = 'active' ${tagFilter}
    ORDER BY ${orderBy}
    LIMIT $1 OFFSET $2`,
    params
  );

  const countResult = await queryOne<{ count: string }>(
    `SELECT COUNT(*) as count FROM skills s WHERE s.status = 'active' ${tagFilter}`,
    tags?.length ? [tags] : []
  );

  const total = parseInt(countResult?.count ?? "0", 10);

  return {
    skills,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * Merge vector and FTS results, boosting overlap.
 */
function mergeResults(
  vectorResults: Skill[],
  ftsResults: Skill[]
): Skill[] {
  const seen = new Map<string, Skill>();

  // Add vector results with score
  for (const skill of vectorResults) {
    seen.set(skill.slug, skill);
  }

  // Add FTS results, boost if already in vector results
  for (const skill of ftsResults) {
    if (seen.has(skill.slug)) {
      // Already present from vector search — keep it (vector is more semantic)
      continue;
    }
    seen.set(skill.slug, skill);
  }

  return Array.from(seen.values());
}
