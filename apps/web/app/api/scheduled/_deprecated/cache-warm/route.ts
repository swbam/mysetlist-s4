import { type NextRequest, NextResponse } from 'next/server';
import { CacheWarmer } from '~/lib/cache';
import { MonitoringService } from '~/lib/monitoring';

// Verify cron secret to prevent unauthorized access
function verifyCronSecret(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env['CRON_SECRET'];

  if (!cronSecret) {
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

    // Warm trending data
    const cacheWarmer = new CacheWarmer();
    await cacheWarmer.warmTrendingArtists();

    // Warm popular shows
    await cacheWarmer.warmPopularShows();

    // Warm critical API endpoints
    await warmCriticalEndpoints();

    const duration = MonitoringService.endMeasurement('cache-warming');

    MonitoringService.trackMetric({
      name: 'cron.cache_warm.success',
      value: 1,
      tags: {
        duration: duration.toString(),
      },
    });

    return NextResponse.json({
      success: true,
      duration,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const duration = Date.now() - startTime;

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
        } else {
        }
      } catch (_error) {}
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
