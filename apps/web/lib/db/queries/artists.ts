/**
 * Optimized artist database queries
 * 
 * This module provides highly optimized database queries specifically for artist operations
 * with performance monitoring, caching, and comprehensive error handling.
 */

import { db } from "@repo/database";
import { 
  artists, 
  shows, 
  venues, 
  userFollowsArtists, 
  setlists,
  songs,
  showArtists,
  syncJobs,
  importStatus,
  importLogs
} from "@repo/database/schema";
import { 
  eq, 
  and, 
  or, 
  desc, 
  asc, 
  sql, 
  ilike, 
  count, 
  countDistinct, 
  avg,
  sum,
  inArray,
  gte,
  lte,
  isNull,
  isNotNull
} from "drizzle-orm";
import { cacheKeys, withCache } from "~/lib/cache/redis";

/**
 * Performance monitoring wrapper for queries
 */
async function withPerformanceTracking<T>(
  queryName: string,
  queryFn: () => Promise<T>
): Promise<T> {
  const start = performance.now();
  
  try {
    const result = await queryFn();
    const duration = performance.now() - start;
    
    // Log performance metrics
    if (duration > 100) { // Log slow queries (>100ms)
      console.warn(`Slow query detected: ${queryName} took ${duration.toFixed(2)}ms`);
    }
    
    // Track metrics in production
    if (process.env['NODE_ENV'] === 'production') {
      // Could send to monitoring service
      console.log(`Query ${queryName}: ${duration.toFixed(2)}ms`);
    }
    
    return result;
  } catch (error) {
    const duration = performance.now() - start;
    console.error(`Query ${queryName} failed after ${duration.toFixed(2)}ms:`, error);
    throw error;
  }
}

/**
 * Artist search and discovery queries
 */
export class ArtistQueries {
  
  /**
   * Get artist by ID with comprehensive stats
   */
  static async getArtistById(artistId: string) {
    return withPerformanceTracking('getArtistById', async () => {
      const result = await db
        .select({
          artist: artists,
          totalShows: sql<number>`(
            SELECT COUNT(DISTINCT s.id)
            FROM shows s
            LEFT JOIN show_artists sa ON sa.show_id = s.id
            WHERE s.headliner_artist_id = ${artists.id} OR sa.artist_id = ${artists.id}
          )`,
          upcomingShows: sql<number>`(
            SELECT COUNT(DISTINCT s.id)
            FROM shows s
            LEFT JOIN show_artists sa ON sa.show_id = s.id
            WHERE (s.headliner_artist_id = ${artists.id} OR sa.artist_id = ${artists.id})
            AND s.date >= CURRENT_DATE
            AND s.status IN ('upcoming', 'announced')
          )`,
          pastShows: sql<number>`(
            SELECT COUNT(DISTINCT s.id)
            FROM shows s
            LEFT JOIN show_artists sa ON sa.show_id = s.id
            WHERE (s.headliner_artist_id = ${artists.id} OR sa.artist_id = ${artists.id})
            AND s.date < CURRENT_DATE
            AND s.status = 'completed'
          )`,
          followerCount: sql<number>`(
            SELECT COUNT(*)
            FROM user_follows_artists ufa
            WHERE ufa.artist_id = ${artists.id}
          )`,
          totalSongs: sql<number>`(
            SELECT COUNT(DISTINCT s.id)
            FROM songs s
            WHERE s.artist_id = ${artists.id}
          )`,
          avgAttendance: sql<number>`(
            SELECT COALESCE(AVG(s.attendee_count), 0)
            FROM shows s
            LEFT JOIN show_artists sa ON sa.show_id = s.id
            WHERE (s.headliner_artist_id = ${artists.id} OR sa.artist_id = ${artists.id})
            AND s.attendee_count > 0
          )`,
          totalVotes: sql<number>`(
            SELECT COALESCE(SUM(s.vote_count), 0)
            FROM shows s
            LEFT JOIN show_artists sa ON sa.show_id = s.id
            WHERE s.headliner_artist_id = ${artists.id} OR sa.artist_id = ${artists.id}
          )`,
          lastSyncAt: sql<string>`(
            SELECT MAX(sj.completed_at)
            FROM sync_jobs sj
            WHERE sj.entity_type = 'artist'
            AND sj.entity_id = ${artists.id}
            AND sj.status = 'completed'
          )`
        })
        .from(artists)
        .where(eq(artists.id, artistId))
        .limit(1);

      return result[0] || null;
    });
  }

  /**
   * Get artist by slug with stats
   */
  static async getArtistBySlug(slug: string) {
    return withPerformanceTracking('getArtistBySlug', async () => {
      const result = await db
        .select({
          artist: artists,
          totalShows: sql<number>`(
            SELECT COUNT(DISTINCT s.id)
            FROM shows s
            LEFT JOIN show_artists sa ON sa.show_id = s.id
            WHERE s.headliner_artist_id = ${artists.id} OR sa.artist_id = ${artists.id}
          )`,
          upcomingShows: sql<number>`(
            SELECT COUNT(DISTINCT s.id)
            FROM shows s
            LEFT JOIN show_artists sa ON sa.show_id = s.id
            WHERE (s.headliner_artist_id = ${artists.id} OR sa.artist_id = ${artists.id})
            AND s.date >= CURRENT_DATE
            AND s.status IN ('upcoming', 'announced')
          )`,
          followerCount: sql<number>`(
            SELECT COUNT(*)
            FROM user_follows_artists ufa
            WHERE ufa.artist_id = ${artists.id}
          )`,
          recentActivity: sql<string>`(
            SELECT MAX(s.updated_at)
            FROM shows s
            LEFT JOIN show_artists sa ON sa.show_id = s.id
            WHERE s.headliner_artist_id = ${artists.id} OR sa.artist_id = ${artists.id}
          )`
        })
        .from(artists)
        .where(eq(artists.slug, slug))
        .limit(1);

      return result[0] || null;
    });
  }

  /**
   * Advanced artist search with full-text search and ranking
   */
  static async searchArtists(
    query: string, 
    options: {
      limit?: number;
      offset?: number;
      minPopularity?: number;
      genres?: string[];
      sortBy?: 'relevance' | 'popularity' | 'followers' | 'recent_activity';
      includeStats?: boolean;
    } = {}
  ) {
    const {
      limit = 20,
      offset = 0,
      minPopularity = 0,
      genres = [],
      sortBy = 'relevance',
      includeStats = false
    } = options;

    return withPerformanceTracking('searchArtists', async () => {
      let orderByClause = desc(artists.popularity);
      
      switch (sortBy) {
        case 'relevance':
          orderByClause = sql`ts_rank(to_tsvector('english', ${artists.name}), plainto_tsquery('english', ${query})) DESC, ${artists.popularity} DESC`;
          break;
        case 'popularity':
          orderByClause = desc(artists.popularity);
          break;
        case 'followers':
          orderByClause = desc(artists.followerCount);
          break;
        case 'recent_activity':
          orderByClause = desc(artists.updatedAt);
          break;
      }

      const baseQuery = db
        .select({
          artist: artists,
          ...(includeStats ? {
            followerCount: sql<number>`(
              SELECT COUNT(*)
              FROM user_follows_artists ufa
              WHERE ufa.artist_id = ${artists.id}
            )`,
            showCount: sql<number>`(
              SELECT COUNT(DISTINCT s.id)
              FROM shows s
              LEFT JOIN show_artists sa ON sa.show_id = s.id
              WHERE s.headliner_artist_id = ${artists.id} OR sa.artist_id = ${artists.id}
            )`,
            upcomingShows: sql<number>`(
              SELECT COUNT(DISTINCT s.id)
              FROM shows s
              LEFT JOIN show_artists sa ON sa.show_id = s.id
              WHERE (s.headliner_artist_id = ${artists.id} OR sa.artist_id = ${artists.id})
              AND s.date >= CURRENT_DATE
              AND s.status IN ('upcoming', 'announced')
            )`
          } : {})
        })
        .from(artists);

      let whereConditions = [
        sql`to_tsvector('english', ${artists.name}) @@ plainto_tsquery('english', ${query})`,
        gte(artists.popularity, minPopularity)
      ];

      // Add genre filtering if specified
      if (genres.length > 0) {
        const genreConditions = genres.map(genre => 
          sql`${artists.genres}::text ILIKE ${`%${genre}%`}`
        );
        whereConditions.push(or(...genreConditions));
      }

      const result = await baseQuery
        .where(and(...whereConditions))
        .orderBy(orderByClause)
        .limit(limit)
        .offset(offset);

      return result;
    });
  }

  /**
   * Get trending artists with dynamic scoring
   */
  static async getTrendingArtists(
    options: {
      limit?: number;
      timeWindow?: number; // hours
      minFollowers?: number;
      includeStats?: boolean;
    } = {}
  ) {
    const {
      limit = 20,
      timeWindow = 168, // 7 days
      minFollowers = 0,
      includeStats = true
    } = options;

    return withPerformanceTracking('getTrendingArtists', async () => {
      const cutoffDate = new Date(Date.now() - timeWindow * 60 * 60 * 1000);

      const query = sql`
        WITH trending_metrics AS (
          SELECT 
            a.*,
            COUNT(DISTINCT ufa.user_id) as current_followers,
            COUNT(DISTINCT s.id) FILTER (WHERE s.created_at >= ${cutoffDate}) as recent_shows,
            COUNT(DISTINCT sj.id) FILTER (WHERE sj.created_at >= ${cutoffDate} AND sj.status = 'completed') as recent_syncs,
            AVG(s.vote_count) FILTER (WHERE s.created_at >= ${cutoffDate}) as avg_recent_votes,
            SUM(s.attendee_count) FILTER (WHERE s.created_at >= ${cutoffDate}) as recent_attendance,
            (
              (COUNT(DISTINCT ufa.user_id) * 0.3) +
              (COUNT(DISTINCT s.id) FILTER (WHERE s.created_at >= ${cutoffDate}) * 10) +
              (COALESCE(AVG(s.vote_count) FILTER (WHERE s.created_at >= ${cutoffDate}), 0) * 0.5) +
              (COALESCE(SUM(s.attendee_count) FILTER (WHERE s.created_at >= ${cutoffDate}), 0) * 0.001) +
              (a.popularity * 0.1)
            ) as trending_score
          FROM artists a
          LEFT JOIN user_follows_artists ufa ON ufa.artist_id = a.id
          LEFT JOIN shows s ON (s.headliner_artist_id = a.id OR EXISTS (
            SELECT 1 FROM show_artists sa WHERE sa.show_id = s.id AND sa.artist_id = a.id
          ))
          LEFT JOIN sync_jobs sj ON (sj.entity_type = 'artist' AND sj.entity_id = a.id)
          WHERE a.trending_score > 0
          GROUP BY a.id
          HAVING COUNT(DISTINCT ufa.user_id) >= ${minFollowers}
        )
        SELECT 
          *,
          ${includeStats ? sql`
            (SELECT COUNT(*) FROM songs WHERE artist_id = trending_metrics.id) as total_songs,
            (SELECT MAX(completed_at) FROM sync_jobs WHERE entity_type = 'artist' AND entity_id = trending_metrics.id AND status = 'completed') as last_sync_at
          ` : sql`NULL as total_songs, NULL as last_sync_at`}
        FROM trending_metrics
        ORDER BY trending_score DESC
        LIMIT ${limit}
      `;

      const result = await db.execute(query);
      return result;
    });
  }

  /**
   * Get similar artists based on genres, followers, and show overlap
   */
  static async getSimilarArtists(
    artistId: string,
    options: {
      limit?: number;
      minSimilarityScore?: number;
      includeStats?: boolean;
    } = {}
  ) {
    const { limit = 10, minSimilarityScore = 0.1, includeStats = false } = options;

    return withPerformanceTracking('getSimilarArtists', async () => {
      // First get the target artist's data
      const targetArtist = await db
        .select({
          genres: artists.genres,
          popularity: artists.popularity
        })
        .from(artists)
        .where(eq(artists.id, artistId))
        .limit(1);

      if (!targetArtist[0] || !targetArtist[0].genres) {
        return [];
      }

      const targetGenres = JSON.parse(targetArtist[0].genres as string);
      if (!Array.isArray(targetGenres) || targetGenres.length === 0) {
        return [];
      }

      const query = sql`
        WITH similarity_scores AS (
          SELECT 
            a.*,
            (
              -- Genre similarity (0-1)
              CASE 
                WHEN a.genres IS NULL THEN 0
                ELSE (
                  SELECT COUNT(*) * 1.0 / GREATEST(
                    jsonb_array_length(a.genres::jsonb),
                    ${targetGenres.length}
                  )
                  FROM jsonb_array_elements_text(a.genres::jsonb) as genre
                  WHERE genre = ANY(${targetGenres})
                )
              END * 0.6 +
              
              -- Popularity similarity (0-1)
              (1.0 - ABS(a.popularity - ${targetArtist[0].popularity}) / 100.0) * 0.2 +
              
              -- Venue overlap (0-1)
              (
                SELECT COALESCE(
                  COUNT(DISTINCT v.id) * 1.0 / NULLIF(
                    (SELECT COUNT(DISTINCT venue_id) FROM shows WHERE headliner_artist_id = ${artistId}),
                    0
                  ),
                  0
                )
                FROM shows s1
                JOIN shows s2 ON s1.venue_id = s2.venue_id
                JOIN venues v ON s1.venue_id = v.id
                WHERE s1.headliner_artist_id = a.id 
                AND s2.headliner_artist_id = ${artistId}
              ) * 0.2
            ) as similarity_score,
            
            ${includeStats ? sql`
              (SELECT COUNT(*) FROM user_follows_artists WHERE artist_id = a.id) as follower_count,
              (SELECT COUNT(*) FROM shows WHERE headliner_artist_id = a.id) as show_count
            ` : sql`0 as follower_count, 0 as show_count`}
            
          FROM artists a
          WHERE a.id != ${artistId}
            AND a.genres IS NOT NULL
        )
        SELECT *
        FROM similarity_scores
        WHERE similarity_score >= ${minSimilarityScore}
        ORDER BY similarity_score DESC
        LIMIT ${limit}
      `;

      const result = await db.execute(query);
      return result;
    });
  }

  /**
   * Get artist's show history with venue and stats
   */
  static async getArtistShows(
    artistId: string,
    options: {
      limit?: number;
      offset?: number;
      status?: 'upcoming' | 'completed' | 'cancelled' | 'all';
      includeSetlists?: boolean;
      sortBy?: 'date' | 'votes' | 'attendance';
      sortOrder?: 'asc' | 'desc';
    } = {}
  ) {
    const {
      limit = 50,
      offset = 0,
      status = 'all',
      includeSetlists = false,
      sortBy = 'date',
      sortOrder = 'desc'
    } = options;

    return withPerformanceTracking('getArtistShows', async () => {
      let orderByClause = desc(shows.date);
      
      switch (sortBy) {
        case 'date':
          orderByClause = sortOrder === 'desc' ? desc(shows.date) : asc(shows.date);
          break;
        case 'votes':
          orderByClause = sortOrder === 'desc' ? desc(shows.voteCount) : asc(shows.voteCount);
          break;
        case 'attendance':
          orderByClause = sortOrder === 'desc' ? desc(shows.attendeeCount) : asc(shows.attendeeCount);
          break;
      }

      const baseQuery = db
        .select({
          show: shows,
          venue: venues,
          ...(includeSetlists ? {
            setlistCount: sql<number>`(
              SELECT COUNT(*)
              FROM setlists sl
              WHERE sl.show_id = ${shows.id}
            )`
          } : {})
        })
        .from(shows)
        .leftJoin(venues, eq(shows.venueId, venues.id))
        .leftJoin(showArtists, eq(shows.id, showArtists.showId));

      let whereConditions = [
        or(
          eq(shows.headlinerArtistId, artistId),
          eq(showArtists.artistId, artistId)
        )
      ];

      if (status !== 'all') {
        whereConditions.push(eq(shows.status, status));
      }

      const result = await baseQuery
        .where(and(...whereConditions))
        .orderBy(orderByClause)
        .limit(limit)
        .offset(offset);

      return result;
    });
  }

  /**
   * Get artist's followers with user details
   */
  static async getArtistFollowers(
    artistId: string,
    options: {
      limit?: number;
      offset?: number;
      includeUserStats?: boolean;
    } = {}
  ) {
    const { limit = 50, offset = 0, includeUserStats = false } = options;

    return withPerformanceTracking('getArtistFollowers', async () => {
      const query = db
        .select({
          userId: userFollowsArtists.userId,
          followedAt: userFollowsArtists.createdAt,
          ...(includeUserStats ? {
            userArtistCount: sql<number>`(
              SELECT COUNT(*)
              FROM user_follows_artists ufa2
              WHERE ufa2.user_id = ${userFollowsArtists.userId}
            )`
          } : {})
        })
        .from(userFollowsArtists)
        .where(eq(userFollowsArtists.artistId, artistId))
        .orderBy(desc(userFollowsArtists.createdAt))
        .limit(limit)
        .offset(offset);

      return query;
    });
  }

  /**
   * Get artists by multiple criteria with advanced filtering
   */
  static async getArtistsAdvanced(
    filters: {
      genres?: string[];
      minPopularity?: number;
      maxPopularity?: number;
      minFollowers?: number;
      hasUpcomingShows?: boolean;
      hasRecentActivity?: boolean; // within last 30 days
      regions?: string[];
      limit?: number;
      offset?: number;
      sortBy?: 'popularity' | 'followers' | 'recent_activity' | 'name';
      sortOrder?: 'asc' | 'desc';
    } = {}
  ) {
    const {
      genres = [],
      minPopularity = 0,
      maxPopularity = 100,
      minFollowers = 0,
      hasUpcomingShows = false,
      hasRecentActivity = false,
      regions = [],
      limit = 50,
      offset = 0,
      sortBy = 'popularity',
      sortOrder = 'desc'
    } = filters;

    return withPerformanceTracking('getArtistsAdvanced', async () => {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      let orderByClause = desc(artists.popularity);
      
      switch (sortBy) {
        case 'popularity':
          orderByClause = sortOrder === 'desc' ? desc(artists.popularity) : asc(artists.popularity);
          break;
        case 'followers':
          orderByClause = sortOrder === 'desc' ? desc(artists.followerCount) : asc(artists.followerCount);
          break;
        case 'recent_activity':
          orderByClause = sortOrder === 'desc' ? desc(artists.updatedAt) : asc(artists.updatedAt);
          break;
        case 'name':
          orderByClause = sortOrder === 'desc' ? desc(artists.name) : asc(artists.name);
          break;
      }

      const query = db
        .select({
          artist: artists,
          followerCount: sql<number>`(
            SELECT COUNT(*)
            FROM user_follows_artists ufa
            WHERE ufa.artist_id = ${artists.id}
          )`,
          upcomingShowCount: sql<number>`(
            SELECT COUNT(DISTINCT s.id)
            FROM shows s
            LEFT JOIN show_artists sa ON sa.show_id = s.id
            WHERE (s.headliner_artist_id = ${artists.id} OR sa.artist_id = ${artists.id})
            AND s.date >= CURRENT_DATE
            AND s.status IN ('upcoming', 'announced')
          )`,
          recentActivityCount: sql<number>`(
            SELECT COUNT(DISTINCT s.id)
            FROM shows s
            LEFT JOIN show_artists sa ON sa.show_id = s.id
            WHERE (s.headliner_artist_id = ${artists.id} OR sa.artist_id = ${artists.id})
            AND s.updated_at >= ${thirtyDaysAgo}
          )`
        })
        .from(artists);

      let whereConditions = [
        gte(artists.popularity, minPopularity),
        lte(artists.popularity, maxPopularity)
      ];

      // Genre filtering
      if (genres.length > 0) {
        const genreConditions = genres.map(genre => 
          sql`${artists.genres}::text ILIKE ${`%${genre}%`}`
        );
        whereConditions.push(or(...genreConditions));
      }

      // Follower count filtering (using HAVING clause)
      const baseQuery = query.where(and(...whereConditions));

      // Use CTE for complex filtering
      const finalQuery = sql`
        WITH filtered_artists AS (
          ${baseQuery.getSQL()}
        )
        SELECT *
        FROM filtered_artists
        WHERE follower_count >= ${minFollowers}
        ${hasUpcomingShows ? sql`AND upcoming_show_count > 0` : sql``}
        ${hasRecentActivity ? sql`AND recent_activity_count > 0` : sql``}
        ORDER BY ${orderByClause.getSQL()}
        LIMIT ${limit}
        OFFSET ${offset}
      `;

      const result = await db.execute(finalQuery);
      return result;
    });
  }

  /**
   * Get artist import/sync status and history
   */
  static async getArtistSyncStatus(artistId: string) {
    return withPerformanceTracking('getArtistSyncStatus', async () => {
      const result = await db
        .select({
          syncJob: syncJobs,
          artist: {
            id: artists.id,
            name: artists.name,
            slug: artists.slug,
            lastSyncAt: artists.lastSyncAt,
            syncStatus: artists.syncStatus
          }
        })
        .from(syncJobs)
        .rightJoin(artists, eq(artists.id, artistId))
        .where(
          and(
            eq(syncJobs.entityType, 'artist'),
            eq(syncJobs.entityId, artistId)
          )
        )
        .orderBy(desc(syncJobs.createdAt))
        .limit(10);

      return result;
    });
  }

  /**
   * Get comprehensive import status for an artist
   */
  static async getArtistImportStatus(artistId: string) {
    return withPerformanceTracking('getArtistImportStatus', async () => {
      const result = await db
        .select({
          importStatus: importStatus,
          artist: {
            id: artists.id,
            name: artists.name,
            slug: artists.slug
          }
        })
        .from(importStatus)
        .leftJoin(artists, eq(importStatus.artistId, artists.id))
        .where(eq(importStatus.artistId, artistId))
        .limit(1);

      return result[0] || null;
    });
  }

  /**
   * Get import logs for an artist with pagination and filtering
   */
  static async getArtistImportLogs(
    artistId: string,
    options: {
      limit?: number;
      offset?: number;
      level?: 'info' | 'warning' | 'error' | 'success' | 'debug';
      stage?: string;
      jobId?: string;
    } = {}
  ) {
    const {
      limit = 50,
      offset = 0,
      level,
      stage,
      jobId
    } = options;

    return withPerformanceTracking('getArtistImportLogs', async () => {
      // Add additional filters
      const conditions = [eq(importLogs.artistId, artistId)];
      
      if (level) {
        conditions.push(eq(importLogs.level, level));
      }
      
      if (stage) {
        conditions.push(eq(importLogs.stage, stage));
      }
      
      if (jobId) {
        conditions.push(eq(importLogs.jobId, jobId));
      }

      const result = await db
        .select({
          log: importLogs
        })
        .from(importLogs)
        .where(and(...conditions))
        .orderBy(desc(importLogs.createdAt))
        .limit(limit)
        .offset(offset);

      return result.map(r => r.log);
    });
  }

  /**
   * Create or update import status (upsert)
   */
  static async upsertImportStatus(
    artistId: string,
    data: {
      stage: string;
      percentage?: number;
      message?: string;
      error?: string;
      jobId?: string;
      totalSongs?: number;
      totalShows?: number;
      totalVenues?: number;
      artistName?: string;
      startedAt?: Date;
      phaseTimings?: object;
    }
  ) {
    return withPerformanceTracking('upsertImportStatus', async () => {
      // Try to find existing status
      const existing = await db
        .select()
        .from(importStatus)
        .where(eq(importStatus.artistId, artistId))
        .limit(1);

      const statusData = {
        artistId,
        ...data,
        updatedAt: new Date(),
        ...(data.stage === 'completed' ? { completedAt: new Date() } : {})
      };

      if (existing.length > 0) {
        // Update existing
        const result = await db
          .update(importStatus)
          .set(statusData)
          .where(eq(importStatus.artistId, artistId))
          .returning();
        return result[0];
      } else {
        // Create new
        const result = await db
          .insert(importStatus)
          .values({
            ...statusData,
            createdAt: new Date()
          })
          .returning();
        return result[0];
      }
    });
  }
}

/**
 * Cached versions of expensive queries
 */
export const CachedArtistQueries = {
  getTrendingArtists: withCache(
    ArtistQueries.getTrendingArtists,
    (options) => cacheKeys.trending("artists", "trending", options?.limit || 20),
    300 // 5 minutes
  ),

  searchArtists: withCache(
    ArtistQueries.searchArtists,
    (query, options) => cacheKeys.searchResults(query, "artists"),
    600 // 10 minutes
  ),

  getSimilarArtists: withCache(
    ArtistQueries.getSimilarArtists,
    (artistId, options) => `similar:artists:${artistId}:${options?.limit || 10}`,
    1800 // 30 minutes
  ),

  getArtistById: withCache(
    ArtistQueries.getArtistById,
    (artistId) => cacheKeys.artist(artistId),
    900 // 15 minutes
  ),

  getArtistBySlug: withCache(
    ArtistQueries.getArtistBySlug,
    (slug) => `artist:slug:${slug}`,
    900 // 15 minutes
  ),

  getArtistImportStatus: withCache(
    ArtistQueries.getArtistImportStatus,
    (artistId) => `artist:import:${artistId}`,
    60 // 1 minute - short cache for real-time updates
  )
};

// Export both cached and non-cached versions
export { ArtistQueries };
export default CachedArtistQueries;