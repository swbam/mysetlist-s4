import { CacheWarmer } from '@/lib/cache';
import { MonitoringService } from '@/lib/monitoring';
import { type NextRequest, NextResponse } from 'next/server';

// Verify cron secret to prevent unauthorized access
function verifyCronSecret(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env['CRON_SECRET'];

  if (!cronSecret) {
    console.warn('CRON_SECRET not configured');
    return false;
  }

  return authHeader === `Bearer ${cronSecret}`;
}

export async function GET(request: NextRequest) {
  // Verify this is a legitimate cron request
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const startTime = Date.now();

  try {
    MonitoringService.startMeasurement('cache-warming');

    console.log('🔥 Starting cache warming process...');

    // Warm trending data
    await CacheWarmer.warmTrendingData();
    console.log('✅ Trending data warmed');

    // Warm popular searches
    await CacheWarmer.warmPopularSearches();
    console.log('✅ Popular searches warmed');

    // Warm critical API endpoints
    await warmCriticalEndpoints();
    console.log('✅ Critical endpoints warmed');

    const duration = MonitoringService.endMeasurement('cache-warming');

    MonitoringService.trackMetric({
      name: 'cron.cache_warm.success',
      value: 1,
      tags: {
        duration: duration.toString(),
      },
    });

    console.log(`🚀 Cache warming completed in ${duration}ms`);

    return NextResponse.json({
      success: true,
      duration,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const duration = Date.now() - startTime;

    console.error('❌ Cache warming failed:', error);

    MonitoringService.trackError(error as Error, {
      operation: 'cache-warming',
      duration,
    });

    MonitoringService.trackMetric({
      name: 'cron.cache_warm.failure',
      value: 1,
      tags: {
        error: (error as Error).message,
        duration: duration.toString(),
      },
    });

    return NextResponse.json(
      {
        success: false,
        error: (error as Error).message,
        duration,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

/**
 * Warm critical API endpoints that are frequently accessed
 */
async function warmCriticalEndpoints(): Promise<void> {
  const baseUrl = process.env['NEXT_PUBLIC_APP_URL'] || 'http://localhost:3001';

  const criticalEndpoints = [
    '/api/search/suggestions',
    '/api/artists/trending',
    '/api/shows/trending',
    '/api/venues/popular',
  ];

  await Promise.allSettled(
    criticalEndpoints.map(async (endpoint) => {
      try {
        const response = await fetch(`${baseUrl}${endpoint}`, {
          method: 'GET',
          headers: {
            'User-Agent': 'MySetlist-CacheWarmer/1.0',
          },
        });

        if (response.ok) {
          console.log(`✅ Warmed ${endpoint}`);
        } else {
          console.warn(`⚠️ Failed to warm ${endpoint}: ${response.status}`);
        }
      } catch (error) {
        console.warn(`⚠️ Error warming ${endpoint}:`, error);
      }
    })
  );
}

// Cache warming can also be triggered by HEAD requests for health checks
export async function HEAD(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return new NextResponse(null, { status: 401 });
  }

  return new NextResponse(null, {
    status: 200,
    headers: {
      'Cache-Control': 'no-cache',
    },
  });
}
