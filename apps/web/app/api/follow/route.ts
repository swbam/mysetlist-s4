import { NextRequest, NextResponse } from 'next/server';
import { db } from '@repo/database';
import { userFollowsArtists, artists } from '@repo/database';
import { eq, and } from 'drizzle-orm';
import { getUser } from '@repo/auth/server';

export async function POST(request: NextRequest) {
  try {
    const user = await getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { artistId, following } = await request.json();

    if (!artistId || typeof following !== 'boolean') {
      return NextResponse.json({ error: 'Invalid request data' }, { status: 400 });
    }

    // Verify artist exists
    const artist = await db
      .select()
      .from(artists)
      .where(eq(artists.id, artistId))
      .limit(1);

    if (artist.length === 0) {
      return NextResponse.json({ error: 'Artist not found' }, { status: 404 });
    }

    if (following) {
      // Follow the artist (insert if not exists)
      try {
        await db
          .insert(userFollowsArtists)
          .values({
            userId: user.id,
            artistId,
          });
      } catch (error) {
        // Already following, ignore duplicate error
        console.log('User already follows this artist');
      }
    } else {
      // Unfollow the artist
      await db
        .delete(userFollowsArtists)
        .where(and(
          eq(userFollowsArtists.userId, user.id),
          eq(userFollowsArtists.artistId, artistId)
        ));
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Follow/unfollow error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 