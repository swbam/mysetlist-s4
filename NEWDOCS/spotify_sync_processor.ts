// MySetlist-S4 Spotify Sync Processor
// File: apps/web/lib/queues/processors/spotify-sync.processor.ts
// NEW FILE - Handles Spotify data synchronization jobs

import { Job } from "bullmq";
import { 
  db, 
  artists, 
  songs, 
  artistSongs, 
  eq, 
  sql,
  desc 
} from "@repo/database";
import { SpotifyClient } from "@repo/external-apis";
import { ImportLogger } from "~/lib/import-logger";
import { circuitBreaker } from "~/lib/circuit-breaker";

interface SpotifySyncJobData {
  artistId: string;
  spotifyId: string;
  syncType: 'profile' | 'albums' | 'tracks' | 'full';
  options?: {
    includeCompilations?: boolean;
    includeAppearsOn?: boolean;
    skipLive?: boolean;
    forceRefresh?: boolean;
  };
}

interface SpotifySyncResult {
  success: boolean;
  artistId: string;
  syncType: string;
  songsUpdated: number;
  albumsProcessed: number;
  errors: string[];
  duration: number;
}

export class SpotifySyncProcessor {
  private static spotifyClient = new SpotifyClient();
  
  static async process(job: Job<SpotifySyncJobData>): Promise<SpotifySyncResult> {
    const { artistId, spotifyId, syncType, options = {} } = job.data;
    const logger = new ImportLogger(job.id || "spotify-sync");
    const startTime = Date.now();
    
    const result: SpotifySyncResult = {
      success: false,
      artistId,
      syncType,
      songsUpdated: 0,
      albumsProcessed: 0,
      errors: [],
      duration: 0,
    };

    try {
      logger.info(`Starting Spotify sync: ${syncType}`, {
        artistId,
        spotifyId,
        options,
      });

      await job.updateProgress(0);

      // Verify artist exists
      const artist = await db
        .select()
        .from(artists)
        .where(eq(artists.id, artistId))
        .get();

      if (!artist) {
        throw new Error(`Artist not found: ${artistId}`);
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
        default:
          throw new Error(`Unknown sync type: ${syncType}`);
      }

      await job.updateProgress(100);
      result.success = true;
      result.duration = Date.now() - startTime;

      logger.success(`Spotify sync completed: ${syncType}`, {
        artistId,
        songsUpdated: result.songsUpdated,
        albumsProcessed: result.albumsProcessed,
        duration: result.duration,
      });

      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      result.errors.push(errorMessage);
      result.duration = Date.now() - startTime;

      logger.error(`Spotify sync failed: ${syncType}`, {
        error: errorMessage,
        artistId,
        spotifyId,
      });

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

    // Get updated artist info from Spotify
    const spotifyArtist = await circuitBreaker.execute(async () =>
      this.spotifyClient.getArtist(spotifyId)
    );

    if (!spotifyArtist) {
      throw new Error(`Artist not found on Spotify: ${spotifyId}`);
    }

    await job.updateProgress(50);

    // Update artist record with fresh Spotify data
    await db
      .update(artists)
      .set({
        name: spotifyArtist.name,
        imageUrl: spotifyArtist.images?.[0]?.url || artist.imageUrl,
        smallImageUrl: spotifyArtist.images?.[1]?.url || artist.smallImageUrl,
        genres: JSON.stringify(spotifyArtist.genres || []),
        popularity: spotifyArtist.popularity || 0,
        followers: spotifyArtist.followers?.total || 0,
        monthlyListeners: null, // Would need Spotify Web API for this
        externalUrls: JSON.stringify({
          ...(artist.externalUrls ? JSON.parse(artist.externalUrls) : {}),
          spotify: spotifyArtist.external_urls?.spotify,
        }),
        lastSyncedAt: new Date(),
      })
      .where(eq(artists.id, artist.id));

    await job.updateProgress(100);
  }

  private static async syncArtistAlbums(
    artist: any, 
    spotifyId: string, 
    job: Job, 
    result: SpotifySyncResult,
    options: any
  ): Promise<void> {
    await job.updateProgress(5);

    // Get artist's albums
    const includeGroups = ['album', 'single'];
    if (options.includeCompilations) includeGroups.push('compilation');
    if (options.includeAppearsOn) includeGroups.push('appears_on');

    const albums = await circuitBreaker.execute(async () =>
      this.spotifyClient.getArtistAlbums(spotifyId, {
        include_groups: includeGroups.join(','),
        market: 'US',
        limit: 50,
      })
    );

    if (!albums || albums.length === 0) {
      return;
    }

    await job.updateProgress(20);

    // Get existing songs to avoid duplicates
    const existingSongs = await db
      .select({
        spotifyId: songs.spotifyId,
        id: songs.id,
      })
      .from(songs)
      .innerJoin(artistSongs, eq(songs.id, artistSongs.songId))
      .where(eq(artistSongs.artistId, artist.id));

    const existingSpotifyIds = new Set(
      existingSongs.map(s => s.spotifyId).filter(Boolean)
    );

    await job.updateProgress(30);

    let songsProcessed = 0;
    const albumBatchSize = 5;

    // Process albums in batches
    for (let i = 0; i < albums.length; i += albumBatchSize) {
      const albumBatch = albums.slice(i, i + albumBatchSize);
      
      for (const album of albumBatch) {
        try {
          // Get album tracks
          const tracks = await circuitBreaker.execute(async () =>
            this.spotifyClient.getAlbumTracks(album.id)
          );

          for (const track of tracks) {
            // Skip if already exists
            if (existingSpotifyIds.has(track.id)) {
              continue;
            }

            // Skip live tracks if option is set
            if (options.skipLive && this.isLiveTrack(track.name)) {
              continue;
            }

            try {
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
                  previewUrl: track.preview_url,
                  spotifyUri: track.uri,
                  externalUrls: JSON.stringify(track.external_urls),
                  isExplicit: track.explicit || false,
                  isPlayable: !track.restrictions,
                  isLive: this.isLiveTrack(track.name),
                  isRemix: this.isRemixTrack(track.name),
                })
                .returning();

              // Link to artist
              await db
                .insert(artistSongs)
                .values({
                  artistId: artist.id,
                  songId: song.id,
                  isPrimaryArtist: true,
                })
                .onConflictDoNothing();

              songsProcessed++;
              result.songsUpdated++;

            } catch (error) {
              if (!error.message?.includes('unique constraint')) {
                result.errors.push(`Failed to create song ${track.name}: ${error.message}`);
              }
            }
          }

          result.albumsProcessed++;

        } catch (error) {
          result.errors.push(`Failed to process album ${album.name}: ${error.message}`);
        }
      }

      // Update progress
      const progress = 30 + Math.floor((i / albums.length) * 60);
      await job.updateProgress(Math.min(progress, 90));
    }

    // Update artist stats
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

    // Get top tracks from Spotify
    const topTracks = await circuitBreaker.execute(async () =>
      this.spotifyClient.getArtistTopTracks(spotifyId, { market: 'US' })
    );

    if (!topTracks || topTracks.length === 0) {
      return;
    }

    await job.updateProgress(30);

    // Update popularity for existing songs
    for (const track of topTracks) {
      try {
        const existingSong = await db
          .select({ id: songs.id })
          .from(songs)
          .where(eq(songs.spotifyId, track.id))
          .get();

        if (existingSong) {
          // Update popularity
          await db
            .update(songs)
            .set({
              popularity: track.popularity || 0,
              updatedAt: new Date(),
            })
            .where(eq(songs.id, existingSong.id));

          result.songsUpdated++;
        } else {
          // Create new song if it doesn't exist
          const [song] = await db
            .insert(songs)
            .values({
              spotifyId: track.id,
              name: track.name,
              artist: artist.name,
              albumName: track.album?.name,
              albumId: track.album?.id,
              trackNumber: track.track_number,
              albumType: track.album?.album_type,
              albumArtUrl: track.album?.images?.[0]?.url,
              releaseDate: track.album?.release_date,
              durationMs: track.duration_ms,
              popularity: track.popularity || 0,
              previewUrl: track.preview_url,
              spotifyUri: track.uri,
              externalUrls: JSON.stringify(track.external_urls),
              isExplicit: track.explicit || false,
              isPlayable: !track.restrictions,
            })
            .returning();

          // Link to artist
          await db
            .insert(artistSongs)
            .values({
              artistId: artist.id,
              songId: song.id,
              isPrimaryArtist: true,
            })
            .onConflictDoNothing();

          result.songsUpdated++;
        }

      } catch (error) {
        result.errors.push(`Failed to process top track ${track.name}: ${error.message}`);
      }
    }

    await job.updateProgress(100);
  }

  private static async syncFullCatalog(
    artist: any, 
    spotifyId: string, 
    job: Job, 
    result: SpotifySyncResult,
    options: any
  ): Promise<void> {
    // Full catalog sync combines profile + albums + top tracks
    await this.syncArtistProfile(artist, spotifyId, job, result);
    await job.updateProgress(25);
    
    await this.syncArtistTopTracks(artist, spotifyId, job, result);
    await job.updateProgress(50);
    
    await this.syncArtistAlbums(artist, spotifyId, job, result, options);
    await job.updateProgress(90);

    // Update final sync timestamp
    await db
      .update(artists)
      .set({
        songCatalogSyncedAt: new Date(),
        lastFullSyncAt: new Date(),
      })
      .where(eq(artists.id, artist.id));

    await job.updateProgress(100);
  }

  private static async updateArtistSongStats(artistId: string): Promise<void> {
    // Count total songs and albums for the artist
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
          updatedAt: new Date(),
        })
        .where(eq(artists.id, artistId));
    }
  }

  private static isLiveTrack(name: string): boolean {
    const liveKeywords = [
      /\blive\b/i, 
      /\bconcert\b/i, 
      /\btour\b/i, 
      /\bshow\b/i,
      /\bacoustic\b/i,
      /\bunplugged\b/i,
    ];
    return liveKeywords.some(pattern => pattern.test(name));
  }

  private static isRemixTrack(name: string): boolean {
    const remixKeywords = [
      /\bremix\b/i, 
      /\bedit\b/i, 
      /\brework\b/i, 
      /\bremaster\b/i,
      /\bversion\b/i,
    ];
    return remixKeywords.some(pattern => pattern.test(name));
  }

  // Batch processing helper for large catalogs
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
        batch.map(processor)
      );

      batchResults.forEach(result => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        }
      });

      // Rate limiting delay
      if (i + batchSize < items.length && delayMs > 0) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }

    return results;
  }
}

export default SpotifySyncProcessor;