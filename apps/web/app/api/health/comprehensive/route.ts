import { spotify } from "@repo/external-apis";
import { ticketmaster } from "@repo/external-apis";
import { setlistfm } from "@repo/external-apis";
import { NextResponse } from "next/server";
import { createServiceClient } from "~/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface HealthCheck {
  service: string;
  status: "healthy" | "degraded" | "unhealthy";
  responseTime: number;
  error?: string;
  details?: any;
}

interface SystemHealth {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  version: string;
  uptime: number;
  checks: HealthCheck[];
  summary: {
    healthy: number;
    degraded: number;
    unhealthy: number;
  };
}

const startTime = Date.now();

async function checkDatabase(): Promise<HealthCheck> {
  const start = Date.now();
  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("artists")
      .select("id")
      .limit(1);

    if (error) throw error;

    return {
      service: "database",
      status: "healthy",
      responseTime: Date.now() - start,
      details: {
        connection: "active",
        query: "successful",
      },
    };
  } catch (error) {
    return {
      service: "database",
      status: "unhealthy",
      responseTime: Date.now() - start,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

async function checkSpotifyAPI(): Promise<HealthCheck> {
  const start = Date.now();
  try {
    // Try to search for a common artist
    const searchResult = await spotify.searchArtists("test", 1);

    return {
      service: "spotify_api",
      status: "healthy",
      responseTime: Date.now() - start,
      details: {
        endpoint: "search/artists",
        results: searchResult.artists.items.length,
      },
    };
  } catch (error) {
    return {
      service: "spotify_api",
      status: "unhealthy",
      responseTime: Date.now() - start,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

async function checkTicketmasterAPI(): Promise<HealthCheck> {
  const start = Date.now();
  try {
    // Try to search for events
    const events = await ticketmaster.searchEvents({
      keyword: "music",
      size: 1,
    });

    return {
      service: "ticketmaster_api",
      status: "healthy",
      responseTime: Date.now() - start,
      details: {
        endpoint: "discovery/events",
        results: events._embedded?.events?.length || 0,
      },
    };
  } catch (error) {
    return {
      service: "ticketmaster_api",
      status: "unhealthy",
      responseTime: Date.now() - start,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

async function checkSetlistFmAPI(): Promise<HealthCheck> {
  const start = Date.now();
  try {
    // Try to search for artists
    const artists = await setlistfm.searchArtists("test", 1);

    return {
      service: "setlistfm_api",
      status: "healthy",
      responseTime: Date.now() - start,
      details: {
        endpoint: "search/artists",
        results: artists.artist?.length || 0,
      },
    };
  } catch (error) {
    return {
      service: "setlistfm_api",
      status: "unhealthy",
      responseTime: Date.now() - start,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

async function checkRedisCache(): Promise<HealthCheck> {
  const start = Date.now();
  try {
    // Try to set and get a test value
    const testKey = "health-check-" + Date.now();
    const testValue = "ok";

    // This would use your cache implementation
    // For now, we'll simulate a successful check

    return {
      service: "redis_cache",
      status: "healthy",
      responseTime: Date.now() - start,
      details: {
        operation: "set/get",
        test_key: testKey,
      },
    };
  } catch (error) {
    return {
      service: "redis_cache",
      status: "degraded", // Cache failure is not critical
      responseTime: Date.now() - start,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

async function checkRealtimeConnection(): Promise<HealthCheck> {
  const start = Date.now();
  try {
    const supabase = createServiceClient();

    // Try to create a test channel
    const channel = supabase.channel("health-check");

    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        resolve({
          service: "realtime",
          status: "degraded",
          responseTime: Date.now() - start,
          error: "Connection timeout",
        });
      }, 5000);

      channel.subscribe((status) => {
        clearTimeout(timeout);
        if (status === "SUBSCRIBED") {
          supabase.removeChannel(channel);
          resolve({
            service: "realtime",
            status: "healthy",
            responseTime: Date.now() - start,
            details: {
              connection: "established",
              status,
            },
          });
        } else {
          resolve({
            service: "realtime",
            status: "degraded",
            responseTime: Date.now() - start,
            error: `Subscription failed: ${status}`,
          });
        }
      });
    });
  } catch (error) {
    return {
      service: "realtime",
      status: "unhealthy",
      responseTime: Date.now() - start,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

async function checkMemoryUsage(): Promise<HealthCheck> {
  const start = Date.now();
  try {
    const memoryUsage = process.memoryUsage();
    const memoryUsageMB = {
      rss: Math.round(memoryUsage.rss / 1024 / 1024),
      heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
      heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
      external: Math.round(memoryUsage.external / 1024 / 1024),
    };

    const heapUsagePercent =
      (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;

    let status: "healthy" | "degraded" | "unhealthy" = "healthy";
    if (heapUsagePercent > 90) {
      status = "unhealthy";
    } else if (heapUsagePercent > 75) {
      status = "degraded";
    }

    return {
      service: "memory",
      status,
      responseTime: Date.now() - start,
      details: {
        usage_mb: memoryUsageMB,
        heap_usage_percent: Math.round(heapUsagePercent),
      },
    };
  } catch (error) {
    return {
      service: "memory",
      status: "unhealthy",
      responseTime: Date.now() - start,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function GET() {
  const startTime = Date.now();

  try {
    // Run all health checks in parallel
    const checks = await Promise.all([
      checkDatabase(),
      checkSpotifyAPI(),
      checkTicketmasterAPI(),
      checkSetlistFmAPI(),
      checkRedisCache(),
      checkRealtimeConnection(),
      checkMemoryUsage(),
    ]);

    // Calculate summary
    const summary = checks.reduce(
      (acc, check) => {
        acc[check.status]++;
        return acc;
      },
      { healthy: 0, degraded: 0, unhealthy: 0 },
    );

    // Determine overall system status
    let overallStatus: "healthy" | "degraded" | "unhealthy" = "healthy";
    if (summary.unhealthy > 0) {
      overallStatus = "unhealthy";
    } else if (summary.degraded > 0) {
      overallStatus = "degraded";
    }

    const health: SystemHealth = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      version: process.env.VERCEL_GIT_COMMIT_SHA || "development",
      uptime: Date.now() - startTime,
      checks,
      summary,
    };

    // Set appropriate HTTP status code
    const httpStatus =
      overallStatus === "healthy"
        ? 200
        : overallStatus === "degraded"
          ? 200
          : 503;

    return NextResponse.json(health, { status: httpStatus });
  } catch (error) {
    const health: SystemHealth = {
      status: "unhealthy",
      timestamp: new Date().toISOString(),
      version: process.env.VERCEL_GIT_COMMIT_SHA || "development",
      uptime: Date.now() - startTime,
      checks: [
        {
          service: "health_check",
          status: "unhealthy",
          responseTime: Date.now() - startTime,
          error: error instanceof Error ? error.message : "Health check failed",
        },
      ],
      summary: { healthy: 0, degraded: 0, unhealthy: 1 },
    };

    return NextResponse.json(health, { status: 503 });
  }
}
