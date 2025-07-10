import { db } from '@repo/database';
import { artistSongs, artists, songs } from '@repo/database';
import { TicketmasterClient } from '@repo/external-apis';
import { and, eq } from 'drizzle-orm';
import { createServiceClient } from '~/lib/supabase/server';

// Enhanced Spotify client with full catalog sync capabilities
class SpotifyClient {
  private accessToken: string | null = null;
  private tokenExpiry = 0;

  async authenticate(): Promise<void> {
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return; // Token is still valid
    }

    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(
          `${process.env['SPOTIFY_CLIENT_ID']}:${process.env['SPOTIFY_CLIENT_SECRET']}`
        ).toString('base64')}`,
      },
      body: 'grant_type=client_credentials',
    });

    if (!response.ok) {
      throw new Error('Spotify authentication failed');
    }

    const data = await response.json();
    this.accessToken = data.access_token;
    this.tokenExpiry = Date.now() + data.expires_in * 1000 - 60000; // 1 minute buffer
  }

  async searchArtists(query: string, limit = 20): Promise<any> {
    await this.authenticate();

    const params = new URLSearchParams({
      q: query,
      type: 'artist',
      limit: limit.toString(),
    });

    const response = await fetch(
      `https://api.spotify.com/v1/search?${params}`,
      {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Spotify search failed: ${response.statusText}`);
    }

    return response.json();
  }

  async getArtist(artistId: string): Promise<any> {
    await this.authenticate();

    const response = await fetch(
      `https://api.spotify.com/v1/artists/${artistId}`,
      {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to get artist: ${response.statusText}`);
    }

    return response.json();
  }

  async getArtistAlbums(
    artistId: string,
    includeGroups = 'album,single,compilation',
    limit = 50,
    offset = 0
  ): Promise<any> {
    await this.authenticate();

    const params = new URLSearchParams({
      include_groups: includeGroups,
      limit: limit.toString(),
      offset: offset.toString(),
      market: 'US',
    });

    const response = await fetch(
      `https://api.spotify.com/v1/artists/${artistId}/albums?${params}`,
      {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to get artist albums: ${response.statusText}`);
    }

    return response.json();
  }

  async getAlbumTracks(albumId: string, limit = 50, offset = 0): Promise<any> {
    await this.authenticate();

    const params = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString(),
      market: 'US',
    });

    const response = await fetch(
      `https://api.spotify.com/v1/albums/${albumId}/tracks?${params}`,
      {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to get album tracks: ${response.statusText}`);
    }

    return response.json();
  }

  async getTrack(trackId: string): Promise<any> {
    await this.authenticate();

    const response = await fetch(
      `https://api.spotify.com/v1/tracks/${trackId}?market=US`,
      {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to get track: ${response.statusText}`);
    }

    return response.json();
  }

  async getTracks(trackIds: string[]): Promise<any> {
    await this.authenticate();

    // Spotify limits to 50 tracks per request
    const chunks = [];
    for (let i = 0; i < trackIds.length; i += 50) {
      chunks.push(trackIds.slice(i, i + 50));
    }

    const allTracks = [];
    for (const chunk of chunks) {
      const response = await fetch(
        `https://api.spotify.com/v1/tracks?ids=${chunk.join(',')}&market=US`,
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to get tracks: ${response.statusText}`);
      }

      const data = await response.json();
      allTracks.push(...data.tracks);
    }

    return { tracks: allTracks };
  }
}

const spotify = new SpotifyClient();

// Function to find Ticketmaster ID for an artist
async function findTicketmasterId(artistName: string): Promise<string | null> {
  try {
    if (!process.env['TICKETMASTER_API_KEY']) {
      return null;
    }

    const tmClient = new TicketmasterClient({});
    const response = await tmClient.searchAttractions({
      keyword: artistName,
      classificationName: 'Music',
      size: 5,
    });

    if (response._embedded?.attractions) {
      // Try to find exact match first
      const exactMatch = response._embedded.attractions.find(
        (attraction: any) =>
          attraction.name.toLowerCase() === artistName.toLowerCase()
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
  const results = { albums: 0, songs: 0, errors: 0 };
  const processedAlbums = new Set<string>();
  const processedTracks = new Set<string>();
  let offset = 0;
  let hasMore = true;

  // Fetch all albums (including singles and compilations)
  while (hasMore) {
    const albumsResponse = await spotify.getArtistAlbums(
      spotifyId,
      'album,single,compilation',
      50,
      offset
    );

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
  params: SyncArtistParams
): Promise<SyncArtistResult> {
  try {
    const { artistName, spotifyId, ticketmasterId } = params;

    if (!artistName && !spotifyId) {
      return {
        success: false,
        error: 'Either artistName or spotifyId is required',
      };
    }

    // Check if Spotify credentials are available
    if (!process.env['SPOTIFY_CLIENT_ID'] || !process.env['SPOTIFY_CLIENT_SECRET']) {
      return {
        success: false,
        error: 'Spotify credentials not configured',
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
          error: 'Artist not found on Spotify',
        };
      }
      spotifyArtist = searchResults.artists.items[0];
    }

    // Generate slug
    const slug = spotifyArtist.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

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
          ...(resolvedTicketmasterId !== undefined && { ticketmasterId: resolvedTicketmasterId }),
          ...(resolvedTicketmasterId === undefined && existingArtist[0]?.ticketmasterId !== undefined && { ticketmasterId: existingArtist[0].ticketmasterId }),
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
        const supabaseAdmin = await createServiceClient();

        // Sync shows if we have a Ticketmaster ID
        if (artistRecord.ticketmasterId) {
          await supabaseAdmin.functions.invoke('sync-artist-shows', {
            body: {
              ticketmasterId: artistRecord.ticketmasterId,
              artistId: artistRecord.id,
            },
          });
        }
      } catch (_err) {}
    }

    if (!artistRecord) {
      return {
        success: false,
        error: 'Failed to create or update artist record',
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
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
