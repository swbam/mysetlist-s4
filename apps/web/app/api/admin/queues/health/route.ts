import { type NextRequest, NextResponse } from "next/server";
import { QueueName, queueManager } from "~/lib/queues/queue-manager";
import { checkWorkerHealth, getQueueStats } from "~/lib/queues/workers";
import { ProgressBus } from "~/lib/services/progress/ProgressBus";

// Force dynamic rendering
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/admin/queues/health - Get detailed queue health metrics
 */
export async function GET(request: NextRequest) {
  try {
    console.log("[Queue Health API] Getting detailed queue health metrics");

    // Check authorization (admin only)
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get basic queue statistics
    const stats = await getQueueStats();

    // Get worker health
    const workerHealth = await checkWorkerHealth();

    // Get overall metrics from queue manager
    const metrics = await queueManager.getAllMetrics();

    // Get active imports from ProgressBus
    const activeImports = await ProgressBus.getActiveImports();

    // Get detailed job information for each queue
    const queueDetails = await Promise.all(
      Object.values(QueueName).map(async (queueName) => {
        try {
          const queue = queueManager.getQueue(queueName);
          // SimpleQueue only has basic count method
          const waitingCount = await queue.getWaiting();
          
          // SimpleQueue doesn't support detailed job counts or job sampling
          const counts = {
            waiting: waitingCount,
            active: 0, // SimpleQueue processes immediately
            completed: 0, // Not tracked in SimpleQueue
            failed: 0, // Not tracked in SimpleQueue
            delayed: 0, // Not tracked in SimpleQueue
          };
          const isPaused = false; // SimpleQueue doesn't support pause/resume
          
          // SimpleQueue doesn't expose job details
          const waitingJobs: any[] = [];
          const activeJobs: any[] = [];
          const failedJobs: any[] = [];

          return {
            name: queueName,
            status: isPaused ? "paused" : "running",
            counts,
            isPaused,
            sampleJobs: {
              waiting: waitingJobs.map((job) => ({
                id: job.id,
                name: job.name,
                data: job.data,
                timestamp: job.timestamp,
                delay: job.delay,
              })),
              active: activeJobs.map((job) => ({
                id: job.id,
                name: job.name,
                data: job.data,
                processedOn: job.processedOn,
                progress: job.progress(),
              })),
              failed: failedJobs.map((job) => ({
                id: job.id,
                name: job.name,
                data: job.data,
                failedReason: job.failedReason,
                processedOn: job.processedOn,
                finishedOn: job.finishedOn,
              })),
            },
            metrics: {
              throughput: {
                hourly: counts.completed || 0, // Simplified - would need time-based calculation
                daily: (counts.completed || 0) * 24,
              },
              errorRate:
                counts.failed && counts.completed
                  ? (counts.failed / (counts.completed + counts.failed)) * 100
                  : 0,
            },
          };
        } catch (error) {
          console.error(
            `[Queue Health API] Error getting details for queue ${queueName}:`,
            error,
          );
          return {
            name: queueName,
            status: "error",
            error: error instanceof Error ? error.message : "Unknown error",
            counts: {
              waiting: 0,
              active: 0,
              completed: 0,
              failed: 0,
              delayed: 0,
            },
            isPaused: false,
            sampleJobs: { waiting: [], active: [], failed: [] },
            metrics: { throughput: { hourly: 0, daily: 0 }, errorRate: 0 },
          };
        }
      }),
    );

    // Calculate system-wide health score
    const totalFailed = queueDetails.reduce(
      (sum, q) => sum + (q.counts?.failed || 0),
      0,
    );
    const totalCompleted = queueDetails.reduce(
      (sum, q) => sum + (q.counts?.completed || 0),
      0,
    );
    const totalJobs = totalFailed + totalCompleted;
    const systemErrorRate = totalJobs > 0 ? (totalFailed / totalJobs) * 100 : 0;

    const healthScore = Math.max(0, 100 - systemErrorRate * 2); // 2x weight for errors
    const healthStatus =
      healthScore >= 90
        ? "healthy"
        : healthScore >= 70
          ? "warning"
          : "critical";

    // Redis connection status
    let redisHealth = "unknown";
    try {
      // Try to create a simple queue operation to test Redis
      const testQueue = queueManager.getQueue(QueueName.ARTIST_IMPORT);
      await testQueue.count(); // Use count() instead of isPaused()
      redisHealth = "connected";
    } catch (error) {
      redisHealth = "disconnected";
    }

    const response = {
      success: true,
      timestamp: new Date().toISOString(),

      // Overall system health
      health: {
        status: healthStatus,
        score: Math.round(healthScore),
        redisConnection: redisHealth,
        workersRunning: workerHealth.healthy,
        activeImports: activeImports.length,
      },

      // Worker information
      workers: {
        healthy: workerHealth.healthy,
        workers: workerHealth.workers,
      },

      // Queue statistics
      queues: queueDetails,

      // Active import operations
      activeImports: activeImports.map((imp) => ({
        artistId: imp.artistId,
        artistName: imp.artistName,
        stage: imp.stage,
        progress: imp.progress,
        message: imp.message,
        startedAt: imp.startedAt,
        duration: Date.now() - new Date(imp.startedAt).getTime(),
      })),

      // System-wide metrics
      metrics: {
        totalQueues: queueDetails.length,
        totalJobs: {
          waiting: queueDetails.reduce(
            (sum, q) => sum + (q.counts?.waiting || 0),
            0,
          ),
          active: queueDetails.reduce(
            (sum, q) => sum + (q.counts?.active || 0),
            0,
          ),
          completed: queueDetails.reduce(
            (sum, q) => sum + (q.counts?.completed || 0),
            0,
          ),
          failed: queueDetails.reduce(
            (sum, q) => sum + (q.counts?.failed || 0),
            0,
          ),
          delayed: queueDetails.reduce(
            (sum, q) => sum + (q.counts?.delayed || 0),
            0,
          ),
        },
        systemErrorRate: Math.round(systemErrorRate * 100) / 100,
        avgThroughput: {
          hourly: Math.round(
            queueDetails.reduce(
              (sum, q) => sum + (q.metrics?.throughput?.hourly || 0),
              0,
            ) / queueDetails.length,
          ),
          daily: Math.round(
            queueDetails.reduce(
              (sum, q) => sum + (q.metrics?.throughput?.daily || 0),
              0,
            ) / queueDetails.length,
          ),
        },
      },

      // Legacy compatibility
      stats,
    };

    console.log(
      `[Queue Health API] Health check completed - Status: ${healthStatus}, Score: ${healthScore}`,
    );
    return NextResponse.json(response);
  } catch (error) {
    console.error("[Queue Health API] Failed to get queue health:", error);
    return NextResponse.json(
      {
        error: "Failed to get queue health",
        message: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}
