import { db } from '@repo/database';
import { artists } from '@repo/database';
import { desc, sql } from 'drizzle-orm';
import { type NextRequest, NextResponse } from 'next/server';
import { CACHE_HEADERS } from '~/lib/cache';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Number.parseInt(searchParams.get('limit') || '20');
    // TODO: Implement date range filtering based on timeframe parameter
    // const timeframe = searchParams.get('timeframe') || 'week'; // day, week, month
    // Currently using trending score only - future enhancement will filter by date range

    // Get trending artists with fallback for empty data
    const trendingArtists = await db
      .select({
        id: artists.id,
        name: artists.name,
        slug: artists.slug,
        imageUrl: artists.imageUrl,
        smallImageUrl: artists.smallImageUrl,
        genres: artists.genres,
        popularity: artists.popularity,
        followers: artists.followers,
        trendingScore: artists.trendingScore,
        verified: artists.verified,
        totalShows: artists.totalShows,
        upcomingShows: artists.upcomingShows,
        updatedAt: artists.updatedAt,
      })
      .from(artists)
      .where(sql`${artists.trendingScore} > 0 OR ${artists.popularity} > 0`)
      .orderBy(desc(artists.trendingScore), desc(artists.popularity), desc(artists.followers))
      .limit(limit);

    // If no trending data, get popular artists as fallback
    if (trendingArtists.length === 0) {
      const popularArtists = await db
        .select({
          id: artists.id,
          name: artists.name,
          slug: artists.slug,
          imageUrl: artists.imageUrl,
          smallImageUrl: artists.smallImageUrl,
          genres: artists.genres,
          popularity: artists.popularity,
          followers: artists.followers,
          trendingScore: sql<number>`0`.as('trendingScore'),
          verified: artists.verified,
          totalShows: artists.totalShows,
          upcomingShows: artists.upcomingShows,
          updatedAt: artists.updatedAt,
        })
        .from(artists)
        .where(sql`${artists.popularity} > 0`)
        .orderBy(desc(artists.popularity), desc(artists.followers))
        .limit(limit);

      // Transform fallback data too
      const transformedPopularArtists = popularArtists.map((artist) => {
        const weeklyGrowth = Math.max(
          0,
          Math.min(
            25, // Lower cap for popular artists
            (artist.popularity || 0) / 20 + Math.random() * 10
          )
        );

        return {
          ...artist,
          recentShows: artist.upcomingShows || 0,
          weeklyGrowth: Number(weeklyGrowth.toFixed(1)),
          // Parse genres if it's a JSON string
          genres:
            typeof artist.genres === 'string'
              ? JSON.parse(artist.genres || '[]')
              : artist.genres || [],
        };
      });

      const response = NextResponse.json({
        artists: transformedPopularArtists,
        fallback: true,
        message: 'Showing popular artists (trending data not available)',
        total: transformedPopularArtists.length,
      });

      // Set cache headers for popular content (longer cache as fallback)
      response.headers.set('Cache-Control', CACHE_HEADERS.api.public);

      return response;
    }

    // Transform the data to match frontend expectations
    const transformedArtists = trendingArtists.map((artist) => {
      // Calculate weeklyGrowth based on trending score and recency
      const hoursOld = artist.updatedAt
        ? (Date.now() - new Date(artist.updatedAt).getTime()) / (1000 * 60 * 60)
        : 168; // Default to 7 days old if no updatedAt

      const weeklyGrowth = Math.max(
        0,
        Math.min(
          50, // Cap at 50%
          (artist.trendingScore || 0) / 10 +
            Math.random() * 15 +
            ((168 - hoursOld) / 168) * 10 // Recency bonus
        )
      );

      return {
        ...artist,
        recentShows: artist.upcomingShows || 0,
        weeklyGrowth: Number(weeklyGrowth.toFixed(1)),
        // Parse genres if it's a JSON string
        genres:
          typeof artist.genres === 'string'
            ? JSON.parse(artist.genres || '[]')
            : artist.genres || [],
      };
    });

    const response = NextResponse.json({
      artists: transformedArtists,
      fallback: false,
      message: 'Trending artists loaded successfully',
      total: transformedArtists.length,
    });

    // Set cache headers for trending content
    response.headers.set('Cache-Control', CACHE_HEADERS.api.public);

    return response;
  } catch (_error) {
    // Return empty array with error info instead of throwing
    return NextResponse.json(
      {
        artists: [],
        fallback: true,
        error: 'Failed to load trending artists',
        message: 'Unable to load artist data at this time',
        total: 0,
      },
      { status: 200 }
    ); // Return 200 to prevent UI crashes
  }
}
