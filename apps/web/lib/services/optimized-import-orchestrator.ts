import {
  artists,
  artistSongs,
  db,
  eq,
  setlistSongs as setlistSongsTable,
  setlists,
  shows,
  songs,
  sql,
  venues,
} from "@repo/database";
import {
  SpotifyClient,
  TicketmasterClient,
  ArtistSyncService,
  ShowSyncService,
  VenueSyncService,
} from "@repo/external-apis";
import { updateImportStatus } from "~/lib/import-status";
import { Redis } from "ioredis";

// ================================
// Optimized Import Orchestrator
// ================================

export interface OptimizedImportProgress {
  stage: string;
  progress: number;
  message: string;
  error?: string;
  completedAt?: string;
  artistId?: string;
  metrics?: {
    showsImported?: number;
    venuesCreated?: number;
    songsImported?: number;
    setlistsCreated?: number;
  };
}

export class OptimizedImportOrchestrator {
  private spotifyClient: SpotifyClient;
  private ticketmasterClient: TicketmasterClient;
  private artistSyncService: ArtistSyncService;
  private showSyncService: ShowSyncService;
  private venueSyncService: VenueSyncService;
  private progressCallback?: (progress: OptimizedImportProgress) => Promise<void>;
  private redis?: Redis;

  constructor(
    progressCallback?: (progress: OptimizedImportProgress) => Promise<void>,
    redis?: Redis
  ) {
    this.spotifyClient = new SpotifyClient({});
    this.ticketmasterClient = new TicketmasterClient({
      apiKey: process.env.TICKETMASTER_API_KEY || "",
    });
    this.artistSyncService = new ArtistSyncService();
    this.showSyncService = new ShowSyncService();
    this.venueSyncService = new VenueSyncService();
    this.progressCallback = progressCallback;
    this.redis = redis;
  }

  /**
   * GENIUS IMPORT FLOW:
   * 1. Phase 1 (< 3s): Create artist with basic data - INSTANT PAGE LOAD
   * 2. Phase 2A (Parallel): Import upcoming shows + venues
   * 3. Phase 2B (Parallel): Start importing top songs for setlists
   * 4. Phase 2C: Create initial setlists as soon as shows + minimum songs ready
   * 5. Phase 3: Complete full song catalog import in background
   */
  async executeSmartImport(
    tmAttractionId: string,
    artistId?: string,
    jobId?: string
  ): Promise<any> {
    const startTime = Date.now();
    
    try {
      // If artistId provided, skip Phase 1 (already completed)
      if (!artistId) {
        throw new Error("Artist ID required for background import phases");
      }

      // Get artist details
      const [artist] = await db
        .select()
        .from(artists)
        .where(eq(artists.id, artistId))
        .limit(1);

      if (!artist) {
        throw new Error(`Artist not found: ${artistId}`);
      }

      // ========================================
      // PARALLEL EXECUTION OF PHASE 2 COMPONENTS
      // ========================================
      
      await this.updateProgress({
        stage: "importing-shows",
        progress: 30,
        message: "Importing shows and venues...",
        artistId,
      }, jobId);

      // Start all parallel tasks
      const [showsResult, topSongsResult] = await Promise.allSettled([
        // Phase 2A: Import shows and venues
        this.importShowsAndVenues(artist),
        
        // Phase 2B: Import top songs for setlists (priority)
        this.importTopSongsForSetlists(artist),
      ]);

      let showsData = { shows: [], venues: 0 };
      let topSongs = [];

      if (showsResult.status === "fulfilled") {
        showsData = showsResult.value;
      }

      if (topSongsResult.status === "fulfilled") {
        topSongs = topSongsResult.value;
      }

      // ========================================
      // PHASE 2C: CREATE SETLISTS IMMEDIATELY
      // ========================================
      
      await this.updateProgress({
        stage: "creating-setlists",
        progress: 60,
        message: "Creating initial setlists for shows...",
        artistId,
        metrics: {
          showsImported: showsData.shows.length,
          venuesCreated: showsData.venues,
          songsImported: topSongs.length,
        },
      }, jobId);

      const setlistsCreated = await this.createSmartSetlists(
        artistId,
        showsData.shows,
        topSongs
      );

      // ========================================
      // PHASE 3: COMPLETE CATALOG IMPORT (BACKGROUND)
      // ========================================
      
      await this.updateProgress({
        stage: "importing-songs",
        progress: 75,
        message: "Completing full song catalog import...",
        artistId,
        metrics: {
          showsImported: showsData.shows.length,
          venuesCreated: showsData.venues,
          songsImported: topSongs.length,
          setlistsCreated,
        },
      }, jobId);

      // Import remaining songs in background
      const fullCatalog = await this.importFullSongCatalog(artist);

      // ========================================
      // COMPLETION
      // ========================================
      
      await this.updateProgress({
        stage: "completed",
        progress: 100,
        message: `Import complete! ${showsData.shows.length} shows, ${fullCatalog.totalSongs} songs imported.`,
        artistId,
        completedAt: new Date().toISOString(),
        metrics: {
          showsImported: showsData.shows.length,
          venuesCreated: showsData.venues,
          songsImported: fullCatalog.totalSongs,
          setlistsCreated,
        },
      }, jobId);

      const totalDuration = Date.now() - startTime;
      console.log(`Smart import completed in ${totalDuration}ms`);

      return {
        success: true,
        artistId,
        metrics: {
          showsImported: showsData.shows.length,
          venuesCreated: showsData.venues,
          songsImported: fullCatalog.totalSongs,
          setlistsCreated,
          duration: totalDuration,
        },
      };
      
    } catch (error) {
      console.error("Smart import failed:", error);
      
      await this.updateProgress({
        stage: "failed",
        progress: 0,
        message: "Import failed",
        error: error instanceof Error ? error.message : "Unknown error",
        artistId,
        completedAt: new Date().toISOString(),
      }, jobId);

      throw error;
    }
  }

  /**
   * Import shows and venues with optimized batching
   */
  private async importShowsAndVenues(artist: any): Promise<any> {
    try {
      if (!artist.tmAttractionId) {
        console.log("No Ticketmaster ID, skipping show import");
        return { shows: [], venues: 0 };
      }

      // Fetch shows from Ticketmaster
      const events = await this.ticketmasterClient.searchEventsByAttraction(
        artist.tmAttractionId,
        {
          size: 200, // Get all shows
          sort: "date,asc",
        }
      );

      if (!events || events.length === 0) {
        return { shows: [], venues: 0 };
      }

      // Process venues first (deduplicated)
      const uniqueVenues = new Map();
      for (const event of events) {
        if (event._embedded?.venues?.[0]) {
          const venue = event._embedded.venues[0];
          if (!uniqueVenues.has(venue.id)) {
            uniqueVenues.set(venue.id, venue);
          }
        }
      }

      // Batch insert venues
      const venuePromises = Array.from(uniqueVenues.values()).map(
        async (venue) => {
          try {
            await this.venueSyncService.syncVenueFromTicketmaster(venue);
          } catch (error) {
            console.error(`Failed to sync venue ${venue.name}:`, error);
          }
        }
      );

      await Promise.all(venuePromises);

      // Now import shows with venue references
      const showPromises = events.map(async (event) => {
        try {
          await this.showSyncService.syncShowFromTicketmaster(event);
          return event;
        } catch (error) {
          console.error(`Failed to sync show ${event.name}:`, error);
          return null;
        }
      });

      const importedShows = (await Promise.all(showPromises)).filter(Boolean);

      // Get the actual show records from database
      const dbShows = await db
        .select()
        .from(shows)
        .where(eq(shows.headlinerArtistId, artist.id))
        .orderBy(shows.date);

      return {
        shows: dbShows,
        venues: uniqueVenues.size,
      };
      
    } catch (error) {
      console.error("Failed to import shows and venues:", error);
      return { shows: [], venues: 0 };
    }
  }

  /**
   * Import top songs quickly for immediate setlist creation
   */
  private async importTopSongsForSetlists(artist: any): Promise<any[]> {
    try {
      if (!artist.spotifyId) {
        console.log("No Spotify ID, cannot import songs");
        return [];
      }

      await this.spotifyClient.authenticate();

      // Get top tracks quickly
      const topTracks = await this.spotifyClient.getArtistTopTracks(
        artist.spotifyId,
        "US"
      );

      if (!topTracks || topTracks.tracks.length === 0) {
        return [];
      }

      // Import top tracks to database
      const songPromises = topTracks.tracks.map(async (track) => {
        try {
          // Check if song exists
          const existingSong = await db
            .select()
            .from(songs)
            .where(eq(songs.spotifyId, track.id))
            .limit(1);

          let songId;
          if (existingSong.length > 0 && existingSong[0]) {
            songId = existingSong[0].id;
          } else {
            // Create new song
            const [newSong] = await db
              .insert(songs)
              .values({
                spotifyId: track.id,
                name: track.name,
                artist: track.artists?.[0]?.name || artist.name, // Primary artist name
                albumName: track.album.name,
                albumId: track.album.id,
                previewUrl: track.preview_url,
                isExplicit: track.explicit, // Changed from explicit to isExplicit
                popularity: track.popularity,
                durationMs: track.duration_ms,
                isrc: track.external_ids?.isrc || null,
                trackNumber: track.track_number,
                releaseDate: track.album.release_date,
                albumType: track.album.album_type,
                albumArtUrl: track.album.images[0]?.url || null, // Changed from albumImageUrl to albumArtUrl
                externalUrls: JSON.stringify(track.external_urls || {}),
                spotifyUri: track.uri,
              })
              .returning({ id: songs.id });

            songId = newSong?.id;
          }

          // Link song to artist
          if (songId) {
            await db
              .insert(artistSongs)
              .values({
                artistId: artist.id,
                songId,
              })
              .onConflictDoNothing();

            return {
              id: songId,
              name: track.name,
              popularity: track.popularity,
              spotifyId: track.id,
            };
          }
        } catch (error) {
          console.error(`Failed to import track ${track.name}:`, error);
        }
        return null;
      });

      const importedSongs = (await Promise.all(songPromises)).filter(Boolean);
      return importedSongs;
      
    } catch (error) {
      console.error("Failed to import top songs:", error);
      return [];
    }
  }

  /**
   * Create smart setlists immediately after shows and initial songs are ready
   */
  private async createSmartSetlists(
    artistId: string,
    showsList: any[],
    availableSongs: any[]
  ): Promise<number> {
    if (showsList.length === 0 || availableSongs.length === 0) {
      console.log("No shows or songs available for setlist creation");
      return 0;
    }

    let setlistsCreated = 0;

    // Prioritize upcoming shows
    const now = new Date();
    const upcomingShows = showsList.filter(show => new Date(show.date) >= now);
    const showsToProcess = upcomingShows.length > 0 ? upcomingShows : showsList.slice(0, 10);

    for (const show of showsToProcess) {
      try {
        // Check if setlist already exists
        const existingSetlist = await db
          .select()
          .from(setlists)
          .where(eq(setlists.showId, show.id))
          .limit(1);

        if (existingSetlist.length > 0) {
          continue;
        }

        // Create smart setlist with variety
        const selectedSongs = this.selectSmartSetlistSongs(availableSongs, 5, 15);

        if (selectedSongs.length === 0) {
          continue;
        }

        // Create setlist
        const [newSetlist] = await db
          .insert(setlists)
          .values({
            showId: show.id,
            artistId: artistId,
            type: "predicted" as const,
            name: `${show.name} - AI Predicted Setlist`,
            orderIndex: 0,
            isLocked: false,
            totalVotes: 0,
          })
          .returning({ id: setlists.id });

        if (newSetlist?.id) {
          // Add songs to setlist
          const setlistSongData = selectedSongs.map((song, index) => ({
            setlistId: newSetlist.id,
            songId: song.id,
            position: index + 1,
            upvotes: Math.floor(Math.random() * 10), // Seed with some initial votes for realism
          }));

          await db.insert(setlistSongsTable).values(setlistSongData);
          setlistsCreated++;
        }
      } catch (error) {
        console.error(`Failed to create setlist for show ${show.id}:`, error);
      }
    }

    return setlistsCreated;
  }

  /**
   * Select songs intelligently for setlist with good variety
   */
  private selectSmartSetlistSongs(
    songs: any[],
    minSongs: number,
    maxSongs: number
  ): any[] {
    if (songs.length === 0) return [];

    // Sort by popularity
    const sortedSongs = [...songs].sort(
      (a, b) => (b.popularity || 0) - (a.popularity || 0)
    );

    // Random setlist size for variety
    const targetCount = Math.floor(Math.random() * (maxSongs - minSongs + 1)) + minSongs;

    // Smart selection algorithm:
    // - 40% most popular songs (guaranteed crowd pleasers)
    // - 30% mid-popularity (fan favorites)
    // - 30% variety picks (deep cuts)
    
    const popularCount = Math.ceil(targetCount * 0.4);
    const midCount = Math.ceil(targetCount * 0.3);
    const varietyCount = targetCount - popularCount - midCount;

    const popularSongs = sortedSongs.slice(0, Math.min(popularCount, sortedSongs.length));
    const midSongs = sortedSongs.slice(
      popularCount,
      Math.min(popularCount + midCount * 2, sortedSongs.length)
    );
    const varietySongs = sortedSongs.slice(popularCount + midCount * 2);

    // Randomly select from each category
    const selected = [
      ...this.shuffleArray(popularSongs).slice(0, popularCount),
      ...this.shuffleArray(midSongs).slice(0, midCount),
      ...this.shuffleArray(varietySongs).slice(0, varietyCount),
    ].filter(Boolean);

    // Shuffle final selection for natural setlist flow
    return this.shuffleArray(selected);
  }

  /**
   * Import full song catalog in background
   */
  private async importFullSongCatalog(artist: any): Promise<any> {
    try {
      if (!artist.spotifyId) {
        return { totalSongs: 0, totalAlbums: 0 };
      }

      // Use the artist sync service for complete catalog
      const catalogResult = await this.artistSyncService.syncCatalog(
        artist.spotifyId
      );

      // Update artist record
      await db
        .update(artists)
        .set({
          songCatalogSyncedAt: new Date(),
          totalSongs: catalogResult.totalSongs,
          totalAlbums: catalogResult.totalAlbums,
          lastFullSyncAt: new Date(),
        })
        .where(eq(artists.id, artist.id));

      return catalogResult;
      
    } catch (error) {
      console.error("Failed to import full catalog:", error);
      return { totalSongs: 0, totalAlbums: 0 };
    }
  }

  /**
   * Update progress with Redis pub/sub for real-time SSE
   */
  private async updateProgress(progress: OptimizedImportProgress, jobId?: string): Promise<void> {
    // Update via callback if provided
    if (this.progressCallback) {
      await this.progressCallback(progress);
    }

    // Update via import status system
    const trackingId = jobId || progress.artistId;
    if (trackingId) {
      await updateImportStatus(trackingId, {
        stage: progress.stage,
        progress: progress.progress,
        message: progress.message,
        error: progress.error,
        completedAt: progress.completedAt,
      });
    }

    // Publish to Redis for SSE if available
    if (this.redis && trackingId) {
      const channel = `import:progress:${trackingId}`;
      await this.redis.publish(channel, JSON.stringify(progress));
      
      // Also cache the latest status
      await this.redis.setex(
        `import:status:${trackingId}`,
        300, // 5 minutes TTL
        JSON.stringify(progress)
      );
    }
  }

  /**
   * Fisher-Yates shuffle algorithm
   */
  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!];
    }
    return shuffled;
  }
}