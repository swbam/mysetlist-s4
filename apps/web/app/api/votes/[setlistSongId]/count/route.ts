import { getUser } from '@repo/auth/server';
import { db } from '@repo/database';
import { votes } from '@repo/database';
import { and, count, eq } from 'drizzle-orm';
import { type NextRequest, NextResponse } from 'next/server';

type RouteParams = {
  params: Promise<{
    setlistSongId: string;
  }>;
};

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { setlistSongId } = await params;
    const user = await getUser();

    // Get vote counts
    const upvoteCount = await db
      .select({ count: count() })
      .from(votes)
      .where(
        and(eq(votes.setlistSongId, setlistSongId), eq(votes.voteType, 'up'))
      );

    const downvoteCount = await db
      .select({ count: count() })
      .from(votes)
      .where(
        and(eq(votes.setlistSongId, setlistSongId), eq(votes.voteType, 'down'))
      );

    const upvotes = upvoteCount[0]?.count || 0;
    const downvotes = downvoteCount[0]?.count || 0;
    const netVotes = upvotes - downvotes;

    // Get user's vote if authenticated
    let userVote: 'up' | 'down' | null = null;
    if (user) {
      const userVoteRecord = await db
        .select({ voteType: votes.voteType })
        .from(votes)
        .where(
          and(eq(votes.setlistSongId, setlistSongId), eq(votes.userId, user.id))
        )
        .limit(1);

      if (userVoteRecord.length > 0) {
        userVote = userVoteRecord[0]?.voteType || null;
      }
    }

    return NextResponse.json({
      setlistSongId,
      upvotes,
      downvotes,
      netVotes,
      userVote,
    });
  } catch (_error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
