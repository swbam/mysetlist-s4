import { getUser } from '@repo/auth/server';
import { db } from '@repo/database';
import { votes } from '@repo/database';
import { and, eq } from 'drizzle-orm';
import { type NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const user = await getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { setlistSongId, voteType } = await request.json();

    if (!setlistSongId || (voteType && !['up', 'down'].includes(voteType))) {
      return NextResponse.json(
        { error: 'Invalid request data' },
        { status: 400 }
      );
    }

    // Check if user already voted on this setlist song
    const existingVote = await db
      .select()
      .from(votes)
      .where(
        and(eq(votes.setlistSongId, setlistSongId), eq(votes.userId, user.id))
      )
      .limit(1);

    if (voteType === null) {
      // Remove vote
      if (existingVote.length > 0) {
        await db
          .delete(votes)
          .where(
            and(
              eq(votes.setlistSongId, setlistSongId),
              eq(votes.userId, user.id)
            )
          );
      }
    } else if (existingVote.length > 0) {
      // Update existing vote
      await db
        .update(votes)
        .set({ voteType })
        .where(
          and(eq(votes.setlistSongId, setlistSongId), eq(votes.userId, user.id))
        );
    } else {
      // Create new vote
      await db.insert(votes).values({
        setlistSongId,
        userId: user.id,
        voteType,
      });
    }

    return NextResponse.json({ success: true });
  } catch (_error) {
    return NextResponse.json(
      { error: 'Failed to process vote' },
      { status: 500 }
    );
  }
}
