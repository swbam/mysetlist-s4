import { Job } from "bullmq";
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
import { ArtistImportOrchestrator } from "../../services/artist-import-orchestrator";
import { updateImportStatus } from "../../import-status";
import { ImportLogger } from "../../import-logger";
import { db, artists, eq } from "@repo/database";

// Main artist import worker
export const artistImportWorker = createWorker<ArtistImportJob>(
  QueueName.ARTIST_IMPORT,
  async (job: Job<ArtistImportJob>) => {
    const { tmAttractionId, priority, adminImport, userId } = job.data;
    const jobId = job.id || `import_${tmAttractionId}_${Date.now()}`;
    
    // Update job progress
    const updateProgress = async (progress: number, message: string) => {
      await job.updateProgress(progress);
      await updateImportStatus(jobId, {
        stage: getStageFromProgress(progress),
        progress,
        message,
      });
    };
    
    try {
      await updateProgress(5, "Starting artist import...");
      
      // Phase 1: Create artist immediately
      const orchestrator = new ArtistImportOrchestrator(
        async (progress) => {
          await job.updateProgress(progress.progress);
          await updateImportStatus(jobId, progress);
        }
      );
      
      const result = await orchestrator.importArtist(tmAttractionId, adminImport);
      
      // Queue follow-up jobs for parallel processing
      await queueFollowUpJobs(result.artistId, tmAttractionId, job.data.priority);
      
      await updateProgress(100, "Import completed successfully!");
      
      return {
        success: true,
        artistId: result.artistId,
        slug: result.slug,
        totalSongs: result.totalSongs,
        totalShows: result.totalShows,
        totalVenues: result.totalVenues,
        importDuration: result.importDuration,
      };
      
    } catch (error) {
      console.error(`Artist import failed for ${tmAttractionId}:`, error);
      
      await updateImportStatus(jobId, {
        stage: "failed",
        progress: 0,
        message: "Import failed",
        error: error instanceof Error ? error.message : "Unknown error",
      });
      
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