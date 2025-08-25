// MySetlist-S4 Calculate Trending Cron Job Implementation
// File: apps/web/app/api/cron/calculate-trending/route.ts
// REPLACE existing stub with complete implementation

import { db, artists } from "@repo/database";
import { desc, sql } from "drizzle-orm";

import {
  createErrorResponse,
  createSuccessResponse,
  requireCronAuth,
} from "@/lib/api/auth-helpers";

export const dynamic = "force-dynamic";

interface TrendingCalculationResult {
  artistsUpdated: number;
  showsUpdated: number; 
  totalCalculations: number;
  processingTime: number;
  topArtists: Array<{
    id: string;
    name: string;
    score: number;
  }>;
}

export async function POST() {
  try {
    // Authentication check
    await requireCronAuth();

    const startTime = Date.now();
    console.log('🔄 Starting trending calculations...');

    // Initialize result tracking
    const result: TrendingCalculationResult = {
      artistsUpdated: 0,
      showsUpdated: 0,
      totalCalculations: 0,
      processingTime: 0,
      topArtists: [],
    };

    // Step 1: Calculate artist trending scores
    const artistTrendingResult = await calculateArtistTrending();
    result.artistsUpdated = artistTrendingResult.updated;
    result.totalCalculations += artistTrendingResult.calculations;

    console.log(`✅ Updated trending scores for ${result.artistsUpdated} artists`);

    // Step 2: Calculate show trending scores  
    const showTrendingResult = await calculateShowTrending();
    result.showsUpdated = showTrendingResult.updated;
    result.totalCalculations += showTrendingResult.calculations;

    console.log(`✅ Updated trending scores for ${result.showsUpdated} shows`);

    // Step 3: Refresh materialized view for performance
    try {
      await db.execute(sql`SELECT refresh_trending_data();`);
      console.log('✅ Refreshed trending data materialized view');
    } catch (error) {
      console.warn('⚠️ Failed to refresh materialized view (may not exist):', error);
    }

    // Step 4: Get top trending artists for response
    result.topArtists = await getTopTrendingArtists(10);

    result.processingTime = Date.now() - startTime;

    // Log successful completion
    try {
      await db.execute(sql`
        SELECT log_cron_run(
          'calculate-trending', 
          'success',
          ${JSON.stringify(result)}::jsonb
        )
      `);
    } catch (logError) {
      console.error('Failed to log cron run:', logError);
    }

    console.log(`✅ Trending calculations completed in ${result.processingTime}ms`);

    return createSuccessResponse({
      message: "Trending calculations completed",
      result,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error("Trending calculation failed:", error);
    
    // Log error
    try {
      await db.execute(sql`
        SELECT log_cron_run(
          'calculate-trending', 
          'failed',
          ${JSON.stringify({ 
            error: error instanceof Error ? error.message : String(error),
            timestamp: new Date().toISOString(),
          })}::jsonb
        )
      `);
    } catch (logError) {
      console.error('Failed to log error:', logError);
    }

    return createErrorResponse(
      "Trending calculation failed",
      500,
      error instanceof Error ? error.message : "Unknown error"
    );
  }
}

export async function GET() {
  return POST();
}

// Artist trending calculation with sophisticated scoring
async function calculateArtistTrending(): Promise<{
  updated: number;
  calculations: number;
}> {
  try {
    const result = await db.execute(sql`
      WITH artist_metrics AS (
        SELECT 
          a.id as artist_id,
          a.name,
          a.popularity as spotify_popularity,
          
          -- Recent activity metrics (last 7 days)
          COUNT(DISTINCT v.id) FILTER (
            WHERE v.created_at >= NOW() - INTERVAL '7 days'
          ) as recent_votes,
          
          COUNT(DISTINCT uf.user_id) as total_followers,
          
          -- Show metrics
          COUNT(DISTINCT s.id) FILTER (
            WHERE s.date >= NOW() - INTERVAL '30 days'
          ) as recent_shows,
          
          COUNT(DISTINCT s.id) FILTER (
            WHERE s.date >= NOW()
          ) as upcoming_shows,
          
          -- Page view proxy (using recent votes as activity indicator)
          COUNT(DISTINCT v.user_id) FILTER (
            WHERE v.created_at >= NOW() - INTERVAL '3 days'
          ) as recent_active_users,
          
          -- Engagement quality (votes per show)
          CASE 
            WHEN COUNT(DISTINCT s.id) > 0 
            THEN COUNT(DISTINCT v.id)::DECIMAL / COUNT(DISTINCT s.id) 
            ELSE 0 
          END as engagement_ratio,
          
          -- Time-based decay factor for recent activity
          EXTRACT(EPOCH FROM (NOW() - MAX(COALESCE(v.created_at, a.updated_at))))::DECIMAL / 86400 as days_since_activity
          
        FROM artists a
        LEFT JOIN user_follows_artists uf ON uf.artist_id = a.id
        LEFT JOIN shows s ON s.headliner_artist_id = a.id
        LEFT JOIN votes v ON v.artist_id = a.id
        GROUP BY a.id, a.name, a.popularity
      ),
      trending_scores AS (
        SELECT 
          artist_id,
          name,
          -- Weighted scoring algorithm
          (
            -- Recent voting activity (highest weight)
            (recent_votes * 15.0) +
            
            -- Recent user engagement  
            (recent_active_users * 10.0) +
            
            -- Upcoming shows boost
            (upcoming_shows * 8.0) +
            
            -- Recent shows
            (recent_shows * 5.0) +
            
            -- Follower base (moderate weight)
            (LEAST(total_followers, 1000) * 0.1) +
            
            -- Spotify popularity (lower weight, scaled down)
            (COALESCE(spotify_popularity, 0) * 0.5) +
            
            -- Engagement quality bonus
            (engagement_ratio * 3.0) +
            
            -- Recency boost (decay factor)
            CASE 
              WHEN days_since_activity <= 1 THEN 20.0
              WHEN days_since_activity <= 3 THEN 15.0  
              WHEN days_since_activity <= 7 THEN 10.0
              WHEN days_since_activity <= 14 THEN 5.0
              ELSE 0.0
            END
            
          ) as calculated_score,
          
          recent_votes,
          recent_active_users,
          upcoming_shows,
          total_followers
          
        FROM artist_metrics
      )
      UPDATE artists 
      SET 
        trending_score = GREATEST(0, LEAST(1000, trending_scores.calculated_score::INTEGER)),
        updated_at = NOW()
      FROM trending_scores 
      WHERE artists.id = trending_scores.artist_id
      AND (
        -- Only update if score changed significantly (> 5% difference)
        ABS(artists.trending_score - trending_scores.calculated_score) > GREATEST(5, artists.trending_score * 0.05)
        OR artists.trending_score = 0
      )
    `);

    const updated = Array.isArray((result as any).rows) ? (result as any).rows.length : 0;
    return {
      updated,
      calculations: updated,
    };

  } catch (error) {
    console.error('Failed to calculate artist trending scores:', error);
    throw error;
  }
}

// Show trending calculation
async function calculateShowTrending(): Promise<{
  updated: number;
  calculations: number;
}> {
  try {
    const result = await db.execute(sql`
      WITH show_metrics AS (
        SELECT 
          s.id as show_id,
          s.name,
          s.date,
          
          -- Vote-based metrics
          COUNT(DISTINCT v.id) as total_votes,
          COUNT(DISTINCT v.id) FILTER (
            WHERE v.created_at >= NOW() - INTERVAL '7 days'
          ) as recent_votes,
          
          -- Artist popularity factor
          COALESCE(a.trending_score, 0) as artist_trending,
          COALESCE(a.popularity, 0) as artist_spotify_popularity,
          
          -- Time factors
          CASE 
            WHEN s.date IS NULL THEN 30 -- TBD shows get moderate boost
            WHEN s.date <= NOW() THEN 0 -- Past shows get no time boost
            ELSE GREATEST(0, 30 - EXTRACT(DAYS FROM (s.date - NOW()))) -- Closer shows get higher boost
          END as time_proximity_boost,
          
          -- Venue capacity/popularity proxy
          COUNT(DISTINCT other_shows.id) as venue_show_count
          
        FROM shows s
        LEFT JOIN artists a ON a.id = s.headliner_artist_id  
        LEFT JOIN votes v ON v.show_id = s.id
        LEFT JOIN shows other_shows ON other_shows.venue_id = s.venue_id
        WHERE s.status IN ('upcoming', 'ongoing')
        GROUP BY s.id, s.name, s.date, a.trending_score, a.popularity
      ),
      show_trending_scores AS (
        SELECT 
          show_id,
          (
            -- Recent votes (highest weight for shows)
            (recent_votes * 20.0) +
            
            -- Total votes (historical interest)
            (total_votes * 8.0) +
            
            -- Artist trending score influence
            (artist_trending * 0.3) +
            
            -- Artist Spotify popularity
            (artist_spotify_popularity * 0.1) +
            
            -- Time proximity boost (shows coming up soon)
            (time_proximity_boost * 2.0) +
            
            -- Venue popularity (more shows = better venue)
            (LEAST(venue_show_count, 50) * 0.2)
            
          ) as calculated_score
          
        FROM show_metrics
      )
      UPDATE shows 
      SET 
        trending_score = GREATEST(0, LEAST(1000, show_trending_scores.calculated_score::INTEGER)),
        updated_at = NOW()
      FROM show_trending_scores 
      WHERE shows.id = show_trending_scores.show_id
      AND shows.status IN ('upcoming', 'ongoing')
      AND (
        -- Only update if score changed significantly
        ABS(shows.trending_score - show_trending_scores.calculated_score) > GREATEST(3, shows.trending_score * 0.1)
        OR shows.trending_score = 0
      )
    `);

    const updated = Array.isArray((result as any).rows) ? (result as any).rows.length : 0;
    return {
      updated,
      calculations: updated,
    };

  } catch (error) {
    console.error('Failed to calculate show trending scores:', error);
    throw error;
  }
}

// Get top trending artists for response
async function getTopTrendingArtists(limit: number = 10): Promise<Array<{
  id: string;
  name: string;
  score: number;
}>> {
  try {
    const topArtists = await db
      .select({
        id: artists.id,
        name: artists.name,
        score: artists.trendingScore,
      })
      .from(artists)
      .where(sql`${artists.trendingScore} > 0`)
      .orderBy(desc(artists.trendingScore))
      .limit(limit);

    return topArtists.map(row => ({
      id: row.id,
      name: row.name,
      score: row.score || 0,
    }));

  } catch (error) {
    console.error('Failed to get top trending artists:', error);
    return [];
  }
}

// Health check endpoint for monitoring
export async function HEAD() {
  try {
    // Quick health check - just verify database connection
    await db.execute(sql`SELECT 1`);
    
    return new Response(null, {
      status: 200,
      headers: {
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error) {
    return new Response(null, {
      status: 500,
      headers: {
        'Cache-Control': 'no-cache',
      },
    });
  }
}