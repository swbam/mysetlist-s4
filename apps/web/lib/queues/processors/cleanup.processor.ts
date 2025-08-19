import { Job } from "bullmq";
import { db, importStatus } from "@repo/database";
import { sql } from "drizzle-orm";
import { queueManager, QueueName } from "../queue-manager";
import { RedisCache, closeRedisConnections } from "../redis-config";

const cache = new RedisCache();

export interface CleanupJobData {
  type: 'old_jobs' | 'failed_jobs' | 'cache' | 'import_logs' | 'temp_files' | 'all';
  maxAge?: number; // in milliseconds
  batchSize?: number;
}

export async function processCleanup(job: Job<CleanupJobData>) {
  const { type, maxAge = 7 * 24 * 60 * 60 * 1000, batchSize = 1000 } = job.data; // Default 7 days
  
  try {
    await job.log(`Starting cleanup for ${type}`);
    await job.updateProgress(10);
    
    let cleaned = 0;
    
    switch (type) {
      case 'old_jobs':
        cleaned = await cleanupOldJobs(maxAge);
        break;
      
      case 'failed_jobs':
        cleaned = await cleanupFailedJobs(maxAge);
        break;
      
      case 'cache':
        cleaned = await cleanupCache();
        break;
      
      case 'import_logs':
        cleaned = await cleanupImportLogs(maxAge, batchSize);
        break;
      
      case 'temp_files':
        cleaned = await cleanupTempFiles();
        break;
      
      case 'all':
        cleaned = await cleanupAll(maxAge, batchSize, job);
        break;
      
      default:
        throw new Error(`Unknown cleanup type: ${type}`);
    }
    
    await job.updateProgress(100);
    await job.log(`Cleanup completed for ${type}: ${cleaned} items removed`);
    
    return {
      success: true,
      type,
      itemsCleaned: cleaned,
    };
    
  } catch (error) {
    console.error(`Cleanup failed for ${type}:`, error);
    throw error;
  }
}

async function cleanupOldJobs(maxAge: number): Promise<number> {
  let totalCleaned = 0;
  
  // Clean completed and failed jobs from all queues
  for (const queueName of Object.values(QueueName)) {
    try {
      const queue = queueManager.getQueue(queueName);
      
      // Clean completed jobs older than maxAge
      const completedCleaned = await queue.clean(maxAge, 0, 'completed');
      
      // Clean failed jobs older than maxAge
      const failedCleaned = await queue.clean(maxAge, 0, 'failed');
      
      totalCleaned += completedCleaned.length + failedCleaned.length;
      
      console.log(`Cleaned ${completedCleaned.length + failedCleaned.length} jobs from queue ${queueName}`);
    } catch (error) {
      console.error(`Failed to clean queue ${queueName}:`, error);
    }
  }
  
  return totalCleaned;
}

async function cleanupFailedJobs(maxAge: number): Promise<number> {
  let totalCleaned = 0;
  
  // Only clean failed jobs
  for (const queueName of Object.values(QueueName)) {
    try {
      const queue = queueManager.getQueue(queueName);
      const failedCleaned = await queue.clean(maxAge, 0, 'failed');
      totalCleaned += failedCleaned.length;
      
      console.log(`Cleaned ${failedCleaned.length} failed jobs from queue ${queueName}`);
    } catch (error) {
      console.error(`Failed to clean failed jobs from queue ${queueName}:`, error);
    }
  }
  
  return totalCleaned;
}

async function cleanupCache(): Promise<number> {
  // This is a simplified version - in a real implementation you'd want to:
  // 1. Get all cache keys
  // 2. Check their TTL
  // 3. Remove expired keys
  // 4. Remove keys based on patterns (e.g., old search results)
  
  console.log("Cache cleanup completed (placeholder implementation)");
  return 0; // Placeholder
}

async function cleanupImportLogs(maxAge: number, batchSize: number): Promise<number> {
  try {
    const cutoffDate = new Date(Date.now() - maxAge);
    
    // Delete old import status records
    const result = await db.execute(sql`
      DELETE FROM import_status
      WHERE created_at < ${cutoffDate.toISOString()}
      LIMIT ${batchSize}
    `);
    
    const deletedCount = (result as any).rowCount || 0;
    console.log(`Cleaned ${deletedCount} import log entries`);
    
    return deletedCount;
  } catch (error) {
    console.error("Failed to cleanup import logs:", error);
    return 0;
  }
}

async function cleanupTempFiles(): Promise<number> {
  // Placeholder for temp file cleanup
  // In a real implementation, you would:
  // 1. Scan temp directories
  // 2. Remove files older than a certain age
  // 3. Remove empty directories
  
  console.log("Temp file cleanup completed (placeholder implementation)");
  return 0;
}

async function cleanupAll(maxAge: number, batchSize: number, job: Job): Promise<number> {
  let totalCleaned = 0;
  
  // Old jobs cleanup
  await job.updateProgress(20);
  const oldJobs = await cleanupOldJobs(maxAge);
  totalCleaned += oldJobs;
  
  // Failed jobs cleanup
  await job.updateProgress(40);
  const failedJobs = await cleanupFailedJobs(maxAge);
  totalCleaned += failedJobs;
  
  // Cache cleanup
  await job.updateProgress(60);
  const cacheItems = await cleanupCache();
  totalCleaned += cacheItems;
  
  // Import logs cleanup
  await job.updateProgress(80);
  const importLogs = await cleanupImportLogs(maxAge, batchSize);
  totalCleaned += importLogs;
  
  // Temp files cleanup
  await job.updateProgress(90);
  const tempFiles = await cleanupTempFiles();
  totalCleaned += tempFiles;
  
  return totalCleaned;
}

// Helper function to queue cleanup jobs
export async function queueCleanup(
  type: CleanupJobData['type'],
  options?: {
    maxAge?: number;
    batchSize?: number;
    delay?: number;
  }
) {
  return await queueManager.addJob(
    QueueName.CLEANUP,
    `cleanup-${type}-${Date.now()}`,
    {
      type,
      maxAge: options?.maxAge || 7 * 24 * 60 * 60 * 1000, // Default 7 days
      batchSize: options?.batchSize || 1000,
    },
    {
      priority: 50, // Lowest priority
      delay: options?.delay || 0,
      removeOnComplete: { count: 10 },
      removeOnFail: { count: 5 },
    }
  );
}

// Schedule regular cleanup jobs
export async function scheduleRegularCleanup() {
  // Daily cleanup of old jobs
  await queueManager.scheduleRecurringJob(
    QueueName.CLEANUP,
    'daily-job-cleanup',
    { type: 'old_jobs', maxAge: 3 * 24 * 60 * 60 * 1000 }, // 3 days
    { pattern: '0 2 * * *' }, // Daily at 2 AM
    { priority: 50 }
  );
  
  // Weekly full cleanup
  await queueManager.scheduleRecurringJob(
    QueueName.CLEANUP,
    'weekly-full-cleanup',
    { type: 'all', maxAge: 7 * 24 * 60 * 60 * 1000 }, // 7 days
    { pattern: '0 3 * * 0' }, // Weekly on Sunday at 3 AM
    { priority: 50 }
  );
  
  console.log("Regular cleanup jobs scheduled");
}