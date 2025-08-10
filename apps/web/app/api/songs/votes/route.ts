import { getUser } from "@repo/auth/server";
import { db } from "@repo/database";
import { votes } from "@repo/database";
import { and, eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const user = await getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { setlistSongId } = await request.json();

    if (!setlistSongId) {
      return NextResponse.json(
        { error: "Missing setlistSongId" },
        { status: 400 },
      );
    }

    // Check if user already voted on this setlist song
    const existingVote = await db
      .select()
      .from(votes)
      .where(
        and(eq(votes.setlistSongId, setlistSongId), eq(votes.userId, user.id)),
      )
      .limit(1);

    if (existingVote.length > 0) {
      // Remove existing upvote (toggle off)
      await db
        .delete(votes)
        .where(
          and(
            eq(votes.setlistSongId, setlistSongId),
            eq(votes.userId, user.id),
          ),
        );
    } else {
      // Insert upvote
      await db.insert(votes).values({
        setlistSongId,
        userId: user.id,
      });
    }

    return NextResponse.json({ success: true });
  } catch (_error) {
    return NextResponse.json(
      { error: "Failed to process vote" },
      { status: 500 },
    );
  }
}
