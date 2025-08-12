import { SetlistFmClient, type SetlistFmSetlist } from "../clients/setlistfm";
import { SpotifyClient } from "../clients/spotify";
import {
  TicketmasterClient,
  type TicketmasterEvent,
} from "../clients/ticketmaster";
import { and, db, eq } from "../database";
import { artists, showArtists, shows, venues } from "@repo/database";
import { SyncErrorHandler, SyncServiceError } from "../utils/error-handler";
import { VenueSyncService } from "./venue-sync";

export class ShowSyncService {
  private ticketmasterClient: TicketmasterClient;
  private setlistFmClient: SetlistFmClient;
  private spotifyClient: SpotifyClient;
  private venueSyncService: VenueSyncService;
  private errorHandler: SyncErrorHandler;

  constructor() {
    this.ticketmasterClient = new TicketmasterClient({
      apiKey: process.env["TICKETMASTER_API_KEY"] || "",
    });
    this.setlistFmClient = new SetlistFmClient({
      apiKey: process.env["SETLIST_FM_API_KEY"] || "",
    });
    this.spotifyClient = new SpotifyClient({}); // SpotifyClient reads credentials from env in authenticate()
    this.venueSyncService = new VenueSyncService();
    this.errorHandler = new SyncErrorHandler({
      maxRetries: 3,
      retryDelay: 1000,
      onError: (error) => {
        console.error("[ShowSyncService] Error:", error);
      },
    });
  }

  async syncShowFromTicketmaster(event: TicketmasterEvent): Promise<void> {
    // Find or create venue using VenueSyncService
    let venueId: string | null = null;
    if (event._embedded?.venues?.[0]) {
      const ticketmasterVenue = event._embedded.venues[0];
      
      // First check if venue already exists
      const venueSlug = this.generateSlug(ticketmasterVenue.name);
      const existingVenueResults = await db
        .select()
        .from(venues)
        .where(eq(venues.slug, venueSlug))
        .limit(1);
      
      if (existingVenueResults.length > 0 && existingVenueResults[0]) {
        venueId = existingVenueResults[0].id;
      } else {
        // Create venue using VenueSyncService
        try {
          await this.venueSyncService.syncVenueFromTicketmaster(ticketmasterVenue);
          
          // Get the newly created venue
          const newVenueResults = await db
            .select()
            .from(venues)
            .where(eq(venues.slug, venueSlug))
            .limit(1);
          
          if (newVenueResults.length > 0 && newVenueResults[0]) {
            venueId = newVenueResults[0].id;
          }
        } catch (error) {
          console.error(`Failed to create venue ${ticketmasterVenue.name}:`, error);
          // Continue without venue
        }
      }
    }

    // Find or create artist
    let artistId: string | null = null;
    if (event._embedded?.attractions?.[0]) {
      const attraction = event._embedded.attractions[0];
      try {
        await this.spotifyClient.authenticate();
      } catch (error) {
        console.error("Failed to authenticate with Spotify:", error);
        return; // Continue without Spotify data
      }

      try {
        // Search for artist on Spotify with retry
        const searchResult = await this.errorHandler.withRetry(
          () => this.spotifyClient.searchArtists(attraction.name, 1),
          {
            service: "ShowSyncService",
            operation: "searchArtists",
            context: { attractionName: attraction.name },
          },
        );

        if (!searchResult) {
          return;
        }
        if (searchResult.artists.items.length > 0) {
          const spotifyArtist = searchResult.artists.items[0];

          if (spotifyArtist) {
            // Create or update artist
            const [artist] = await db
              .insert(artists)
              .values({
                spotifyId: spotifyArtist.id,
                name: spotifyArtist.name,
                slug: this.generateSlug(spotifyArtist.name),
                imageUrl: spotifyArtist.images[0]?.url || null,
                smallImageUrl: spotifyArtist.images[2]?.url || null,
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
                  imageUrl: spotifyArtist.images[0]?.url || null,
                  smallImageUrl: spotifyArtist.images[2]?.url || null,
                  popularity: spotifyArtist.popularity,
                  followers: spotifyArtist.followers.total,
                  lastSyncedAt: new Date(),
                },
              })
              .returning({ id: artists.id });

            if (artist) {
              artistId = artist.id;
            }
          }
        }
      } catch (error) {
        console.error(`Failed to sync artist ${attraction.name}:`, error);
        // Continue without artist data
      }
    }

    if (!artistId) {
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
        ...(event.dates.start.localTime && {
          startTime: event.dates.start.localTime,
        }),
        status: this.mapTicketmasterStatus(event.dates.status.code),
        ticketUrl: event.url,
        ...(event.priceRanges?.[0]?.min && {
          minPrice: event.priceRanges[0].min,
        }),
        ...(event.priceRanges?.[0]?.max && {
          maxPrice: event.priceRanges[0].max,
        }),
        currency: event.priceRanges?.[0]?.currency || "USD",
        ticketmasterId: event.id,
      })
      .onConflictDoUpdate({
        target: shows.ticketmasterId,
        set: {
          status: this.mapTicketmasterStatus(event.dates.status.code),
          ...(event.priceRanges?.[0]?.min && {
            minPrice: event.priceRanges[0].min,
          }),
          ...(event.priceRanges?.[0]?.max && {
            maxPrice: event.priceRanges[0].max,
          }),
          updatedAt: new Date(),
        },
      })
      .returning({ id: shows.id });

    if (!show) {
      return;
    }

    // Add supporting acts if available
    if (
      event._embedded?.attractions &&
      event._embedded.attractions.length > 1
    ) {
      for (let i = 1; i < event._embedded.attractions.length; i++) {
        const attraction = event._embedded.attractions[i];

        if (!attraction) continue;

        try {
          const searchResult = await this.spotifyClient.searchArtists(
            attraction.name,
            1,
          );
          if (searchResult.artists.items.length > 0) {
            const spotifyArtist = searchResult.artists.items[0];

            if (spotifyArtist) {
              const [supportingArtist] = await db
                .insert(artists)
                .values({
                  spotifyId: spotifyArtist.id,
                  name: spotifyArtist.name,
                  slug: this.generateSlug(spotifyArtist.name),
                  imageUrl: spotifyArtist.images[0]?.url || null,
                  smallImageUrl: spotifyArtist.images[2]?.url || null,
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

              if (supportingArtist) {
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
            }
          }
        } catch (_error) {}
      }
    }
  }

  async syncShowFromSetlistFm(setlist: SetlistFmSetlist): Promise<void> {
    // Find artist
    const artistResults = await db
      .select()
      .from(artists)
      .where(eq(artists.name, setlist.artist.name))
      .limit(1);
    const artist = artistResults[0];

    if (!artist) {
      return;
    }

    // Find venue
    const venueResults = await db
      .select()
      .from(venues)
      .where(
        and(
          eq(venues.name, setlist.venue.name),
          eq(venues.city, setlist.venue.city.name),
        ),
      )
      .limit(1);
    const venue = venueResults[0];

    // Create or update show
    const showDate = new Date(setlist.eventDate);
    await db
      .insert(shows)
      .values({
        headlinerArtistId: artist.id,
        ...(venue?.id && { venueId: venue.id }),
        name: `${setlist.artist.name} at ${setlist.venue.name}`,
        slug: this.generateShowSlug(setlist.artist.name, showDate),
        date: setlist.eventDate,
        status: "completed",
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
  }

  async syncUpcomingShows(options: {
    city?: string;
    stateCode?: string;
    keyword?: string;
    classificationName?: string;
    startDateTime?: string;
    endDateTime?: string;
  }): Promise<void> {
    const eventsResult = await this.errorHandler.withRetry(
      () =>
        this.ticketmasterClient.searchEvents({
          ...options,
          size: 200,
          sort: "date,asc",
        }),
      {
        service: "ShowSyncService",
        operation: "searchEvents",
        context: options,
      },
    );

    if (!eventsResult) {
      throw new SyncServiceError(
        "Failed to fetch events from Ticketmaster",
        "ShowSyncService",
        "syncUpcomingShows",
      );
    }

    const events = eventsResult;

    if (events._embedded?.events) {
      for (const event of events._embedded.events) {
        await this.syncShowFromTicketmaster(event);
        // Rate limit
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }
  }

  async syncArtistShows(artistDbId: string): Promise<{ upcomingShows: number; created: number; updated: number }> {
    // Get artist info from database
    const [artist] = await db
      .select()
      .from(artists)
      .where(eq(artists.id, artistDbId))
      .limit(1);

    if (!artist) {
      throw new SyncServiceError(
        `Artist not found with ID: ${artistDbId}`,
        "ShowSyncService",
        "syncArtistShows"
      );
    }

    let created = 0;
    let updated = 0;
    let upcomingShows = 0;
    const eventsToProcess = new Set<string>(); // Avoid duplicates

    // Strategy 1: Search by Ticketmaster artist ID if available
    if (artist.ticketmasterId) {
      console.log(`Searching Ticketmaster events by artist ID: ${artist.ticketmasterId}`);
      try {
        const artistEventsResult = await this.errorHandler.withRetry(
          () =>
            this.ticketmasterClient.searchEvents({
              attractionId: artist.ticketmasterId!,
              size: 200,
              sort: "date,asc",
              startDateTime: new Date().toISOString(),
            }),
          {
            service: "ShowSyncService",
            operation: "searchEventsByAttractionId",
            context: { attractionId: artist.ticketmasterId },
          },
        );

        if (artistEventsResult?._embedded?.events) {
          for (const event of artistEventsResult._embedded.events) {
            eventsToProcess.add(event.id);
          }
        }
      } catch (error) {
        console.warn(`Failed to search by attraction ID ${artist.ticketmasterId}:`, error);
      }
    }

    // Strategy 2: Search by artist name (as fallback or additional)
    try {
      const eventsResult = await this.errorHandler.withRetry(
        () =>
          this.ticketmasterClient.searchEvents({
            keyword: artist.name,
            size: 200,
            sort: "date,asc",
            startDateTime: new Date().toISOString(),
            classificationName: "music", // Focus on music events
          }),
        {
          service: "ShowSyncService",
          operation: "searchEvents",
          context: { artistName: artist.name },
        },
      );

      if (eventsResult?._embedded?.events) {
        for (const event of eventsResult._embedded.events) {
          // Check if this event is actually for our artist
          const attractionName = event._embedded?.attractions?.[0]?.name;
          if (!attractionName || !this.isArtistMatch(artist.name, attractionName)) {
            continue;
          }
          eventsToProcess.add(event.id);
        }
      }
    } catch (error) {
      console.warn(`Failed to search by artist name ${artist.name}:`, error);
    }

    console.log(`Found ${eventsToProcess.size} unique events for artist ${artist.name}`);

    // Process all unique events found
    for (const eventId of eventsToProcess) {
      try {
        // Get event details
        const eventDetails = await this.errorHandler.withRetry(
          () => this.ticketmasterClient.getEvent(eventId),
          {
            service: "ShowSyncService",
            operation: "getEvent",
            context: { eventId },
          },
        );

        if (!eventDetails) continue;

        upcomingShows++;

        // Check if show already exists
        const existingShow = await db
          .select()
          .from(shows)
          .where(eq(shows.ticketmasterId, eventId))
          .limit(1);

        if (existingShow.length > 0) {
          // Update existing show
          await db
            .update(shows)
            .set({
              status: this.mapTicketmasterStatus(eventDetails.dates.status.code),
              name: eventDetails.name,
              ticketUrl: eventDetails.url,
              ...(eventDetails.priceRanges?.[0]?.min && {
                minPrice: eventDetails.priceRanges[0].min,
              }),
              ...(eventDetails.priceRanges?.[0]?.max && {
                maxPrice: eventDetails.priceRanges[0].max,
              }),
              currency: eventDetails.priceRanges?.[0]?.currency || "USD",
              updatedAt: new Date(),
            })
            .where(eq(shows.ticketmasterId, eventId));
          updated++;
        } else {
          // Create new show
          await this.syncShowFromTicketmaster(eventDetails);
          created++;
        }

        // Rate limit to avoid overwhelming APIs
        await new Promise((resolve) => setTimeout(resolve, 150));
      } catch (error) {
        console.error(`Failed to process event ${eventId}:`, error);
        // Continue with next event
      }
    }

    // Update artist stats
    await db
      .update(artists)
      .set({
        upcomingShows,
        totalShows: (artist.totalShows || 0) + created,
        updatedAt: new Date(),
      })
      .where(eq(artists.id, artistDbId));

    return { upcomingShows, created, updated };
  }

  async syncHistoricalSetlists(artistName: string): Promise<void> {
    const searchResult = await this.setlistFmClient.searchArtists(artistName);

    if (searchResult.artist.length === 0) {
      return;
    }

    const artist = searchResult.artist[0];
    if (!artist) {
      return;
    }

    const artistMbid = artist.mbid;
    let page = 1;
    let hasMore = true;

    while (hasMore && page <= 10) {
      // Limit to 10 pages
      const setlists = await this.setlistFmClient.getArtistSetlists(
        artistMbid,
        page,
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
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }

  private generateShowSlug(name: string, date: Date): string {
    const dateStr = date.toISOString().split("T")[0];
    return `${this.generateSlug(name)}-${dateStr}`;
  }

  private isArtistMatch(dbArtistName: string, ticketmasterArtistName: string): boolean {
    const normalize = (name: string) =>
      name.toLowerCase().replace(/[^a-z0-9]/g, "");
    
    const normalizedDb = normalize(dbArtistName);
    const normalizedTm = normalize(ticketmasterArtistName);
    
    // Exact match
    if (normalizedDb === normalizedTm) {
      return true;
    }
    
    // Check if one contains the other (for cases like "Artist" vs "Artist Band")
    if (normalizedDb.includes(normalizedTm) || normalizedTm.includes(normalizedDb)) {
      return true;
    }
    
    return false;
  }

  private mapTicketmasterStatus(
    code: string,
  ): "upcoming" | "ongoing" | "completed" | "cancelled" {
    switch (code.toLowerCase()) {
      case "onsale":
        return "upcoming";
      case "offsale":
      case "rescheduled":
        return "upcoming";
      case "cancelled":
      case "canceled":
        return "cancelled";
      case "postponed":
        return "upcoming";
      default:
        return "upcoming";
    }
  }
}
