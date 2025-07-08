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
      '/api/trending/shows',
      '/api/trending/artists',
      '/api/trending/venues',
      '/api/trending/live',
    ];

    results.endpoints = {};

    for (const endpoint of endpoints) {
      try {
        const url = `${process.env['NEXT_PUBLIC_WEB_URL'] || 'http://localhost:3001'}${endpoint}?limit=1`;
        const response = await fetch(url);
        results.endpoints[endpoint] = {
          status: response.status,
          ok: response.ok,
        };
      } catch (error) {
        results.endpoints[endpoint] = {
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    }

    return NextResponse.json({
      success: true,
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Trending test error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
