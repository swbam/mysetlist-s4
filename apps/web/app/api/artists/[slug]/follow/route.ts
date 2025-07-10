import { getUserFromRequest } from '@repo/auth/server';
import { artists, db, userFollowsArtists } from '@repo/database';
import { and, eq } from 'drizzle-orm';
import { type NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: artistId } = await params;

    // Check if the user is following this artist
    const follow = await db
      .select()
      .from(userFollowsArtists)
      .where(
        and(
          eq(userFollowsArtists.userId, user.id),
          eq(userFollowsArtists.artistId, artistId)
        )
      )
      .limit(1);

    return NextResponse.json({ isFollowing: follow.length > 0 });
  } catch (_error) {
    return NextResponse.json(
      { error: 'Failed to check follow status' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: artistId } = await params;

    // Verify the artist exists
    const artist = await db
      .select()
      .from(artists)
      .where(eq(artists.id, artistId))
      .limit(1);

    if (artist.length === 0) {
      return NextResponse.json({ error: 'Artist not found' }, { status: 404 });
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
      return NextResponse.json({ message: 'Already following this artist' });
    }

    // Create the follow relationship
    await db.insert(userFollowsArtists).values({
      userId: user.id,
      artistId,
    });

    // Track the activity (you can add this to a separate activity tracking system later)
    // For now, the follow relationship itself serves as the activity record

    return NextResponse.json({ message: 'Successfully followed artist' });
  } catch (_error) {
    return NextResponse.json(
      { error: 'Failed to follow artist' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: artistId } = await params;

    // Delete the follow relationship
    await db
      .delete(userFollowsArtists)
      .where(
        and(
          eq(userFollowsArtists.userId, user.id),
          eq(userFollowsArtists.artistId, artistId)
        )
      );

    return NextResponse.json({ message: 'Successfully unfollowed artist' });
  } catch (_error) {
    return NextResponse.json(
      { error: 'Failed to unfollow artist' },
      { status: 500 }
    );
  }
}
