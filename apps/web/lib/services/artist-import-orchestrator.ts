import {
  artistSongs,
  artists,
  db,
  eq,
  setlistSongs,
  setlists,
  shows,
  songs,
  sql,
  venues,
} from "@repo/database";
import { SpotifyClient } from "@repo/external-apis/src/clients/spotify";
import { TicketmasterClient } from "@repo/external-apis/src/clients/ticketmaster";
import { ArtistSyncService } from "@repo/external-apis/src/services/artist-sync";
import { ShowSyncService } from "@repo/external-apis/src/services/show-sync";
import { VenueSyncService } from "@repo/external-apis/src/services/venue-sync";
import { updateImportStatus } from "~/lib/import-status";

// ================================
// Types and Interfaces
// ================================

export interface ImportProgress {
  stage:
    | "initializing"
    | "syncing-identifiers"
    | "importing-songs"
    | "importing-shows"
    | "creating-setlists"
    | "completed"
    | "failed";
  progress: number; // 0-100
  message: string;
  error?: string;
  completedAt?: string;
  artistId?: string;
  totalSongs?: number;
  totalShows?: number;
  totalVenues?: number;
  phaseStartTime?: number;
  estimatedTimeRemaining?: number;
}

export interface ImportResult {
  success: boolean;
  artistId: string;
  slug: string;
  totalSongs: number;
  totalShows: number;
  totalVenues: number;
  importDuration: number;
  stages: ImportProgress[];
  phaseTimings: {
    phase1Duration: number;
    phase2Duration: number;
    phase3Duration: number;
  };
}

export interface ArtistBasicData {
  artistId: string;
  slug: string;
  name: string;
  imageUrl?: string;
  spotifyId?: string;
  ticketmasterId: string;
  genres: string[];
  popularity: number;
  followers: number;
}

export interface ShowsData {
  totalShows: number;
  upcomingShows: number;
  pastShows: number;
  venuesCreated: number;
}

export interface SongCatalogData {
  totalSongs: number;
  totalAlbums: number;
  studioTracks: number;
  skippedLiveTracks: number;
  deduplicatedTracks: number;
}

// ================================
// Error Handling
// ================================

export class ImportError extends Error {
  constructor(
    message: string,
    public readonly stage: ImportProgress["stage"],
    public readonly originalError?: Error,
  ) {
    super(message);
    this.name = "ImportError";
  }
}

// ================================
// Main Orchestrator Service
// ================================

export class ArtistImportOrchestrator {
  private spotifyClient: SpotifyClient;
  private ticketmasterClient: TicketmasterClient;
  private artistSyncService: ArtistSyncService;
  private showSyncService: ShowSyncService;
  private venueSyncService: VenueSyncService;
  private progressCallback?: (progress: ImportProgress) => Promise<void>;

  constructor(progressCallback?: (progress: ImportProgress) => Promise<void>) {
    this.spotifyClient = new SpotifyClient({});
    this.ticketmasterClient = new TicketmasterClient({
      apiKey: process.env.TICKETMASTER_API_KEY || "",
    });
    this.artistSyncService = new ArtistSyncService();
    this.showSyncService = new ShowSyncService();
    this.venueSyncService = new VenueSyncService();
    this.progressCallback = progressCallback;
  }

  /**
   * Main orchestration method following the optimal timing strategy
   */
  async importArtist(tmAttractionId: string): Promise<ImportResult> {
    const startTime = Date.now();
    const stages: ImportProgress[] = [];
    let artistData: ArtistBasicData | null = null;
    const phase1StartTime = Date.now();

    try {
      // ========================================
      // PHASE 1: Instant Artist Page Load (< 3 seconds)
      // ========================================

      await this.updateProgress({
        stage: "initializing",
        progress: 5,
        message: "Starting artist import process...",
        phaseStartTime: phase1StartTime,
      });

      artistData = await this.processPhase1(tmAttractionId);
      const phase1Duration = Date.now() - phase1StartTime;

      await this.updateProgress({
        stage: "syncing-identifiers",
        progress: 25,
        message: `Artist "${artistData.name}" created! Starting background sync...`,
        artistId: artistData.artistId,
        phaseStartTime: phase1StartTime,
      });

      // ========================================
      // PHASE 2 & 3: Background Processing (Parallel)
      // ========================================

      const phase2StartTime = Date.now();
      const phase3StartTime = Date.now();

      // Run Phase 2 and Phase 3 in parallel for optimal performance
      const [showsResult, songsResult] = await Promise.allSettled([
        this.processPhase2(artistData.artistId),
        this.processPhase3(artistData.artistId),
      ]);

      const phase2Duration = Date.now() - phase2StartTime;
      const phase3Duration = Date.now() - phase3StartTime;

      // Handle results
      let showsData: ShowsData = {
        totalShows: 0,
        upcomingShows: 0,
        pastShows: 0,
        venuesCreated: 0,
      };
      let songsData: SongCatalogData = {
        totalSongs: 0,
        totalAlbums: 0,
        studioTracks: 0,
        skippedLiveTracks: 0,
        deduplicatedTracks: 0,
      };

      if (showsResult.status === "fulfilled") {
        showsData = showsResult.value;
      } else {
        console.error("Phase 2 (shows) failed:", showsResult.reason);
      }

      if (songsResult.status === "fulfilled") {
        songsData = songsResult.value;
      } else {
        console.error("Phase 3 (songs) failed:", songsResult.reason);
      }

      // ========================================
      // SETLIST CREATION
      // ========================================

      await this.updateProgress({
        stage: "creating-setlists",
        progress: 95,
        message: "Creating initial setlists for upcoming shows...",
        artistId: artistData.artistId,
        totalSongs: songsData.totalSongs,
        totalShows: showsData.totalShows,
      });

      await this.createInitialSetlists(artistData.artistId);

      // ========================================
      // COMPLETION
      // ========================================

      await this.updateProgress({
        stage: "completed",
        progress: 100,
        message: `Import completed! ${songsData.totalSongs} songs, ${showsData.totalShows} shows imported.`,
        artistId: artistData.artistId,
        completedAt: new Date().toISOString(),
        totalSongs: songsData.totalSongs,
        totalShows: showsData.totalShows,
        totalVenues: showsData.venuesCreated,
      });

      const totalDuration = Date.now() - startTime;

      return {
        success: true,
        artistId: artistData.artistId,
        slug: artistData.slug,
        totalSongs: songsData.totalSongs,
        totalShows: showsData.totalShows,
        totalVenues: showsData.venuesCreated,
        importDuration: totalDuration,
        stages,
        phaseTimings: {
          phase1Duration,
          phase2Duration,
          phase3Duration,
        },
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      await this.updateProgress({
        stage: "failed",
        progress: 0,
        message: "Import failed",
        error: errorMessage,
        artistId: artistData?.artistId,
        completedAt: new Date().toISOString(),
      });

      throw new ImportError(
        `Artist import failed: ${errorMessage}`,
        "failed",
        error instanceof Error ? error : undefined,
      );
    }
  }

  /**
   * PHASE 1: Instant Artist Page Load (< 3 seconds)
   * Creates minimal artist record with Ticketmaster + basic Spotify data
   * Returns artistId + slug immediately for navigation
   */
  async processPhase1(tmAttractionId: string): Promise<ArtistBasicData> {
    const maxPhase1Time = 3000; // 3 seconds max
    const phaseStartTime = Date.now();

    try {
      // Step 1: Get artist from Ticketmaster (with timeout)
      await this.updateProgress({
        stage: "initializing",
        progress: 10,
        message: "Getting artist details from Ticketmaster...",
      });

      const tmArtist = await this.withTimeout(
        this.ticketmasterClient.getAttraction(tmAttractionId),
        2000, // 2 second timeout for TM API
        "Ticketmaster API timeout",
      );

      if (!tmArtist || !tmArtist.name) {
        throw new ImportError(
          `Artist not found on Ticketmaster: ${tmAttractionId}`,
          "initializing",
        );
      }

      // Step 2: Quick Spotify lookup (with timeout)
      await this.updateProgress({
        stage: "syncing-identifiers",
        progress: 15,
        message: `Found ${tmArtist.name}. Looking up on Spotify...`,
      });

      let spotifyArtist: any = null;
      try {
        await this.spotifyClient.authenticate();
        const remainingTime = maxPhase1Time - (Date.now() - phaseStartTime);

        if (remainingTime > 500) {
          // Only try Spotify if we have time
          const spotifySearch = await this.withTimeout(
            this.spotifyClient.searchArtists(tmArtist.name, 5),
            Math.min(remainingTime - 200, 1000), // Reserve time for DB ops
            "Spotify search timeout",
          );

          if (spotifySearch?.artists?.items?.length > 0) {
            spotifyArtist =
              spotifySearch.artists.items.find((artist: any) =>
                this.isArtistNameMatch(tmArtist.name, artist.name),
              ) || spotifySearch.artists.items[0];
          }
        }
      } catch (spotifyError) {
        console.warn(
          "Spotify lookup failed in Phase 1, will retry in background:",
          spotifyError,
        );
        // Continue without Spotify data - will be filled in Phase 2
      }

      // Step 3: Create minimal artist record for instant page load
      const slug = this.generateSlug(spotifyArtist?.name || tmArtist.name);

      await this.updateProgress({
        stage: "syncing-identifiers",
        progress: 20,
        message: "Creating artist record...",
      });

      const artistData = {
        spotifyId: spotifyArtist?.id || null,
        ticketmasterId: tmAttractionId,
        name: spotifyArtist?.name || tmArtist.name,
        slug,
        imageUrl: spotifyArtist?.images?.[0]?.url || tmArtist.imageUrl || null,
        smallImageUrl: spotifyArtist?.images?.[2]?.url || null,
        genres: JSON.stringify(spotifyArtist?.genres || tmArtist.genres || []),
        popularity: spotifyArtist?.popularity || 0,
        followers: spotifyArtist?.followers?.total || 0,
        externalUrls: JSON.stringify(spotifyArtist?.external_urls || {}),
        verified: false,
        lastSyncedAt: new Date(),
      };

      const [newArtist] = await db
        .insert(artists)
        .values(artistData)
        .onConflictDoUpdate({
          target: artists.ticketmasterId,
          set: {
            ...artistData,
            updatedAt: new Date(),
          },
        })
        .returning({ id: artists.id, slug: artists.slug, name: artists.name });

      if (!newArtist) {
        throw new ImportError(
          "Failed to create artist record",
          "syncing-identifiers",
        );
      }

      const phase1Duration = Date.now() - phaseStartTime;
      console.log(`Phase 1 completed in ${phase1Duration}ms`);

      return {
        artistId: newArtist.id,
        slug: newArtist.slug,
        name: newArtist.name,
        imageUrl: artistData.imageUrl || undefined,
        spotifyId: artistData.spotifyId || undefined,
        ticketmasterId: tmAttractionId,
        genres: spotifyArtist?.genres || tmArtist.genres || [],
        popularity: artistData.popularity,
        followers: artistData.followers,
      };
    } catch (error) {
      const phase1Duration = Date.now() - phaseStartTime;
      console.error(`Phase 1 failed after ${phase1Duration}ms:`, error);
      throw error;
    }
  }

  /**
   * PHASE 2: Priority Background Sync (3-15 seconds)
   * Import upcoming shows (next 10-15 shows)
   * Import recent past shows (last 20 shows)
   * Create venue records for all shows
   */
  async processPhase2(artistId: string): Promise<ShowsData> {
    const phaseStartTime = Date.now();

    try {
      await this.updateProgress({
        stage: "importing-shows",
        progress: 30,
        message: "Importing shows and venues...",
      });

      // Get artist details for show sync
      const [artist] = await db
        .select()
        .from(artists)
        .where(eq(artists.id, artistId))
        .limit(1);

      if (!artist) {
        throw new ImportError(
          `Artist not found: ${artistId}`,
          "importing-shows",
        );
      }

      // Import shows using the enhanced sync service
      const syncResult = await this.showSyncService.syncArtistShows(artistId);

      await this.updateProgress({
        stage: "importing-shows",
        progress: 60,
        message: `Imported ${syncResult.upcomingShows} shows and venues`,
      });

      // Count venue records created
      const venueCount = await this.getUniqueVenueCount(artistId);

      const phase2Duration = Date.now() - phaseStartTime;
      console.log(`Phase 2 completed in ${phase2Duration}ms`);

      return {
        totalShows: syncResult.upcomingShows,
        upcomingShows: syncResult.upcomingShows,
        pastShows: 0, // Will be enhanced in future iterations
        venuesCreated: venueCount,
      };
    } catch (error) {
      const phase2Duration = Date.now() - phaseStartTime;
      console.error(`Phase 2 failed after ${phase2Duration}ms:`, error);
      throw new ImportError(
        "Phase 2 show sync failed",
        "importing-shows",
        error instanceof Error ? error : undefined,
      );
    }
  }

  /**
   * PHASE 3: Song Catalog Sync (15-90 seconds)
   * Import ALL studio albums from Spotify
   * Filter out live tracks using smart logic
   * Deduplicate similar tracks across albums
   * Link songs via artist_songs table
   */
  async processPhase3(artistId: string): Promise<SongCatalogData> {
    const phaseStartTime = Date.now();

    try {
      await this.updateProgress({
        stage: "importing-songs",
        progress: 40,
        message: "Importing complete song catalog...",
      });

      // Get artist details
      const [artist] = await db
        .select()
        .from(artists)
        .where(eq(artists.id, artistId))
        .limit(1);

      if (!artist || !artist.spotifyId) {
        throw new ImportError(
          "Artist not found or missing Spotify ID",
          "importing-songs",
        );
      }

      // Use the enhanced catalog sync from ArtistSyncService
      const catalogResult = await this.artistSyncService.syncCatalog(
        artist.spotifyId,
      );

      await this.updateProgress({
        stage: "importing-songs",
        progress: 80,
        message: `Imported ${catalogResult.totalSongs} studio songs (filtered ${catalogResult.skippedLiveTracks} live tracks)`,
      });

      // Update artist record with catalog sync timestamp
      await db
        .update(artists)
        .set({
          songCatalogSyncedAt: new Date(),
          totalSongs: catalogResult.totalSongs,
          totalAlbums: catalogResult.totalAlbums,
          lastFullSyncAt: new Date(),
        })
        .where(eq(artists.id, artistId));

      const phase3Duration = Date.now() - phaseStartTime;
      console.log(`Phase 3 completed in ${phase3Duration}ms`);

      return {
        totalSongs: catalogResult.totalSongs,
        totalAlbums: catalogResult.totalAlbums,
        studioTracks: catalogResult.totalSongs,
        skippedLiveTracks: catalogResult.skippedLiveTracks,
        deduplicatedTracks: catalogResult.deduplicatedTracks,
      };
    } catch (error) {
      const phase3Duration = Date.now() - phaseStartTime;
      console.error(`Phase 3 failed after ${phase3Duration}ms:`, error);
      throw new ImportError(
        "Phase 3 catalog sync failed",
        "importing-songs",
        error instanceof Error ? error : undefined,
      );
    }
  }

  /**
   * Create initial setlists for upcoming shows with artist's top songs
   */
  private async createInitialSetlists(artistId: string): Promise<void> {
    try {
      // Get artist's top songs (studio tracks only)
      const topSongs = await db
        .select({
          id: songs.id,
          title: songs.title,
          popularity: songs.popularity,
        })
        .from(songs)
        .innerJoin(artistSongs, eq(songs.id, artistSongs.songId))
        .where(eq(artistSongs.artistId, artistId))
        .orderBy(sql`${songs.popularity} DESC NULLS LAST`)
        .limit(30); // Get more songs for variety

      if (topSongs.length === 0) {
        console.log("No songs found for setlist creation");
        return;
      }

      // Get upcoming shows without setlists
      const upcomingShows = await db
        .select()
        .from(shows)
        .where(eq(shows.headlinerArtistId, artistId))
        .limit(15); // Limit to recent shows

      for (const show of upcomingShows) {
        // Check if setlist already exists
        const existingSetlist = await db
          .select()
          .from(setlists)
          .where(eq(setlists.showId, show.id))
          .limit(1);

        if (existingSetlist.length > 0) {
          continue;
        }

        // Create predicted setlist
        const [newSetlist] = await db
          .insert(setlists)
          .values({
            showId: show.id,
            artistId: show.headlinerArtistId,
            type: "predicted",
            name: `${show.name} - Predicted Setlist`,
            orderIndex: 0,
            isLocked: false,
            totalVotes: 0,
          } as any)
          .returning({ id: setlists.id });

        if (newSetlist?.id) {
          // Select 8-12 songs intelligently
          const selectedSongs = this.selectDiverseSetlistSongs(topSongs, 8, 12);

          const setlistSongData = selectedSongs.map((song, index) => ({
            setlistId: newSetlist.id,
            songId: song.id,
            position: index + 1,
            upvotes: 0,
          }));

          await db.insert(setlistSongs).values(setlistSongData as any);
        }
      }
    } catch (error) {
      console.warn("Failed to create initial setlists:", error);
      // Don't throw - setlist creation is not critical for import success
    }
  }

  // ================================
  // Helper Methods
  // ================================

  /**
   * Select diverse songs for setlist (mix of popular and variety)
   */
  private selectDiverseSetlistSongs(
    songs: Array<{ id: string; title: string; popularity: number | null }>,
    minSongs: number,
    maxSongs: number,
  ): Array<{ id: string; title: string; popularity: number | null }> {
    if (songs.length === 0) return [];

    // Sort by popularity (high to low)
    const sortedSongs = [...songs].sort(
      (a, b) => (b.popularity || 0) - (a.popularity || 0),
    );

    // Take top 50% for guaranteed popular songs
    const popularSongs = sortedSongs.slice(
      0,
      Math.ceil(sortedSongs.length * 0.5),
    );

    // Take remaining for variety
    const varietySongs = sortedSongs.slice(Math.ceil(sortedSongs.length * 0.5));

    // Select songs: 60% popular, 40% variety
    const targetCount =
      Math.floor(Math.random() * (maxSongs - minSongs + 1)) + minSongs;
    const popularCount = Math.ceil(targetCount * 0.6);
    const varietyCount = targetCount - popularCount;

    const selectedPopular = this.shuffleArray(popularSongs).slice(
      0,
      Math.min(popularCount, popularSongs.length),
    );
    const selectedVariety = this.shuffleArray(varietySongs).slice(
      0,
      Math.min(varietyCount, varietySongs.length),
    );

    return [...selectedPopular, ...selectedVariety];
  }

  /**
   * Shuffle array using Fisher-Yates algorithm
   */
  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = shuffled[i];
      shuffled[i] = shuffled[j]!;
      shuffled[j] = temp!;
    }
    return shuffled;
  }

  /**
   * Update import progress with enhanced tracking
   */
  private async updateProgress(
    progress: Partial<ImportProgress>,
  ): Promise<void> {
    const fullProgress: ImportProgress = {
      stage: "initializing",
      progress: 0,
      message: "",
      ...progress,
    };

    // Add estimated time remaining based on stage
    if (fullProgress.stage && fullProgress.progress > 0) {
      fullProgress.estimatedTimeRemaining = this.estimateTimeRemaining(
        fullProgress.stage,
        fullProgress.progress,
      );
    }

    // Update via callback if provided
    if (this.progressCallback) {
      await this.progressCallback(fullProgress);
    }

    // Update via import status system
    if (fullProgress.artistId) {
      await updateImportStatus(fullProgress.artistId, {
        stage: fullProgress.stage,
        progress: fullProgress.progress,
        message: fullProgress.message,
        error: fullProgress.error,
        completedAt: fullProgress.completedAt,
      });
    }
  }

  /**
   * Estimate time remaining based on current stage and progress
   */
  private estimateTimeRemaining(
    stage: ImportProgress["stage"],
    progress: number,
  ): number {
    const stageTimings = {
      initializing: 3,
      "syncing-identifiers": 5,
      "importing-shows": 15,
      "importing-songs": 60,
      "creating-setlists": 5,
      completed: 0,
      failed: 0,
    };

    const currentStageTime = stageTimings[stage] || 10;
    const remainingInStage = currentStageTime * (1 - progress / 100);

    // Add time for subsequent stages
    let subsequentTime = 0;
    const stageOrder = [
      "initializing",
      "syncing-identifiers",
      "importing-shows",
      "importing-songs",
      "creating-setlists",
    ];
    const currentIndex = stageOrder.indexOf(stage);

    for (let i = currentIndex + 1; i < stageOrder.length; i++) {
      subsequentTime +=
        stageTimings[stageOrder[i] as keyof typeof stageTimings] || 0;
    }

    return Math.max(0, Math.round(remainingInStage + subsequentTime));
  }

  /**
   * Timeout wrapper for promises
   */
  private async withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    errorMessage: string,
  ): Promise<T> {
    const timeout = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(errorMessage)), timeoutMs);
    });

    return Promise.race([promise, timeout]);
  }

  /**
   * Generate URL-safe slug from name
   */
  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }

  /**
   * Check if two artist names match (fuzzy matching)
   */
  private isArtistNameMatch(name1: string, name2: string): boolean {
    const normalize = (name: string) =>
      name.toLowerCase().replace(/[^a-z0-9]/g, "");

    const normalized1 = normalize(name1);
    const normalized2 = normalize(name2);

    return (
      normalized1 === normalized2 ||
      normalized1.includes(normalized2) ||
      normalized2.includes(normalized1)
    );
  }

  /**
   * Get count of unique venues associated with artist shows
   */
  private async getUniqueVenueCount(artistId: string): Promise<number> {
    const result = await db.execute(sql`
      SELECT COUNT(DISTINCT ${shows.venueId})::int as count
      FROM ${shows}
      WHERE ${shows.headlinerArtistId} = ${artistId}
      AND ${shows.venueId} IS NOT NULL
    `);
    return (result as any)?.rows?.[0]?.count ?? 0;
  }
}
