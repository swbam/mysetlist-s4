import { Job } from "bullmq";
import { db, venues, shows } from "@repo/database";
import { eq, sql, inArray } from "drizzle-orm";
import { TicketmasterClient } from "@repo/external-apis";
import { RedisClientFactory } from "../redis-config";

const cache = RedisClientFactory.getClient('cache');

export interface VenueSyncJobData {
  artistId?: string;
  venueIds?: string[];
  tmVenueIds?: string[];
  syncAll?: boolean;
  parentJobId?: string;
}

export async function processVenueSync(job: Job<VenueSyncJobData>) {
  const { artistId, venueIds, tmVenueIds, syncAll, parentJobId } = job.data;
  
  try {
    await job.log("Starting venue sync...");
    await job.updateProgress(10);
    
    if (syncAll) {
      return await syncAllVenues(job);
    } else if (tmVenueIds && tmVenueIds.length > 0) {
      return await syncSpecificVenues(tmVenueIds, job);
    } else if (artistId) {
      return await syncArtistVenues(artistId, job);
    } else if (venueIds && venueIds.length > 0) {
      return await updateVenueDetails(venueIds, job);
    } else {
      throw new Error("No venue sync parameters provided");
    }
    
  } catch (error) {
    console.error("Venue sync failed:", error);
    throw error;
  }
}

async function syncAllVenues(job: Job) {
  await job.updateProgress(20);
  
  // Get all shows with missing venue links
  const showsWithoutVenues = await db.execute(sql`
    SELECT DISTINCT 
      raw_data::jsonb -> '_embedded' -> 'venues' -> 0 as venue_data,
      COUNT(*) as show_count
    FROM ${shows}
    WHERE venueId IS NULL
      AND raw_data::jsonb -> '_embedded' -> 'venues' -> 0 IS NOT NULL
    GROUP BY raw_data::jsonb -> '_embedded' -> 'venues' -> 0
    ORDER BY show_count DESC
    LIMIT 100
  `);
  
  const venueDataList = (showsWithoutVenues as any).rows || [];
  
  if (venueDataList.length === 0) {
    await job.log("No venues to sync");
    return {
      success: true,
      venuesCreated: 0,
      venuesUpdated: 0,
      venuesLinked: 0,
    };
  }
  
  await job.updateProgress(40);
  await job.log(`Found ${venueDataList.length} venues to process`);
  
  let created = 0;
  let updated = 0;
  let linked = 0;
  
  for (let i = 0; i < venueDataList.length; i++) {
    const { venue_data: venueData, show_count } = venueDataList[i];
    
    if (!venueData || !venueData.id) continue;
    
    // Check if venue exists
    const existing = await db
      .select()
      .from(venues)
      .where(eq(venues.tmVenueId, venueData.id))
      .limit(1);
    
    let venueId: string;
    
    if (existing.length === 0) {
      // Create new venue
      const [newVenue] = await db
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
        } as any)
        .returning({ id: venues.id });
      
      if (!newVenue) {
        throw new Error(`Failed to create venue: ${venueData.name}`);
      }
      
      venueId = newVenue.id;
      created++;
    } else {
      if (!existing[0]) {
        throw new Error(`Failed to find existing venue: ${venueData.name}`);
      }
      venueId = existing[0].id;
      updated++;
    }
    
    // Link venue to shows
    const result = await db.execute(sql`
      UPDATE ${shows}
      SET venueId = ${venueId}
      WHERE raw_data::jsonb -> '_embedded' -> 'venues' -> 0 ->> 'id' = ${venueData.id}
        AND venueId IS NULL
    `);
    
    linked += show_count;
    
    const progress = 40 + (i / venueDataList.length) * 50;
    await job.updateProgress(progress);
  }
  
  await job.updateProgress(100);
  await job.log(`Venue sync completed: ${created} created, ${updated} existing, ${linked} shows linked`);
  
  return {
    success: true,
    venuesCreated: created,
    venuesUpdated: updated,
    venuesLinked: linked,
  };
}

async function syncSpecificVenues(tmVenueIds: string[], job: Job) {
  await job.updateProgress(20);
  
  const ticketmaster = new TicketmasterClient({
    apiKey: process.env['TICKETMASTER_API_KEY'] || "",
  });
  
  let created = 0;
  let updated = 0;
  
  for (let i = 0; i < tmVenueIds.length; i++) {
    const tmVenueId = tmVenueIds[i];
    
    if (!tmVenueId) {
      continue;
    }
    
    try {
      // Check cache first
      const cacheKey = `venue:${tmVenueId}`;
      let venueData = await cache.get<any>(cacheKey);
      
      if (!venueData) {
        // Fetch from Ticketmaster
        venueData = await ticketmaster.getVenue(tmVenueId);
        
        if (venueData) {
          await cache.set(cacheKey, venueData, 3600); // Cache for 1 hour
        }
      }
      
      if (!venueData) {
        await job.log(`Venue not found: ${tmVenueId}`);
        continue;
      }
      
      // Check if exists in database
      const existing = await db
        .select()
        .from(venues)
        .where(eq(venues.tmVenueId, tmVenueId))
        .limit(1);
      
      if (existing.length === 0) {
        // Create venue
        await db
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
            capacity: venueData.boxOfficeInfo?.phoneNumberDetail || null,
            } as any);
        
        created++;
      } else {
        // Update venue
        await db
          .update(venues)
          .set({
            name: venueData.name,
            city: venueData.city?.name || null,
            state: venueData.state?.stateCode || venueData.state?.name || null,
            imageUrl: venueData.images?.[0]?.url || null,
            updatedAt: new Date(),
          })
          .where(eq(venues.tmVenueId, tmVenueId));
        
        updated++;
      }
      
    } catch (error) {
      await job.log(`Failed to sync venue ${tmVenueId}: ${error.message}`);
    }
    
    const progress = 20 + (i / tmVenueIds.length) * 70;
    await job.updateProgress(progress);
  }
  
  await job.updateProgress(100);
  await job.log(`Specific venue sync completed: ${created} created, ${updated} updated`);
  
  return {
    success: true,
    venuesCreated: created,
    venuesUpdated: updated,
  };
}

async function syncArtistVenues(artistId: string, job: Job) {
  await job.updateProgress(20);
  
  // Get all unique venues for artist's shows
  const artistVenues = await db.execute(sql`
    SELECT DISTINCT
      v.id,
      v.tm_venueId,
      v.name,
      COUNT(s.id) as show_count
    FROM ${shows} s
    LEFT JOIN ${venues} v ON s.venueId = v.id
    WHERE s.artistId = ${artistId}
      AND v.id IS NOT NULL
    GROUP BY v.id, v.tm_venueId, v.name
    ORDER BY show_count DESC
  `);
  
  const venueList = (artistVenues as any).rows || [];
  
  if (venueList.length === 0) {
    await job.log("No venues found for artist");
    return {
      success: true,
      artistId,
      venuesFound: 0,
    };
  }
  
  await job.updateProgress(50);
  
  // Update venue details if needed
  const venueIds = venueList.map((v: any) => v.id);
  const result = await updateVenueDetails(venueIds, job);
  
  await job.updateProgress(100);
  await job.log(`Artist venue sync completed: ${venueList.length} venues found`);
  
  return {
    success: true,
    artistId,
    venuesFound: venueList.length,
    ...result,
  };
}

async function updateVenueDetails(venueIds: string[], job: Job) {
  await job.updateProgress(30);
  
  // Get venues that need updating
  const venuesToUpdate = await db
    .select()
    .from(venues)
    .where(inArray(venues.id, venueIds));
  
  let updated = 0;
  
  for (const venue of venuesToUpdate) {
    // Check if venue needs update (older than 30 days)
    const lastUpdated = venue.updatedAt || venue.createdAt;
    const daysSinceUpdate = lastUpdated
      ? (Date.now() - new Date(lastUpdated).getTime()) / (1000 * 60 * 60 * 24)
      : Infinity;
    
    if (daysSinceUpdate > 30 && venue.tmVenueId) {
      try {
        const ticketmaster = new TicketmasterClient({
          apiKey: process.env['TICKETMASTER_API_KEY'] || "",
        });
        
        const venueData = await ticketmaster.getVenue(venue.tmVenueId);
        
        if (venueData) {
          await db
            .update(venues)
            .set({
              name: venueData.name,
              city: venueData.city?.name || venue.city,
              state: venueData.state?.stateCode || venueData.state?.name || venue.state,
              imageUrl: venueData.images?.[0]?.url || venue.imageUrl,
              updatedAt: new Date(),
            })
            .where(eq(venues.id, venue.id));
          
          updated++;
        }
      } catch (error) {
        await job.log(`Failed to update venue ${venue.id}: ${error.message}`);
      }
    }
  }
  
  await job.updateProgress(100);
  
  return {
    venuesUpdated: updated,
  };
}

export default class VenueSyncProcessor {
  static async process(job: Job): Promise<any> {
    return processVenueSync(job);
  }
}