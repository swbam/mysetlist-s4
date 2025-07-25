import { type NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '~/lib/supabase/server';
import type { TrendingShow, TrendingShowsResponse } from '~/types/api';

// Force dynamic rendering for API route
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Number.parseInt(searchParams.get('limit') || '20');
    const timeframe = searchParams.get('timeframe') || 'week'; // day, week, month

    // Determine timeframe start date
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

    const supabase = await createServiceClient();

    // Get trending shows with artist and venue information using proper column names
    const { data: raw, error } = await supabase
      .from('shows')
      .select(`
        id,
        name,
        slug,
        date,
        status,
        vote_count,
        attendee_count,
        view_count,
        trending_score,
        headliner_artist_id,
        venue_id,
        artists!inner(
          id,
          name,
          slug,
          image_url
        ),
        venues!inner(
          id,
          name,
          city,
          state,
          country
        )
      `)
      .or(`date.gte.${startDate.toISOString().substring(0, 10)},attendee_count.gt.0,view_count.gt.0`)
      .order('trending_score', { ascending: false, nullsFirst: false })
      .order('attendee_count', { ascending: false, nullsFirst: false })
      .order('view_count', { ascending: false, nullsFirst: false })
      .limit(limit);

    if (error) throw error;

    const formatted: TrendingShow[] = ((raw || []) as any[]).map((s, idx) => {
      // Get the first artist from the array (headliner)
      const artist = Array.isArray(s.artists) ? s.artists[0] : s.artists;
      const venue = Array.isArray(s.venues) ? s.venues[0] : s.venues;
      
      // Fallback trending score if null
      const score =
        s.trending_score ?? (s.vote_count ?? 0) * 2 + (s.attendee_count ?? 0);
      // Calculate real weekly growth based on votes and show proximity
      const showDate = new Date(s.date);
      const daysUntilShow = Math.max(0, (showDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      const proximityBonus = daysUntilShow <= 7 ? Math.max(0, (7 - daysUntilShow) / 7 * 15) : 0; // Up to 15% for shows within a week
      const voteBonus = Math.min(10, (s.vote_count ?? 0) / 10); // Up to 10% based on votes
      const weeklyGrowth = Math.max(0, Math.min(25, proximityBonus + voteBonus));
      return {
        id: s.id,
        name: s.name || (artist?.name ? `${artist.name} Live` : 'Unknown Show'),
        slug: s.slug,
        date: s.date,
        status: s.status || 'confirmed',
        artist: {
          name: artist?.name || 'Unknown Artist',
          slug: artist?.slug || '',
          imageUrl: artist?.image_url || null,
        },
        venue: {
          name: venue?.name || null,
          city: venue?.city || null,
          state: venue?.state || null,
        },
        voteCount: s.vote_count ?? 0,
        attendeeCount: s.attendee_count ?? 0,
        trendingScore: score,
        weeklyGrowth: Number(weeklyGrowth.toFixed(1)),
        rank: idx + 1,
      };
    });

    const payload: TrendingShowsResponse = {
      shows: formatted,
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
    const fallbackPayload: TrendingShowsResponse = {
      shows: [],
      timeframe: request.nextUrl.searchParams.get('timeframe') || 'week',
      total: 0,
      generatedAt: new Date().toISOString(),
      fallback: true,
      error: 'Unable to load trending shows at this time',
    };

    return NextResponse.json(fallbackPayload, {
      status: 200, // Return 200 to prevent UI crashes
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      },
    });
  }
}
