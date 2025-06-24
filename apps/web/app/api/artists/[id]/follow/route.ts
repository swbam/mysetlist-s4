import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@repo/database';
import { userFollowsArtists, artists } from '@repo/database/src/schema';
import { eq, and } from 'drizzle-orm';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ following: false });
    }

    const follow = await db
      .select()
      .from(userFollowsArtists)
      .where(
        and(
          eq(userFollowsArtists.userId, user.id),
          eq(userFollowsArtists.artistId, params.id)
        )
      )
      .limit(1);

    return NextResponse.json({ following: follow.length > 0 });
  } catch (error) {
    console.error('Error checking follow status:', error);
    return NextResponse.json(
      { error: 'Failed to check follow status' },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const artistId = params.id;

    // Check if artist exists
    const artist = await db
      .select()
      .from(artists)
      .where(eq(artists.id, artistId))
      .limit(1);

    if (artist.length === 0) {
      return NextResponse.json(
        { error: 'Artist not found' },
        { status: 404 }
      );
    }

    // Check if already following
    const existingFollow = await db
      .select()
      .from(userFollowsArtists)
      .where(
        and(
          eq(userFollowsArtists.userId, user.id),
          eq(userFollowsArtists.artistId, artistId)
        )
      )
      .limit(1);

    if (existingFollow.length > 0) {
      return NextResponse.json(
        { error: 'Already following this artist' },
        { status: 400 }
      );
    }

    // Create follow relationship
    await db.insert(userFollowsArtists).values({
      userId: user.id,
      artistId: artistId,
    });

    return NextResponse.json({ success: true, following: true });
  } catch (error) {
    console.error('Error following artist:', error);
    return NextResponse.json(
      { error: 'Failed to follow artist' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const artistId = params.id;

    // Delete follow relationship
    const result = await db
      .delete(userFollowsArtists)
      .where(
        and(
          eq(userFollowsArtists.userId, user.id),
          eq(userFollowsArtists.artistId, artistId)
        )
      )
      .returning();

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Not following this artist' },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, following: false });
  } catch (error) {
    console.error('Error unfollowing artist:', error);
    return NextResponse.json(
      { error: 'Failed to unfollow artist' },
      { status: 500 }
    );
  }
}