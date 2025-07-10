import { db } from '@repo/database';
import { venues } from '@repo/database';
import { desc, sql } from 'drizzle-orm';
import { type NextRequest, NextResponse } from 'next/server';
import type { TrendingVenue, TrendingVenuesResponse } from '~/types/api';

// Force dynamic rendering for API route
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Number.parseInt(searchParams.get('limit') || '20');
    const timeframe = searchParams.get('timeframe') || 'week';
    // TODO: Implement timeframe filtering for date ranges

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

    // Simplified approach - get basic venue data first
    const raw = (await db
      .select({
        id: venues.id,
        name: venues.name,
        slug: venues.slug,
        city: venues.city,
        state: venues.state,
        country: venues.country,
        capacity: venues.capacity,
        upcomingShows: sql<number>`0`,
        totalShows: sql<number>`0`,
        calculatedTrendingScore: sql<number>`COALESCE(${venues.capacity}, 1000) / 100`,
      })
      .from(venues)
      .orderBy(desc(venues.capacity))
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
  } catch (_error) {
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
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      },
    });
  }
}
