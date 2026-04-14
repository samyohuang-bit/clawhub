import { NextRequest, NextResponse } from "next/server";
import { getGitHubAuthUrl, generateStateToken } from "@/lib/auth";
import { cookies } from "next/headers";

/**
 * GET /api/auth/login
 *
 * Initiates GitHub OAuth flow. Redirects to GitHub.
 */
export async function GET(request: NextRequest) {
  const state = generateStateToken();

  // Store state in cookie for CSRF protection
  const cookieStore = await cookies();
  cookieStore.set("oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600, // 10 minutes
    path: "/",
  });

  const authUrl = getGitHubAuthUrl(state);
  return NextResponse.redirect(authUrl);
}
