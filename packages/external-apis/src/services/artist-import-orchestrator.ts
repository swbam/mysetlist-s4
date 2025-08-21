import { artists, db } from "@repo/database";
import { SpotifyClient } from "../clients/spotify";
import { TicketmasterClient } from "../clients/ticketmaster";
import { SyncErrorHandler, SyncServiceError } from "../utils/error-handler";
import { queueManager, QueueName, Priority } from "@repo/queues";

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
  private errorHandler: SyncErrorHandler;
  private progressCallback:
    | ((progress: ImportProgress) => Promise<void>)
    | undefined;

  constructor(progressCallback?: (progress: ImportProgress) => Promise<void>) {
    this.spotifyClient = new SpotifyClient({});
    this.ticketmasterClient = new TicketmasterClient({
      apiKey: process.env['TICKETMASTER_API_KEY'] || "",
    });
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
        () => this.ticketmasterClient.getAttraction(tmAttractionId),
        {
          service: "ArtistImportOrchestrator",
          operation: "getAttraction",
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
        console.warn(`No Spotify match found for ${tmArtist.name}, continuing without Spotify data`);
        await this.updateProgress({
          stage: "syncing-identifiers",
          progress: 25,
          message: `${tmArtist.name} - No Spotify match found, using Ticketmaster data only`,
        });
      }

      // Create minimal artist record for instant page load
      slug = this.generateSlug(spotifyArtist?.name || tmArtist.name);

      const [newArtist] = await db
        .insert(artists)
        .values({
          spotifyId: spotifyArtist?.id || null,
          tmAttractionId: tmAttractionId,
          name: spotifyArtist?.name || tmArtist.name,
          slug,
          imageUrl: spotifyArtist?.images?.[0]?.url || tmArtist.images?.[0]?.url || null,
          smallImageUrl: spotifyArtist?.images?.[2]?.url || null,
          genres: JSON.stringify(spotifyArtist?.genres || []),
          popularity: spotifyArtist?.popularity || 0,
          followers: spotifyArtist?.followers?.total || 0,
          externalUrls: JSON.stringify(spotifyArtist?.external_urls || {}),
          verified: false,
          lastSyncedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: artists.tmAttractionId,
          set: {
            tmAttractionId: tmAttractionId,
            name: spotifyArtist?.name || tmArtist.name,
            imageUrl: spotifyArtist?.images?.[0]?.url || tmArtist.images?.[0]?.url || null,
            smallImageUrl: spotifyArtist?.images?.[2]?.url || null,
            popularity: spotifyArtist?.popularity || 0,
            followers: spotifyArtist?.followers?.total || 0,
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

      // Delegate the rest of the import process to the BullMQ queue
      await queueManager.addJob(
        QueueName.ARTIST_IMPORT,
        "import-artist",
        {
          artistId,
          tmAttractionId,
          spotifyArtistId: spotifyArtist.id,
          artistName: spotifyArtist.name,
        },
        {
          priority: Priority.CRITICAL,
          jobId: `import-${artistId}`,
        }
      );

      const importDuration = Date.now() - startTime;

      return {
        success: true,
        artistId,
        slug,
        totalSongs: 0,
        totalShows: 0,
        totalVenues: 0,
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
}
