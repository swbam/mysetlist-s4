// MySetlist-S4 Enhanced Import Status System (DB + Redis)
// File: apps/web/lib/import-status.ts

import { db, importStatus, eq, sql } from "@repo/database";
import { RedisClientFactory } from "./queues/redis-config";

// Types per NEWDOCS
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
  error?: string | undefined;
  jobId?: string;
  artistName?: string;
  totalSongs?: number;
  totalShows?: number;
  totalVenues?: number;
  completedAt?: Date | undefined;
  startedAt?: Date | undefined;
  phaseTimings?: Record<string, number> | undefined;
  estimatedTimeRemaining?: number | undefined;
  timestamp: string;
}

export class ImportStatusManager {
  private static redis = RedisClientFactory.getClient('cache');

  static async updateImportStatus(
    artistId: string, 
    update: ImportStatusUpdate
  ): Promise<void> {
    try {
      const now = new Date();
      
      const dbUpdate = {
        artistId,
        stage: update.stage,
        percentage: Math.max(0, Math.min(100, update.progress)),
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
      } as any;

      await db
        .insert(importStatus)
        .values(dbUpdate)
        .onConflictDoUpdate({
          target: importStatus.artistId,
          set: {
            ...dbUpdate,
            startedAt: update.stage === 'initializing' ? now : importStatus.startedAt,
          },
        });

      const redisData: ImportStatusResponse = {
        artistId,
        stage: update.stage,
        progress: dbUpdate.percentage,
        message: update.message,
        ...(update.error ? { error: update.error } : {}),
        ...(update.job_id ? { jobId: update.job_id } : {}),
        ...(update.artist_name ? { artistName: update.artist_name } : {}),
        ...(update.total_songs !== undefined ? { totalSongs: update.total_songs } : {}),
        ...(update.total_shows !== undefined ? { totalShows: update.total_shows } : {}),
        ...(update.total_venues !== undefined ? { totalVenues: update.total_venues } : {}),
        ...(update.completed_at ? { completedAt: update.completed_at } : {}),
        ...(update.started_at ? { startedAt: update.started_at } : {}),
        ...(update.phase_timings ? { phaseTimings: update.phase_timings } : {}),
        estimatedTimeRemaining: this.calculateTimeRemaining({
          stage: update.stage,
          progress: dbUpdate.percentage,
          ...(update.started_at ? { started_at: update.started_at } : {}),
        }),
        timestamp: now.toISOString(),
      } as ImportStatusResponse;

      const cacheKey = `import:status:${update.job_id ?? artistId}`;
      await this.redis.setex(cacheKey, 300, JSON.stringify(redisData));

      const channels = [
        update.job_id ? `import:progress:${update.job_id}` : null,
        `import:progress:${artistId}`,
      ].filter(Boolean) as string[];

      for (const channel of channels) {
        await this.redis.publish(channel, JSON.stringify({ type: 'progress', ...redisData }));
      }

    } catch (error) {
      console.error("Failed to update import status:", error);
    }
  }

  static async getImportStatus(
    identifier: string,
    type: 'artist' | 'job' = 'artist'
  ): Promise<ImportStatusResponse | null> {
    try {
      const cacheKey = `import:status:${identifier}`;
      const cached = await this.redis.get(cacheKey);
      if (cached) return JSON.parse(cached);

      const dbRows = type === 'artist'
        ? await db.select().from(importStatus).where(eq(importStatus.artistId, identifier)).limit(1)
        : await db.select().from(importStatus).where(eq(importStatus.jobId, identifier)).limit(1);
      const dbStatus = Array.isArray(dbRows) ? dbRows[0] : dbRows;

      if (!dbStatus) return null;

      const response: ImportStatusResponse = {
        artistId: dbStatus.artistId,
        stage: dbStatus.stage,
        progress: Number(dbStatus.percentage ?? 0),
        message: dbStatus.message || '',
        ...(dbStatus.error ? { error: dbStatus.error } : {}),
        ...(dbStatus.jobId ? { jobId: dbStatus.jobId } : {}),
        ...(dbStatus.artistName ? { artistName: dbStatus.artistName } : {}),
        ...(dbStatus.totalSongs !== null && dbStatus.totalSongs !== undefined ? { totalSongs: dbStatus.totalSongs } : {}),
        ...(dbStatus.totalShows !== null && dbStatus.totalShows !== undefined ? { totalShows: dbStatus.totalShows } : {}),
        ...(dbStatus.totalVenues !== null && dbStatus.totalVenues !== undefined ? { totalVenues: dbStatus.totalVenues } : {}),
        ...(dbStatus.completedAt ? { completedAt: dbStatus.completedAt } : {}),
        ...(dbStatus.startedAt ? { startedAt: dbStatus.startedAt } : {}),
        ...(typeof dbStatus.phaseTimings === 'string' ? { phaseTimings: JSON.parse(dbStatus.phaseTimings) } : {}),
        estimatedTimeRemaining: this.calculateTimeRemaining({
          stage: dbStatus.stage,
          progress: Number(dbStatus.percentage ?? 0),
          ...(dbStatus.startedAt ? { started_at: dbStatus.startedAt } : {}),
        }),
        timestamp: dbStatus.updatedAt?.toISOString() || new Date().toISOString(),
      } as ImportStatusResponse;

      await this.redis.setex(cacheKey, 300, JSON.stringify(response));
      return response;
    } catch (error) {
      console.error("Failed to get import status:", error);
      return null;
    }
  }

  static async getActiveImports(): Promise<ImportStatusResponse[]> {
    try {
      const rows = await db.select().from(importStatus).where(sql`stage NOT IN ('completed','failed')`);
      return rows.map((status: any) => ({
        artistId: status.artistId,
        stage: status.stage,
        progress: Number(status.percentage ?? 0),
        message: status.message || '',
        ...(status.error ? { error: status.error } : {}),
        ...(status.jobId ? { jobId: status.jobId } : {}),
        ...(status.artistName ? { artistName: status.artistName } : {}),
        ...(status.totalSongs !== null && status.totalSongs !== undefined ? { totalSongs: status.totalSongs } : {}),
        ...(status.totalShows !== null && status.totalShows !== undefined ? { totalShows: status.totalShows } : {}),
        ...(status.totalVenues !== null && status.totalVenues !== undefined ? { totalVenues: status.totalVenues } : {}),
        ...(status.completedAt ? { completedAt: status.completedAt } : {}),
        ...(status.startedAt ? { startedAt: status.startedAt } : {}),
        ...(typeof status.phaseTimings === 'string' ? { phaseTimings: JSON.parse(status.phaseTimings) } : {}),
        estimatedTimeRemaining: this.calculateTimeRemaining({
          stage: status.stage,
          progress: Number(status.percentage ?? 0),
          ...(status.startedAt ? { started_at: status.startedAt } : {}),
        }),
        timestamp: status.updatedAt?.toISOString() || new Date().toISOString(),
      }));
    } catch (error) {
      console.error("Failed to get active imports:", error);
      return [];
    }
  }

  static async cleanupCompletedImports(olderThanHours: number = 24): Promise<number> {
    try {
      const cutoffTime = new Date(Date.now() - olderThanHours * 3600 * 1000).toISOString();
      const result: any = await db
        .delete(importStatus)
        .where(sql`stage IN ('completed','failed') AND updated_at < ${cutoffTime}`);
      return result?.rowCount || 0;
    } catch (error) {
      console.error("Failed to cleanup import statuses:", error);
      return 0;
    }
  }

  private static calculateTimeRemaining(update: {
    stage: string;
    progress: number;
    started_at?: Date;
  }): number | undefined {
    if (!update.started_at || update.progress >= 100) return undefined;
    const elapsed = Date.now() - update.started_at.getTime();
    const stageEstimates: Record<string, number> = {
      'initializing': 5,
      'syncing-identifiers': 10,
      'importing-songs': 30,
      'importing-shows': 20,
      'creating-setlists': 5,
    };
    const current = stageEstimates[update.stage] ?? 10;
    if (update.progress > 0) {
      const estimatedTotal = elapsed / (update.progress / 100);
      return Math.max(0, Math.floor((estimatedTotal - elapsed) / 1000));
    }
    return current;
  }

  static async createImportSession(artistId: string, jobId: string): Promise<void> {
    await this.updateImportStatus(artistId, {
      stage: 'initializing',
      progress: 0,
      message: 'Import session created',
      job_id: jobId,
      started_at: new Date(),
    });
  }

  static async markImportFailed(artistId: string, error: string, jobId?: string): Promise<void> {
    await this.updateImportStatus(artistId, {
      stage: 'failed',
      progress: 0,
      message: 'Import failed',
      error,
      ...(jobId ? { job_id: jobId } : {} as any),
      completed_at: new Date(),
    });
  }

  static async markImportCompleted(
    artistId: string,
    totals: { songs?: number; shows?: number; venues?: number },
    jobId?: string
  ): Promise<void> {
    await this.updateImportStatus(artistId, {
      stage: 'completed',
      progress: 100,
      message: 'Import completed successfully',
      ...(jobId ? { job_id: jobId } : {} as any),
      total_songs: totals.songs,
      total_shows: totals.shows,
      total_venues: totals.venues,
      completed_at: new Date(),
    });
  }

  static async getImportStatistics(days: number = 7): Promise<{
    totalImports: number; successfulImports: number; failedImports: number; averageDuration: number; inProgress: number;
  }> {
    try {
      const cutoffTime = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
      const statsRows = await db
        .select({
          total: sql<number>`COUNT(*)`,
          successful: sql<number>`COUNT(CASE WHEN stage = 'completed' THEN 1 END)`,
          failed: sql<number>`COUNT(CASE WHEN stage = 'failed' THEN 1 END)`,
          inProgress: sql<number>`COUNT(CASE WHEN stage NOT IN ('completed','failed') THEN 1 END)`,
          avgDuration: sql<number>`
            AVG(
              EXTRACT(EPOCH FROM (completed_at - started_at))
            ) FILTER (WHERE completed_at IS NOT NULL AND started_at IS NOT NULL AND stage = 'completed')
          `,
        })
        .from(importStatus)
        .where(sql`updated_at >= ${cutoffTime}`)
        .limit(1) as any;
      const stats = Array.isArray(statsRows) ? statsRows[0] : statsRows;

      return {
        totalImports: stats?.total || 0,
        successfulImports: stats?.successful || 0,
        failedImports: stats?.failed || 0,
        averageDuration: stats?.avgDuration || 0,
        inProgress: stats?.inProgress || 0,
      };
    } catch (error) {
      console.error("Failed to get import statistics:", error);
      return { totalImports: 0, successfulImports: 0, failedImports: 0, averageDuration: 0, inProgress: 0 };
    }
  }
}

export const updateImportStatus = ImportStatusManager.updateImportStatus.bind(ImportStatusManager);
export const getImportStatus = ImportStatusManager.getImportStatus.bind(ImportStatusManager);
export const getActiveImports = ImportStatusManager.getActiveImports.bind(ImportStatusManager);
export const cleanupCompletedImports = ImportStatusManager.cleanupCompletedImports.bind(ImportStatusManager);
export const getImportStatistics = ImportStatusManager.getImportStatistics.bind(ImportStatusManager);