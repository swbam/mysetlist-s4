import { NextRequest } from "next/server";
import { db, votes } from "@repo/database";
import { and, eq, sql } from "drizzle-orm";
import { getUser } from "@repo/auth";
import { z } from "zod";

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
      .where(and(eq(votes.setlistSongId, setlistSongId), eq(votes.userId, userId)))
      .limit(1);
    currentUserUpvoted = Boolean(v);
  }

  return { up: row?.up ?? 0, currentUserUpvoted };
}

// ---------------------------------------------------------------------------
// POST /api/votes – toggle up-vote
// ---------------------------------------------------------------------------
export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = postSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid payload" }, { status: 400 });
  }
  const { setlistSongId } = parsed.data;

  const existing = await db
    .select({ id: votes.id })
    .from(votes)
    .where(and(eq(votes.setlistSongId, setlistSongId), eq(votes.userId, user.id)))
    .limit(1);

  if (existing.length) {
    await db.delete(votes).where(eq(votes.id, existing[0]!.id));
  } else {
    await db.insert(votes).values({
      setlistSongId,
      userId: user.id,
    });
  }

  const counts = await getCounts(setlistSongId, user.id);
  return Response.json(counts);
}

// ---------------------------------------------------------------------------
// GET /api/votes?setlistSongId=...
// ---------------------------------------------------------------------------
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const setlistSongId = searchParams.get("setlistSongId");
  if (!setlistSongId) {
    return Response.json({ error: "setlistSongId required" }, { status: 400 });
  }

  const user = await getUser().catch(() => null);
  const counts = await getCounts(setlistSongId, user?.id);
  return Response.json(counts);
}
