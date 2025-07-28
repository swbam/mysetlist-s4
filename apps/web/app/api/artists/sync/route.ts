import { db } from "@repo/database";
import { artists } from "@repo/database";
import { SpotifyClient, TicketmasterClient } from "@repo/external-apis";
import { eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { env } from "@repo/env";
import { createServiceClient } from "~/lib/supabase/server";

const spotify = new SpotifyClient({});

// Function to find Ticketmaster ID for an artist
async function findTicketmasterId(artistName: string): Promise<string | null> {
  try {
    if (!env["TICKETMASTER_API_KEY"]) {
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

export async function POST(request: NextRequest) {
  try {
    const { artistName, spotifyId, ticketmasterId } = await request.json();

    if (!artistName && !spotifyId) {
      return NextResponse.json(
        { error: "Either artistName or spotifyId is required" },
        { status: 400 },
      );
    }

    // Check if Spotify credentials are available
    if (
      !process.env["SPOTIFY_CLIENT_ID"] ||
      !process.env["SPOTIFY_CLIENT_SECRET"]
    ) {
      return NextResponse.json(
        { error: "Spotify credentials not configured" },
        { status: 500 },
      );
    }

    await spotify.authenticate();
    let spotifyArtist;

    if (spotifyId) {
      // Get artist by ID
      spotifyArtist = await spotify.getArtist(spotifyId);
    } else {
      // Search for artist by name
      const searchResults = await spotify.searchArtists(artistName, 1);
      if (!searchResults.artists?.items?.length) {
        return NextResponse.json(
          { error: "Artist not found on Spotify" },
          { status: 404 },
        );
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
          ticketmasterId:
            resolvedTicketmasterId || existingArtist[0]?.ticketmasterId,
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

    // Fire-and-forget background jobs
    try {
      const supabaseAdmin = createServiceClient();

      // Always sync song catalog
      if (artistRecord) {
        await supabaseAdmin.functions.invoke("sync-song-catalog", {
          body: { spotifyId: spotifyArtist.id, artistId: artistRecord.id },
        });

        // Sync shows if we have a Ticketmaster ID
        if (artistRecord.ticketmasterId) {
          await supabaseAdmin.functions.invoke("sync-artist-shows", {
            body: {
              ticketmasterId: artistRecord.ticketmasterId,
              artistId: artistRecord.id,
            },
          });
        }
      }
    } catch (_err) {}

    if (!artistRecord) {
      return NextResponse.json(
        {
          success: false,
          error: "Failed to create or update artist record",
          artist: null,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      slug: artistRecord.slug,
      artist: {
        id: artistRecord.id,
        name: artistRecord.name,
        slug: artistRecord.slug,
        spotifyId: artistRecord.spotifyId,
        ticketmasterId: artistRecord.ticketmasterId,
        imageUrl: artistRecord.imageUrl,
        genres: JSON.parse(artistRecord.genres || "[]"),
        popularity: artistRecord.popularity,
        followers: artistRecord.followers,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to sync artist",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

// GET endpoint to sync trending artists from Ticketmaster
export async function GET() {
  try {
    if (
      !process.env["SPOTIFY_CLIENT_ID"] ||
      !process.env["SPOTIFY_CLIENT_SECRET"]
    ) {
      return NextResponse.json(
        { error: "Spotify credentials not configured" },
        { status: 500 },
      );
    }

    if (!env["TICKETMASTER_API_KEY"]) {
      return NextResponse.json(
        { error: "Ticketmaster API key not configured" },
        { status: 500 },
      );
    }

    // Get trending artists from Ticketmaster with upcoming US shows
    const tmClient = new TicketmasterClient({});
    const artistMap = new Map<
      string,
      { name: string; ticketmasterId: string; showCount: number }
    >();

    try {
      // Fetch music events in the US
      const eventsResponse = await tmClient.searchEvents({
        countryCode: "US",
        classificationName: "Music",
        size: 200,
        sort: "relevance,desc",
        startDateTime: `${new Date().toISOString().split(".")[0]}Z`,
        endDateTime: `${
          new Date(Date.now() + 180 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split(".")[0]
        }Z`,
      });

      if (eventsResponse._embedded?.events) {
        for (const event of eventsResponse._embedded.events) {
          if (!event._embedded?.attractions) {
            continue;
          }

          for (const attraction of event._embedded.attractions) {
            if (attraction.type?.toLowerCase() !== "artist") {
              continue;
            }

            if (artistMap.has(attraction.id)) {
              artistMap.get(attraction.id)!.showCount++;
            } else {
              artistMap.set(attraction.id, {
                name: attraction.name,
                ticketmasterId: attraction.id,
                showCount: 1,
              });
            }
          }
        }
      }
    } catch (_tmError) {
      // Fall back to a smaller hardcoded list if Ticketmaster fails
      const fallbackArtists = [
        "Taylor Swift",
        "Drake",
        "The Weeknd",
        "Billie Eilish",
        "Post Malone",
      ];

      // Use fallback artists
      for (const name of fallbackArtists) {
        artistMap.set(name, {
          name,
          ticketmasterId: "",
          showCount: 1,
        });
      }
    }

    // Sort by show count and take top 10
    const trendingArtists = Array.from(artistMap.values())
      .sort((a, b) => b.showCount - a.showCount)
      .slice(0, 10);

    const syncedArtists: any[] = [];
    const errors: string[] = [];

    // Sync each trending artist
    for (const artist of trendingArtists) {
      try {
        const searchResults = await spotify.searchArtists(artist.name, 1);
        if (searchResults.artists?.items?.length > 0) {
          const spotifyArtist = searchResults.artists.items[0];
          if (spotifyArtist) {
            // Sync this artist with both Spotify and Ticketmaster IDs
            const syncResponse = await fetch(
              `${env["NEXT_PUBLIC_APP_URL"]}/api/artists/sync`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  spotifyId: spotifyArtist.id,
                  artistName: artist.name,
                }),
              },
            );

            if (syncResponse.ok) {
              const result = await syncResponse.json();
              syncedArtists.push({
                ...result.artist,
                showCount: artist.showCount,
              });
            } else {
              errors.push(`Failed to sync ${artist.name}`);
            }
          }
        } else {
          errors.push(`${artist.name} not found on Spotify`);
        }

        // Add delay to respect rate limits
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (error) {
        errors.push(
          `Error syncing ${artist.name}: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
      }
    }

    return NextResponse.json({
      success: true,
      syncedCount: syncedArtists.length,
      totalAttempted: trendingArtists.length,
      trendingArtists: syncedArtists.map((a: any) => ({
        name: a.name,
        spotifyId: a.spotifyId,
        ticketmasterId: a.ticketmasterId,
        upcomingShows: a.showCount,
      })),
      errors,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Bulk sync failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
