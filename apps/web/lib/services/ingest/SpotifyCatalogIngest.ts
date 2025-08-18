/**
 * Spotify Catalog Ingest Service
 * Implements GROK.md specifications for studio-only catalog with liveness filtering and ISRC deduplication
 * 
 * Key features:
 * - Studio-only catalog: Filter out live tracks using liveness > 0.8 threshold + name patterns
 * - ISRC deduplication: Prefer highest popularity for same ISRC
 * - Idempotent operations: Re-running should not create duplicates
 * - Progress reporting via ProgressBus
 * - Robust error handling with comprehensive filtering
 */

import { db, songs, artistSongs, artists } from '@repo/database';
import { eq } from 'drizzle-orm';
import { ProgressBus } from '../progress/ProgressBus';
import { 
  listAllAlbums, 
  listAlbumTracks, 
  getTracksDetails, 
  getAudioFeatures,
  type SpotifyAlbum, 
  type SpotifyTrack, 
  type SpotifyAudioFeatures 
} from '../adapters/SpotifyClient';
import { pLimit, processBatch } from '../util/concurrency';

export interface SpotifyIngestOptions {
  artistId: string;
  spotifyId: string;
  progressReporter?: ReturnType<typeof ProgressBus.createReporter>;
  concurrency?: number;
}

export interface CatalogIngestResult {
  albumsProcessed: number;
  tracksProcessed: number;
  studioTracksIngested: number;
  liveFeaturesFiltered: number;
  liveNameFiltered: number;
  duplicatesFiltered: number;
  errors: Array<{ type: string; message: string; item?: any }>;
}

// Studio-only filtering configuration
const LIVENESS_THRESHOLD = 0.8; // Tracks with liveness > 0.8 are considered live

// Live track name patterns to filter out
const LIVE_PATTERNS = [
  /\b(live|concert|acoustic|unplugged|session)\b/i,
  /\b(live at|live from|live in|live on)\b/i,
  /\b(acoustic version|live version|concert version)\b/i,
  /\(live\)/i,
  /\[live\]/i,
  /- live$/i,
  /\bmtv unplugged\b/i,
];

// Live album patterns to filter out
const LIVE_ALBUM_PATTERNS = [
  /\b(live|concert|acoustic|unplugged|sessions?|tour)\b/i,
  /\b(live at|live from|live in|live on)\b/i,
  /\b(acoustic album|live album|concert album)\b/i,
  /\(live\)/i,
  /\[live\]/i,
  /- live$/i,
];

/**
 * Main Spotify catalog ingest service
 * Focuses on studio recordings only, filtering out live performances
 */
export class SpotifyCatalogIngest {
  private limit: ReturnType<typeof pLimit>;
  private progressReporter?: ReturnType<typeof ProgressBus.createReporter>;
  
  constructor(options: { concurrency?: number; progressReporter?: ReturnType<typeof ProgressBus.createReporter> } = {}) {
    this.limit = pLimit(options.concurrency || 8);
    this.progressReporter = options.progressReporter;
  }

  /**
   * Ingest studio-only catalog for an artist
   */
  async ingest(options: SpotifyIngestOptions): Promise<CatalogIngestResult> {
    const { artistId, spotifyId, progressReporter } = options;
    const reporter = progressReporter || this.progressReporter;

    const result: CatalogIngestResult = {
      albumsProcessed: 0,
      tracksProcessed: 0,
      studioTracksIngested: 0,
      liveFeaturesFiltered: 0,
      liveNameFiltered: 0,
      duplicatesFiltered: 0,
      errors: [],
    };

    try {
      reporter?.report('importing-songs', 5, 'Fetching Spotify albums...');

      // Step 1: Get all albums for the artist
      const albums = await listAllAlbums(spotifyId);
      console.log(`SpotifyCatalogIngest: Found ${albums.length} albums for artist ${artistId}`);

      if (albums.length === 0) {
        reporter?.report('importing-songs', 40, 'No albums found for this artist');
        return result;
      }

      // Step 2: Filter out live albums
      const studioAlbums = albums.filter(album => this.isStudioAlbum(album));
      const liveAlbumsFiltered = albums.length - studioAlbums.length;

      console.log(`SpotifyCatalogIngest: Filtered to ${studioAlbums.length} studio albums (removed ${liveAlbumsFiltered} live albums)`);

      reporter?.report('importing-songs', 15, `Processing ${studioAlbums.length} studio albums...`);

      // Step 3: Collect all tracks from studio albums
      const allTracks: SpotifyTrack[] = [];
      
      await processBatch(
        studioAlbums,
        async (album) => {
          const tracks = await listAlbumTracks(album.id);
          allTracks.push(...tracks);
          result.albumsProcessed++;
          return tracks;
        },
        {
          concurrency: options.concurrency || 8,
          continueOnError: true,
          onProgress: (completed, total) => {
            const progress = 15 + Math.floor((completed / total) * 20); // 15% to 35%
            reporter?.report(
              'importing-songs',
              Math.min(35, progress),
              `Collected tracks from ${completed}/${total} albums (${allTracks.length} total tracks)`
            );
          },
          onError: (error, album) => {
            result.errors.push({
              type: 'album_tracks_fetch',
              message: error.message,
              item: { albumId: album.id, name: album.name },
            });
          },
        }
      );

      console.log(`SpotifyCatalogIngest: Collected ${allTracks.length} tracks from studio albums`);

      reporter?.report('importing-songs', 40, `Getting detailed track information...`);

      // Step 4: Get detailed track information in batches
      const trackIds = allTracks.map(track => track.id);
      const detailedTracks = await getTracksDetails(trackIds);
      
      console.log(`SpotifyCatalogIngest: Retrieved details for ${detailedTracks.length} tracks`);

      reporter?.report('importing-songs', 55, `Getting audio features for liveness filtering...`);

      // Step 5: Get audio features for liveness filtering
      const audioFeatures = await getAudioFeatures(trackIds);
      const audioFeaturesMap = new Map<string, SpotifyAudioFeatures>();
      
      for (const features of audioFeatures) {
        if (features?.id) {
          audioFeaturesMap.set(features.id, features);
        }
      }

      console.log(`SpotifyCatalogIngest: Retrieved audio features for ${audioFeatures.length} tracks`);

      reporter?.report('importing-songs', 70, `Filtering studio tracks and deduplicating...`);

      // Step 6: Apply studio-only filtering and ISRC deduplication
      const studioTracks = this.filterStudioTracks(detailedTracks, audioFeaturesMap, result);
      const deduplicatedTracks = this.deduplicateByISRC(studioTracks, result);

      console.log(`SpotifyCatalogIngest: Final catalog: ${deduplicatedTracks.length} studio tracks`);

      reporter?.report('importing-songs', 80, `Ingesting ${deduplicatedTracks.length} studio tracks...`);

      // Step 7: Ingest tracks into database
      await processBatch(
        deduplicatedTracks,
        async (track) => await this.ingestTrack(track, artistId, result),
        {
          concurrency: options.concurrency || 8,
          continueOnError: true,
          onProgress: (completed, total) => {
            const progress = 80 + Math.floor((completed / total) * 15); // 80% to 95%
            reporter?.report(
              'importing-songs',
              Math.min(95, progress),
              `Ingested ${completed}/${total} studio tracks`
            );
          },
          onError: (error, track) => {
            result.errors.push({
              type: 'track_ingestion',
              message: error.message,
              item: { trackId: track.id, name: track.name },
            });
          },
        }
      );

      reporter?.report('importing-songs', 100, 
        `Catalog completed: ${result.studioTracksIngested} studio tracks ingested (${result.errors.length} errors)`
      );

      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('SpotifyCatalogIngest: Fatal error:', error);
      
      result.errors.push({
        type: 'fatal_error',
        message: errorMessage,
      });

      reporter?.reportError(error as Error, 'importing-songs');
      throw error;
    }
  }

  /**
   * Check if an album is a studio album (not live)
   */
  private isStudioAlbum(album: SpotifyAlbum): boolean {
    // Check album name against live patterns
    for (const pattern of LIVE_ALBUM_PATTERNS) {
      if (pattern.test(album.name)) {
        return false;
      }
    }
    
    // Live albums are typically marked as 'compilation' or have specific album_group
    if (album.album_type === 'compilation' && album.album_group === 'appears_on') {
      // This could be a live compilation, check name more strictly
      if (/\b(live|concert)\b/i.test(album.name)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Filter tracks to studio recordings only based on audio features and name patterns
   * Gracefully handles missing audio features by relying on name-based filtering
   */
  private filterStudioTracks(
    tracks: SpotifyTrack[], 
    audioFeaturesMap: Map<string, SpotifyAudioFeatures>,
    result: CatalogIngestResult
  ): SpotifyTrack[] {
    const studioTracks: SpotifyTrack[] = [];

    for (const track of tracks) {
      result.tracksProcessed++;

      // Filter by audio features (liveness threshold) - only if available
      const features = audioFeaturesMap.get(track.id);
      if (features) {
        if (features.liveness > LIVENESS_THRESHOLD) {
          result.liveFeaturesFiltered++;
          console.log(`SpotifyCatalogIngest: Filtered live track by audio features: ${track.name} (liveness: ${features.liveness})`);
          continue;
        }
      } else {
        // No audio features available - rely on name-based filtering only
        console.log(`SpotifyCatalogIngest: No audio features for ${track.name}, using name-based filtering only`);
      }

      // Filter by track name patterns
      let isLiveTrack = false;
      for (const pattern of LIVE_PATTERNS) {
        if (pattern.test(track.name)) {
          isLiveTrack = true;
          result.liveNameFiltered++;
          console.log(`SpotifyCatalogIngest: Filtered live track by name: ${track.name}`);
          break;
        }
      }

      if (!isLiveTrack) {
        studioTracks.push(track);
      }
    }

    const audioFeaturesCount = audioFeaturesMap.size;
    const totalTracks = tracks.length;
    console.log(`SpotifyCatalogIngest: Studio filtering: ${studioTracks.length} studio tracks from ${totalTracks} total (${audioFeaturesCount}/${totalTracks} had audio features)`);
    return studioTracks;
  }

  /**
   * Deduplicate tracks by ISRC, preferring tracks with highest popularity
   */
  private deduplicateByISRC(tracks: SpotifyTrack[], result: CatalogIngestResult): SpotifyTrack[] {
    const isrcMap = new Map<string, SpotifyTrack>();
    const tracksWithoutISRC: SpotifyTrack[] = [];

    for (const track of tracks) {
      const isrc = track.external_ids?.isrc;
      
      if (!isrc) {
        // Keep tracks without ISRC
        tracksWithoutISRC.push(track);
        continue;
      }

      const existingTrack = isrcMap.get(isrc);
      if (!existingTrack) {
        // First track with this ISRC
        isrcMap.set(isrc, track);
      } else {
        // Duplicate ISRC found - keep the one with higher popularity
        if (track.popularity > existingTrack.popularity) {
          console.log(`SpotifyCatalogIngest: ISRC dedup: Replacing "${existingTrack.name}" (pop: ${existingTrack.popularity}) with "${track.name}" (pop: ${track.popularity})`);
          isrcMap.set(isrc, track);
        } else {
          console.log(`SpotifyCatalogIngest: ISRC dedup: Keeping "${existingTrack.name}" (pop: ${existingTrack.popularity}) over "${track.name}" (pop: ${track.popularity})`);
        }
        result.duplicatesFiltered++;
      }
    }

    const deduplicatedTracks = [...Array.from(isrcMap.values()), ...tracksWithoutISRC];
    
    console.log(`SpotifyCatalogIngest: ISRC deduplication: ${deduplicatedTracks.length} unique tracks from ${tracks.length} (${result.duplicatesFiltered} duplicates removed)`);
    return deduplicatedTracks;
  }

  /**
   * Ingest a single track into the database
   */
  private async ingestTrack(track: SpotifyTrack, artistId: string, result: CatalogIngestResult): Promise<void> {
    try {
      // Prepare song data
      const songData = {
        spotifyId: track.id,
        isrc: track.external_ids?.isrc || null,
        name: track.name,
        albumName: track.album?.name || null,
        artist: track.artists[0]?.name || 'Unknown',
        albumId: track.album?.id || null,
        trackNumber: track.track_number,
        discNumber: track.disc_number || 1,
        albumArtUrl: track.album?.images?.[0]?.url || null,
        releaseDate: track.album?.release_date || null,
        durationMs: track.duration_ms,
        popularity: track.popularity,
        previewUrl: track.preview_url || null,
        spotifyUri: track.uri,
        externalUrls: JSON.stringify(track.external_urls),
        isExplicit: track.explicit,
        isPlayable: !track.is_local,
        isLive: false, // We've already filtered out live tracks
        updatedAt: new Date(),
      };

      // Idempotent upsert based on spotifyId
      const [upsertedSong] = await db
        .insert(songs)
        .values(songData)
        .onConflictDoUpdate({
          target: songs.spotifyId,
          set: {
            name: songData.name,
            albumName: songData.albumName,
            artist: songData.artist,
            trackNumber: songData.trackNumber,
            discNumber: songData.discNumber,
            albumArtUrl: songData.albumArtUrl,
            releaseDate: songData.releaseDate,
            popularity: songData.popularity,
            previewUrl: songData.previewUrl,
            updatedAt: songData.updatedAt,
          },
        })
        .returning({ id: songs.id, spotifyId: songs.spotifyId });

      if (upsertedSong) {
        // Create artist-song relationship
        await db
          .insert(artistSongs)
          .values({
            artistId,
            songId: upsertedSong.id,
            isPrimaryArtist: true,
            updatedAt: new Date(),
          })
          .onConflictDoNothing(); // Avoid duplicates

        result.studioTracksIngested++;

        console.log(`SpotifyCatalogIngest: Ingested studio track: ${track.name} (${track.id} -> ${upsertedSong.id})`);
      } else {
        console.error(`SpotifyCatalogIngest: Failed to upsert song: ${track.name}`);
      }

    } catch (error) {
      console.error(`SpotifyCatalogIngest: Error ingesting track ${track.id}:`, error);
      throw error;
    }
  }

  /**
   * Static method to create and run ingest in one call
   */
  static async ingestForArtist(options: SpotifyIngestOptions): Promise<CatalogIngestResult> {
    const ingest = new SpotifyCatalogIngest({
      concurrency: options.concurrency,
      progressReporter: options.progressReporter,
    });
    
    return await ingest.ingest(options);
  }
}

/**
 * Convenience function for simple catalog ingest operations
 */
export async function ingestSpotifyCatalog(
  artistId: string,
  spotifyId: string,
  options: {
    concurrency?: number;
    progressReporter?: ReturnType<typeof ProgressBus.createReporter>;
  } = {}
): Promise<CatalogIngestResult> {
  return SpotifyCatalogIngest.ingestForArtist({
    artistId,
    spotifyId,
    ...options,
  });
}

/**
 * Utility function to test studio filtering on a sample of tracks
 */
export async function testStudioFiltering(spotifyId: string, limit: number = 50): Promise<{
  totalTracks: number;
  studioTracks: number;
  liveTracksFiltered: number;
  filteringAccuracy: number;
}> {
  console.log(`Testing studio filtering for Spotify artist: ${spotifyId}`);
  
  const albums = await listAllAlbums(spotifyId);
  const sampleAlbums = albums.slice(0, Math.ceil(limit / 10)); // ~10 tracks per album
  
  const allTracks: SpotifyTrack[] = [];
  for (const album of sampleAlbums) {
    const tracks = await listAlbumTracks(album.id);
    allTracks.push(...tracks.slice(0, 10)); // Limit tracks per album
  }
  
  const trackIds = allTracks.map(t => t.id);
  const detailedTracks = await getTracksDetails(trackIds);
  const audioFeatures = await getAudioFeatures(trackIds);
  
  const audioFeaturesMap = new Map<string, SpotifyAudioFeatures>();
  audioFeatures.forEach(f => f && audioFeaturesMap.set(f.id, f));
  
  const ingest = new SpotifyCatalogIngest();
  const result: CatalogIngestResult = {
    albumsProcessed: 0,
    tracksProcessed: 0,
    studioTracksIngested: 0,
    liveFeaturesFiltered: 0,
    liveNameFiltered: 0,
    duplicatesFiltered: 0,
    errors: [],
  };
  
  const studioTracks = (ingest as any).filterStudioTracks(detailedTracks, audioFeaturesMap, result);
  const liveTracksFiltered = result.liveFeaturesFiltered + result.liveNameFiltered;
  
  return {
    totalTracks: detailedTracks.length,
    studioTracks: studioTracks.length,
    liveTracksFiltered,
    filteringAccuracy: liveTracksFiltered > 0 ? (liveTracksFiltered / detailedTracks.length) : 1.0,
  };
}