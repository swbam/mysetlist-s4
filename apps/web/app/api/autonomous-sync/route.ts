import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import {
  createErrorResponse,
  createSuccessResponse,
  requireCronAuth,
} from "~/lib/api/auth-helpers";

// Force dynamic rendering for API route
export const dynamic = "force-dynamic";

/**
 * Autonomous Sync Engine - GROK.md Implementation
 * Handles 3 autonomous pipelines: trending, sync, maintenance
 * Replaces 15+ separate cron jobs with optimized batch processing
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate autonomous sync request
    await requireCronAuth();

    const searchParams = request.nextUrl.searchParams;
    const pipeline = searchParams.get("pipeline");

    if (!pipeline) {
      return createErrorResponse("Pipeline parameter required", 400);
    }

    switch (pipeline) {
      case "trending":
        return await handleTrendingPipeline();
      case "sync":
        return await handleSyncPipeline();
      case "maintenance":
        return await handleMaintenancePipeline();
      default:
        return createErrorResponse(`Unknown pipeline: ${pipeline}`, 400);
    }
  } catch (error) {
    console.error("Autonomous sync error:", error);
    return createErrorResponse(
      "Autonomous sync failed",
      500,
      error instanceof Error ? error.message : "Unknown error",
    );
  }
}

/**
 * PIPELINE 1: Trending Engine (Every 30 minutes)
 * Optimized batch processing for trending calculations
 */
async function handleTrendingPipeline() {
  const startTime = Date.now();

  try {
    // Trigger existing trending sync endpoint
    const trendingResponse = await fetch(
      `${process.env.VERCEL_URL || "http://localhost:3001"}/api/cron/sync-trending`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.CRON_SECRET}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          pipeline: "autonomous-trending",
          batchSize: 50,
          skipRecentlyUpdated: true,
        }),
      },
    );

    if (!trendingResponse.ok) {
      throw new Error(`Trending sync failed: ${trendingResponse.status}`);
    }

    const trendingResult = await trendingResponse.json();

    // Update autonomous sync health
    const supabase = createRouteHandlerClient({
      cookies: cookies,
    });

    await supabase.rpc("log_autonomous_sync", {
      pipeline_name: "trending",
      status: "success",
      processing_time: Date.now() - startTime,
      metadata: trendingResult,
    });

    return createSuccessResponse({
      pipeline: "trending",
      status: "completed",
      processingTime: Date.now() - startTime,
      results: trendingResult,
    });
  } catch (error) {
    console.error("Trending pipeline error:", error);

    // Log failure
    try {
      const supabase = createRouteHandlerClient({
        cookies: cookies,
      });

      await supabase.rpc("log_autonomous_sync", {
        pipeline_name: "trending",
        status: "failed",
        processing_time: Date.now() - startTime,
        error_message: error instanceof Error ? error.message : "Unknown error",
      });
    } catch {}

    throw error;
  }
}

/**
 * PIPELINE 2: Sync Engine (Every 4 hours)
 * Parallel artist sync processing with priority ranking
 */
async function handleSyncPipeline() {
  const startTime = Date.now();

  try {
    // Trigger artist sync with batch processing
    const syncResponse = await fetch(
      `${process.env.VERCEL_URL || "http://localhost:3001"}/api/cron/trending-artist-sync`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.CRON_SECRET}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          pipeline: "autonomous-sync",
          limit: 100,
          skipRecentlyUpdated: true,
          parallelBatches: 3,
        }),
      },
    );

    if (!syncResponse.ok) {
      throw new Error(`Sync pipeline failed: ${syncResponse.status}`);
    }

    const syncResult = await syncResponse.json();

    // Update autonomous sync health
    const supabase = createRouteHandlerClient({
      cookies: cookies,
    });

    await supabase.rpc("log_autonomous_sync", {
      pipeline_name: "sync",
      status: "success",
      processing_time: Date.now() - startTime,
      metadata: syncResult,
    });

    return createSuccessResponse({
      pipeline: "sync",
      status: "completed",
      processingTime: Date.now() - startTime,
      results: syncResult,
    });
  } catch (error) {
    console.error("Sync pipeline error:", error);

    // Log failure
    try {
      const supabase = createRouteHandlerClient({
        cookies: cookies,
      });

      await supabase.rpc("log_autonomous_sync", {
        pipeline_name: "sync",
        status: "failed",
        processing_time: Date.now() - startTime,
        error_message: error instanceof Error ? error.message : "Unknown error",
      });
    } catch {}

    throw error;
  }
}

/**
 * PIPELINE 3: Maintenance Engine (Daily at 3 AM)
 * Database cleanup, optimization, and health monitoring
 */
async function handleMaintenancePipeline() {
  const startTime = Date.now();
  const results = {
    cleanupOperations: 0,
    optimizationQueries: 0,
    healthChecks: 0,
    errors: [] as string[],
  };

  try {
    const supabase = createRouteHandlerClient({
      cookies: cookies,
    });

    // 1. Database Maintenance
    try {
      // Clean up old import status records (> 7 days)
      const { error: cleanupError } = await supabase
        .from("import_status")
        .delete()
        .lt(
          "created_at",
          new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        );

      if (!cleanupError) results.cleanupOperations++;
    } catch (error) {
      results.errors.push(`Cleanup failed: ${error}`);
    }

    // 2. Update trending scores
    try {
      await supabase.rpc("update_trending_scores");
      await supabase.rpc("refresh_trending_data");
      results.optimizationQueries += 2;
    } catch (error) {
      results.errors.push(`Trending update failed: ${error}`);
    }

    // 3. Health checks
    try {
      const { data: healthData } = await supabase
        .from("autonomous_sync_health")
        .select("*");

      if (healthData) results.healthChecks++;
    } catch (error) {
      results.errors.push(`Health check failed: ${error}`);
    }

    // 4. Cache cleanup
    try {
      const cacheResponse = await fetch(
        `${process.env.VERCEL_URL || "http://localhost:3001"}/api/admin/cache/cleanup`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.CRON_SECRET}`,
          },
        },
      );

      if (cacheResponse.ok) results.cleanupOperations++;
    } catch (error) {
      results.errors.push(`Cache cleanup failed: ${error}`);
    }

    // Log maintenance completion
    await supabase.rpc("log_autonomous_sync", {
      pipeline_name: "maintenance",
      status: results.errors.length === 0 ? "success" : "partial_success",
      processing_time: Date.now() - startTime,
      metadata: results,
    });

    return createSuccessResponse({
      pipeline: "maintenance",
      status:
        results.errors.length === 0 ? "completed" : "completed_with_errors",
      processingTime: Date.now() - startTime,
      results,
    });
  } catch (error) {
    console.error("Maintenance pipeline error:", error);
    results.errors.push(
      error instanceof Error ? error.message : "Unknown error",
    );

    // Log failure
    try {
      const supabase = createRouteHandlerClient({
        cookies: cookies,
      });

      await supabase.rpc("log_autonomous_sync", {
        pipeline_name: "maintenance",
        status: "failed",
        processing_time: Date.now() - startTime,
        error_message: error instanceof Error ? error.message : "Unknown error",
      });
    } catch {}

    throw error;
  }
}

// Support POST for manual triggers
export async function POST(request: NextRequest) {
  return GET(request);
}
