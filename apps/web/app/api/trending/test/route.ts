import { db } from '@repo/database';
import { artists, shows, venues } from '@repo/database';
import { sql } from 'drizzle-orm';
import { NextResponse } from 'next/server';

// Test endpoint to verify trending data availability
export async function GET() {
  try {
    const results: any = {};

    // Test artists with trending scores
    const artistsWithScores = await db
      .select({
        count: sql<number>`COUNT(*)`,
        avgScore: sql<number>`AVG(${artists.trendingScore})`,
        maxScore: sql<number>`MAX(${artists.trendingScore})`,
      })
      .from(artists)
      .where(sql`${artists.trendingScore} > 0`);

    results.artists = {
      withTrendingScore: artistsWithScores[0]?.count || 0,
      averageScore: artistsWithScores[0]?.avgScore || 0,
      maxScore: artistsWithScores[0]?.maxScore || 0,
    };

    // Test shows with trending scores
    const showsWithScores = await db
      .select({
        count: sql<number>`COUNT(*)`,
        avgScore: sql<number>`AVG(${shows.trendingScore})`,
        maxScore: sql<number>`MAX(${shows.trendingScore})`,
        withVotes: sql<number>`COUNT(CASE WHEN ${shows.voteCount} > 0 THEN 1 END)`,
      })
      .from(shows)
      .where(sql`${shows.trendingScore} > 0`);

    results.shows = {
      withTrendingScore: showsWithScores[0]?.count || 0,
      averageScore: showsWithScores[0]?.avgScore || 0,
      maxScore: showsWithScores[0]?.maxScore || 0,
      withVotes: showsWithScores[0]?.withVotes || 0,
    };

    // Test venues (count shows per venue)
    const venueActivity = await db
      .select({
        venueCount: sql<number>`COUNT(DISTINCT ${venues.id})`,
        avgShowsPerVenue: sql<number>`AVG(show_count)`,
      })
      .from(
        db
          .select({
            venueId: venues.id,
            showCount: sql<number>`COUNT(${shows.id})`.as('show_count'),
          })
          .from(venues)
          .leftJoin(shows, sql`${shows.venueId} = ${venues.id}`)
          .groupBy(venues.id)
          .as('venue_shows')
      );

    results.venues = {
      totalVenues: venueActivity[0]?.venueCount || 0,
      avgShowsPerVenue: venueActivity[0]?.avgShowsPerVenue || 0,
    };

    // Test API endpoints
    const endpoints = [
      { path: '/api/trending', name: 'Main Trending' },
      { path: '/api/trending/artists', name: 'Trending Artists' },
      { path: '/api/trending/shows', name: 'Trending Shows' },
      { path: '/api/trending/venues', name: 'Trending Venues' },
      { path: '/api/trending/live', name: 'Live Trending' },
      {
        path: '/api/trending/live?timeframe=1h&type=artist',
        name: 'Live Artists (1h)',
      },
      { path: '/api/activity/recent', name: 'Recent Activity' },
    ];

    results.endpoints = {};

    for (const endpoint of endpoints) {
      const startTime = Date.now();

      try {
        const baseUrl =
          process.env['NEXT_PUBLIC_APP_URL'] || 'http://localhost:3000';
        const url = `${baseUrl}${endpoint.path}${endpoint.path.includes('?') ? '&' : '?'}limit=1`;

        const response = await fetch(url, {
          headers: {
            Accept: 'application/json',
            'Cache-Control': 'no-cache',
          },
        });

        const responseTime = Date.now() - startTime;
        let data: any = null;

        if (response.ok) {
          data = await response.json();
        }

        results.endpoints[endpoint.name] = {
          status: response.status,
          ok: response.ok,
          responseTime,
          hasData: data
            ? (data.artists?.length ||
                data.shows?.length ||
                data.venues?.length ||
                data.trending?.length ||
                data.activities?.length ||
                0) > 0
            : false,
          fallback: data?.fallback || false,
          error: data?.error || null,
        };
      } catch (error) {
        const responseTime = Date.now() - startTime;
        results.endpoints[endpoint.name] = {
          status: 'error',
          ok: false,
          responseTime,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    }

    // Calculate summary stats
    const endpointResults = Object.values(results.endpoints) as Array<{
      ok: boolean;
      responseTime: number;
      hasData?: boolean;
      fallback?: boolean;
    }>;
    const workingEndpoints = endpointResults.filter((r) => r.ok).length;
    const totalEndpoints = endpointResults.length;
    const avgResponseTime =
      endpointResults.reduce((sum, r) => sum + r.responseTime, 0) /
      totalEndpoints;

    const summary = {
      status: workingEndpoints === totalEndpoints ? 'healthy' : 'issues',
      workingEndpoints,
      totalEndpoints,
      avgResponseTime: Math.round(avgResponseTime),
      hasData: endpointResults.some((r) => r.hasData),
      usingFallback: endpointResults.some((r) => r.fallback),
    };

    return NextResponse.json({
      success: true,
      summary,
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
