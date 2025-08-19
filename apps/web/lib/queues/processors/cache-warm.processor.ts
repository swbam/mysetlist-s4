import { Job } from "bullmq";
import { db, artists, shows, songs } from "@repo/database";
import { sql, desc, eq } from "drizzle-orm";
import { RedisCache } from "../redis-config";

const cache = new RedisCache();

export interface CacheWarmJobData {
  type: 'trending' | 'popular' | 'recent' | 'artist_details' | 'search_results';
  entityId?: string;
  query?: string;
  limit?: number;
}

export async function processCacheWarm(job: Job<CacheWarmJobData>) {
  const { type, entityId, query, limit = 50 } = job.data;
  
  try {
    await job.log(`Warming cache for ${type}`);
    await job.updateProgress(10);
    
    switch (type) {
      case 'trending':
        await warmTrendingCache(limit);
        break;
      
      case 'popular':
        await warmPopularCache(limit);
        break;
      
      case 'recent':
        await warmRecentCache(limit);
        break;
      
      case 'artist_details':
        if (!entityId) throw new Error("Artist ID required for artist_details cache warming");
        await warmArtistDetailsCache(entityId);
        break;
      
      case 'search_results':
        if (!query) throw new Error("Query required for search_results cache warming");
        await warmSearchResultsCache(query, limit);
        break;
      
      default:
        throw new Error(`Unknown cache warm type: ${type}`);
    }
    
    await job.updateProgress(100);
    await job.log(`Cache warming completed for ${type}`);
    
    return {
      success: true,
      type,
      entityId,
      query,
    };
    
  } catch (error) {
    console.error(`Cache warming failed for ${type}:`, error);
    throw error;
  }
}

async function warmTrendingCache(limit: number) {
  // Get trending artists
  const trendingArtists = await db.execute(sql`
    SELECT 
      id, name, slug, image_url, popularity, followers, trending_score
    FROM ${artists}
    WHERE is_trending = true
    ORDER BY trending_score DESC
    LIMIT ${limit}
  `);
  
  // Cache trending artists list
  await cache.set('trending:artists', (trendingArtists as any).rows, 3600); // 1 hour
  
  // Cache individual artist trending data
  for (const artist of (trendingArtists as any).rows) {
    await cache.set(`trending:artist:${artist.id}`, artist, 3600);
  }
}

async function warmPopularCache(limit: number) {
  // Get most popular artists
  const popularArtists = await db
    .select({
      id: artists.id,
      name: artists.name,
      slug: artists.slug,
      imageUrl: artists.imageUrl,
      popularity: artists.popularity,
      followers: artists.followers,
    })
    .from(artists)
    .where(sql`${artists.popularity} > 0`)
    .orderBy(desc(artists.popularity))
    .limit(limit);
  
  await cache.set('popular:artists', popularArtists, 7200); // 2 hours
}

async function warmRecentCache(limit: number) {
  // Get recently added artists
  const recentArtists = await db
    .select({
      id: artists.id,
      name: artists.name,
      slug: artists.slug,
      imageUrl: artists.imageUrl,
      createdAt: artists.createdAt,
    })
    .from(artists)
    .orderBy(desc(artists.createdAt))
    .limit(limit);
  
  await cache.set('recent:artists', recentArtists, 1800); // 30 minutes
  
  // Get recent shows
  const recentShows = await db.execute(sql`
    SELECT 
      s.id, s.name, s.date, s.image_url,
      a.name as artist_name, a.slug as artist_slug,
      v.name as venue_name, v.city, v.state
    FROM ${shows} s
    JOIN ${artists} a ON s.headliner_artist_id = a.id
    LEFT JOIN venues v ON s.venue_id = v.id
    WHERE s.date >= CURRENT_DATE - INTERVAL '30 days'
    ORDER BY s.date DESC
    LIMIT ${limit}
  `);
  
  await cache.set('recent:shows', (recentShows as any).rows, 1800); // 30 minutes
}

async function warmArtistDetailsCache(artistId: string) {
  // Get artist with detailed information
  const [artist] = await db
    .select()
    .from(artists)
    .where(eq(artists.id, artistId))
    .limit(1);
  
  if (!artist) {
    throw new Error(`Artist not found: ${artistId}`);
  }
  
  // Cache artist details
  await cache.set(`artist:details:${artistId}`, artist, 3600); // 1 hour
  
  // Get and cache artist's upcoming shows
  const upcomingShows = await db.execute(sql`
    SELECT 
      s.*, 
      v.name as venue_name, v.city, v.state, v.country
    FROM ${shows} s
    LEFT JOIN venues v ON s.venue_id = v.id
    WHERE s.headliner_artist_id = ${artistId}
      AND s.date >= CURRENT_DATE
    ORDER BY s.date ASC
    LIMIT 20
  `);
  
  await cache.set(`artist:shows:upcoming:${artistId}`, (upcomingShows as any).rows, 1800);
  
  // Get and cache artist's top songs
  const topSongs = await db.execute(sql`
    SELECT 
      s.id, s.title, s.popularity, s.spotify_id
    FROM ${songs} s
    WHERE s.artist_id = ${artistId}
      AND s.popularity > 0
    ORDER BY s.popularity DESC
    LIMIT 10
  `);
  
  await cache.set(`artist:songs:top:${artistId}`, (topSongs as any).rows, 7200);
}

async function warmSearchResultsCache(query: string, limit: number) {
  const searchKey = `search:${query.toLowerCase().replace(/\s+/g, '_')}`;
  
  // Search artists
  const artistResults = await db.execute(sql`
    SELECT 
      id, name, slug, image_url, popularity
    FROM ${artists}
    WHERE 
      name ILIKE ${`%${query}%`}
      OR slug ILIKE ${`%${query.replace(/\s+/g, '-')}%`}
    ORDER BY 
      CASE 
        WHEN name ILIKE ${query} THEN 1
        WHEN name ILIKE ${`${query}%`} THEN 2
        ELSE 3
      END,
      popularity DESC
    LIMIT ${limit}
  `);
  
  await cache.set(`${searchKey}:artists`, (artistResults as any).rows, 1800);
  
  // Search songs
  const songResults = await db.execute(sql`
    SELECT 
      s.id, s.title, s.popularity,
      a.name as artist_name, a.slug as artist_slug
    FROM ${songs} s
    JOIN ${artists} a ON s.artist_id = a.id
    WHERE s.title ILIKE ${`%${query}%`}
    ORDER BY s.popularity DESC
    LIMIT ${limit}
  `);
  
  await cache.set(`${searchKey}:songs`, (songResults as any).rows, 1800);
}

// Helper function to queue cache warming
export async function queueCacheWarm(
  type: CacheWarmJobData['type'],
  options?: {
    entityId?: string;
    query?: string;
    limit?: number;
    delay?: number;
  }
) {
  const { queueManager, QueueName } = await import("../queue-manager");
  
  return await queueManager.addJob(
    QueueName.CACHE_WARM,
    `cache-warm-${type}-${Date.now()}`,
    {
      type,
      entityId: options?.entityId,
      query: options?.query,
      limit: options?.limit || 50,
    },
    {
      priority: 30, // Low priority
      delay: options?.delay || 0,
      removeOnComplete: { count: 20 },
      removeOnFail: { count: 10 },
    }
  );
}