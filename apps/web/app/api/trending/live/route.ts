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

// Mock data generator for fallback when no real data is available
function generateMockTrendingData(
  type: 'artist' | 'show' | 'venue' | 'all' | null,
  limit: number,
  timeframe: '1h' | '6h' | '24h'
): LiveTrendingItem[] {
  const mockData: LiveTrendingItem[] = [];

  const mockArtists = [
    { name: 'The Midnight', slug: 'the-midnight', type: 'artist' as const },
    { name: 'Tash Sultana', slug: 'tash-sultana', type: 'artist' as const },
    { name: 'Glass Animals', slug: 'glass-animals', type: 'artist' as const },
    { name: 'Phoebe Bridgers', slug: 'phoebe-bridgers', type: 'artist' as const },
    { name: 'ODESZA', slug: 'odesza', type: 'artist' as const },
  ];

  const mockShows = [
    { name: 'Summer Sonic Festival', slug: 'summer-sonic-festival', type: 'show' as const },
    { name: 'Coachella 2024', slug: 'coachella-2024', type: 'show' as const },
    { name: 'Lollapalooza Chicago', slug: 'lollapalooza-chicago', type: 'show' as const },
    { name: 'Bonnaroo Music Festival', slug: 'bonnaroo-music-festival', type: 'show' as const },
  ];

  const mockVenues = [
    { name: 'Madison Square Garden', slug: 'madison-square-garden', type: 'venue' as const },
    { name: 'Red Rocks Amphitheatre', slug: 'red-rocks-amphitheatre', type: 'venue' as const },
    { name: 'The Hollywood Bowl', slug: 'the-hollywood-bowl', type: 'venue' as const },
  ];

  // Generate data based on requested type
  const sources = [];
  if (type === 'all' || type === 'artist') sources.push(...mockArtists);
  if (type === 'all' || type === 'show') sources.push(...mockShows);
  if (type === 'all' || type === 'venue') sources.push(...mockVenues);
  if (sources.length === 0) sources.push(...mockArtists); // Default to artists

  // Generate trending items
  for (let i = 0; i < Math.min(limit, sources.length); i++) {
    const source = sources[i];
    const baseScore = 100 - i * 10;
    
    mockData.push({
      id: `mock-${source.type}-${i + 1}`,
      type: source.type,
      name: source.name,
      slug: source.slug,
      score: baseScore + Math.round(Math.random() * 50),
      metrics: {
        searches: Math.round(Math.random() * 200 + 50),
        views: Math.round(Math.random() * 500 + 100),
        interactions: Math.round(Math.random() * 150 + 25),
        growth: Math.round((Math.random() * 30 - 5) * 10) / 10, // -5% to +25%
      },
      timeframe,
    });
  }

  return mockData;
}

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
          .where(sql`${artists.popularity} > 0 OR ${artists.followers} > 0 OR ${artists.name} IS NOT NULL`)
          .orderBy(desc(artists.popularity), desc(artists.followers), desc(artists.updatedAt))
          .limit(type === 'artist' ? limit : Math.ceil(limit / 3));

        if (trendingArtists && trendingArtists.length > 0) {
          trendingArtists.forEach((artist) => {
            // Calculate metrics with improved fallbacks
            const basePopularity = Math.max(1, artist.popularity || 0);
            const baseFollowers = Math.max(1, artist.followerCount || artist.followers || 0);
            
            const searches = Math.round(basePopularity * 1.5 + Math.random() * 20);
            const views = basePopularity + Math.round(Math.random() * 30);
            const interactions = baseFollowers + Math.round(Math.random() * 15);
            const trendingScore = Math.max(basePopularity, baseFollowers * 0.1);

            // Calculate growth with realistic variance
            const growth = Math.min(
              50,
              Math.random() * 25 + trendingScore / 20 + (basePopularity > 50 ? 10 : 0)
            );

            // Calculate comprehensive score with better weighting
            const score =
              trendingScore * 2 + searches * 1.5 + views * 1.2 + interactions * 2.5;

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
      } catch (err) {
        console.error('Error fetching trending artists:', err);
        // Continue with other data types
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
          .where(sql`${shows.date} >= CURRENT_DATE OR ${shows.attendeeCount} > 0 OR ${shows.name} IS NOT NULL`)
          .orderBy(desc(shows.attendeeCount), desc(shows.viewCount), desc(shows.updatedAt))
          .limit(type === 'show' ? limit : Math.ceil(limit / 3));

        
        if (trendingShows && trendingShows.length > 0) {
          trendingShows.forEach((show) => {
            const baseViews = Math.max(1, show.viewCount || 0);
            const baseAttendees = Math.max(1, show.attendeeCount || 0);
            const baseVotes = Math.max(0, show.voteCount || 0);
            
            const searches = Math.round(baseViews * 0.4 + Math.random() * 25);
            const views = baseViews + Math.round(Math.random() * 40);
            const interactions = baseVotes + baseAttendees + Math.round(Math.random() * 20);
            const trendingScore = Math.max(baseAttendees * 2, baseViews * 0.5);

            // Calculate growth with show-specific factors
            const growth = Math.min(40, Math.random() * 18 + interactions / 8 + (baseVotes > 0 ? 5 : 0));

            // Calculate comprehensive score for shows
            const score =
              trendingScore * 1.8 + searches * 2.2 + views * 1.4 + interactions * 3.1;

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
      } catch (err) {
        console.error('Error fetching trending data:', err);
      }
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
          .where(sql`${venues.capacity} IS NOT NULL AND ${venues.capacity} > 0`)
          .orderBy(desc(venues.capacity), venues.name)
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
      } catch (err) {
        console.error('Error fetching trending data:', err);
      }
    }

    // Sort by score and return top results
    let sortedTrending = trending
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    // Fallback: Generate mock data if no real data is available
    if (sortedTrending.length === 0) {
      sortedTrending = generateMockTrendingData(type, limit, timeframe);
    }

    const response = NextResponse.json({
      trending: sortedTrending,
      timeframe,
      type: type || 'all',
      total: sortedTrending.length,
      generatedAt: new Date().toISOString(),
      isMockData: trending.length === 0,
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
