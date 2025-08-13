/**
 * Performance-Optimized Query Patterns
 * 
 * This file contains optimized queries that leverage the new indexes and materialized views
 * created in migration 0009_comprehensive_performance_optimization.sql
 * 
 * Key optimizations:
 * 1. Uses materialized views for frequently accessed data
 * 2. Leverages composite indexes for complex WHERE clauses
 * 3. Uses partial indexes for filtered queries
 * 4. Implements efficient pagination
 * 5. Reduces N+1 query problems with batch loading
 */

import { and, desc, eq, gte, inArray, lte, sql } from "drizzle-orm";
import { db } from "../client";
import { 
  artists, 
  shows, 
  songs, 
  votes, 
  setlists, 
  setlistSongs,
  venues,
  userFollowsArtists,
  artistSongs
} from "../schema";

// ================================
// ARTIST QUERIES - OPTIMIZED FOR IMPORT ORCHESTRATOR
// ================================

/**
 * Get artists that need sync - optimized for ArtistImportOrchestrator
 * Uses: idx_artists_import_lookup, idx_artists_catalog_sync_needed
 */
export async function getArtistsNeedingSync(limit = 50) {
  return db
    .select({
      id: artists.id,
      spotifyId: artists.spotifyId,
      name: artists.name,
      popularity: artists.popularity,
      lastSyncedAt: artists.lastSyncedAt,
      songCatalogSyncedAt: artists.songCatalogSyncedAt,
    })
    .from(artists)
    .where(
      and(
        sql`${artists.spotifyId} IS NOT NULL`,
        sql`(${artists.lastSyncedAt} IS NULL OR ${artists.lastSyncedAt} < NOW() - INTERVAL '6 hours')`
      )
    )
    .orderBy(desc(artists.popularity))
    .limit(limit);
}

/**
 * Get trending artists using materialized view
 * Uses: artist_performance_cache materialized view
 */
export async function getTrendingArtistsOptimized(limit = 20, offset = 0) {
  return db
    .select({
      id: sql`apc.id`,
      name: sql`apc.name`,
      slug: sql`apc.slug`,
      imageUrl: sql`apc.image_url`,
      popularity: sql`apc.popularity`,
      trendingScore: sql`apc.trending_score`,
      followerCount: sql`apc.follower_count`,
      appFollowers: sql`apc.app_followers`,
      recentShows: sql`apc.recent_shows`,
      recentVoteActivity: sql`apc.recent_vote_activity`,
      cachedAt: sql`apc.cached_at`,
    })
    .from(sql`artist_performance_cache apc`)
    .orderBy(sql`apc.trending_score DESC NULLS LAST, apc.popularity DESC NULLS LAST`)
    .limit(limit)
    .offset(offset);
}

/**
 * Search artists with full-text search optimization
 * Uses: idx_artists_fulltext_search (GIN index)
 */
export async function searchArtistsFullText(query: string, limit = 20) {
  return db
    .select({
      id: artists.id,
      name: artists.name,
      slug: artists.slug,
      imageUrl: artists.imageUrl,
      popularity: artists.popularity,
      genres: artists.genres,
      // Search relevance score
      relevance: sql<number>`
        ts_rank_cd(
          to_tsvector('english', ${artists.name} || ' ' || COALESCE(${artists.genres}::text, '')),
          plainto_tsquery('english', ${query})
        )
      `,
    })
    .from(artists)
    .where(
      sql`to_tsvector('english', ${artists.name} || ' ' || COALESCE(${artists.genres}::text, '')) @@ plainto_tsquery('english', ${query})`
    )
    .orderBy(sql`relevance DESC`, desc(artists.popularity))
    .limit(limit);
}

/**
 * Get artist by slug with cached performance data
 * Uses: idx_artists_slug + artist_performance_cache
 */
export async function getArtistBySlugOptimized(slug: string) {
  const result = await db
    .select({
      // Core artist data
      id: artists.id,
      name: artists.name,
      slug: artists.slug,
      imageUrl: artists.imageUrl,
      popularity: artists.popularity,
      genres: artists.genres,
      verified: artists.verified,
      externalUrls: artists.externalUrls,
      totalShows: artists.totalShows,
      upcomingShows: artists.upcomingShows,
      
      // Cached performance data
      appFollowers: sql<number>`COALESCE(apc.app_followers, 0)`,
      recentShows: sql<number>`COALESCE(apc.recent_shows, 0)`,
      recentVoteActivity: sql<number>`COALESCE(apc.recent_vote_activity, 0)`,
      trendingScore: sql<number>`COALESCE(apc.trending_score, 0)`,
    })
    .from(artists)
    .leftJoin(
      sql`artist_performance_cache apc`,
      eq(sql`apc.id`, artists.id)
    )
    .where(eq(artists.slug, slug))
    .limit(1);

  return result[0] || null;
}

// ================================
// SHOW QUERIES - OPTIMIZED FOR DATE FILTERING
// ================================

/**
 * Get upcoming shows for artist with optimization
 * Uses: idx_shows_artist_date_status, show_performance_cache
 */
export async function getUpcomingShowsForArtistOptimized(artistId: string, limit = 10) {
  return db
    .select({
      id: sql`spc.id`,
      name: sql`spc.name`,
      slug: sql`spc.slug`,
      date: sql`spc.date`,
      status: sql`spc.status`,
      artistName: sql`spc.artist_name`,
      venueName: sql`spc.venue_name`,
      venueCity: sql`spc.venue_city`,
      totalVotes: sql`spc.total_votes`,
      uniqueVoters: sql`spc.unique_voters`,
      totalSongs: sql`spc.total_songs`,
    })
    .from(sql`show_performance_cache spc`)
    .where(
      and(
        eq(sql`spc.headliner_artist_id`, artistId),
        gte(sql`spc.date`, sql`CURRENT_DATE`)
      )
    )
    .orderBy(sql`spc.date ASC`)
    .limit(limit);
}

/**
 * Get trending shows using cached data
 * Uses: show_performance_cache materialized view
 */
export async function getTrendingShowsOptimized(limit = 20) {
  return db
    .select({
      id: sql`spc.id`,
      name: sql`spc.name`, 
      slug: sql`spc.slug`,
      date: sql`spc.date`,
      status: sql`spc.status`,
      artistName: sql`spc.artist_name`,
      artistSlug: sql`spc.artist_slug`,
      artistImage: sql`spc.artist_image`,
      venueName: sql`spc.venue_name`,
      venueCity: sql`spc.venue_city`,
      totalVotes: sql`spc.total_votes`,
      uniqueVoters: sql`spc.unique_voters`,
      totalSongs: sql`spc.total_songs`,
    })
    .from(sql`show_performance_cache spc`)
    .where(gte(sql`spc.date`, sql`CURRENT_DATE - INTERVAL '7 days'`))
    .orderBy(sql`spc.total_votes DESC, spc.date DESC`)
    .limit(limit);
}

/**
 * Get shows by date range with venue info
 * Uses: idx_shows_date_desc, idx_venues_slug
 */
export async function getShowsByDateRangeOptimized(
  startDate: string,
  endDate: string,
  limit = 50
) {
  return db
    .select({
      id: shows.id,
      name: shows.name,
      slug: shows.slug,
      date: shows.date,
      status: shows.status,
      artistName: artists.name,
      artistSlug: artists.slug,
      venueName: venues.name,
      venueCity: venues.city,
    })
    .from(shows)
    .innerJoin(artists, eq(shows.headlinerArtistId, artists.id))
    .leftJoin(venues, eq(shows.venueId, venues.id))
    .where(
      and(
        gte(shows.date, startDate),
        lte(shows.date, endDate)
      )
    )
    .orderBy(desc(shows.date))
    .limit(limit);
}

// ================================
// VOTING QUERIES - OPTIMIZED FOR REAL-TIME
// ================================

/**
 * Get recent votes for real-time updates
 * Uses: idx_votes_recent_realtime (partial index)
 */
export async function getRecentVotesOptimized(limit = 100) {
  return db
    .select({
      id: votes.id,
      userId: votes.userId,
      setlistSongId: votes.setlistSongId,
      createdAt: votes.createdAt,
      songTitle: songs.title,
      artistName: songs.artist,
      showName: shows.name,
      showDate: shows.date,
    })
    .from(votes)
    .innerJoin(setlistSongs, eq(votes.setlistSongId, setlistSongs.id))
    .innerJoin(songs, eq(setlistSongs.songId, songs.id))
    .innerJoin(setlists, eq(setlistSongs.setlistId, setlists.id))
    .innerJoin(shows, eq(setlists.showId, shows.id))
    .where(gte(votes.createdAt, sql`CURRENT_DATE - INTERVAL '24 hours'`))
    .orderBy(desc(votes.createdAt))
    .limit(limit);
}

/**
 * Get vote counts for setlist with optimization
 * Uses: idx_setlist_songs_vote_lookup
 */
export async function getSetlistVoteCountsOptimized(setlistId: string) {
  return db
    .select({
      songId: setlistSongs.songId,
      songTitle: songs.title,
      position: setlistSongs.position,
      upvotes: setlistSongs.upvotes,
      voteCount: sql<number>`COUNT(${votes.id})`,
    })
    .from(setlistSongs)
    .innerJoin(songs, eq(setlistSongs.songId, songs.id))
    .leftJoin(votes, eq(setlistSongs.id, votes.setlistSongId))
    .where(eq(setlistSongs.setlistId, setlistId))
    .groupBy(
      setlistSongs.songId,
      songs.title,
      setlistSongs.position,
      setlistSongs.upvotes
    )
    .orderBy(setlistSongs.position);
}

/**
 * Check if user voted for specific songs (batch query)
 * Uses: idx_votes_setlist_aggregation
 */
export async function getUserVoteStatusBatch(
  userId: string,
  setlistSongIds: string[]
) {
  if (setlistSongIds.length === 0) return [];

  return db
    .select({
      setlistSongId: votes.setlistSongId,
      hasVoted: sql<boolean>`true`,
    })
    .from(votes)
    .where(
      and(
        eq(votes.userId, userId),
        inArray(votes.setlistSongId, setlistSongIds)
      )
    );
}

// ================================
// SONG QUERIES - OPTIMIZED FOR CATALOG SYNC
// ================================

/**
 * Get songs needing Spotify sync
 * Uses: idx_songs_sync_ready (partial index)
 */
export async function getSongsNeedingSpotifySync(artistName: string, limit = 100) {
  return db
    .select({
      id: songs.id,
      title: songs.title,
      artist: songs.artist,
      spotifyId: songs.spotifyId,
      popularity: songs.popularity,
    })
    .from(songs)
    .where(
      and(
        eq(songs.artist, artistName),
        sql`${songs.spotifyId} IS NULL`
      )
    )
    .orderBy(desc(songs.popularity))
    .limit(limit);
}

/**
 * Search songs with full-text search
 * Uses: idx_songs_fulltext_search (GIN index)
 */
export async function searchSongsFullText(query: string, limit = 20) {
  return db
    .select({
      id: songs.id,
      title: songs.title,
      artist: songs.artist,
      album: songs.album,
      popularity: songs.popularity,
      relevance: sql<number>`
        ts_rank_cd(
          to_tsvector('english', ${songs.title} || ' ' || ${songs.artist} || ' ' || COALESCE(${songs.album}, '')),
          plainto_tsquery('english', ${query})
        )
      `,
    })
    .from(songs)
    .where(
      sql`to_tsvector('english', ${songs.title} || ' ' || ${songs.artist} || ' ' || COALESCE(${songs.album}, '')) @@ plainto_tsquery('english', ${query})`
    )
    .orderBy(sql`relevance DESC`, desc(songs.popularity))
    .limit(limit);
}

/**
 * Get popular songs for artist with optimization
 * Uses: idx_artist_songs_composite, idx_songs_popularity_desc
 */
export async function getPopularSongsForArtistOptimized(artistId: string, limit = 50) {
  return db
    .select({
      id: songs.id,
      title: songs.title,
      artist: songs.artist,
      album: songs.album,
      popularity: songs.popularity,
      durationMs: songs.durationMs,
      isPrimaryArtist: artistSongs.isPrimaryArtist,
    })
    .from(artistSongs)
    .innerJoin(songs, eq(artistSongs.songId, songs.id))
    .where(eq(artistSongs.artistId, artistId))
    .orderBy(desc(songs.popularity))
    .limit(limit);
}

// ================================
// BATCH OPERATIONS FOR PERFORMANCE
// ================================

/**
 * Get multiple artists by IDs (batch query)
 * Uses: idx_artists_popularity_desc
 */
export async function getArtistsBatch(artistIds: string[]) {
  if (artistIds.length === 0) return [];

  return db
    .select({
      id: artists.id,
      name: artists.name,
      slug: artists.slug,
      imageUrl: artists.imageUrl,
      popularity: artists.popularity,
    })
    .from(artists)
    .where(inArray(artists.id, artistIds))
    .orderBy(desc(artists.popularity));
}

/**
 * Get multiple shows by IDs with cached data
 * Uses: show_performance_cache
 */
export async function getShowsBatch(showIds: string[]) {
  if (showIds.length === 0) return [];

  return db
    .select({
      id: sql`spc.id`,
      name: sql`spc.name`,
      slug: sql`spc.slug`,
      date: sql`spc.date`,
      artistName: sql`spc.artist_name`,
      venueName: sql`spc.venue_name`,
      totalVotes: sql`spc.total_votes`,
    })
    .from(sql`show_performance_cache spc`)
    .where(sql`spc.id = ANY(${showIds})`);
}

// ================================
// ANALYTICS AND MONITORING QUERIES
// ================================

/**
 * Get performance statistics
 */
export async function getPerformanceStats() {
  return {
    cacheHitRatio: await db.execute(sql`SELECT * FROM get_cache_performance()`),
    indexUsage: await db.execute(sql`SELECT * FROM index_usage_stats LIMIT 10`),
    tableStats: await db.execute(sql`SELECT * FROM table_performance_stats LIMIT 10`),
    bottlenecks: await db.execute(sql`SELECT * FROM analyze_performance_bottlenecks() LIMIT 5`),
  };
}

/**
 * Refresh performance caches (to be called by cron)
 */
export async function refreshPerformanceCaches() {
  await db.execute(sql`SELECT refresh_performance_caches()`);
}

/**
 * Get trending calculation data for cron jobs
 * Uses: idx_artists_verified_trending, idx_shows_trending_calc
 */
export async function getTrendingCalculationData() {
  return {
    activeArtists: await db
      .select({
        id: artists.id,
        name: artists.name,
        popularity: artists.popularity,
      })
      .from(artists)
      .where(sql`${artists.verified} = true OR ${artists.popularity} > 50`)
      .orderBy(desc(artists.popularity))
      .limit(100),
      
    recentActivity: await db
      .select({
        artistId: shows.headlinerArtistId,
        activityCount: sql<number>`COUNT(*)`,
      })
      .from(shows)
      .where(gte(shows.date, sql`CURRENT_DATE - INTERVAL '30 days'`))
      .groupBy(shows.headlinerArtistId)
      .orderBy(sql`COUNT(*) DESC`)
      .limit(50),
  };
}

// ================================
// EXPORT ALL OPTIMIZED FUNCTIONS
// ================================

export const performanceOptimizedQueries = {
  // Artist queries
  getArtistsNeedingSync,
  getTrendingArtistsOptimized,
  searchArtistsFullText,
  getArtistBySlugOptimized,
  
  // Show queries
  getUpcomingShowsForArtistOptimized,
  getTrendingShowsOptimized,
  getShowsByDateRangeOptimized,
  
  // Voting queries
  getRecentVotesOptimized,
  getSetlistVoteCountsOptimized,
  getUserVoteStatusBatch,
  
  // Song queries
  getSongsNeedingSpotifySync,
  searchSongsFullText,
  getPopularSongsForArtistOptimized,
  
  // Batch operations
  getArtistsBatch,
  getShowsBatch,
  
  // Analytics
  getPerformanceStats,
  refreshPerformanceCaches,
  getTrendingCalculationData,
};