import {
  artistSongs,
  artists,
  db,
  eq,
  songs as songsTable,
  sql,
} from "@repo/database";
import { SpotifyClient, type SpotifyAlbum, type SpotifyTrack } from "@repo/external-apis";

// Using SpotifyAlbum and SpotifyTrack types from @repo/external-apis

export interface Song {
  spotifyId: string;
  title: string;
  artist: string;
  album: string;
  albumId: string;
  trackNumber: number;
  discNumber: number;
  albumType: string;
  albumArtUrl: string | null;
  releaseDate: string | null;
  durationMs: number;
  popularity: number;
  previewUrl: string | null;
  spotifyUri: string;
  externalUrls: string;
  isExplicit: boolean;
  isPlayable: boolean;
}

export interface SyncResult {
  success: boolean;
  artistId: string;
  totalSongs: number;
  totalAlbums: number;
  processedAlbums: number;
  skippedLiveTracks: number;
  deduplicatedTracks: number;
  syncDuration: number;
  errors: string[];
}

export interface SyncProgress {
  stage:
    | "initializing"
    | "fetching-albums"
    | "processing-album"
    | "deduplicating"
    | "inserting"
    | "completed"
    | "failed";
  progress: number; // 0-100
  message: string;
  currentAlbum?: string;
  processedAlbums?: number;
  totalAlbums?: number;
  processedTracks?: number;
  totalTracks?: number;
}

export class SpotifySongSyncService {
  private spotifyClient: SpotifyClient;
  private progressCallback?: (progress: SyncProgress) => Promise<void>;

  constructor(progressCallback?: (progress: SyncProgress) => Promise<void>) {
    this.spotifyClient = new SpotifyClient({});
    this.progressCallback = progressCallback;
  }

  /**
   * Sync complete artist catalog with smart live track filtering
   */
  async syncArtistCatalog(
    artistId: string,
    spotifyId: string,
  ): Promise<SyncResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    let totalSongs = 0;
    let totalAlbums = 0;
    let skippedLiveTracks = 0;
    let deduplicatedTracks = 0;

    try {
      await this.updateProgress({
        stage: "initializing",
        progress: 5,
        message: "Authenticating with Spotify...",
      });

      // Authenticate with Spotify
      await this.spotifyClient.authenticate();

      await this.updateProgress({
        stage: "fetching-albums",
        progress: 10,
        message: "Fetching artist discography...",
      });

      // Get all albums for the artist
      const allAlbums = await this.getArtistDiscography(spotifyId);
      totalAlbums = allAlbums.length;

      await this.updateProgress({
        stage: "fetching-albums",
        progress: 20,
        message: `Found ${totalAlbums} albums. Processing tracks...`,
        totalAlbums,
      });

      // Process albums in batches for performance
      const batchSize = 5;
      const allSongs: Song[] = [];
      let processedAlbums = 0;

      for (let i = 0; i < allAlbums.length; i += batchSize) {
        const batch = allAlbums.slice(i, i + batchSize);

        const batchResults = await Promise.allSettled(
          batch.map(async (album) => {
            const result = await this.processAlbum(album);

            await this.updateProgress({
              stage: "processing-album",
              progress: 20 + (processedAlbums / totalAlbums) * 50,
              message: `Processing "${album.name}"...`,
              currentAlbum: album.name,
              processedAlbums: processedAlbums + 1,
              totalAlbums,
            });

            return result;
          }),
        );

        // Collect results and count metrics
        for (const [index, result] of batchResults.entries()) {
          processedAlbums++;

          if (result.status === "fulfilled") {
            const { songs: albumSongs, skippedLive } = result.value;
            allSongs.push(...albumSongs);
            skippedLiveTracks += skippedLive;
          } else {
            const albumName = batch[index]?.name || "Unknown";
            errors.push(
              `Failed to process album "${albumName}": ${result.reason}`,
            );
            console.warn(
              `Failed to process album "${albumName}":`,
              result.reason,
            );
          }
        }

        // Rate limiting: pause between batches
        if (i + batchSize < allAlbums.length) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }

      await this.updateProgress({
        stage: "deduplicating",
        progress: 75,
        message: "Removing duplicate tracks...",
        processedAlbums,
      });

      // Deduplicate tracks across all albums
      const { uniqueSongs, duplicateCount } = this.deduplicateTracks(allSongs);
      deduplicatedTracks = duplicateCount;

      await this.updateProgress({
        stage: "inserting",
        progress: 85,
        message: `Inserting ${uniqueSongs.length} unique songs...`,
        processedTracks: uniqueSongs.length,
      });

      // Insert songs in batches
      await this.insertSongs(artistId, uniqueSongs);
      totalSongs = uniqueSongs.length;

      // Update artist sync timestamp
      await db
        .update(artists)
        .set({
          songCatalogSyncedAt: new Date(),
          totalSongs,
          totalAlbums,
          lastFullSyncAt: new Date(),
        })
        .where(eq(artists.id, artistId));

      await this.updateProgress({
        stage: "completed",
        progress: 100,
        message: `Catalog sync completed! ${totalSongs} songs imported.`,
        processedAlbums,
        processedTracks: totalSongs,
      });

      const syncDuration = Date.now() - startTime;

      return {
        success: true,
        artistId,
        totalSongs,
        totalAlbums,
        processedAlbums,
        skippedLiveTracks,
        deduplicatedTracks,
        syncDuration,
        errors,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      errors.push(errorMessage);

      await this.updateProgress({
        stage: "failed",
        progress: 0,
        message: "Catalog sync failed",
      });

      return {
        success: false,
        artistId,
        totalSongs,
        totalAlbums,
        processedAlbums: 0,
        skippedLiveTracks,
        deduplicatedTracks,
        syncDuration: Date.now() - startTime,
        errors,
      };
    }
  }

  /**
   * Get complete artist discography from Spotify
   */
  async getArtistDiscography(spotifyId: string): Promise<SpotifyAlbum[]> {
    const allAlbums: SpotifyAlbum[] = [];
    let offset = 0;
    const limit = 50;
    let hasMore = true;

    while (hasMore) {
      const response = await this.spotifyClient.getArtistAlbums(spotifyId, {
        include_groups: "album,single", // Exclude compilations
        market: "US",
        limit,
        offset,
      });

      const albums = response.items || [];
      allAlbums.push(...albums);

      hasMore = albums.length === limit;
      offset += limit;

      // Rate limiting
      if (hasMore) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    // Remove duplicate albums (same album in different markets)
    const uniqueAlbums = this.removeDuplicateAlbums(allAlbums);
    return uniqueAlbums;
  }

  /**
   * Process individual album and filter out live tracks
   */
  private async processAlbum(
    album: SpotifyAlbum,
  ): Promise<{ songs: Song[]; skippedLive: number }> {
    const songs: Song[] = [];
    let skippedLive = 0;

    // Get all tracks for this album
    let offset = 0;
    const limit = 50;
    let hasMore = true;

    while (hasMore) {
      const tracksResponse = await this.spotifyClient.getAlbumTracks(album.id, {
        limit,
        offset,
        market: "US",
      });

      const tracks = tracksResponse.items || [];

      for (const track of tracks) {
        // Apply smart live track filtering
        if (this.isLivePerformance(track.name, album.name)) {
          skippedLive++;
          continue;
        }

        // Convert to our Song interface
        const song: Song = {
          spotifyId: track.id,
          title: track.name,
          artist: track.artists[0]?.name || "Unknown",
          album: album.name,
          albumId: album.id,
          trackNumber: track.track_number,
          discNumber: track.disc_number,
          albumType: album.album_type,
          albumArtUrl: album.images[0]?.url || null,
          releaseDate: album.release_date || null,
          durationMs: track.duration_ms,
          popularity: track.popularity || 0,
          previewUrl: track.preview_url,
          spotifyUri: (track as any).uri,
          externalUrls: JSON.stringify(track.external_urls),
          isExplicit: track.explicit,
          isPlayable: !(track as any).restrictions,
        };

        songs.push(song);
      }

      hasMore = tracks.length === limit;
      offset += limit;

      // Rate limiting between track fetches
      if (hasMore) {
        await new Promise((resolve) => setTimeout(resolve, 300));
      }
    }

    return { songs, skippedLive };
  }

  /**
   * Smart filtering logic to exclude genuine live performances
   */
  private isLivePerformance(trackName: string, albumName: string): boolean {
    const track = trackName.toLowerCase();
    const album = albumName.toLowerCase();

    return (
      // Clear live performance indicators with venue/location
      track.includes("(live at") ||
      track.includes("(live from") ||
      track.includes("(live in") ||
      track.includes(" - live at") ||
      track.includes(" - live from") ||
      track.includes(" - live in") ||
      track.includes("[live]") ||
      track.includes("live version") ||
      track.includes("live recording") ||
      track.includes("live performance") ||
      track.includes("concert recording") ||
      track.includes("bootleg") ||
      track.includes("audience recording") ||
      track.includes("soundboard") ||
      // Album is clearly a live album
      album.includes("live at") ||
      album.includes("live from") ||
      album.includes("live in") ||
      album.includes("concert") ||
      album.includes("unplugged") ||
      album.includes("mtv unplugged") ||
      // Session recordings from radio/TV (not studio sessions)
      (track.includes("session") &&
        (track.includes("bbc") ||
          track.includes("radio") ||
          track.includes("peel") ||
          track.includes("tv"))) ||
      // Additional live indicators
      track.includes("(acoustic live") ||
      track.includes("(live acoustic") ||
      album.includes("live session") ||
      album.includes("live acoustic") ||
      (album.includes("acoustic session") &&
        (album.includes("radio") ||
          album.includes("bbc") ||
          album.includes("tv")))
    );
  }

  /**
   * Remove duplicate albums (same album in different markets)
   */
  private removeDuplicateAlbums(albums: SpotifyAlbum[]): SpotifyAlbum[] {
    const seen = new Set<string>();
    const unique: SpotifyAlbum[] = [];

    for (const album of albums) {
      // Use album name + release year as deduplication key
      const releaseYear = album.release_date.slice(0, 4);
      const key = `${this.normalizeTitle(album.name)}_${releaseYear}`;

      if (!seen.has(key)) {
        seen.add(key);
        unique.push(album);
      }
    }

    return unique;
  }

  /**
   * Deduplicate tracks by similarity matching
   */
  private deduplicateTracks(songs: Song[]): {
    uniqueSongs: Song[];
    duplicateCount: number;
  } {
    const seenTitles = new Map<string, Song>();
    const duplicates: Song[] = [];

    for (const song of songs) {
      const normalizedTitle = this.normalizeTitle(song.title);
      const existing = seenTitles.get(normalizedTitle);

      if (existing) {
        // Keep the version with higher popularity, or the first one if equal
        if (song.popularity > existing.popularity) {
          duplicates.push(existing);
          seenTitles.set(normalizedTitle, song);
        } else {
          duplicates.push(song);
        }
      } else {
        seenTitles.set(normalizedTitle, song);
      }
    }

    return {
      uniqueSongs: Array.from(seenTitles.values()),
      duplicateCount: duplicates.length,
    };
  }

  /**
   * Normalize song titles for deduplication
   */
  private normalizeTitle(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^\w\s]/g, "") // Remove punctuation
      .replace(/\s+/g, " ") // Normalize whitespace
      .replace(
        /\b(radio edit|album version|remaster|remastered|extended|extended mix|radio mix|single version|explicit|clean)\b/g,
        "",
      )
      .trim();
  }

  /**
   * Insert songs in batches for performance
   */
  private async insertSongs(artistId: string, songs: Song[]): Promise<void> {
    const batchSize = 100;

    for (let i = 0; i < songs.length; i += batchSize) {
      const batch = songs.slice(i, i + batchSize);

      // Insert songs
      const insertedSongs = await db
        .insert(songsTable)
        .values(
          batch.map((song) => ({
            spotifyId: song.spotifyId,
            name: song.title,
            artist: song.artist,
            albumName: song.album,
            albumId: song.albumId,
            trackNumber: song.trackNumber,
            discNumber: song.discNumber,
            albumType: song.albumType,
            albumArtUrl: song.albumArtUrl,
            releaseDate: song.releaseDate,
            durationMs: song.durationMs,
            popularity: song.popularity,
            previewUrl: song.previewUrl,
            spotifyUri: song.spotifyUri,
            externalUrls: song.externalUrls,
            isExplicit: song.isExplicit,
            isPlayable: song.isPlayable,
          })),
        )
        .onConflictDoUpdate({
          target: songsTable.spotifyId,
          set: {
            name: sql`excluded.name`,
            popularity: sql`excluded.popularity`,
            isPlayable: sql`excluded.is_playable`,
            albumArtUrl: sql`excluded.album_art_url`,
          },
        })
        .returning({ id: songsTable.id, spotifyId: songsTable.spotifyId });

      // Create artist-song relationships
      const relationshipData = insertedSongs.map((song) => ({
        artistId,
        songId: song.id,
        isPrimaryArtist: true,
      }));

      await db
        .insert(artistSongs)
        .values(relationshipData)
        .onConflictDoNothing();

      // Progress update
      await this.updateProgress({
        stage: "inserting",
        progress: 85 + ((i + batch.length) / songs.length) * 10,
        message: `Inserted ${Math.min(i + batch.length, songs.length)} of ${songs.length} songs...`,
        processedTracks: Math.min(i + batch.length, songs.length),
      });

      // Rate limiting between batches
      if (i + batchSize < songs.length) {
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
    }
  }

  /**
   * Update sync progress
   */
  private async updateProgress(progress: Partial<SyncProgress>): Promise<void> {
    if (this.progressCallback) {
      const fullProgress: SyncProgress = {
        stage: "initializing",
        progress: 0,
        message: "",
        ...progress,
      };

      await this.progressCallback(fullProgress);
    }
  }
}
