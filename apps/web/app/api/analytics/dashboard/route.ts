import { type NextRequest, NextResponse } from "next/server";
import { monitor, monitoringService } from "~/lib/api/monitoring";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const startTime = Date.now();
    const searchParams = request.nextUrl.searchParams;

    const timeRange = Number.parseInt(
      searchParams.get("timeRange") || "3600000",
    ); // 1 hour default
    const includeSystemMetrics = searchParams.get("system") === "true";
    const includeWebVitals = searchParams.get("vitals") === "true";

    // Get health metrics
    const healthMetrics = await monitoringService.getHealthMetrics();

    // Get recent error logs
    const errorLogs = await monitoringService.getLogs("error", 50);

    // Get recent warning logs
    const warningLogs = await monitoringService.getLogs("warn", 25);

    // Get performance metrics
    const performanceMetrics = await Promise.all([
      monitoringService.getMetrics("http_request_duration_ms", timeRange),
      monitoringService.getMetrics("http_requests_total", timeRange),
      monitoringService.getMetrics("database_query_duration_ms", timeRange),
      monitoringService.getMetrics("external_api_duration_ms", timeRange),
    ]);

    const [requestDuration, requestCount, dbDuration, apiDuration] =
      performanceMetrics;

    // Web Vitals if requested
    let webVitals = {};
    if (includeWebVitals) {
      webVitals = {
        lcp: await monitoringService.getMetrics("performance_lcp", timeRange),
        fcp: await monitoringService.getMetrics("performance_fcp", timeRange),
        cls: await monitoringService.getMetrics("performance_cls", timeRange),
        inp: await monitoringService.getMetrics("performance_inp", timeRange),
        ttfb: await monitoringService.getMetrics("performance_ttfb", timeRange),
      };
    }

    // System metrics if requested
    let systemMetrics = {};
    if (includeSystemMetrics) {
      systemMetrics = {
        memory: {
          rss: await monitoringService.getMetrics(
            "system_memory_rss",
            timeRange,
          ),
          heapUsed: await monitoringService.getMetrics(
            "system_memory_heap_used",
            timeRange,
          ),
          heapTotal: await monitoringService.getMetrics(
            "system_memory_heap_total",
            timeRange,
          ),
        },
        cpu: {
          user: await monitoringService.getMetrics(
            "system_cpu_user",
            timeRange,
          ),
          system: await monitoringService.getMetrics(
            "system_cpu_system",
            timeRange,
          ),
        },
      };
    }

    // Calculate aggregated statistics
    const stats = {
      requests: {
        total: requestCount.length,
        avgDuration:
          requestDuration.length > 0
            ? requestDuration.reduce((sum, m) => sum + m.value, 0) /
              requestDuration.length
            : 0,
        errorRate: errorLogs.length / Math.max(requestCount.length, 1),
      },
      database: {
        totalQueries: dbDuration.length,
        avgDuration:
          dbDuration.length > 0
            ? dbDuration.reduce((sum, m) => sum + m.value, 0) /
              dbDuration.length
            : 0,
      },
      externalAPIs: {
        totalCalls: apiDuration.length,
        avgDuration:
          apiDuration.length > 0
            ? apiDuration.reduce((sum, m) => sum + m.value, 0) /
              apiDuration.length
            : 0,
      },
    };

    // Top endpoints by request count
    const endpointStats = requestCount.reduce(
      (acc, metric) => {
        const endpoint = metric.tags?.endpoint || "unknown";
        acc[endpoint] = (acc[endpoint] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    const topEndpoints = Object.entries(endpointStats)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([endpoint, count]) => ({ endpoint, count }));

    const response = {
      timestamp: new Date().toISOString(),
      timeRange,
      health: healthMetrics,
      stats,
      topEndpoints,
      errors: {
        recent: errorLogs.slice(0, 10),
        count: errorLogs.length,
      },
      warnings: {
        recent: warningLogs.slice(0, 5),
        count: warningLogs.length,
      },
      performance: {
        requestDuration: requestDuration.slice(-20), // Last 20 data points
        requestCount: requestCount.slice(-20),
        dbDuration: dbDuration.slice(-20),
        apiDuration: apiDuration.slice(-20),
      },
      ...(includeWebVitals && { webVitals }),
      ...(includeSystemMetrics && { systemMetrics }),
    };

    const jsonResponse = NextResponse.json(response);

    // Add cache headers
    jsonResponse.headers.set(
      "Cache-Control",
      "public, max-age=30, stale-while-revalidate=60",
    );

    // Track endpoint performance
    const duration = Date.now() - startTime;
    monitor.trackRequest(
      {
        url: "/api/analytics/dashboard",
        method: "GET",
        headers: Object.fromEntries(request.headers.entries()),
      },
      { statusCode: 200 },
      duration,
    );

    return jsonResponse;
  } catch (error) {
    monitor.error("Error retrieving analytics dashboard", error, {
      endpoint: "/api/analytics/dashboard",
      method: "GET",
    } as any);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// OPTIONS handler for CORS
export async function OPTIONS() {
  return NextResponse.json(
    {},
    {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Max-Age": "86400",
      },
    },
  );
}
