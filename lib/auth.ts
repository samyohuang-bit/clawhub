/** GitHub OAuth helpers for ClawHub */

import { queryOne } from "./db";
import crypto from "node:crypto";

const GITHUB_AUTHORIZE_URL = "https://github.com/login/oauth/authorize";
const GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token";
const GITHUB_USER_URL = "https://api.github.com/user";

/**
 * Generate GitHub OAuth authorization URL.
 */
export function getGitHubAuthUrl(state: string): string {
  const clientId = process.env.GITHUB_CLIENT_ID;
  if (!clientId) throw new Error("GITHUB_CLIENT_ID not configured");

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback`,
    scope: "read:user user:email",
    state,
  });

  return `${GITHUB_AUTHORIZE_URL}?${params}`;
}

/**
 * Exchange OAuth code for access token.
 */
export async function exchangeCodeForToken(
  code: string
): Promise<string> {
  const res = await fetch(GITHUB_TOKEN_URL, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      client_id: process.env.GITHUB_CLIENT_ID,
      client_secret: process.env.GITHUB_CLIENT_SECRET,
      code,
    }),
  });

  if (!res.ok) {
    throw new Error(`GitHub token exchange failed: ${res.status}`);
  }

  const data = await res.json();
  if (data.error) {
    throw new Error(`GitHub OAuth error: ${data.error_description}`);
  }

  return data.access_token;
}

/**
 * Fetch GitHub user profile.
 */
export async function getGitHubUser(accessToken: string): Promise<{
  id: number;
  login: string;
  name: string | null;
  avatar_url: string;
  email: string | null;
  created_at: string;
}> {
  const res = await fetch(GITHUB_USER_URL, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/vnd.github.v3+json",
    },
  });

  if (!res.ok) {
    throw new Error(`GitHub user fetch failed: ${res.status}`);
  }

  return res.json();
}

/**
 * Create or update user from GitHub profile.
 * Also checks account age (≥1 week to publish).
 */
export async function upsertUser(githubUser: {
  id: number;
  login: string;
  name: string | null;
  avatar_url: string;
  email: string | null;
  created_at: string;
}) {
  const githubId = String(githubUser.id);

  // Check if user exists
  const existing = await queryOne(
    `SELECT id, username, github_id, is_banned FROM users WHERE github_id = $1`,
    [githubId]
  );

  if (existing) {
    // Update profile
    const updated = await queryOne(
      `UPDATE users SET
        username = $2,
        display_name = $3,
        avatar_url = $4,
        email = COALESCE($5, email),
        updated_at = now()
      WHERE github_id = $1
      RETURNING id, username, github_id, display_name, avatar_url, is_banned, created_at`,
      [githubId, githubUser.login, githubUser.name, githubUser.avatar_url, githubUser.email]
    );
    return updated;
  }

  // Create new user
  const created = await queryOne(
    `INSERT INTO users (username, github_id, display_name, avatar_url, email)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, username, github_id, display_name, avatar_url, is_banned, created_at`,
    [githubUser.login, githubId, githubUser.name, githubUser.avatar_url, githubUser.email]
  );
  return created;
}

/**
 * Check if GitHub account is at least 1 week old.
 */
export function isAccountOldEnough(githubCreatedAt: string): boolean {
  const created = new Date(githubCreatedAt);
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  return created < oneWeekAgo;
}

/**
 * Generate a secure random state token for OAuth.
 */
export function generateStateToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Hash an API token for storage.
 */
export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/**
 * Generate a new API token for CLI use.
 * Returns the plaintext token (shown once) and its hash.
 */
export function generateApiToken(): { token: string; hash: string } {
  const token = `chub_${crypto.randomBytes(32).toString("hex")}`;
  const hash = hashToken(token);
  return { token, hash };
}
