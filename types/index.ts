/** Core types for the ClawHub registry */

export interface User {
  username: string;
  githubId: string;
  displayName: string;
  avatarUrl: string;
  createdAt: string;
}

export interface SkillFile {
  path: string;
  content: string;
  size: number;
}

export interface SkillVersion {
  semver: string;
  changelog: string;
  files: SkillFile[];
  contentHash: string;
  publishedAt: string;
  publishedBy: string;
  downloadCount: number;
}

export interface Skill {
  slug: string;
  name: string;
  summary: string;
  description: string;
  tags: string[];
  author: User;
  latestVersion: string;
  versions: SkillVersion[];
  stars: number;
  downloads: number;
  createdAt: string;
  updatedAt: string;
  status: "active" | "hidden" | "deleted" | "banned";
}

export interface SearchQuery {
  q: string;
  tags?: string[];
  page?: number;
  limit?: number;
  sort?: "relevance" | "stars" | "downloads" | "recent";
}

export interface SearchResult {
  skills: Skill[];
  total: number;
  page: number;
  totalPages: number;
}

export interface Report {
  id: string;
  skillSlug: string;
  reporterId: string;
  reason: string;
  createdAt: string;
  status: "pending" | "reviewed" | "dismissed";
}

export interface ApiResponse<T> {
  ok: boolean;
  data?: T;
  error?: string;
}
