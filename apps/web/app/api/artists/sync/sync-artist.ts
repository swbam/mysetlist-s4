import { db } from "@repo/database";
import { artistSongs, artists, songs } from "@repo/database";
import { TicketmasterClient, SpotifyClient } from "@repo/external-apis";
import { and, eq } from "drizzle-orm";

const spotify = new SpotifyClient({});

// Function to find Ticketmaster ID for an artist
async function findTicketmasterId(artistName: string): Promise<string | null> {
  try {
    if (!process.env["TICKETMASTER_API_KEY"]) {
      return null;
    }

    const tmClient = new TicketmasterClient({});
    const response = await tmClient.searchAttractions({
      keyword: artistName,
      classificationName: "Music",
      size: 5,
    });

    if (response._embedded?.attractions) {
      // Try to find exact match first
      const exactMatch = response._embedded.attractions.find(
        (attraction: any) =>
          attraction.name.toLowerCase() === artistName.toLowerCase(),
      );

      if (exactMatch) {
        return exactMatch.id;
      }

      // If no exact match, return the first result
      if (response._embedded.attractions.length > 0) {
        return response._embedded.attractions[0].id;
      }
    }
  } catch (_error) {}

  return null;
}

interface SyncArtistParams {
  artistName?: string;
  spotifyId?: string;
  ticketmasterId?: string;
}

interface SyncArtistResult {
  success: boolean;
  artist?: any;
  error?: string;
  catalogSync?: {
    albums: number;
    songs: number;
    errors: number;
  };
}

async function syncFullCatalog(spotifyId: string, artistId: string) {
  await spotify.authenticate();
  const results = { albums: 0, songs: 0, errors: 0 };
  const processedAlbums = new Set<string>();
  const processedTracks = new Set<string>();
  let offset = 0;
  let hasMore = true;

  // Fetch all albums (including singles and compilations)
  while (hasMore) {
    const albumsResponse = await spotify.getArtistAlbums(spotifyId, {
      include_groups: "album,single,compilation",
      limit: 50,
      offset: offset,
    });

    if (!albumsResponse.items || albumsResponse.items.length === 0) {
      hasMore = false;
      break;
    }

    // Process each album
    for (const album of albumsResponse.items) {
      if (processedAlbums.has(album.id)) {
        continue;
      }
      processedAlbums.add(album.id);

      try {
        results.albums++;

        // TODO: getAlbumTracks and getTracks methods not implemented in SpotifyClient
        // Skipping album tracks syncing for now

        /*
        // Get all tracks from the album
        let trackOffset = 0;
        let hasMoreTracks = true;

        while (hasMoreTracks) {
          const tracksResponse = await spotify.getAlbumTracks(
            album.id,
            50,
            trackOffset
          );

          if (!tracksResponse.items || tracksResponse.items.length === 0) {
            hasMoreTracks = false;
            break;
          }

          // Get full track details for all tracks
          const trackIds = tracksResponse.items
            .map((t: any) => t.id)
            .filter((id: string) => id);
          if (trackIds.length > 0) {
            const fullTracks = await spotify.getTracks(trackIds);

            for (const track of fullTracks.tracks) {
              if (!track || processedTracks.has(track.id)) {
                continue;
              }
              processedTracks.add(track.id);

              try {
                // Check if song already exists
                const existingSong = await db
                  .select()
                  .from(songs)
                  .where(eq(songs.spotifyId, track.id))
                  .limit(1);

                let songId: string | undefined;

                if (existingSong.length > 0 && existingSong[0]) {
                  // Update existing song
                  songId = existingSong[0].id;
                  await db
                    .update(songs)
                    .set({
                      title: track.name,
                      artist: track.artists[0]?.name || 'Unknown Artist',
                      album: track.album.name,
                      albumId: track.album.id,
                      albumType: album.album_type,
                      trackNumber: track.track_number,
                      discNumber: track.disc_number || 1,
                      albumArtUrl: track.album.images[0]?.url,
                      releaseDate: track.album.release_date,
                      durationMs: track.duration_ms,
                      popularity: track.popularity,
                      previewUrl: track.preview_url,
                      spotifyUri: track.uri,
                      externalUrls: JSON.stringify(track.external_urls),
                      isExplicit: track.explicit,
                      isPlayable: track.is_playable !== false,
                      updatedAt: new Date(),
                    })
                    .where(eq(songs.id, songId));
                } else {
                  // Insert new song
                  const newSongs = await db
                    .insert(songs)
                    .values({
                      spotifyId: track.id,
                      title: track.name,
                      artist: track.artists[0]?.name || 'Unknown Artist',
                      album: track.album.name,
                      albumId: track.album.id,
                      albumType: album.album_type,
                      trackNumber: track.track_number,
                      discNumber: track.disc_number || 1,
                      albumArtUrl: track.album.images[0]?.url,
                      releaseDate: track.album.release_date,
                      durationMs: track.duration_ms,
                      popularity: track.popularity,
                      previewUrl: track.preview_url,
                      spotifyUri: track.uri,
                      externalUrls: JSON.stringify(track.external_urls),
                      isExplicit: track.explicit,
                      isPlayable: track.is_playable !== false,
                    })
                    .returning();
                  if (newSongs[0]) {
                    songId = newSongs[0].id;
                  }
                }

                // Link song to artist (check if link exists first)
                if (songId) {
                  const existingLink = await db
                    .select()
                    .from(artistSongs)
                    .where(
                      and(
                        eq(artistSongs.artistId, artistId),
                        eq(artistSongs.songId, songId)
                      )
                    )
                    .limit(1);

                  if (existingLink.length === 0) {
                    // Check if the artist is the primary artist
                    const isPrimary = track.artists[0]?.id === spotifyId;

                    await db.insert(artistSongs).values({
                      artistId,
                      songId,
                      isPrimaryArtist: isPrimary,
                    });
                  }

                  // Also link other artists on the track
                  for (const artist of track.artists.slice(1)) {
                    if (artist.id === spotifyId) {
                      continue; // Skip if it's the same artist
                    }

                    // Check if we have this artist in our database
                    const otherArtist = await db
                      .select()
                      .from(artists)
                      .where(eq(artists.spotifyId, artist.id))
                      .limit(1);

                    if (otherArtist.length > 0 && otherArtist[0]) {
                      const existingOtherLink = await db
                        .select()
                        .from(artistSongs)
                        .where(
                          and(
                            eq(artistSongs.artistId, otherArtist[0].id),
                            eq(artistSongs.songId, songId)
                          )
                        )
                        .limit(1);

                      if (existingOtherLink.length === 0) {
                        await db.insert(artistSongs).values({
                          artistId: otherArtist[0].id,
                          songId,
                          isPrimaryArtist: false,
                        });
                      }
                    }
                  }
                }

                results.songs++;
              } catch (_error) {
                results.errors++;
              }
            }
          }

          trackOffset += 50;
          hasMoreTracks = trackOffset < tracksResponse.total;

          // Rate limiting
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
        */
      } catch (_error) {
        results.errors++;
      }
    }

    offset += 50;
    hasMore = offset < albumsResponse.total;

    // Rate limiting between album batches
    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  return results;
}

export async function syncArtist(
  params: SyncArtistParams,
): Promise<SyncArtistResult> {
  try {
    const { artistName, spotifyId, ticketmasterId } = params;

    if (!artistName && !spotifyId) {
      return {
        success: false,
        error: "Either artistName or spotifyId is required",
      };
    }

    // Check if Spotify credentials are available
    if (
      !process.env["SPOTIFY_CLIENT_ID"] ||
      !process.env["SPOTIFY_CLIENT_SECRET"]
    ) {
      return {
        success: false,
        error: "Spotify credentials not configured",
      };
    }

    let spotifyArtist;

    if (spotifyId) {
      // Get artist by ID
      spotifyArtist = await spotify.getArtist(spotifyId);
    } else {
      // Search for artist by name
      const searchResults = await spotify.searchArtists(artistName!, 1);
      if (!searchResults.artists?.items?.length) {
        return {
          success: false,
          error: "Artist not found on Spotify",
        };
      }
      spotifyArtist = searchResults.artists.items[0];
    }

    // Generate slug
    const slug = spotifyArtist.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    // Determine Ticketmaster ID: use provided value if available, otherwise attempt lookup
    const resolvedTicketmasterId =
      ticketmasterId ?? (await findTicketmasterId(spotifyArtist.name));

    // Check if artist already exists
    const existingArtist = await db
      .select()
      .from(artists)
      .where(eq(artists.spotifyId, spotifyArtist.id as string))
      .limit(1);

    let artistRecord;

    if (existingArtist.length > 0) {
      // Update existing artist
      const [updated] = await db
        .update(artists)
        .set({
          name: spotifyArtist.name,
          imageUrl: spotifyArtist.images[0]?.url,
          smallImageUrl: spotifyArtist.images[2]?.url,
          genres: JSON.stringify(spotifyArtist.genres || []),
          popularity: spotifyArtist.popularity || 0,
          followers: spotifyArtist.followers?.total || 0,
          verified: true,
          externalUrls: JSON.stringify(spotifyArtist.external_urls || {}),
          ...(resolvedTicketmasterId !== undefined && {
            ticketmasterId: resolvedTicketmasterId,
          }),
          ...(resolvedTicketmasterId === undefined &&
            existingArtist[0]?.ticketmasterId !== undefined && {
              ticketmasterId: existingArtist[0].ticketmasterId,
            }),
          lastSyncedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(artists.id, existingArtist[0]?.id as string))
        .returning();

      artistRecord = updated;
    } else {
      // Create new artist
      const [created] = await db
        .insert(artists)
        .values({
          spotifyId: spotifyArtist.id,
          name: spotifyArtist.name,
          slug,
          imageUrl: spotifyArtist.images[0]?.url,
          smallImageUrl: spotifyArtist.images[2]?.url,
          genres: JSON.stringify(spotifyArtist.genres || []),
          popularity: spotifyArtist.popularity || 0,
          followers: spotifyArtist.followers?.total || 0,
          verified: true,
          externalUrls: JSON.stringify(spotifyArtist.external_urls || {}),
          ticketmasterId: resolvedTicketmasterId,
          lastSyncedAt: new Date(),
        })
        .returning();

      artistRecord = created;
    }

    // Sync full catalog inline for immediate results
    let catalogSync = { albums: 0, songs: 0, errors: 0 };

    try {
      if (artistRecord) {
        catalogSync = await syncFullCatalog(spotifyArtist.id, artistRecord.id);

        // Update artist with catalog counts
        await db
          .update(artists)
          .set({
            totalAlbums: catalogSync.albums,
            totalSongs: catalogSync.songs,
            songCatalogSyncedAt: new Date(),
            lastFullSyncAt: new Date(),
          })
          .where(eq(artists.id, artistRecord.id));
      }
    } catch (_err) {}

    // Fire-and-forget background jobs for other sync tasks
    if (artistRecord) {
      try {
        // Sync shows if we have a Ticketmaster ID
        if (artistRecord.ticketmasterId) {
          // Call shows sync API directly instead of edge function
          fetch(`${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001"}/api/sync/shows`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ticketmasterId: artistRecord.ticketmasterId,
              artistId: artistRecord.id,
            }),
          }).catch(() => {
            // Log but don't fail the main request
            console.error("Failed to sync shows");
          });
        }
      } catch (_err) {}
    }

    if (!artistRecord) {
      return {
        success: false,
        error: "Failed to create or update artist record",
      };
    }

    return {
      success: true,
      artist: artistRecord,
      catalogSync,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
