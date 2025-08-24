/**
 * Cache Warming Cron Job
 * Implements predictive cache warming based on traffic patterns and access heat map
 * Runs every 15 minutes during optimal system load periods
 */

import { NextRequest, NextResponse } from "next/server";
import { cacheManager } from "~/lib/services/cache-manager";
import { predictiveCacheManager } from "~/lib/services/predictive-cache-manager";
import { trafficAwareScheduler } from "~/lib/services/traffic-aware-scheduler";

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Verify cron secret
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env['CRON_SECRET']}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("🔥 Starting predictive cache warming...");

    // Check current system load to determine warming strategy
    const systemMetrics = await trafficAwareScheduler.getCurrentMetrics();
    
    // Should we delay this warming cycle?
    const shouldDelay = await trafficAwareScheduler.shouldDelayJob("warm-cache");
    if (shouldDelay.delay) {
      console.log(`⏰ Delaying cache warming: ${shouldDelay.reason}`);
      return NextResponse.json({
        status: "delayed",
        reason: shouldDelay.reason,
        delayMinutes: shouldDelay.delayMinutes,
        executionTime: Date.now() - startTime
      });
    }

    let warmingIntensity: "light" | "medium" | "intensive" = "medium";
    
    // Adjust warming intensity based on system load
    if (systemMetrics.cpuUsage > 70 || systemMetrics.queueDepth > 500) {
      warmingIntensity = "light";
    } else if (systemMetrics.cpuUsage < 30 && systemMetrics.queueDepth < 100) {
      warmingIntensity = "intensive";
    }

    console.log(`📊 System metrics - CPU: ${systemMetrics.cpuUsage}%, Queue: ${systemMetrics.queueDepth}, Intensity: ${warmingIntensity}`);

    let warmedCount = 0;
    let skippedCount = 0;

    // Execute warming based on intensity level using predictive cache manager
    switch (warmingIntensity) {
      case "light":
        // Only warm the most critical content using predictive manager
        const lightReport = await predictiveCacheManager.warmPopularContent();
        warmedCount = lightReport.successfulWarms;
        skippedCount = lightReport.failedWarms;
        console.log("✅ Light predictive warming completed");
        break;

      case "medium":
        // Standard warming strategy with both managers
        const mediumResults = await Promise.allSettled([
          predictiveCacheManager.warmPopularContent(),
          predictiveCacheManager.analyzeAccessPatterns(), // Also run pattern analysis
          cacheManager.warmCache("trending"),
        ]);
        
        // Aggregate results
        mediumResults.forEach((result) => {
          if (result.status === "fulfilled" && typeof result.value === "object" && result.value) {
            const value = result.value as any;
            if (typeof value.successfulWarms === 'number' && typeof value.failedWarms === 'number') {
              warmedCount += value.successfulWarms;
              skippedCount += value.failedWarms;
            } else if (typeof value.warmed === 'number' && typeof value.skipped === 'number') {
              warmedCount += value.warmed;
              skippedCount += value.skipped;
            }
          }
        });
        console.log("✅ Medium predictive warming completed");
        break;

      case "intensive":
        // Full warming strategy during low traffic with comprehensive predictive warming
        const intensiveResults = await Promise.allSettled([
          predictiveCacheManager.warmPopularContent(),
          predictiveCacheManager.warmUpcomingShows(),
          cacheManager.warmCache("all"),
        ]);
        
        // Aggregate results
        intensiveResults.forEach((result) => {
          if (result.status === "fulfilled" && typeof result.value === "object" && result.value) {
            const value = result.value as any;
            if (typeof value.successfulWarms === 'number' && typeof value.failedWarms === 'number') {
              warmedCount += value.successfulWarms;
              skippedCount += value.failedWarms;
            } else if (typeof value.warmed === 'number' && typeof value.skipped === 'number') {
              warmedCount += value.warmed;
              skippedCount += value.skipped;
            }
          }
        });
        console.log("✅ Intensive predictive warming completed");
        break;
    }

    // Analyze cache performance after warming
    const cacheAnalysis = await cacheManager.analyzeCachePerformance();
    
    // Log warming results
    const executionTime = Date.now() - startTime;
    console.log(`🎯 Cache warming summary:
      - Intensity: ${warmingIntensity}
      - Warmed entries: ${warmedCount}
      - Skipped entries: ${skippedCount}
      - Cache hit rate: ${cacheAnalysis.hitRate.toFixed(2)}%
      - Execution time: ${executionTime}ms
      - Top performing keys: ${cacheAnalysis.topKeys.length}
    `);

    // Return detailed warming results
    return NextResponse.json({
      status: "completed",
      warmingIntensity,
      results: {
        warmed: warmedCount,
        skipped: skippedCount,
        hitRate: cacheAnalysis.hitRate,
        topKeys: cacheAnalysis.topKeys.slice(0, 5), // Top 5 for response size
        recommendations: cacheAnalysis.recommendations,
      },
      systemMetrics: {
        cpuUsage: systemMetrics.cpuUsage,
        memoryUsage: systemMetrics.memoryUsage,
        queueDepth: systemMetrics.queueDepth,
        activeJobs: systemMetrics.activeJobs,
      },
      executionTime,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error("❌ Cache warming failed:", error);
    
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
    service: "cache-warming",
    timestamp: new Date().toISOString(),
  });
}
