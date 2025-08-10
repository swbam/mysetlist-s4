import { getUser } from "@repo/auth/server";
import { db } from "@repo/database";
import { votes } from "@repo/database";
import { and, count, eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";

type RouteParams = {
  params: Promise<{
    setlistSongId: string;
  }>;
};

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { setlistSongId } = await params;
    const user = await getUser();

    const countResult = await db
      .select({ count: count() })
      .from(votes)
      .where(eq(votes.setlistSongId, setlistSongId));

    const upvotes = countResult[0]?.count || 0;

    let userVoted = false;
    if (user) {
      const userVoteRecord = await db
        .select({ id: votes.id })
        .from(votes)
        .where(and(eq(votes.setlistSongId, setlistSongId), eq(votes.userId, user.id)))
        .limit(1);
      userVoted = userVoteRecord.length > 0;
    }

    return NextResponse.json({
      setlistSongId,
      upvotes,
      userVoted,
    });
  } catch (_error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
