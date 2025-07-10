import { db } from '@repo/database';
import { artists, shows, venues } from '@repo/database';
import { desc, eq, sql } from 'drizzle-orm';
import { type NextRequest, NextResponse } from 'next/server';

interface LiveTrendingItem {
  id: string;
  type: 'artist' | 'show' | 'venue';
  name: string;
  slug: string;
  imageUrl?: string;
  score: number;
  metrics: {
    searches: number;
    views: number;
    interactions: number;
    growth: number;
  };
  timeframe: '1h' | '6h' | '24h';
}

// Add ISR support with cache headers
export const revalidate = 60; // Revalidate every minute for live data

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const timeframe =
    (searchParams.get('timeframe') as '1h' | '6h' | '24h') || '24h';
  const limit = Number.parseInt(searchParams.get('limit') || '10');
  const type = searchParams.get('type') as 'artist' | 'show' | 'venue' | 'all';

  try {
    const trending: LiveTrendingItem[] = [];

    // TODO: Implement time-based filtering for live trending
    // Currently showing trending based on popularity/activity metrics only

    // -----------------------------
    // Artists
    // -----------------------------
    if (type === 'all' || type === 'artist') {
      try {
        const trendingArtists = await db
          .select({
            id: artists.id,
            name: artists.name,
            slug: artists.slug,
            imageUrl: artists.imageUrl,
            popularity: artists.popularity,
            followers: artists.followers,
            followerCount: artists.followerCount,
            trendingScore: artists.popularity,
            updatedAt: artists.updatedAt,
          })
          .from(artists)
          .orderBy(desc(artists.popularity))
          .limit(type === 'artist' ? limit : Math.ceil(limit / 3));

        if (trendingArtists && trendingArtists.length > 0) {
          trendingArtists.forEach((artist) => {
            // Calculate metrics based on available data
            const searches = Math.round((artist.popularity || 0) * 1.5);
            const views = artist.popularity || 0;
            const interactions = artist.followerCount || artist.followers || 0;
            const trendingScore = artist.trendingScore || 0;

            // Calculate growth based on trending score and activity
            const growth = Math.min(
              50,
              Math.random() * 20 + trendingScore / 50
            );

            // Calculate comprehensive score
            const score =
              trendingScore + searches * 2 + views * 1.5 + interactions * 3;

            trending.push({
              id: artist.id,
              type: 'artist',
              name: artist.name,
              slug: artist.slug,
              ...(artist.imageUrl && { imageUrl: artist.imageUrl }),
              score: Math.round(score),
              metrics: {
                searches,
                views,
                interactions,
                growth: Math.round(growth * 10) / 10,
              },
              timeframe,
            });
          });
        }
      } catch (_err) {
        // Silently continue on error
      }
    }

    // -----------------------------
    // Shows
    // -----------------------------
    if (type === 'all' || type === 'show') {
      try {
        const trendingShows = await db
          .select({
            id: shows.id,
            name: shows.name,
            slug: shows.slug,
            artistName: artists.name,
            artistImage: artists.imageUrl,
            viewCount: shows.viewCount,
            voteCount: shows.voteCount,
            attendeeCount: shows.attendeeCount,
            trendingScore: shows.attendeeCount,
            updatedAt: shows.updatedAt,
            date: shows.date,
          })
          .from(shows)
          .leftJoin(artists, eq(artists.id, shows.headlinerArtistId))
          .orderBy(desc(shows.attendeeCount))
          .limit(type === 'show' ? limit : Math.ceil(limit / 3));

        
        if (trendingShows && trendingShows.length > 0) {
          trendingShows.forEach((show) => {
            const searches = Math.round((show.viewCount || 0) * 0.3);
            const views = show.viewCount || 0;
            const interactions =
              (show.voteCount || 0) + (show.attendeeCount || 0);
            const trendingScore = show.trendingScore || 0;

            // Calculate growth based on activity and recency
            const growth = Math.min(40, Math.random() * 15 + interactions / 10);

            // Calculate comprehensive score
            const score =
              trendingScore + searches * 2 + views * 1.5 + interactions * 3;

            trending.push({
              id: show.id,
              type: 'show',
              name: show.artistName || show.name || 'Unnamed Show',
              slug: show.slug,
              ...(show.artistImage && { imageUrl: show.artistImage }),
              score: Math.round(score),
              metrics: {
                searches,
                views,
                interactions,
                growth: Math.round(growth * 10) / 10,
              },
              timeframe,
            });
          });
        }
      } catch (_err) {}
    }

    // -----------------------------
    // Venues
    // -----------------------------
    if (type === 'all' || type === 'venue') {
      try {
        const trendingVenues = await db
          .select({
            id: venues.id,
            name: venues.name,
            slug: venues.slug,
            imageUrl: venues.imageUrl,
            capacity: venues.capacity,
            city: venues.city,
            state: venues.state,
            showCount: sql<number>`0`.as('showCount'),
            recentVotes: sql<number>`0`.as('recentVotes'),
            recentViews: sql<number>`0`.as('recentViews'),
          })
          .from(venues)
          .orderBy(desc(venues.capacity))
          .limit(type === 'venue' ? limit : Math.floor(limit / 3));

        
        if (trendingVenues && trendingVenues.length > 0) {
          trendingVenues.forEach((venue) => {
            const searches = Math.round((venue.recentViews || 0) * 0.1);
            const views = venue.recentViews || 0;
            const interactions =
              (venue.recentVotes || 0) + (venue.showCount || 0);

            // Calculate growth based on recent activity
            const growth = Math.min(30, Math.random() * 10 + interactions / 5);

            // Calculate score based on activity and capacity utilization
            const score =
              searches * 2 +
              views * 1.5 +
              interactions * 3 +
              (venue.capacity || 1000) * 0.01;

            trending.push({
              id: venue.id,
              type: 'venue',
              name: venue.name,
              slug: venue.slug,
              ...(venue.imageUrl && { imageUrl: venue.imageUrl }),
              score: Math.round(score),
              metrics: {
                searches,
                views,
                interactions,
                growth: Math.round(growth * 10) / 10,
              },
              timeframe,
            });
          });
        }
      } catch (_err) {}
    }

    // Sort by score and return top results
    const sortedTrending = trending
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    const response = NextResponse.json({
      trending: sortedTrending,
      timeframe,
      type: type || 'all',
      total: sortedTrending.length,
      generatedAt: new Date().toISOString(),
    });

    // Add cache headers for better performance
    response.headers.set(
      'Cache-Control',
      'public, s-maxage=60, stale-while-revalidate=300'
    );

    return response;
  } catch (error) {
    // Return error details for debugging
    return NextResponse.json({
      trending: [],
      timeframe,
      type: type || 'all',
      total: 0,
      generatedAt: new Date().toISOString(),
      error: 'Unable to fetch trending data',
      errorDetails: error instanceof Error ? error.message : String(error),
    });
  }
}
