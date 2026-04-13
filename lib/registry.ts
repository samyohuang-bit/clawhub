/** Registry client for ClawHub API */

import type { ApiResponse, SearchResult, Skill } from "@/types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

export async function searchSkills(
  query: string,
  options?: {
    tags?: string[];
    page?: number;
    limit?: number;
    sort?: string;
  }
): Promise<ApiResponse<SearchResult>> {
  const params = new URLSearchParams({ q: query });
  if (options?.tags) params.set("tags", options.tags.join(","));
  if (options?.page) params.set("page", String(options.page));
  if (options?.limit) params.set("limit", String(options.limit));
  if (options?.sort) params.set("sort", options.sort);

  const res = await fetch(`${API_BASE}/api/search?${params}`);
  return res.json();
}

export async function getSkill(slug: string): Promise<ApiResponse<Skill>> {
  const res = await fetch(`${API_BASE}/api/skills/${slug}`);
  return res.json();
}

export async function listSkills(options?: {
  page?: number;
  limit?: number;
  sort?: string;
}): Promise<ApiResponse<{ skills: Skill[]; total: number }>> {
  const params = new URLSearchParams();
  if (options?.page) params.set("page", String(options.page));
  if (options?.limit) params.set("limit", String(options.limit));
  if (options?.sort) params.set("sort", options.sort);

  const res = await fetch(`${API_BASE}/api/skills?${params}`);
  return res.json();
}
