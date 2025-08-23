import { NextResponse } from "next/server";
import { queueManager } from "~/lib/queues/queue-manager";
import { getQueueStats, getJobCounts } from "~/lib/queues/workers";
import { ImportStatusManager } from "~/lib/import-status";
import { RedisClientFactory } from "~/lib/queues/redis-config";

// Force dynamic rendering for real-time stats
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/queues/stats - Public queue statistics for monitoring dashboards
 * No authentication required - provides non-sensitive metrics only
 */
export async function GET(request: Request) {
  try {
    // Add basic per-IP rate limiting
    const limiter = RedisClientFactory.getClient('cache');
    const key = `ratelimit:queues:stats:${request.headers.get('x-forwarded-for') ?? 'unknown'}`;
    const window = 60; // seconds
    const max = 60; // requests
    const count = await limiter.incr(key);
    if (count === 1) await limiter.expire(key, window);
    if (count > max) return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    
    
    // Get basic queue metrics (non-sensitive)
    const [queueStats, jobCounts, importStats] = await Promise.all([
      getQueueStats(),
      getJobCounts(),
      ImportStatusManager.getImportStatistics(1), // Last 24 hours
    ]);

    // Filter to only public-safe metrics
    const publicQueueStats = queueStats.map(queue => ({
      name: queue.name,
      waiting: queue.waiting,
      active: queue.active,
      completed: queue.completed,
      failed: queue.failed,
      health: queue.health,
      totalJobs: queue.totalJobs,
      successRate: queue.successRate,
    }));

    // Calculate performance metrics
    const totalProcessed = jobCounts.completed + jobCounts.failed;
    const overallSuccessRate = totalProcessed > 0 
      ? Math.round((jobCounts.completed / totalProcessed) * 100 * 100) / 100 
      : 100;

    // Get system health status and measure response time
    const t0 = Date.now();
    const systemHealth = await queueManager.getHealthStatus();
    const queueResponseTime = Date.now() - t0;

    const response = {
      timestamp: new Date().toISOString(),
      queues: {
        summary: {
          totalQueues: jobCounts.queues,
          totalJobs: jobCounts.total,
          waiting: jobCounts.waiting,
          active: jobCounts.active,
          completed: jobCounts.completed,
          failed: jobCounts.failed,
          successRate: overallSuccessRate,
        },
        details: publicQueueStats,
      },
      imports: {
        today: {
          total: importStats.totalImports,
          successful: importStats.successfulImports,
          failed: importStats.failedImports,
          inProgress: importStats.inProgress,
          averageDuration: Math.round(importStats.averageDuration || 0),
        },
      },
      performance: {
        queueResponseTime,
        systemHealth: systemHealth.healthy ? 'healthy' : 'degraded',
        redisConnected: systemHealth.redis,
        workersRunning: systemHealth.workers > 0,
      },
    };

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'public, max-age=30, s-maxage=30',
        'Content-Type': 'application/json',
      },
    });

  } catch (error) {
    console.error("Failed to get public queue stats:", error);
    
    // Return minimal error response without exposing internal details
    return NextResponse.json(
      {
        error: "Statistics temporarily unavailable",
        timestamp: new Date().toISOString(),
        queues: {
          summary: { totalQueues: 0, totalJobs: 0, waiting: 0, active: 0, completed: 0, failed: 0, successRate: 0 },
          details: [],
        },
        imports: {
          today: { total: 0, successful: 0, failed: 0, inProgress: 0, averageDuration: 0 },
        },
        performance: {
          queueResponseTime: 0,
          systemHealth: 'unknown',
          redisConnected: false,
          workersRunning: false,
        },
      },
      { status: 503 }
    );
  }
}
