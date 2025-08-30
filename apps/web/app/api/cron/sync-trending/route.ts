import { db } from "@repo/database";
import { sql } from "drizzle-orm";
import { type NextRequest } from "next/server";
import {
  createErrorResponse,
  createSuccessResponse,
  requireCronAuth,
} from "~/lib/api/auth-helpers";

// Force dynamic rendering for API route
export const dynamic = "force-dynamic";

/**
 * High-frequency cron job for trending data synchronization:
 * - Updates trending scores for artists and shows
 * - Refreshes materialized views
 * - Cleans up old trending data
 * - Lightweight sync suitable for frequent execution (every 30 minutes)
 */
export async function POST(request: NextRequest) {
  try {
    // Standardized authentication
    await requireCronAuth();

    const body = await request.json().catch(() => ({}));
    const { includeCleanup = true } = body;

    const startTime = Date.now();
    const results = {
      artistsUpdated: 0,
      showsUpdated: 0,
      oldRecordsRemoved: 0,
      processingTime: 0,
      phases: {
        updateScores: { completed: false, duration: 0 },
        refreshData: { completed: false, duration: 0 },
        cleanup: { completed: false, duration: 0 },
      },
    };

    // Phase 1: Update trending scores
    const phase1Start = Date.now();
    try {
      await db.execute(sql`SELECT update_trendingScores()`);
      results.phases.updateScores.completed = true;
      results.phases.updateScores.duration = Date.now() - phase1Start;
    } catch (error) {
      console.warn("Failed to update trending scores:", error);
      // Continue with refresh attempt
    }

    // Phase 2: Refresh trending data and get stats
    const phase2Start = Date.now();
    try {
      const refreshResult = await db.execute(sql`SELECT refresh_trending_data() as result`);
      const result = (refreshResult as any)[0]?.result;
      
      if (result && typeof result === 'object') {
        results.artistsUpdated = result.artists_updated || 0;
        results.showsUpdated = result.shows_updated || 0;
      }
      
      results.phases.refreshData.completed = true;
      results.phases.refreshData.duration = Date.now() - phase2Start;
    } catch (error) {
      console.warn("Failed to refresh trending data:", error);
    }

    // Phase 3: Optional cleanup of old data
    if (includeCleanup) {
      const phase3Start = Date.now();
      try {
        // Clean up old trending records (older than 30 days)
        const cleanupResult = await db.execute(sql`
          WITH deleted_artists AS (
            DELETE FROM trending_artists 
            WHERE calculated_at < NOW() - INTERVAL '30 days'
            RETURNING id
          ),
          deleted_shows AS (
            DELETE FROM trending_shows 
            WHERE calculated_at < NOW() - INTERVAL '30 days'
            RETURNING id
          )
          SELECT 
            (SELECT COUNT(*) FROM deleted_artists) as artists_deleted,
            (SELECT COUNT(*) FROM deleted_shows) as shows_deleted
        `);
        
        const cleanupStats = (cleanupResult as any)[0];
        results.oldRecordsRemoved = 
          (cleanupStats?.artists_deleted || 0) + (cleanupStats?.shows_deleted || 0);

        results.phases.cleanup.completed = true;
        results.phases.cleanup.duration = Date.now() - phase3Start;
      } catch (error) {
        console.warn("Failed to cleanup old trending data:", error);
      }
    }

    results.processingTime = Date.now() - startTime;

    // Log successful completion
    try {
      await db.execute(sql`
        SELECT log_cron_run(
          'sync-trending', 
          'success',
          ${JSON.stringify(results)}
        )
      `);
    } catch {}

    return createSuccessResponse({
      message: "Trending data sync completed successfully",
      results,
    });
  } catch (error) {
    console.error("Trending sync failed:", error);

    // Log error
    try {
      await db.execute(sql`
        SELECT log_cron_run(
          'sync-trending', 
          'failed',
          ${JSON.stringify({ error: error instanceof Error ? error.message : String(error) })}
        )
      `);
    } catch {}

    return createErrorResponse(
      "Trending sync failed",
      500,
      error instanceof Error ? error.message : "Unknown error",
    );
  }
}

export async function GET(request: NextRequest) {
  // Support GET requests for manual triggers
  return POST(request);
}