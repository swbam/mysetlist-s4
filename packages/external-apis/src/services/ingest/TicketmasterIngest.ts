import { db, shows, venues } from "@repo/database";
import { TicketmasterClient } from "../../clients/ticketmaster";
import { TicketmasterEvent, TicketmasterVenue } from "../../types/ticketmaster";
import { inArray } from "drizzle-orm";

export class TicketmasterIngestService {
  private ticketmasterClient: TicketmasterClient;

  constructor() {
    this.ticketmasterClient = new TicketmasterClient({
      apiKey: process.env["TICKETMASTER_API_KEY"]!,
    });
  }

  async ingestShowsAndVenues(artistId: string, tmAttractionId: string) {
    for await (const events of this.iterateEventsByAttraction(tmAttractionId)) {
      if (!events || events.length === 0) continue;

      const venuesMap = new Map<string, TicketmasterVenue>();
      for (const ev of events) {
        const v = ev?._embedded?.venues?.[0];
        if (v?.id) venuesMap.set(v.id, v);
      }

      if (venuesMap.size === 0) continue;

      await db.transaction(async (tx) => {
        const venueTmIds = Array.from(venuesMap.keys());
        const mappedVenues = Array.from(venuesMap.values()).map((v) => this.mapVenue(v));

        if (mappedVenues.length > 0) {
          await tx.insert(venues).values(mappedVenues).onConflictDoUpdate({
            target: venues.tmVenueId,
            set: {
              name: mappedVenues[0].name,
              slug: mappedVenues[0].slug,
              address: mappedVenues[0].address,
              city: mappedVenues[0].city,
              state: mappedVenues[0].state,
              country: mappedVenues[0].country,
              postalCode: mappedVenues[0].postalCode,
              latitude: mappedVenues[0].latitude,
              longitude: mappedVenues[0].longitude,
              timezone: mappedVenues[0].timezone,
              capacity: mappedVenues[0].capacity,
              website: mappedVenues[0].website,
              updatedAt: new Date(),
            },
          });
        }

        const dbVenues = await tx
          .select()
          .from(venues)
          .where(inArray(venues.tmVenueId, venueTmIds));
        const vmap = new Map(dbVenues.map((v) => [v.tmVenueId!, v.id]));

        const showsToInsert = events
          .map((ev) => {
            const tmVenue = ev?._embedded?.venues?.[0];
            const venueId = tmVenue?.id ? vmap.get(tmVenue.id) : undefined;
            if (!ev.id || !venueId || !ev.dates?.start?.localDate) return null;
            return this.mapShow(ev, artistId, venueId);
          })
          .filter((s): s is NonNullable<typeof s> => s !== null);

        if (showsToInsert.length > 0) {
          await tx.insert(shows).values(showsToInsert).onConflictDoUpdate({
            target: shows.tmEventId,
            set: {
              name: showsToInsert[0].name,
              slug: showsToInsert[0].slug,
              date: showsToInsert[0].date,
              startTime: showsToInsert[0].startTime,
              status: showsToInsert[0].status,
              ticketUrl: showsToInsert[0].ticketUrl,
              minPrice: showsToInsert[0].minPrice,
              maxPrice: showsToInsert[0].maxPrice,
              currency: showsToInsert[0].currency,
              updatedAt: new Date(),
            },
          });
        }
      });
    }
  }

  private async *iterateEventsByAttraction(attractionId: string) {
    let page = 0;
    let totalPages = 1;
    while (page < totalPages) {
      const data = await this.ticketmasterClient.searchEvents({
        keyword: attractionId,
        size: 200,
        page,
      });
      totalPages = data?.page?.totalPages ?? 0;
      yield data?._embedded?.events ?? [];
      page++;
    }
  }

  private mapVenue(tmVenue: TicketmasterVenue) {
    return {
      tmVenueId: tmVenue.id,
      name: tmVenue.name,
      slug: this.generateSlug(tmVenue.name),
      address: tmVenue.address?.line1 ?? null,
      city: tmVenue.city?.name ?? "",
      state: tmVenue.state?.stateCode ?? null,
      country: tmVenue.country?.countryCode ?? "",
      postalCode: tmVenue.postalCode,
      latitude: tmVenue.location?.latitude
        ? parseFloat(tmVenue.location.latitude)
        : null,
      longitude: tmVenue.location?.longitude
        ? parseFloat(tmVenue.location.longitude)
        : null,
      timezone: tmVenue.timezone ?? "",
      capacity: tmVenue.capacity ?? null,
      website: tmVenue.url ?? null,
    };
  }

  private mapShow(tmEvent: TicketmasterEvent, artistId: string, venueId: string) {
    return {
      tmEventId: tmEvent.id,
      headlinerArtistId: artistId,
      venueId: venueId,
      name: tmEvent.name,
      slug: this.generateSlug(tmEvent.name),
      date: new Date(tmEvent.dates.start.localDate).toISOString(),
      startTime: tmEvent.dates.start.localTime ?? null,
      status: this.mapEventStatus(tmEvent.dates.status.code),
      ticketUrl: tmEvent.url,
      minPrice: tmEvent.priceRanges?.[0]?.min ?? null,
      maxPrice: tmEvent.priceRanges?.[0]?.max ?? null,
      currency: tmEvent.priceRanges?.[0]?.currency || "USD",
    };
  }

  private mapEventStatus(
    statusCode: string,
  ): "upcoming" | "cancelled" | "completed" {
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

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }
}
