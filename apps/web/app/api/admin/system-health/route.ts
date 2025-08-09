import { type NextRequest, NextResponse } from "next/server";
<<<<<<< HEAD
import { createClient } from "~/lib/api/supabase/server";
=======
import { createServiceClient } from "~/lib/supabase/server";
>>>>>>> fccdd438ab7273b15f8870d2cd1c08442bb2d530

interface HealthCheck {
  service: string;
  status: "healthy" | "degraded" | "down";
  responseTime: number;
  uptime?: number;
  lastCheck: Date;
  metadata?: any;
}

async function checkDatabaseHealth(supabase: any): Promise<HealthCheck> {
  const startTime = Date.now();

  try {
    await supabase.from("users").select("id").limit(1);
    const responseTime = Date.now() - startTime;

    return {
      service: "Database",
      status:
        responseTime < 100
          ? "healthy"
          : responseTime < 500
            ? "degraded"
            : "down",
      responseTime,
      uptime: 99.9,
      lastCheck: new Date(),
    };
  } catch (error) {
    return {
      service: "Database",
      status: "down",
      responseTime: Date.now() - startTime,
      lastCheck: new Date(),
      metadata: {
        error: error instanceof Error ? error.message : "Unknown error",
      },
    };
  }
}

async function checkExternalAPIs(): Promise<HealthCheck[]> {
  const checks: HealthCheck[] = [];

  // Spotify API check
  const spotifyStart = Date.now();
  try {
    const response = await fetch(
      "https://api.spotify.com/v1/browse/featured-playlists?limit=1",
      {
        headers: {
          Authorization: `Bearer ${process.env["SPOTIFY_ACCESS_TOKEN"] || "dummy"}`,
        },
      },
    );

    const spotifyTime = Date.now() - spotifyStart;
    checks.push({
      service: "Spotify API",
      status: response.ok
        ? spotifyTime < 1000
          ? "healthy"
          : "degraded"
        : "down",
      responseTime: spotifyTime,
      lastCheck: new Date(),
      metadata: { statusCode: response.status },
    });
  } catch (error) {
    checks.push({
      service: "Spotify API",
      status: "down",
      responseTime: Date.now() - spotifyStart,
      lastCheck: new Date(),
      metadata: {
        error: error instanceof Error ? error.message : "Unknown error",
      },
    });
  }

  // Ticketmaster API check
  const tmStart = Date.now();
  try {
    const response = await fetch(
      `https://app.ticketmaster.com/discovery/v2/events.json?size=1&apikey=${process.env["TICKETMASTER_API_KEY"] || "dummy"}`,
    );

    const tmTime = Date.now() - tmStart;
    checks.push({
      service: "Ticketmaster API",
      status: response.ok ? (tmTime < 1000 ? "healthy" : "degraded") : "down",
      responseTime: tmTime,
      lastCheck: new Date(),
      metadata: { statusCode: response.status },
    });
  } catch (error) {
    checks.push({
      service: "Ticketmaster API",
      status: "down",
      responseTime: Date.now() - tmStart,
      lastCheck: new Date(),
      metadata: {
        error: error instanceof Error ? error.message : "Unknown error",
      },
    });
  }

  return checks;
}

async function checkAuthService(supabase: any): Promise<HealthCheck> {
  const startTime = Date.now();

  try {
    // Try to get current user (should work even if no user is authenticated)
    await supabase.auth.getUser();
    const responseTime = Date.now() - startTime;

    return {
      service: "Authentication",
      status: responseTime < 200 ? "healthy" : "degraded",
      responseTime,
      uptime: 100,
      lastCheck: new Date(),
    };
  } catch (error) {
    return {
      service: "Authentication",
      status: "down",
      responseTime: Date.now() - startTime,
      lastCheck: new Date(),
      metadata: {
        error: error instanceof Error ? error.message : "Unknown error",
      },
    };
  }
}

async function getSystemMetrics() {
  // TODO: Integrate with real monitoring tools (CloudWatch, Datadog, New Relic, etc.)
  // For now, return placeholder values until real monitoring is implemented
  return {
    cpuUsage: 45, // Placeholder - integrate with real CPU monitoring
    memoryUsage: 60, // Placeholder - integrate with real memory monitoring
    diskUsage: 25, // Placeholder - integrate with real disk monitoring
    apiResponseTime: 150, // Placeholder - integrate with real latency monitoring
    activeConnections: 35, // Placeholder - integrate with real connection monitoring
    requestsPerMinute: 750, // Placeholder - integrate with real request monitoring
    errorRate: "0.012", // Placeholder - integrate with real error monitoring
  };
}

export async function GET(_request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check admin authorization
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: userData } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (
      !userData ||
      (userData.role !== "admin" && userData.role !== "moderator")
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Perform health checks in parallel
    const [databaseHealth, authHealth, externalAPIs, systemMetrics] =
      await Promise.all([
        checkDatabaseHealth(supabase),
        checkAuthService(supabase),
        checkExternalAPIs(),
        getSystemMetrics(),
      ]);

    const allServices = [databaseHealth, authHealth, ...externalAPIs];

    // Calculate overall system status
    const healthyServices = allServices.filter(
      (s) => s.status === "healthy",
    ).length;
    const degradedServices = allServices.filter(
      (s) => s.status === "degraded",
    ).length;
    const downServices = allServices.filter((s) => s.status === "down").length;

    let overallStatus: "healthy" | "degraded" | "down";
    if (downServices > 0) {
      overallStatus = "down";
    } else if (degradedServices > 0) {
      overallStatus = "degraded";
    } else {
      overallStatus = "healthy";
    }

    // Store health check results in database for historical tracking
    try {
      for (const service of allServices) {
        await supabase.from("system_health").upsert(
          {
            service_name: service.service,
            status: service.status,
            response_time: service.responseTime,
            metadata: service.metadata || {},
            last_check: service.lastCheck.toISOString(),
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: "service_name",
          },
        );
      }
    } catch (_error) {}

    const healthReport = {
      overall: {
        status: overallStatus,
        timestamp: new Date().toISOString(),
        summary: {
          total: allServices.length,
          healthy: healthyServices,
          degraded: degradedServices,
          down: downServices,
        },
      },
      services: allServices,
      metrics: systemMetrics,
      alerts: [
        ...(degradedServices > 0
          ? [
              {
                level: "warning",
                message: `${degradedServices} service(s) experiencing degraded performance`,
                services: allServices
                  .filter((s) => s.status === "degraded")
                  .map((s) => s.service),
              },
            ]
          : []),
        ...(downServices > 0
          ? [
              {
                level: "critical",
                message: `${downServices} service(s) are down`,
                services: allServices
                  .filter((s) => s.status === "down")
                  .map((s) => s.service),
              },
            ]
          : []),
      ],
    };

    return NextResponse.json(healthReport);
  } catch (_error) {
    return NextResponse.json(
      { error: "Failed to perform health check" },
      { status: 500 },
    );
  }
}
