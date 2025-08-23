// MySetlist-S4 Enhanced Import Status System
// File: apps/web/lib/import-status.ts
// REPLACE existing incomplete implementation

import { db, importStatus, eq } from "@repo/database";
import { RedisClientFactory } from "./queues/redis-config";

// Import status types
interface ImportStatusUpdate {
  stage: "initializing" | "syncing-identifiers" | "importing-songs" | 
         "importing-shows" | "creating-setlists" | "completed" | "failed";
  progress: number;
  message: string;
  error?: string;
  job_id?: string;
  artist_name?: string;
  total_songs?: number;
  total_shows?: number;
  total_venues?: number;
  completed_at?: Date;
  phase_timings?: Record<string, number>;
  started_at?: Date;
}

interface ImportStatusResponse {
  artistId: string;
  stage: string;
  progress: number;
  message: string;
  error?: string;
  jobId?: string;
  artistName?: string;
  totalSongs?: number;
  totalShows?: number;
  totalVenues?: number;
  completedAt?: Date;
  startedAt?: Date;
  phaseTimings?: Record<string, number>;
  estimatedTimeRemaining?: number;
  timestamp: string;
}

export class ImportStatusManager {
  private static redis = RedisClientFactory.getClient('cache');

  /**
   * Update import status for an artist
   * Writes to both database and Redis for real-time updates
   */
  static async updateImportStatus(
    artistId: string, 
    update: ImportStatusUpdate
  ): Promise<void> {
    try {
      const now = new Date();
      
      // Prepare data for database
      const dbUpdate = {
        artistId,
        stage: update.stage,
        progress: Math.max(0, Math.min(100, update.progress)), // Clamp 0-100
        message: update.message,
        error: update.error || null,
        jobId: update.job_id || null,
        artistName: update.artist_name || null,
        totalSongs: update.total_songs || 0,
        totalShows: update.total_shows || 0,
        totalVenues: update.total_venues || 0,
        completedAt: update.completed_at || null,
        startedAt: update.started_at || (update.stage === 'initializing' ? now : undefined),
        phaseTimings: update.phase_timings ? JSON.stringify(update.phase_timings) : null,
        updatedAt: now,
      };

      // Update database (upsert)
      await db
        .insert(importStatus)
        .values(dbUpdate)
        .onConflictDoUpdate({
          target: importStatus.artistId,
          set: {
            ...dbUpdate,
            // Keep startedAt if it already exists and this isn't an initialization
            startedAt: update.stage === 'initializing' ? now : importStatus.startedAt,
          },
        });

      // Prepare data for Redis and SSE
      const redisData: ImportStatusResponse = {
        artistId,
        stage: update.stage,
        progress: dbUpdate.progress,
        message: update.message,
        error: update.error,
        jobId: update.job_id,
        artistName: update.artist_name,
        totalSongs: update.total_songs,
        totalShows: update.total_shows,
        totalVenues: update.total_venues,
        completedAt: update.completed_at,
        startedAt: update.started_at,
        phaseTimings: update.phase_timings,
        estimatedTimeRemaining: this.calculateTimeRemaining(update),
        timestamp: now.toISOString(),
      };

      // Update Redis cache for quick retrieval
      const cacheKey = `import:status:${update.job_id || artistId}`;
      await this.redis.setex(cacheKey, 300, JSON.stringify(redisData)); // 5 min TTL

      // Publish to Redis channel for SSE
      const channels = [
        `import:progress:${update.job_id}`,
        `import:progress:${artistId}`,
      ].filter(Boolean);

      for (const channel of channels) {
        await this.redis.publish(channel, JSON.stringify({
          type: 'progress',
          ...redisData,
        }));
      }

      console.log(`✅ Import status updated for artist ${artistId}: ${update.stage} (${update.progress}%)`);
      
    } catch (error) {
      console.error("Failed to update import status:", error);
      // Don't throw - status updates should not break the import process
    }
  }

  /**
   * Get import status for an artist
   * Tries Redis first, falls back to database
   */
  static async getImportStatus(
    identifier: string, // artistId or jobId
    type: 'artist' | 'job' = 'artist'
  ): Promise<ImportStatusResponse | null> {
    try {
      // Try Redis first
      const cacheKey = `import:status:${identifier}`;
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      // Fallback to database
      const dbStatus = type === 'artist'
        ? await db
            .select()
            .from(importStatus)
            .where(eq(importStatus.artistId, identifier))
            .get()
        : await db
            .select()
            .from(importStatus)
            .where(eq(importStatus.jobId, identifier))
            .get();

      if (!dbStatus) {
        return null;
      }

      // Convert DB record to response format
      const response: ImportStatusResponse = {
        artistId: dbStatus.artistId,
        stage: dbStatus.stage,
        progress: dbStatus.percentage,
        message: dbStatus.message || '',
        error: dbStatus.error,
        jobId: dbStatus.jobId,
        artistName: dbStatus.artistName,
        totalSongs: dbStatus.totalSongs,
        totalShows: dbStatus.totalShows,
        totalVenues: dbStatus.totalVenues,
        completedAt: dbStatus.completedAt,
        startedAt: dbStatus.startedAt,
        phaseTimings: dbStatus.phaseTimings ? JSON.parse(dbStatus.phaseTimings) : undefined,
        estimatedTimeRemaining: this.calculateTimeRemaining({
          stage: dbStatus.stage,
          progress: dbStatus.percentage,
          started_at: dbStatus.startedAt,
        }),
        timestamp: dbStatus.updatedAt?.toISOString() || new Date().toISOString(),
      };

      // Cache the result
      await this.redis.setex(cacheKey, 300, JSON.stringify(response));

      return response;
      
    } catch (error) {
      console.error("Failed to get import status:", error);
      return null;
    }
  }

  /**
   * Get all active import statuses
   */
  static async getActiveImports(): Promise<ImportStatusResponse[]> {
    try {
      const activeStatuses = await db
        .select()
        .from(importStatus)
        .where(sql`stage NOT IN ('completed', 'failed')`);

      return activeStatuses.map(status => ({
        artistId: status.artistId,
        stage: status.stage,
        progress: status.percentage,
        message: status.message || '',
        error: status.error,
        jobId: status.jobId,
        artistName: status.artistName,
        totalSongs: status.totalSongs,
        totalShows: status.totalShows,
        totalVenues: status.totalVenues,
        completedAt: status.completedAt,
        startedAt: status.startedAt,
        phaseTimings: status.phaseTimings ? JSON.parse(status.phaseTimings) : undefined,
        estimatedTimeRemaining: this.calculateTimeRemaining({
          stage: status.stage,
          progress: status.percentage,
          started_at: status.startedAt,
        }),
        timestamp: status.updatedAt?.toISOString() || new Date().toISOString(),
      }));
      
    } catch (error) {
      console.error("Failed to get active imports:", error);
      return [];
    }
  }

  /**
   * Clean up completed import statuses older than specified time
   */
  static async cleanupCompletedImports(olderThanHours: number = 24): Promise<number> {
    try {
      const cutoffTime = new Date(Date.now() - olderThanHours * 60 * 60 * 1000);
      
      const result = await db
        .delete(importStatus)
        .where(
          sql`
            stage IN ('completed', 'failed') 
            AND updated_at < ${cutoffTime.toISOString()}
          `
        );

      console.log(`🧹 Cleaned up ${result.rowCount || 0} completed import statuses`);
      return result.rowCount || 0;
      
    } catch (error) {
      console.error("Failed to cleanup import statuses:", error);
      return 0;
    }
  }

  /**
   * Calculate estimated time remaining based on progress and stage
   */
  private static calculateTimeRemaining(update: {
    stage: string;
    progress: number;
    started_at?: Date;
    phase_timings?: Record<string, number>;
  }): number | undefined {
    if (!update.started_at || update.progress >= 100) {
      return undefined;
    }

    const elapsed = Date.now() - update.started_at.getTime();
    
    // Stage-based time estimates (in seconds)
    const stageEstimates = {
      'initializing': 5,
      'syncing-identifiers': 10,
      'importing-songs': 30,
      'importing-shows': 20,
      'creating-setlists': 5,
    };

    const currentStageEstimate = stageEstimates[update.stage] || 10;
    
    if (update.progress > 0) {
      // Calculate based on current progress
      const estimatedTotal = (elapsed / (update.progress / 100));
      return Math.max(0, Math.floor((estimatedTotal - elapsed) / 1000));
    } else {
      // Fallback to stage estimate
      return currentStageEstimate;
    }
  }

  /**
   * Create a new import session
   */
  static async createImportSession(artistId: string, jobId: string): Promise<void> {
    await this.updateImportStatus(artistId, {
      stage: 'initializing',
      progress: 0,
      message: 'Import session created',
      job_id: jobId,
      started_at: new Date(),
    });
  }

  /**
   * Mark import as failed with error details
   */
  static async markImportFailed(
    artistId: string,
    error: string,
    jobId?: string
  ): Promise<void> {
    await this.updateImportStatus(artistId, {
      stage: 'failed',
      progress: 0,
      message: 'Import failed',
      error,
      job_id: jobId,
      completed_at: new Date(),
    });
  }

  /**
   * Mark import as completed
   */
  static async markImportCompleted(
    artistId: string,
    totals: {
      songs?: number;
      shows?: number;
      venues?: number;
    },
    jobId?: string
  ): Promise<void> {
    await this.updateImportStatus(artistId, {
      stage: 'completed',
      progress: 100,
      message: 'Import completed successfully',
      job_id: jobId,
      total_songs: totals.songs,
      total_shows: totals.shows,
      total_venues: totals.venues,
      completed_at: new Date(),
    });
  }

  /**
   * Get import statistics
   */
  static async getImportStatistics(days: number = 7): Promise<{
    totalImports: number;
    successfulImports: number;
    failedImports: number;
    averageDuration: number;
    inProgress: number;
  }> {
    try {
      const cutoffTime = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const stats = await db
        .select({
          total: sql<number>`COUNT(*)`,
          successful: sql<number>`COUNT(CASE WHEN stage = 'completed' THEN 1 END)`,
          failed: sql<number>`COUNT(CASE WHEN stage = 'failed' THEN 1 END)`,
          inProgress: sql<number>`COUNT(CASE WHEN stage NOT IN ('completed', 'failed') THEN 1 END)`,
          avgDuration: sql<number>`
            AVG(
              EXTRACT(EPOCH FROM (completed_at - started_at))
            ) FILTER (
              WHERE completed_at IS NOT NULL 
              AND started_at IS NOT NULL 
              AND stage = 'completed'
            )
          `,
        })
        .from(importStatus)
        .where(sql`updated_at >= ${cutoffTime.toISOString()}`)
        .get();

      return {
        totalImports: stats?.total || 0,
        successfulImports: stats?.successful || 0,
        failedImports: stats?.failed || 0,
        averageDuration: stats?.avgDuration || 0,
        inProgress: stats?.inProgress || 0,
      };
      
    } catch (error) {
      console.error("Failed to get import statistics:", error);
      return {
        totalImports: 0,
        successfulImports: 0,
        failedImports: 0,
        averageDuration: 0,
        inProgress: 0,
      };
    }
  }
}

// Export convenience functions for backward compatibility
export const updateImportStatus = ImportStatusManager.updateImportStatus;
export const getImportStatus = ImportStatusManager.getImportStatus;

// Export types
export type { ImportStatusUpdate, ImportStatusResponse };