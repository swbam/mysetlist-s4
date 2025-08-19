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
import { SpotifyClient } from "../clients/spotify";
import { TicketmasterClient } from "../clients/ticketmaster";
import { SyncErrorHandler, SyncServiceError } from "../utils/error-handler";
import { ArtistSyncService } from "./artist-sync";
import { ShowSyncService } from "./show-sync";

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
}

export class ArtistImportOrchestrator {
  private spotifyClient: SpotifyClient;
  private ticketmasterClient: TicketmasterClient;
  private artistSyncService: ArtistSyncService;
  private showSyncService: ShowSyncService;
  private errorHandler: SyncErrorHandler;
  private progressCallback:
    | ((progress: ImportProgress) => Promise<void>)
    | undefined;

  constructor(progressCallback?: (progress: ImportProgress) => Promise<void>) {
    this.spotifyClient = new SpotifyClient({});
    this.ticketmasterClient = new TicketmasterClient({
      apiKey: process.env['TICKETMASTER_API_KEY'] || "",
    });
    this.artistSyncService = new ArtistSyncService();
    this.showSyncService = new ShowSyncService();
    this.progressCallback = progressCallback ?? undefined;
    this.errorHandler = new SyncErrorHandler({
      maxRetries: 3,
      retryDelay: 2000,
      onError: (error) => {
        console.error("[ArtistImportOrchestrator] Error:", error);
      },
    });
  }

  /**
   * Comprehensive artist import following the optimal timing strategy
   */
  async importArtist(tmAttractionId: string): Promise<ImportResult> {
    const startTime = Date.now();
    const stages: ImportProgress[] = [];
    let artistId = "";
    let slug = "";

    try {
      // Phase 1: Instant Artist Page Load (< 3 seconds)
      await this.updateProgress({
        stage: "initializing",
        progress: 5,
        message: "Getting artist details from Ticketmaster...",
      });

      // Get artist from Ticketmaster
      const tmArtist = await this.errorHandler.withRetry(
        () => this.ticketmasterClient.getEvent(tmAttractionId),
        {
          service: "ArtistImportOrchestrator",
          operation: "getEvent",
          context: { tmAttractionId },
        },
      );

      if (!tmArtist || !tmArtist.name) {
        throw new SyncServiceError(
          `Artist not found on Ticketmaster: ${tmAttractionId}`,
          "ArtistImportOrchestrator",
          "getEvent",
        );
      }

      await this.updateProgress({
        stage: "syncing-identifiers",
        progress: 15,
        message: `Found ${tmArtist.name}. Looking up on Spotify...`,
      });

      // Quick Spotify lookup for basic data
      await this.spotifyClient.authenticate();
      const spotifySearch = await this.errorHandler.withRetry(
        () => this.spotifyClient.searchArtists(tmArtist.name, 5),
        {
          service: "ArtistImportOrchestrator",
          operation: "searchArtists",
          context: { artistName: tmArtist.name },
        },
      );

      // Find best Spotify match
      let spotifyArtist: any = null;
      if (
        spotifySearch?.artists?.items &&
        spotifySearch.artists.items.length > 0
      ) {
        spotifyArtist =
          spotifySearch.artists.items.find((artist: any) =>
            this.isArtistNameMatch(tmArtist.name, artist.name),
          ) || spotifySearch.artists.items[0];
      }

      if (!spotifyArtist) {
        throw new SyncServiceError(
          `No Spotify match found for ${tmArtist.name}`,
          "ArtistImportOrchestrator",
          "searchArtists",
        );
      }

      // Create minimal artist record for instant page load
      slug = this.generateSlug(spotifyArtist.name);

      const [newArtist] = await db
        .insert(artists)
        .values({
          spotifyId: spotifyArtist.id,
          tmAttractionId: tmAttractionId,
          name: spotifyArtist.name,
          slug,
          imageUrl: spotifyArtist.images[0]?.url || null,
          smallImageUrl: spotifyArtist.images[2]?.url || null,
          genres: JSON.stringify(spotifyArtist.genres || []),
          popularity: spotifyArtist.popularity || 0,
          followers: spotifyArtist.followers?.total || 0,
          externalUrls: JSON.stringify(spotifyArtist.external_urls || {}),
          verified: false,
          lastSyncedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: artists.spotifyId,
          set: {
            tmAttractionId: tmAttractionId,
            name: spotifyArtist.name,
            imageUrl: spotifyArtist.images[0]?.url || null,
            smallImageUrl: spotifyArtist.images[2]?.url || null,
            popularity: spotifyArtist.popularity || 0,
            followers: spotifyArtist.followers?.total || 0,
            lastSyncedAt: new Date(),
          },
        })
        .returning({ id: artists.id, slug: artists.slug });

      if (!newArtist) {
        throw new SyncServiceError(
          "Failed to create artist record",
          "ArtistImportOrchestrator",
          "insertArtist",
        );
      }

      artistId = newArtist.id;
      slug = newArtist.slug;

      await this.updateProgress({
        stage: "syncing-identifiers",
        progress: 25,
        message: "Artist created! Starting comprehensive import...",
        artistId,
      });

      // Phase 2: Priority Background Sync (15-90 seconds)
      // Run shows and songs import in parallel for optimal performance
      const [songResult, showResult] = await Promise.allSettled([
        this.importCompleteDiscography(artistId, spotifyArtist.id),
        this.importShowsAndVenues(artistId, tmAttractionId, spotifyArtist.name),
      ]);

      // Handle song import result
      let totalSongs = 0;
      if (songResult.status === "fulfilled") {
        totalSongs = songResult.value;
      } else {
        console.error("Song import failed:", songResult.reason);
        // Continue with show import even if songs fail
      }

      // Handle show import result
      let totalShows = 0;
      let totalVenues = 0;
      if (showResult.status === "fulfilled") {
        totalShows = showResult.value.shows;
        totalVenues = showResult.value.venues;
      } else {
        console.error("Show import failed:", showResult.reason);
        // Continue even if shows fail
      }

      // Phase 3: Setlist Creation
      await this.updateProgress({
        stage: "creating-setlists",
        progress: 95,
        message: "Creating initial setlists for upcoming shows...",
        artistId,
      });

      await this.createInitialSetlists(artistId);

      // Mark as completed
      await this.updateProgress({
        stage: "completed",
        progress: 100,
        message: `Import completed! ${totalSongs} songs, ${totalShows} shows imported.`,
        artistId,
        completedAt: new Date().toISOString(),
        totalSongs,
        totalShows,
        totalVenues,
      });

      const importDuration = Date.now() - startTime;

      return {
        success: true,
        artistId,
        slug,
        totalSongs,
        totalShows,
        totalVenues,
        importDuration,
        stages,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      await this.updateProgress({
        stage: "failed",
        progress: 0,
        message: "Import failed",
        error: errorMessage,
        artistId,
        completedAt: new Date().toISOString(),
      });

      throw error;
    }
  }

  /**
   * Import complete studio discography (Phase 2)
   */
  private async importCompleteDiscography(
    _artistId: string,
    spotifyId: string,
  ): Promise<number> {
    await this.updateProgress({
      stage: "importing-songs",
      progress: 40,
      message: "Importing complete song catalog...",
    });

    // Use the enhanced sync catalog method from ArtistSyncService
    const catalogResult = await this.artistSyncService.syncCatalog(spotifyId);

    await this.updateProgress({
      stage: "importing-songs",
      progress: 70,
      message: `Imported ${catalogResult.totalSongs} studio songs`,
    });

    return catalogResult.totalSongs;
  }

  /**
   * Import shows and venues (Phase 2)
   */
  private async importShowsAndVenues(
    artistId: string,
    _tmAttractionId: string,
    artistName: string,
  ): Promise<{ shows: number; venues: number }> {
    await this.updateProgress({
      stage: "importing-shows",
      progress: 75,
      message: "Importing upcoming shows and venues...",
    });

    // Import shows using both attraction ID and name search for comprehensive coverage
    await Promise.allSettled([
      this.showSyncService.syncArtistShows(artistId),
      this.importShowsByName(artistName, artistId),
    ]);

    // Count total shows and venues
    const showCount = await this.getShowCount(artistId);
    const venueCount = await this.getVenueCount(artistId);

    await this.updateProgress({
      stage: "importing-shows",
      progress: 85,
      message: `Imported ${showCount} shows and ${venueCount} venues`,
    });

    return { shows: showCount, venues: venueCount };
  }

  /**
   * Import shows by artist name (fallback method)
   */
  private async importShowsByName(
    artistName: string,
    artistId: string,
  ): Promise<void> {
    try {
      const tmShows = await this.ticketmasterClient.searchEvents({
        keyword: artistName,
        size: 50,
      });

      if (tmShows?._embedded?.events) {
        for (const event of tmShows._embedded.events) {
          // Only process if this is actually the same artist
          if (this.isArtistNameMatch(artistName, event.name)) {
            await this.processEventData(event, artistId);
          }
        }
      }
    } catch (error) {
      console.warn("Show import by name failed:", error);
      // Don't throw - this is a fallback method
    }
  }

  /**
   * Process individual event data
   */
  private async processEventData(event: any, artistId: string): Promise<void> {
    try {
      // Create venue if needed using direct db insert
      let venueId: string | null = null;
      if (event._embedded?.venues?.[0]) {
        const venue = event._embedded.venues[0];

        const [newVenue] = await db
          .insert(venues)
          .values({
            tmVenueId: venue.id,
            name: venue.name,
            slug: venue.name
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, "-")
              .replace(/(^-|-$)/g, ""),
            city: venue.city?.name || "Unknown",
            state: venue.state?.stateCode || null,
            country: venue.country?.countryCode || "US",
            timezone: venue.timezone || "America/New_York",
            address: venue.address?.line1 || null,
            postalCode: venue.postalCode || null,
            latitude: venue.location
              ? Number.parseFloat(venue.location.latitude)
              : null,
            longitude: venue.location
              ? Number.parseFloat(venue.location.longitude)
              : null,
            updatedAt: new Date(),
          })
          .onConflictDoUpdate({
            target: venues.tmVenueId,
            set: {
              name: venue.name,
              city: venue.city?.name || "Unknown",
              state: venue.state?.stateCode || null,
              country: venue.country?.countryCode || "US",
              updatedAt: new Date(),
            },
          })
          .returning({ id: venues.id });

        venueId = newVenue?.id || null;
      }

      // Generate slug for show
      const showSlug = `${event.name}-${event.id}`
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");

      // Create show with proper date format
      const showDate =
        event.dates.start.dateTime || event.dates.start.localDate;

      await db
        .insert(shows)
        .values({
          tmEventId: event.id,
          name: event.name,
          slug: showSlug,
          date: showDate,
          headlinerArtistId: artistId,
          venueId: venueId,
          status: "upcoming",
          ticketUrl: event.url || null,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: shows.tmEventId,
          set: {
            name: event.name,
            date: showDate,
            status: "upcoming",
            updatedAt: new Date(),
          },
        });
    } catch (error) {
      console.warn("Failed to process event:", error);
    }
  }

  /**
   * Create initial setlists for shows (Phase 3)
   */
  private async createInitialSetlists(artistId: string): Promise<void> {
    try {
      // Get artist's top songs
      const topSongs = await db
        .select({
          id: songs.id,
          name: songs.name,
          popularity: songs.popularity,
        })
        .from(songs)
        .innerJoin(artistSongs, eq(songs.id, artistSongs.songId))
        .where(eq(artistSongs.artistId, artistId))
        .orderBy(sql`${songs.popularity} DESC NULLS LAST`)
        .limit(20);

      if (topSongs.length === 0) {
        console.log("No songs found for setlist creation");
        return;
      }

      // Get upcoming shows without setlists
      const upcomingShows = await db
        .select()
        .from(shows)
        .where(eq(shows.headlinerArtistId, artistId))
        .limit(10);

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
          // Add top 8-12 songs to setlist
          const selectedSongs = topSongs
            .sort(() => 0.5 - Math.random()) // Randomize
            .slice(0, Math.floor(Math.random() * 5) + 8); // 8-12 songs

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
    }
  }

  /**
   * Update import progress
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

    if (this.progressCallback) {
      await this.progressCallback(fullProgress);
    }
  }

  /**
   * Helper methods
   */
  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }

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

  private async getShowCount(artistId: string): Promise<number> {
    const result = await db.execute(sql`
      SELECT COUNT(*)::int as count
      FROM ${shows}
      WHERE ${shows.headlinerArtistId} = ${artistId}
    `);
    return (result as any)?.rows?.[0]?.count ?? 0;
  }

  private async getVenueCount(artistId: string): Promise<number> {
    const result = await db.execute(sql`
      SELECT COUNT(DISTINCT ${shows.venueId})::int as count
      FROM ${shows}
      WHERE ${shows.headlinerArtistId} = ${artistId}
      AND ${shows.venueId} IS NOT NULL
    `);
    return (result as any)?.rows?.[0]?.count ?? 0;
  }
}
