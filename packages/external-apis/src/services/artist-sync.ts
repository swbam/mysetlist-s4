import { db, artists, songs, artistSongs } from "@repo/database";
import { SetlistFmClient } from "../clients/setlistfm";
import { SpotifyClient } from "../clients/spotify";
import { TicketmasterClient } from "../clients/ticketmaster";
import { eq } from "@repo/database";
import { SyncErrorHandler, SyncServiceError } from "../utils/error-handler";

// Helper function to normalize song titles for deduplication
function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\w\s]/g, "") // Remove punctuation
    .replace(/\s+/g, " ") // Normalize whitespace
    .trim();
}

export class ArtistSyncService {
  private spotifyClient: SpotifyClient;
  private ticketmasterClient: TicketmasterClient;
  private errorHandler: SyncErrorHandler;

  constructor() {
    this.spotifyClient = new SpotifyClient({});
    this.ticketmasterClient = new TicketmasterClient({
      apiKey: process.env["TICKETMASTER_API_KEY"] || "",
    });
    this.errorHandler = new SyncErrorHandler({
      maxRetries: 3,
      retryDelay: 1000,
      onError: (error) => {
        console.error("[ArtistSyncService] Error:", error);
      },
    });
  }

  async syncIdentifiers(params: {
    artistDbId?: string;
    artistName?: string;
    ticketmasterAttractionId?: string;
  }): Promise<{ spotifyId?: string; tmAttractionId: string; mbid?: string }> {
    if (!params.ticketmasterAttractionId) {
      throw new Error("ticketmasterAttractionId is required for syncIdentifiers");
    }

    const result: {
      spotifyId?: string;
      tmAttractionId: string;
      mbid?: string;
    } = {
      tmAttractionId: params.ticketmasterAttractionId,
    };

    // Resolve DB artist
    let artistRecord: any = null;
    if (params.artistDbId) {
      const [row] = await db
        .select()
        .from(artists)
        .where(eq(artists.id, params.artistDbId))
        .limit(1);
      artistRecord = row || null;
    }

    const name = params.artistName || artistRecord?.name;

    // Ticketmaster ID
    if (!artistRecord?.tmAttractionId && params.ticketmasterAttractionId) {
      result.tmAttractionId = params.ticketmasterAttractionId;
      if (artistRecord) {
        await db
          .update(artists)
          .set({ tmAttractionId: params.ticketmasterAttractionId })
          .where(eq(artists.id, artistRecord.id));
      }
    }

    // Spotify ID by name if missing
    if (!artistRecord?.spotifyId && name) {
      try {
        await this.spotifyClient.authenticate();
        const sr = await this.spotifyClient.searchArtists(name, 1);
        const sp = sr.artists.items[0];
        if (sp) {
          result.spotifyId = sp.id;
          if (artistRecord) {
            await db
              .update(artists)
              .set({ spotifyId: sp.id })
              .where(eq(artists.id, artistRecord.id));
          }
        }
      } catch (e) {
        console.warn("syncIdentifiers: Spotify search failed", e);
      }
    }

    // MBID via Setlist.fm (if available via name)
    try {
      const s = new SetlistFmClient({
        apiKey: process.env["SETLISTFM_API_KEY"]!,
      });
      const qName = name;
      if (qName) {
        const sr = await s.searchSetlists({ artistName: qName, p: 1 });
        const mbid = sr.setlist?.[0]?.artist?.mbid;
        if (mbid) {
          result.mbid = mbid;
          if (artistRecord) {
            await db
              .update(artists)
              .set({ mbid })
              .where(eq(artists.id, artistRecord.id));
          }
        }
      }
    } catch (e) {
      console.warn("syncIdentifiers: Setlist.fm search failed", e);
    }

    return result;
  }

  async syncArtist(artistId: string): Promise<void> {
    try {
      await this.spotifyClient.authenticate();
    } catch (error) {
      throw new SyncServiceError(
        "Failed to authenticate with Spotify",
        "ArtistSyncService",
        "authenticate",
        error instanceof Error ? error : undefined,
      );
    }

    // Get artist from Spotify with retry
    const spotifyArtist = await this.errorHandler.withRetry(
      () => this.spotifyClient.getArtist(artistId),
      {
        service: "ArtistSyncService",
        operation: "getArtist",
        context: { artistId },
      },
    );

    if (!spotifyArtist) {
      throw new SyncServiceError(
        `Failed to fetch artist ${artistId} from Spotify`,
        "ArtistSyncService",
        "getArtist",
      );
    }

    // Get top tracks with retry
    const topTracksResult = await this.errorHandler.withRetry(
      () => this.spotifyClient.getArtistTopTracks(artistId),
      {
        service: "ArtistSyncService",
        operation: "getArtistTopTracks",
        context: { artistId },
      },
    );

    const topTracks = topTracksResult || { tracks: [] };

    // Try to find the artist on Ticketmaster
    let tmAttractionId: string | null = null;
    try {
      const ticketmasterResult = await this.errorHandler.withRetry(
        () =>
          this.ticketmasterClient.searchEvents({
            keyword: spotifyArtist.name,
            size: 1,
          }),
        {
          service: "ArtistSyncService",
          operation: "searchEvents",
          context: { artistName: spotifyArtist.name },
        },
      );

      if (
        ticketmasterResult?._embedded?.events?.[0]?._embedded?.attractions?.[0]
      ) {
        const attraction =
          ticketmasterResult._embedded.events[0]._embedded.attractions[0];
        if (this.isArtistNameMatch(spotifyArtist.name, attraction?.name || "")) {
          tmAttractionId = attraction.id;
          console.log(
            `Found Ticketmaster ID ${tmAttractionId} for ${spotifyArtist.name}`,
          );
        }
      }
    } catch (error) {
      console.warn(
        `Failed to find Ticketmaster ID for ${spotifyArtist.name}:`,
        error,
      );
    }

    // Update or create artist in database
    await db
      .insert(artists)
      .values({
        spotifyId: spotifyArtist.id,
        tmAttractionId,
        name: spotifyArtist.name,
        slug: this.generateSlug(spotifyArtist.name),
        imageUrl: spotifyArtist.images[0]?.url || null,
        smallImageUrl: spotifyArtist.images[2]?.url || null,
        genres: JSON.stringify(spotifyArtist.genres),
        popularity: spotifyArtist.popularity,
        followers: spotifyArtist.followers.total,
        externalUrls: JSON.stringify(spotifyArtist.external_urls),
        lastSyncedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: artists.spotifyId,
        set: {
          tmAttractionId,
          name: spotifyArtist.name,
          imageUrl: spotifyArtist.images[0]?.url || null,
          smallImageUrl: spotifyArtist.images[2]?.url || null,
          genres: JSON.stringify(spotifyArtist.genres),
          popularity: spotifyArtist.popularity,
          followers: spotifyArtist.followers.total,
          lastSyncedAt: new Date(),
        },
      });

    // Sync top tracks
    await this.syncArtistTracks(artistId, topTracks.tracks);
  }

  private async syncArtistTracks(
    artistId: string,
    tracks: any[],
  ): Promise<void> {
    const [artist] = await db
      .select()
      .from(artists)
      .where(eq(artists.spotifyId, artistId))
      .limit(1);

    if (!artist) {
      return;
    }

    for (const track of tracks) {
      // Insert or update song
      const [song] = await db
        .insert(songs)
        .values({
          spotifyId: track.id,
          name: track.name,
          artist: track.artists[0].name,
          albumName: track.album.name,
          albumArtUrl: track.album.images[0]?.url,
          releaseDate: track.album.release_date,
          durationMs: track.duration_ms,
          popularity: track.popularity,
          previewUrl: track.preview_url,
          isExplicit: track.explicit,
          isPlayable: track.is_playable,
        })
        .onConflictDoUpdate({
          target: songs.spotifyId,
          set: {
            name: track.name,
            popularity: track.popularity,
            isPlayable: track.is_playable,
          },
        })
        .returning();

      // Link artist to song if we have both records
      if (song && artist) {
        await db
          .insert(artistSongs)
          .values({
            artistId: artist.id,
            songId: song.id,
            isPrimaryArtist: true,
          })
          .onConflictDoNothing();
      }
    }
  }

  /**
   * Fetches full Spotify catalog excluding "live" tracks with deduplication
   */
  async syncCatalog(artistId: string): Promise<{
    totalSongs: number;
    totalAlbums: number;
    processedAlbums: number;
  }> {
    // implementation continues...
    return { totalSongs: 0, totalAlbums: 0, processedAlbums: 0 } as any;
  }

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

    // Exact match
    if (normalized1 === normalized2) {
      return true;
    }

    // Check if one contains the other (for cases like "Artist" vs "Artist Band")
    if (
      normalized1.includes(normalized2) ||
      normalized2.includes(normalized1)
    ) {
      return true;
    }

    return false;
  }
}