import { getUserFromRequest } from '@repo/auth/server';
import {
  artistStats,
  artists,
  db,
  shows,
  userFollowsArtists,
  venues,
} from '@repo/database';
import { and, desc, eq, gte, ne, sql } from 'drizzle-orm';
import { type NextRequest, NextResponse } from 'next/server';

interface RecommendationFactors {
  followedArtistGenres: string[];
  votedArtistIds: string[];
  userLocation?: { city?: string; state?: string };
}

async function getRecommendationFactors(
  userId: string
): Promise<RecommendationFactors> {
  // Get genres from followed artists
  const followedArtistData = await db
    .select({
      genres: artists.genres,
    })
    .from(userFollowsArtists)
    .innerJoin(artists, eq(userFollowsArtists.artistId, artists.id))
    .where(eq(userFollowsArtists.userId, userId));

  const allGenres = followedArtistData
    .flatMap((a) => a.genres || [])
    .filter(Boolean);

  const genreCounts = allGenres.reduce(
    (acc, genre) => {
      acc[genre] = (acc[genre] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  // Get top genres
  const topGenres = Object.entries(genreCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([genre]) => genre);

  // Get artists user has voted for
  const votedArtists = await db
    .selectDistinct({
      artistId: shows.headlinerArtistId,
    })
    .from(userVotes)
    .innerJoin(
      shows,
      sql`${userVotes.showId} = ${shows.id} OR ${userVotes.setlistId} IN (SELECT id FROM setlists WHERE show_id = ${shows.id})`
    )
    .where(eq(userVotes.userId, userId));

  return {
    followedArtistGenres: topGenres,
    votedArtistIds: votedArtists
      .map((v) => v.artistId)
      .filter(Boolean) as string[],
    userLocation: undefined, // Would get from user profile
  };
}

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const factors = await getRecommendationFactors(user.id);

    // Get artists user already follows
    const followedArtistIds = await db
      .select({ artistId: userFollowsArtists.artistId })
      .from(userFollowsArtists)
      .where(eq(userFollowsArtists.userId, user.id));

    const followedIds = followedArtistIds.map((f) => f.artistId);

    // Build recommendation query
    const recommendations = await db
      .select({
        show: {
          id: shows.id,
          name: shows.name,
          slug: shows.slug,
          date: shows.date,
          ticketUrl: shows.ticketUrl,
        },
        artist: {
          id: artists.id,
          name: artists.name,
          slug: artists.slug,
          imageUrl: artists.imageUrl,
          genres: artists.genres,
        },
        venue: {
          name: venues.name,
          city: venues.city,
          state: venues.state,
        },
        stats: {
          trendingScore: artistStats.trendingScore,
          followerCount: artistStats.followerCount,
        },
        relevanceScore: sql<number>`
          CASE
            -- Genre matching (40 points max)
            WHEN ${artists.genres}::text[] && ARRAY[${factors.followedArtistGenres.map((g) => `'${g}'`).join(',')}]::text[]
            THEN 40
            ELSE 0
          END +
          -- Trending score (30 points max)
          COALESCE(${artistStats.trendingScore} * 30, 0) +
          -- Previously voted artists (20 points)
          CASE
            WHEN ${artists.id} = ANY(ARRAY[${factors.votedArtistIds.map((id) => `'${id}'`).join(',')}]::uuid[])
            THEN 20
            ELSE 0
          END +
          -- Popularity (10 points max)
          LEAST(COALESCE(${artistStats.followerCount}, 0) / 1000, 10)
        `,
      })
      .from(shows)
      .innerJoin(artists, eq(shows.headlinerArtistId, artists.id))
      .leftJoin(venues, eq(shows.venueId, venues.id))
      .leftJoin(artistStats, eq(artists.id, artistStats.artistId))
      .where(
        and(
          gte(shows.date, new Date()),
          followedIds.length > 0
            ? ne(
                artists.id,
                sql`ANY(ARRAY[${followedIds.map((id) => `'${id}'`).join(',')}]::uuid[])`
              )
            : undefined
        )
      )
      .orderBy(desc(sql`relevance_score`))
      .limit(20);

    // Group by relevance categories
    const categorized = {
      genreMatch: recommendations
        .filter((r) =>
          r.artist.genres?.some((g) => factors.followedArtistGenres.includes(g))
        )
        .slice(0, 5),
      trending: recommendations
        .filter((r) => r.stats.trendingScore && r.stats.trendingScore > 0.7)
        .slice(0, 5),
      popular: recommendations
        .sort(
          (a, b) => (b.stats.followerCount || 0) - (a.stats.followerCount || 0)
        )
        .slice(0, 5),
    };

    return NextResponse.json({
      recommendations: categorized,
      factors: {
        topGenres: factors.followedArtistGenres,
        followedArtistCount: followedIds.length,
      },
    });
  } catch (error) {
    console.error('Error getting recommendations:', error);
    return NextResponse.json(
      { error: 'Failed to get recommendations' },
      { status: 500 }
    );
  }
}
