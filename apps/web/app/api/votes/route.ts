import { getUser } from "@repo/auth/server";
import { db, votes } from "@repo/database";
import { and, eq, sql } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { z } from "zod";

// Force dynamic rendering for API route
export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------
const postSchema = z.object({
  setlistSongId: z.string().uuid(),
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
async function getCounts(setlistSongId: string, userId?: string) {
  try {
    const [row] = await db
      .select({
        up: sql<number>`COUNT(*)`,
      })
      .from(votes)
      .where(eq(votes.setlistSongId, setlistSongId));

    let currentUserUpvoted = false;
    if (userId) {
      const [v] = await db
        .select({ id: votes.id })
        .from(votes)
        .where(
          and(eq(votes.setlistSongId, setlistSongId), eq(votes.userId, userId)),
        )
        .limit(1);
      currentUserUpvoted = Boolean(v);
    }

    return { up: row?.up ?? 0, currentUserUpvoted };
  } catch (error) {
    console.error("Error in getCounts:", error);
    // Return safe defaults on database error
    return { up: 0, currentUserUpvoted: false };
  }
}

// ---------------------------------------------------------------------------
// POST /api/votes – toggle up-vote
// ---------------------------------------------------------------------------
export async function POST(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const parsed = postSchema.safeParse(body);
    if (!parsed.success) {
      console.error("Invalid POST payload:", parsed.error);
      return Response.json(
        {
          error: "Invalid payload",
          details: parsed.error.errors,
        },
        { status: 400 },
      );
    }
    const { setlistSongId } = parsed.data;

    const existing = await db
      .select({ id: votes.id })
      .from(votes)
      .where(
        and(eq(votes.setlistSongId, setlistSongId), eq(votes.userId, user.id)),
      )
      .limit(1);

    if (existing.length && existing[0]?.id) {
      await db.delete(votes).where(eq(votes.id, existing[0].id));
    } else {
      await db.insert(votes).values({
        setlistSongId,
        userId: user.id,
      });
    }

    const counts = await getCounts(setlistSongId, user.id);
    return Response.json(counts, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  } catch (error) {
    console.error("Error in POST /api/votes:", error);
    return Response.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// GET /api/votes?setlistSongId=...
// ---------------------------------------------------------------------------
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const setlistSongId = searchParams.get("setlistSongId");
    if (!setlistSongId) {
      return Response.json(
        { error: "setlistSongId required" },
        { status: 400 },
      );
    }

    // Validate UUID format
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(setlistSongId)) {
      return Response.json(
        { error: "Invalid setlistSongId format" },
        { status: 400 },
      );
    }

    const user = await getUser().catch(() => null);
    const counts = await getCounts(setlistSongId, user?.id);
    return Response.json(counts, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  } catch (error) {
    console.error("Error in GET /api/votes:", error);
    return Response.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// OPTIONS /api/votes - CORS preflight
// ---------------------------------------------------------------------------
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Max-Age": "86400",
    },
  });
}
