// @ts-nocheck
import { db } from "@repo/database";
import { shows, venues, artists } from "@repo/database";
import { TicketmasterClient } from "../../clients/ticketmaster";
import { eq } from "drizzle-orm";
import type { TicketmasterEvent, TicketmasterVenue } from "../../types/ticketmaster";

export async function ingestShowsAndVenues(artistId: string, tmAttractionId: string) {
  const ticketmasterClient = new TicketmasterClient({
    apiKey: process.env['TICKETMASTER_API_KEY']!,
  });

  let page = 0;
  let totalPages = 1;

  while (page < totalPages) {
    const response = await ticketmasterClient.searchEvents({
      attractionId: tmAttractionId,
      page,
    } as any);

    const events = response._embedded?.events || [];
    totalPages = response.page?.totalPages || 0;

    if (events.length === 0) {
      break;
    }

    const venuesMap = new Map<string, TicketmasterVenue>();
    for (const event of events) {
      const venue = event._embedded?.venues?.[0];
      if (venue?.id) {
        venuesMap.set(venue.id, venue);
      }
    }

    if (venuesMap.size > 0) {
      const venueTmids = Array.from(venuesMap.keys());
      const existingVenues = await db.query.venues.findMany({
        where: (venues, { inArray }) => inArray(venues.tmVenueId, venueTmids),
      });

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
        await db.insert(venues).values(newVenues as any);
      }
    }

    const dbVenues = await db.query.venues.findMany({
      where: (venues, { inArray }) => inArray(venues.tmVenueId, Array.from(venuesMap.keys())),
    });
    const venueIdMap = new Map(dbVenues.map((v) => [v.tmVenueId, v.id]));

    const showTmIds = events.map((e) => e.id);
    const existingShows = await db.query.shows.findMany({
        where: (shows, { inArray }) => inArray(shows.tmEventId, showTmIds),
    });
    const existingShowIds = new Set(existingShows.map((s) => s.tmEventId));

    const newShows = events
      .filter((event) => !existingShowIds.has(event.id))
      .map((event) => {
        const venueId = event._embedded?.venues?.[0]?.id ? venueIdMap.get(event._embedded.venues[0].id) : undefined;
        if (!venueId) return null;
        return {
          tmEventId: event.id,
          headlinerArtistId: artistId,
          venueId: venueId,
          name: event.name,
          slug: generateSlug(event.name),
          date: new Date(event.dates.start.localDate),
          startTime: event.dates.start.localTime,
          status: mapEventStatus(event.dates.status.code),
          ticketUrl: event.url,
        };
      })
      .filter(Boolean);

    if (newShows.length > 0) {
      await db.insert(shows).values(newShows as any[]);
    }

    page++;
  }
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
