import { NextResponse } from "next/server";
import { queueManager } from "~/lib/queues/queue-manager";

// Force dynamic rendering for real-time health checks
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/queues/health - Fast public health check endpoint
 * Optimized for load balancers, monitoring systems, and status pages
 * Returns within 100ms with minimal database queries
 */
export async function GET() {
  const startTime = Date.now();
  
  try {
    // Quick health check without detailed metrics
    const health = await queueManager.getHealthStatus();
    
    // Calculate response time
    const responseTime = Date.now() - startTime;
    
    // Determine overall status
    const status = health.healthy && health.redis && health.workers > 0 
      ? "healthy" 
      : health.redis && health.initialized 
        ? "degraded" 
        : "down";

    const response = {
      status,
      timestamp: new Date().toISOString(),
      services: {
        queues: health.initialized && health.queues > 0,
        workers: health.workers > 0,
        redis: health.redis,
      },
      responseTime,
    };

    // Set appropriate HTTP status based on health
    const httpStatus = status === "healthy" ? 200 : status === "degraded" ? 200 : 503;

    return NextResponse.json(response, {
      status: httpStatus,
      headers: {
        'Cache-Control': 'public, max-age=5, s-maxage=5', // Very short cache for health checks
        'Content-Type': 'application/json',
      },
    });

  } catch (error) {
    console.error("Health check failed:", error);
    
    const responseTime = Date.now() - startTime;
    
    // Return unhealthy status with minimal error info
    return NextResponse.json(
      {
        status: "down",
        timestamp: new Date().toISOString(),
        services: {
          queues: false,
          workers: false,
          redis: false,
        },
        responseTime,
        error: "System unavailable",
      },
      { 
        status: 503,
        headers: {
          'Cache-Control': 'public, max-age=5, s-maxage=5',
          'Content-Type': 'application/json',
        },
      }
    );
  }
}
