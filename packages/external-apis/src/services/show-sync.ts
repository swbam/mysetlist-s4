import { artists, db, showArtists, shows, venues } from '@repo/database';
import { and, eq } from 'drizzle-orm';
import { SetlistFmClient, type SetlistFmSetlist } from '../clients/setlistfm';
import { SpotifyClient } from '../clients/spotify';
import {
  TicketmasterClient,
  type TicketmasterEvent,
} from '../clients/ticketmaster';

export class ShowSyncService {
  private ticketmasterClient: TicketmasterClient;
  private setlistFmClient: SetlistFmClient;
  private spotifyClient: SpotifyClient;

  constructor() {
    this.ticketmasterClient = new TicketmasterClient({});
    this.setlistFmClient = new SetlistFmClient({});
    this.spotifyClient = new SpotifyClient({});
  }

  async syncShowFromTicketmaster(event: TicketmasterEvent): Promise<void> {
    try {
      // Find or create venue
      let venueId: string | null = null;
      if (event._embedded?.venues?.[0]) {
        const venue = event._embedded.venues[0];
        const existingVenue = await db.query.venues.findFirst({
          where: eq(venues.slug, this.generateSlug(venue.name)),
        });
        venueId = existingVenue?.id || null;
      }

      // Find or create artist
      let artistId: string | null = null;
      if (event._embedded?.attractions?.[0]) {
        const attraction = event._embedded.attractions[0];
        await this.spotifyClient.authenticate();

        try {
          // Search for artist on Spotify
          const searchResult = await this.spotifyClient.searchArtists(
            attraction.name,
            1
          );
          if (searchResult.artists.items.length > 0) {
            const spotifyArtist = searchResult.artists.items[0];

            // Create or update artist
            const [artist] = await db
              .insert(artists)
              .values({
                spotifyId: spotifyArtist.id,
                name: spotifyArtist.name,
                slug: this.generateSlug(spotifyArtist.name),
                imageUrl: spotifyArtist.images[0]?.url,
                smallImageUrl: spotifyArtist.images[2]?.url,
                genres: JSON.stringify(spotifyArtist.genres),
                popularity: spotifyArtist.popularity,
                followers: spotifyArtist.followers.total,
                externalUrls: JSON.stringify(spotifyArtist.external_urls),
                lastSyncedAt: new Date(),
              })
              .onConflictDoUpdate({
                target: artists.spotifyId,
                set: {
                  name: spotifyArtist.name,
                  imageUrl: spotifyArtist.images[0]?.url,
                  smallImageUrl: spotifyArtist.images[2]?.url,
                  popularity: spotifyArtist.popularity,
                  followers: spotifyArtist.followers.total,
                  lastSyncedAt: new Date(),
                },
              })
              .returning({ id: artists.id });

            artistId = artist.id;
          }
        } catch (error) {
          console.error(
            `Failed to find artist on Spotify: ${attraction.name}`,
            error
          );
        }
      }

      if (!artistId) {
        console.warn(`Skipping event ${event.name} - no artist found`);
        return;
      }

      // Create or update show
      const showDate = new Date(event.dates.start.localDate);
      const [show] = await db
        .insert(shows)
        .values({
          headlinerArtistId: artistId,
          venueId,
          name: event.name,
          slug: this.generateShowSlug(event.name, showDate),
          date: event.dates.start.localDate,
          startTime: event.dates.start.localTime,
          status: this.mapTicketmasterStatus(event.dates.status.code),
          ticketUrl: event.url,
          minPrice: event.priceRanges?.[0]?.min,
          maxPrice: event.priceRanges?.[0]?.max,
          currency: event.priceRanges?.[0]?.currency || 'USD',
          ticketmasterId: event.id,
        })
        .onConflictDoUpdate({
          target: shows.ticketmasterId,
          set: {
            status: this.mapTicketmasterStatus(event.dates.status.code),
            minPrice: event.priceRanges?.[0]?.min,
            maxPrice: event.priceRanges?.[0]?.max,
            updatedAt: new Date(),
          },
        })
        .returning({ id: shows.id });

      // Add supporting acts if available
      if (
        event._embedded?.attractions &&
        event._embedded.attractions.length > 1
      ) {
        for (let i = 1; i < event._embedded.attractions.length; i++) {
          const attraction = event._embedded.attractions[i];

          try {
            const searchResult = await this.spotifyClient.searchArtists(
              attraction.name,
              1
            );
            if (searchResult.artists.items.length > 0) {
              const spotifyArtist = searchResult.artists.items[0];

              const [supportingArtist] = await db
                .insert(artists)
                .values({
                  spotifyId: spotifyArtist.id,
                  name: spotifyArtist.name,
                  slug: this.generateSlug(spotifyArtist.name),
                  imageUrl: spotifyArtist.images[0]?.url,
                  smallImageUrl: spotifyArtist.images[2]?.url,
                  genres: JSON.stringify(spotifyArtist.genres),
                  popularity: spotifyArtist.popularity,
                  followers: spotifyArtist.followers.total,
                  externalUrls: JSON.stringify(spotifyArtist.external_urls),
                  lastSyncedAt: new Date(),
                })
                .onConflictDoUpdate({
                  target: artists.spotifyId,
                  set: {
                    lastSyncedAt: new Date(),
                  },
                })
                .returning({ id: artists.id });

              await db
                .insert(showArtists)
                .values({
                  showId: show.id,
                  artistId: supportingArtist.id,
                  orderIndex: i,
                  isHeadliner: false,
                })
                .onConflictDoNothing();
            }
          } catch (error) {
            console.error(
              `Failed to add supporting act: ${attraction.name}`,
              error
            );
          }
        }
      }
    } catch (error) {
      console.error(
        `Failed to sync show from Ticketmaster: ${event.name}`,
        error
      );
      throw error;
    }
  }

  async syncShowFromSetlistFm(setlist: SetlistFmSetlist): Promise<void> {
    try {
      // Find artist
      const artist = await db.query.artists.findFirst({
        where: eq(artists.name, setlist.artist.name),
      });

      if (!artist) {
        console.warn(`Artist not found: ${setlist.artist.name}`);
        return;
      }

      // Find venue
      const venue = await db.query.venues.findFirst({
        where: and(
          eq(venues.name, setlist.venue.name),
          eq(venues.city, setlist.venue.city.name)
        ),
      });

      // Create or update show
      const showDate = new Date(setlist.eventDate);
      await db
        .insert(shows)
        .values({
          headlinerArtistId: artist.id,
          venueId: venue?.id,
          name: `${setlist.artist.name} at ${setlist.venue.name}`,
          slug: this.generateShowSlug(setlist.artist.name, showDate),
          date: setlist.eventDate,
          status: 'completed',
          setlistFmId: setlist.id,
          isVerified: true,
        })
        .onConflictDoUpdate({
          target: shows.setlistFmId,
          set: {
            isVerified: true,
            updatedAt: new Date(),
          },
        });
    } catch (error) {
      console.error(
        `Failed to sync show from Setlist.fm: ${setlist.id}`,
        error
      );
      throw error;
    }
  }

  async syncUpcomingShows(options: {
    city?: string;
    stateCode?: string;
    keyword?: string;
    classificationName?: string;
    startDateTime?: string;
    endDateTime?: string;
  }): Promise<void> {
    try {
      const events = await this.ticketmasterClient.searchEvents({
        ...options,
        size: 200,
        sort: 'date,asc',
      });

      if (events._embedded?.events) {
        for (const event of events._embedded.events) {
          await this.syncShowFromTicketmaster(event);
          // Rate limit
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      }
    } catch (error) {
      console.error('Failed to sync upcoming shows:', error);
      throw error;
    }
  }

  async syncHistoricalSetlists(artistName: string): Promise<void> {
    try {
      const searchResult = await this.setlistFmClient.searchArtists(artistName);

      if (searchResult.artist.length === 0) {
        console.warn(`Artist not found on Setlist.fm: ${artistName}`);
        return;
      }

      const artistMbid = searchResult.artist[0].mbid;
      let page = 1;
      let hasMore = true;

      while (hasMore && page <= 10) {
        // Limit to 10 pages
        const setlists = await this.setlistFmClient.getArtistSetlists(
          artistMbid,
          page
        );

        if (setlists.setlist.length === 0) {
          hasMore = false;
          break;
        }

        for (const setlist of setlists.setlist) {
          await this.syncShowFromSetlistFm(setlist);
        }

        page++;
        // Rate limit
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    } catch (error) {
      console.error(
        `Failed to sync historical setlists for ${artistName}:`,
        error
      );
      throw error;
    }
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }

  private generateShowSlug(name: string, date: Date): string {
    const dateStr = date.toISOString().split('T')[0];
    return `${this.generateSlug(name)}-${dateStr}`;
  }

  private mapTicketmasterStatus(
    code: string
  ): 'upcoming' | 'ongoing' | 'completed' | 'cancelled' {
    switch (code.toLowerCase()) {
      case 'onsale':
        return 'upcoming';
      case 'offsale':
      case 'rescheduled':
        return 'upcoming';
      case 'cancelled':
      case 'canceled':
        return 'cancelled';
      case 'postponed':
        return 'upcoming';
      default:
        return 'upcoming';
    }
  }
}
