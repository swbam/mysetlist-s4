import {
  type TrendingConfig,
  getDailyTrending,
  getMonthlyTrending,
  getTrendingContent,
  getWeeklyTrending,
} from '@/lib/trending';
import { type NextRequest, NextResponse } from 'next/server';

// Force dynamic rendering for API route
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const period = searchParams.get('period') || 'week';
    const limit = Number.parseInt(searchParams.get('limit') || '20');
    const type = searchParams.get('type') as
      | 'shows'
      | 'artists'
      | 'combined'
      | null;

    // Custom config if provided
    const customConfig = searchParams.get('config');
    let config: TrendingConfig | undefined;

    if (customConfig) {
      try {
        config = JSON.parse(customConfig);
      } catch (e) {
        return NextResponse.json(
          { error: 'Invalid config parameter' },
          { status: 400 }
        );
      }
    }

    let data;

    switch (period) {
      case 'day':
        data = await getDailyTrending(limit);
        break;
      case 'week':
        data = await getWeeklyTrending(limit);
        break;
      case 'month':
        data = await getMonthlyTrending(limit);
        break;
      case 'custom':
        if (!config) {
          return NextResponse.json(
            { error: 'Custom period requires config parameter' },
            { status: 400 }
          );
        }
        data = await getTrendingContent(config);
        break;
      default:
        return NextResponse.json(
          { error: 'Invalid period. Use: day, week, month, or custom' },
          { status: 400 }
        );
    }

    // Filter by type if specified
    let response;
    if (type && type !== 'combined') {
      response = data[type];
    } else if (type === 'combined' || !type) {
      response = data.combined;
    } else {
      response = data;
    }

    const jsonResponse = NextResponse.json({
      period,
      limit,
      type: type || 'combined',
      data: response,
      timestamp: new Date().toISOString(),
    });

    // Add cache headers
    jsonResponse.headers.set(
      'Cache-Control',
      'public, s-maxage=300, stale-while-revalidate=600'
    );

    return jsonResponse;
  } catch (error) {
    console.error('Error fetching trending content:', error);
    return NextResponse.json(
      { error: 'Failed to fetch trending content' },
      { status: 500 }
    );
  }
}
