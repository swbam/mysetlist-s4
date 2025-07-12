import { NextResponse } from 'next/server';
import { CacheClient } from '~/lib/cache/redis';
import { createServiceClient } from '~/lib/supabase/server';

// Configure for nodejs runtime
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  services: {
    database: ServiceStatus;
    cache: ServiceStatus;
    edge: ServiceStatus;
  };
  metrics: {
    responseTime: number;
    uptime: number;
    memoryUsage?: number;
  };
}

interface ServiceStatus {
  status: 'up' | 'down' | 'degraded';
  latency?: number;
  error?: string;
}

// Track uptime
const startTime = Date.now();

export async function GET() {
  const checkStart = Date.now();
  const result: HealthCheckResult = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      database: { status: 'down' },
      cache: { status: 'down' },
      edge: { status: 'up' },
    },
    metrics: {
      responseTime: 0,
      uptime: Date.now() - startTime,
    },
  };

  // Check database
  try {
    const dbStart = Date.now();
    const supabase = createServiceClient();
    const { error } = await supabase
      .from('artists')
      .select('id')
      .limit(1)
      .single();

    if (error) {
      result.services.database = {
        status: 'down',
        error: error.message,
      };
    } else {
      result.services.database = {
        status: 'up',
        latency: Date.now() - dbStart,
      };
    }
  } catch (error) {
    result.services.database = {
      status: 'down',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }

  // Check cache
  try {
    const cacheStart = Date.now();
    const cache = CacheClient.getInstance();
    const testKey = 'health:check';
    const testValue = Date.now().toString();

    await cache.set(testKey, testValue, { ex: 10 });
    const retrieved = await cache.get(testKey);

    if (retrieved === testValue) {
      result.services.cache = {
        status: 'up',
        latency: Date.now() - cacheStart,
      };
    } else {
      result.services.cache = {
        status: 'degraded',
        error: 'Cache read/write mismatch',
      };
    }
  } catch (error) {
    result.services.cache = {
      status: 'down',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }

  // Determine overall health
  const statuses = Object.values(result.services).map((s) => s.status);
  if (statuses.every((s) => s === 'up')) {
    result.status = 'healthy';
  } else if (statuses.some((s) => s === 'up')) {
    result.status = 'degraded';
  } else {
    result.status = 'unhealthy';
  }

  // Add final metrics
  result.metrics.responseTime = Date.now() - checkStart;

  // Return appropriate status code
  const statusCode =
    result.status === 'healthy'
      ? 200
      : result.status === 'degraded'
        ? 200
        : 503;

  const response = NextResponse.json(result, { status: statusCode });

  // Add headers
  response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  response.headers.set('X-Edge-Runtime', 'true');
  response.headers.set('X-Health-Status', result.status);

  return response;
}

// Detailed health check endpoint
export async function POST() {
  const detailedCheck = {
    timestamp: new Date().toISOString(),
    environment: {
      runtime: 'edge',
      region: process.env['VERCEL_REGION'] || 'unknown',
      deployment: process.env['VERCEL_DEPLOYMENT_ID'] || 'local',
    },
    checks: [] as any[],
  };

  // Database connection pool check
  try {
    const supabase = createServiceClient();
    const start = Date.now();

    // Test various operations
    const checks = await Promise.allSettled([
      supabase.from('artists').select('count').limit(1),
      supabase.from('shows').select('count').limit(1),
      supabase.from('venues').select('count').limit(1),
    ]);

    detailedCheck.checks.push({
      name: 'database_operations',
      status: checks.every((c) => c.status === 'fulfilled') ? 'pass' : 'fail',
      duration: Date.now() - start,
      details: {
        artists: checks[0].status,
        shows: checks[1].status,
        venues: checks[2].status,
      },
    });
  } catch (error) {
    detailedCheck.checks.push({
      name: 'database_operations',
      status: 'fail',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }

  // Cache operations check
  try {
    const cache = CacheClient.getInstance();
    const start = Date.now();

    // Test various cache operations
    const testResults = [];

    // SET operation
    const setResult = await cache.set('health:detailed', 'test', { ex: 60 });
    testResults.push({ operation: 'SET', success: setResult });

    // GET operation
    const getResult = await cache.get('health:detailed');
    testResults.push({ operation: 'GET', success: getResult === 'test' });

    // TTL operation
    const ttlResult = await cache.ttl('health:detailed');
    testResults.push({ operation: 'TTL', success: ttlResult > 0 });

    // DEL operation
    const delResult = await cache.del('health:detailed');
    testResults.push({ operation: 'DEL', success: delResult > 0 });

    detailedCheck.checks.push({
      name: 'cache_operations',
      status: testResults.every((r) => r.success) ? 'pass' : 'fail',
      duration: Date.now() - start,
      details: testResults,
    });
  } catch (error) {
    detailedCheck.checks.push({
      name: 'cache_operations',
      status: 'fail',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }

  // API endpoint checks
  const endpoints = [
    '/api/trending',
    '/api/artists',
    '/api/shows',
    '/api/venues',
  ];

  for (const endpoint of endpoints) {
    try {
      const start = Date.now();
      const response = await fetch(
        `${process.env['NEXT_PUBLIC_APP_URL']}${endpoint}`,
        {
          method: 'GET',
          signal: AbortSignal.timeout(5000), // 5 second timeout
        }
      );

      detailedCheck.checks.push({
        name: `endpoint_${endpoint}`,
        status: response.ok ? 'pass' : 'fail',
        statusCode: response.status,
        duration: Date.now() - start,
      });
    } catch (error) {
      detailedCheck.checks.push({
        name: `endpoint_${endpoint}`,
        status: 'fail',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // Overall status
  const allPassed = detailedCheck.checks.every((c) => c.status === 'pass');
  const overallStatus = allPassed ? 'healthy' : 'unhealthy';

  return NextResponse.json(
    {
      ...detailedCheck,
      status: overallStatus,
    },
    {
      status: allPassed ? 200 : 503,
    }
  );
}
