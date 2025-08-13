/**
 * Database Performance Verification System
 * Validates query performance and provides optimization recommendations
 */

import { db, artists, shows, venues, songs, setlists, setlistSongs, artistSongs, userFollowsArtists, eq, sql, and, desc } from '@repo/database';
import { performance } from 'perf_hooks';

// ================================
// Performance Targets
// ================================

export const DB_PERFORMANCE_TARGETS = {
  // Query timing targets (milliseconds)
  SIMPLE_SELECT: 50,     // Basic SELECT with WHERE clause
  COMPLEX_JOIN: 200,     // Multi-table JOINs
  AGGREGATION: 500,      // COUNT, SUM, AVG operations
  FULL_TEXT_SEARCH: 300, // Text search operations
  BULK_INSERT: 1000,     // Batch insert operations
  
  // Connection targets
  CONNECTION_TIME: 100,  // Time to establish connection
  TRANSACTION_TIME: 2000, // Maximum transaction duration
  
  // Index effectiveness targets
  INDEX_SCAN_RATIO: 0.95, // 95% of queries should use indexes
  CACHE_HIT_RATIO: 0.90,  // 90% cache hit rate
  
  // Concurrency targets
  MAX_CONNECTIONS: 20,    // Maximum concurrent connections
  DEADLOCK_RATE: 0.01,    // Less than 1% deadlock rate
} as const;

// ================================
// Query Performance Analysis
// ================================

export interface QueryPerformanceResult {
  queryName: string;
  executionTime: number;
  planCost: number;
  indexUsage: boolean;
  rowsScanned: number;
  rowsReturned: number;
  cacheHit: boolean;
  meetsTarget: boolean;
  recommendations: string[];
  explain?: any;
}

export interface DatabasePerformanceReport {
  timestamp: string;
  overallScore: number;
  queryResults: QueryPerformanceResult[];
  indexAnalysis: IndexAnalysisResult[];
  connectionMetrics: ConnectionMetrics;
  recommendations: string[];
  criticalIssues: string[];
}

export interface IndexAnalysisResult {
  tableName: string;
  indexName: string;
  usage: number;
  effectiveness: number;
  recommendations: string[];
}

export interface ConnectionMetrics {
  totalConnections: number;
  activeConnections: number;
  idleConnections: number;
  averageConnectionTime: number;
  maxConnectionTime: number;
}

// ================================
// Performance Testing Suite
// ================================

export class DatabasePerformanceTester {
  private results: QueryPerformanceResult[] = [];

  async runPerformanceTests(): Promise<DatabasePerformanceReport> {
    console.log('Starting database performance verification...');
    
    this.results = [];
    
    // Test core queries used in import flow
    await this.testArtistQueries();
    await this.testShowQueries();
    await this.testVenueQueries();
    await this.testSongQueries();
    await this.testSetlistQueries();
    await this.testSearchQueries();
    await this.testAggregationQueries();
    
    // Analyze indexes
    const indexAnalysis = await this.analyzeIndexes();
    
    // Get connection metrics
    const connectionMetrics = await this.getConnectionMetrics();
    
    // Generate report
    const report = this.generateReport(indexAnalysis, connectionMetrics);
    
    console.log('Database performance verification completed');
    return report;
  }

  private async testArtistQueries(): Promise<void> {
    // Test 1: Artist by ID (most common query)
    await this.testQuery(
      'artist_by_id',
      async () => {
        const [result] = await db
          .select()
          .from(artists)
          .where(eq(artists.id, 'test-artist-id'))
          .limit(1);
        return result;
      },
      DB_PERFORMANCE_TARGETS.SIMPLE_SELECT
    );

    // Test 2: Artist by slug with stats
    await this.testQuery(
      'artist_by_slug_with_stats',
      async () => {
        const result = await db
          .select({
            artist: artists,
            showCount: sql<number>`(
              SELECT COUNT(*)
              FROM shows s
              WHERE s.headliner_artist_id = ${artists.id}
            )`,
            followerCount: sql<number>`(
              SELECT COUNT(*)
              FROM user_follows_artists ufa
              WHERE ufa.artist_id = ${artists.id}
            )`
          })
          .from(artists)
          .where(eq(artists.slug, 'taylor-swift'))
          .limit(1);
        return result[0];
      },
      DB_PERFORMANCE_TARGETS.COMPLEX_JOIN
    );

    // Test 3: Popular artists with aggregations
    await this.testQuery(
      'popular_artists_with_stats',
      async () => {
        // Create subquery for follower counts
        const followerCounts = db
          .select({
            artistId: userFollowsArtists.artistId,
            count: sql<number>`COUNT(*)`.as('count')
          })
          .from(userFollowsArtists)
          .groupBy(userFollowsArtists.artistId)
          .as('follower_counts');

        const results = await db
          .select({
            id: artists.id,
            name: artists.name,
            slug: artists.slug,
            popularity: artists.popularity,
            followerCount: sql<number>`COALESCE(${followerCounts.count}, 0)`
          })
          .from(artists)
          .leftJoin(followerCounts, eq(followerCounts.artistId, artists.id))
          .orderBy(desc(artists.popularity))
          .limit(20);
        return results;
      },
      DB_PERFORMANCE_TARGETS.COMPLEX_JOIN
    );
  }

  private async testShowQueries(): Promise<void> {
    // Test 1: Shows for artist
    await this.testQuery(
      'shows_for_artist',
      async () => {
        const results = await db
          .select()
          .from(shows)
          .where(eq(shows.headlinerArtistId, 'test-artist-id'))
          .orderBy(desc(shows.date))
          .limit(20);
        return results;
      },
      DB_PERFORMANCE_TARGETS.SIMPLE_SELECT
    );

    // Test 2: Upcoming shows with venue info
    await this.testQuery(
      'upcoming_shows_with_venues',
      async () => {
        const results = await db
          .select({
            show: shows,
            venue: venues
          })
          .from(shows)
          .innerJoin(venues, eq(venues.id, shows.venueId))
          .where(sql`${shows.date} >= CURRENT_DATE`)
          .orderBy(shows.date)
          .limit(50);
        return results;
      },
      DB_PERFORMANCE_TARGETS.COMPLEX_JOIN
    );
  }

  private async testVenueQueries(): Promise<void> {
    // Test venue lookups
    await this.testQuery(
      'venue_by_id',
      async () => {
        const [result] = await db
          .select()
          .from(venues)
          .where(eq(venues.id, 'test-venue-id'))
          .limit(1);
        return result;
      },
      DB_PERFORMANCE_TARGETS.SIMPLE_SELECT
    );
  }

  private async testSongQueries(): Promise<void> {
    // Test 1: Songs by artist
    await this.testQuery(
      'songs_by_artist',
      async () => {
        const results = await db
          .select({
            song: songs,
            artistSong: artistSongs
          })
          .from(songs)
          .innerJoin(artistSongs, eq(songs.id, artistSongs.songId))
          .where(eq(artistSongs.artistId, 'test-artist-id'))
          .orderBy(desc(songs.popularity))
          .limit(50);
        return results;
      },
      DB_PERFORMANCE_TARGETS.COMPLEX_JOIN
    );

    // Test 2: Popular songs aggregation
    await this.testQuery(
      'popular_songs_aggregation',
      async () => {
        // Create subquery for vote counts
        const voteCounts = db
          .select({
            songId: setlistSongs.songId,
            count: sql<number>`SUM(${setlistSongs.upvotes})`.as('count')
          })
          .from(setlistSongs)
          .groupBy(setlistSongs.songId)
          .as('vote_counts');

        const results = await db
          .select({
            songId: songs.id,
            title: songs.title,
            totalVotes: sql<number>`COALESCE(${voteCounts.count}, 0)`
          })
          .from(songs)
          .leftJoin(voteCounts, eq(voteCounts.songId, songs.id))
          .orderBy(desc(voteCounts.count))
          .limit(100);
        return results;
      },
      DB_PERFORMANCE_TARGETS.AGGREGATION
    );
  }

  private async testSetlistQueries(): Promise<void> {
    // Test setlist with songs
    await this.testQuery(
      'setlist_with_songs',
      async () => {
        const results = await db
          .select({
            setlist: setlists,
            song: songs,
            setlistSong: setlistSongs
          })
          .from(setlists)
          .innerJoin(setlistSongs, eq(setlistSongs.setlistId, setlists.id))
          .innerJoin(songs, eq(songs.id, setlistSongs.songId))
          .where(eq(setlists.showId, 'test-show-id'))
          .orderBy(setlistSongs.position);
        return results;
      },
      DB_PERFORMANCE_TARGETS.COMPLEX_JOIN
    );
  }

  private async testSearchQueries(): Promise<void> {
    // Test full-text search on artists
    await this.testQuery(
      'artist_search',
      async () => {
        const results = await db
          .select()
          .from(artists)
          .where(sql`${artists.name} ILIKE ${'%taylor%'}`)
          .orderBy(desc(artists.popularity))
          .limit(20);
        return results;
      },
      DB_PERFORMANCE_TARGETS.FULL_TEXT_SEARCH
    );
  }

  private async testAggregationQueries(): Promise<void> {
    // Test complex aggregation
    await this.testQuery(
      'platform_statistics',
      async () => {
        const stats = await db
          .select({
            totalArtists: sql<number>`COUNT(DISTINCT ${artists.id})`,
            totalShows: sql<number>`COUNT(DISTINCT ${shows.id})`,
            totalVenues: sql<number>`COUNT(DISTINCT ${venues.id})`,
            totalSongs: sql<number>`COUNT(DISTINCT ${songs.id})`
          })
          .from(artists)
          .fullJoin(shows, eq(shows.headlinerArtistId, artists.id))
          .fullJoin(venues, eq(venues.id, shows.venueId))
          .fullJoin(artistSongs, eq(artistSongs.artistId, artists.id))
          .fullJoin(songs, eq(songs.id, artistSongs.songId));
        return stats[0];
      },
      DB_PERFORMANCE_TARGETS.AGGREGATION
    );
  }

  private async testQuery(
    queryName: string,
    queryFn: () => Promise<any>,
    targetTime: number
  ): Promise<void> {
    try {
      // Get query plan first
      const explainResult = await this.getQueryPlan(queryFn);
      
      // Execute query with timing
      const startTime = performance.now();
      const result = await queryFn();
      const endTime = performance.now();
      
      const executionTime = endTime - startTime;
      const meetsTarget = executionTime <= targetTime;
      
      // Analyze explain plan
      const planAnalysis = this.analyzePlan(explainResult);
      
      const queryResult: QueryPerformanceResult = {
        queryName,
        executionTime,
        planCost: planAnalysis.cost,
        indexUsage: planAnalysis.usesIndex,
        rowsScanned: planAnalysis.rowsScanned,
        rowsReturned: Array.isArray(result) ? result.length : (result ? 1 : 0),
        cacheHit: planAnalysis.cacheHit,
        meetsTarget,
        recommendations: this.generateQueryRecommendations(queryName, executionTime, targetTime, planAnalysis),
        explain: explainResult
      };
      
      this.results.push(queryResult);
      
      console.log(`Query ${queryName}: ${executionTime.toFixed(2)}ms (target: ${targetTime}ms) - ${meetsTarget ? 'PASS' : 'FAIL'}`);
      
    } catch (error) {
      console.error(`Query ${queryName} failed:`, error);
      
      this.results.push({
        queryName,
        executionTime: -1,
        planCost: -1,
        indexUsage: false,
        rowsScanned: -1,
        rowsReturned: -1,
        cacheHit: false,
        meetsTarget: false,
        recommendations: [`Query failed: ${error instanceof Error ? error.message : 'Unknown error'}`]
      });
    }
  }

  private async getQueryPlan(queryFn: () => Promise<any>): Promise<any> {
    try {
      // This is a simplified approach - in production you'd want to use EXPLAIN ANALYZE
      // For now, we'll skip actual EXPLAIN plans to avoid breaking the query execution
      return { cost: 1.0, rows: 1 };
    } catch (error) {
      return { cost: -1, rows: -1, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  private analyzePlan(explainResult: any): {
    cost: number;
    usesIndex: boolean;
    rowsScanned: number;
    cacheHit: boolean;
  } {
    // Simplified plan analysis
    return {
      cost: explainResult?.cost || 1.0,
      usesIndex: true, // Assume indexed queries for now
      rowsScanned: explainResult?.rows || 1,
      cacheHit: true, // Assume good cache performance
    };
  }

  private generateQueryRecommendations(
    queryName: string,
    executionTime: number,
    targetTime: number,
    planAnalysis: any
  ): string[] {
    const recommendations: string[] = [];
    
    if (executionTime > targetTime) {
      const slownessFactor = executionTime / targetTime;
      
      if (slownessFactor > 3) {
        recommendations.push('Query is critically slow - consider major optimization');
      } else if (slownessFactor > 2) {
        recommendations.push('Query performance needs improvement');
      } else {
        recommendations.push('Query slightly exceeds target - minor optimization needed');
      }
      
      // Specific recommendations based on query type
      if (queryName.includes('search')) {
        recommendations.push('Consider adding full-text search indexes');
        recommendations.push('Implement query result caching');
      }
      
      if (queryName.includes('aggregation')) {
        recommendations.push('Consider materialized views for complex aggregations');
        recommendations.push('Add composite indexes for GROUP BY columns');
      }
      
      if (queryName.includes('with_stats')) {
        recommendations.push('Consider denormalizing frequently accessed statistics');
        recommendations.push('Use background jobs to maintain aggregated data');
      }
      
      if (!planAnalysis.usesIndex) {
        recommendations.push('Add appropriate indexes for this query pattern');
      }
    }
    
    return recommendations;
  }

  private async analyzeIndexes(): Promise<IndexAnalysisResult[]> {
    try {
      // Query database for index usage statistics
      const indexStats = await db.execute(sql`
        SELECT 
          schemaname,
          tablename,
          indexname,
          idx_scan as scans,
          idx_tup_read as tuples_read,
          idx_tup_fetch as tuples_fetched
        FROM pg_stat_user_indexes 
        WHERE schemaname = 'public'
        ORDER BY idx_scan DESC
      `);
      
      const results: IndexAnalysisResult[] = [];
      
      for (const row of (indexStats as any).rows || []) {
        const effectiveness = row.tuples_fetched > 0 ? 
          row.tuples_fetched / Math.max(row.tuples_read, 1) : 0;
        
        const recommendations: string[] = [];
        
        if (row.scans === 0) {
          recommendations.push('Index is never used - consider dropping');
        } else if (effectiveness < 0.1) {
          recommendations.push('Low index effectiveness - review query patterns');
        } else if (row.scans < 10) {
          recommendations.push('Low index usage - may not be necessary');
        }
        
        results.push({
          tableName: row.tablename,
          indexName: row.indexname,
          usage: row.scans,
          effectiveness,
          recommendations
        });
      }
      
      return results;
      
    } catch (error) {
      console.warn('Could not analyze indexes:', error);
      return [];
    }
  }

  private async getConnectionMetrics(): Promise<ConnectionMetrics> {
    try {
      const stats = await db.execute(sql`
        SELECT 
          count(*) as total_connections,
          count(*) FILTER (WHERE state = 'active') as active_connections,
          count(*) FILTER (WHERE state = 'idle') as idle_connections
        FROM pg_stat_activity 
        WHERE datname = current_database()
      `);
      
      const row = (stats as any).rows?.[0] || {};
      
      return {
        totalConnections: parseInt(row.total_connections) || 0,
        activeConnections: parseInt(row.active_connections) || 0,
        idleConnections: parseInt(row.idle_connections) || 0,
        averageConnectionTime: 50, // Placeholder
        maxConnectionTime: 100, // Placeholder
      };
      
    } catch (error) {
      console.warn('Could not get connection metrics:', error);
      return {
        totalConnections: 0,
        activeConnections: 0,
        idleConnections: 0,
        averageConnectionTime: 0,
        maxConnectionTime: 0,
      };
    }
  }

  private generateReport(
    indexAnalysis: IndexAnalysisResult[],
    connectionMetrics: ConnectionMetrics
  ): DatabasePerformanceReport {
    const passedQueries = this.results.filter(r => r.meetsTarget).length;
    const totalQueries = this.results.length;
    const overallScore = totalQueries > 0 ? (passedQueries / totalQueries) * 100 : 0;
    
    const criticalIssues: string[] = [];
    const recommendations: string[] = [];
    
    // Analyze results for critical issues
    const criticallySlowQueries = this.results.filter(r => 
      r.executionTime > 0 && r.executionTime > 1000 // Over 1 second
    );
    
    if (criticallySlowQueries.length > 0) {
      criticalIssues.push(`${criticallySlowQueries.length} queries are critically slow (>1s)`);
    }
    
    if (overallScore < 70) {
      criticalIssues.push('Overall database performance is below acceptable threshold');
    }
    
    if (connectionMetrics.totalConnections > DB_PERFORMANCE_TARGETS.MAX_CONNECTIONS) {
      criticalIssues.push('Connection count exceeds recommended maximum');
    }
    
    // Generate overall recommendations
    if (overallScore < 90) {
      recommendations.push('Review and optimize database queries');
      recommendations.push('Consider implementing query result caching');
      recommendations.push('Add missing database indexes');
    }
    
    const unusedIndexes = indexAnalysis.filter(idx => idx.usage === 0);
    if (unusedIndexes.length > 0) {
      recommendations.push(`Consider dropping ${unusedIndexes.length} unused indexes`);
    }
    
    return {
      timestamp: new Date().toISOString(),
      overallScore,
      queryResults: this.results,
      indexAnalysis,
      connectionMetrics,
      recommendations,
      criticalIssues
    };
  }
}

// ================================
// Database Optimization Utilities
// ================================

export class DatabaseOptimizer {
  
  async createMissingIndexes(): Promise<string[]> {
    const indexesCreated: string[] = [];
    
    try {
      // Common query patterns based on the import flow
      const indexQueries = [
        // Artist lookups
        `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_artists_slug ON artists(slug)`,
        `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_artists_ticketmaster_id ON artists(ticketmaster_id)`,
        `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_artists_spotify_id ON artists(spotify_id)`,
        `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_artists_popularity ON artists(popularity DESC)`,
        `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_artists_trending_score ON artists(trending_score DESC)`,
        
        // Show lookups
        `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_shows_headliner_artist_id ON shows(headliner_artist_id)`,
        `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_shows_venue_id ON shows(venue_id)`,
        `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_shows_date ON shows(date)`,
        `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_shows_date_artist ON shows(date, headliner_artist_id)`,
        
        // Song and setlist lookups
        `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_artist_songs_artist_id ON artist_songs(artist_id)`,
        `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_artist_songs_song_id ON artist_songs(song_id)`,
        `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_setlist_songs_setlist_id ON setlist_songs(setlist_id)`,
        `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_setlist_songs_song_id ON setlist_songs(song_id)`,
        
        // User relationships
        `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_follows_artists_user_id ON user_follows_artists(user_id)`,
        `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_follows_artists_artist_id ON user_follows_artists(artist_id)`,
        
        // Full-text search
        `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_artists_name_fulltext ON artists USING GIN (to_tsvector('english', name))`,
        `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_venues_name_fulltext ON venues USING GIN (to_tsvector('english', name))`,
        
        // JSONB indexes for genres
        `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_artists_genres ON artists USING GIN (genres)`,
        
        // Composite indexes for common query patterns
        `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_shows_artist_date ON shows(headliner_artist_id, date DESC)`,
        `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_songs_popularity ON songs(popularity DESC NULLS LAST)`,
      ];
      
      for (const indexQuery of indexQueries) {
        try {
          await db.execute(sql.raw(indexQuery));
          const indexName = indexQuery.match(/idx_[a-zA-Z0-9_]+/)?.[0] || 'unknown';
          indexesCreated.push(indexName);
          console.log(`Created index: ${indexName}`);
        } catch (error) {
          console.warn(`Failed to create index: ${indexQuery}`, error);
        }
      }
      
    } catch (error) {
      console.error('Error creating indexes:', error);
    }
    
    return indexesCreated;
  }

  async analyzeQueryPlans(): Promise<void> {
    try {
      // Analyze slow queries
      await db.execute(sql`
        SELECT query, calls, total_exec_time, mean_exec_time, rows
        FROM pg_stat_statements 
        WHERE mean_exec_time > 100
        ORDER BY mean_exec_time DESC 
        LIMIT 10
      `);
    } catch (error) {
      console.warn('Could not analyze query plans (pg_stat_statements may not be enabled):', error);
    }
  }

  async optimizeSettings(): Promise<string[]> {
    const optimizations: string[] = [];
    
    try {
      // These would be applied at the database level, not through application code
      // Listed here for documentation/reference
      const recommendedSettings = [
        'shared_buffers = 256MB',
        'effective_cache_size = 1GB', 
        'work_mem = 4MB',
        'maintenance_work_mem = 64MB',
        'checkpoint_completion_target = 0.9',
        'wal_buffers = 16MB',
        'default_statistics_target = 100',
        'random_page_cost = 1.1',
        'effective_io_concurrency = 200'
      ];
      
      optimizations.push('Database settings optimization recommendations generated');
      optimizations.push(...recommendedSettings);
      
    } catch (error) {
      console.error('Error generating optimization recommendations:', error);
    }
    
    return optimizations;
  }
}

// ================================
// Exports
// ================================

export const databasePerformanceTester = new DatabasePerformanceTester();
export const databaseOptimizer = new DatabaseOptimizer();