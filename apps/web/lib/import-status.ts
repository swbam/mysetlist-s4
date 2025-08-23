// MySetlist-S4 Enhanced Import Status System
// File: apps/web/lib/import-status.ts
// REPLACE existing incomplete implementation

import { createServiceClient } from "./supabase/server";
import { RedisClientFactory } from "./queues/redis-config";

// Import status types
export interface ImportStatus {
  stage: 
    | "initializing"
    | "syncing-identifiers"
    | "importing-songs"
    | "importing-shows"
    | "creating-setlists"
    | "completed"
    | "failed";
  progress: number;
  message: string;
  error?: string;
  artistId?: string;
  artistName?: string;
  slug?: string;
  totalSongs?: number;
  totalShows?: number;
  totalVenues?: number;
  completedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  jobId?: string;
  phaseTimings?: Record<string, number>;
  estimatedTimeRemaining?: number;
}

export class ImportStatusManager {
  private static redis = RedisClientFactory.getClient('cache');

  /**
   * Update import status for an artist
   * Writes to both database and Redis for real-time updates
   */
  static async updateImportStatus(
    jobId: string,
    status: Partial<ImportStatus>
  ): Promise<void> {
    try {
      const now = new Date().toISOString();
      
      // Prepare full status
      const fullStatus: ImportStatus = {
        ...status,
        jobId,
        updatedAt: now,
        progress: Math.max(0, Math.min(100, status.progress || 0)), // Clamp 0-100
        estimatedTimeRemaining: this.calculateTimeRemaining(status),
      } as ImportStatus;

      // Update Redis cache for quick retrieval
      const cacheKey = `import:status:${jobId}`;
      await this.redis.setex(cacheKey, 300, JSON.stringify(fullStatus)); // 5 min TTL

      // Publish to Redis channel for SSE
      const channels = [
        `import:progress:${jobId}`,
        status.artistId ? `import:progress:${status.artistId}` : null,
      ].filter(Boolean) as string[];

      for (const channel of channels) {
        await this.redis.publish(channel, JSON.stringify({
          type: 'progress',
          ...fullStatus,
        }));
      }

      // Update database for persistence
      const supabase = createServiceClient();

      // Check if record exists
      const { data: existing } = await supabase
        .from("import_status")
        .select("job_id")
        .eq("job_id", jobId)
        .single();

      const updateData = {
        job_id: jobId,
        stage: status.stage,
        percentage: status.progress || 0,
        message: status.message || "",
        error: status.error || null,
        artist_id: status.artistId || null,
        artist_name: status.artistName || null,
        total_songs: status.totalSongs || null,
        total_shows: status.totalShows || null,
        total_venues: status.totalVenues || null,
        completed_at: status.completedAt || null,
        phase_timings: status.phaseTimings ? JSON.stringify(status.phaseTimings) : null,
        updated_at: now,
        ...(existing ? {} : { created_at: now }),
      };

      const { error } = await supabase.from("import_status").upsert(updateData);
      
      if (error) {
        console.error(`[IMPORT STATUS] Failed to update status for ${jobId}:`, error);
      }

      console.log(`✅ Import status updated for job ${jobId}: ${status.stage} (${status.progress}%)`);
      
    } catch (error) {
      console.error("Failed to update import status:", error);
      // Don't throw - status updates should not break the import process
    }
  }

  /**
   * Get import status for a job
   * Tries Redis first, falls back to database
   */
  static async getImportStatus(
    identifier: string, // jobId or artistId
    type: 'job' | 'artist' = 'job'
  ): Promise<ImportStatus | null> {
    try {
      // Try Redis first
      const cacheKey = `import:status:${identifier}`;
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      // Fallback to database
      const supabase = createServiceClient();

      const query = type === 'job'
        ? supabase.from("import_status").select("*").eq("job_id", identifier)
        : supabase.from("import_status").select("*").eq("artist_id", identifier).order('updated_at', { ascending: false }).limit(1);

      const { data, error } = await query.single();

      if (error || !data) {
        return null;
      }

      // Convert DB record to status format
      const status: ImportStatus = {
        stage: data.stage,
        progress: data.percentage || 0,
        message: data.message || "",
        error: data.error,
        artistId: data.artist_id,
        artistName: data.artist_name,
        totalSongs: data.total_songs,
        totalShows: data.total_shows,
        totalVenues: data.total_venues,
        completedAt: data.completed_at,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        jobId: data.job_id,
        phaseTimings: data.phase_timings ? JSON.parse(data.phase_timings) : undefined,
        estimatedTimeRemaining: this.calculateTimeRemaining({
          stage: data.stage,
          progress: data.percentage,
          createdAt: data.created_at,
        }),
      };

      // Cache the result
      await this.redis.setex(cacheKey, 60, JSON.stringify(status)); // 1 min cache

      return status;
      
    } catch (error) {
      console.error("Failed to get import status:", error);
      return null;
    }
  }

  /**
   * Get all active import statuses
   */
  static async getActiveImports(): Promise<ImportStatus[]> {
    try {
      const supabase = createServiceClient();

      const { data, error } = await supabase
        .from("import_status")
        .select("*")
        .not('stage', 'in', '(completed,failed)')
        .order('updated_at', { ascending: false });

      if (error || !data) {
        return [];
      }

      return data.map(row => ({
        stage: row.stage,
        progress: row.percentage || 0,
        message: row.message || "",
        error: row.error,
        artistId: row.artist_id,
        artistName: row.artist_name,
        totalSongs: row.total_songs,
        totalShows: row.total_shows,
        totalVenues: row.total_venues,
        completedAt: row.completed_at,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        jobId: row.job_id,
        phaseTimings: row.phase_timings ? JSON.parse(row.phase_timings) : undefined,
        estimatedTimeRemaining: this.calculateTimeRemaining({
          stage: row.stage,
          progress: row.percentage,
          createdAt: row.created_at,
        }),
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
      const supabase = createServiceClient();
      const cutoffTime = new Date(Date.now() - olderThanHours * 60 * 60 * 1000).toISOString();
      
      const { data, error } = await supabase
        .from("import_status")
        .delete()
        .in('stage', ['completed', 'failed'])
        .lt('updated_at', cutoffTime)
        .select('job_id');

      const count = data?.length || 0;
      console.log(`🧹 Cleaned up ${count} completed import statuses`);
      return count;
      
    } catch (error) {
      console.error("Failed to cleanup import statuses:", error);
      return 0;
    }
  }

  /**
   * Calculate estimated time remaining based on progress and stage
   */
  private static calculateTimeRemaining(status: Partial<ImportStatus>): number | undefined {
    if (!status.createdAt || !status.progress || status.progress >= 100) {
      return undefined;
    }

    const startTime = new Date(status.createdAt).getTime();
    const elapsed = Date.now() - startTime;
    
    // Stage-based time estimates (in seconds)
    const stageEstimates = {
      'initializing': 5,
      'syncing-identifiers': 10,
      'importing-songs': 30,
      'importing-shows': 20,
      'creating-setlists': 5,
    };

    const currentStageEstimate = status.stage ? stageEstimates[status.stage] || 10 : 10;
    
    if (status.progress > 0) {
      // Calculate based on current progress
      const estimatedTotal = (elapsed / (status.progress / 100));
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
    await this.updateImportStatus(jobId, {
      stage: 'initializing',
      progress: 0,
      message: 'Import session created',
      artistId,
      createdAt: new Date().toISOString(),
    });
  }

  /**
   * Mark import as failed with error details
   */
  static async markImportFailed(
    jobId: string,
    error: string,
    artistId?: string
  ): Promise<void> {
    await this.updateImportStatus(jobId, {
      stage: 'failed',
      progress: 0,
      message: 'Import failed',
      error,
      artistId,
      completedAt: new Date().toISOString(),
    });
  }

  /**
   * Mark import as completed
   */
  static async markImportCompleted(
    jobId: string,
    totals: {
      songs?: number;
      shows?: number;
      venues?: number;
    },
    artistId?: string
  ): Promise<void> {
    await this.updateImportStatus(jobId, {
      stage: 'completed',
      progress: 100,
      message: 'Import completed successfully',
      artistId,
      totalSongs: totals.songs,
      totalShows: totals.shows,
      totalVenues: totals.venues,
      completedAt: new Date().toISOString(),
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
      const supabase = createServiceClient();
      const cutoffTime = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

      const { data, error } = await supabase
        .from("import_status")
        .select("*")
        .gte('updated_at', cutoffTime);

      if (error || !data) {
        return {
          totalImports: 0,
          successfulImports: 0,
          failedImports: 0,
          averageDuration: 0,
          inProgress: 0,
        };
      }

      const stats = {
        totalImports: data.length,
        successfulImports: data.filter(d => d.stage === 'completed').length,
        failedImports: data.filter(d => d.stage === 'failed').length,
        inProgress: data.filter(d => !['completed', 'failed'].includes(d.stage)).length,
        averageDuration: 0,
      };

      // Calculate average duration for completed imports
      const completedImports = data.filter(d => 
        d.stage === 'completed' && d.created_at && d.completed_at
      );

      if (completedImports.length > 0) {
        const totalDuration = completedImports.reduce((sum, imp) => {
          const duration = new Date(imp.completed_at).getTime() - new Date(imp.created_at).getTime();
          return sum + duration;
        }, 0);
        
        stats.averageDuration = Math.floor(totalDuration / completedImports.length / 1000); // in seconds
      }

      return stats;
      
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
export const updateImportStatus = (jobId: string, status: Partial<ImportStatus>) => 
  ImportStatusManager.updateImportStatus(jobId, status);

export const getImportStatus = (jobId: string) => 
  ImportStatusManager.getImportStatus(jobId);

// Export for SSE endpoints
export const getActiveImports = () => ImportStatusManager.getActiveImports();
export const cleanupCompletedImports = (hours?: number) => ImportStatusManager.cleanupCompletedImports(hours);
export const getImportStatistics = (days?: number) => ImportStatusManager.getImportStatistics(days);