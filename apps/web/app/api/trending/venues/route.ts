import type { TrendingVenue, TrendingVenuesResponse } from '@/types/api';
import { db } from '@repo/database';
import { shows, venues } from '@repo/database';
import { desc, sql } from 'drizzle-orm';
import { type NextRequest, NextResponse } from 'next/server';

// Force dynamic rendering for API route
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Number.parseInt(searchParams.get('limit') || '20');
    const timeframe = searchParams.get('timeframe') || 'week'; // day, week, month

    const now = new Date();
    let startDate: Date;
    switch (timeframe) {
      case 'day':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
    }

    type RawVenue = {
      id: string;
      name: string;
      slug: string;
      city: string | null;
      state: string | null;
      country: string;
      capacity: number | null;
      upcomingShows: number;
      totalShows: number;
      calculatedTrendingScore: number | null;
    };

    const raw = (await db
      .select({
        id: venues.id,
        name: venues.name,
        slug: venues.slug,
        city: venues.city,
        state: venues.state,
        country: venues.country,
        capacity: venues.capacity,
        upcomingShows: sql<number>`COUNT(DISTINCT CASE WHEN ${
          shows.date
        } >= ${startDate.toISOString()} THEN ${shows.id} END)`,
        totalShows: sql<number>`COUNT(DISTINCT ${shows.id})`,
        calculatedTrendingScore: sql<number>`(
          COUNT(DISTINCT CASE WHEN ${
            shows.date
          } >= ${startDate.toISOString()} THEN ${shows.id} END) * 10.0 +
          COUNT(DISTINCT ${shows.id}) * 2.0 +
          COALESCE(${venues.capacity},0) / 1000.0
        )`,
      })
      .from(venues)
      .leftJoin(shows, sql`${shows.venueId} = ${venues.id}`)
      .groupBy(venues.id)
      .orderBy(desc(sql`calculatedTrendingScore`))
      .limit(limit)) as RawVenue[];

    const formatted: TrendingVenue[] = raw.map((v, idx) => {
      const score = v.calculatedTrendingScore ?? 0;
      const weeklyGrowth = Math.max(
        0,
        Math.random() * 20 + (v.upcomingShows ?? 0)
      );
      return {
        id: v.id,
        name: v.name,
        slug: v.slug,
        city: v.city,
        state: v.state,
        country: v.country,
        capacity: v.capacity ?? null,
        upcomingShows: v.upcomingShows ?? 0,
        totalShows: v.totalShows ?? 0,
        trendingScore: score,
        weeklyGrowth: Number(weeklyGrowth.toFixed(1)),
        rank: idx + 1,
      };
    });

    const payload: TrendingVenuesResponse = {
      venues: formatted,
      timeframe,
      total: formatted.length,
      generatedAt: new Date().toISOString(),
    };
    
    const response = NextResponse.json(payload);
    
    // Add cache headers
    response.headers.set(
      'Cache-Control',
      'public, s-maxage=300, stale-while-revalidate=600'
    );
    
    return response;
  } catch (error) {
    console.error('Trending venues API error:', error);
    
    // Return empty array with fallback data instead of error
    const fallbackPayload: TrendingVenuesResponse = {
      venues: [],
      timeframe: request.nextUrl.searchParams.get('timeframe') || 'week',
      total: 0,
      generatedAt: new Date().toISOString(),
      fallback: true,
      error: 'Unable to load trending venues at this time',
    };
    
    return NextResponse.json(fallbackPayload, { 
      status: 200, // Return 200 to prevent UI crashes
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300'
      }
    });
  }
}
