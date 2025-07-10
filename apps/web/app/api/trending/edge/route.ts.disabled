import { type NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

// Configure edge runtime
export const runtime = 'edge';
export const dynamic = 'force-dynamic';
export const revalidate = 300; // 5 minutes

// Edge-optimized response caching
const CACHE_KEY_PREFIX = 'trending:';
const CACHE_TTL = 300; // 5 minutes

interface TrendingResponse {
  period: string;
  limit: number;
  type: string;
  data: any;
  timestamp: string;
  cached?: boolean;
}

// Lightweight trending query optimized for edge
async function getTrendingData(
  period: string,
  limit: number,
  type: 'shows' | 'artists' | 'combined'
) {
  const supabase = await createServiceClient();
  
  // Determine time window based on period
  const hoursMap = {
    day: 24,
    week: 168,
    month: 720,
  };
  
  const hours = hoursMap[period as keyof typeof hoursMap] || 168;
  const cutoffDate = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

  // Parallel data fetching with optimized queries
  const promises = [];

  if (type === 'shows' || type === 'combined') {
    promises.push(
      supabase
        .from('shows')
        .select(`
          id,
          slug,
          name,
          date,
          trending_score,
          vote_count,
          attendee_count,
          artists:shows_headliner_artist_id_fkey!inner (
            name,
            slug,
            image_url
          ),
          venues!inner (
            name,
            city,
            state
          )
        `)
        .gt('trending_score', 0)
        .gte('created_at', cutoffDate)
        .order('trending_score', { ascending: false })
        .limit(limit)
    );
  }

  if (type === 'artists' || type === 'combined') {
    promises.push(
      supabase
        .from('artists')
        .select(`
          id,
          name,
          slug,
          image_url,
          trending_score,
          follower_count
        `)
        .gt('trending_score', 0)
        .gte('updated_at', cutoffDate)
        .order('trending_score', { ascending: false })
        .limit(limit)
    );
  }

  const results = await Promise.all(promises);
  
  let response: any = {};
  
  if (type === 'shows') {
    response = results[0].data || [];
  } else if (type === 'artists') {
    response = results[0].data || [];
  } else {
    response = {
      shows: results[0]?.data || [],
      artists: results[1]?.data || [],
      combined: [...(results[0]?.data || []), ...(results[1]?.data || [])]
        .sort((a, b) => (b.trending_score || 0) - (a.trending_score || 0))
        .slice(0, limit)
    };
  }

  return response;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const period = searchParams.get('period') || 'week';
    const limit = Math.min(Number.parseInt(searchParams.get('limit') || '20'), 100);
    const type = (searchParams.get('type') || 'combined') as 'shows' | 'artists' | 'combined';

    // Validate inputs
    if (!['day', 'week', 'month'].includes(period)) {
      return NextResponse.json(
        { error: 'Invalid period. Use: day, week, or month' },
        { status: 400 }
      );
    }

    // Get data with edge-optimized query
    const data = await getTrendingData(period, limit, type);

    const response: TrendingResponse = {
      period,
      limit,
      type,
      data,
      timestamp: new Date().toISOString(),
    };

    const jsonResponse = NextResponse.json(response);

    // Set cache headers for CDN
    jsonResponse.headers.set(
      'Cache-Control',
      'public, s-maxage=300, stale-while-revalidate=600'
    );
    jsonResponse.headers.set('X-Edge-Runtime', 'true');
    jsonResponse.headers.set('X-Response-Time', `${Date.now() - request.headers.get('x-request-start') || Date.now()}ms`);

    return jsonResponse;
  } catch (error) {
    console.error('Edge trending error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch trending content' },
      { status: 500 }
    );
  }
}