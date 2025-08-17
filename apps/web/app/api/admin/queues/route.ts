import { NextRequest, NextResponse } from "next/server";
import { queueManager } from "~/lib/queues/queue-manager";
import { getQueueStats, checkWorkerHealth } from "~/lib/queues/workers";

// Force dynamic rendering
export const dynamic = "force-dynamic";

/**
 * GET /api/admin/queues - Get queue statistics and health
 */
export async function GET(request: NextRequest) {
  try {
    // Check authorization (admin only)
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get queue statistics
    const stats = await getQueueStats();
    
    // Get worker health
    const health = await checkWorkerHealth();
    
    // Get overall metrics
    const metrics = await queueManager.getAllMetrics();
    
    return NextResponse.json({
      success: true,
      health,
      stats,
      metrics,
      timestamp: new Date().toISOString(),
    });
    
  } catch (error) {
    console.error("Failed to get queue stats:", error);
    return NextResponse.json(
      { error: "Failed to get queue statistics" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/queues - Manage queues (pause, resume, clean)
 */
export async function POST(request: NextRequest) {
  try {
    // Check authorization
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { action, queueName, options } = body;

    switch (action) {
      case "pause":
        await queueManager.pauseQueue(queueName);
        return NextResponse.json({ success: true, action: "paused" });
      
      case "resume":
        await queueManager.resumeQueue(queueName);
        return NextResponse.json({ success: true, action: "resumed" });
      
      case "clean":
        const { grace = 0, limit = 1000, status } = options || {};
        const cleaned = await queueManager.cleanQueue(queueName, grace, limit, status);
        return NextResponse.json({ 
          success: true, 
          action: "cleaned",
          jobsCleaned: cleaned.length 
        });
      
      case "retry-failed":
        // Get failed jobs and retry them
        const queue = queueManager.getQueue(queueName);
        const failedJobs = await queue.getFailed(0, 100);
        
        let retriedCount = 0;
        for (const job of failedJobs) {
          await job.retry();
          retriedCount++;
        }
        
        return NextResponse.json({ 
          success: true, 
          action: "retried",
          jobsRetried: retriedCount 
        });
      
      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
    
  } catch (error) {
    console.error("Failed to manage queue:", error);
    return NextResponse.json(
      { error: "Failed to manage queue" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/queues - Remove specific jobs
 */
export async function DELETE(request: NextRequest) {
  try {
    // Check authorization
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const queueName = searchParams.get("queue");
    const jobId = searchParams.get("jobId");

    if (!queueName || !jobId) {
      return NextResponse.json(
        { error: "Queue name and job ID required" },
        { status: 400 }
      );
    }

    const queue = queueManager.getQueue(queueName as any);
    const job = await queue.getJob(jobId);
    
    if (!job) {
      return NextResponse.json(
        { error: "Job not found" },
        { status: 404 }
      );
    }

    await job.remove();

    return NextResponse.json({ 
      success: true, 
      message: `Job ${jobId} removed` 
    });
    
  } catch (error) {
    console.error("Failed to remove job:", error);
    return NextResponse.json(
      { error: "Failed to remove job" },
      { status: 500 }
    );
  }
}