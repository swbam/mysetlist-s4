import { Job } from "bullmq";
import { EnhancedShowVenueSync } from "@repo/external-apis/src/services/enhanced-show-venue-sync";
import { TicketmasterClient } from "@repo/external-apis";
import { db, artists, shows, venues } from "@repo/database";
import { eq, sql } from "drizzle-orm";
import { updateImportStatus } from "../../import-status";
import { RedisCache } from "../redis-config";
import { queueManager, QueueName } from "../queue-manager";

const cache = new RedisCache();

export interface TicketmasterSyncJobData {
  artistId: string;
  tmAttractionId: string;
  syncType: 'shows' | 'venues' | 'full';
  parentJobId?: string;
  options?: {
    includePast?: boolean;
    maxShows?: number;
  };
}

export async function processTicketmasterSync(job: Job<TicketmasterSyncJobData>) {
  const { artistId, tmAttractionId, syncType, parentJobId, options } = job.data;
  
  try {
    await job.log(`Starting Ticketmaster ${syncType} sync for artist ${artistId}`);
    await job.updateProgress(10);
    
    const syncService = new EnhancedShowVenueSync();
    
    switch (syncType) {
      case 'shows':
        return await syncShows(syncService, artistId, tmAttractionId, job, options);
      
      case 'venues':
        return await syncVenues(artistId, job);
      
      case 'full':
        return await syncFull(syncService, artistId, tmAttractionId, job, options, parentJobId);
      
      default:
        throw new Error(`Unknown sync type: ${syncType}`);
    }
    
  } catch (error) {
    console.error(`Ticketmaster sync failed for ${artistId}:`, error);
    
    if (parentJobId) {
      await updateImportStatus(parentJobId, {
        stage: "importing-shows",
        progress: 40,
        message: `Show sync failed: ${(error as any).message}`,
        error: (error as any).message,
      });
    }
    
    throw error;
  }
}

async function syncShows(
  syncService: EnhancedShowVenueSync,
  artistId: string,
  tmAttractionId: string,
  job: Job,
  options?: any
) {
  await job.updateProgress(20);
  
  // Get artist details
  const [artist] = await db
    .select()
    .from(artists)
    .where(eq(artists.id, artistId))
    .limit(1);
  
  if (!artist) {
    throw new Error(`Artist not found: ${artistId}`);
  }
  
  // Fetch shows from Ticketmaster
  const ticketmaster = new TicketmasterClient({
    apiKey: process.env.TICKETMASTER_API_KEY || "",
  });
  
  await job.updateProgress(30);
  
<<<<<<< HEAD
  const size = options?.maxShows || 200;
  const includePast = options?.includePast || false;

  // Use searchEvents filtered by attractionId and optional time window
  const page1 = await ticketmaster.searchEvents({
    attractionId: tmAttractionId,
    size,
    sort: includePast ? "date,desc" : "date,asc",
  });

  const showsData = page1._embedded?.events ?? [];

  if (showsData.length === 0) {
=======
  const result = await ticketmaster.searchEvents({
    attractionId: tmAttractionId,
    size: options?.maxShows || 200,
    classificationName: "Music",
  });
  
  const events = result._embedded?.events || [];
  
  if (!events || events.length === 0) {
>>>>>>> 69298ab10d2daa951cf0a99e0314185dbc0f1de3
    await job.log("No shows found for artist");
    return {
      success: true,
      artistId,
      totalShows: 0,
      upcomingShows: 0,
      pastShows: 0,
    };
  }
  
  await job.updateProgress(50);
  
<<<<<<< HEAD
=======
  const showsData = events;
>>>>>>> 69298ab10d2daa951cf0a99e0314185dbc0f1de3
  const now = new Date();
  
  // Save shows to database
  const showRecords = showsData.map((show: any) => ({
    tmEventId: show.id,
    headlinerArtistId: artistId,
    name: show.name,
    date: new Date(show.dates?.start?.dateTime || show.dates?.start?.localDate),
<<<<<<< HEAD
    timezone: (show as any).dates?.timezone || null,
    status: (show as any).dates?.status?.code || 'upcoming',
    minPrice: (show as any).priceRanges?.[0]?.min || null,
    maxPrice: (show as any).priceRanges?.[0]?.max || null,
=======
    timezone: show.dates?.timezone || null,
    status: show.dates?.status?.code || 'scheduled',
    minPrice: show.priceRanges?.[0]?.min || null,
    maxPrice: show.priceRanges?.[0]?.max || null,
>>>>>>> 69298ab10d2daa951cf0a99e0314185dbc0f1de3
    ticketUrl: show.url || null,
    imageUrl: show.images?.[0]?.url || null,
    smallImageUrl: show.images?.[2]?.url || null,
    seatmapUrl: (show as any).seatmap?.staticUrl || null,
    rawData: JSON.stringify(show),
  }));
  
  await job.updateProgress(70);
  
  // Batch insert shows
  const batchSize = 20;
  for (let i = 0; i < showRecords.length; i += batchSize) {
    const batch = showRecords.slice(i, i + batchSize);
    
    await db
      .insert(shows)
      .values(batch as any)
      .onConflictDoUpdate({
        target: shows.tmEventId,
        set: {
          name: sql`EXCLUDED.name`,
          date: sql`EXCLUDED.date`,
          status: sql`EXCLUDED.status`,
          minPrice: sql`EXCLUDED.min_price`,
          maxPrice: sql`EXCLUDED.max_price`,
          updatedAt: new Date(),
        },
      });
    
    const progress = 70 + (i / showRecords.length) * 20;
    await job.updateProgress(progress);
  }
  
  // Extract venue IDs for venue sync
  const venueIds = new Set<string>();
  showsData.forEach((show: any) => {
    if (show._embedded?.venues?.[0]?.id) {
      venueIds.add(show._embedded.venues[0].id);
    }
  });
  
  // Queue venue sync if we have venues
  if (venueIds.size > 0) {
    await queueManager.addJob(
      QueueName.VENUE_SYNC,
      `venue-sync-${artistId}`,
      {
        artistId,
        tmVenueIds: Array.from(venueIds),
      },
      { priority: 15, delay: 2000 }
    );
  }
  
  await job.updateProgress(100);
  
  const upcomingShows = showRecords.filter(s => s.date >= now).length;
  const pastShows = showRecords.filter(s => s.date < now).length;
  
  await job.log(`Shows sync completed: ${showRecords.length} shows (${upcomingShows} upcoming, ${pastShows} past)`);
  
  return {
    success: true,
    artistId,
    totalShows: showRecords.length,
    upcomingShows,
    pastShows,
    venueIds: venueIds.size,
  };
}

async function syncVenues(artistId: string, job: Job) {
  await job.updateProgress(20);
  
  // Get shows with missing venue links
  const showsWithoutVenues = await db.execute(sql`
    SELECT DISTINCT 
      raw_data::jsonb -> '_embedded' -> 'venues' -> 0 as venue_data
    FROM ${shows}
    WHERE headliner_artist_id = ${artistId}
      AND venue_id IS NULL
      AND raw_data::jsonb -> '_embedded' -> 'venues' -> 0 IS NOT NULL
  `);
  
  const venueDataList = (showsWithoutVenues as any).rows
    .map((row: any) => row.venue_data)
    .filter(Boolean);
  
  if (venueDataList.length === 0) {
    await job.log("No venues to sync");
    return {
      success: true,
      artistId,
      venuesCreated: 0,
      venuesUpdated: 0,
    };
  }
  
  await job.updateProgress(40);
  
  let created = 0;
  let updated = 0;
  
  // Process venues
  for (const venueData of venueDataList) {
    const existing = await db
      .select()
      .from(venues)
      .where(eq(venues.tmVenueId, venueData.id))
      .limit(1);
    
    if (existing.length === 0) {
      // Create new venue
      const inserted = await db
        .insert(venues)
        .values({
          tmVenueId: venueData.id,
          name: venueData.name,
          city: venueData.city?.name || null,
          state: venueData.state?.stateCode || venueData.state?.name || null,
          country: venueData.country?.countryCode || venueData.country?.name || null,
          address: venueData.address?.line1 || null,
          postalCode: venueData.postalCode || null,
          latitude: venueData.location?.latitude ? parseFloat(venueData.location.latitude) : null,
          longitude: venueData.location?.longitude ? parseFloat(venueData.location.longitude) : null,
          timezone: venueData.timezone || null,
          url: venueData.url || null,
          imageUrl: venueData.images?.[0]?.url || null,
          capacity: venueData.generalInfo?.generalRule || null,
          rawData: JSON.stringify(venueData),
        } as any)
        .returning();
      
<<<<<<< HEAD
      const newVenue = inserted?.[0];
      if (newVenue?.id) {
        created++;
        // Link venue to shows
        await db.execute(sql`
          UPDATE ${shows}
          SET venue_id = ${newVenue.id}
          WHERE raw_data::jsonb -> '_embedded' -> 'venues' -> 0 ->> 'id' = ${venueData.id}
            AND venue_id IS NULL
        `);
      }
=======
      if (!newVenue) {
        throw new Error(`Failed to create venue: ${venueData.name}`);
      }
      
      created++;
      
      // Link venue to shows
      await db.execute(sql`
        UPDATE ${shows}
        SET venue_id = ${newVenue.id}
        WHERE raw_data::jsonb -> '_embedded' -> 'venues' -> 0 ->> 'id' = ${venueData.id}
          AND venue_id IS NULL
      `);
>>>>>>> 69298ab10d2daa951cf0a99e0314185dbc0f1de3
    } else {
      updated++;
    }
  }
  
  await job.updateProgress(100);
  await job.log(`Venues sync completed: ${created} created, ${updated} existing`);
  
  return {
    success: true,
    artistId,
    venuesCreated: created,
    venuesUpdated: updated,
  };
}

async function syncFull(
  syncService: EnhancedShowVenueSync,
  artistId: string,
  tmAttractionId: string,
  job: Job,
  options?: any,
  parentJobId?: string
) {
  await job.log("Starting full Ticketmaster sync...");
  
  const result = await syncService.syncArtistShowsAndVenues(artistId, {
    ...options,
    onProgress: async (message: string, progress: number) => {
      await job.updateProgress(progress);
      await job.log(message);
      
      if (parentJobId) {
        await updateImportStatus(parentJobId, {
          stage: "importing-shows",
          progress: 30 + (progress * 0.2), // 30-50% of parent job
          message: `Syncing shows: ${message}`,
        });
      }
    },
  });
  
  await job.log(`Full sync completed: ${result.totalShows} shows, ${result.venuesCreated} venues`);
  
  return result;
}