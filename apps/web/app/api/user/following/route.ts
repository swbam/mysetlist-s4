import { getUserFromRequest } from '@repo/auth/server';
import { artistStats, artists, db, userFollowsArtists } from '@repo/database';
import { desc, eq, sql } from 'drizzle-orm';
import { type NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all artists the user is following with their stats
    const followedArtists = await db
      .select({
        id: artists.id,
        name: artists.name,
        slug: artists.slug,
        logoUrl: artists.imageUrl,
        followedAt: userFollowsArtists.createdAt,
        totalShows: artistStats.totalShows,
        totalSetlists: artistStats.totalSetlists,
        totalSongs: sql<number>`0`, // Placeholder - would need to calculate from actual song data
        avgSongsPerShow: artistStats.avgSetlistLength,
      })
      .from(userFollowsArtists)
      .innerJoin(artists, eq(userFollowsArtists.artistId, artists.id))
      .leftJoin(artistStats, eq(artists.id, artistStats.artistId))
      .where(eq(userFollowsArtists.userId, user.id))
      .orderBy(desc(userFollowsArtists.createdAt));

    return NextResponse.json({ artists: followedArtists });
  } catch (_error) {
    return NextResponse.json(
      { error: 'Failed to fetch followed artists' },
      { status: 500 }
    );
  }
}
