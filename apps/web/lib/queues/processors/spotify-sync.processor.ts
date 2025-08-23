// MySetlist-S4 Spotify Sync Processor
// File: apps/web/lib/queues/processors/spotify-sync.processor.ts
// NEW FILE - Spotify data synchronization processor

import { Job } from "bullmq";
import { eq, sql } from "drizzle-orm";
import { 
  db, 
  artists, 
  songs,
  artistSongs
} from "@repo/database";
import { SpotifyClient } from "@repo/external-apis";
import { spotifyCircuitBreaker } from "~/lib/services/circuit-breaker";
import { redisCache } from "~/lib/redis/production-redis-config";
import { ImportLogger } from "~/lib/import-logger";

interface SpotifySyncJobData {
  artistId: string;
  spotifyId: string;
  syncType: 'profile' | 'albums' | 'tracks' | 'full' | 'features';
  options?: {
    forceRefresh?: boolean;
    includeFeatures?: boolean;
    maxAlbums?: number;
    maxTracks?: number;
  };
}

interface SpotifySyncResult {
  success: boolean;
  syncType: string;
  artistId: string;
  artistName: string;
  results: {
    profileUpdated?: boolean;
    albumsProcessed?: number;
    tracksAdded?: number;
    tracksUpdated?: number;
    featuresUpdated?: number;
  };
  errors: string[];
  duration: number;
}

export class SpotifySyncProcessor {
  private static spotifyClient = new SpotifyClient();
  private static logger = new ImportLogger("spotify-sync");

  static async process(job: Job<SpotifySyncJobData>): Promise<SpotifySyncResult> {
    const { artistId, spotifyId, syncType, options = {} } = job.data;
    const startTime = Date.now();
    const errors: string[] = [];
    const result: SpotifySyncResult = {
      success: false,
      syncType,
      artistId,
      artistName: '',
      results: {},
      errors,
      duration: 0,
    };

    try {
      this.logger.info(`Starting ${syncType} sync for artist ${artistId}`, { spotifyId, options });
      await job.updateProgress(0);

      // Get artist from database
      const artist = await db
        .select()
        .from(artists)
        .where(eq(artists.id, artistId))
        .get();

      if (!artist) {
        throw new Error(`Artist not found: ${artistId}`);
      }

      result.artistName = artist.name;

      // Check cache if not forcing refresh
      if (!options.forceRefresh) {
        const cacheKey = `spotify:sync:${artistId}:${syncType}`;
        const cached = await redisCache.get(cacheKey);
        if (cached) {
          this.logger.info(`Using cached data for ${syncType} sync`);
          return JSON.parse(cached);
        }
      }

      // Execute sync based on type
    switch (syncType) {
      case 'profile':
          await this.syncArtistProfile(artist, spotifyId, job, result);
          break;
      case 'albums':
          await this.syncArtistAlbums(artist, spotifyId, job, result, options);
          break;
      case 'tracks':
          await this.syncArtistTopTracks(artist, spotifyId, job, result);
          break;
      case 'full':
          await this.syncFullCatalog(artist, spotifyId, job, result, options);
          break;
        case 'features':
          await this.syncAudioFeatures(artist, spotifyId, job, result);
          break;
      default:
        throw new Error(`Unknown sync type: ${syncType}`);
    }
    
      result.success = true;
      result.duration = Date.now() - startTime;

      // Cache successful results
      const cacheKey = `spotify:sync:${artistId}:${syncType}`;
      await redisCache.setex(cacheKey, 3600, JSON.stringify(result)); // 1 hour TTL

      this.logger.success(`${syncType} sync completed`, result);
      await job.updateProgress(100);

      return result;
    
  } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`${syncType} sync failed`, { error: errorMessage, artistId, spotifyId });
      
      result.errors.push(errorMessage);
      result.success = false;
      result.duration = Date.now() - startTime;
    
    throw error;
  }
}

  private static async syncArtistProfile(
    artist: any, 
  spotifyId: string,
    job: Job, 
    result: SpotifySyncResult
  ): Promise<void> {
    await job.updateProgress(10);

    // Fetch artist profile from Spotify
    const spotifyArtist = await spotifyCircuitBreaker.execute(async () => {
      return await this.spotifyClient.getArtist(spotifyId);
    });

    if (!spotifyArtist) {
      throw new Error('Failed to fetch artist profile from Spotify');
    }

    await job.updateProgress(50);
  
  // Update artist profile
  await db
    .update(artists)
      .set({
        name: spotifyArtist.name,
        imageUrl: spotifyArtist.images[0]?.url || artist.imageUrl,
        smallImageUrl: spotifyArtist.images[1]?.url || artist.smallImageUrl,
        genres: JSON.stringify(spotifyArtist.genres),
        popularity: spotifyArtist.popularity,
        followers: spotifyArtist.followers.total,
        externalUrls: JSON.stringify(spotifyArtist.external_urls),
        lastSyncedAt: new Date(),
      })
      .where(eq(artists.id, artist.id));

    result.results.profileUpdated = true;
  await job.updateProgress(100);
  }

  private static async syncArtistAlbums(
    artist: any, 
  spotifyId: string,
    job: Job, 
    result: SpotifySyncResult,
    options: any
  ): Promise<void> {
    await job.updateProgress(10);

    const maxAlbums = options.maxAlbums || 50;
    
    // Fetch albums from Spotify
    const spotifyAlbums = await spotifyCircuitBreaker.execute(async () => {
      return await this.spotifyClient.getArtistAlbums(spotifyId, {
        include_groups: ['album', 'single', 'compilation'],
        market: 'US',
        limit: maxAlbums,
      });
    });

    if (!spotifyAlbums || spotifyAlbums.length === 0) {
      result.results.albumsProcessed = 0;
      return;
    }

    await job.updateProgress(30);

    let albumsProcessed = 0;
    let tracksAdded = 0;
    let tracksUpdated = 0;

    // Process albums in batches
    const batchSize = 5;
    for (let i = 0; i < spotifyAlbums.length; i += batchSize) {
      const albumBatch = spotifyAlbums.slice(i, i + batchSize);
      
      for (const spotifyAlbum of albumBatch) {
        try {
          // Create or update album record
          const [album] = await db
            .insert(albums)
            .values({
              spotifyId: spotifyAlbum.id,
              name: spotifyAlbum.name,
              albumType: spotifyAlbum.album_type,
              totalTracks: spotifyAlbum.total_tracks,
              releaseDate: spotifyAlbum.release_date,
              releaseDatePrecision: spotifyAlbum.release_date_precision,
              imageUrl: spotifyAlbum.images[0]?.url,
              externalUrls: JSON.stringify(spotifyAlbum.external_urls),
              markets: JSON.stringify(spotifyAlbum.available_markets),
            })
            .onConflictDoUpdate({
              target: albums.spotifyId,
              set: {
                name: spotifyAlbum.name,
                totalTracks: spotifyAlbum.total_tracks,
                imageUrl: spotifyAlbum.images[0]?.url,
                updatedAt: new Date(),
              },
            })
            .returning();

          // Link album to artist
          await db
            .insert(artistAlbums)
            .values({
              artistId: artist.id,
              albumId: album.id,
              isPrimaryArtist: true,
            })
            .onConflictDoNothing();

          // Get album tracks
          const tracks = await this.spotifyClient.getAlbumTracks(spotifyAlbum.id);
          
          for (const track of tracks) {
            const songResult = await this.createOrUpdateSong(track, spotifyAlbum, artist);
            if (songResult.created) tracksAdded++;
            if (songResult.updated) tracksUpdated++;
          }

          albumsProcessed++;

        } catch (error) {
          this.logger.warn(`Failed to process album ${spotifyAlbum.name}`, { error });
          result.errors.push(`Album ${spotifyAlbum.name}: ${error}`);
        }
      }

      // Update progress
      const progress = 30 + Math.floor((i / spotifyAlbums.length) * 60);
      await job.updateProgress(Math.min(progress, 90));
    }

    result.results.albumsProcessed = albumsProcessed;
    result.results.tracksAdded = tracksAdded;
    result.results.tracksUpdated = tracksUpdated;

    // Update artist catalog stats
    await this.updateArtistSongStats(artist.id);
  await job.updateProgress(100);
  }

  private static async syncArtistTopTracks(
    artist: any, 
  spotifyId: string,
  job: Job,
    result: SpotifySyncResult
  ): Promise<void> {
  await job.updateProgress(10);

    // Fetch top tracks from Spotify
    const topTracks = await spotifyCircuitBreaker.execute(async () => {
      return await this.spotifyClient.getArtistTopTracks(spotifyId, 'US');
    });

    if (!topTracks || topTracks.length === 0) {
      result.results.tracksAdded = 0;
      return;
    }

    await job.updateProgress(30);

    let tracksAdded = 0;
    let tracksUpdated = 0;

    // Process tracks
    for (const track of topTracks) {
      try {
        // Find album info
        const albumInfo = track.album || {
          id: 'unknown',
          name: 'Unknown Album',
          images: [],
          release_date: null,
          album_type: 'single',
        };

        const songResult = await this.createOrUpdateSong(track, albumInfo, artist);
        if (songResult.created) tracksAdded++;
        if (songResult.updated) tracksUpdated++;

      } catch (error) {
        this.logger.warn(`Failed to process track ${track.name}`, { error });
        result.errors.push(`Track ${track.name}: ${error}`);
      }
    }

    result.results.tracksAdded = tracksAdded;
    result.results.tracksUpdated = tracksUpdated;
  
  await job.updateProgress(100);
  }

  private static async syncFullCatalog(
    artist: any, 
  spotifyId: string,
  job: Job,
    result: SpotifySyncResult,
    options: any
  ): Promise<void> {
    // Sync profile first
    await this.syncArtistProfile(artist, spotifyId, job, result);
    await job.updateProgress(20);

    // Then sync albums and tracks
    await this.syncArtistAlbums(artist, spotifyId, job, result, options);
    await job.updateProgress(80);

    // Optionally sync audio features
    if (options.includeFeatures) {
      await this.syncAudioFeatures(artist, spotifyId, job, result);
    }
  
  await job.updateProgress(100);
  }

  private static async syncAudioFeatures(
    artist: any,
    spotifyId: string,
    job: Job,
    result: SpotifySyncResult
  ): Promise<void> {
    // Get all songs for this artist that have Spotify IDs
    const artistSongs = await db
      .select({
        songId: songs.id,
        spotifyId: songs.spotifyId,
      })
      .from(songs)
      .innerJoin(artistSongs, eq(songs.id, artistSongs.songId))
      .where(eq(artistSongs.artistId, artist.id))
      .limit(100); // Spotify API limit

    if (artistSongs.length === 0) {
      result.results.featuresUpdated = 0;
      return;
    }

    const trackIds = artistSongs
      .map(s => s.spotifyId)
      .filter(Boolean) as string[];

    if (trackIds.length === 0) {
      result.results.featuresUpdated = 0;
      return;
    }

    // Fetch audio features in batches of 100
    let featuresUpdated = 0;
    for (let i = 0; i < trackIds.length; i += 100) {
      const batch = trackIds.slice(i, i + 100);
      
      try {
        const features = await this.spotifyClient.getAudioFeatures(batch);
        
        for (const feature of features) {
          if (!feature) continue;

          await db
            .update(songs)
            .set({
              audioFeatures: JSON.stringify({
                danceability: feature.danceability,
                energy: feature.energy,
                key: feature.key,
                loudness: feature.loudness,
                mode: feature.mode,
                speechiness: feature.speechiness,
                acousticness: feature.acousticness,
                instrumentalness: feature.instrumentalness,
                liveness: feature.liveness,
                valence: feature.valence,
                tempo: feature.tempo,
                timeSignature: feature.time_signature,
              }),
              updatedAt: new Date(),
            })
            .where(eq(songs.spotifyId, feature.id));

          featuresUpdated++;
        }
      } catch (error) {
        this.logger.warn('Failed to fetch audio features batch', { error });
        result.errors.push(`Audio features batch: ${error}`);
      }
    }

    result.results.featuresUpdated = featuresUpdated;
  }

  private static async createOrUpdateSong(
    track: any,
    album: any,
    artist: any
  ): Promise<{ created: boolean; updated: boolean }> {
    // Check if song already exists
    const existingSong = await db
      .select({ id: songs.id })
      .from(songs)
      .where(eq(songs.spotifyId, track.id))
      .get();

    if (existingSong) {
      // Update existing song
      await db
        .update(songs)
        .set({
          popularity: track.popularity,
          previewUrl: track.preview_url,
          updatedAt: new Date(),
        })
        .where(eq(songs.id, existingSong.id));

      return { created: false, updated: true };
    }

    // Create new song
    const [song] = await db
      .insert(songs)
      .values({
        spotifyId: track.id,
        name: track.name,
        artist: artist.name,
        albumName: album.name,
        albumId: album.id,
        trackNumber: track.track_number,
        discNumber: track.disc_number || 1,
        albumType: album.album_type,
        albumArtUrl: album.images?.[0]?.url,
        releaseDate: album.release_date,
        durationMs: track.duration_ms,
        popularity: track.popularity || 0,
        previewUrl: track.preview_url,
        spotifyUri: track.uri,
        externalUrls: JSON.stringify(track.external_urls),
        isExplicit: track.explicit || false,
        isPlayable: !track.restrictions,
        isLive: this.isLiveTrack(track.name),
        isRemix: this.isRemixTrack(track.name),
      })
      .returning();

    // Link song to artist
    await db
      .insert(artistSongs)
      .values({
        artistId: artist.id,
        songId: song.id,
        isPrimaryArtist: true,
      })
      .onConflictDoNothing();

    return { created: true, updated: false };
  }

  private static async updateArtistSongStats(artistId: string): Promise<void> {
    const stats = await db
      .select({
        totalSongs: sql<number>`COUNT(DISTINCT ${songs.id})`,
        totalAlbums: sql<number>`COUNT(DISTINCT ${songs.albumId})`,
      })
      .from(songs)
      .innerJoin(artistSongs, eq(songs.id, artistSongs.songId))
      .where(eq(artistSongs.artistId, artistId))
      .get();

    if (stats) {
      await db
        .update(artists)
        .set({
          totalSongs: stats.totalSongs,
          totalAlbums: stats.totalAlbums,
          songCatalogSyncedAt: new Date(),
        })
        .where(eq(artists.id, artistId));
    }
  }

  private static isLiveTrack(name: string): boolean {
    const livePatterns = [
      /\b(live|Live|LIVE)\b/,
      /\b(acoustic|Acoustic)\b/,
      /\b(unplugged|Unplugged)\b/,
      /\b(concert|Concert)\b/,
      /\b(session|Session)\b/,
      /\b(version|Version)\b.*\b(live|Live)\b/,
      /\(.*live.*\)/i,
      /\[.*live.*\]/i,
      /- live/i,
    ];
    
    return livePatterns.some(pattern => pattern.test(name));
  }

  private static isRemixTrack(name: string): boolean {
    const remixPatterns = [
      /\b(remix|Remix|REMIX)\b/,
      /\b(edit|Edit|EDIT)\b/,
      /\b(rework|Rework|REWORK)\b/,
      /\b(mix|Mix|MIX)\b/,
      /\(.*remix.*\)/i,
      /\[.*remix.*\]/i,
    ];
    
    return remixPatterns.some(pattern => pattern.test(name));
  }

  private static async processInBatches<T, R>(
    items: T[],
    processor: (item: T) => Promise<R>,
    batchSize: number = 5,
    delayMs: number = 100
  ): Promise<R[]> {
    const results: R[] = [];
    
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      const batchResults = await Promise.allSettled(
        batch.map(item => processor(item))
      );
      
      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        }
      }
      
      if (i + batchSize < items.length) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
    
    return results;
  }
}

export default SpotifySyncProcessor;