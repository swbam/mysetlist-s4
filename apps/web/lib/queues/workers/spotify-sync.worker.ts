import { Job } from "bullmq";
import { QueueName, SpotifySyncJob, createWorker } from "../config";
import { SpotifyCompleteCatalog } from "@repo/external-apis/src/services/spotify-complete-catalog";
import { SpotifyClient, type SpotifyAlbum } from "@repo/external-apis";
import { db, artists, songs, artistSongs, eq, sql } from "@repo/database";
import { updateImportStatus } from "../../import-status";

export const spotifySyncWorker = createWorker<SpotifySyncJob>(
  QueueName.SPOTIFY_SYNC,
  async (job: Job<SpotifySyncJob>) => {
    const { artistId, spotifyId, syncType, options } = job.data;
    const jobId = `spotify_${artistId}_${Date.now()}`;
    
    try {
      await job.updateProgress(10);
      
      switch (syncType) {
        case 'profile':
          return await syncArtistProfile(artistId, spotifyId, job);
          
        case 'albums':
          return await syncArtistAlbums(artistId, spotifyId, job);
          
        case 'tracks':
          return await syncArtistTracks(artistId, spotifyId, job, options);
          
        case 'full':
          return await syncFullCatalog(artistId, spotifyId, job, options);
          
        default:
          throw new Error(`Unknown sync type: ${syncType}`);
      }
    } catch (error) {
      console.error(`Spotify sync failed for artist ${artistId}:`, error);
      
      await updateImportStatus(jobId, {
        stage: "failed",
        progress: 0,
        message: `Spotify sync failed: ${error.message}`,
        error: error.message,
        artistId,
      });
      
      throw error;
    }
  }
);

async function syncArtistProfile(
  artistId: string,
  spotifyId: string,
  job: Job
) {
  const spotify = new SpotifyClient({});
  await spotify.authenticate();
  
  await job.updateProgress(30);
  
  const spotifyArtist = await spotify.getArtist(spotifyId);
  
  if (!spotifyArtist) {
    throw new Error(`Spotify artist not found: ${spotifyId}`);
  }
  
  await job.updateProgress(60);
  
  // Update artist profile
  await db
    .update(artists)
    .set({
      name: spotifyArtist.name,
      imageUrl: spotifyArtist.images?.[0]?.url || null,
      smallImageUrl: spotifyArtist.images?.[2]?.url || null,
      genres: JSON.stringify(spotifyArtist.genres || []),
      popularity: spotifyArtist.popularity || 0,
      followers: spotifyArtist.followers?.total || 0,
      externalUrls: JSON.stringify(spotifyArtist.external_urls || {}),
      lastSyncedAt: new Date(),
    })
    .where(eq(artists.id, artistId));
  
  await job.updateProgress(100);
  
  return {
    success: true,
    artistId,
    spotifyId,
    name: spotifyArtist.name,
    popularity: spotifyArtist.popularity,
    followers: spotifyArtist.followers?.total,
  };
}

async function syncArtistAlbums(
  artistId: string,
  spotifyId: string,
  job: Job
) {
  const spotify = new SpotifyClient({});
  await spotify.authenticate();
  
  await job.updateProgress(20);
  
  const albums: SpotifyAlbum[] = [];
  let offset = 0;
  const limit = 50;
  let hasMore = true;
  
  while (hasMore) {
    const response = await spotify.getArtistAlbums(spotifyId, {
      include_groups: 'album,single',
      limit,
      offset,
      market: 'US',
    });
    
    if (response?.items && response.items.length > 0) {
      albums.push(...response.items);
      offset += response.items.length;
      hasMore = response.items.length === limit;
      
      const progress = Math.min(20 + (offset / 200) * 60, 80);
      await job.updateProgress(progress);
    } else {
      hasMore = false;
    }
  }
  
  // Update artist with album count
  await db
    .update(artists)
    .set({
      totalAlbums: albums.length,
      lastSyncedAt: new Date(),
    })
    .where(eq(artists.id, artistId));
  
  await job.updateProgress(100);
  
  return {
    success: true,
    artistId,
    totalAlbums: albums.length,
    albums: albums.map(a => ({ id: a.id, name: a.name, type: a.album_type })),
  };
}

async function syncArtistTracks(
  artistId: string,
  spotifyId: string,
  job: Job,
  options?: any
) {
  const catalogSync = new SpotifyCompleteCatalog();
  
  const progressCallback = (message: string, progress: number) => {
    job.updateProgress(progress);
  };
  
  const result = await catalogSync.importEntireDiscography(spotifyId, {
    ...options,
    onProgress: progressCallback,
  });
  
  await job.updateProgress(100);
  
  return {
    success: true,
    artistId,
    ...result,
  };
}

async function syncFullCatalog(
  artistId: string,
  spotifyId: string,
  job: Job,
  options?: any
) {
  // First sync profile
  await job.updateProgress(10);
  await syncArtistProfile(artistId, spotifyId, job);
  
  // Then sync full catalog
  await job.updateProgress(30);
  const catalogResult = await syncArtistTracks(artistId, spotifyId, job, options);
  
  await job.updateProgress(100);
  
  return {
    success: true,
    artistId,
    catalog: catalogResult,
  };
}

// Start worker if main module
if (require.main === module) {
  console.log("Starting Spotify sync worker...");
  
  spotifySyncWorker.on("completed", (job) => {
    console.log(`Spotify sync completed: ${job.id}`);
  });
  
  spotifySyncWorker.on("failed", (job, err) => {
    console.error(`Spotify sync failed: ${job?.id}`, err);
  });
  
  spotifySyncWorker.on("progress", (job, progress) => {
    console.log(`Spotify sync progress for ${job.id}: ${progress}%`);
  });
  
  process.on("SIGTERM", async () => {
    console.log("Shutting down Spotify sync worker...");
    await spotifySyncWorker.close();
    process.exit(0);
  });
}