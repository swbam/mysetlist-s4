import { SpotifyClient } from "../clients/spotify";
import { db, eq } from "../database";
import { artistSongs, artists, songs } from "@repo/database";
import { SyncErrorHandler, SyncServiceError } from "../utils/error-handler";

export class ArtistSyncService {
  private spotifyClient: SpotifyClient;
  private errorHandler: SyncErrorHandler;

  constructor() {
    this.spotifyClient = new SpotifyClient({});
    this.errorHandler = new SyncErrorHandler({
      maxRetries: 3,
      retryDelay: 1000,
      onError: (error) => {
        console.error("[ArtistSyncService] Error:", error);
      },
    });
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

    // Update or create artist in database
    await db
      .insert(artists)
      .values({
        spotifyId: spotifyArtist.id,
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

  async syncFullDiscography(artistId: string): Promise<{ totalSongs: number; totalAlbums: number; processedAlbums: number }> {
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
        "syncFullDiscography"
      );
    }

    let totalSongs = 0;
    let totalAlbums = 0;
    const processedAlbums = new Set<string>();

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

          const tracks = tracksResponse.items || [];
          
          for (const track of tracks) {
            // Insert song into database
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

    // Update artist with catalog sync timestamp
    await db
      .update(artists)
      .set({ 
        songCatalogSyncedAt: new Date(),
        totalSongs,
        totalAlbums,
        lastFullSyncAt: new Date()
      })
      .where(eq(artists.id, artist.id));

    return { totalSongs, totalAlbums, processedAlbums: processedAlbums.size };
  }

  async syncPopularArtists(): Promise<void> {
    await this.spotifyClient.authenticate();
    // Get popular artists in different genres
    const genres = ["rock", "pop", "hip-hop", "electronic", "indie"];

    for (const genre of genres) {
      const searchResult = await this.spotifyClient.searchArtists(genre, 10);

      for (const artist of searchResult.artists.items) {
        try {
          await this.syncArtist(artist.id);
        } catch (error) {
          console.error(`Failed to sync artist ${artist.name}:`, error);
          // Continue with next artist
        }
      }
    }
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }
}
