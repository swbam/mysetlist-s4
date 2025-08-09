import { NextResponse } from "next/server";
import { db } from "@repo/database";
import { artists, shows, venues, songs, artistSongs } from "@repo/database";
import { SpotifyClient, TicketmasterClient, SetlistFmClient } from "@repo/external-apis";
import { eq, sql } from "drizzle-orm";

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
          { status: 404 }
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
      { error: "Sync failed", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// Sync all data for a single artist
async function syncArtistData(
  artist: any,
  spotify: SpotifyClient,
  ticketmaster: TicketmasterClient,
  setlistFm: SetlistFmClient,
  results: any
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
            smallImageUrl: spotifyArtist.images[2]?.url || spotifyArtist.images[1]?.url || null,
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
        const topTracks = await spotify.getArtistTopTracks(artist.spotify_id, 'US');
        const albums = await spotify.getArtistAlbums(artist.spotify_id, 50);
        
        const allTracks = [...topTracks];
        
        // Get tracks from albums
        for (const album of albums.slice(0, 5)) { // Limit to 5 albums to avoid timeout
          try {
            const albumTracks = await spotify.getAlbumTracks(album.id);
            const artistTracks = albumTracks.filter(track =>
              track.artists.some(a => a.id === artist.spotify_id)
            );
            allTracks.push(...artistTracks);
          } catch (error) {
            console.error(`[Sync] Error fetching album tracks:`, error);
          }
        }

        // Deduplicate and insert songs
        const uniqueTracks = Array.from(
          new Map(allTracks.map(track => [track.id, track])).values()
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
                  album: track.album?.name || null,
                  albumArtUrl: track.album?.images?.[0]?.url || null,
                  releaseDate: track.album?.release_date || null,
                  durationMs: track.duration_ms,
                  popularity: track.popularity,
                  previewUrl: track.preview_url,
                  isExplicit: track.explicit || false,
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
                  album: track.album?.name || null,
                  albumArtUrl: track.album?.images?.[0]?.url || null,
                  releaseDate: track.album?.release_date || null,
                  durationMs: track.duration_ms,
                  popularity: track.popularity,
                  previewUrl: track.preview_url,
                  spotifyId: track.id,
                  isExplicit: track.explicit || false,
                })
                .returning();
              
              songId = newSong.id;
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
          attractionId: artist.ticketmaster_id,
          keyword: !artist.ticketmaster_id ? artist.name : undefined,
          classificationName: "music",
          size: 50,
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
                    city: tmVenue.city?.name || 'Unknown',
                    state: tmVenue.state?.stateCode || null,
                    country: tmVenue.country?.countryCode || 'Unknown',
                    latitude: tmVenue.location?.latitude ? parseFloat(tmVenue.location.latitude) : null,
                    longitude: tmVenue.location?.longitude ? parseFloat(tmVenue.location.longitude) : null,
                    ticketmasterId: tmVenue.id,
                    slug: tmVenue.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
                  })
                  .onConflictDoUpdate({
                    target: venues.ticketmasterId,
                    set: {
                      name: tmVenue.name,
                      city: tmVenue.city?.name || 'Unknown',
                      updatedAt: new Date(),
                    },
                  });
                
                results.venues.synced++;
              }

              // Insert show
              await db
                .insert(shows)
                .values({
                  name: event.name,
                  date: event.dates.start.localDate,
                  time: event.dates.start.localTime || null,
                  ticketmasterId: event.id,
                  ticketUrl: event.url,
                  headlinerArtistId: artist.id,
                  venueId: event._embedded?.venues?.[0]?.id || null,
                  status: event.dates.status.code.toLowerCase(),
                  slug: `${artist.slug}-${event.dates.start.localDate}`,
                })
                .onConflictDoUpdate({
                  target: shows.ticketmasterId,
                  set: {
                    status: event.dates.status.code.toLowerCase(),
                    ticketUrl: event.url,
                    updatedAt: new Date(),
                  },
                });
              
              results.shows.synced++;
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
        console.error(`[Sync] Ticketmaster sync error for ${artist.name}:`, error);
      }
    }

  } catch (error) {
    console.error(`[Sync] Error syncing artist ${artist.name}:`, error);
  }
}
