/**
 * Job Processors Index
 * Central registry for all background job processors
 */

import { ArtistImportOrchestrator } from '../../services/orchestrators/artist-import-orchestrator';
import { TicketmasterIngest } from '../../services/ingest/ticketmaster-ingest';
import { SpotifyCatalogIngest } from '../../services/ingest/spotify-catalog-ingest';
import { calculateTrendingScores } from '../trending-calculator';
import { db, artists } from '@repo/database';
import { eq, and, lt, isNull, or } from 'drizzle-orm';

export interface JobContext {
  jobId: string;
  priority: 'high' | 'medium' | 'low';
  retryCount?: number;
  metadata?: Record<string, any>;
}

export interface JobResult {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
}

/**
 * Artist Import Processor - Handles complete artist data import
 */
export class ArtistImportProcessor {
  static async process(
    payload: { tmAttractionId: string; config?: any },
    context: JobContext
  ): Promise<JobResult> {
    try {
      const orchestrator = new ArtistImportOrchestrator(payload.config);
      
      // First initiate the import to get artist ID
      const { artistId, slug } = await orchestrator.initiateImport(payload.tmAttractionId);
      
      // Then run the full import
      const result = await orchestrator.runFullImport(artistId);
      
      return {
        success: result.success,
        message: result.success 
          ? `Artist import completed: ${result.stats?.songsImported} songs, ${result.stats?.showsImported} shows`
          : `Artist import failed: ${result.error}`,
        data: {
          artistId: result.artistId,
          slug: result.slug,
          stats: result.stats,
        },
        error: result.error,
      };
    } catch (error) {
      console.error('ArtistImportProcessor failed:', error);
      return {
        success: false,
        message: 'Artist import processing failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

/**
 * Batch Artist Import Processor - Handles multiple artist imports
 */
export class BatchArtistImportProcessor {
  static async process(
    payload: { tmAttractionIds: string[]; config?: any },
    context: JobContext
  ): Promise<JobResult> {
    try {
      const orchestrator = new ArtistImportOrchestrator(payload.config);
      const results = await orchestrator.runBatchImport(payload.tmAttractionIds);
      
      const successCount = results.filter(r => r.success).length;
      const failureCount = results.length - successCount;
      
      return {
        success: failureCount === 0,
        message: `Batch import completed: ${successCount} successful, ${failureCount} failed`,
        data: {
          results,
          successCount,
          failureCount,
        },
      };
    } catch (error) {
      console.error('BatchArtistImportProcessor failed:', error);
      return {
        success: false,
        message: 'Batch artist import processing failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

/**
 * Ticketmaster Sync Processor - Handles show/venue data sync
 */
export class TicketmasterSyncProcessor {
  static async process(
    payload: { artistId: string; tmAttractionId: string; config?: any },
    context: JobContext
  ): Promise<JobResult> {
    try {
      const ingest = new TicketmasterIngest(payload.config);
      const result = await ingest.ingest({
        artistId: payload.artistId,
        tmAttractionId: payload.tmAttractionId,
        concurrency: payload.config?.concurrency || 5,
      });
      
      return {
        success: true,
        message: `Ticketmaster sync completed: ${result.newShows} shows, ${result.newVenues} venues`,
        data: result,
      };
    } catch (error) {
      console.error('TicketmasterSyncProcessor failed:', error);
      return {
        success: false,
        message: 'Ticketmaster sync processing failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

/**
 * Spotify Catalog Sync Processor - Handles song catalog sync
 */
export class SpotifyCatalogSyncProcessor {
  static async process(
    payload: { artistId: string; spotifyId: string; config?: any },
    context: JobContext
  ): Promise<JobResult> {
    try {
      const ingest = new SpotifyCatalogIngest(payload.config);
      const result = await ingest.ingest({
        artistId: payload.artistId,
        spotifyId: payload.spotifyId,
        concurrency: payload.config?.concurrency || 8,
      });
      
      return {
        success: true,
        message: `Spotify catalog sync completed: ${result.studioTracksIngested} studio tracks`,
        data: result,
      };
    } catch (error) {
      console.error('SpotifyCatalogSyncProcessor failed:', error);
      return {
        success: false,
        message: 'Spotify catalog sync processing failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

/**
 * Trending Calculation Processor - Handles trending score updates
 */
export class TrendingCalculationProcessor {
  static async process(
    payload: { artistIds?: string[]; forceRecalculate?: boolean },
    context: JobContext
  ): Promise<JobResult> {
    try {
      const result = await calculateTrendingScores({
        artistIds: payload.artistIds,
        forceRecalculate: payload.forceRecalculate || false,
      });
      
      return {
        success: true,
        message: `Trending calculation completed: ${result.artistsUpdated} artists updated`,
        data: result,
      };
    } catch (error) {
      console.error('TrendingCalculationProcessor failed:', error);
      return {
        success: false,
        message: 'Trending calculation processing failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

/**
 * Stale Data Cleanup Processor - Handles cleanup of old/stale data
 */
export class StaleDataCleanupProcessor {
  static async process(
    payload: { olderThanDays?: number },
    context: JobContext
  ): Promise<JobResult> {
    try {
      const olderThanDays = payload.olderThanDays || 30;
      const cutoffDate = new Date(Date.now() - (olderThanDays * 24 * 60 * 60 * 1000));
      
      // Find artists that haven't been synced in a while and have no shows
      const staleArtists = await db
        .select({ id: artists.id, name: artists.name })
        .from(artists)
        .where(
          and(
            or(
              lt(artists.lastSyncedAt, cutoffDate),
              isNull(artists.lastSyncedAt)
            ),
            eq(artists.importStatus, 'failed')
          )
        )
        .limit(100); // Process in batches
      
      let cleanedCount = 0;
      
      for (const artist of staleArtists) {
        try {
          // Reset failed artists for retry
          await db
            .update(artists)
            .set({ 
              importStatus: 'pending',
              lastSyncedAt: new Date(),
            })
            .where(eq(artists.id, artist.id));
          
          cleanedCount++;
        } catch (error) {
          console.error(`Failed to cleanup artist ${artist.id}:`, error);
        }
      }
      
      return {
        success: true,
        message: `Stale data cleanup completed: ${cleanedCount} artists reset for retry`,
        data: { cleanedCount, totalStale: staleArtists.length },
      };
    } catch (error) {
      console.error('StaleDataCleanupProcessor failed:', error);
      return {
        success: false,
        message: 'Stale data cleanup processing failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

/**
 * Health Check Processor - Monitors system health
 */
export class HealthCheckProcessor {
  static async process(
    payload: {},
    context: JobContext
  ): Promise<JobResult> {
    try {
      // Check database connection
      const dbCheck = await db
        .select({ count: 'count(*)' })
        .from(artists)
        .limit(1);
      
      // Check for stuck imports
      const stuckImports = await db
        .select({ count: 'count(*)' })
        .from(artists)
        .where(
          and(
            eq(artists.importStatus, 'importing'),
            lt(artists.lastSyncedAt, new Date(Date.now() - (60 * 60 * 1000))) // 1 hour ago
          )
        );
      
      const healthData = {
        timestamp: new Date().toISOString(),
        database: { connected: true },
        stuckImports: parseInt(stuckImports[0]?.count as string || '0'),
      };
      
      return {
        success: true,
        message: `Health check completed - ${healthData.stuckImports} stuck imports detected`,
        data: healthData,
      };
    } catch (error) {
      console.error('HealthCheckProcessor failed:', error);
      return {
        success: false,
        message: 'Health check processing failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

/**
 * Job processor registry
 */
export const JOB_PROCESSORS = {
  'artist-import': ArtistImportProcessor,
  'batch-artist-import': BatchArtistImportProcessor,
  'ticketmaster-sync': TicketmasterSyncProcessor,
  'spotify-catalog-sync': SpotifyCatalogSyncProcessor,
  'trending-calculation': TrendingCalculationProcessor,
  'stale-data-cleanup': StaleDataCleanupProcessor,
  'health-check': HealthCheckProcessor,
} as const;

export type JobType = keyof typeof JOB_PROCESSORS;

/**
 * Execute a job by type
 */
export async function executeJob(
  jobType: JobType,
  payload: any,
  context: JobContext
): Promise<JobResult> {
  const processor = JOB_PROCESSORS[jobType];
  
  if (!processor) {
    return {
      success: false,
      message: `Unknown job type: ${jobType}`,
      error: 'Invalid job type',
    };
  }
  
  console.log(`Executing job ${jobType} with context:`, context);
  const startTime = Date.now();
  
  try {
    const result = await processor.process(payload, context);
    const duration = Date.now() - startTime;
    
    console.log(`Job ${jobType} completed in ${duration}ms:`, result.message);
    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`Job ${jobType} failed after ${duration}ms:`, error);
    
    return {
      success: false,
      message: `Job ${jobType} failed`,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}