import { Job } from "bullmq";
import { SpotifyCompleteCatalog } from "@repo/external-apis/src/services/spotify-complete-catalog";
import { SpotifyClient } from "@repo/external-apis";
import { db, artists, songs, artistSongs, eq, sql } from "@repo/database";
import { updateImportStatus } from "../../import-status";
import { RedisCache } from "../redis-config";

const cache = new RedisCache();

export interface SpotifySyncJobData {
  artistId: string;
  spotifyId: string;
  syncType: 'profile' | 'albums' | 'tracks' | 'full';
  parentJobId?: string;
  options?: {
    includeCompilations?: boolean;
    includeAppearsOn?: boolean;
    skipLive?: boolean;
    skipRemixes?: boolean;
  };
}

export async function processSpotifySync(job: Job<SpotifySyncJobData>) {
  const { artistId, spotifyId, syncType, parentJobId, options } = job.data;
  const jobId = job.id || `spotify_${artistId}_${Date.now()}`;
  
  try {
    await job.log(`Starting Spotify ${syncType} sync for artist ${artistId}`);
    await job.updateProgress(10);
    
    const spotify = new SpotifyClient({});
    await spotify.authenticate();
    
    switch (syncType) {
      case 'profile':
        return await syncProfile(spotify, artistId, spotifyId, job);
      
      case 'albums':
        return await syncAlbums(spotify, artistId, spotifyId, job);
      
      case 'tracks':
        return await syncTracks(artistId, spotifyId, job, options);
      
      case 'full':
        return await syncFull(spotify, artistId, spotifyId, job, options);
      
      default:
        throw new Error(`Unknown sync type: ${syncType}`);
    }
    
  } catch (error) {
    console.error(`Spotify sync failed for ${artistId}:`, error);
    
    if (parentJobId) {
      await updateImportStatus(parentJobId, {
        stage: "importing-songs",
        progress: 50,
        message: `Spotify sync failed: ${error.message}`,
        error: error.message,
      });
    }
    
    throw error;
  }
}

async function syncProfile(
  spotify: SpotifyClient,
  artistId: string,
  spotifyId: string,
  job: Job
) {
  await job.updateProgress(30);
  
  // Check cache
  const cacheKey = `spotify:profile:${spotifyId}`;
  let artistData = await cache.get<any>(cacheKey);
  
  if (!artistData) {
    artistData = await spotify.getArtist(spotifyId);
    
    if (!artistData) {
      throw new Error(`Spotify artist not found: ${spotifyId}`);
    }
    
    // Cache for 1 hour
    await cache.set(cacheKey, artistData, 3600);
  }
  
  await job.updateProgress(60);
  
  // Update artist profile
  const updateData = {
    name: artistData.name,
    imageUrl: artistData.images?.[0]?.url || null,
    smallImageUrl: artistData.images?.[2]?.url || null,
    genres: JSON.stringify(artistData.genres || []),
    popularity: artistData.popularity || 0,
    followers: artistData.followers?.total || 0,
    externalUrls: JSON.stringify(artistData.external_urls || {}),
    spotifyData: JSON.stringify(artistData),
    lastSyncedAt: new Date(),
  };
  
  await db
    .update(artists)
    .set(updateData)
    .where(eq(artists.id, artistId));
  
  await job.updateProgress(100);
  await job.log(`Profile sync completed for ${artistData.name}`);
  
  return {
    success: true,
    artistId,
    spotifyId,
    name: artistData.name,
    popularity: artistData.popularity,
    followers: artistData.followers?.total,
  };
}

async function syncAlbums(
  spotify: SpotifyClient,
  artistId: string,
  spotifyId: string,
  job: Job
) {
  await job.updateProgress(20);
  
  const albums: any[] = [];
  const albumTypes = ['album', 'single'];
  let processed = 0;
  
  for (const albumType of albumTypes) {
    let offset = 0;
    const limit = 50;
    let hasMore = true;
    
    while (hasMore) {
      const response = await spotify.getArtistAlbums(spotifyId, {
        include_groups: albumType,
        limit,
        offset,
        market: 'US',
      });
      
      if (response?.items && response.items.length > 0) {
        albums.push(...response.items);
        offset += response.items.length;
        hasMore = response.items.length === limit;
        
        processed += response.items.length;
        const progress = Math.min(20 + (processed / 200) * 60, 80);
        await job.updateProgress(progress);
      } else {
        hasMore = false;
      }
      
      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
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
  await job.log(`Album sync completed: ${albums.length} albums found`);
  
  return {
    success: true,
    artistId,
    totalAlbums: albums.length,
    albums: albums.map(a => ({
      id: a.id,
      name: a.name,
      type: a.album_type,
      releaseDate: a.release_date,
    })),
  };
}

async function syncTracks(
  artistId: string,
  spotifyId: string,
  job: Job,
  options?: any
) {
  const catalogSync = new SpotifyCompleteCatalog();
  
  await job.updateProgress(10);
  await job.log("Starting complete catalog sync...");
  
  const result = await catalogSync.importEntireDiscography(spotifyId, {
    ...options,
    onProgress: async (message: string, progress: number) => {
      await job.updateProgress(Math.min(progress, 95));
      await job.log(message);
    },
  });
  
  // Update artist stats
  await db
    .update(artists)
    .set({
      totalSongs: result.totalSongs,
      totalAlbums: result.totalAlbums,
      songCatalogSyncedAt: new Date(),
      lastFullSyncAt: new Date(),
    })
    .where(eq(artists.id, artistId));
  
  await job.updateProgress(100);
  await job.log(`Track sync completed: ${result.totalSongs} tracks imported`);
  
  return {
    success: true,
    artistId,
    ...result,
  };
}

async function syncFull(
  spotify: SpotifyClient,
  artistId: string,
  spotifyId: string,
  job: Job,
  options?: any
) {
  await job.log("Starting full Spotify sync...");
  
  // Step 1: Sync profile (20%)
  await job.updateProgress(5);
  const profileResult = await syncProfile(spotify, artistId, spotifyId, job);
  
  // Step 2: Sync albums (40%)
  await job.updateProgress(25);
  const albumsResult = await syncAlbums(spotify, artistId, spotifyId, job);
  
  // Step 3: Sync tracks (100%)
  await job.updateProgress(45);
  const tracksResult = await syncTracks(artistId, spotifyId, job, options);
  
  await job.updateProgress(100);
  await job.log("Full Spotify sync completed successfully!");
  
  return {
    success: true,
    artistId,
    profile: profileResult,
    albums: albumsResult,
    tracks: tracksResult,
  };
}

export async function processSpotifyCatalog(job: Job<{
  artistId: string;
  spotifyId: string;
  deep?: boolean;
  parentJobId?: string;
}>) {
  const { artistId, spotifyId, deep, parentJobId } = job.data;
  
  try {
    await job.log(`Starting ${deep ? 'deep' : 'standard'} catalog sync for artist ${artistId}`);
    
    const catalogSync = new SpotifyCompleteCatalog();
    
    const result = await catalogSync.importEntireDiscography(spotifyId, {
      includeCompilations: deep,
      includeAppearsOn: deep,
      skipLive: !deep,
      skipRemixes: !deep,
      onProgress: async (message: string, progress: number) => {
        await job.updateProgress(progress);
        await job.log(message);
        
        if (parentJobId) {
          await updateImportStatus(parentJobId, {
            stage: "importing-songs",
            progress: 50 + (progress / 2), // 50-100% of parent job
            message: `Syncing catalog: ${message}`,
          });
        }
      },
    });
    
    await job.log(`Catalog sync completed: ${result.totalSongs} songs imported`);
    
    return result;
    
  } catch (error) {
    console.error(`Catalog sync failed for ${artistId}:`, error);
    throw error;
  }
}