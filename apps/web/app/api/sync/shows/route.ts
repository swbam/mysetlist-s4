import { db } from "@repo/database";
import { artists, showArtists, shows, venues } from "@repo/database";
import { TicketmasterClient } from "@repo/external-apis";
import { and, desc, eq, gte } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";

// POST /api/sync/shows
// Body: { artistId: string, ticketmasterId?: string }
// Syncs all shows for a given artist
export async function POST(request: NextRequest) {
  try {
    const { artistId, ticketmasterId } = await request.json();

    if (!artistId) {
      return NextResponse.json(
        { error: "Artist ID required" },
        { status: 400 },
      );
    }

    // Verify artist exists
    const artist = await db
      .select()
      .from(artists)
      .where(eq(artists.id, artistId))
      .limit(1);

    if (!artist.length) {
      return NextResponse.json({ error: "Artist not found" }, { status: 404 });
    }

    const artistData = artist[0];
    if (!artistData) {
      return NextResponse.json(
        { error: "Artist data not found" },
        { status: 404 },
      );
    }

    // Check if sync is needed (last synced < 4 hours ago)
    const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000);
    const needsSync =
      !artistData.lastSyncedAt ||
      new Date(artistData.lastSyncedAt) < fourHoursAgo;

    // Check for existing shows
    const existingShows = await db
      .select()
      .from(shows)
      .where(
        and(
          eq(shows.headlinerArtistId, artistId),
          gte(shows.date, new Date().toISOString().split("T")[0]!),
        ),
      )
      .orderBy(desc(shows.date));

    // If artist was recently synced and has shows, return cached results
    if (!needsSync && existingShows.length > 0) {
      return NextResponse.json({
        success: true,
        message: "Using cached shows (synced recently)",
        artist: artistData,
        showsCount: existingShows.length,
        shows: existingShows,
        cached: true,
      });
    }

    const tmId = ticketmasterId || artistData?.ticketmasterId;

    if (!tmId) {
      // No Ticketmaster ID - return empty results, no fake data
      return NextResponse.json({
        success: true,
        message: "No Ticketmaster ID available for artist",
        artist: artistData,
        showsCount: 0,
        shows: [],
      });
    }

    // Sync with Ticketmaster API
    try {
      console.log(
        `[Shows Sync] Fetching shows for artist ${artistData.name} (${tmId})`,
      );

      // Create Ticketmaster client
      const ticketmaster = new TicketmasterClient({
        apiKey: process.env.TICKETMASTER_API_KEY!
      });
      
      // Fetch shows from Ticketmaster API
      const searchResult = await ticketmaster.searchEvents({
        keyword: tmId,
        size: 50,
        sort: "date,asc",
        classificationName: "Music",
      });

      const tmShows = searchResult._embedded?.events || [];

      if (tmShows.length === 0) {
        return NextResponse.json({
          success: true,
          message: "No upcoming shows found on Ticketmaster",
          artist: artistData,
          showsCount: 0,
          shows: [],
        });
      }

      const syncedShows: any[] = [];

      for (const tmShow of tmShows) {
        // Check if show already exists
        const existingShow = await db
          .select()
          .from(shows)
          .where(eq(shows.ticketmasterId, tmShow.id))
          .limit(1);

        if (existingShow.length > 0) {
          syncedShows.push(existingShow[0]);
          continue;
        }

        // Get or create venue
        let venueId: string | null = null;
        if (tmShow._embedded?.venues?.[0]) {
          const tmVenue = tmShow._embedded.venues[0];
          venueId = await getOrCreateVenue(tmVenue);
        }

        // Create show
        const showData = {
          ticketmasterId: tmShow.id,
          headlinerArtistId: artistId,
          venueId,
          name: tmShow.name,
          slug: generateSlug(tmShow.name),
          date: tmShow.dates.start.localDate,
          startTime: tmShow.dates.start.localTime || "20:00",
          doorsTime: "19:00", // Default doors time (Ticketmaster API doesn't provide this)
          status: mapTicketmasterStatus(tmShow.dates.status?.code),
          description: null, // Ticketmaster API doesn't provide description in event data
          ticketUrl: tmShow.url,
          minPrice: tmShow.priceRanges?.[0]?.min || null,
          maxPrice: tmShow.priceRanges?.[0]?.max || null,
          currency: tmShow.priceRanges?.[0]?.currency || "USD",
          imageUrl: tmShow.images?.[0]?.url || null,
          seatmapUrl: null, // Ticketmaster API doesn't provide seatmap in event data
        };

        const [insertedShow] = await db
          .insert(shows)
          .values(showData as any)
          .returning();

        if (insertedShow) {
          // Create show-artist relationship
          await db.insert(showArtists).values({
            showId: insertedShow.id,
            artistId: artistId,
            orderIndex: 0,
            setLength: 90,
            isHeadliner: true,
          });

          syncedShows.push(insertedShow);
        }
      }

      // Update artist's last sync timestamp
      await db
        .update(artists)
        .set({
          updatedAt: new Date(),
          lastSyncedAt: new Date(),
        })
        .where(eq(artists.id, artistId));

      return NextResponse.json({
        success: true,
        message: "Shows sync completed",
        artist: artistData,
        showsCount: syncedShows.length,
        shows: syncedShows,
      });
    } catch (apiError) {
      console.error("[Shows Sync] Ticketmaster API error:", apiError);

      // API error - return empty results, no fake data
      return NextResponse.json({
        success: false,
        message: "Ticketmaster API error occurred",
        artist: artistData,
        showsCount: 0,
        shows: [],
        error: apiError instanceof Error ? apiError.message : "Unknown API error",
      });
    }
  } catch (error) {
    console.error("[Shows Sync] Unexpected error:", error);
    return NextResponse.json(
      {
        error: "Failed to sync shows",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

// Helper function to get or create venue
async function getOrCreateVenue(tmVenue: any): Promise<string> {
  if (!tmVenue) {
    // Return default venue
    let defaultVenue = await db
      .select()
      .from(venues)
      .where(eq(venues.name, "TBA Venue"))
      .limit(1);

    if (!defaultVenue.length) {
      const [newVenue] = await db
        .insert(venues)
        .values({
          name: "TBA Venue",
          slug: "tba-venue",
          city: "TBA",
          country: "United States",
          timezone: "America/New_York",
        } as any)
        .returning();

      if (!newVenue) {
        throw new Error("Failed to create default venue");
      }

      return newVenue.id;
    }

    return defaultVenue[0]!.id;
  }

  // Check if venue exists by slug
  const venueSlug = generateSlug(tmVenue.name);
  const existingVenue = await db
    .select()
    .from(venues)
    .where(eq(venues.slug, venueSlug))
    .limit(1);

  if (existingVenue.length > 0) {
    return existingVenue[0]!.id;
  }

  // Create venue
  const [newVenue] = await db
    .insert(venues)
    .values({
      name: tmVenue.name,
      slug: generateSlug(tmVenue.name),
      address: tmVenue.address?.line1 || null,
      city: tmVenue.city?.name || "Unknown",
      state: tmVenue.state?.stateCode || null,
      country: tmVenue.country?.name || "Unknown",
      postalCode: tmVenue.postalCode || null,
      latitude: tmVenue.location?.latitude
        ? parseFloat(tmVenue.location.latitude)
        : null,
      longitude: tmVenue.location?.longitude
        ? parseFloat(tmVenue.location.longitude)
        : null,
      timezone: tmVenue.timezone || "America/New_York",
      website: tmVenue.url || null,
    } as any)
    .returning();

  if (!newVenue) {
    throw new Error("Failed to create venue");
  }

  return newVenue.id;
}

// Helper function to generate slug
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .substring(0, 100);
}

// Helper function to map Ticketmaster status
function mapTicketmasterStatus(
  tmStatus?: string,
): "upcoming" | "cancelled" | "postponed" | "completed" {
  switch (tmStatus) {
    case "onsale":
    case "offsale":
      return "upcoming";
    case "cancelled":
      return "cancelled";
    case "postponed":
      return "postponed";
    default:
      return "upcoming";
  }
}

