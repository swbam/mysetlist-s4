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

    // Track the Web Vital metric
    monitor.trackPerformance(
      body.name.toLowerCase(),
      body.value,
      body.rating || "good"
    )

    // Log the Web Vital for debugging
    monitor.log(
      "Web Vital Received",
      {
        name: body.name,
        value: body.value,
        rating: body.rating,
        id: body.id,
        navigationType: body.navigationType,
        delta: body.delta,
        timestamp: body.timestamp,
      },
      context
    )

    // Track additional metrics
    monitor.metric("web_vitals_total", 1, {
      name: body.name,
      rating: body.rating,
      navigation_type: body.navigationType,
    })

    // Track endpoint performance
    const duration = Date.now() - startTime
    monitor.trackRequest(
      {
        url: "/api/analytics/vitals",
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
    monitor.error("Error processing web vital", error, {
      endpoint: "/api/analytics/vitals",
      method: "POST",
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
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Max-Age": "86400",
      },
    }
  )
}
