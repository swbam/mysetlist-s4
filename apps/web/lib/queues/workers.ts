import { queueManager, QueueName } from "./queue-manager";

// Worker health check using queue manager's internal state
export async function checkWorkerHealth(): Promise<{
  healthy: boolean;
  workers: Array<{
    name: string;
    running: boolean;
    paused: boolean;
    concurrency: number;
    stalledJobs?: number;
  }>;
  redis: boolean;
  queues: boolean;
  errors: string[];
}> {
  const errors: string[] = [];
  const healthStatus: Array<{
    name: string;
    running: boolean;
    paused: boolean;
    concurrency: number;
    stalledJobs?: number;
  }> = [];
  
  try {
    // Get overall health from queue manager
    const queueManagerHealth = await queueManager.getHealthStatus();
    const redisHealthy = queueManagerHealth.redis;
    
    if (!redisHealthy) {
      errors.push("Redis connection failed");
    }
    
    // Add queue manager errors
    errors.push(...queueManagerHealth.errors);
    
    // Get queue statistics to infer worker health
    const queueStats = await queueManager.getAllStats();
    
    for (const queueStat of queueStats) {
      const hasStalled = queueStat.failed > 0;
      
      healthStatus.push({
        name: queueStat.name,
        running: !queueStat.paused,
        paused: queueStat.paused,
        concurrency: 1, // Default concurrency from queue config
        stalledJobs: hasStalled ? queueStat.failed : 0,
      });
      
      if (queueStat.paused) {
        errors.push(`Queue ${queueStat.name} is paused`);
      }
    }
    
    // Check overall queue system health
    const queuesHealthy = queueManagerHealth.initialized && queueManagerHealth.queues > 0;
    if (!queuesHealthy) {
      errors.push("Queue system not properly initialized");
    }
    
    return {
      healthy: errors.length === 0 && redisHealthy && queuesHealthy,
      workers: healthStatus,
      redis: redisHealthy,
      queues: queuesHealthy,
      errors,
    };
    
  } catch (error) {
    console.error("Worker health check failed:", error);
    return {
      healthy: false,
      workers: [],
      redis: false,
      queues: false,
      errors: [`Health check failed: ${error}`],
    };
  }
}

// Get queue statistics
export async function getQueueStats() {
  try {
    const stats = await queueManager.getAllStats();
    
    // Add additional metrics like total jobs, processing rates, and queue health
    const enhancedStats = await Promise.all(stats.map(async (queueStat) => {
      const totalJobs = queueStat.waiting + queueStat.active + queueStat.completed + queueStat.failed;
      const successRate = totalJobs > 0 ? ((queueStat.completed / totalJobs) * 100) : 100;
      
      return {
        ...queueStat,
        totalJobs,
        successRate: Math.round(successRate * 100) / 100,
        health: queueStat.failed === 0 && !queueStat.paused ? 'healthy' : 
               queueStat.paused ? 'paused' : 'degraded'
      };
    }));
    
    return enhancedStats;
  } catch (error) {
    console.error("Failed to get queue stats:", error);
    return [];
  }
}

// Get detailed metrics for specific queue
export async function getQueueMetrics(queueName: QueueName) {
  try {
    const queueStats = await queueManager.getQueueStats(queueName);
    const queue = queueManager.getQueue(queueName);
    
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }
    
    // Get additional metrics
    const [jobs, workers] = await Promise.all([
      queue.getJobs(['waiting', 'active', 'completed', 'failed'], 0, 10),
      queue.getWorkers()
    ]);
    
    return {
      ...queueStats,
      recentJobs: jobs.map(job => ({
        id: job.id,
        name: job.name,
        processedOn: job.processedOn,
        finishedOn: job.finishedOn,
        failedReason: job.failedReason,
      })),
      workers: workers.length,
    };
  } catch (error) {
    console.error(`Failed to get metrics for queue ${queueName}:`, error);
    return null;
  }
}

// Get status of all active workers using queue manager data
export async function getWorkerStatus() {
  const status: Array<{
    queue: string;
    concurrency: number;
    running: boolean;
    paused: boolean;
    processing: number;
  }> = [];
  
  try {
    // Get queue statistics and health to infer worker status
    const [queueStats, healthStatus] = await Promise.all([
      queueManager.getAllStats(),
      queueManager.getHealthStatus(),
    ]);
    
    for (const queueStat of queueStats) {
      status.push({
        queue: queueStat.name,
        concurrency: 1, // Default concurrency - could be enhanced with queue config lookup
        running: !queueStat.paused && healthStatus.healthy,
        paused: queueStat.paused,
        processing: queueStat.active,
      });
    }
    
  } catch (error) {
    console.error("Failed to get worker status:", error);
    // Return empty status array on error
  }
  
  return status;
}

// Get job counts across all queues
export async function getJobCounts() {
  try {
    const stats = await queueManager.getAllStats();
    
    const totalCounts = stats.reduce(
      (acc, queueStat) => ({
        waiting: acc.waiting + queueStat.waiting,
        active: acc.active + queueStat.active,
        completed: acc.completed + queueStat.completed,
        failed: acc.failed + queueStat.failed,
        delayed: acc.delayed + queueStat.delayed,
      }),
      { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0 }
    );
    
    return {
      ...totalCounts,
      total: totalCounts.waiting + totalCounts.active + totalCounts.completed + totalCounts.failed + totalCounts.delayed,
      queues: stats.length,
    };
  } catch (error) {
    console.error("Failed to get job counts:", error);
    return { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0, total: 0, queues: 0 };
  }
}

// Manual job trigger helper
export async function triggerManualJob(
  queueName: QueueName,
  jobName: string,
  data: any,
  priority?: number
) {
  return await queueManager.addJob(
    queueName,
    jobName,
    data,
    { priority: priority || 10 }
  );
}

// Export for external use
export { queueManager };