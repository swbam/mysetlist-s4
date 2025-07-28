import { type NextRequest, NextResponse } from "next/server"
import { monitor } from "~/lib/api/monitoring"

export async function POST(request: NextRequest) {
  try {
    const startTime = Date.now()

    // Parse the request body
    const body = await request.json()

    // Validate required fields
    if (!body.name || typeof body.value !== "number") {
      return NextResponse.json(
        { error: "Missing required fields: name, value" },
        { status: 400 }
      )
    }

    // Extract context from request
    const context = {
      ip:
        request.headers.get("x-forwarded-for") ||
        request.headers.get("x-real-ip") ||
        "unknown",
      userAgent: request.headers.get("user-agent") || "unknown",
      url: body.url || "unknown",
      requestId: request.headers.get("x-request-id") || "unknown",
    }

    // Track the custom metric
    monitor.metric(body.name, body.value, body.tags || {}, body.unit || "count")

    // Log the metric for debugging
    monitor.log(
      "Custom Metric Received",
      {
        name: body.name,
        value: body.value,
        unit: body.unit,
        tags: body.tags,
        timestamp: body.timestamp,
      },
      context
    )

    // Track endpoint performance
    const duration = Date.now() - startTime
    monitor.trackRequest(
      {
        url: "/api/analytics/metrics",
        method: "POST",
        headers: Object.fromEntries(request.headers.entries()),
      },
      { statusCode: 200 },
      duration
    )

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    monitor.error("Error processing custom metric", error, {
      endpoint: "/api/analytics/metrics",
      method: "POST",
    } as any)

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// GET handler for retrieving metrics
export async function GET(request: NextRequest) {
  try {
    const startTime = Date.now()
    const searchParams = request.nextUrl.searchParams

    const metricName = searchParams.get("name")
    const timeRange = Number.parseInt(
      searchParams.get("timeRange") || "3600000"
    ) // 1 hour default
    const format = searchParams.get("format") || "json"

    if (!metricName) {
      return NextResponse.json(
        { error: "Missing required parameter: name" },
        { status: 400 }
      )
    }

    // Get monitoring service instance
    const monitoringService = (monitor as any).constructor.getInstance()
    const metrics = await monitoringService.getMetrics(metricName, timeRange)

    // Format response
    let response
    if (format === "prometheus") {
      // Prometheus format for monitoring tools
      const lines = metrics.map(
        (metric: any) =>
          `${metric.name} ${metric.value} ${new Date(metric.timestamp).getTime()}`
      )
      response = NextResponse.json(lines.join("\n"), {
        headers: { "Content-Type": "text/plain" },
      })
    } else {
      // JSON format
      response = NextResponse.json({
        metric: metricName,
        timeRange,
        count: metrics.length,
        data: metrics,
        timestamp: new Date().toISOString(),
      })
    }

    // Add cache headers
    response.headers.set(
      "Cache-Control",
      "public, max-age=60, stale-while-revalidate=300"
    )

    // Track endpoint performance
    const duration = Date.now() - startTime
    monitor.trackRequest(
      {
        url: "/api/analytics/metrics",
        method: "GET",
        headers: Object.fromEntries(request.headers.entries()),
      },
      { statusCode: 200 },
      duration
    )

    return response
  } catch (error) {
    monitor.error("Error retrieving metrics", error, {
      endpoint: "/api/analytics/metrics",
      method: "GET",
    } as any)

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// OPTIONS handler for CORS
export async function OPTIONS() {
  return NextResponse.json(
    {},
    {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Max-Age": "86400",
      },
    }
  )
}
