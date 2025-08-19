import { Job } from "bullmq";
import { queueManager, QueueName, Priority } from "../queue-manager";
import { RedisCache } from "../redis-config";
import { db, artists } from "@repo/database";
import { eq } from "drizzle-orm";
import { TicketmasterClient, SpotifyClient, runFullImport } from "@repo/external-apis";
import { updateImportStatus } from "../../import-status";
import { v4 as uuidv4 } from "uuid";

// Lazy cache instance to avoid connecting during import-time
let _cache: RedisCache | null = null;
function getCache() {
  if (!_cache) _cache = new RedisCache();
  return _cache;
}

export interface ArtistImportJobData {
  artistId?: string;
  tmAttractionId?: string;
  spotifyArtistId?: string;
  artistName?: string;
  userId?: string;
  adminImport?: boolean;
  priority?: Priority;
}

export interface ArtistImportResult {
  success: boolean;
  artistId: string;
  slug: string;
  spotifyId?: string;
  name: string;
  imageUrl?: string;
  cached?: boolean;
  phase1Duration: number;
  followUpJobs: string[];
}

export async function processArtistImport(job: Job<ArtistImportJobData>): Promise<ArtistImportResult> {
  const { artistId, tmAttractionId, spotifyArtistId, artistName, userId, adminImport, priority = Priority.NORMAL } = job.data;
  
  // Support both new job structure (from initiateImport) and legacy structure
  const actualArtistId = artistId;
  const actualTmAttractionId = tmAttractionId;
  const jobId = job.id || `import_${actualArtistId || actualTmAttractionId}_${Date.now()}`;
  const startTime = Date.now();
  
  try {
    await job.updateProgress(5);
    await updateImportStatus(jobId, {
      stage: "initializing",
      progress: 5,
      message: "Starting full artist import...",
      artistId: actualArtistId,
      artistName: artistName || "Loading...",
    });
    
    // For new job structure from initiateImport, directly call runFullImport
    if (actualArtistId) {
      await job.updateProgress(10);
      await job.log(`Running full import for artist ${actualArtistId}`);
      
      // Call the orchestrator's runFullImport function
      await runFullImport(actualArtistId);
      
      // Get final artist data
      const [artist] = await db
        .select()
        .from(artists)
        .where(eq(artists.id, actualArtistId))
        .limit(1);
      
      if (!artist) {
        throw new Error(`Artist not found after import: ${actualArtistId}`);
      }
      
      const result: ArtistImportResult = {
        success: true,
        artistId: artist.id,
        slug: artist.slug,
        spotifyId: artist.spotifyId || undefined,
        name: artist.name,
        imageUrl: artist.imageUrl || undefined,
        cached: false,
        phase1Duration: Date.now() - startTime,
        followUpJobs: [],
      };
      
      await job.updateProgress(100);
      await updateImportStatus(jobId, {
        stage: "completed",
        progress: 100,
        message: "Full import completed successfully!",
        artistId: artist.id,
        completedAt: new Date().toISOString(),
      });
      
      return result;
    }
    
    // Legacy processing for backward compatibility
    if (!actualTmAttractionId) {
      throw new Error("Either artistId or tmAttractionId is required");
    }
    
    // Check cache first for legacy processing
    const cacheKey = `artist:import:${actualTmAttractionId}`;
    const cachedResult = await getCache().get<ArtistImportResult>(cacheKey);
    if (cachedResult && !adminImport) {
      await job.updateProgress(100);
      return { ...cachedResult, cached: true };
    }
    
    // Phase 1: Create artist placeholder (< 3 seconds)
    const phase1Start = Date.now();
    
    // Get artist from Ticketmaster
    await job.updateProgress(10);
    const ticketmaster = new TicketmasterClient({
      apiKey: process.env.TICKETMASTER_API_KEY || "",
    });
    
    const tmArtist = await withTimeout(
      ticketmaster.getAttraction(actualTmAttractionId),
      2000,
      "Ticketmaster timeout"
    );
    
    if (!tmArtist || !tmArtist.name) {
      throw new Error(`Artist not found on Ticketmaster: ${actualTmAttractionId}`);
    }
    
    await job.updateProgress(20);
    await updateImportStatus(jobId, {
      stage: "syncing-identifiers",
      progress: 20,
      message: `Found artist: ${tmArtist.name}`,
    });
    
    // Quick Spotify lookup (1 second timeout)
    let spotifyData: any = null;
    try {
      const spotify = new SpotifyClient({});
      await spotify.authenticate();
      
      const searchResult = await withTimeout(
        spotify.searchArtists(tmArtist.name, 1),
        1000,
        "Spotify timeout"
      );
      
      if (searchResult?.artists?.items?.[0]) {
        spotifyData = searchResult.artists.items[0];
      }
    } catch (error) {
      console.warn("Spotify quick lookup failed:", error);
    }
    
    // Create or update artist record
    const slug = generateSlug(spotifyData?.name || tmArtist.name);
    
    const artistData = {
      tmAttractionId: actualTmAttractionId,
      spotifyId: spotifyData?.id || null,
      name: spotifyData?.name || tmArtist.name,
      slug,
      imageUrl: spotifyData?.images?.[0]?.url || tmArtist.images?.[0]?.url || null,
      smallImageUrl: spotifyData?.images?.[2]?.url || null,
      genres: JSON.stringify(spotifyData?.genres || []),
      popularity: spotifyData?.popularity || 0,
      followers: spotifyData?.followers?.total || 0,
      externalUrls: JSON.stringify(spotifyData?.external_urls || {}),
      verified: false,
      lastSyncedAt: new Date(),
    };
    
    const [artist] = await db
      .insert(artists)
      .values(artistData)
      .onConflictDoUpdate({
        target: artists.tmAttractionId,
        set: {
          ...artistData,
          updatedAt: new Date(),
        },
      })
      .returning();
    
    if (!artist) {
      throw new Error("Failed to create or update artist");
    }
    
    const phase1Duration = Date.now() - phase1Start;
    
    await job.updateProgress(30);
    await updateImportStatus(jobId, {
      stage: "importing-shows",
      progress: 30,
      message: "Artist created! Running full import...",
      artistId: artist?.id || "",
      artistName: artist?.name || tmArtist.name,
      slug: artist?.slug || slug,
    });
    
    // Run full import using orchestrator
    await runFullImport(artist.id);
    
    // Cache the result
    const result: ArtistImportResult = {
      success: true,
      artistId: (artist?.id as string) || "",
      slug: artist?.slug || slug,
      spotifyId: artist?.spotifyId || undefined,
      name: artist?.name || tmArtist.name,
      imageUrl: artistData.imageUrl || undefined,
      cached: false,
      phase1Duration,
      followUpJobs: [],
    };
    
    await getCache().set(cacheKey, result, 300); // Cache for 5 minutes
    
    await job.updateProgress(100);
    await updateImportStatus(jobId, {
      stage: "completed",
      progress: 100,
      message: "Import completed successfully!",
      artistId: (artist?.id as string) || "",
      completedAt: new Date().toISOString(),
    });
    
    return result;
    
  } catch (error) {
    console.error(`Artist import failed:`, error);
    
    await updateImportStatus(jobId, {
      stage: "failed",
      progress: 0,
      message: "Import failed",
      error: error instanceof Error ? error.message : "Unknown error",
    });
    
    throw error;
  }
}

async function queueFollowUpJobs(
  artistId: string,
  spotifyId: string | null,
  tmAttractionId: string,
  priority: Priority,
  parentJobId: string
): Promise<string[]> {
  const jobIds: string[] = [];
  const jobs: Array<{
    queue: QueueName;
    name: string;
    data: any;
    opts?: any;

  }> = [];
  
  // Queue Spotify sync if we have Spotify ID
  if (spotifyId) {
    const spotifyJobId = `spotify_${artistId}_${Date.now()}`;
    jobs.push({
      queue: QueueName.SPOTIFY_SYNC,
      name: `spotify-sync-${artistId}`,
      data: {
        artistId,
        spotifyId,
        syncType: 'profile',
        parentJobId,
      },
      opts: {
        priority,
        jobId: spotifyJobId,
      },
    });
    jobIds.push(spotifyJobId);
    
    // Queue deep catalog sync as lower priority
    const catalogJobId = `catalog_${artistId}_${Date.now()}`;
    jobs.push({
      queue: QueueName.SPOTIFY_CATALOG,
      name: `catalog-sync-${artistId}`,
      data: {
        artistId,
        spotifyId,
        deep: true,
        parentJobId,
      },
      opts: {
        priority: Priority.LOW,
        delay: 5000, // Delay 5 seconds
        jobId: catalogJobId,
      },
    });
    jobIds.push(catalogJobId);
  }
  
  // Queue Ticketmaster shows sync
  const tmJobId = `tm_${artistId}_${Date.now()}`;
  jobs.push({
    queue: QueueName.TICKETMASTER_SYNC,
    name: `tm-sync-${artistId}`,
    data: {
      artistId,
      tmAttractionId,
      syncType: 'shows',
      parentJobId,
    },
    opts: {
      priority,
      jobId: tmJobId,
    },
  });
  jobIds.push(tmJobId);
  
  // Queue venue sync with delay
  const venueJobId = `venue_${artistId}_${Date.now()}`;
  jobs.push({
    queue: QueueName.VENUE_SYNC,
    name: `venue-sync-${artistId}`,
    data: {
      artistId,
      parentJobId,
    },
    opts: {
      priority: Priority.NORMAL,
      delay: 10000, // Delay 10 seconds to let shows sync first
      jobId: venueJobId,
    },
  });
  jobIds.push(venueJobId);
  
  // Add jobs to queues
  for (const job of jobs) {
    await queueManager.addJob(job.queue, job.name, job.data, job.opts);
  }
  
  return jobIds;
}

function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage: string
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
    ),
  ]);
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}