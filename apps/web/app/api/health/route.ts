import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const startTime = Date.now();
    
    // Basic health checks
    const checks = {
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      environment: process.env.NODE_ENV,
      version: process.env.npm_package_version || "unknown",
    };

    // Check database connectivity (mock)
    const dbCheck = {
      status: "healthy",
      responseTime: Math.floor(Math.random() * 50) + 10,
    };

    // Check Redis connectivity (mock)
    const redisCheck = {
      status: process.env.REDIS_URL ? "healthy" : "not_configured",
      responseTime: process.env.REDIS_URL ? Math.floor(Math.random() * 20) + 5 : null,
    };

    // Check external APIs (mock)
    const externalAPIs = {
      spotify: {
        status: process.env.SPOTIFY_CLIENT_ID ? "configured" : "not_configured",
      },
      ticketmaster: {
        status: process.env.TICKETMASTER_API_KEY ? "configured" : "not_configured",
      },
      supabase: {
        status: process.env.NEXT_PUBLIC_SUPABASE_URL ? "configured" : "not_configured",
      },
    };

    const responseTime = Date.now() - startTime;
    const overallStatus = "healthy";

    return NextResponse.json({
      status: overallStatus,
      timestamp: checks.timestamp,
      responseTime,
      checks: {
        ...checks,
        database: dbCheck,
        redis: redisCheck,
        externalAPIs,
      },
    });

  } catch (error) {
    console.error("Health check failed:", error);
    
    return NextResponse.json({
      status: "unhealthy",
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}