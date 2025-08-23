import { Job } from "bullmq";
import { db, artists, shows } from "@repo/database";
import { eq, sql, desc } from "drizzle-orm";
import { RedisClientFactory } from "../redis-config";

const cache = RedisClientFactory.getClient('cache');

export interface ScheduledSyncJobData {
  type: 'active' | 'trending' | 'stale' | 'new' | 'all';
  limit?: number;
  deep?: boolean;
  options?: any;
}

export class ScheduledSyncProcessor {
  static async process(job: Job<ScheduledSyncJobData>) {
    return await processScheduledSync(job);
  }
}

export async function processScheduledSync(job: Job<ScheduledSyncJobData>) {
  const { type, limit = 50, deep = false, options } = job.data;
  
  try {
    await job.log(`Starting scheduled ${type} sync...`);
    await job.updateProgress(10);
    
    let artistsToSync: any[] = [];
    
    switch (type) {
      case 'active':
        artistsToSync = await getActiveArtists(limit);
        break;
      
      case 'trending':
        artistsToSync = await getTrendingArtists(limit);
        break;
      
      case 'stale':
        artistsToSync = await getStaleArtists(limit);
        break;
      
      case 'new':
        artistsToSync = await getNewArtists(limit);
        break;
      
      case 'all':
        artistsToSync = await getAllArtists(limit);
        break;
      
      default:
        throw new Error(`Unknown sync type: ${type}`);
    }
    
    await job.updateProgress(30);
    await job.log(`Found ${artistsToSync.length} artists to sync`);
    
    if (artistsToSync.length === 0) {
      return {
        success: true,
        type,
        artistCount: 0,
      };
    }
    
    // Queue sync jobs for each artist
    const jobs: Promise<any>[] = [];
    
    // Import queue manager dynamically to avoid circular dependency
    const { queueManager, QueueName, Priority } = await import("../queue-manager");
    const priority = deep ? Priority.LOW : Priority.NORMAL;
    
    for (const artist of artistsToSync) {
      // Queue Spotify sync if we have Spotify ID
      if (artist.spotifyId) {
        jobs.push(
          queueManager.addJob(
            QueueName.SPOTIFY_SYNC,
            `scheduled-spotify-${artist.id}`,
            {
              artistId: artist.id,
              spotifyId: artist.spotifyId,
              syncType: deep ? 'full' : 'profile',
            },
            { priority, delay: Math.random() * 10000 } // Random delay up to 10s
          )
        );
      }
      
      // Queue Ticketmaster sync if we have TM ID
      if (artist.tmAttractionId) {
        jobs.push(
          queueManager.addJob(
            QueueName.TICKETMASTER_SYNC,
            `scheduled-tm-${artist.id}`,
            {
              artistId: artist.id,
              tmAttractionId: artist.tmAttractionId,
              syncType: 'shows',
            },
            { priority, delay: Math.random() * 10000 }
          )
        );
      }
      
      // Queue deep catalog sync for trending artists
      if (type === 'trending' && deep && artist.spotifyId) {
        jobs.push(
          queueManager.addJob(
            QueueName.SPOTIFY_CATALOG,
            `scheduled-catalog-${artist.id}`,
            {
              artistId: artist.id,
              spotifyId: artist.spotifyId,
              deep: true,
            },
            { priority: Priority.BACKGROUND, delay: 30000 + Math.random() * 30000 }
          )
        );
      }
    }
    
    await Promise.all(jobs);
    
    await job.updateProgress(90);
    
    // Update last sync timestamp
    const artistIds = artistsToSync.map(a => a.id);
    await db.execute(sql`
      UPDATE ${artists}
      SET scheduled_sync_at = CURRENT_TIMESTAMP
      WHERE id IN (SELECT unnest(${artistIds}::uuid[]))
    `);
    
    await job.updateProgress(100);
    await job.log(`Scheduled sync completed: ${jobs.length} jobs queued`);
    
    return {
      success: true,
      type,
      artistCount: artistsToSync.length,
      jobsQueued: jobs.length,
    };
    
  } catch (error) {
    console.error("Scheduled sync failed:", error);
    throw error;
  }
}

async function getActiveArtists(limit: number) {
  // Get artists with upcoming shows
  const result = await db.execute(sql`
    SELECT 
      a.id,
      a.spotify_id,
      a.tm_attraction_id,
      a.name,
      COUNT(s.id) as upcoming_show_count,
      MIN(s.date) as next_show_date
    FROM ${artists} a
    JOIN ${shows} s ON s.headliner_artist_id = a.id
    WHERE s.date >= CURRENT_DATE
      AND s.date <= CURRENT_DATE + INTERVAL '90 days'
      AND (a.last_synced_at IS NULL OR a.last_synced_at < CURRENT_DATE - INTERVAL '6 hours')
    GROUP BY a.id
    ORDER BY upcoming_show_count DESC, next_show_date ASC
    LIMIT ${limit}
  `);
  
  return (result as any).rows || [];
}

async function getTrendingArtists(limit: number) {
  // Get trending artists from cache first
  const cached = await cache.get<any[]>('trending:daily');
  
  if (cached && cached.length > 0) {
    const artistIds = cached.slice(0, limit).map(a => a.id);
    
    const result = await db
      .select({
        id: artists.id,
        spotifyId: artists.spotifyId,
        tmAttractionId: artists.tmAttractionId,
        name: artists.name,
      })
      .from(artists)
      .where(sql`${artists.id} IN (SELECT unnest(${artistIds}::uuid[]))`);
    
    return result;
  }
  
  // Fallback to database query
  return await db
    .select({
      id: artists.id,
      spotifyId: artists.spotifyId,
      tmAttractionId: artists.tmAttractionId,
      name: artists.name,
    })
    .from(artists)

    .where(sql`${artists.trendingScore} > 0`)
    .orderBy(desc(artists.trendingScore))
    .limit(limit);
}

async function getStaleArtists(limit: number) {
  // Get artists that haven't been synced in a while
  const result = await db.execute(sql`
    SELECT 
      id,
      spotify_id,
      tm_attraction_id,
      name,
      last_synced_at,
      popularity
    FROM ${artists}
    WHERE spotify_id IS NOT NULL
      AND (
        last_synced_at IS NULL 
        OR last_synced_at < CURRENT_DATE - INTERVAL '7 days'
      )
    ORDER BY 
      last_synced_at ASC NULLS FIRST,
      popularity DESC
    LIMIT ${limit}
  `);
  
  return (result as any).rows || [];
}

async function getNewArtists(limit: number) {
  // Get recently added artists that need initial sync
  const result = await db.execute(sql`
    SELECT 
      id,
      spotify_id,
      tm_attraction_id,
      name,
      created_at
    FROM ${artists}
    WHERE created_at >= CURRENT_DATE - INTERVAL '24 hours'
      AND (spotify_id IS NOT NULL OR tm_attraction_id IS NOT NULL)
      AND (
        song_catalog_synced_at IS NULL
        OR total_songs = 0
        OR total_shows = 0
      )
    ORDER BY created_at DESC
    LIMIT ${limit}
  `);
  
  return (result as any).rows || [];
}

async function getAllArtists(limit: number) {
  // Get a mix of all types
  const result = await db.execute(sql`
    WITH artist_priority AS (
      SELECT 
        a.*,
        CASE
          -- Highest priority: trending with upcoming shows
          WHEN a.is_trending = true AND EXISTS (
            SELECT 1 FROM ${shows} s 
            WHERE s.headliner_artist_id = a.id 
            AND s.date >= CURRENT_DATE
          ) THEN 1
          
          -- High priority: has upcoming shows
          WHEN EXISTS (
            SELECT 1 FROM ${shows} s 
            WHERE s.headliner_artist_id = a.id 
            AND s.date >= CURRENT_DATE
          ) THEN 2
          
          -- Medium priority: trending
          WHEN a.is_trending = true THEN 3
          
          -- Low priority: popular but not recently synced
          WHEN a.popularity > 50 
            AND (a.last_synced_at IS NULL OR a.last_synced_at < CURRENT_DATE - INTERVAL '3 days')
          THEN 4
          
          -- Lowest priority: everything else
          ELSE 5
        END as priority_level
      FROM ${artists} a
      WHERE a.spotify_id IS NOT NULL
        OR a.tm_attraction_id IS NOT NULL
    )
    SELECT 
      id,
      spotify_id,
      tm_attraction_id,
      name,
      priority_level
    FROM artist_priority
    ORDER BY 
      priority_level ASC,
      last_synced_at ASC NULLS FIRST
    LIMIT ${limit}
  `);
  
  return (result as any).rows || [];
}