import { db } from "@repo/database";
import {
  artistSongs,
  artists,
  setlistSongs,
  setlists,
  shows,
  songs,
  venues,
} from "@repo/database";
import {
  SetlistFmClient,
  SpotifyClient,
  TicketmasterClient,
} from "@repo/external-apis";
import { eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 300; // 5 minutes

// Main sync endpoint - follows Next-Forge patterns
export async function POST(request: Request) {
  try {
    const { type = "all", artistId, limit = 10 } = await request.json();

    // Initialize API clients
    const spotify = new SpotifyClient({});
    await spotify.authenticate();

    const ticketmaster = new TicketmasterClient({
      apiKey: process.env.TICKETMASTER_API_KEY!,
    });

    const setlistFm = new SetlistFmClient({
      apiKey: process.env.SETLISTFM_API_KEY!,
    });

    const results = {
      artists: { synced: 0, errors: 0 },
      shows: { synced: 0, errors: 0 },
      venues: { synced: 0, errors: 0 },
      songs: { synced: 0, errors: 0 },
      timestamp: new Date().toISOString(),
    };

    // Sync specific artist
    if (artistId) {
      const [artist] = await db
        .select()
        .from(artists)
        .where(eq(artists.id, artistId))
        .limit(1);

      if (!artist) {
        return NextResponse.json(
          { error: "Artist not found" },
          { status: 404 },
        );
      }

      await syncArtistData(artist, spotify, ticketmaster, setlistFm, results);
    } else {
      // Sync popular artists needing updates
      const artistsToSync = await db.execute(sql`
        SELECT * FROM artists 
        WHERE verified = true 
          AND (
            last_synced_at IS NULL 
            OR last_synced_at < NOW() - INTERVAL '24 hours'
            OR total_songs = 0
          )
        ORDER BY popularity DESC NULLS LAST
        LIMIT ${limit}
      `);

      for (const artist of artistsToSync) {
        await syncArtistData(artist, spotify, ticketmaster, setlistFm, results);
      }
    }

    return NextResponse.json({
      success: true,
      results,
    });
  } catch (error) {
    console.error("[Sync] Error:", error);
    return NextResponse.json(
      {
        error: "Sync failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

// Sync all data for a single artist
async function syncArtistData(
  artist: any,
  spotify: SpotifyClient,
  ticketmaster: TicketmasterClient,
  setlistFm: SetlistFmClient,
  results: any,
) {
  try {
    // 1. Update artist info from Spotify
    if (artist.spotify_id) {
      try {
        const spotifyArtist = await spotify.getArtist(artist.spotify_id);

        await db
          .update(artists)
          .set({
            name: spotifyArtist.name,
            imageUrl: spotifyArtist.images[0]?.url || null,
            smallImageUrl:
              spotifyArtist.images[2]?.url ||
              spotifyArtist.images[1]?.url ||
              null,
            genres: JSON.stringify(spotifyArtist.genres),
            popularity: spotifyArtist.popularity,
            followers: spotifyArtist.followers.total,
            followerCount: spotifyArtist.followers.total,
            externalUrls: JSON.stringify(spotifyArtist.external_urls),
            lastSyncedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(artists.id, artist.id));

        results.artists.synced++;

        // 2. Sync songs from Spotify
        const topTracksResp = await spotify.getArtistTopTracks(
          artist.spotify_id,
          "US",
        );
        const topTracks = (topTracksResp as any).tracks || [];
        const albumsResp = await spotify.getArtistAlbums(artist.spotify_id, {
          limit: 50,
        });
        const albums = (albumsResp as any).items || [];

        const allTracks = [...topTracks];

        // Get tracks from albums
        for (const album of albums.slice(0, 5)) {
          // Limit to 5 albums to avoid timeout
          try {
            const atResp = await fetch(
              `https://api.spotify.com/v1/albums/${album.id}/tracks`,
              {
                headers: {
                  Authorization: `Bearer ${(spotify as any).accessToken ?? ""}`,
                },
              },
            ).then((r) => (r.ok ? r.json() : { items: [] }));
            const albumTracks = atResp.items || [];
            const artistTracks = albumTracks.filter((track: any) =>
              track.artists.some((a) => a.id === artist.spotify_id),
            );
            allTracks.push(...artistTracks);
          } catch (error) {
            console.error(`[Sync] Error fetching album tracks:`, error);
          }
        }

        // Deduplicate and insert songs
        const uniqueTracks = Array.from(
          new Map(allTracks.map((track) => [track.id, track])).values(),
        );

        for (const track of uniqueTracks) {
          try {
            // Insert or update song
            const [existingSong] = await db
              .select()
              .from(songs)
              .where(eq(songs.spotifyId, track.id))
              .limit(1);

            let songId: string;

            if (existingSong) {
              await db
                .update(songs)
                .set({
                  title: track.name,
                  artist: artist.name,
                  album: track.album?.name ?? null,
                  albumArtUrl: track.album?.images?.[0]?.url ?? null,
                  releaseDate: track.album?.release_date ?? null,
                  durationMs: track.duration_ms,
                  popularity: track.popularity,
                  previewUrl: track.preview_url ?? null,
                  isExplicit: track.explicit ?? false,
                  updatedAt: new Date(),
                })
                .where(eq(songs.id, existingSong.id));

              songId = existingSong.id;
            } else {
              const [newSong] = await db
                .insert(songs)
                .values({
                  title: track.name,
                  artist: artist.name,
                  album: track.album?.name ?? null,
                  albumArtUrl: track.album?.images?.[0]?.url ?? null,
                  releaseDate: track.album?.release_date ?? null,
                  durationMs: track.duration_ms,
                  popularity: track.popularity,
                  previewUrl: track.preview_url ?? null,
                  spotifyId: track.id,
                  isExplicit: track.explicit ?? false,
                })
                .returning();

              songId = (newSong as any).id;
            }

            // Create artist-song relationship
            await db
              .insert(artistSongs)
              .values({
                artistId: artist.id,
                songId: songId,
              })
              .onConflictDoNothing();

            results.songs.synced++;
          } catch (error) {
            console.error(`[Sync] Error syncing song ${track.name}:`, error);
            results.songs.errors++;
          }
        }

        // Update artist song count
        await db
          .update(artists)
          .set({
            totalSongs: results.songs.synced,
            songCatalogSyncedAt: new Date(),
          })
          .where(eq(artists.id, artist.id));
      } catch (error) {
        console.error(`[Sync] Spotify sync error for ${artist.name}:`, error);
        results.artists.errors++;
      }
    }

    // 3. Sync shows from Ticketmaster
    if (artist.ticketmaster_id || artist.name) {
      try {
        const events = await ticketmaster.searchEvents({
          keyword: artist.ticketmaster_id
            ? artist.ticketmaster_id
            : artist.name,
          classificationName: "music",
          size: 50,
          sort: "date,asc",
        });

        if (events._embedded?.events) {
          for (const event of events._embedded.events) {
            try {
              // Process venue first
              if (event._embedded?.venues?.[0]) {
                const tmVenue = event._embedded.venues[0];

                await db
                  .insert(venues)
                  .values({
                    name: tmVenue.name,
                    city: tmVenue.city?.name ?? "Unknown",
                    state: tmVenue.state?.stateCode ?? null,
                    country: tmVenue.country?.countryCode ?? "Unknown",
                    latitude: tmVenue.location?.latitude
                      ? Number.parseFloat(tmVenue.location.latitude)
                      : null,
                    longitude: tmVenue.location?.longitude
                      ? Number.parseFloat(tmVenue.location.longitude)
                      : null,
                    ticketmasterId: tmVenue.id,
                    slug: tmVenue.name
                      .toLowerCase()
                      .replace(/[^a-z0-9]+/g, "-"),
                  } as any)
                  .onConflictDoUpdate({
                    target: venues.ticketmasterId,
                    set: {
                      name: tmVenue.name,
                      city: tmVenue.city?.name ?? "Unknown",
                      updatedAt: new Date(),
                    },
                  });

                results.venues.synced++;
              }

              // Insert show
              const [insertedShow] = await db
                .insert(shows)
                .values({
                  name: event.name,
                  date: event.dates.start.localDate,
                  startTime: event.dates.start.localTime || null,
                  doorsTime: null,
                  ticketmasterId: event.id,
                  ticketUrl: event.url,
                  headlinerArtistId: artist.id,
                  venueId: null,
                  status: mapTicketmasterStatus(event.dates.status?.code),
                  slug: `${artist.slug}-${event.dates.start.localDate}`,
                } as any)
                .onConflictDoUpdate({
                  target: shows.ticketmasterId,
                  set: {
                    status: mapTicketmasterStatus(event.dates.status?.code),
                    ticketUrl: event.url,
                    updatedAt: new Date(),
                  },
                })
                .returning();

              results.shows.synced++;

              // Create an initial predicted setlist of 5 random songs from this artist's catalog
              if (insertedShow) {
                const artistCatalog = await db
                  .select()
                  .from(artistSongs)
                  .leftJoin(songs, eq(artistSongs.songId, songs.id))
                  .where(eq(artistSongs.artistId, artist.id));

                const pool = artistCatalog
                  .map((row: any) => row.songs)
                  .filter((s: any) => !!s);

                if (pool.length >= 5) {
                  // pick 5 unique random songs
                  const shuffled = pool.sort(() => 0.5 - Math.random());
                  const selected = shuffled.slice(0, 5);

                  const [newSetlist] = await db
                    .insert(setlists)
                    .values({
                      showId: (insertedShow as any).id,
                      artistId: artist.id,
                      type: "predicted",
                      name: "Predicted Set",
                      orderIndex: 0,
                      importedFrom: "api",
                      importedAt: new Date(),
                    } as any)
                    .returning();

                  if (newSetlist) {
                    await db.insert(setlistSongs).values(
                      selected.map((s: any, idx: number) => ({
                        setlistId: (newSetlist as any).id,
                        songId: s.id,
                        position: idx + 1,
                      })) as any,
                    );
                  }
                }
              }
            } catch (error) {
              console.error(`[Sync] Error syncing show:`, error);
              results.shows.errors++;
            }
          }
        }

        // Update artist show counts
        const showCounts = await db.execute(sql`
          SELECT 
            COUNT(*) FILTER (WHERE date >= CURRENT_DATE) as upcoming,
            COUNT(*) as total
          FROM shows
          WHERE headliner_artist_id = ${artist.id}
        `);

        await db
          .update(artists)
          .set({
            totalShows: Number(showCounts[0]?.total || 0),
            upcomingShows: Number(showCounts[0]?.upcoming || 0),
          })
          .where(eq(artists.id, artist.id));
      } catch (error) {
        console.error(
          `[Sync] Ticketmaster sync error for ${artist.name}:`,
          error,
        );
      }
    }
  } catch (error) {
    console.error(`[Sync] Error syncing artist ${artist.name}:`, error);
  }
}

// Normalize Ticketmaster status to our enum
function mapTicketmasterStatus(
  tmStatus?: string,
): "upcoming" | "cancelled" | "completed" | "ongoing" {
  switch ((tmStatus || "").toLowerCase()) {
    case "cancelled":
      return "cancelled";
    // Ticketmaster’s "postponed", "rescheduled" treated as upcoming
    case "postponed":
    case "rescheduled":
    case "onsale":
    case "offsale":
    default:
      return "upcoming";
  }
}
