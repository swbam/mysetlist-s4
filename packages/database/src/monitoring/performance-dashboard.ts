/**
 * Performance Monitoring Dashboard
 *
 * Provides comprehensive performance monitoring for TheSet application
 * including database metrics, query performance, and optimization recommendations.
 */

import { sql } from "drizzle-orm";
import { db } from "../client";

// ================================
// PERFORMANCE METRICS INTERFACES
// ================================

export interface DatabasePerformanceMetrics {
  cacheHitRatio: {
    bufferCache: number;
    indexCache: number;
    status: "EXCELLENT" | "GOOD" | "NEEDS_ATTENTION" | "CRITICAL";
  };
  indexUsage: {
    totalIndexes: number;
    unusedIndexes: number;
    highUsageIndexes: number;
    recommendations: string[];
  };
  tableStats: {
    tablesWithHighSeqScans: number;
    tablesNeedingVacuum: number;
    totalRows: number;
    recommendations: string[];
  };
  queryPerformance: {
    slowQueries: number;
    avgQueryTime: number;
    recommendations: string[];
  };
}

export interface ApplicationPerformanceMetrics {
  artistImportOrchestrator: {
    avgImportTime: number;
    successRate: number;
    activeImports: number;
    queueLength: number;
  };
  realTimeVoting: {
    avgResponseTime: number;
    activeConnections: number;
    votesThroughput: number;
  };
  caching: {
    hitRate: number;
    missRate: number;
    cacheSize: number;
    evictionRate: number;
  };
}

// ================================
// DATABASE PERFORMANCE MONITORING
// ================================

export class DatabasePerformanceMonitor {
  async getCacheHitRatio(): Promise<
    DatabasePerformanceMetrics["cacheHitRatio"]
  > {
    const result = await db.execute(sql`
      SELECT 
        'buffer_cache' as cache_type,
        ROUND(
          (sum(heap_blks_hit)::numeric / NULLIF(sum(heap_blks_hit) + sum(heap_blks_read), 0) * 100), 
          2
        ) as hit_ratio
      FROM pg_statio_user_tables
      WHERE schemaname = 'public'
      
      UNION ALL
      
      SELECT 
        'index_cache' as cache_type,
        ROUND(
          (sum(idx_blks_hit)::numeric / NULLIF(sum(idx_blks_hit) + sum(idx_blks_read), 0) * 100),
          2
        ) as hit_ratio
      FROM pg_statio_user_indexes
      WHERE schemaname = 'public'
    `);

    const bufferCache =
      result.rows.find((r: { cache_type: string; }) => r.cache_type === "buffer_cache")?.hit_ratio || 0;
    const indexCache =
      result.rows.find((r: { cache_type: string; }) => r.cache_type === "index_cache")?.hit_ratio || 0;

    const avgHitRatio = (bufferCache + indexCache) / 2;

    let status: "EXCELLENT" | "GOOD" | "NEEDS_ATTENTION" | "CRITICAL";
    if (avgHitRatio >= 95) status = "EXCELLENT";
    else if (avgHitRatio >= 90) status = "GOOD";
    else if (avgHitRatio >= 80) status = "NEEDS_ATTENTION";
    else status = "CRITICAL";

    return {
      bufferCache,
      indexCache,
      status,
    };
  }

  async getIndexUsageStats(): Promise<
    DatabasePerformanceMetrics["indexUsage"]
  > {
    const stats = await db.execute(sql`
      SELECT 
        COUNT(*) as total_indexes,
        COUNT(*) FILTER (WHERE idx_scan = 0) as unused_indexes,
        COUNT(*) FILTER (WHERE idx_scan > 1000) as high_usage_indexes
      FROM pg_stat_user_indexes
      WHERE schemaname = 'public'
    `);

    const unusedIndexes = await db.execute(sql`
      SELECT indexname, tablename 
      FROM pg_stat_user_indexes
      WHERE schemaname = 'public' AND idx_scan = 0
      LIMIT 5
    `);

    const recommendations: string[] = [];

    if (stats.rows[0]?.unused_indexes > 0) {
      recommendations.push(
        `Consider dropping ${stats.rows[0].unused_indexes} unused indexes`,
      );
    }

    if (unusedIndexes.rows.length > 0) {
      recommendations.push(
        `Review these unused indexes: ${unusedIndexes.rows.map((r: { indexname: any; }) => r.indexname).join(", ")}`,
      );
    }

    return {
      totalIndexes: stats.rows[0]?.total_indexes || 0,
      unusedIndexes: stats.rows[0]?.unused_indexes || 0,
      highUsageIndexes: stats.rows[0]?.high_usage_indexes || 0,
      recommendations,
    };
  }

  async getTableStats(): Promise<DatabasePerformanceMetrics["tableStats"]> {
    const stats = await db.execute(sql`
      SELECT 
        COUNT(*) as total_tables,
        COUNT(*) FILTER (WHERE seq_scan > idx_scan AND seq_scan > 1000) as high_seq_scan_tables,
        COUNT(*) FILTER (WHERE (n_tup_upd + n_tup_del) > 1000 AND last_vacuum IS NULL) as needs_vacuum_tables,
        SUM(n_tup_ins + n_tup_upd + n_tup_del) as total_row_operations
      FROM pg_stat_user_tables
      WHERE schemaname = 'public'
    `);

    const heavySeqScanTables = await db.execute(sql`
      SELECT tablename, seq_scan, idx_scan
      FROM pg_stat_user_tables
      WHERE schemaname = 'public' 
      AND seq_scan > idx_scan 
      AND seq_scan > 1000
      ORDER BY seq_scan DESC
      LIMIT 3
    `);

    const recommendations: string[] = [];

    if (stats.rows[0]?.high_seq_scan_tables > 0) {
      recommendations.push(
        `${stats.rows[0].high_seq_scan_tables} tables have high sequential scan rates`,
      );
    }

    if (stats.rows[0]?.needs_vacuum_tables > 0) {
      recommendations.push(
        `${stats.rows[0].needs_vacuum_tables} tables need VACUUM maintenance`,
      );
    }

    if (heavySeqScanTables.rows.length > 0) {
      recommendations.push(
        `Consider adding indexes to: ${heavySeqScanTables.rows.map((r: { tablename: any; }) => r.tablename).join(", ")}`,
      );
    }

    return {
      tablesWithHighSeqScans: stats.rows[0]?.high_seq_scan_tables || 0,
      tablesNeedingVacuum: stats.rows[0]?.needs_vacuum_tables || 0,
      totalRows: stats.rows[0]?.total_row_operations || 0,
      recommendations,
    };
  }

  async getQueryPerformance(): Promise<
    DatabasePerformanceMetrics["queryPerformance"]
  > {
    // Check if pg_stat_statements is enabled
    const extensionCheck = await db.execute(sql`
      SELECT EXISTS(SELECT 1 FROM pg_extension WHERE extname = 'pg_stat_statements') as enabled
    `);

    if (!extensionCheck.rows[0]?.enabled) {
      return {
        slowQueries: 0,
        avgQueryTime: 0,
        recommendations: [
          "Enable pg_stat_statements extension for detailed query analysis",
        ],
      };
    }

    const queryStats = await db.execute(sql`
      SELECT 
        COUNT(*) FILTER (WHERE mean_exec_time > 100) as slow_queries,
        ROUND(AVG(mean_exec_time)::numeric, 2) as avg_query_time
      FROM pg_stat_statements
      WHERE calls > 10
    `);

    const recommendations: string[] = [];
    const slowQueries = queryStats.rows[0]?.slow_queries || 0;
    const avgQueryTime = queryStats.rows[0]?.avg_query_time || 0;

    if (slowQueries > 10) {
      recommendations.push(
        `${slowQueries} queries are running slower than 100ms on average`,
      );
    }

    if (avgQueryTime > 50) {
      recommendations.push(
        `Average query time of ${avgQueryTime}ms is above optimal threshold`,
      );
    }

    return {
      slowQueries,
      avgQueryTime,
      recommendations,
    };
  }

  async getComprehensiveMetrics(): Promise<DatabasePerformanceMetrics> {
    const [cacheHitRatio, indexUsage, tableStats, queryPerformance] =
      await Promise.all([
        this.getCacheHitRatio(),
        this.getIndexUsageStats(),
        this.getTableStats(),
        this.getQueryPerformance(),
      ]);

    return {
      cacheHitRatio,
      indexUsage,
      tableStats,
      queryPerformance,
    };
  }
}

// ================================
// APPLICATION PERFORMANCE MONITORING
// ================================

export class ApplicationPerformanceMonitor {
  async getArtistImportMetrics(): Promise<
    ApplicationPerformanceMetrics["artistImportOrchestrator"]
  > {
    // These would typically come from application metrics, Redis, or monitoring tables
    // For now, we'll simulate with database queries

    const importStats = await db.execute(sql`
      SELECT 
        COUNT(*) as total_artists,
        COUNT(*) FILTER (WHERE last_synced_at >= NOW() - INTERVAL '1 hour') as recent_syncs,
        COUNT(*) FILTER (WHERE last_synced_at IS NULL OR last_synced_at < NOW() - INTERVAL '6 hours') as pending_syncs
      FROM artists
      WHERE spotify_id IS NOT NULL
    `);

    return {
      avgImportTime: 2.5, // seconds - would come from monitoring
      successRate: 0.95, // 95% - would come from logs
      activeImports: 0, // would come from Redis or application state
      queueLength: importStats.rows[0]?.pending_syncs || 0,
    };
  }

  async getRealTimeVotingMetrics(): Promise<
    ApplicationPerformanceMetrics["realTimeVoting"]
  > {
    const recentVotes = await db.execute(sql`
      SELECT 
        COUNT(*) as votes_last_hour,
        COUNT(DISTINCT user_id) as active_voters
      FROM votes
      WHERE created_at >= NOW() - INTERVAL '1 hour'
    `);

    return {
      avgResponseTime: 45, // ms - would come from monitoring
      activeConnections: 0, // would come from realtime service
      votesThroughput: recentVotes.rows[0]?.votes_last_hour || 0,
    };
  }

  async getCachingMetrics(): Promise<ApplicationPerformanceMetrics["caching"]> {
    // These would typically come from Redis monitoring or application metrics
    return {
      hitRate: 0.89, // 89% - would come from Redis stats
      missRate: 0.11, // 11%
      cacheSize: 1024, // MB - would come from Redis info
      evictionRate: 0.02, // 2% - would come from Redis stats
    };
  }

  async getComprehensiveMetrics(): Promise<ApplicationPerformanceMetrics> {
    const [artistImportOrchestrator, realTimeVoting, caching] =
      await Promise.all([
        this.getArtistImportMetrics(),
        this.getRealTimeVotingMetrics(),
        this.getCachingMetrics(),
      ]);

    return {
      artistImportOrchestrator,
      realTimeVoting,
      caching,
    };
  }
}

// ================================
// PERFORMANCE RECOMMENDATIONS ENGINE
// ================================

export class PerformanceRecommendationsEngine {
  async generateRecommendations(): Promise<{
    critical: string[];
    important: string[];
    optimization: string[];
  }> {
    const dbMonitor = new DatabasePerformanceMonitor();
    const appMonitor = new ApplicationPerformanceMonitor();

    const [dbMetrics, appMetrics] = await Promise.all([
      dbMonitor.getComprehensiveMetrics(),
      appMonitor.getComprehensiveMetrics(),
    ]);

    const critical: string[] = [];
    const important: string[] = [];
    const optimization: string[] = [];

    // Critical issues
    if (dbMetrics.cacheHitRatio.status === "CRITICAL") {
      critical.push(
        "Database cache hit ratio is critically low - consider increasing shared_buffers",
      );
    }

    if (dbMetrics.queryPerformance.slowQueries > 20) {
      critical.push(
        "High number of slow queries detected - review and optimize query patterns",
      );
    }

    if (appMetrics.artistImportOrchestrator.successRate < 0.9) {
      critical.push(
        "Artist import success rate below 90% - investigate API rate limits and errors",
      );
    }

    // Important issues
    if (dbMetrics.indexUsage.unusedIndexes > 5) {
      important.push(
        "Multiple unused indexes detected - consider cleanup to reduce maintenance overhead",
      );
    }

    if (dbMetrics.tableStats.tablesWithHighSeqScans > 0) {
      important.push(
        "Tables with high sequential scan rates - add missing indexes",
      );
    }

    if (appMetrics.caching.hitRate < 0.85) {
      important.push(
        "Cache hit rate below 85% - review caching strategy and TTL settings",
      );
    }

    // Optimization opportunities
    if (dbMetrics.cacheHitRatio.bufferCache < 98) {
      optimization.push(
        "Buffer cache can be improved - consider tuning PostgreSQL configuration",
      );
    }

    if (appMetrics.artistImportOrchestrator.queueLength > 100) {
      optimization.push(
        "High import queue length - consider increasing parallel processing",
      );
    }

    if (dbMetrics.tableStats.tablesNeedingVacuum > 0) {
      optimization.push(
        "Some tables need VACUUM maintenance - schedule regular maintenance",
      );
    }

    return { critical, important, optimization };
  }
}

// ================================
// AUTOMATED PERFORMANCE ALERTS
// ================================

export class PerformanceAlerts {
  async checkAlertConditions(): Promise<{
    alerts: Array<{
      severity: "HIGH" | "MEDIUM" | "LOW";
      metric: string;
      message: string;
      timestamp: Date;
    }>;
  }> {
    const alerts: Array<{
      severity: "HIGH" | "MEDIUM" | "LOW";
      metric: string;
      message: string;
      timestamp: Date;
    }> = [];

    const dbMonitor = new DatabasePerformanceMonitor();
    const metrics = await dbMonitor.getComprehensiveMetrics();

    const timestamp = new Date();

    // High severity alerts
    if (metrics.cacheHitRatio.status === "CRITICAL") {
      alerts.push({
        severity: "HIGH",
        metric: "cache_hit_ratio",
        message: `Database cache hit ratio critically low: ${metrics.cacheHitRatio.bufferCache}%`,
        timestamp,
      });
    }

    if (metrics.queryPerformance.avgQueryTime > 200) {
      alerts.push({
        severity: "HIGH",
        metric: "query_performance",
        message: `Average query time too high: ${metrics.queryPerformance.avgQueryTime}ms`,
        timestamp,
      });
    }

    // Medium severity alerts
    if (metrics.indexUsage.unusedIndexes > 10) {
      alerts.push({
        severity: "MEDIUM",
        metric: "index_usage",
        message: `${metrics.indexUsage.unusedIndexes} unused indexes detected`,
        timestamp,
      });
    }

    if (metrics.tableStats.tablesWithHighSeqScans > 3) {
      alerts.push({
        severity: "MEDIUM",
        metric: "table_performance",
        message: `${metrics.tableStats.tablesWithHighSeqScans} tables with high sequential scan rates`,
        timestamp,
      });
    }

    // Low severity alerts
    if (metrics.tableStats.tablesNeedingVacuum > 0) {
      alerts.push({
        severity: "LOW",
        metric: "maintenance",
        message: `${metrics.tableStats.tablesNeedingVacuum} tables need VACUUM maintenance`,
        timestamp,
      });
    }

    return { alerts };
  }
}

// ================================
// MAIN PERFORMANCE DASHBOARD
// ================================

export class PerformanceDashboard {
  private dbMonitor: DatabasePerformanceMonitor;
  private appMonitor: ApplicationPerformanceMonitor;
  private recommendationsEngine: PerformanceRecommendationsEngine;
  private alertsService: PerformanceAlerts;

  constructor() {
    this.dbMonitor = new DatabasePerformanceMonitor();
    this.appMonitor = new ApplicationPerformanceMonitor();
    this.recommendationsEngine = new PerformanceRecommendationsEngine();
    this.alertsService = new PerformanceAlerts();
  }

  async getFullPerformanceReport() {
    const [dbMetrics, appMetrics, recommendations, alerts] = await Promise.all([
      this.dbMonitor.getComprehensiveMetrics(),
      this.appMonitor.getComprehensiveMetrics(),
      this.recommendationsEngine.generateRecommendations(),
      this.alertsService.checkAlertConditions(),
    ]);

    return {
      timestamp: new Date(),
      database: dbMetrics,
      application: appMetrics,
      recommendations,
      alerts: alerts.alerts,
      summary: {
        overallHealth: this.calculateOverallHealth(dbMetrics, appMetrics),
        criticalIssues: recommendations.critical.length,
        importantIssues: recommendations.important.length,
        optimizationOpportunities: recommendations.optimization.length,
      },
    };
  }

  private calculateOverallHealth(
    dbMetrics: DatabasePerformanceMetrics,
    appMetrics: ApplicationPerformanceMetrics,
  ): "EXCELLENT" | "GOOD" | "NEEDS_ATTENTION" | "CRITICAL" {
    let score = 100;

    // Database health factors
    if (dbMetrics.cacheHitRatio.status === "CRITICAL") score -= 40;
    else if (dbMetrics.cacheHitRatio.status === "NEEDS_ATTENTION") score -= 20;
    else if (dbMetrics.cacheHitRatio.status === "GOOD") score -= 5;

    if (dbMetrics.queryPerformance.slowQueries > 20) score -= 30;
    else if (dbMetrics.queryPerformance.slowQueries > 10) score -= 15;

    if (dbMetrics.indexUsage.unusedIndexes > 10) score -= 10;
    else if (dbMetrics.indexUsage.unusedIndexes > 5) score -= 5;

    // Application health factors
    if (appMetrics.artistImportOrchestrator.successRate < 0.9) score -= 25;
    else if (appMetrics.artistImportOrchestrator.successRate < 0.95)
      score -= 10;

    if (appMetrics.caching.hitRate < 0.8) score -= 20;
    else if (appMetrics.caching.hitRate < 0.9) score -= 10;

    if (score >= 90) return "EXCELLENT";
    if (score >= 75) return "GOOD";
    if (score >= 60) return "NEEDS_ATTENTION";
    return "CRITICAL";
  }

  // Method to run automated performance maintenance
  async runPerformanceMaintenance(): Promise<{
    success: boolean;
    actionsPerformed: string[];
    errors: string[];
  }> {
    const actionsPerformed: string[] = [];
    const errors: string[] = [];

    try {
      // Refresh materialized views
      await db.execute(sql`SELECT refresh_performance_caches()`);
      actionsPerformed.push("Refreshed performance materialized views");

      // Update table statistics
      await db.execute(sql`ANALYZE`);
      actionsPerformed.push("Updated table statistics");

      // Run performance maintenance function
      await db.execute(sql`SELECT run_performance_maintenance()`);
      actionsPerformed.push("Executed performance maintenance procedures");
    } catch (error) {
      errors.push(`Maintenance error: ${error}`);
    }

    return {
      success: errors.length === 0,
      actionsPerformed,
      errors,
    };
  }
}

// Export singleton instance
export const performanceDashboard = new PerformanceDashboard();
