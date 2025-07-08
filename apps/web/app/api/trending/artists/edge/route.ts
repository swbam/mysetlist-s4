import { CACHE_HEADERS } from '@/lib/cache';
import { type NextRequest, NextResponse } from 'next/server';

// Use edge runtime for faster response times
export const runtime = 'edge';

// GET /api/trending/artists/edge
// Edge function version of trending artists API
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Number.parseInt(searchParams.get('limit') || '20');
    const timeframe = searchParams.get('timeframe') || 'week';

    // For edge runtime, we'll fetch from the main API and cache the response
    // In production, this could connect directly to a read replica or edge database
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL}/api/trending/artists?limit=${limit}&timeframe=${timeframe}`,
      {
        next: {
          revalidate: 300, // Cache for 5 minutes
          tags: ['trending-artists'],
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch trending artists');
    }

    const data = await response.json();

    // Return with appropriate cache headers
    return new NextResponse(JSON.stringify(data), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': CACHE_HEADERS.api.public,
        'CDN-Cache-Control': 'public, max-age=300', // CDN caching
      },
    });
  } catch (error) {
    console.error('Edge trending artists API error:', error);

    // Return cached empty response to prevent errors
    return new NextResponse(
      JSON.stringify({
        artists: [],
        fallback: true,
        error: 'Failed to load trending artists',
        message: 'Unable to load artist data at this time',
        total: 0,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=60, stale-while-revalidate=300',
        },
      }
    );
  }
}
