import { db, shows, venues } from "@repo/database";
import { eq, inArray } from "drizzle-orm";
import { TicketmasterClient } from "../../clients/ticketmaster";

// Async generator function as specified in GROK.md
async function* iterateEventsByAttraction(attractionId: string, apiKey: string) {
  let page = 0;
  let totalPages = 1;
  
  while (page < totalPages) {
    const url = `https://app.ticketmaster.com/discovery/v2/events.json?attractionId=${encodeURIComponent(attractionId)}&size=200&page=${page}&apikey=${apiKey}`;
    
    try {
      const response = await fetch(url);
      if (!response.ok) {
        console.error(`Ticketmaster API error: ${response.status} ${response.statusText}`);
        break;
      }
      
      const data = await response.json() as any;
      totalPages = data?.page?.totalPages ?? 0;
      const events = data?._embedded?.events ?? [];
      
      if (events.length > 0) {
        yield events;
      }
      
      page++;
      
      // Add small delay to respect rate limits
      if (page < totalPages) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    } catch (error) {
      console.error(`Error fetching events page ${page}:`, error);
      break;
    }
  }
}

export async function ingestShowsAndVenues(artistId: string, tmAttractionId: string) {
  const apiKey = process.env['TICKETMASTER_API_KEY'];
  if (!apiKey) {
    throw new Error('TICKETMASTER_API_KEY not configured');
  }

  console.log(`Starting Ticketmaster ingest for artist ${artistId}, attraction ${tmAttractionId}`);

  try {
    for await (const events of iterateEventsByAttraction(tmAttractionId, apiKey)) {
      console.log(`Processing ${events.length} events from Ticketmaster`);
      
      // Extract unique venues from events
      const venuesMap = new Map<string, any>();
      for (const event of events) {
        const venue = event._embedded?.venues?.[0];
        if (venue?.id) {
          venuesMap.set(venue.id, venue);
        }
      }

      // Process venues and shows for this batch
      await processEventBatch(events, venuesMap, artistId);
    }
    
    console.log(`Completed Ticketmaster ingest for artist ${artistId}`);
  } catch (error) {
    console.error(`Ticketmaster ingest failed for artist ${artistId}:`, error);
    throw error;
  }
}

async function processEventBatch(events: any[], venuesMap: Map<string, any>, artistId: string) {
  // Use Drizzle transaction for atomic operations
  await db.transaction(async (tx) => {
    // Process venues first
    if (venuesMap.size > 0) {
      const venueTmids = Array.from(venuesMap.keys());
      const existingVenues = await tx.select().from(venues)
        .where(inArray(venues.tmVenueId, venueTmids));

      const existingVenueIds = new Set(existingVenues.map((v) => v.tmVenueId));
      const newVenues = venueTmids
        .filter((id) => !existingVenueIds.has(id))
        .map((id) => venuesMap.get(id)!)
        .map((venue) => ({
          tmVenueId: venue.id,
          name: venue.name,
          slug: generateSlug(venue.name),
          address: venue.address?.line1,
          city: venue.city?.name ?? "Unknown",
          state: venue.state?.stateCode,
          country: venue.country?.countryCode ?? "Unknown",
          postalCode: venue.postalCode,
          latitude: venue.location ? parseFloat(venue.location.latitude) : undefined,
          longitude: venue.location ? parseFloat(venue.location.longitude) : undefined,
          timezone: venue.timezone ?? "UTC",
        }));

      if (newVenues.length > 0) {
        await tx.insert(venues).values(newVenues as any);
        console.log(`Inserted ${newVenues.length} new venues`);
      }
    }

    // Get venue ID mapping for shows (within transaction)
    const dbVenues = await tx.select().from(venues)
      .where(inArray(venues.tmVenueId, Array.from(venuesMap.keys())));
    const venueIdMap = new Map(dbVenues.map((v) => [v.tmVenueId, v.id]));

    // Process shows (within transaction)
    const showTmIds = events.map((e) => e.id);
    const existingShows = await tx.select().from(shows)
        .where(inArray(shows.tmEventId, showTmIds));
    const existingShowIds = new Set(existingShows.map((s) => s.tmEventId));

    const newShows = events
      .filter((event) => !existingShowIds.has(event.id))
      .map((event) => {
        const venueId = event._embedded?.venues?.[0]?.id ? venueIdMap.get(event._embedded.venues[0].id) : undefined;
        if (!venueId) return null;
        
        const eventDate = event.dates?.start?.dateTime || event.dates?.start?.localDate;
        if (!eventDate) return null;
        
        return {
          tmEventId: event.id,
          headlinerArtistId: artistId,
          venueId: venueId,
          name: event.name,
          slug: generateSlug(event.name + '-' + eventDate),
          date: new Date(eventDate).toISOString().split('T')[0],
          startTime: event.dates?.start?.localTime,
          status: mapEventStatus(event.dates?.status?.code || 'onsale'),
          ticketUrl: event.url,
        };
      })
      .filter(Boolean);

    if (newShows.length > 0) {
      await tx.insert(shows).values(newShows as any[]);
      console.log(`Inserted ${newShows.length} new shows`);
    }
  }); // Close transaction
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function mapEventStatus(statusCode: string): "upcoming" | "cancelled" | "completed" {
  switch (statusCode) {
    case "onsale":
    case "offsale":
      return "upcoming";
    case "cancelled":
      return "cancelled";
    default:
      return "upcoming";
  }
}
