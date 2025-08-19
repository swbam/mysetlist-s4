import { venues, db } from "@repo/database";
import { SetlistFmClient } from "../clients/setlistfm";
import { TicketmasterClient } from "../clients/ticketmaster";
import { SetlistFmVenue } from "../types/setlistfm";
import { TicketmasterVenue } from "../types/ticketmaster";

export class VenueSyncService {
  private ticketmasterClient: TicketmasterClient;
  private setlistFmClient: SetlistFmClient;

  constructor() {
    this.ticketmasterClient = new TicketmasterClient({
      apiKey: process.env["TICKETMASTER_API_KEY"] || "",
    });
    this.setlistFmClient = new SetlistFmClient({
      apiKey: process.env["SETLISTFM_API_KEY"] || "",
    });
  }

  async syncVenueFromTicketmaster(
    ticketmasterVenue: TicketmasterVenue,
  ): Promise<void> {
    await db
      .insert(venues)
      .values({
        name: ticketmasterVenue.name,
        slug: this.generateSlug(ticketmasterVenue.name),
        address: ticketmasterVenue.address?.line1 ?? null,
        city: ticketmasterVenue.city?.name || "",
        state: ticketmasterVenue.state?.stateCode ?? null,
        country: ticketmasterVenue.country?.countryCode || "",
        postalCode: ticketmasterVenue.postalCode ?? null,
        latitude: ticketmasterVenue.location?.latitude
          ? Number.parseFloat(ticketmasterVenue.location.latitude)
          : null,
        longitude: ticketmasterVenue.location?.longitude
          ? Number.parseFloat(ticketmasterVenue.location.longitude)
          : null,
        timezone: ticketmasterVenue.timezone || "America/New_York",
        capacity: ticketmasterVenue.capacity ?? null,
        tmVenueId: ticketmasterVenue.id,
      })
      .onConflictDoUpdate({
        target: venues.slug,
        set: {
          address: ticketmasterVenue.address?.line1 ?? null,
          city: ticketmasterVenue.city?.name || "",
          state: ticketmasterVenue.state?.stateCode ?? null,
          country: ticketmasterVenue.country?.countryCode || "",
          postalCode: ticketmasterVenue.postalCode ?? null,
          latitude: ticketmasterVenue.location?.latitude
            ? Number.parseFloat(ticketmasterVenue.location.latitude)
            : null,
          longitude: ticketmasterVenue.location?.longitude
            ? Number.parseFloat(ticketmasterVenue.location.longitude)
            : null,
          capacity: ticketmasterVenue.capacity ?? null,
          updatedAt: new Date(),
        },
      });
  }

  async syncVenueFromSetlistFm(setlistFmVenue: SetlistFmVenue): Promise<void> {
    await db
      .insert(venues)
      .values({
        name: setlistFmVenue.name,
        slug: this.generateSlug(setlistFmVenue.name),
        city: setlistFmVenue.city.name,
        state: setlistFmVenue.city.stateCode ?? null,
        country: setlistFmVenue.city.country.code,
        latitude: setlistFmVenue.city.coords?.lat,
        longitude: setlistFmVenue.city.coords?.long,
        timezone: this.getTimezone(
          setlistFmVenue.city.country.code,
          setlistFmVenue.city.stateCode,
        ),
      })
      .onConflictDoUpdate({
        target: venues.slug,
        set: {
          city: setlistFmVenue.city.name,
          state: setlistFmVenue.city.stateCode ?? null,
          country: setlistFmVenue.city.country.code,
          latitude: setlistFmVenue.city.coords?.lat,
          longitude: setlistFmVenue.city.coords?.long,
          updatedAt: new Date(),
        },
      });
  }

  /**
   * Unified venue sync method that handles different venue data sources
   * Accepts data from Ticketmaster, Setlist.fm, or other sources
   */
  async syncVenue(venueData: any): Promise<void> {
    // Detect data source and delegate to appropriate method
    if (venueData.id && venueData.city && venueData.country) {
      // Looks like Ticketmaster venue data
      if (venueData.timezone || venueData.location || venueData.address) {
        await this.syncVenueFromTicketmaster(venueData as TicketmasterVenue);
        return;
      }
    }

    if (venueData.city?.name && venueData.city?.country?.name) {
      // Looks like Setlist.fm venue data
      await this.syncVenueFromSetlistFm(venueData as SetlistFmVenue);
      return;
    }

    // Fallback: treat as generic venue data and create basic record
    await this.syncGenericVenue(venueData);
  }

  /**
   * Handle generic venue data that doesn't match specific API formats
   */
  private async syncGenericVenue(venueData: any): Promise<void> {
    const slug = this.generateSlug(venueData.name || "unknown-venue");

    await db
      .insert(venues)
      .values({
        name: venueData.name || "Unknown Venue",
        slug,
        city: venueData.city || "Unknown",
        state: venueData.state || null,
        country: venueData.country || "US",
        address: venueData.address || null,
        latitude: venueData.latitude
          ? Number.parseFloat(venueData.latitude.toString())
          : null,
        longitude: venueData.longitude
          ? Number.parseFloat(venueData.longitude.toString())
          : null,
        timezone: venueData.timezone || "America/New_York",
        capacity: venueData.capacity
          ? Number.parseInt(venueData.capacity.toString())
          : null,
        venueType: venueData.type || venueData.venueType || null,
        imageUrl: venueData.imageUrl || null,
        website: venueData.website || null,
        phoneNumber: venueData.phoneNumber || null,
      })
      .onConflictDoUpdate({
        target: venues.slug,
        set: {
          name: venueData.name || "Unknown Venue",
          city: venueData.city || "Unknown",
          state: venueData.state || null,
          country: venueData.country || "US",
          updatedAt: new Date(),
        },
      });
  }

  async syncVenuesByCity(
    city: string,
    stateCode?: string,
    countryCode = "US",
  ): Promise<void> {
    // Sync from Ticketmaster
    const ticketmasterResult = await this.ticketmasterClient.searchVenues({
      city,
      ...(stateCode && { stateCode }),
      countryCode,
      size: 50,
    });

    if (ticketmasterResult._embedded?.venues) {
      for (const venue of ticketmasterResult._embedded.venues) {
        await this.syncVenueFromTicketmaster(venue);
      }
    }

    // Sync from Setlist.fm
    const setlistFmResult = await this.setlistFmClient.searchSetlists({
      cityName: city,
    });

    if (setlistFmResult.setlist) {
      for (const setlist of setlistFmResult.setlist) {
        await this.syncVenueFromSetlistFm(setlist.venue);
      }
    }
  }

  async syncMajorVenues(): Promise<void> {
    const majorCities = [
      { city: "New York", stateCode: "NY" },
      { city: "Los Angeles", stateCode: "CA" },
      { city: "Chicago", stateCode: "IL" },
      { city: "Houston", stateCode: "TX" },
      { city: "Phoenix", stateCode: "AZ" },
      { city: "Philadelphia", stateCode: "PA" },
      { city: "San Antonio", stateCode: "TX" },
      { city: "San Diego", stateCode: "CA" },
      { city: "Dallas", stateCode: "TX" },
      { city: "San Jose", stateCode: "CA" },
      { city: "Austin", stateCode: "TX" },
      { city: "Jacksonville", stateCode: "FL" },
      { city: "San Francisco", stateCode: "CA" },
      { city: "Indianapolis", stateCode: "IN" },
      { city: "Columbus", stateCode: "OH" },
      { city: "Fort Worth", stateCode: "TX" },
      { city: "Charlotte", stateCode: "NC" },
      { city: "Detroit", stateCode: "MI" },
      { city: "Seattle", stateCode: "WA" },
      { city: "Denver", stateCode: "CO" },
      { city: "Washington", stateCode: "DC" },
      { city: "Boston", stateCode: "MA" },
      { city: "El Paso", stateCode: "TX" },
      { city: "Nashville", stateCode: "TN" },
      { city: "Portland", stateCode: "OR" },
      { city: "Las Vegas", stateCode: "NV" },
      { city: "Memphis", stateCode: "TN" },
      { city: "Louisville", stateCode: "KY" },
      { city: "Baltimore", stateCode: "MD" },
      { city: "Milwaukee", stateCode: "WI" },
      { city: "Atlanta", stateCode: "GA" },
      { city: "Miami", stateCode: "FL" },
    ];

    for (const { city, stateCode } of majorCities) {
      try {
        await this.syncVenuesByCity(city, stateCode);
        // Rate limit between cities
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (_error) {}
    }
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }

  private getTimezone(countryCode: string, stateCode?: string): string {
    // Simple timezone mapping - in production, use a proper timezone library
    const timezoneMap: Record<string, string> = {
      "US-NY": "America/New_York",
      "US-CA": "America/Los_Angeles",
      "US-IL": "America/Chicago",
      "US-TX": "America/Chicago",
      "US-AZ": "America/Phoenix",
      "US-CO": "America/Denver",
      "US-WA": "America/Los_Angeles",
      "US-OR": "America/Los_Angeles",
      "US-NV": "America/Los_Angeles",
      "US-FL": "America/New_York",
      "US-GA": "America/New_York",
      "US-MA": "America/New_York",
      "US-DC": "America/New_York",
      "US-PA": "America/New_York",
      "US-OH": "America/New_York",
      "US-MI": "America/Detroit",
      "US-IN": "America/Indiana/Indianapolis",
      "US-NC": "America/New_York",
      "US-TN": "America/Chicago",
      "US-KY": "America/New_York",
      "US-MD": "America/New_York",
      "US-WI": "America/Chicago",
    };

    const key = stateCode ? `${countryCode}-${stateCode}` : countryCode;
    return timezoneMap[key] || "America/New_York";
  }
}
