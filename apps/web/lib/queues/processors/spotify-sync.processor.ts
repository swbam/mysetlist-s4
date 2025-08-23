// MySetlist-S4 Spotify Sync Processor (per NEWDOCS)
import { Job } from "bullmq";
import { db, artists, songs, artistSongs, eq, sql } from "@repo/database";
import { SpotifyClient } from "@repo/external-apis";
import { ImportLogger } from "~/lib/import-logger";
import { CircuitBreaker } from "~/lib/services/circuit-breaker";

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
  private static spotifyClient = new SpotifyClient({ apiKey: process.env["SPOTIFY_CLIENT_ID"] });
  private static breaker = new CircuitBreaker('Spotify API');

  static async process(job: Job<SpotifySyncJobData>): Promise<SpotifySyncResult> {
    const { artistId, spotifyId, syncType, options = {} } = job.data;
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
      const logger = new ImportLogger({ artistId, spotifyId, jobId: String(job.id) });
      await logger.info(syncType, `Starting ${syncType} sync for artist ${artistId}`, { spotifyId, options });
      await job.updateProgress(0);

      // Get artist from database
      const artistArr = await db.select().from(artists).where(eq(artists.id, artistId)).limit(1);
      const artistRow: any = Array.isArray(artistArr) ? artistArr[0] : artistArr;
      if (!artistRow) {
        throw new Error(`Artist not found: ${artistId}`);
      }

      // No Redis cache path in this implementation; always proceed

      // Execute sync based on type
    switch (syncType) {
      case 'profile':
        await this.syncArtistProfile(artistRow, spotifyId, job, result);
        break;
      case 'albums':
        await this.syncArtistAlbums(artistRow, spotifyId, job, result, options);
        break;
      case 'tracks':
        await this.syncArtistTopTracks(artistRow, spotifyId, job, result);
        break;
      case 'full':
        await this.syncFullCatalog(artistRow, spotifyId, job, result, options);
        break;
      default:
        throw new Error(`Unknown sync type: ${syncType}`);
    }
    
      result.success = true;
      result.duration = Date.now() - startTime;

      // No cache write here (handled by higher-level cache if needed)

      await logger.success(syncType, `${syncType} sync completed`, result);
      await job.updateProgress(100);

      return result;
    
  } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const logger = new ImportLogger({ artistId, spotifyId, jobId: String(job.id) });
      await logger.error(syncType, `${syncType} sync failed`, error);
      
      result.errors.push(errorMessage);
      result.success = false;
      result.duration = Date.now() - startTime;
    
    throw error;
  }
}

  private static async syncArtistProfile(artist: any, spotifyId: string, job: Job, result: SpotifySyncResult): Promise<void> {
    await job.updateProgress(10);

    // Fetch artist profile from Spotify
    const spotifyArtist = await this.breaker.execute(async () => this.spotifyClient.getArtist(spotifyId));

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

    // profile updated
  await job.updateProgress(100);
  }

  private static async syncArtistAlbums(artist: any, spotifyId: string, job: Job, result: SpotifySyncResult, options: any): Promise<void> {
    await job.updateProgress(10);

    const maxAlbums = options.maxAlbums || 50;
    
    // Fetch albums from Spotify
    const include_groups = ['album', 'single'];
    if (options.includeCompilations) include_groups.push('compilation');
    if (options.includeAppearsOn) include_groups.push('appears_on');
    const spotifyAlbumsRes = await this.breaker.execute(async () =>
      this.spotifyClient.getArtistAlbums(spotifyId, { include_groups: include_groups.join(','), market: 'US', limit: maxAlbums })
    );
    const spotifyAlbums = (spotifyAlbumsRes as any)?.items || [];

    if (!spotifyAlbums || spotifyAlbums.length === 0) {
      result.albumsProcessed = 0;
      return;
    }

    await job.updateProgress(30);

    let albumsProcessed = 0;

    // Process albums in batches
    const batchSize = 5;
    for (let i = 0; i < spotifyAlbums.length; i += batchSize) {
      const albumBatch = spotifyAlbums.slice(i, i + batchSize);
      
      for (const spotifyAlbum of albumBatch) {
        try {
          // Create or update album record
          // Album tables are not part of the exposed schema; skip persisting albums explicitly

          // Get album tracks
          const tracks = await this.breaker.execute(async () => this.spotifyClient.getAlbumTracks(spotifyAlbum.id));
          
          for (const track of tracks) {
            const albumLooksLive = typeof spotifyAlbum.name === 'string' && /\blive\b/i.test(spotifyAlbum.name);
            if (albumLooksLive || this.isLiveTrack(track.name)) {
              continue;
            }
            const songResult = await this.createOrUpdateSong(track, spotifyAlbum, artist);
            if (songResult.created || songResult.updated) result.songsUpdated++;
          }

          albumsProcessed++;

        } catch (error) {
          const logger = new ImportLogger({ artistId: artist.id, spotifyId, jobId: String(job.id) });
          await logger.warning('albums', `Failed to process album ${spotifyAlbum.name}`, error);
          result.errors.push(`Album ${spotifyAlbum.name}: ${error}`);
        }
      }

      // Update progress
      const progress = 30 + Math.floor((i / spotifyAlbums.length) * 60);
      await job.updateProgress(Math.min(progress, 90));
    }

    result.albumsProcessed = albumsProcessed;

    // Update artist catalog stats
    await this.updateArtistSongStats(artist.id);
  await job.updateProgress(100);
  }

  private static async syncArtistTopTracks(artist: any, spotifyId: string, job: Job, result: SpotifySyncResult): Promise<void> {
  await job.updateProgress(10);

    // Fetch top tracks from Spotify
    const topTracksRes = await this.breaker.execute(async () => this.spotifyClient.getArtistTopTracks(spotifyId, 'US'));
    const topTracks = topTracksRes?.tracks || [];

    if (!topTracks || topTracks.length === 0) {
      // no tracks
      return;
    }

    await job.updateProgress(30);

    // track counters omitted; we update result.songsUpdated

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
        if (songResult.created || songResult.updated) result.songsUpdated++;

      } catch (error) {
        const logger = new ImportLogger({ artistId: artist.id, spotifyId, jobId: String(job.id) });
        await logger.warning('tracks', `Failed to process track ${track.name}`, error);
        result.errors.push(`Track ${track.name}: ${error}`);
      }
    }

    // tracked in result.songsUpdated
  
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

  // Minimal audio features stub to satisfy includeFeatures flag
  private static async syncAudioFeatures(artist: any, spotifyId: string, job: Job, result: SpotifySyncResult): Promise<void> {
    await job.updateProgress(85);
    // Gather last 50 songs for this artist and request audio features in batches of 50
    const tracks = await db
      .select({ id: songs.spotifyId })
      .from(songs)
      .innerJoin(artistSongs, eq(songs.id, artistSongs.songId))
      .where(eq(artistSongs.artistId, artist.id))
      .limit(50);
    const trackIds = tracks.map((t: any) => t.id).filter(Boolean);
    if (trackIds.length === 0) return;
    const features = await this.breaker.execute(async () => this.spotifyClient.getAudioFeatures(trackIds));
    if (features?.audio_features?.length) {
      // We currently do not persist features in this simplified flow
    }
  }

  private static async createOrUpdateSong(
    track: any,
    album: any,
    artist: any
  ): Promise<{ created: boolean; updated: boolean }> {
    // Check if song already exists
    const existingRows = await db
      .select({ id: songs.id })
      .from(songs)
      .where(eq(songs.spotifyId, track.id))
      .limit(1);
    const existingSong = Array.isArray(existingRows) ? existingRows[0] : existingRows;

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
    const inserted = await db
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
    const song = (Array.isArray(inserted) ? inserted[0] : inserted) as any;
    const songId: string | undefined = song?.id ?? (
      (await db.select({ id: songs.id }).from(songs).where(eq(songs.spotifyId, track.id)).limit(1))[0]?.id
    );
    if (!songId) {
      throw new Error('Failed to create or retrieve inserted song id');
    }

    // Link song to artist
    await db
      .insert(artistSongs)
      .values({
        artistId: artist.id,
        songId: songId,
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
      .limit(1);
    const statRow: any = Array.isArray(stats) ? stats[0] : stats;

    if (statRow) {
      await db
        .update(artists)
        .set({
          totalSongs: statRow.totalSongs,
          totalAlbums: statRow.totalAlbums,
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