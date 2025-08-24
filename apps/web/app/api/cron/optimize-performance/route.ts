/**
 * Performance Optimization Cron Job
 * Coordinates all optimization services for maximum system efficiency
 * Runs daily during low-traffic hours to optimize the entire system
 */

import { NextRequest, NextResponse } from "next/server";
import { PerformanceMonitor } from "~/lib/services/monitoring/PerformanceMonitor";
import { batchApiOptimizer } from "~/lib/services/batch-api-optimizer";
import { trafficAwareScheduler } from "~/lib/services/traffic-aware-scheduler";
import { dataFreshnessManager } from "~/lib/services/data-freshness-manager";
import { CacheManager } from "~/lib/services/cache-manager";

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const monitor = PerformanceMonitor.create("performance-optimization");
  monitor.startTimer("optimization");

  try {
    // Verify cron secret
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env['CRON_SECRET']}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("🚀 Starting comprehensive performance optimization...");

    // Check current system load
    const systemMetrics = await trafficAwareScheduler.getCurrentMetrics();
    console.log(`📊 Current system metrics:
      - CPU Usage: ${systemMetrics.cpuUsage}%
      - Memory Usage: ${systemMetrics.memoryUsage}MB
      - Queue Depth: ${systemMetrics.queueDepth}
      - Active Jobs: ${systemMetrics.activeJobs}
      - API Calls/min: ${systemMetrics.apiCallsPerMinute}
    `);

    // Should we delay optimization due to high load?
    const shouldDelay = await trafficAwareScheduler.shouldDelayJob("optimize-performance");
    if (shouldDelay.delay) {
      console.log(`⏰ Delaying performance optimization: ${shouldDelay.reason}`);
      return NextResponse.json({
        status: "delayed",
        reason: shouldDelay.reason,
        delayMinutes: shouldDelay.delayMinutes,
        executionTime: Date.now() - startTime
      });
    }

    const optimizationResults = {
      trafficAnalysis: null as any,
      scheduleOptimization: null as any,
      dataFreshness: null as any,
      cacheOptimization: null as any,
      batchApiStats: null as any,
      performanceReport: null as any,
    };

    // 1. Traffic Pattern Analysis and Schedule Optimization
    monitor.startTimer("traffic-analysis");
    try {
      console.log("📈 Analyzing traffic patterns...");
      await trafficAwareScheduler.analyzeTrafficPatterns(30); // Last 30 days
      
      const scheduleRecommendations = await trafficAwareScheduler.getScheduleRecommendations();
      console.log(`📋 Found ${scheduleRecommendations.length} schedule optimization opportunities`);
      
      // Apply significant improvements (>10% improvement)
      const significantImprovements = scheduleRecommendations.filter(r => r.expectedImprovement > 10);
      if (significantImprovements.length > 0) {
        const applyResults = await trafficAwareScheduler.applyRecommendations(significantImprovements);
        console.log(`✅ Applied ${applyResults.applied} schedule optimizations`);
        optimizationResults.scheduleOptimization = {
          recommendations: scheduleRecommendations.length,
          applied: applyResults.applied,
          failed: applyResults.failed,
          avgImprovement: significantImprovements.reduce((sum, r) => sum + r.expectedImprovement, 0) / significantImprovements.length
        };
      }

      optimizationResults.trafficAnalysis = {
        patternsUpdated: true,
        recommendationsGenerated: scheduleRecommendations.length,
        significantImprovements: significantImprovements.length
      };

    } catch (error) {
      console.error("❌ Traffic analysis failed:", error);
      optimizationResults.trafficAnalysis = { error: error instanceof Error ? error.message : "Unknown error" };
    }
    monitor.endTimer("traffic-analysis");

    // 2. Data Freshness Management
    monitor.startTimer("data-freshness");
    try {
      console.log("🔄 Checking data freshness and scheduling syncs...");
      const freshnessReport = await dataFreshnessManager.checkAndScheduleSyncs();
      
      console.log(`📊 Freshness report:
        - Total entities: ${freshnessReport.totalEntities}
        - Stale entities: ${freshnessReport.staleEntities}
        - Scheduled syncs: ${freshnessReport.scheduledSyncs}
        - Staleness rate: ${((freshnessReport.staleEntities / freshnessReport.totalEntities) * 100).toFixed(1)}%
      `);

      optimizationResults.dataFreshness = {
        totalEntities: freshnessReport.totalEntities,
        staleEntities: freshnessReport.staleEntities,
        scheduledSyncs: freshnessReport.scheduledSyncs,
        stalenessRate: (freshnessReport.staleEntities / freshnessReport.totalEntities) * 100,
        byType: freshnessReport.byType
      };

    } catch (error) {
      console.error("❌ Data freshness check failed:", error);
      optimizationResults.dataFreshness = { error: error instanceof Error ? error.message : "Unknown error" };
    }
    monitor.endTimer("data-freshness");

    // 3. Cache Optimization
    monitor.startTimer("cache-optimization");
    try {
      console.log("🧹 Optimizing cache patterns...");
      
      // Only clear expired cache entries (removed duplicative optimizeCachePatterns call)
      const clearedKeys = await CacheManager.clearExpired();
      console.log(`🗑️ Cleared ${clearedKeys} expired cache keys`);

      // Get cache performance metrics
      const cacheManager = CacheManager.getInstance();
      const cacheAnalysis = await cacheManager.analyzeCachePerformance();
      
      console.log(`📊 Cache performance analysis:
        - Hit rate: ${cacheAnalysis.hitRate.toFixed(2)}%
        - Top keys tracked: ${cacheAnalysis.topKeys.length}
        - Recommendations: ${cacheAnalysis.recommendations.length}
      `);

      optimizationResults.cacheOptimization = {
        clearedKeys,
        hitRate: cacheAnalysis.hitRate,
        topKeysCount: cacheAnalysis.topKeys.length,
        recommendations: cacheAnalysis.recommendations,
        patternsOptimized: false // Only clear expired, no pattern optimization
      };

    } catch (error) {
      console.error("❌ Cache optimization failed:", error);
      optimizationResults.cacheOptimization = { error: error instanceof Error ? error.message : "Unknown error" };
    }
    monitor.endTimer("cache-optimization");

    // 4. Batch API Optimizer Statistics
    monitor.startTimer("api-optimization");
    try {
      console.log("🔧 Analyzing batch API optimizer performance...");
      const batchStats = batchApiOptimizer.getStatistics();
      
      // Count total pending requests
      const totalPending = Object.values(batchStats.pendingRequests).reduce((sum, count) => sum + count, 0);
      
      // Check circuit breaker health
      const circuitBreakerHealth = Object.entries(batchStats.circuitBreakers).map(([api, state]) => ({
        api,
        state: state.state,
        healthy: state.state === 'CLOSED'
      }));

      console.log(`📊 Batch API Statistics:
        - Total pending requests: ${totalPending}
        - Circuit breakers healthy: ${circuitBreakerHealth.filter(cb => cb.healthy).length}/${circuitBreakerHealth.length}
      `);

      optimizationResults.batchApiStats = {
        pendingRequests: batchStats.pendingRequests,
        totalPending,
        circuitBreakers: circuitBreakerHealth,
        rateLimits: batchStats.rateLimits
      };

    } catch (error) {
      console.error("❌ API optimization analysis failed:", error);
      optimizationResults.batchApiStats = { error: error instanceof Error ? error.message : "Unknown error" };
    }
    monitor.endTimer("api-optimization");

    // 5. Generate Comprehensive Performance Report
    monitor.startTimer("report-generation");
    try {
      console.log("📋 Generating performance report...");
      const performanceReport = await monitor.generateReport();
      await monitor.persistMetrics(performanceReport);
      await monitor.createAlerts();

      optimizationResults.performanceReport = {
        totalOptimizationTime: performanceReport.totalImportMs, // This field exists in PerformanceMetrics
        memoryUsage: performanceReport.memoryUsageMb,
        cpuTime: performanceReport.cpuTimeMs,
        timestamp: performanceReport.timestamp
      };

    } catch (error) {
      console.error("❌ Performance report generation failed:", error);
      optimizationResults.performanceReport = { error: error instanceof Error ? error.message : "Unknown error" };
    }
    monitor.endTimer("report-generation");

    const totalExecutionTime = Date.now() - startTime;
    monitor.endTimer("optimization");

    // Calculate overall optimization success rate
    const successfulOperations = Object.values(optimizationResults).filter(result => 
      result && !result.error
    ).length;
    const totalOperations = Object.keys(optimizationResults).length;
    const successRate = (successfulOperations / totalOperations) * 100;

    console.log(`🎯 Performance optimization completed:
      - Success rate: ${successRate.toFixed(1)}%
      - Total execution time: ${totalExecutionTime}ms
      - Operations completed: ${successfulOperations}/${totalOperations}
    `);

    // Return comprehensive optimization results
    return NextResponse.json({
      status: "completed",
      successRate,
      results: optimizationResults,
      systemMetrics: {
        beforeOptimization: systemMetrics,
        afterOptimization: await trafficAwareScheduler.getCurrentMetrics(),
      },
      executionTime: totalExecutionTime,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error("❌ Performance optimization failed:", error);
    
    monitor.endTimer("optimization");
    await monitor.createAlerts();
    
    return NextResponse.json(
      {
        status: "failed",
        error: error instanceof Error ? error.message : "Unknown error",
        executionTime: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

// Health check endpoint
export async function GET() {
  return NextResponse.json({
    status: "ready",
    service: "performance-optimization",
    timestamp: new Date().toISOString(),
  });
}
