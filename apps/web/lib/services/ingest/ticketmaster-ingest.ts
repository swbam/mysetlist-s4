/**
 * Ticketmaster Data Ingestion Service
 * Handles large-scale artist import and real-time venue/show sync
 */

import { db, venues, shows, artists } from '@repo/database';
import { eq } from 'drizzle-orm';
import { ProgressBus } from '../progress/ProgressBus';
import { iterateEventsByAttraction, type TicketmasterEvent, type TicketmasterVenue } from '../adapters/TicketmasterClient';
import { pLimit, processBatch } from '../util/concurrency';
import { createSlug } from '../util/slug';

export interface TicketmasterIngestOptions {
  artistId: string;
  tmAttractionId: string;
  progressReporter?: ReturnType<typeof ProgressBus.createReporter>;
  concurrency?: number;
}

export interface IngestResult {
  venuesProcessed: number;
  showsProcessed: number;
  newVenues: number;
  newShows: number;
  errors: Array<{ type: string; message: string; item?: any }>;
}

/**
 * Main Ticketmaster ingest service for robust data processing
 */
export class TicketmasterIngest {
  private limit: ReturnType<typeof pLimit>;
  private progressReporter?: ReturnType<typeof ProgressBus.createReporter>;
  
  constructor(options: { concurrency?: number; progressReporter?: ReturnType<typeof ProgressBus.createReporter> } = {}) {
    this.limit = pLimit(options.concurrency || 5);
    this.progressReporter = options.progressReporter;
  }

  /**
   * Ingest all shows and venues for an artist with robust error handling
   */
  async ingest(options: TicketmasterIngestOptions): Promise<IngestResult> {
    const { artistId, tmAttractionId, progressReporter } = options;
    const reporter = progressReporter || this.progressReporter;

    const result: IngestResult = {
      venuesProcessed: 0,
      showsProcessed: 0,
      newVenues: 0,
      newShows: 0,
      errors: [],
    };

    try {
      reporter?.report('importing-shows', 5, 'Fetching Ticketmaster events...');

      // Step 1: Collect all events from paginated API
      const allEvents: TicketmasterEvent[] = [];
      let pageCount = 0;

      for await (const eventBatch of iterateEventsByAttraction(tmAttractionId)) {
        allEvents.push(...eventBatch);
        pageCount++;
        
        reporter?.report(
          'importing-shows',
          Math.min(30, 5 + (pageCount * 5)),
          `Fetched ${allEvents.length} events from ${pageCount} page(s)...`
        );
      }

      console.log(`TicketmasterIngest: Collected ${allEvents.length} events for artist ${artistId}`);

      if (allEvents.length === 0) {
        reporter?.report('importing-shows', 40, 'No events found for this artist');
        return result;
      }

      // Step 2: Extract unique venues
      const venueMap = new Map<string, TicketmasterVenue>();
      for (const event of allEvents) {
        const eventVenues = event._embedded?.venues || [];
        for (const venue of eventVenues) {
          if (venue.id && !venueMap.has(venue.id)) {
            venueMap.set(venue.id, venue);
          }
        }
      }

      const uniqueVenues = Array.from(venueMap.values());
      console.log(`TicketmasterIngest: Found ${uniqueVenues.length} unique venues`);

      reporter?.report('importing-shows', 35, `Processing ${uniqueVenues.length} venues...`);

      // Step 3: Process venues first (with FK mapping)
      const venueIdMap = new Map<string, string>();
      
      await processBatch(
        uniqueVenues,
        async (venue) => await this.processVenue(venue, venueIdMap, result),
        {
          concurrency: options.concurrency || 5,
          continueOnError: true,
          onProgress: (completed, total) => {
            const progress = 35 + Math.floor((completed / total) * 15);
            reporter?.report(
              'importing-shows',
              Math.min(50, progress),
              `Processed ${completed}/${total} venues (${result.newVenues} new)`
            );
          },
          onError: (error, venue) => {
            result.errors.push({
              type: 'venue_processing',
              message: error.message,
              item: { tmVenueId: venue.id, name: venue.name },
            });
          },
        }
      );

      reporter?.report('importing-shows', 55, `Processing ${allEvents.length} shows...`);

      // Step 4: Process shows with proper venue FK mapping
      await processBatch(
        allEvents,
        async (event) => await this.processShow(event, artistId, venueIdMap, result),
        {
          concurrency: options.concurrency || 5,
          continueOnError: true,
          onProgress: (completed, total) => {
            const progress = 55 + Math.floor((completed / total) * 40);
            reporter?.report(
              'importing-shows',
              Math.min(95, progress),
              `Processed ${completed}/${total} shows (${result.newShows} new)`
            );
          },
          onError: (error, event) => {
            result.errors.push({
              type: 'show_processing',
              message: error.message,
              item: { tmEventId: event.id, name: event.name },
            });
          },
        }
      );

      reporter?.report('importing-shows', 100, 
        `Import completed: ${result.newVenues} venues, ${result.newShows} shows (${result.errors.length} errors)`
      );

      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('TicketmasterIngest: Fatal error:', error);
      
      result.errors.push({
        type: 'fatal_error',
        message: errorMessage,
      });

      reporter?.reportError(error as Error, 'importing-shows');
      throw error;
    }
  }

  /**
   * Process a single venue with robust error handling and idempotent upsert
   */
  private async processVenue(
    venue: TicketmasterVenue,
    venueIdMap: Map<string, string>,
    result: IngestResult
  ): Promise<void> {
    try {
      result.venuesProcessed++;

      const venueData = {
        tmVenueId: venue.id,
        name: venue.name,
        slug: createSlug(venue.name),
        address: venue.address?.line1 || null,
        city: venue.city?.name || 'Unknown',
        state: venue.state?.name || null,
        country: venue.country?.name || 'US',
        postalCode: venue.postalCode || null,
        latitude: venue.location?.latitude ? parseFloat(venue.location.latitude) : null,
        longitude: venue.location?.longitude ? parseFloat(venue.location.longitude) : null,
        timezone: venue.timezone || 'America/New_York',
        updatedAt: new Date(),
      };

      // Idempotent upsert
      const [upsertedVenue] = await db
        .insert(venues)
        .values(venueData)
        .onConflictDoUpdate({
          target: venues.tmVenueId,
          set: {
            name: venueData.name,
            slug: venueData.slug,
            address: venueData.address,
            city: venueData.city,
            state: venueData.state,
            country: venueData.country,
            postalCode: venueData.postalCode,
            latitude: venueData.latitude,
            longitude: venueData.longitude,
            timezone: venueData.timezone,
            updatedAt: venueData.updatedAt,
          },
        })
        .returning({ id: venues.id, tmVenueId: venues.tmVenueId });

      if (upsertedVenue) {
        venueIdMap.set(venue.id, upsertedVenue.id);

        const wasNew = (new Date().getTime() - new Date(venueData.updatedAt).getTime()) < 1000;
        if (wasNew) {
          result.newVenues++;
        }

        console.log(`TicketmasterIngest: Processed venue ${venue.name} (${venue.id} -> ${upsertedVenue.id})`);
      } else {
        console.error(`TicketmasterIngest: Failed to upsert venue: ${venue.name}`);
      }

    } catch (error) {
      console.error(`TicketmasterIngest: Error processing venue ${venue.id}:`, error);
      throw error;
    }
  }

  /**
   * Process a single show with proper venue FK mapping and error handling
   */
  private async processShow(
    event: TicketmasterEvent,
    artistId: string,
    venueIdMap: Map<string, string>,
    result: IngestResult
  ): Promise<void> {
    try {
      result.showsProcessed++;

      const tmVenueId = event._embedded?.venues?.[0]?.id;
      const dbVenueId = tmVenueId ? venueIdMap.get(tmVenueId) : null;

      const showDate = event.dates?.start?.localDate || null;
      const showTime = event.dates?.start?.localTime || null;

      const priceRange = event.priceRanges?.[0];
      const minPrice = priceRange?.min ? Math.round(priceRange.min * 100) : null;
      const maxPrice = priceRange?.max ? Math.round(priceRange.max * 100) : null;

      const showData = {
        headlinerArtistId: artistId,
        venueId: dbVenueId,
        tmEventId: event.id,
        name: event.name || null,
        slug: event.name ? createSlug(event.name) : null,
        date: showDate,
        startTime: showTime,
        status: 'upcoming' as const,
        ticketUrl: event.url || null,
        minPrice,
        maxPrice,
        currency: priceRange?.currency || 'USD',
        updatedAt: new Date(),
      };

      // Idempotent upsert
      const [upsertedShow] = await db
        .insert(shows)
        .values(showData)
        .onConflictDoUpdate({
          target: shows.tmEventId,
          set: {
            name: showData.name,
            slug: showData.slug,
            date: showData.date,
            startTime: showData.startTime,
            status: showData.status,
            ticketUrl: showData.ticketUrl,
            minPrice: showData.minPrice,
            maxPrice: showData.maxPrice,
            currency: showData.currency,
            updatedAt: showData.updatedAt,
          },
        })
        .returning({ id: shows.id, tmEventId: shows.tmEventId });

      if (upsertedShow) {
        const wasNew = (new Date().getTime() - new Date(showData.updatedAt).getTime()) < 1000;
        if (wasNew) {
          result.newShows++;
        }

        console.log(`TicketmasterIngest: Processed show ${event.name || event.id} (${event.id} -> ${upsertedShow.id})`);
      } else {
        console.error(`TicketmasterIngest: Failed to upsert show: ${event.name || event.id}`);
      }

    } catch (error) {
      console.error(`TicketmasterIngest: Error processing show ${event.id}:`, error);
      throw error;
    }
  }

  /**
   * Static method for quick ingest operations
   */
  static async ingestForArtist(options: TicketmasterIngestOptions): Promise<IngestResult> {
    const ingest = new TicketmasterIngest({
      concurrency: options.concurrency,
      progressReporter: options.progressReporter,
    });
    
    return await ingest.ingest(options);
  }
}

/**
 * Convenience function for simple ingest operations
 */
export async function ingestTicketmasterShows(
  artistId: string,
  tmAttractionId: string,
  options: {
    concurrency?: number;
    progressReporter?: ReturnType<typeof ProgressBus.createReporter>;
  } = {}
): Promise<IngestResult> {
  return TicketmasterIngest.ingestForArtist({
    artistId,
    tmAttractionId,
    ...options,
  });
}