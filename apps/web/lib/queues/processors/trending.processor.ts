import { Job } from "bullmq";
import { db, artists, shows, votes } from "@repo/database";
import { sql } from "drizzle-orm";
import { RedisCache } from "../redis-config";

let _cache: RedisCache | null = null;
function getCache(): RedisCache {
  if (!_cache) _cache = new RedisCache();
  return _cache;
}

export interface TrendingCalcJobData {
  timeframe: 'hourly' | 'daily' | 'weekly' | 'monthly';
  limit?: number;
}

export async function processTrendingCalc(job: Job<TrendingCalcJobData>) {
  const { timeframe, limit = 50 } = job.data;
  
  try {
    await job.log(`Calculating ${timeframe} trending artists...`);
    await job.updateProgress(10);
    
    const timeRange = getTimeRange(timeframe);
    
    // Calculate trending based on multiple factors
    const trendingData = await db.execute(sql`
      WITH artist_metrics AS (
        SELECT 
          a.id,
          a.name,
          a.slug,
          a.image_url,
          a.popularity as spotify_popularity,
          a.followers,
          
          -- Recent votes
          COALESCE((
            SELECT COUNT(*)
            FROM ${votes} v
            JOIN setlist_songs ss ON v.setlist_song_id = ss.id
            JOIN setlists s ON ss.setlist_id = s.id
            WHERE s.artist_id = a.id
              AND v.created_at >= ${timeRange}
          ), 0) as recent_votes,
          
          -- Upcoming shows
          COALESCE((
            SELECT COUNT(*)
            FROM ${shows} sh
            WHERE sh.headliner_artist_id = a.id
              AND sh.date >= CURRENT_DATE
              AND sh.date <= CURRENT_DATE + INTERVAL '90 days'
          ), 0) as upcoming_shows,
          
          -- Total shows
          COALESCE((
            SELECT COUNT(*)
            FROM ${shows} sh
            WHERE sh.headliner_artist_id = a.id
          ), 0) as total_shows,
          
          -- Page views (would need analytics integration)
          COALESCE(a.view_count, 0) as view_count,
          
          -- Last activity
          GREATEST(
            a.last_synced_at,
            a.song_catalog_synced_at,
            a.updated_at
          ) as last_activity
        FROM ${artists} a
        WHERE a.spotify_id IS NOT NULL
      ),
      trending_scores AS (
        SELECT 
          *,
          -- Calculate trending score
          (
            (recent_votes * 10) +                    -- Weight recent engagement heavily
            (upcoming_shows * 5) +                    -- Upcoming shows are important
            (spotify_popularity * 2) +               -- Spotify popularity as baseline
            (LEAST(followers / 10000, 100)) +        -- Follower count (capped)
            (view_count * 3) +                        -- Page views
            (CASE 
              WHEN last_activity >= CURRENT_DATE - INTERVAL '7 days' THEN 20
              WHEN last_activity >= CURRENT_DATE - INTERVAL '30 days' THEN 10
              ELSE 0
            END)                                      -- Recent activity bonus
          ) as trending_score
        FROM artist_metrics
      )
      SELECT 
        id,
        name,
        slug,
        image_url,
        spotify_popularity,
        followers,
        recent_votes,
        upcoming_shows,
        total_shows,
        view_count,
        trending_score,
        last_activity
      FROM trending_scores
      WHERE trending_score > 0
      ORDER BY trending_score DESC
      LIMIT ${limit}
    `);
    
    await job.updateProgress(50);
    
    const trendingArtists = (trendingData as any).rows || [];
    
    // Store in cache
    const cacheKey = `trending:${timeframe}`;
    await getCache().set(cacheKey, trendingArtists, getCacheTTL(timeframe));
    
    // Store individual artist trending data
    for (const artist of trendingArtists) {
      const artistCacheKey = `trending:artist:${artist.id}:${timeframe}`;
      await getCache().set(artistCacheKey, {
        score: artist.trending_score,
        rank: trendingArtists.indexOf(artist) + 1,
        metrics: {
          recentVotes: artist.recent_votes,
          upcomingShows: artist.upcoming_shows,
          spotifyPopularity: artist.spotify_popularity,
          followers: artist.followers,
        },
      }, getCacheTTL(timeframe));
    }
    
    await job.updateProgress(80);
    
    // Update trending status in database
    const trendingIds = trendingArtists.map((a: any) => a.id);
    
    if (trendingIds.length > 0) {
      // Mark as trending
      await db.execute(sql`
        UPDATE ${artists}
        SET 
          is_trending = true,
          trending_score = subquery.trending_score,
          trending_updated_at = CURRENT_TIMESTAMP
        FROM (
          SELECT 
            unnest(${trendingIds}::uuid[]) as id,
            unnest(${trendingArtists.map((a: any) => a.trending_score)}::int[]) as trending_score
        ) as subquery
        WHERE ${artists}.id = subquery.id
      `);
      
      // Mark others as not trending
      await db.execute(sql`
        UPDATE ${artists}
        SET is_trending = false
        WHERE id NOT IN (SELECT unnest(${trendingIds}::uuid[]))
          AND is_trending = true
      `);
    }
    
    await job.updateProgress(100);
    await job.log(`Trending calculation completed: ${trendingArtists.length} artists identified`);
    
    return {
      success: true,
      timeframe,
      artistCount: trendingArtists.length,
      topArtists: trendingArtists.slice(0, 10).map((a: any) => ({
        id: a.id,
        name: a.name,
        score: a.trending_score,
      })),
    };
    
  } catch (error) {
    console.error("Trending calculation failed:", error);
    throw error;
  }
}

function getTimeRange(timeframe: string): Date {
  const now = new Date();
  
  switch (timeframe) {
    case 'hourly':
      return new Date(now.getTime() - 60 * 60 * 1000);
    case 'daily':
      return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    case 'weekly':
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case 'monthly':
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    default:
      return new Date(now.getTime() - 24 * 60 * 60 * 1000);
  }
}

function getCacheTTL(timeframe: string): number {
  switch (timeframe) {
    case 'hourly':
      return 3600; // 1 hour
    case 'daily':
      return 3600 * 6; // 6 hours
    case 'weekly':
      return 3600 * 24; // 24 hours
    case 'monthly':
      return 3600 * 24 * 3; // 3 days
    default:
      return 3600; // 1 hour
  }
}