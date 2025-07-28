import { db } from "@repo/database";
import { artists, shows, venues } from "@repo/database";
import { eq, gte, isNull, or } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { SpotifyClient, TicketmasterClient } from "@repo/external-apis";

// Rate limiting and caching utilities
class RateLimiter {
  private static requestCounts = new Map<
    string,
    { count: number; resetTime: number }
  >();

  static async checkLimit(
    key: string,
    maxRequests: number,
    windowMs: number,
  ): Promise<boolean> {
    const now = Date.now();
    const current = RateLimiter.requestCounts.get(key);

    if (!current || now > current.resetTime) {
      RateLimiter.requestCounts.set(key, {
        count: 1,
        resetTime: now + windowMs,
      });
      return true;
    }

    if (current.count >= maxRequests) {
      return false;
    }

    current.count++;
    return true;
  }

  static async delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Sync Services
class ArtistSyncService {
  private spotifyClient: SpotifyClient;

  constructor() {
    this.spotifyClient = new SpotifyClient({});
  }

  async syncPopularArtists() {
    await this.spotifyClient.authenticate();
    const results = { synced: 0, errors: 0, details: [] as any[] };

    try {
      // Get artists that need syncing (no Spotify data or outdated)
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);

      const artistsToSync = await db
        .select()
        .from(artists)
        .where(
          or(
            isNull(artists.spotifyId),
            isNull(artists.lastSyncedAt),
            gte(artists.lastSyncedAt, threeDaysAgo),
          ),
        )
        .limit(50); // Process in batches

      for (const artist of artistsToSync) {
        try {
          // Search for artist on Spotify
          const searchResult = await this.spotifyClient.searchArtists(
            artist.name,
            5,
          );

          if (searchResult.artists.items.length > 0) {
            // Find best match (exact name match preferred)
            const spotifyArtist =
              searchResult.artists.items.find(
                (a: any) => a.name.toLowerCase() === artist.name.toLowerCase(),
              ) || searchResult.artists.items[0];

            if (spotifyArtist) {
              // Update artist with Spotify data
              await db
                .update(artists)
                .set({
                  spotifyId: spotifyArtist.id,
                  imageUrl: spotifyArtist.images[0]?.url || artist.imageUrl,
                  smallImageUrl:
                    spotifyArtist.images[2]?.url || artist.smallImageUrl,
                  genres: JSON.stringify(spotifyArtist.genres),
                  popularity: spotifyArtist.popularity,
                  followers: spotifyArtist.followers.total,
                  externalUrls: JSON.stringify(spotifyArtist.external_urls),
                  lastSyncedAt: new Date(),
                  updatedAt: new Date(),
                })
                .where(eq(artists.id, artist.id));

              results.synced++;
              results.details.push({
                artistName: artist.name,
                spotifyId: spotifyArtist.id,
                popularity: spotifyArtist.popularity,
                followers: spotifyArtist.followers.total,
              });
            }
          } else {
          }

          // Rate limiting delay
          await RateLimiter.delay(100);
        } catch (_error) {
          results.errors++;
        }
      }
    } catch (_error) {
      results.errors++;
    }

    return results;
  }
}

class ShowSyncService {
  private ticketmasterClient: TicketmasterClient;

  constructor() {
    this.ticketmasterClient = new TicketmasterClient({
      apiKey: process.env.TICKETMASTER_API_KEY!,
    });
  }

  async syncUpcomingShows() {
    const results = { synced: 0, errors: 0, details: [] as any[] };

    try {
      const now = new Date();
      const futureDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000); // 90 days ahead

      // Get events from major US cities
      const cities = [
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
      ];

      for (const location of cities.slice(0, 3)) {
        // Limit to 3 cities per run
        try {
          const events = await this.ticketmasterClient.searchEvents({
            city: location.city,
            stateCode: location.stateCode,
            startDateTime: now.toISOString(),
            endDateTime: futureDate.toISOString(),
            size: 50,
            countryCode: "US",
          });

          if (events._embedded?.events) {
            for (const event of events._embedded.events.slice(0, 20)) {
              // Limit per city
              try {
                const showData = await this.processEvent(event);
                if (showData) {
                  results.synced++;
                  results.details.push(showData);
                }
              } catch (_error) {
                results.errors++;
              }
            }
          }

          // Rate limiting between cities
          await RateLimiter.delay(2000);
        } catch (_error) {
          results.errors++;
        }
      }
    } catch (_error) {
      results.errors++;
    }

    return results;
  }

  private async processEvent(tmEvent: any) {
    try {
      // Check if show already exists
      const existingShow = await db
        .select()
        .from(shows)
        .where(eq(shows.ticketmasterId, tmEvent.id))
        .limit(1);

      if (existingShow.length > 0) {
        return null; // Skip if already exists
      }

      // Process venue
      let venue: any = null;
      if (tmEvent._embedded?.venues?.[0]) {
        venue = await this.syncVenue(tmEvent._embedded.venues[0]);
      }

      // Process artist
      const artist = await this.findOrCreateArtist(tmEvent);

      // Create show
      const showData = {
        ticketmasterId: tmEvent.id,
        headlinerArtistId: artist.id,
        venueId: venue?.id || null,
        name: tmEvent.name,
        slug: this.generateSlug(tmEvent.name),
        date: tmEvent.dates.start.localDate,
        startTime: tmEvent.dates.start.localTime || null,
        status: "upcoming" as const,
        ticketUrl: tmEvent.url,
        minPrice: tmEvent.priceRanges?.[0]?.min || null,
        maxPrice: tmEvent.priceRanges?.[0]?.max || null,
        currency: tmEvent.priceRanges?.[0]?.currency || "USD",
      };

      const [_show] = await db.insert(shows).values(showData).returning();

      return {
        showName: tmEvent.name,
        artistName: artist.name,
        venueName: venue?.name,
        date: tmEvent.dates.start.localDate,
      };
    } catch (_error) {
      return null;
    }
  }

  private async syncVenue(tmVenue: any) {
    try {
      // Check if venue already exists
      const existingVenue = await db
        .select()
        .from(venues)
        .where(eq(venues.name, tmVenue.name))
        .limit(1);

      if (existingVenue.length > 0) {
        return existingVenue[0];
      }

      const venueData = {
        name: tmVenue.name,
        slug: this.generateSlug(tmVenue.name),
        address: tmVenue.address?.line1 || null,
        city: tmVenue.city?.name || null,
        state: tmVenue.state?.stateCode || null,
        country: tmVenue.country?.countryCode || null,
        postalCode: tmVenue.postalCode || null,
        latitude: tmVenue.location?.latitude
          ? Number.parseFloat(tmVenue.location.latitude)
          : null,
        longitude: tmVenue.location?.longitude
          ? Number.parseFloat(tmVenue.location.longitude)
          : null,
        timezone: tmVenue.timezone || null,
        capacity: tmVenue.capacity || null,
        website: tmVenue.url || null,
      };

      const [venue] = await db.insert(venues).values(venueData).returning();

      return venue;
    } catch (_error) {
      return null;
    }
  }

  private async findOrCreateArtist(tmEvent: any) {
    const attractionName =
      tmEvent._embedded?.attractions?.[0]?.name || tmEvent.name;

    let artistResult = await db
      .select()
      .from(artists)
      .where(eq(artists.name, attractionName))
      .limit(1);

    let artist = artistResult.length > 0 ? artistResult[0] : null;

    if (!artist) {
      const [newArtist] = await db
        .insert(artists)
        .values({
          name: attractionName,
          slug: this.generateSlug(attractionName),
          verified: false,
        })
        .returning();

      artist = newArtist!;
    }

    return artist;
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }
}

// Main cron handler
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get("authorization");
    const expectedAuth = `Bearer ${process.env["CRON_SECRET"]}`;

    if (authHeader !== expectedAuth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action") || "all";

    const results: any = {
      action,
      timestamp: new Date().toISOString(),
      results: {},
    };

    switch (action) {
      case "artists": {
        const artistSync = new ArtistSyncService();
        results.results.artists = await artistSync.syncPopularArtists();
        break;
      }

      case "shows": {
        const showSync = new ShowSyncService();
        results.results.shows = await showSync.syncUpcomingShows();
        break;
      }
      default: {
        const artistSyncAll = new ArtistSyncService();
        const showSyncAll = new ShowSyncService();

        const [artistResults, showResults] = await Promise.allSettled([
          artistSyncAll.syncPopularArtists(),
          showSyncAll.syncUpcomingShows(),
        ]);

        results.results.artists =
          artistResults.status === "fulfilled"
            ? artistResults.value
            : { synced: 0, errors: 1, error: artistResults.reason?.message };

        results.results.shows =
          showResults.status === "fulfilled"
            ? showResults.value
            : { synced: 0, errors: 1, error: showResults.reason?.message };
        break;
      }
    }

    return NextResponse.json({
      success: true,
      ...results,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}
