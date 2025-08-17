import { TicketmasterClient } from "../clients/ticketmaster";
import { db, eq, sql } from "../database";
import { shows, venues, artists } from "@repo/database";

export interface ShowSyncResult {
  totalShows: number;
  upcomingShows: number;
  pastShows: number;
  venuesCreated: number;
  venuesUpdated: number;
  errors: string[];
  syncDuration: number;
}

export interface VenueData {
  id: string;
  name: string;
  city?: string;
  state?: string;
  country?: string;
  address?: string;
  postalCode?: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
  url?: string;
  images?: Array<{ url: string }>;
  capacity?: string;
}

export interface ShowData {
  id: string;
  name: string;
  date: Date;
  venue?: VenueData;
  status: string;
  minPrice?: number;
  maxPrice?: number;
  ticketUrl?: string;
  images?: Array<{ url: string }>;
  seatmapUrl?: string;
}

export class EnhancedShowVenueSync {
  private ticketmasterClient: TicketmasterClient;
  private maxRetries = 3;
  private retryDelay = 1000; // Start with 1 second
  private batchSize = 20; // Process 20 items at a time
  private rateLimitDelay = 200; // ms between API calls
  
  constructor() {
    this.ticketmasterClient = new TicketmasterClient({
      apiKey: process.env['TICKETMASTER_API_KEY'] || "",
    });
  }

  /**
   * Sync all shows and venues for an artist with intelligent retry and error recovery
   */
  async syncArtistShowsAndVenues(
    artistId: string,
    options: {
      includeP?: boolean;
      maxShows?: number;
      onProgress?: (message: string, progress: number) => void;
    } = {}
  ): Promise<ShowSyncResult> {
    const startTime = Date.now();
    const result: ShowSyncResult = {
      totalShows: 0,
      upcomingShows: 0,
      pastShows: 0,
      venuesCreated: 0,
      venuesUpdated: 0,
      errors: [],
      syncDuration: 0,
    };

    try {
      // Get artist details
      const [artist] = await db
        .select()
        .from(artists)
        .where(eq(artists.id, artistId))
        .limit(1);
      
      if (!artist || !artist.tmAttractionId) {
        throw new Error(`Artist not found or missing Ticketmaster ID: ${artistId}`);
      }

      // Fetch shows with retry logic
      options.onProgress?.('Fetching shows from Ticketmaster...', 10);
      const showsData = await this.fetchShowsWithRetry(artist.tmAttractionId, options);
      result.totalShows = showsData.length;
      
      // Separate upcoming and past shows
      const now = new Date();
      const upcomingShows = showsData.filter(show => new Date(show.date) >= now);
      const pastShows = showsData.filter(show => new Date(show.date) < now);
      
      result.upcomingShows = upcomingShows.length;
      result.pastShows = pastShows.length;
      
      // Extract and process unique venues
      options.onProgress?.('Processing venues...', 30);
      const venuesResult = await this.processVenuesInParallel(showsData, options);
      result.venuesCreated = venuesResult.created;
      result.venuesUpdated = venuesResult.updated;
      
      // Save shows to database with venue links
      options.onProgress?.('Saving shows to database...', 60);
      await this.saveShowsWithVenueLinks(artistId, showsData, venuesResult.venueMap);
      
      // Create setlists for upcoming shows
      if (upcomingShows.length > 0) {
        options.onProgress?.('Creating setlists for upcoming shows...', 80);
        await this.createSetlistsForShows(artistId, upcomingShows);
      }
      
      options.onProgress?.('Show and venue sync completed!', 100);
      
    } catch (error) {
      console.error('Show/venue sync failed:', error);
      result.errors.push(error instanceof Error ? error.message : String(error));
      throw error;
    } finally {
      result.syncDuration = Date.now() - startTime;
    }

    return result;
  }

  /**
   * Fetch shows with exponential backoff retry
   */
  private async fetchShowsWithRetry(
    tmAttractionId: string,
    options: any,
    retryCount = 0
  ): Promise<ShowData[]> {
    try {
      const events = await this.ticketmasterClient.searchEvents({
        attractionId: tmAttractionId,
        size: options.maxShows || 200,
      });
      
      if (!events || !events._embedded?.events) {
        return [];
      }
      
      return this.transformTicketmasterEvents(events._embedded.events);
      
    } catch (error) {
      if (retryCount < this.maxRetries) {
        const delay = this.retryDelay * Math.pow(2, retryCount);
        console.warn(`Retrying show fetch (attempt ${retryCount + 1}/${this.maxRetries}) after ${delay}ms...`);
        
        await this.delay(delay);
        return this.fetchShowsWithRetry(tmAttractionId, options, retryCount + 1);
      }
      
      throw error;
    }
  }

  /**
   * Transform Ticketmaster events to our show format
   */
  private transformTicketmasterEvents(events: any[]): ShowData[] {
    const mappedShows = events.map(event => {
      const venue = event._embedded?.venues?.[0];
      
      return {
        id: event.id,
        name: event.name,
        date: new Date(event.dates?.start?.dateTime || event.dates?.start?.localDate),
        venue: venue ? {
          id: venue.id,
          name: venue.name,
          city: venue.city?.name,
          state: venue.state?.stateCode || venue.state?.name,
          country: venue.country?.countryCode || venue.country?.name,
          address: venue.address?.line1,
          postalCode: venue.postalCode,
          latitude: venue.location?.latitude ? parseFloat(venue.location.latitude) : undefined,
          longitude: venue.location?.longitude ? parseFloat(venue.location.longitude) : undefined,
          timezone: venue.timezone,
          url: venue.url,
          images: venue.images,
          capacity: venue.generalInfo?.generalRule,
        } : undefined,
        status: event.dates?.status?.code || 'scheduled',
        minPrice: event.priceRanges?.[0]?.min,
        maxPrice: event.priceRanges?.[0]?.max,
        ticketUrl: event.url,
        images: event.images,
        seatmapUrl: event.seatmap?.staticUrl,
      };
    });
    return mappedShows.filter(show => show.venue !== undefined) as ShowData[];
  }

  /**
   * Process venues in parallel batches with error recovery
   */
  private async processVenuesInParallel(
    showsData: ShowData[],
    _options: any
  ): Promise<{
    created: number;
    updated: number;
    venueMap: Map<string, string>;
  }> {
    const uniqueVenues = new Map<string, VenueData>();
    const venueMap = new Map<string, string>(); // tmVenueId -> dbVenueId
    
    // Extract unique venues
    showsData.forEach(show => {
      if (show.venue && !uniqueVenues.has(show.venue.id)) {
        uniqueVenues.set(show.venue.id, show.venue);
      }
    });
    
    if (uniqueVenues.size === 0) {
      return { created: 0, updated: 0, venueMap };
    }
    
    // Check existing venues
    const tmVenueIds = Array.from(uniqueVenues.keys());
    const existingVenues = await db
      .select()
      .from(venues)
      .where(sql`${venues.tmVenueId} = ANY(${tmVenueIds})`);
    
    const existingVenueIds = new Set(existingVenues.map(v => v.tmVenueId));
    existingVenues.forEach(v => {
      if (v.tmVenueId) {
        venueMap.set(v.tmVenueId, v.id);
      }
    });
    
    // Separate new and existing venues
    const newVenues: VenueData[] = [];
    const venuesToUpdate: VenueData[] = [];
    
    uniqueVenues.forEach((venue, tmId) => {
      if (existingVenueIds.has(tmId)) {
        venuesToUpdate.push(venue);
      } else {
        newVenues.push(venue);
      }
    });
    
    // Process new venues in batches
    let created = 0;
    if (newVenues.length > 0) {
      const batches = this.createBatches(newVenues, this.batchSize);
      
      for (const batch of batches) {
        const venueRecords = batch.map(venue => ({
          tmVenueId: venue.id,
          name: venue.name,
          city: venue.city || null,
          state: venue.state || null,
          country: venue.country || null,
          address: venue.address || null,
          postalCode: venue.postalCode || null,
          latitude: venue.latitude || null,
          longitude: venue.longitude || null,
          timezone: venue.timezone || null,
          url: venue.url || null,
          imageUrl: venue.images?.[0]?.url || null,
          capacity: venue.capacity || null,
          rawData: JSON.stringify(venue),
        }));
        
        try {
          const inserted = await db
            .insert(venues)
            .values(venueRecords as any)
            .onConflictDoNothing()
            .returning({ id: venues.id, tmVenueId: venues.tmVenueId });
          
          created += inserted.length;
          
          // Update venue map
          inserted.forEach(v => {
            if (v.tmVenueId) {
              venueMap.set(v.tmVenueId, v.id);
            }
          });
        } catch (error) {
          console.error('Failed to insert venue batch:', error);
          // Continue with next batch
        }
        
        // Rate limiting
        await this.delay(this.rateLimitDelay);
      }
    }
    
    // Update existing venues if needed
    let updated = 0;
    for (const venue of venuesToUpdate) {
      try {
        await db
          .update(venues)
          .set({
            name: venue.name,
            city: venue.city || sql`NULL`,
            state: venue.state || sql`NULL`,
            country: venue.country || sql`NULL`,
            latitude: venue.latitude || null,
            longitude: venue.longitude || null,
            updatedAt: new Date(),
          })
          .where(eq(venues.tmVenueId, venue.id));
        
        updated++;
      } catch (error) {
        console.warn(`Failed to update venue ${venue.id}:`, error);
      }
    }
    
    return { created, updated, venueMap };
  }

  /**
   * Save shows with proper venue links
   */
  private async saveShowsWithVenueLinks(
    artistId: string,
    showsData: ShowData[],
    venueMap: Map<string, string>
  ): Promise<void> {
    const showRecords = showsData.map(show => ({
      tmEventId: show.id,
      headlinerArtistId: artistId,
      name: show.name,
      date: show.date,
      venueId: show.venue ? venueMap.get(show.venue.id) || null : null,
      timezone: show.venue?.timezone || null,
      status: show.status,
      minPrice: show.minPrice || null,
      maxPrice: show.maxPrice || null,
      ticketUrl: show.ticketUrl || null,
      imageUrl: show.images?.[0]?.url || null,
      smallImageUrl: show.images?.[2]?.url || null,
      seatmapUrl: show.seatmapUrl || null,
      rawData: JSON.stringify(show),
    }));
    
    // Batch insert shows
    const batches = this.createBatches(showRecords, this.batchSize);
    
    for (const batch of batches) {
      try {
        await db
          .insert(shows)
          .values(batch as any)
          .onConflictDoUpdate({
            target: shows.tmEventId,
            set: {
              name: sql`EXCLUDED.name`,
              date: sql`EXCLUDED.date`,
              venueId: sql`EXCLUDED.venue_id`,
              status: sql`EXCLUDED.status`,
              minPrice: sql`EXCLUDED.min_price`,
              maxPrice: sql`EXCLUDED.max_price`,
              updatedAt: new Date(),
            },
          });
      } catch (error) {
        console.error('Failed to insert show batch:', error);
        // Continue with next batch
      }
      
      // Rate limiting
      await this.delay(this.rateLimitDelay);
    }
  }

  /**
   * Create initial setlists for shows
   */
  private async createSetlistsForShows(
    _artistId: string,
    upcomingShows: ShowData[]
  ): Promise<void> {
    // This would be implemented to create setlists
    // For now, we'll skip the implementation as it's handled elsewhere
    console.log(`Would create setlists for ${upcomingShows.length} upcoming shows`);
  }

  /**
   * Create batches from array
   */
  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get sync status for an artist's shows
   */
  async getArtistShowSyncStatus(artistId: string): Promise<{
    totalShows: number;
    upcomingShows: number;
    pastShows: number;
    totalVenues: number;
    lastSyncedAt: Date | null;
    needsUpdate: boolean;
  }> {
    const now = new Date();
    
    // Get show counts
    const [showStats] = await db.execute(sql`
      SELECT 
        COUNT(*)::int as total_shows,
        COUNT(CASE WHEN date >= ${now} THEN 1 END)::int as upcoming_shows,
        COUNT(CASE WHEN date < ${now} THEN 1 END)::int as past_shows,
        COUNT(DISTINCT venue_id)::int as total_venues,
        MAX(created_at) as last_synced_at
      FROM ${shows}
      WHERE headliner_artist_id = ${artistId}
    `);
    
    const stats = (showStats as any).rows[0];
    
    // Check if update is needed (if no shows or last sync > 24 hours ago)
    const hoursSinceSync = stats.last_synced_at
      ? (Date.now() - new Date(stats.last_synced_at).getTime()) / (1000 * 60 * 60)
      : Infinity;
    
    return {
      totalShows: stats.total_shows || 0,
      upcomingShows: stats.upcoming_shows || 0,
      pastShows: stats.past_shows || 0,
      totalVenues: stats.total_venues || 0,
      lastSyncedAt: stats.last_synced_at ? new Date(stats.last_synced_at) : null,
      needsUpdate: stats.total_shows === 0 || hoursSinceSync > 24,
    };
  }

  /**
   * Sync venues independently (for cron jobs)
   */
  async syncVenuesFromShows(): Promise<{
    venuesCreated: number;
    venuesUpdated: number;
  }> {
    // Get shows with missing venue links
    const showsWithoutVenues = await db.execute(sql`
      SELECT DISTINCT 
        raw_data::jsonb -> '_embedded' -> 'venues' -> 0 as venue_data
      FROM ${shows}
      WHERE venue_id IS NULL
        AND raw_data::jsonb -> '_embedded' -> 'venues' -> 0 IS NOT NULL
      LIMIT 100
    `);
    
    const venueDataList = (showsWithoutVenues as any).rows
      .map((row: any) => row.venue_data)
      .filter(Boolean);
    
    if (venueDataList.length === 0) {
      return { venuesCreated: 0, venuesUpdated: 0 };
    }
    
    // Process venues
    const venues: VenueData[] = venueDataList.map((data: any) => ({
      id: data.id,
      name: data.name,
      city: data.city?.name,
      state: data.state?.stateCode || data.state?.name,
      country: data.country?.countryCode || data.country?.name,
      address: data.address?.line1,
      postalCode: data.postalCode,
      latitude: data.location?.latitude ? parseFloat(data.location.latitude) : undefined,
      longitude: data.location?.longitude ? parseFloat(data.location.longitude) : undefined,
      timezone: data.timezone,
      url: data.url,
      images: data.images,
      capacity: data.generalInfo?.generalRule,
    }));
    
    const result = await this.processVenuesInParallel(
      venues.map(v => ({ venue: v } as ShowData)),
      {}
    );
    
    // Update show links
    for (const [tmVenueId, dbVenueId] of result.venueMap.entries()) {
      await db.execute(sql`
        UPDATE ${shows}
        SET venue_id = ${dbVenueId}
        WHERE raw_data::jsonb -> '_embedded' -> 'venues' -> 0 ->> 'id' = ${tmVenueId}
          AND venue_id IS NULL
      `);
    }
    
    return {
      venuesCreated: result.created,
      venuesUpdated: result.updated,
    };
  }
}