import { NextRequest, NextResponse } from 'next/server';
import { db } from '@repo/database';
import { userFollowsArtists } from '@repo/database';
import { eq } from 'drizzle-orm';
import { getUser } from '@repo/auth/server';

export async function GET(request: NextRequest) {
  try {
    const user = await getUser();
    
    if (!user) {
      return NextResponse.json({ artistIds: [] });
    }

    // Get all artists the user is following
    const following = await db
      .select({
        artistId: userFollowsArtists.artistId
      })
      .from(userFollowsArtists)
      .where(eq(userFollowsArtists.userId, user.id));

    const artistIds = following.map(f => f.artistId);

    return NextResponse.json({ artistIds });
  } catch (error) {
    console.error('Error fetching following status:', error);
    return NextResponse.json({ artistIds: [] });
  }
}