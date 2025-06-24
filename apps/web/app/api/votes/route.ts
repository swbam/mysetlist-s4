import { NextRequest, NextResponse } from 'next/server';
import { db } from '@repo/database';
import { setlistSongs, votes } from '@repo/database';
import { eq, and } from 'drizzle-orm';
import { getUser } from '@repo/auth/server';

export async function POST(request: NextRequest) {
  try {
    const user = await getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { setlistSongId, voteType } = await request.json();

    if (!setlistSongId || !['up', 'down', null].includes(voteType)) {
      return NextResponse.json({ error: 'Invalid request data' }, { status: 400 });
    }

    // Check if user has already voted on this song
    const existingVote = await db
      .select()
      .from(votes)
      .where(and(
        eq(votes.userId, user.id),
        eq(votes.setlistSongId, setlistSongId)
      ))
      .limit(1);

    if (voteType === null) {
      // Remove vote
      if (existingVote.length > 0) {
        await db
          .delete(votes)
          .where(and(
            eq(votes.userId, user.id),
            eq(votes.setlistSongId, setlistSongId)
          ));
      }
    } else if (existingVote.length > 0) {
      // Update existing vote
      await db
        .update(votes)
        .set({ 
          voteType,
          updatedAt: new Date()
        })
        .where(and(
          eq(votes.userId, user.id),
          eq(votes.setlistSongId, setlistSongId)
        ));
    } else {
      // Create new vote
      await db
        .insert(votes)
        .values({
          userId: user.id,
          setlistSongId,
          voteType,
        });
    }

    // Update vote counts on setlist_songs table
    const allVotes = await db
      .select()
      .from(votes)
      .where(eq(votes.setlistSongId, setlistSongId));

    const upvotes = allVotes.filter(v => v.voteType === 'up').length;
    const downvotes = allVotes.filter(v => v.voteType === 'down').length;
    const netVotes = upvotes - downvotes;

    await db
      .update(setlistSongs)
      .set({
        upvotes,
        downvotes,
        netVotes,
        updatedAt: new Date()
      })
      .where(eq(setlistSongs.id, setlistSongId));

    return NextResponse.json({ 
      success: true,
      voteType,
      upvotes,
      downvotes,
      netVotes
    });

  } catch (error) {
    console.error('Vote API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await getUser();
    const { searchParams } = new URL(request.url);
    const setlistSongId = searchParams.get('setlistSongId');

    if (!setlistSongId) {
      return NextResponse.json({ error: 'Missing setlistSongId parameter' }, { status: 400 });
    }

    // Get vote counts
    const song = await db
      .select({
        upvotes: setlistSongs.upvotes,
        downvotes: setlistSongs.downvotes,
        netVotes: setlistSongs.netVotes,
      })
      .from(setlistSongs)
      .where(eq(setlistSongs.id, setlistSongId))
      .limit(1);

    if (song.length === 0) {
      return NextResponse.json({ error: 'Song not found' }, { status: 404 });
    }

    // Get user's vote if authenticated
    let userVote = null;
    if (user) {
      const vote = await db
        .select({ voteType: votes.voteType })
        .from(votes)
        .where(and(
          eq(votes.userId, user.id),
          eq(votes.setlistSongId, setlistSongId)
        ))
        .limit(1);

      userVote = vote.length > 0 ? vote[0].voteType : null;
    }

    return NextResponse.json({
      ...song[0],
      userVote,
    });

  } catch (error) {
    console.error('Get votes API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 