import type { SimpleJob } from "../types";
import { updateImportStatus } from "../../import-status";
import { getRedisPubClient } from "../redis-config";

export interface ProgressUpdateJobData {
  jobId: string;
  stage: string;
  progress: number;
  message: string;
  artistId?: string;
  artistName?: string;
  error?: string;
  metadata?: Record<string, any>;
}

export async function processProgressUpdate(job: SimpleJob<ProgressUpdateJobData>) {
  const { jobId, stage, progress, message, artistId, artistName, error, metadata } = job.data;
  
  try {
    await job.log(`Broadcasting progress update for job ${jobId}: ${message}`);
    
    // Update import status
    await updateImportStatus(jobId, {
      stage: stage as any,
      progress,
      message,
      artistId,
      artistName,
      error,
      ...metadata,
    });
    
    // Also send to any SSE listeners
    const redis = getRedisPubClient();
    await redis.publish(`progress:${jobId}`, JSON.stringify({
      jobId,
      stage,
      progress,
      message,
      artistId,
      artistName,
      error,
      timestamp: new Date().toISOString(),
      ...metadata,
    }));
    
    // Global progress channel for monitoring
    await redis.publish('global:progress', JSON.stringify({
      jobId,
      stage,
      progress,
      message,
      artistId,
      timestamp: new Date().toISOString(),
    }));
    
    return {
      success: true,
      jobId,
      stage,
      progress,
    };
    
  } catch (error) {
    console.error(`Progress update failed for job ${jobId}:`, error);
    throw error;
  }
}

// Helper function to queue progress updates
export async function queueProgressUpdate(
  jobId: string,
  stage: string,
  progress: number,
  message: string,
  options?: {
    artistId?: string;
    artistName?: string;
    error?: string;
    metadata?: Record<string, any>;
  }
) {
  const { queueManager, QueueName } = await import("../queue-manager");
  
  return await queueManager.addJob(
    QueueName.PROGRESS_UPDATE,
    `progress-${jobId}-${Date.now()}`,
    {
      jobId,
      stage,
      progress,
      message,
      ...options,
    },
    {
      priority: 1, // High priority for real-time updates
      removeOnComplete: { count: 10 },
      removeOnFail: { count: 5 },
    }
  );
}