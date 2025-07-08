import { db } from '@repo/database';
import { sql } from 'drizzle-orm';
import { CacheService } from './cache';
import { MonitoringService, withPerformanceMonitoring } from './monitoring';

/**
 * Database optimization utilities for production performance
 */
export class DatabaseOptimizer {
  /**
   * Execute query with automatic performance monitoring and caching
   */
  static async executeOptimizedQuery<T>(
    queryFn: () => Promise<T>,
    options: {
      cacheKey?: string;
      cacheTTL?: number;
      queryName?: string;
      timeout?: number;
    } = {}
  ): Promise<T> {
    const {
      cacheKey,
      cacheTTL = 300, // 5 minutes default
      queryName = 'database_query',
      timeout = 30000, // 30 seconds default
    } = options;

    // Try cache first if cache key provided
    if (cacheKey) {
      const cached = await CacheService.get<T>(cacheKey);
      if (cached !== null) {
        MonitoringService.trackMetric({
          name: 'database.cache_hit',
          value: 1,
          tags: { query: queryName },
        });
        return cached;
      }
    }

    // Execute query with monitoring and timeout
    const wrappedQuery = withPerformanceMonitoring(queryFn, queryName);

    try {
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Query timeout')), timeout);
      });

      const result = await Promise.race([wrappedQuery(), timeoutPromise]);

      // Cache result if cache key provided
      if (cacheKey) {
        await CacheService.set(cacheKey, result, { ttl: cacheTTL });
        MonitoringService.trackMetric({
          name: 'database.cache_miss',
          value: 1,
          tags: { query: queryName },
        });
      }

      return result;
    } catch (error) {
      MonitoringService.trackError(error as Error, {
        operation: 'database_query',
        query: queryName,
        cached: !!cacheKey,
      });
      throw error;
    }
  }

  /**
   * Batch multiple queries efficiently
   */
  static async batchQueries<T>(
    queries: Array<() => Promise<T>>,
    options: {
      batchSize?: number;
      concurrency?: number;
      failFast?: boolean;
    } = {}
  ): Promise<T[]> {
    const { batchSize = 10, concurrency = 5, failFast = false } = options;

    const results: T[] = [];

    for (let i = 0; i < queries.length; i += batchSize) {
      const batch = queries.slice(i, i + batchSize);

      try {
        if (failFast) {
          // Fail fast - if any query fails, stop immediately
          const batchResults = await Promise.all(
            batch.map((query) =>
              this.executeOptimizedQuery(query, {
                queryName: `batch_query_${i}`,
              })
            )
          );
          results.push(...batchResults);
        } else {
          // Continue on error - collect all successful results
          const batchPromises = batch.map((query) =>
            this.executeOptimizedQuery(query, {
              queryName: `batch_query_${i}`,
            }).catch((error) => {
              console.warn('Batch query failed:', error);
              return null;
            })
          );

          const batchResults = await Promise.all(batchPromises);
          results.push(...(batchResults.filter((r) => r !== null) as T[]));
        }
      } catch (error) {
        MonitoringService.trackError(error as Error, {
          operation: 'batch_queries',
          batch_index: i,
          batch_size: batch.length,
        });

        if (failFast) {
          throw error;
        }
      }
    }

    MonitoringService.trackMetric({
      name: 'database.batch_query.completed',
      value: results.length,
      tags: {
        total_queries: queries.length.toString(),
        success_rate: ((results.length / queries.length) * 100).toFixed(1),
      },
    });

    return results;
  }

  /**
   * Connection pool management
   */
  static async checkConnectionHealth(): Promise<{
    activeConnections: number;
    totalConnections: number;
    healthStatus: 'healthy' | 'warning' | 'critical';
  }> {
    try {
      const result = await db.execute(sql`
        SELECT 
          (SELECT count(*) FROM pg_stat_activity WHERE state = 'active') as active_connections,
          (SELECT count(*) FROM pg_stat_activity) as total_connections,
          (SELECT setting::int FROM pg_settings WHERE name = 'max_connections') as max_connections
      `);

      const row = result.rows[0] as any;
      const activeConnections = Number.parseInt(row.active_connections);
      const totalConnections = Number.parseInt(row.total_connections);
      const maxConnections = Number.parseInt(row.max_connections);

      const utilizationPercent = (totalConnections / maxConnections) * 100;

      let healthStatus: 'healthy' | 'warning' | 'critical' = 'healthy';
      if (utilizationPercent > 90) {
        healthStatus = 'critical';
      } else if (utilizationPercent > 75) {
        healthStatus = 'warning';
      }

      MonitoringService.trackMetric({
        name: 'database.connections.active',
        value: activeConnections,
      });

      MonitoringService.trackMetric({
        name: 'database.connections.total',
        value: totalConnections,
      });

      MonitoringService.trackMetric({
        name: 'database.connections.utilization',
        value: utilizationPercent,
        unit: 'percent',
      });

      return {
        activeConnections,
        totalConnections,
        healthStatus,
      };
    } catch (error) {
      MonitoringService.trackError(error as Error, {
        operation: 'connection_health_check',
      });

      return {
        activeConnections: 0,
        totalConnections: 0,
        healthStatus: 'critical',
      };
    }
  }

  /**
   * Query performance analysis
   */
  static async analyzeSlowQueries(): Promise<{
    slowQueries: Array<{
      query: string;
      calls: number;
      totalTime: number;
      avgTime: number;
      rows: number;
    }>;
    recommendations: string[];
  }> {
    try {
      // Get slow queries from pg_stat_statements if available
      const slowQueries = await db.execute(sql`
        SELECT 
          query,
          calls,
          total_time,
          mean_time as avg_time,
          rows
        FROM pg_stat_statements 
        WHERE mean_time > 100 -- queries taking more than 100ms on average
        ORDER BY mean_time DESC 
        LIMIT 20
      `);

      const recommendations: string[] = [];

      if (slowQueries.rows.length > 0) {
        recommendations.push(
          'Consider adding indexes for frequently executed slow queries'
        );
        recommendations.push(
          'Review query execution plans for optimization opportunities'
        );
        recommendations.push(
          'Consider query result caching for expensive read operations'
        );
      }

      // Check for missing indexes
      const missingIndexes = await db.execute(sql`
        SELECT 
          schemaname,
          tablename,
          attname,
          n_distinct,
          correlation
        FROM pg_stats 
        WHERE n_distinct > 100 AND correlation < 0.1
        LIMIT 10
      `);

      if (missingIndexes.rows.length > 0) {
        recommendations.push(
          'Consider adding indexes on high-cardinality columns with low correlation'
        );
      }

      return {
        slowQueries: slowQueries.rows as any[],
        recommendations,
      };
    } catch (error) {
      console.warn('Slow query analysis failed:', error);
      return {
        slowQueries: [],
        recommendations: ['pg_stat_statements extension may not be enabled'],
      };
    }
  }

  /**
   * Database maintenance operations
   */
  static async performMaintenance(): Promise<{
    vacuumResults: string[];
    indexRebuilds: string[];
    statisticsUpdated: boolean;
  }> {
    const results = {
      vacuumResults: [] as string[],
      indexRebuilds: [] as string[],
      statisticsUpdated: false,
    };

    try {
      // Update table statistics for better query planning
      await db.execute(sql`ANALYZE`);
      results.statisticsUpdated = true;
      results.vacuumResults.push('Table statistics updated successfully');

      // Check for tables that need vacuuming
      const tableStats = await db.execute(sql`
        SELECT 
          schemaname,
          tablename,
          n_dead_tup,
          n_live_tup,
          CASE WHEN n_live_tup > 0 
            THEN n_dead_tup::float / n_live_tup::float 
            ELSE 0 
          END as dead_ratio
        FROM pg_stat_user_tables 
        WHERE n_dead_tup > 1000 AND n_live_tup > 0
        ORDER BY dead_ratio DESC
        LIMIT 5
      `);

      // Vacuum tables with high dead tuple ratio
      for (const row of tableStats.rows as any[]) {
        if (row.dead_ratio > 0.2) {
          // More than 20% dead tuples
          try {
            await db.execute(
              sql.raw(`VACUUM ${row.schemaname}.${row.tablename}`)
            );
            results.vacuumResults.push(
              `Vacuumed ${row.schemaname}.${row.tablename}`
            );
          } catch (error) {
            results.vacuumResults.push(
              `Failed to vacuum ${row.schemaname}.${row.tablename}: ${error.message}`
            );
          }
        }
      }

      MonitoringService.trackMetric({
        name: 'database.maintenance.completed',
        value: 1,
        tags: {
          tables_vacuumed: results.vacuumResults.length.toString(),
          statistics_updated: results.statisticsUpdated.toString(),
        },
      });
    } catch (error) {
      MonitoringService.trackError(error as Error, {
        operation: 'database_maintenance',
      });
      results.vacuumResults.push(`Maintenance error: ${error.message}`);
    }

    return results;
  }

  /**
   * Query execution plan analysis
   */
  static async explainQuery(query: string): Promise<{
    plan: any[];
    cost: number;
    duration: number;
    suggestions: string[];
  }> {
    try {
      const explainResult = await db.execute(
        sql.raw(`EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${query}`)
      );

      const plan = explainResult.rows[0]['QUERY PLAN'][0];
      const cost = plan['Total Cost'] || 0;
      const duration = plan['Actual Total Time'] || 0;

      const suggestions: string[] = [];

      // Analyze plan for optimization opportunities
      if (duration > 1000) {
        suggestions.push('Query takes over 1 second - consider optimization');
      }

      if (plan['Node Type'] === 'Seq Scan') {
        suggestions.push('Sequential scan detected - consider adding an index');
      }

      if (plan['Shared Hit Blocks'] && plan['Shared Read Blocks']) {
        const hitRatio =
          plan['Shared Hit Blocks'] /
          (plan['Shared Hit Blocks'] + plan['Shared Read Blocks']);
        if (hitRatio < 0.9) {
          suggestions.push(
            'Low cache hit ratio - consider increasing shared_buffers'
          );
        }
      }

      return {
        plan: [plan],
        cost,
        duration,
        suggestions,
      };
    } catch (error) {
      throw new Error(`Query explanation failed: ${error.message}`);
    }
  }

  /**
   * Index usage statistics
   */
  static async getIndexStats(): Promise<
    Array<{
      tableName: string;
      indexName: string;
      scans: number;
      tuplesRead: number;
      tuplesUsed: number;
      efficiency: number;
    }>
  > {
    try {
      const result = await db.execute(sql`
        SELECT 
          schemaname,
          tablename,
          indexname,
          idx_scan as scans,
          idx_tup_read as tuples_read,
          idx_tup_fetch as tuples_used,
          CASE WHEN idx_tup_read > 0 
            THEN (idx_tup_fetch::float / idx_tup_read::float) * 100 
            ELSE 0 
          END as efficiency
        FROM pg_stat_user_indexes
        ORDER BY efficiency DESC
      `);

      return result.rows.map((row: any) => ({
        tableName: `${row.schemaname}.${row.tablename}`,
        indexName: row.indexname,
        scans: row.scans,
        tuplesRead: row.tuples_read,
        tuplesUsed: row.tuples_used,
        efficiency: row.efficiency,
      }));
    } catch (error) {
      console.warn('Index statistics query failed:', error);
      return [];
    }
  }
}

/**
 * Query builder with optimization hints
 */
export class OptimizedQueryBuilder {
  /**
   * Build paginated query with performance optimizations
   */
  static buildPaginatedQuery(
    baseQuery: string,
    options: {
      page: number;
      limit: number;
      sortBy?: string;
      sortOrder?: 'ASC' | 'DESC';
      useSeekPagination?: boolean;
      seekValue?: any;
    }
  ): string {
    const {
      page,
      limit,
      sortBy = 'created_at',
      sortOrder = 'DESC',
      useSeekPagination = false,
      seekValue,
    } = options;

    let query = baseQuery;

    // Add sorting
    query += ` ORDER BY ${sortBy} ${sortOrder}`;

    if (useSeekPagination && seekValue) {
      // Use seek pagination for better performance on large datasets
      const operator = sortOrder === 'DESC' ? '<' : '>';
      query += ` AND ${sortBy} ${operator} ${seekValue}`;
      query += ` LIMIT ${limit}`;
    } else {
      // Use offset pagination
      const offset = (page - 1) * limit;
      query += ` LIMIT ${limit} OFFSET ${offset}`;
    }

    return query;
  }

  /**
   * Add query hints for performance
   */
  static addPerformanceHints(
    query: string,
    hints: {
      useIndex?: string;
      enableSeqScan?: boolean;
      enableHashJoin?: boolean;
      workMem?: string;
    }
  ): string {
    let optimizedQuery = query;

    if (hints.useIndex) {
      optimizedQuery = `/*+ IndexScan(${hints.useIndex}) */ ${optimizedQuery}`;
    }

    if (hints.enableSeqScan === false) {
      optimizedQuery = `SET enable_seqscan = off; ${optimizedQuery}; SET enable_seqscan = on;`;
    }

    if (hints.enableHashJoin === false) {
      optimizedQuery = `SET enable_hashjoin = off; ${optimizedQuery}; SET enable_hashjoin = on;`;
    }

    if (hints.workMem) {
      optimizedQuery = `SET work_mem = '${hints.workMem}'; ${optimizedQuery}; RESET work_mem;`;
    }

    return optimizedQuery;
  }
}
