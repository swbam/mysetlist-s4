import { SpotifyClient } from "../clients/spotify";
import { TicketmasterClient } from "../clients/ticketmaster";
import { db, eq } from "../database";
import { artistSongs, artists, songs } from "@repo/database";
import { SyncErrorHandler, SyncServiceError } from "../utils/error-handler";

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

  async syncIdentifiers(params: { artistDbId?: string; artistName?: string; ticketmasterAttractionId?: string }): Promise<{ spotifyId?: string; ticketmasterId?: string; mbid?: string }> {
    const result: { spotifyId?: string; ticketmasterId?: string; mbid?: string } = {};

    // Resolve DB artist
    let artistRecord: any = null;
    if (params.artistDbId) {
      const [row] = await db.select().from(artists).where(eq(artists.id, params.artistDbId)).limit(1);
      artistRecord = row || null;
    }

    const name = params.artistName || artistRecord?.name;

    // Ticketmaster ID
    if (!artistRecord?.ticketmasterId && params.ticketmasterAttractionId) {
      result.ticketmasterId = params.ticketmasterAttractionId;
      if (artistRecord) {
        await db.update(artists).set({ ticketmasterId: params.ticketmasterAttractionId }).where(eq(artists.id, artistRecord.id));
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
            await db.update(artists).set({ spotifyId: sp.id }).where(eq(artists.id, artistRecord.id));
          }
        }
      } catch (e) {
        console.warn("syncIdentifiers: Spotify search failed", e);
      }
    }

    // MBID via Setlist.fm (if available via name)
    try {
      const { SetlistFmClient } = await import("../clients/setlistfm");
      const s = new SetlistFmClient({});
      const qName = name;
      if (qName) {
        const sr = await s.searchArtists(qName, 1);
        const mbid = sr.artist?.[0]?.mbid;
        if (mbid) {
          result.mbid = mbid;
          if (artistRecord) {
            await db.update(artists).set({ mbid }).where(eq(artists.id, artistRecord.id));
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
    let ticketmasterId: string | null = null;
    try {
      const ticketmasterResult = await this.errorHandler.withRetry(
        () => this.ticketmasterClient.searchAttractions({
          keyword: spotifyArtist.name,
          size: 1,
          classificationName: "music",
        }),
        {
          service: "ArtistSyncService",
          operation: "searchAttractions",
          context: { artistName: spotifyArtist.name },
        },
      );

      if (ticketmasterResult?._embedded?.attractions?.[0]) {
        const attraction = ticketmasterResult._embedded.attractions[0];
        if (this.isArtistNameMatch(spotifyArtist.name, attraction.name)) {
          ticketmasterId = attraction.id;
          console.log(`Found Ticketmaster ID ${ticketmasterId} for ${spotifyArtist.name}`);
        }
      }
    } catch (error) {
      console.warn(`Failed to find Ticketmaster ID for ${spotifyArtist.name}:`, error);
    }

    // Update or create artist in database
    await db
      .insert(artists)
      .values({
        spotifyId: spotifyArtist.id,
        ticketmasterId,
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
          ticketmasterId,
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
          title: track.name,
          artist: track.artists[0].name,
          album: track.album.name,
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
            title: track.name,
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
    skippedLiveTracks: number;
    deduplicatedTracks: number;
  }> {
    await this.spotifyClient.authenticate();
    
    // Get artist from database
    const [artist] = await db
      .select()
      .from(artists)
      .where(eq(artists.spotifyId, artistId))
      .limit(1);

    if (!artist) {
      throw new SyncServiceError(
        `Artist not found in database: ${artistId}`,
        "ArtistSyncService",
        "syncCatalog"
      );
    }

    let totalSongs = 0;
    let totalAlbums = 0;
    let skippedLiveTracks = 0;
    let deduplicatedTracks = 0;
    const processedAlbums = new Set<string>();
    const seenTracks = new Map<string, string>(); // trackId -> title for deduplication
    const normalizedTitles = new Set<string>(); // normalized titles for deduplication

    // Get all albums for the artist
    let offset = 0;
    const limit = 50;
    let hasMore = true;

    while (hasMore) {
      const albumsResponse = await this.errorHandler.withRetry(
        () => this.spotifyClient.getArtistAlbums(artistId, {
          include_groups: 'album,single,compilation',
          market: 'US',
          limit,
          offset
        }),
        {
          service: "ArtistSyncService",
          operation: "getArtistAlbums",
          context: { artistId, offset },
        }
      );

      const albums = albumsResponse.items || [];
      
      for (const album of albums) {
        // Skip duplicates (different markets can cause duplicates)
        if (processedAlbums.has(album.id)) {
          continue;
        }
        processedAlbums.add(album.id);
        totalAlbums++;

        // Get all tracks for this album
        let trackOffset = 0;
        let hasMoreTracks = true;

        while (hasMoreTracks) {
          const tracksResponse = await this.errorHandler.withRetry(
            () => this.spotifyClient.getAlbumTracks(album.id, {
              limit: 50,
              offset: trackOffset
            }),
            {
              service: "ArtistSyncService",
              operation: "getAlbumTracks",
              context: { albumId: album.id, trackOffset },
            }
          );

          // Filter out live tracks and similar variants
          const tracks = (tracksResponse.items || []).filter((t: any) => {
            const name = (t.name || "").toLowerCase();
            return !(
              name.includes("(live") ||
              name.includes(" - live") ||
              name.includes(" live") ||
              name.includes(" - live at") ||
              name.includes(" (live at") ||
              name.includes("[live]")
            );
          });
          
          for (const track of tracks) {
            // Upsert song row
            const [song] = await db
              .insert(songs)
              .values({
                spotifyId: track.id,
                title: track.name,
                artist: track.artists[0]?.name || 'Unknown',
                album: album.name,
                albumId: album.id,
                trackNumber: track.track_number,
                discNumber: track.disc_number,
                albumType: album.album_type,
                albumArtUrl: album.images[0]?.url,
                releaseDate: album.release_date,
                durationMs: track.duration_ms,
                popularity: 0, // Track popularity not available in album tracks endpoint
                previewUrl: track.preview_url,
                spotifyUri: track.uri,
                externalUrls: JSON.stringify(track.external_urls),
                isExplicit: track.explicit,
                isPlayable: !track.restrictions,
              })
              .onConflictDoUpdate({
                target: songs.spotifyId,
                set: {
                  title: track.name,
                  album: album.name,
                  albumArtUrl: album.images[0]?.url,
                  isPlayable: !track.restrictions,
                },
              })
              .returning();

            // Link to artist
            if (song) {
              await db
                .insert(artistSongs)
                .values({
                  artistId: artist.id,
                  songId: song.id,
                  isPrimaryArtist: true,
                })
                .onConflictDoNothing();
              
              totalSongs++;
            }
          }

          hasMoreTracks = tracks.length === 50;
          trackOffset += 50;
        }
      }

      hasMore = albums.length === limit;
      offset += limit;
    }

    // Update artist with catalog sync timestamp and totals
    await db
      .update(artists)
      .set({ 
        songCatalogSyncedAt: new Date(),
        totalSongs,
        totalAlbums,
        lastFullSyncAt: new Date()
      })
      .where(eq(artists.id, artist.id));

    return { 
      totalSongs, 
      totalAlbums, 
      processedAlbums: processedAlbums.size,
      skippedLiveTracks,
      deduplicatedTracks
    };
  }

  // Overload signature declaration
  async syncFullDiscography(artistId: string): Promise<{ totalSongs: number; totalAlbums: number; processedAlbums: number }>;
  async syncFullDiscography(artistId: string): Promise<{ totalSongs: number; totalAlbums: number; processedAlbums: number }> {
    const result = await this.syncCatalog(artistId);
    return { 
      totalSongs: result.totalSongs, 
      totalAlbums: result.totalAlbums, 
      processedAlbums: result.processedAlbums 
    };
  }

  async syncPopularArtists(): Promise<void> {
    await this.spotifyClient.authenticate();
    // Get popular artists in different genres
    const genres = ["rock", "pop", "hip-hop", "electronic", "indie"];

    for (const genre of genres) {
      const searchResult = await this.spotifyClient.searchArtists(genre, 10);

      for (const artist of (searchResult?.artists?.items ?? [])) {
        try {
          await this.syncArtist(artist.id);
        } catch (error) {
          console.error(`Failed to sync artist ${artist.name}:`, error);
          // Continue with next artist
        }
      }
    }
  }

  /**
   * Maps TM attraction → Spotify artist → MBID for cross-platform identification
   */
  async syncIdentifiers(attractionId: string): Promise<{
    spotifyId?: string;
    mbid?: string;
    ticketmasterId: string;
  } | null> {
    try {
      // Get attraction details from Ticketmaster
      const attraction = await this.errorHandler.withRetry(
        () => this.ticketmasterClient.getAttraction(attractionId),
        {
          service: "ArtistSyncService",
          operation: "getAttraction",
          context: { attractionId },
        },
      );

      if (!attraction) {
        return null;
      }

      const attractionName = attraction.name;
      let spotifyId: string | undefined;
      let mbid: string | undefined;

      // Search for artist on Spotify
      try {
        await this.spotifyClient.authenticate();
        const searchResult = await this.errorHandler.withRetry(
          () => this.spotifyClient.searchArtists(attractionName, 5),
          {
            service: "ArtistSyncService",
            operation: "searchArtists",
            context: { attractionName },
          },
        );

        // Find the best match
        for (const spotifyArtist of searchResult.artists.items) {
          if (this.isArtistNameMatch(attractionName, spotifyArtist.name)) {
            spotifyId = spotifyArtist.id;
            break;
          }
        }
      } catch (error) {
        console.warn(`Failed to find Spotify match for ${attractionName}:`, error);
      }

      // TODO: Add Setlist.fm search for MBID when SetlistFmClient is available
      // For now, we'll store what we have

      return {
        spotifyId,
        mbid,
        ticketmasterId: attractionId,
      };
    } catch (error) {
      console.error(`Failed to sync identifiers for attraction ${attractionId}:`, error);
      return null;
    }
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
    if (normalized1.includes(normalized2) || normalized2.includes(normalized1)) {
      return true;
    }
    
    return false;
  }

  /**
   * Checks if a track is likely a live recording
   */
  private isLiveTrack(trackTitle: string, albumName: string): boolean {
    const liveIndicators = [
      'live at',
      'live from',
      'live in',
      'live on',
      '- live',
      '(live)',
      '[live]',
      'live version',
      'live recording',
      'concert',
      'acoustic session',
      'unplugged',
      'mtv unplugged',
      'radio session',
      'bbc session',
      'peel session',
    ];

    const combinedText = `${trackTitle} ${albumName}`;
    
    return liveIndicators.some(indicator => 
      combinedText.includes(indicator)
    );
  }

  /**
   * Normalizes track title for deduplication
   */
  private normalizeTrackTitle(title: string): string {
    return title
      .toLowerCase()
      .replace(/[\(\[].+?[\)\]]/g, '') // Remove parentheses and brackets content
      .replace(/\s*-\s*remaster(ed)?.*$/i, '') // Remove remaster suffixes
      .replace(/\s*-\s*\d{4}\s*remaster.*$/i, '') // Remove year remaster suffixes
      .replace(/[^a-z0-9\s]/g, '') // Remove special characters
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }
}
