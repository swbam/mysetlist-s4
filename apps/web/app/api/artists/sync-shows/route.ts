import { db } from "@repo/database";
import { artists, showArtists, shows, venues } from "@repo/database";
import { TicketmasterClient } from "@repo/external-apis";
import { eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const { artistId } = await request.json();

    if (!artistId) {
      return NextResponse.json(
        { error: "artistId is required" },
        { status: 400 },
      );
    }

    // Get artist from database
    const [artist] = await db
      .select()
      .from(artists)
      .where(eq(artists.id, artistId as string))
      .limit(1);

    if (!artist) {
      return NextResponse.json({ error: "Artist not found" }, { status: 404 });
    }

    // If no Ticketmaster ID, return empty results
    if (!artist.ticketmasterId) {
      return NextResponse.json({
        success: true,
        message: "No Ticketmaster ID available for artist",
        showsCount: 0,
        shows: [],
      });
    }

    try {
      // Initialize Ticketmaster client and fetch shows
      const ticketmasterClient = new TicketmasterClient({
        apiKey: process.env.TICKETMASTER_API_KEY!,
      });

      // Search for events by artist name since attractionId isn't a parameter
      const tmShows = await ticketmasterClient.searchEvents({
        keyword: artist.name,
        classificationName: "Music",
        size: 50,
        sort: "date,asc",
      });

      if (
        !tmShows ||
        !tmShows._embedded?.events ||
        tmShows._embedded.events.length === 0
      ) {
        return NextResponse.json({
          success: true,
          message: "No upcoming shows found on Ticketmaster",
          showsCount: 0,
          shows: [],
        });
      }

      const syncedShows: any[] = [];

      for (const tmShow of tmShows._embedded.events) {
        // Check if show already exists
        const existingShow = await db
          .select()
          .from(shows)
          .where(eq(shows.ticketmasterId, tmShow.id))
          .limit(1);

        if (existingShow.length > 0 && existingShow[0]) {
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
          doorsTime: null, // Ticketmaster doesn't provide door times in the dates object
          status: mapTicketmasterStatus(tmShow.dates.status?.code),
          description: null, // Ticketmaster doesn't provide event description in the base event object
          ticketUrl: tmShow.url,
          minPrice: tmShow.priceRanges?.[0]?.min || null,
          maxPrice: tmShow.priceRanges?.[0]?.max || null,
          currency: tmShow.priceRanges?.[0]?.currency || "USD",
          imageUrl: tmShow.images?.[0]?.url || null,
          seatmapUrl: null, // Ticketmaster doesn't provide seatmap in the base event object
        };

        const insertResult = await db
          .insert(shows)
          .values(showData as any)
          .returning();

        const insertedShow = insertResult[0];

        if (!insertedShow) {
          console.error("Failed to insert show");
          continue;
        }

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
        showsCount: syncedShows.length,
        shows: syncedShows,
      });
    } catch (apiError) {
      console.error("Ticketmaster API error:", apiError);
      // API error - return empty results, no fake data
      return NextResponse.json({
        success: false,
        message: "Ticketmaster API error occurred",
        showsCount: 0,
        shows: [],
        error: apiError instanceof Error ? apiError.message : "Unknown API error",
      });
    }
  } catch (error) {
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
  // Check if venue exists by name and city (since ticketmasterId might not exist in schema)
  const existingVenue = await db
    .select()
    .from(venues)
    .where(eq(venues.name, tmVenue.name))
    .limit(1);

  if (existingVenue.length > 0 && existingVenue[0]) {
    return existingVenue[0].id;
  }

  // Create venue
  const insertResult = await db
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
      timezone: tmVenue.timezone || null,
      website: tmVenue.url || null,
      parkingInfo: tmVenue.parkingDetail || null,
      accessibilityInfo: tmVenue.accessibleSeatingDetail || null,
      generalRules: tmVenue.generalInfo?.generalRule || null,
      childRules: tmVenue.generalInfo?.childRule || null,
    } as any)
    .returning();

  const newVenue = insertResult[0];

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

