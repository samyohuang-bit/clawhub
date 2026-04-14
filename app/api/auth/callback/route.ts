import { NextRequest, NextResponse } from "next/server";
import {
  exchangeCodeForToken,
  getGitHubUser,
  upsertUser,
  isAccountOldEnough,
  generateApiToken,
  hashToken,
} from "@/lib/auth";
import { queryOne } from "@/lib/db";
import { cookies } from "next/headers";
import { SignJWT } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "change-me-in-production"
);

/**
 * GET /api/auth/callback
 *
 * Handles GitHub OAuth callback.
 * Exchanges code for token, creates/updates user, issues JWT.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  // Handle GitHub error
  if (error) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/?auth_error=${error}`
    );
  }

  if (!code || !state) {
    return NextResponse.json(
      { ok: false, error: "Missing code or state" },
      { status: 400 }
    );
  }

  // Verify state (CSRF protection)
  const cookieStore = await cookies();
  const savedState = cookieStore.get("oauth_state")?.value;
  if (!savedState || savedState !== state) {
    return NextResponse.json(
      { ok: false, error: "Invalid state parameter" },
      { status: 403 }
    );
  }

  // Clear state cookie
  cookieStore.delete("oauth_state");

  try {
    // Exchange code for access token
    const accessToken = await exchangeCodeForToken(code);

    // Fetch GitHub user profile
    const githubUser = await getGitHubUser(accessToken);

    // Create or update user in DB
    const user = await upsertUser(githubUser);

    if (!user) {
      throw new Error("Failed to create/update user");
    }

    if (user.is_banned) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/?auth_error=banned`
      );
    }

    // Issue JWT
    const jwt = await new SignJWT({
      sub: user.id,
      username: user.username,
      github_id: user.github_id,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("7d")
      .sign(JWT_SECRET);

    // Set JWT cookie
    cookieStore.set("auth_token", jwt, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: "/",
    });

    // Redirect to dashboard
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/?auth=success`
    );
  } catch (err) {
    console.error("OAuth callback error:", err);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/?auth_error=failed`
    );
  }
}
