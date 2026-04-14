import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { recordUsage, type UsageEvent } from "@/lib/billing";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "change-me-in-production"
);

/**
 * POST /api/billing/usage — Record usage event(s)
 * Body: { events: UsageEvent[] }
 *
 * Used by agents to report metered usage.
 */
export async function POST(request: NextRequest) {
  // Verify auth
  const cookieStore = await cookies();
  const token =
    cookieStore.get("auth_token")?.value ??
    request.headers.get("Authorization")?.replace("Bearer ", "");

  if (!token) {
    return NextResponse.json(
      { ok: false, error: "Not authenticated" },
      { status: 401 }
    );
  }

  let userId: string;
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    userId = payload.sub as string;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid token" },
      { status: 401 }
    );
  }

  // Parse body
  const body = await request.json().catch(() => ({}));
  const events: UsageEvent[] = body.events ?? [];

  if (!events.length) {
    return NextResponse.json(
      { ok: false, error: "No events provided" },
      { status: 400 }
    );
  }

  // Validate events
  for (const event of events) {
    if (!event.event_type || !event.quantity || !event.unit) {
      return NextResponse.json(
        { ok: false, error: "Invalid event: missing required fields" },
        { status: 400 }
      );
    }
  }

  try {
    const result = await recordUsage(userId, events);

    if (result.quotaExceeded) {
      return NextResponse.json(
        {
          ok: false,
          error: "Quota exceeded",
          balance: result.balance,
          hint: "Upgrade your plan or purchase credits",
        },
        { status: 429 }
      );
    }

    return NextResponse.json({
      ok: true,
      data: {
        recorded: events.length,
        balance: result.balance,
      },
    });
  } catch (error) {
    console.error("Usage recording error:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to record usage" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/billing/usage — Query usage
 */
export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  const token =
    cookieStore.get("auth_token")?.value ??
    request.headers.get("Authorization")?.replace("Bearer ", "");

  if (!token) {
    return NextResponse.json(
      { ok: false, error: "Not authenticated" },
      { status: 401 }
    );
  }

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    const { getUsageBySkill } = await import("@/lib/billing");

    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month") ?? undefined;

    const breakdown = await getUsageBySkill(payload.sub as string, month);

    return NextResponse.json({
      ok: true,
      data: { breakdown },
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid token" },
      { status: 401 }
    );
  }
}
