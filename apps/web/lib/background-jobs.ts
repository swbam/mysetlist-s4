import { monitor } from "~/lib/api/monitoring";
import { CacheClient } from "~/lib/cache/redis";
import { createServiceClient } from "~/lib/supabase/server";

// Job types and their configurations
export interface Job {
  id: string;
  type: JobType;
  data: any;
  priority: "low" | "medium" | "high";
  attempts: number;
  maxAttempts: number;
  scheduledAt: Date;
  createdAt: Date;
  updatedAt: Date;
  status: "pending" | "processing" | "completed" | "failed" | "cancelled";
  error?: string;
  result?: any;
}

export type JobType =
  | "email_notification"
  | "data_sync"
  | "image_processing"
  | "analytics_processing"
  | "cache_warming"
  | "cleanup"
  | "trending_calculation"
  | "user_activity_analysis";

// Job configurations
const JOB_CONFIGS: Record<
  JobType,
  {
    maxAttempts: number;
    retryDelay: number; // milliseconds
    timeout: number; // milliseconds
  }
> = {
  email_notification: { maxAttempts: 3, retryDelay: 60000, timeout: 30000 },
  data_sync: { maxAttempts: 5, retryDelay: 300000, timeout: 600000 },
  image_processing: { maxAttempts: 2, retryDelay: 30000, timeout: 120000 },
  analytics_processing: { maxAttempts: 3, retryDelay: 60000, timeout: 300000 },
  cache_warming: { maxAttempts: 2, retryDelay: 120000, timeout: 180000 },
  cleanup: { maxAttempts: 3, retryDelay: 300000, timeout: 600000 },
  trending_calculation: { maxAttempts: 3, retryDelay: 180000, timeout: 300000 },
  user_activity_analysis: {
    maxAttempts: 2,
    retryDelay: 240000,
    timeout: 300000,
  },
};

// Job processor interface
export interface JobProcessor {
  process(job: Job): Promise<any>;
}

// Background job queue manager
export class BackgroundJobQueue {
  private static instance: BackgroundJobQueue;
  private processors: Map<JobType, JobProcessor> = new Map();
  private isProcessing = false;
  private processingInterval: NodeJS.Timeout | null = null;
  private cache: CacheClient;

  private constructor() {
    this.cache = CacheClient.getInstance();
    this.registerDefaultProcessors();
  }

  static getInstance(): BackgroundJobQueue {
    if (!BackgroundJobQueue.instance) {
      BackgroundJobQueue.instance = new BackgroundJobQueue();
    }
    return BackgroundJobQueue.instance;
  }

  private registerDefaultProcessors() {
    this.processors.set("email_notification", new EmailNotificationProcessor());
    this.processors.set("data_sync", new DataSyncProcessor());
    this.processors.set("image_processing", new ImageProcessingProcessor());
    this.processors.set(
      "analytics_processing",
      new AnalyticsProcessingProcessor(),
    );
    this.processors.set("cache_warming", new CacheWarmingProcessor());
    this.processors.set("cleanup", new CleanupProcessor());
    this.processors.set(
      "trending_calculation",
      new TrendingCalculationProcessor(),
    );
    this.processors.set(
      "user_activity_analysis",
      new UserActivityAnalysisProcessor(),
    );
  }

  // Add job to queue
  async addJob(
    type: JobType,
    data: any,
    options: {
      priority?: "low" | "medium" | "high";
      scheduledAt?: Date;
      maxAttempts?: number;
    } = {},
  ): Promise<string> {
    const job: Job = {
      id: crypto.randomUUID(),
      type,
      data,
      priority: options.priority || "medium",
      attempts: 0,
      maxAttempts: options.maxAttempts || JOB_CONFIGS[type].maxAttempts,
      scheduledAt: options.scheduledAt || new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      status: "pending",
    };

    // Store job in Redis
    await this.cache.set(`job:${job.id}`, job);

    // Add to priority queue
    const score = this.calculateJobScore(job);
    await this.cache.zadd("job_queue", score, job.id);

    monitor.log("Background job added", {
      jobId: job.id,
      type: job.type,
      priority: job.priority,
      scheduledAt: job.scheduledAt,
    });

    return job.id;
  }

  // Calculate job score for priority ordering
  private calculateJobScore(job: Job): number {
    const now = Date.now();
    const scheduledTime = job.scheduledAt.getTime();
    const priorityWeight =
      job.priority === "high" ? 1000 : job.priority === "medium" ? 500 : 100;

    // Jobs due now get higher priority
    const timeWeight = scheduledTime <= now ? 0 : scheduledTime - now;

    return scheduledTime + timeWeight - priorityWeight;
  }

  // Start job processing
  start() {
    if (this.isProcessing) {
      return;
    }

    this.isProcessing = true;
    this.processingInterval = setInterval(async () => {
      await this.processJobs();
    }, 5000); // Process jobs every 5 seconds

    monitor.log("Background job processing started");
  }

  // Stop job processing
  stop() {
    if (!this.isProcessing) {
      return;
    }

    this.isProcessing = false;
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }

    monitor.log("Background job processing stopped");
  }

  // Process jobs from queue
  private async processJobs() {
    try {
      const now = Date.now();

      // Get jobs that are due to run
      const jobIds = await this.cache.zrange("job_queue", 0, now);

      if (jobIds.length === 0) {
        return;
      }

      // Process jobs in parallel (up to 3 at once)
      const concurrentJobs = jobIds.slice(0, 3);

      await Promise.all(concurrentJobs.map((jobId) => this.processJob(jobId)));
    } catch (error) {
      monitor.error("Error processing job queue", error);
    }
  }

  // Process individual job
  private async processJob(jobId: string) {
    const timer = monitor.startTimer("background_job_processing");

    try {
      // Get job from cache
      const job = await this.cache.get<Job>(`job:${jobId}`);
      if (!job) {
        // Job not found, remove from queue
        await this.cache.pipeline([
          ["ZREM", "job_queue", jobId],
          ["DEL", `job:${jobId}`],
        ]);
        return;
      }

      // Skip if already processing or completed
      if (job.status === "processing" || job.status === "completed") {
        return;
      }

      // Check if job is due
      if (job.scheduledAt.getTime() > Date.now()) {
        return;
      }

      // Get processor for job type
      const processor = this.processors.get(job.type);
      if (!processor) {
        await this.failJob(job, `No processor found for job type: ${job.type}`);
        return;
      }

      // Update job status
      job.status = "processing";
      job.attempts++;
      job.updatedAt = new Date();
      await this.cache.set(`job:${job.id}`, job);

      monitor.log("Processing background job", {
        jobId: job.id,
        type: job.type,
        attempt: job.attempts,
      });

      // Execute job with timeout
      const config = JOB_CONFIGS[job.type];
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error("Job timeout")), config.timeout);
      });

      const result = await Promise.race([
        processor.process(job),
        timeoutPromise,
      ]);

      // Job completed successfully
      await this.completeJob(job, result);
    } catch (error) {
      const job = await this.cache.get<Job>(`job:${jobId}`);
      if (job) {
        await this.handleJobError(job, error);
      }
    } finally {
      timer();
    }
  }

  // Complete job successfully
  private async completeJob(job: Job, result: any) {
    job.status = "completed";
    job.result = result;
    job.updatedAt = new Date();

    await this.cache.set(`job:${job.id}`, job);
    await this.cache.pipeline([
      ["ZREM", "job_queue", job.id],
      ["EXPIRE", `job:${job.id}`, "86400"], // Keep completed jobs for 24 hours
    ]);

    monitor.log("Background job completed", {
      jobId: job.id,
      type: job.type,
      attempts: job.attempts,
      duration: job.updatedAt.getTime() - job.createdAt.getTime(),
    });

    monitor.metric("background_jobs_completed", 1, {
      type: job.type,
      priority: job.priority,
    });
  }

  // Handle job error
  private async handleJobError(job: Job, error: any) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    if (job.attempts >= job.maxAttempts) {
      await this.failJob(job, errorMessage);
    } else {
      await this.retryJob(job, errorMessage);
    }
  }

  // Fail job after max attempts
  private async failJob(job: Job, error: string) {
    job.status = "failed";
    job.error = error;
    job.updatedAt = new Date();

    await this.cache.set(`job:${job.id}`, job);
    await this.cache.pipeline([
      ["ZREM", "job_queue", job.id],
      ["EXPIRE", `job:${job.id}`, "86400"], // Keep failed jobs for 24 hours
    ]);

    monitor.error("Background job failed", new Error(error), {
      data: {
        jobId: job.id,
        type: job.type,
        attempts: job.attempts,
      },
    });

    monitor.metric("background_jobs_failed", 1, {
      type: job.type,
      priority: job.priority,
    });
  }

  // Retry job with delay
  private async retryJob(job: Job, error: string) {
    const config = JOB_CONFIGS[job.type];
    const retryDelay = config.retryDelay * job.attempts; // Exponential backoff

    job.status = "pending";
    job.error = error;
    job.scheduledAt = new Date(Date.now() + retryDelay);
    job.updatedAt = new Date();

    await this.cache.set(`job:${job.id}`, job);

    // Re-add to queue with new schedule
    const score = this.calculateJobScore(job);
    await this.cache.zadd("job_queue", score, job.id);

    monitor.log("Background job scheduled for retry", {
      jobId: job.id,
      type: job.type,
      attempt: job.attempts,
      retryAt: job.scheduledAt,
      error: error,
    });
  }

  // Get job status
  async getJobStatus(jobId: string): Promise<Job | null> {
    return await this.cache.get<Job>(`job:${jobId}`);
  }

  // Get queue statistics
  async getQueueStats() {
    const stats = {
      pending: await this.cache.pipeline([["ZCARD", "job_queue"]]),
      processing: 0,
      completed: 0,
      failed: 0,
    };

    return stats;
  }

  // Get cache instance for external access (for API routes)
  getCache() {
    return this.cache;
  }

  // Register custom processor
  registerProcessor(type: JobType, processor: JobProcessor) {
    this.processors.set(type, processor);
  }
}

// Job processors
class EmailNotificationProcessor implements JobProcessor {
  async process(job: Job): Promise<any> {
    const { to, subject, html, templateId, templateData } = job.data;

    // Send email via Resend or other service
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "TheSet <notifications@theset.live>",
        to,
        subject,
        html: html || `<p>${subject}</p>`,
        ...(templateId && { template: templateId }),
        ...(templateData && { template_data: templateData }),
      }),
    });

    if (!response.ok) {
      throw new Error(`Email send failed: ${response.status}`);
    }

    const result = await response.json();
    return { messageId: result.id };
  }
}

class DataSyncProcessor implements JobProcessor {
  async process(job: Job): Promise<any> {
    const { source, artistId } = job.data;

    // Sync data from external APIs
    switch (source) {
      case "spotify":
        return await this.syncSpotifyData(artistId);
      case "ticketmaster":
        return await this.syncTicketmasterData(artistId);
      case "setlistfm":
        return await this.syncSetlistFmData(artistId);
      default:
        throw new Error(`Unknown sync source: ${source}`);
    }
  }

  private async syncSpotifyData(artistId: string) {
    // Implementation for Spotify sync
    monitor.log("Syncing Spotify data", { artistId });
    return { synced: true, source: "spotify" };
  }

  private async syncTicketmasterData(artistId: string) {
    // Implementation for Ticketmaster sync
    monitor.log("Syncing Ticketmaster data", { artistId });
    return { synced: true, source: "ticketmaster" };
  }

  private async syncSetlistFmData(artistId: string) {
    // Implementation for SetlistFM sync
    monitor.log("Syncing SetlistFM data", { artistId });
    return { synced: true, source: "setlistfm" };
  }
}

class ImageProcessingProcessor implements JobProcessor {
  async process(job: Job): Promise<any> {
    const { imageUrl, operations } = job.data;

    // Process image (resize, optimize, etc.)
    monitor.log("Processing image", { imageUrl, operations });

    return {
      processed: true,
      originalUrl: imageUrl,
      processedUrl: `${imageUrl}?processed=true`,
    };
  }
}

class AnalyticsProcessingProcessor implements JobProcessor {
  async process(job: Job): Promise<any> {
    const { events, userId, timeRange } = job.data;

    // Process analytics events
    monitor.log("Processing analytics events", {
      eventCount: events.length,
      userId,
      timeRange,
    });

    return {
      processed: events.length,
      insights: {
        totalEvents: events.length,
        uniqueUsers: new Set(events.map((e: any) => e.userId)).size,
      },
    };
  }
}

class CacheWarmingProcessor implements JobProcessor {
  async process(job: Job): Promise<any> {
    const { target, endpoints } = job.data;

    // Warm cache for specific endpoints
    monitor.log("Warming cache", { target, endpointCount: endpoints.length });

    let warmed = 0;
    for (const endpoint of endpoints) {
      try {
        await fetch(endpoint);
        warmed++;
      } catch (error) {
        monitor.error("Cache warming failed for endpoint", error, {
          data: { endpoint },
        });
      }
    }

    return { warmed, total: endpoints.length };
  }
}

class CleanupProcessor implements JobProcessor {
  async process(job: Job): Promise<any> {
    const { type, retentionDays } = job.data;

    // Cleanup old data
    monitor.log("Running cleanup", { type, retentionDays });

    const supabase = createServiceClient();
    const cutoffDate = new Date(
      Date.now() - retentionDays * 24 * 60 * 60 * 1000,
    );

    let deletedCount = 0;

    switch (type) {
      case "logs": {
        const { error: logsError } = await supabase
          .from("logs")
          .delete()
          .lt("_creationTime", cutoffDate.toISOString());

        if (logsError) throw logsError;
        deletedCount = 1; // Would be actual count in real implementation
        break;
      }

      case "sessions": {
        const { error: sessionsError } = await supabase
          .from("user_sessions")
          .delete()
          .lt("_creationTime", cutoffDate.toISOString());

        if (sessionsError) throw sessionsError;
        deletedCount = 1;
        break;
      }

      default:
        throw new Error(`Unknown cleanup type: ${type}`);
    }

    return { deletedCount, type };
  }
}

class TrendingCalculationProcessor implements JobProcessor {
  async process(job: Job): Promise<any> {
    const { period, entities } = job.data;

    // Calculate trending scores
    monitor.log("Calculating trending scores", { period, entities });

    const supabase = createServiceClient();

    // Update trending scores based on votes, views, and recency
    const { error } = await supabase.rpc("calculate_trendingScores", {
      period_hours: period === "daily" ? 24 : period === "weekly" ? 168 : 720,
    });

    if (error) throw error;

    return { calculated: true, period };
  }
}

class UserActivityAnalysisProcessor implements JobProcessor {
  async process(job: Job): Promise<any> {
    const { userId, timeRange } = job.data;

    // Analyze user activity patterns
    monitor.log("Analyzing user activity", { userId, timeRange });

    const supabase = createServiceClient();

    // Get user activity data
    const { data: activities, error } = await supabase
      .from("user_activities")
      .select("*")
      .eq("userId", userId)
      .gte("_creationTime", new Date(Date.now() - timeRange).toISOString());

    if (error) throw error;

    const analysis = {
      totalActivities: activities.length,
      actionTypes: activities.reduce(
        (acc, activity) => {
          acc[activity.action] = (acc[activity.action] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      ),
      timeDistribution: this.analyzeTimeDistribution(activities),
      patterns: this.identifyPatterns(activities),
    };

    return analysis;
  }

  private analyzeTimeDistribution(activities: any[]) {
    const hourCounts = {} as Record<number, number>;

    for (const activity of activities) {
      const hour = new Date(activity._creationTime).getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    }

    return hourCounts;
  }

  private identifyPatterns(_activities: any[]) {
    // TODO: Implement actual pattern identification from activities data
    return {
      mostActiveHour: 14, // Would be calculated from actual data
      preferredActions: ["page_view", "search", "vote"],
      sessionLength: 1200000, // Average session length in ms
    };
  }
}

// Export singleton instance
export const backgroundJobQueue = BackgroundJobQueue.getInstance();

// Utility functions
export async function scheduleJob(
  type: JobType,
  data: any,
  options?: {
    priority?: "low" | "medium" | "high";
    scheduledAt?: Date;
    maxAttempts?: number;
  },
) {
  return await backgroundJobQueue.addJob(type, data, options);
}

export async function getJobStatus(jobId: string) {
  return await backgroundJobQueue.getJobStatus(jobId);
}

// Start job processing on module load
if (typeof process !== "undefined") {
  backgroundJobQueue.start();

  // Graceful shutdown
  process.on("SIGTERM", () => {
    backgroundJobQueue.stop();
  });

  process.on("SIGINT", () => {
    backgroundJobQueue.stop();
  });
}
