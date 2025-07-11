import { db, venues } from '@repo/database';
import { SetlistFmClient, type SetlistFmVenue } from '../clients/setlistfm';
import {
  TicketmasterClient,
  type TicketmasterVenue,
} from '../clients/ticketmaster';

export class VenueSyncService {
  private ticketmasterClient: TicketmasterClient;
  private setlistFmClient: SetlistFmClient;

  constructor() {
    this.ticketmasterClient = new TicketmasterClient({});
    this.setlistFmClient = new SetlistFmClient({});
  }

  async syncVenueFromTicketmaster(
    ticketmasterVenue: TicketmasterVenue
  ): Promise<void> {
    await db
      .insert(venues)
      .values({
        name: ticketmasterVenue.name,
        slug: this.generateSlug(ticketmasterVenue.name),
        address: ticketmasterVenue.address?.line1,
        city: ticketmasterVenue.city?.name || '',
        state: ticketmasterVenue.state?.name,
        country: ticketmasterVenue.country?.name || '',
        postalCode: ticketmasterVenue.postalCode,
        latitude: ticketmasterVenue.location?.latitude
          ? Number.parseFloat(ticketmasterVenue.location.latitude)
          : null,
        longitude: ticketmasterVenue.location?.longitude
          ? Number.parseFloat(ticketmasterVenue.location.longitude)
          : null,
        timezone: ticketmasterVenue.timezone || 'America/New_York',
        capacity: ticketmasterVenue.capacity,
        venueType: ticketmasterVenue.type,
        imageUrl: ticketmasterVenue.images?.[0]?.url,
        amenities: JSON.stringify(ticketmasterVenue.generalInfo || {}),
      })
      .onConflictDoUpdate({
        target: venues.slug,
        set: {
          address: ticketmasterVenue.address?.line1 ?? null,
          city: ticketmasterVenue.city?.name || '',
          state: ticketmasterVenue.state?.name ?? null,
          country: ticketmasterVenue.country?.name || '',
          postalCode: ticketmasterVenue.postalCode ?? null,
          latitude: ticketmasterVenue.location?.latitude
            ? Number.parseFloat(ticketmasterVenue.location.latitude)
            : null,
          longitude: ticketmasterVenue.location?.longitude
            ? Number.parseFloat(ticketmasterVenue.location.longitude)
            : null,
          capacity: ticketmasterVenue.capacity,
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
        state: setlistFmVenue.city.state ?? null,
        country: setlistFmVenue.city.country.name,
        latitude: setlistFmVenue.city.coords.lat,
        longitude: setlistFmVenue.city.coords.long,
        timezone: this.getTimezone(
          setlistFmVenue.city.country.code,
          setlistFmVenue.city.stateCode
        ),
      })
      .onConflictDoUpdate({
        target: venues.slug,
        set: {
          city: setlistFmVenue.city.name,
          state: setlistFmVenue.city.state ?? null,
          country: setlistFmVenue.city.country.name,
          latitude: setlistFmVenue.city.coords.lat,
          longitude: setlistFmVenue.city.coords.long,
          updatedAt: new Date(),
        },
      });
  }

  async syncVenuesByCity(
    city: string,
    stateCode?: string,
    countryCode = 'US'
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
    const setlistFmResult = await this.setlistFmClient.searchVenues({
      cityName: city,
      ...(stateCode && { stateCode }),
      countryCode,
    });

    if (setlistFmResult.venue) {
      for (const venue of setlistFmResult.venue) {
        await this.syncVenueFromSetlistFm(venue);
      }
    }
  }

  async syncMajorVenues(): Promise<void> {
    const majorCities = [
      { city: 'New York', stateCode: 'NY' },
      { city: 'Los Angeles', stateCode: 'CA' },
      { city: 'Chicago', stateCode: 'IL' },
      { city: 'Houston', stateCode: 'TX' },
      { city: 'Phoenix', stateCode: 'AZ' },
      { city: 'Philadelphia', stateCode: 'PA' },
      { city: 'San Antonio', stateCode: 'TX' },
      { city: 'San Diego', stateCode: 'CA' },
      { city: 'Dallas', stateCode: 'TX' },
      { city: 'San Jose', stateCode: 'CA' },
      { city: 'Austin', stateCode: 'TX' },
      { city: 'Jacksonville', stateCode: 'FL' },
      { city: 'San Francisco', stateCode: 'CA' },
      { city: 'Indianapolis', stateCode: 'IN' },
      { city: 'Columbus', stateCode: 'OH' },
      { city: 'Fort Worth', stateCode: 'TX' },
      { city: 'Charlotte', stateCode: 'NC' },
      { city: 'Detroit', stateCode: 'MI' },
      { city: 'Seattle', stateCode: 'WA' },
      { city: 'Denver', stateCode: 'CO' },
      { city: 'Washington', stateCode: 'DC' },
      { city: 'Boston', stateCode: 'MA' },
      { city: 'El Paso', stateCode: 'TX' },
      { city: 'Nashville', stateCode: 'TN' },
      { city: 'Portland', stateCode: 'OR' },
      { city: 'Las Vegas', stateCode: 'NV' },
      { city: 'Memphis', stateCode: 'TN' },
      { city: 'Louisville', stateCode: 'KY' },
      { city: 'Baltimore', stateCode: 'MD' },
      { city: 'Milwaukee', stateCode: 'WI' },
      { city: 'Atlanta', stateCode: 'GA' },
      { city: 'Miami', stateCode: 'FL' },
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
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }

  private getTimezone(countryCode: string, stateCode?: string): string {
    // Simple timezone mapping - in production, use a proper timezone library
    const timezoneMap: Record<string, string> = {
      'US-NY': 'America/New_York',
      'US-CA': 'America/Los_Angeles',
      'US-IL': 'America/Chicago',
      'US-TX': 'America/Chicago',
      'US-AZ': 'America/Phoenix',
      'US-CO': 'America/Denver',
      'US-WA': 'America/Los_Angeles',
      'US-OR': 'America/Los_Angeles',
      'US-NV': 'America/Los_Angeles',
      'US-FL': 'America/New_York',
      'US-GA': 'America/New_York',
      'US-MA': 'America/New_York',
      'US-DC': 'America/New_York',
      'US-PA': 'America/New_York',
      'US-OH': 'America/New_York',
      'US-MI': 'America/Detroit',
      'US-IN': 'America/Indiana/Indianapolis',
      'US-NC': 'America/New_York',
      'US-TN': 'America/Chicago',
      'US-KY': 'America/New_York',
      'US-MD': 'America/New_York',
      'US-WI': 'America/Chicago',
    };

    const key = stateCode ? `${countryCode}-${stateCode}` : countryCode;
    return timezoneMap[key] || 'America/New_York';
  }
}
