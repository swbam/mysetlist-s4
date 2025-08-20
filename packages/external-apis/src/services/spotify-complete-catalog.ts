import { artistSongs, artists, db, eq, songs, sql } from "@repo/database";
import { SpotifyClient } from "../clients/spotify";
// import { SyncServiceError } from "../utils/error-handler";

export interface CatalogSyncResult {
  totalSongs: number;
  totalAlbums: number;
  studioTracks: number;
  skippedLiveTracks: number;
  deduplicatedTracks: number;
  errors: string[];
  syncDuration: number;
}

export interface AlbumData {
  id: string;
  name: string;
  type: string;
  releaseDate: string;
  totalTracks: number;
  images: Array<{ url: string; height: number; width: number }>;
}

export interface TrackData {
  id: string;
  name: string;
  duration: number;
  explicit: boolean;
  popularity: number;
  previewUrl: string | null;
  album: AlbumData;
  artists: Array<{ id: string; name: string }>;
  trackNumber: number;
  discNumber: number;
}

export class SpotifyCompleteCatalog {
  private spotifyClient: SpotifyClient;
  private processedAlbums = new Set<string>();
  // private processedTracks = new Map<string, TrackData>(); // Unused variable
  private liveTrackPatterns = [
    /\(live\s*(at|from|in|@)?.*?\)/i,
    /\s-\s+live\s*(at|from|in|@)?/i,
    /live\s+version/i,
    /live\s+recording/i,
    /concert\s+recording/i,
    /unplugged/i,
    /mtv\s+live/i,
    /bbc\s+session/i,
  ];

  private skipPatterns = [
    /remix/i,
    /acoustic\s+version/i,
    /radio\s+edit/i,
    /demo/i,
    /instrumental/i,
    /karaoke/i,
    /commentary/i,
    /interview/i,
    /skit/i,
    /intro$/i,
    /outro$/i,
    /interlude$/i,
  ];

  constructor() {
    this.spotifyClient = new SpotifyClient({});
  }

  /**
   * Import entire discography for an artist
   */
  async importEntireDiscography(
    spotifyArtistId: string,
    options: {
      includeCompilations?: boolean;
      includeAppearsOn?: boolean;
      skipLive?: boolean;
      skipRemixes?: boolean;
      onProgress?: (message: string, progress: number) => void;
    } = {},
  ): Promise<CatalogSyncResult> {
    const startTime = Date.now();
    const result: CatalogSyncResult = {
      totalSongs: 0,
      totalAlbums: 0,
      studioTracks: 0,
      skippedLiveTracks: 0,
      deduplicatedTracks: 0,
      errors: [],
      syncDuration: 0,
    };

    try {
      await this.spotifyClient.authenticate();

      // Get artist details
      const artistDetails = await this.spotifyClient.getArtist(spotifyArtistId);
      if (!artistDetails) {
        throw new Error(`Artist not found: ${spotifyArtistId}`);
      }

      // Fetch ALL albums in parallel
      options.onProgress?.("Fetching albums...", 10);
      const albums = await this.fetchAllAlbums(spotifyArtistId, options);
      result.totalAlbums = albums.length;

      // Process albums in batches to get tracks
      options.onProgress?.("Fetching tracks from albums...", 30);
      const allTracks = await this.fetchAllTracksFromAlbums(albums, options);

      // Filter and deduplicate tracks
      options.onProgress?.("Filtering and deduplicating tracks...", 60);
      const { studioTracks, liveTracksSkipped, duplicatesRemoved } =
        await this.filterAndDeduplicateTracks(allTracks, options);

      result.skippedLiveTracks = liveTracksSkipped;
      result.deduplicatedTracks = duplicatesRemoved;
      result.studioTracks = studioTracks.length;

      // Store tracks in database
      options.onProgress?.("Saving tracks to database...", 80);
      const savedTracks = await this.saveTracksToDatabase(
        studioTracks,
        spotifyArtistId,
      );
      result.totalSongs = savedTracks;

      // Update artist catalog sync timestamp
      await this.updateArtistCatalogStatus(spotifyArtistId, result);

      options.onProgress?.("Catalog sync completed!", 100);
    } catch (error) {
      console.error("Catalog sync failed:", error);
      result.errors.push(
        error instanceof Error ? error.message : String(error),
      );
      throw error;
    } finally {
      result.syncDuration = Date.now() - startTime;
    }

    return result;
  }

  /**
   * Fetch all albums for an artist with pagination
   */
  private async fetchAllAlbums(
    artistId: string,
    options: any,
  ): Promise<AlbumData[]> {
    const albumTypes = ["album", "single"];
    if (options.includeCompilations) {
      albumTypes.push("compilation");
    }
    if (options.includeAppearsOn) {
      albumTypes.push("appears_on");
    }

    const allAlbums: AlbumData[] = [];
    const batchSize = 50; // Spotify max limit

    for (const albumType of albumTypes) {
      let offset = 0;
      let hasMore = true;

      while (hasMore) {
        try {
          const response = await this.spotifyClient.getArtistAlbums(artistId, {
            include_groups: albumType,
            limit: batchSize,
            offset,
            market: "US",
          });

          if (response?.items && response.items.length > 0) {
            allAlbums.push(
              ...response.items.map(
                (item: any) =>
                  ({
                    ...item,
                    type: item.album_type || "album",
                    releaseDate: item.release_date || "",
                    totalTracks: item.total_tracks || 0,
                  }) as AlbumData,
              ),
            );
            offset += response.items.length;
            hasMore = response.items.length === batchSize;
          } else {
            hasMore = false;
          }

          // Rate limiting
          await this.delay(100);
        } catch (error) {
          console.warn(
            `Failed to fetch ${albumType} albums at offset ${offset}:`,
            error,
          );
          hasMore = false;
        }
      }
    }

    // Remove duplicate albums by ID
    const uniqueAlbums = new Map<string, AlbumData>();
    allAlbums.forEach((album) => {
      if (!uniqueAlbums.has(album.id)) {
        uniqueAlbums.set(album.id, album);
        this.processedAlbums.add(album.id);
      }
    });

    return Array.from(uniqueAlbums.values());
  }

  /**
   * Fetch all tracks from albums in parallel batches
   */
  private async fetchAllTracksFromAlbums(
    albums: AlbumData[],
    options: any,
  ): Promise<TrackData[]> {
    const allTracks: TrackData[] = [];
    const batchSize = 10; // Process 10 albums at a time

    // Create batches
    const batches: AlbumData[][] = [];
    for (let i = 0; i < albums.length; i += batchSize) {
      batches.push(albums.slice(i, i + batchSize));
    }

    // Process each batch
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      const progress = 30 + (batchIndex / batches.length) * 30;
      options.onProgress?.(
        `Processing albums ${batchIndex * batchSize + 1}-${Math.min(
          (batchIndex + 1) * batchSize,
          albums.length,
        )} of ${albums.length}...`,
        progress,
      );

      const batchPromises = batch?.map(async (album) => {
        try {
          const tracks = await this.getAlbumTracks(album.id);
          return tracks.map((track) => ({
            ...track,
            album: album,
          }));
        } catch (error) {
          console.warn(
            `Failed to fetch tracks for album ${album.name}:`,
            error,
          );
          return [];
        }
      });

      const batchResults = await Promise.all(batchPromises || []);
      allTracks.push(...batchResults.flat());

      // Rate limiting between batches
      if (batchIndex < batches.length - 1) {
        await this.delay(500);
      }
    }

    return allTracks;
  }

  /**
   * Get all tracks from an album with pagination
   */
  private async getAlbumTracks(albumId: string): Promise<any[]> {
    const tracks: any[] = [];
    let offset = 0;
    const limit = 50;
    let hasMore = true;

    while (hasMore) {
      try {
        const response = await this.spotifyClient.getArtistAlbums(albumId, {
          limit,
          offset,
          market: "US",
        });

        if (response?.items && response.items.length > 0) {
          tracks.push(...response.items);
          offset += response.items.length;
          hasMore = response.items.length === limit;
        } else {
          hasMore = false;
        }
      } catch (error) {
        console.warn(`Failed to fetch tracks at offset ${offset}:`, error);
        hasMore = false;
      }
    }

    return tracks;
  }

  /**
   * Filter out live tracks, remixes, and deduplicate
   */
  private async filterAndDeduplicateTracks(
    tracks: TrackData[],
    options: any,
  ): Promise<{
    studioTracks: TrackData[];
    liveTracksSkipped: number;
    duplicatesRemoved: number;
  }> {
    let liveTracksSkipped = 0;
    let duplicatesRemoved = 0;
    const trackMap = new Map<string, TrackData>();

    for (const track of tracks) {
      const trackName = track.name || "";
      const albumName = track.album?.name || "";

      // Skip live tracks if requested
      if (options.skipLive !== false) {
        const isLive = this.isLiveTrack(trackName, albumName);
        if (isLive) {
          liveTracksSkipped++;
          continue;
        }
      }

      // Skip remixes and other versions if requested
      if (options.skipRemixes !== false) {
        const shouldSkip = this.shouldSkipTrack(trackName);
        if (shouldSkip) {
          liveTracksSkipped++; // Count as skipped
          continue;
        }
      }

      // Deduplicate by normalized name
      const normalizedName = this.normalizeTrackName(trackName);

      if (trackMap.has(normalizedName)) {
        // Keep the version with higher popularity or from an album (not single)
        const existing = trackMap.get(normalizedName)!;

        const shouldReplace =
          track.popularity > existing.popularity ||
          (track.album?.type === "album" && existing.album?.type === "single");

        if (shouldReplace) {
          trackMap.set(normalizedName, track);
        }
        duplicatesRemoved++;
      } else {
        trackMap.set(normalizedName, track);
      }
    }

    return {
      studioTracks: Array.from(trackMap.values()),
      liveTracksSkipped,
      duplicatesRemoved,
    };
  }

  /**
   * Check if a track is a live recording
   */
  private isLiveTrack(trackName: string, albumName: string): boolean {
    const combinedText = `${trackName} ${albumName}`.toLowerCase();

    // Check against live patterns
    for (const pattern of this.liveTrackPatterns) {
      if (pattern.test(combinedText)) {
        return true;
      }
    }

    // Additional checks for common live album indicators
    if (
      albumName.toLowerCase().includes("live at") ||
      albumName.toLowerCase().includes("live from") ||
      albumName.toLowerCase().includes("concert") ||
      albumName.toLowerCase().includes("unplugged")
    ) {
      return true;
    }

    return false;
  }

  /**
   * Check if a track should be skipped
   */
  private shouldSkipTrack(trackName: string): boolean {
    const name = trackName.toLowerCase();

    for (const pattern of this.skipPatterns) {
      if (pattern.test(name)) {
        return true;
      }
    }

    // Skip very short tracks (likely interludes/skits)
    // This would need duration info passed in

    return false;
  }

  /**
   * Normalize track name for deduplication
   */
  private normalizeTrackName(name: string): string {
    return name
      .toLowerCase()
      .replace(/\s*\([^)]*\)/g, "") // Remove parenthetical content
      .replace(/\s*\[[^\]]*\]/g, "") // Remove bracketed content
      .replace(/\s*-\s*.*/g, "") // Remove everything after dash
      .replace(/[^a-z0-9]/g, "") // Remove special characters
      .trim();
  }

  /**
   * Save tracks to database with artist linkage
   */
  private async saveTracksToDatabase(
    tracks: TrackData[],
    spotifyArtistId: string,
  ): Promise<number> {
    if (tracks.length === 0) return 0;

    // Get artist ID from database
    const [artist] = await db
      .select()
      .from(artists)
      .where(eq(artists.spotifyId, spotifyArtistId))
      .limit(1);

    if (!artist) {
      throw new Error(`Artist not found in database: ${spotifyArtistId}`);
    }

    // Prepare song records
    const songRecords = tracks.map((track) => ({
      spotifyId: track.id,
      name: track.name,
      durationMs: track.duration || null,
      explicit: track.explicit || false,
      popularity: track.popularity || 0,
      previewUrl: track.previewUrl || null,
      albumName: track.album?.name || null,
      albumArtUrl: track.album?.images?.[0]?.url || null,
      releaseDate: track.album?.releaseDate || null,
      artist: track.artists?.map((a) => a.name).join(", ") || "",
      trackNumber: track.trackNumber || null,
      discNumber: track.discNumber || null,
    }));

    // Batch insert songs
    const batchSize = 100;
    let totalInserted = 0;

    for (let i = 0; i < songRecords.length; i += batchSize) {
      const batch = songRecords.slice(i, i + batchSize);

      const insertedSongs = await db
        .insert(songs)
        .values(batch as any)
        .onConflictDoUpdate({
          target: songs.spotifyId,
          set: {
            popularity: sql`GREATEST(${songs.popularity}, EXCLUDED.popularity)`,
            albumName: sql`COALESCE(EXCLUDED.album_name, ${songs.albumName})`,
            albumArtUrl: sql`COALESCE(EXCLUDED.album_art_url, ${songs.albumArtUrl})`,
            updatedAt: new Date(),
          },
        })
        .returning({ id: songs.id, spotifyId: songs.spotifyId });

      // Link songs to artist
      const artistSongRecords = insertedSongs.map((song) => ({
        artistId: artist.id,
        songId: song.id,
      }));

      await db
        .insert(artistSongs)
        .values(artistSongRecords)
        .onConflictDoNothing();

      totalInserted += insertedSongs.length;
    }

    return totalInserted;
  }

  /**
   * Update artist with catalog sync status
   */
  private async updateArtistCatalogStatus(
    spotifyArtistId: string,
    result: CatalogSyncResult,
  ): Promise<void> {
    await db
      .update(artists)
      .set({
        songCatalogSyncedAt: new Date(),
        totalSongs: result.totalSongs,
        totalAlbums: result.totalAlbums,
        lastFullSyncAt: new Date(),
        // Store catalog metadata in a separate field if needed
        // catalogMetadata: JSON.stringify({
        //   studioTracks: result.studioTracks,
        //   skippedLiveTracks: result.skippedLiveTracks,
        //   deduplicatedTracks: result.deduplicatedTracks,
        //   syncDuration: result.syncDuration,
        //   lastSyncDate: new Date().toISOString(),
        // }),
      })
      .where(eq(artists.spotifyId, spotifyArtistId));
  }

  /**
   * Utility delay function for rate limiting
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get sync status for an artist
   */
  async getArtistCatalogStatus(spotifyArtistId: string): Promise<{
    synced: boolean;
    lastSyncedAt: Date | null;
    totalSongs: number;
    needsUpdate: boolean;
  }> {
    const [artist] = await db
      .select({
        songCatalogSyncedAt: artists.songCatalogSyncedAt,
        totalSongs: artists.totalSongs,
        lastFullSyncAt: artists.lastFullSyncAt,
      })
      .from(artists)
      .where(eq(artists.spotifyId, spotifyArtistId))
      .limit(1);

    if (!artist) {
      return {
        synced: false,
        lastSyncedAt: null,
        totalSongs: 0,
        needsUpdate: true,
      };
    }

    const daysSinceSync = artist.songCatalogSyncedAt
      ? (Date.now() - artist.songCatalogSyncedAt.getTime()) /
        (1000 * 60 * 60 * 24)
      : Number.POSITIVE_INFINITY;

    return {
      synced: !!artist.songCatalogSyncedAt,
      lastSyncedAt: artist.songCatalogSyncedAt,
      totalSongs: artist.totalSongs || 0,
      needsUpdate: daysSinceSync > 30, // Update if older than 30 days
    };
  }
}
