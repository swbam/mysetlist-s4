import { Job } from "bullmq";
import { createRedisClient } from "../redis-config";
import { 
  QueueName, 
  ArtistImportJob,
  SpotifySyncJob,
  TicketmasterSyncJob,
  CatalogSyncJob,
  getQueue,
  Priority,
  createWorker
} from "../config";
import { OptimizedImportOrchestrator } from "../../services/optimized-import-orchestrator";
import { updateImportStatus } from "../../import-status";
import { ImportLogger } from "../../import-logger";
import { db, artists, eq } from "@repo/database";

// Initialize Redis for real-time progress updates (env-driven)
const redis = createRedisClient();

// Main artist import worker - handles background phases after Phase 1
export const artistImportWorker = createWorker<ArtistImportJob>(
  QueueName.ARTIST_IMPORT,
  async (job: Job<ArtistImportJob>) => {
    const { 
      tmAttractionId, 
      artistId, 
      priority, 
      adminImport, 
      userId,
      phase1Complete,
      syncOnly
    } = job.data;
    
    const jobId = job.id || `import_${tmAttractionId}_${Date.now()}`;
    
    // Update job progress with Redis pub/sub
    const updateProgress = async (progress: number, message: string, metrics?: any) => {
      await job.updateProgress(progress);
      
      const progressData = {
        stage: getStageFromProgress(progress),
        progress,
        message,
        artistId,
        metrics,
      };
      
      await updateImportStatus(artistId || jobId, progressData);
      
      // Publish to Redis for SSE
      if (artistId) {
        const channel = `import:progress:${jobId}`;
        await redis.publish(channel, JSON.stringify(progressData));
        await redis.setex(
          `import:status:${jobId}`,
          300,
          JSON.stringify(progressData)
        );
      }
    };
    
    try {
      // If this is a sync-only job for existing artist
      if (syncOnly && artistId) {
        await updateProgress(10, "Syncing latest data for existing artist...");
        
        const orchestrator = new OptimizedImportOrchestrator(
          async (progress) => {
            await job.updateProgress(progress.progress);
            await updateImportStatus(artistId, progress);
            
            // Publish to Redis
            const channel = `import:progress:${jobId}`;
            await redis.publish(channel, JSON.stringify(progress));
          },
          redis
        );
        
        const result = await orchestrator.executeSmartImport(
          tmAttractionId,
          artistId,
          jobId
        );
        
        return result;
      }
      
      // Handle Phase 2 & 3 background import (Phase 1 already completed in API route)
      if (phase1Complete && artistId) {
        await updateProgress(25, "Starting background import phases...");
        
        const orchestrator = new OptimizedImportOrchestrator(
          async (progress) => {
            await job.updateProgress(progress.progress);
            await updateImportStatus(artistId, progress);
            
            // Publish to Redis for SSE
            const channel = `import:progress:${jobId}`;
            await redis.publish(channel, JSON.stringify(progress));
            await redis.setex(
              `import:status:${jobId}`,
              300,
              JSON.stringify(progress)
            );
          },
          redis
        );
        
        const result = await orchestrator.executeSmartImport(
          tmAttractionId,
          artistId,
          jobId
        );
        
        await updateProgress(100, "Import completed successfully!", result.metrics);
        
        return result;
      }
      
      // Legacy full import path (shouldn't be used with new flow)
      throw new Error("Full import should not be queued - Phase 1 must be executed synchronously");
      
    } catch (error) {
      console.error(`Artist import failed for ${tmAttractionId}:`, error);
      
      await updateImportStatus(artistId || jobId, {
        stage: "failed",
        progress: 0,
        message: "Import failed",
        error: error instanceof Error ? error.message : "Unknown error",
      });
      
      // Publish failure to Redis
      if (artistId) {
        const channel = `import:progress:${jobId}`;
        await redis.publish(channel, JSON.stringify({
          stage: "failed",
          progress: 0,
          message: "Import failed",
          error: error instanceof Error ? error.message : "Unknown error",
          artistId,
        }));
      }
      
      throw error;
    }
  }
);

// Queue follow-up jobs for parallel processing
async function queueFollowUpJobs(
  artistId: string,
  tmAttractionId: string,
  priority: Priority = Priority.NORMAL
) {
  // Get artist details
  const [artist] = await db
    .select()
    .from(artists)
    .where(eq(artists.id, artistId))
    .limit(1);
  
  if (!artist) {
    throw new Error(`Artist not found: ${artistId}`);
  }
  
  const spotifySyncQueue = getQueue<SpotifySyncJob>(QueueName.SPOTIFY_SYNC);
  const ticketmasterQueue = getQueue<TicketmasterSyncJob>(QueueName.TICKETMASTER_SYNC);
  const catalogQueue = getQueue<CatalogSyncJob>(QueueName.CATALOG_SYNC);
  
  const jobs = [];
  
  // Queue Spotify sync if we have Spotify ID
  if (artist.spotifyId) {
    jobs.push(
      spotifySyncQueue.add(
        `spotify-${artistId}`,
        {
          artistId,
          spotifyId: artist.spotifyId,
          syncType: 'full',
          options: {
            includeCompilations: false,
            skipLive: true,
          },
        },
        { priority }
      )
    );
    
    // Queue deep catalog sync as lower priority
    jobs.push(
      catalogQueue.add(
        `catalog-${artistId}`,
        {
          artistId,
          spotifyId: artist.spotifyId,
          deep: true,
        },
        { 
          priority: Priority.LOW,
          delay: 5000, // Delay 5 seconds to let main sync finish first
        }
      )
    );
  }
  
  // Queue Ticketmaster sync
  jobs.push(
    ticketmasterQueue.add(
      `ticketmaster-${artistId}`,
      {
        artistId,
        tmAttractionId,
        syncType: 'full',
        options: {
          includePast: false,
          maxShows: 200,
        },
      },
      { priority }
    )
  );
  
  await Promise.all(jobs);
}

// Helper to determine stage from progress
function getStageFromProgress(progress: number): string {
  if (progress < 10) return "initializing";
  if (progress < 30) return "syncing-identifiers";
  if (progress < 60) return "importing-shows";
  if (progress < 90) return "importing-songs";
  if (progress < 95) return "creating-setlists";
  if (progress >= 100) return "completed";
  return "processing";
}

// Start the worker if this is the main module
if (require.main === module) {
  console.log("Starting artist import worker...");
  
  artistImportWorker.on("completed", (job) => {
    console.log(`Artist import completed: ${job.id}`);
  });
  
  artistImportWorker.on("failed", (job, err) => {
    console.error(`Artist import failed: ${job?.id}`, err);
  });
  
  process.on("SIGTERM", async () => {
    console.log("Shutting down artist import worker...");
    await artistImportWorker.close();
    process.exit(0);
  });
}