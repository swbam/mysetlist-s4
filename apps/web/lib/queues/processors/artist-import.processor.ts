import { Job } from "bullmq";
import { queueManager, QueueName, Priority } from "../queue-manager";
import { RedisCache } from "../redis-config";
import { db, artists, eq } from "@repo/database";
import { TicketmasterClient, SpotifyClient } from "@repo/external-apis";
import { updateImportStatus } from "../../import-status";
import { v4 as uuidv4 } from "uuid";

const cache = new RedisCache();

export interface ArtistImportJobData {
  tmAttractionId: string;
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
  const { tmAttractionId, userId, adminImport, priority = Priority.NORMAL } = job.data;
  const jobId = job.id || `import_${tmAttractionId}_${Date.now()}`;
  const startTime = Date.now();
  
  try {
    // Update initial progress
    await job.updateProgress(5);
    await updateImportStatus(jobId, {
      stage: "initializing",
      progress: 5,
      message: "Starting artist import...",
    });
    
    // Check cache first
    const cacheKey = `artist:import:${tmAttractionId}`;
    const cachedResult = await cache.get<ArtistImportResult>(cacheKey);
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
      ticketmaster.getAttraction(tmAttractionId),
      2000,
      "Ticketmaster timeout"
    );
    
    if (!tmArtist || !tmArtist.name) {
      throw new Error(`Artist not found on Ticketmaster: ${tmAttractionId}`);
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
      tmAttractionId,
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
    
    const phase1Duration = Date.now() - phase1Start;
    
    await job.updateProgress(30);
    await updateImportStatus(jobId, {
      stage: "importing-shows",
      progress: 30,
      message: "Artist created! Queuing background sync...",
      artistId: artist?.id || "",
      artistName: artist?.name || tmArtist.name,
      slug: artist?.slug || slug,
    });
    
    // Queue follow-up jobs for parallel processing
    const followUpJobs = await queueFollowUpJobs(
      (artist?.id as string) || uuidv4(),
      artist?.spotifyId || null,
      tmAttractionId,
      priority,
      jobId
    );
    
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
      followUpJobs,
    };
    
    await cache.set(cacheKey, result, 300); // Cache for 5 minutes
    
    await job.updateProgress(100);
    await updateImportStatus(jobId, {
      stage: "completed",
      progress: 100,
      message: "Import initiated successfully!",
      artistId: (artist?.id as string) || "",
      completedAt: new Date().toISOString(),
    });
    
    return result;
    
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