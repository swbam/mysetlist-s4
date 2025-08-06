import { NextRequest, NextResponse } from "next/server";
import { spotify, ticketmaster } from "@repo/external-apis";
import { db, artists, artistSongs, shows, venues } from "@repo/database";
import { eq, inArray } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get top verified artists to sync
    const topArtists = await db
      .select()
      .from(artists)
      .where(eq(artists.verified, true))
      .limit(20);

    const results = {
      artistsSynced: 0,
      songsSynced: 0,
      showsSynced: 0,
      errors: [] as string[],
    };

    for (const artist of topArtists) {
      try {
        console.log(`Syncing ${artist.name}...`);
        
        // 1. Sync artist songs from Spotify
        if (artist.spotifyId) {
          try {
            const topTracks = await spotify.getArtistTopTracks(artist.spotifyId);
            
            if (topTracks && topTracks.length > 0) {
              for (const track of topTracks.slice(0, 50)) {
                try {
                  // Check if song already exists
                  const existing = await db
                    .select()
                    .from(artistSongs)
                    .where(eq(artistSongs.spotifyId, track.id))
                    .limit(1);

                  if (existing.length === 0) {
                    await db
                      .insert(artistSongs)
                      .values({
                        artistId: artist.id,
                        title: track.name,
                        spotifyId: track.id,
                        albumName: track.album?.name,
                        albumArtUrl: track.album?.images?.[0]?.url,
                        durationMs: track.duration_ms,
                        popularity: track.popularity,
                        previewUrl: track.preview_url,
                        isExplicit: track.explicit,
                        trackNumber: track.track_number,
                        spotifyUri: track.uri,
                        externalUrls: track.external_urls,
                      })
                      .onConflictDoNothing();
                    
                    results.songsSynced++;
                  }
                } catch (error) {
                  console.error(`Failed to insert song ${track.name}:`, error);
                }
              }
            }
          } catch (error) {
            console.error(`Failed to sync songs for ${artist.name}:`, error);
            results.errors.push(`Songs sync failed for ${artist.name}`);
          }
        }

        // 2. Sync shows from Ticketmaster
        try {
          const ticketmasterShows = await ticketmaster.searchEvents({
            keyword: artist.name,
            size: 20,
            sort: "date,asc",
            classificationName: "Music",
          });

          if (ticketmasterShows && ticketmasterShows._embedded?.events) {
            for (const event of ticketmasterShows._embedded.events) {
              try {
                // Get or create venue
                let venueId = null;
                if (event._embedded?.venues?.[0]) {
                  const tmVenue = event._embedded.venues[0];
                  
                  // Check if venue exists
                  const [existingVenue] = await db
                    .select()
                    .from(venues)
                    .where(eq(venues.ticketmasterId, tmVenue.id))
                    .limit(1);

                  if (existingVenue) {
                    venueId = existingVenue.id;
                  } else {
                    // Create venue
                    const [newVenue] = await db
                      .insert(venues)
                      .values({
                        ticketmasterId: tmVenue.id,
                        name: tmVenue.name,
                        city: tmVenue.city?.name,
                        state: tmVenue.state?.stateCode,
                        country: tmVenue.country?.countryCode,
                        address: tmVenue.address?.line1,
                        postalCode: tmVenue.postalCode,
                        latitude: tmVenue.location?.latitude ? parseFloat(tmVenue.location.latitude) : null,
                        longitude: tmVenue.location?.longitude ? parseFloat(tmVenue.location.longitude) : null,
                        timezone: tmVenue.timezone,
                      })
                      .returning()
                      .onConflictDoNothing();
                    
                    if (newVenue) {
                      venueId = newVenue.id;
                    }
                  }
                }

                // Check if show exists
                const [existingShow] = await db
                  .select()
                  .from(shows)
                  .where(eq(shows.ticketmasterId, event.id))
                  .limit(1);

                if (!existingShow) {
                  // Create show with proper artist linkage
                  await db
                    .insert(shows)
                    .values({
                      ticketmasterId: event.id,
                      headlinerArtistId: artist.id, // Link to artist!
                      venueId: venueId,
                      name: event.name,
                      slug: event.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
                      date: new Date(event.dates.start.dateTime || event.dates.start.localDate),
                      startTime: event.dates.start.localTime,
                      status: event.dates.status.code.toLowerCase(),
                      ticketUrl: event.url,
                      minPrice: event.priceRanges?.[0]?.min,
                      maxPrice: event.priceRanges?.[0]?.max,
                      currency: event.priceRanges?.[0]?.currency || 'USD',
                    })
                    .onConflictDoNothing();
                  
                  results.showsSynced++;
                }
              } catch (error) {
                console.error(`Failed to insert show ${event.name}:`, error);
              }
            }
          }
        } catch (error) {
          console.error(`Failed to sync shows for ${artist.name}:`, error);
          results.errors.push(`Shows sync failed for ${artist.name}`);
        }

        // Update artist sync timestamp
        await db
          .update(artists)
          .set({
            lastSyncedAt: new Date(),
            songCatalogSyncedAt: new Date(),
          })
          .where(eq(artists.id, artist.id));

        results.artistsSynced++;
      } catch (error) {
        console.error(`Failed to sync artist ${artist.name}:`, error);
        results.errors.push(`Full sync failed for ${artist.name}`);
      }
    }

    console.log("Sync completed:", results);

    return NextResponse.json({
      success: true,
      ...results,
    });
  } catch (error) {
    console.error("Sync error:", error);
    return NextResponse.json(
      { error: "Sync failed", details: error },
      { status: 500 }
    );
  }
}

// Manual trigger endpoint for testing
export async function GET(request: NextRequest) {
  // Check for admin auth or dev environment
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Not available in production" }, { status: 403 });
  }

  // Trigger the sync with the cron secret
  const response = await POST(
    new NextRequest(request.url, {
      method: "POST",
      headers: {
        authorization: `Bearer ${process.env.CRON_SECRET}`,
      },
    })
  );

  return response;
}