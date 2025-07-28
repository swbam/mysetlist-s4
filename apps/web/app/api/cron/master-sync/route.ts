import { db } from "@repo/database";
import { artists, userActivityLog } from "@repo/database";
import { desc, isNull, lte, or, sql } from "drizzle-orm";
import { headers } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";

/**
 * Master Sync Endpoint - Consolidated sync operations
 * Combines all data synchronization operations into a single, comprehensive endpoint
 *
 * Supports both daily and hourly sync modes via query parameters:
 * - ?mode=daily - Full sync including popular artists, shows, and setlists
 * - ?mode=hourly - Light sync for trending updates and recent changes
 * - ?mode=full - Complete resync (use sparingly)
 */
export async function GET(request: NextRequest) {
  // Verify cron secret
  const headersList = await headers();
  const cronSecret = headersList.get("x-cron-secret");
  const authHeader = headersList.get("authorization");

  // Support both header formats for compatibility
  const isAuthorized =
    (process.env["CRON_SECRET"] && cronSecret === process.env["CRON_SECRET"]) ||
    (process.env["CRON_SECRET"] &&
      authHeader === `Bearer ${process.env["CRON_SECRET"]}`);

  if (process.env["CRON_SECRET"] && !isAuthorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startTime = Date.now();
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("mode") || "daily"; // daily, hourly, full
  const dryRun = searchParams.get("dry-run") === "true";

  const results = {
    mode,
    dryRun,
    startTime: new Date().toISOString(),
    duration: "",
    phases: {
      popularArtists: { processed: 0, synced: 0, errors: 0, skipped: 0 },
      artistData: { processed: 0, synced: 0, errors: 0, skipped: 0 },
      shows: { processed: 0, synced: 0, errors: 0, skipped: 0 },
      setlists: { processed: 0, synced: 0, errors: 0, skipped: 0 },
      cleanup: { completed: false, errors: 0 },
      database: { transactionStatus: "none", updatedRecords: 0 },
    },
    summary: {
      totalProcessed: 0,
      totalSynced: 0,
      totalErrors: 0,
      artistsUpdated: 0,
      showsCreated: 0,
      setlistsCreated: 0,
    },
    errors: [] as string[],
    warnings: [] as string[],
  };

  let transaction = null;

  try {
    // Log sync start
    if (!dryRun) {
      await db.insert(userActivityLog).values({
        userId: null, // System operation
        action: `master-sync-${mode}`,
        targetType: "system",
        details: {
          mode,
          startTime: results.startTime,
          userAgent: headersList.get("user-agent") || "System/Cron",
        },
      });
    }

    // Phase 1: Get artists to sync based on mode
    const artistsToSync = await getArtistsToSync(mode);
    results.phases.popularArtists.processed = artistsToSync.length;
    results.summary.totalProcessed += artistsToSync.length;

    if (artistsToSync.length === 0) {
      results.warnings.push("No artists found that need syncing");
      return NextResponse.json({
        success: true,
        message: "No sync operations needed",
        ...results,
        duration: `${(Date.now() - startTime) / 1000}s`,
      });
    }

    // Phase 2: Process each artist with comprehensive sync
    for (const artist of artistsToSync) {
      try {
        if (dryRun) {
          // Dry run - just log what would be synced
          results.phases.popularArtists.synced++;
          continue;
        }

        const syncResult = await syncArtistComprehensive(artist, mode);

        if (syncResult.success) {
          results.phases.popularArtists.synced++;
          results.phases.artistData.synced += syncResult.artistUpdated ? 1 : 0;
          results.phases.shows.synced += syncResult.showsSync?.synced || 0;
          results.phases.setlists.synced +=
            syncResult.setlistsSync?.synced || 0;
          results.summary.artistsUpdated += syncResult.artistUpdated ? 1 : 0;
          results.summary.showsCreated += syncResult.showsSync?.synced || 0;
          results.summary.setlistsCreated +=
            syncResult.setlistsSync?.synced || 0;
        } else {
          results.phases.popularArtists.errors++;
          results.errors.push(`Artist ${artist.name}: ${syncResult.error}`);
        }

        // Update database timestamps
        await db
          .update(artists)
          .set({
            lastSyncedAt: new Date(),
            lastFullSyncAt:
              mode === "full" ? new Date() : artist.lastFullSyncAt,
            songCatalogSyncedAt: syncResult.catalogUpdated
              ? new Date()
              : artist.songCatalogSyncedAt,
            updatedAt: new Date(),
          })
          .where(sql`${artists.id} = ${artist.id}`);

        results.phases.database.updatedRecords++;

        // Rate limiting between artists to prevent API throttling
        const delayMs = mode === "hourly" ? 1000 : 2000;
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      } catch (error) {
        results.phases.popularArtists.errors++;
        results.errors.push(
          `Failed to sync ${artist.name}: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
      }
    }

    // Phase 3: Cleanup operations based on sync mode
    if (!dryRun) {
      try {
        await performCleanupOperations(mode);
        results.phases.cleanup.completed = true;
      } catch (error) {
        results.phases.cleanup.errors++;
        results.errors.push(
          `Cleanup failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
      }
    }

    // Phase 4: Update summary statistics
    results.summary.totalSynced = results.phases.popularArtists.synced;
    results.summary.totalErrors =
      results.phases.popularArtists.errors + results.phases.cleanup.errors;

    // Log successful completion
    if (!dryRun) {
      await db.insert(userActivityLog).values({
        userId: null,
        action: `master-sync-${mode}-complete`,
        targetType: "system",
        details: {
          mode,
          duration: `${(Date.now() - startTime) / 1000}s`,
          summary: results.summary,
          success: true,
        },
      });
    }

    const duration = Date.now() - startTime;
    results.duration = `${(duration / 1000).toFixed(2)}s`;

    return NextResponse.json({
      success: true,
      message: `Master sync (${mode}) completed successfully`,
      timestamp: new Date().toISOString(),
      ...results,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    results.errors.push(`Master sync failed: ${errorMessage}`);

    // Log error
    if (!dryRun) {
      try {
        await db.insert(userActivityLog).values({
          userId: null,
          action: `master-sync-${mode}-error`,
          targetType: "system",
          details: {
            mode,
            error: errorMessage,
            duration: `${(Date.now() - startTime) / 1000}s`,
            success: false,
          },
        });
      } catch (logError) {
        console.error("Failed to log sync error:", logError);
      }
    }

    const duration = Date.now() - startTime;
    results.duration = `${(duration / 1000).toFixed(2)}s`;

    return NextResponse.json(
      {
        error: "Master sync failed",
        details: errorMessage,
        ...results,
      },
      { status: 500 },
    );
  }
}

/**
 * Get artists that need syncing based on mode
 */
async function getArtistsToSync(mode: string) {
  const now = new Date();

  switch (mode) {
    case "hourly":
      // Only sync artists with recent activity or never synced
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      return await db
        .select()
        .from(artists)
        .where(
          or(
            isNull(artists.lastSyncedAt),
            lte(artists.lastSyncedAt, oneHourAgo),
            sql`${artists.trendingScore} > 0.7`, // High trending artists
          ),
        )
        .orderBy(desc(artists.trendingScore), desc(artists.popularity))
        .limit(10);

    case "full":
      // Full resync - all artists
      return await db
        .select()
        .from(artists)
        .orderBy(desc(artists.popularity), desc(artists.followerCount))
        .limit(50); // Prevent timeout

    case "daily":
    default:
      // Daily sync - artists not synced in 24 hours or high priority
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      return await db
        .select()
        .from(artists)
        .where(
          or(
            isNull(artists.lastSyncedAt),
            lte(artists.lastSyncedAt, oneDayAgo),
            lte(artists.lastFullSyncAt, oneWeekAgo),
            sql`${artists.trendingScore} > 0.5`,
          ),
        )
        .orderBy(
          desc(artists.popularity),
          desc(artists.trendingScore),
          desc(artists.followerCount),
        )
        .limit(25);
  }
}

/**
 * Comprehensive artist sync using existing unified pipeline
 */
async function syncArtistComprehensive(artist: any, mode: string) {
  try {
    const syncUrl =
      process.env["NEXT_PUBLIC_APP_URL"] || "http://localhost:3001";
    const response = await fetch(`${syncUrl}/api/sync/unified-pipeline`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": `MasterSync/${mode}`,
      },
      body: JSON.stringify({
        artistId: artist.id,
        mode: "single",
        comprehensive: true,
      }),
    });

    if (response.ok) {
      const result = await response.json();
      return {
        success: true,
        artistUpdated: result.results?.artist?.updated || false,
        catalogUpdated: result.results?.songs?.synced > 0,
        showsSync: {
          synced: result.results?.shows?.synced || 0,
          errors: result.results?.shows?.errors || 0,
        },
        setlistsSync: {
          synced: result.results?.setlists?.synced || 0,
          errors: result.results?.setlists?.errors || 0,
        },
      };
    } else {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: `HTTP ${response.status}: ${errorData.error || "Sync failed"}`,
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Network error",
    };
  }
}

/**
 * Perform cleanup operations after sync
 */
async function performCleanupOperations(mode: string) {
  const today = new Date().toISOString().split("T")[0];

  // Update show statuses
  await db.execute(sql`
    UPDATE shows 
    SET status = 'completed', updated_at = NOW() 
    WHERE date < ${today} AND status = 'upcoming'
  `);

  // Update trending scores if not hourly mode
  if (mode !== "hourly") {
    await db.execute(sql`
      UPDATE artists 
      SET trending_score = CASE 
        WHEN last_synced_at > NOW() - INTERVAL '7 days' THEN trending_score * 0.95
        ELSE trending_score * 0.9
      END
      WHERE trending_score > 0
    `);
  }

  // Clean up old sync progress entries
  if (mode === "daily" || mode === "full") {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // This would require checking if sync_progress table exists
    // await db.execute(sql`DELETE FROM sync_progress WHERE created_at < ${sevenDaysAgo}`);
  }
}

// Support POST for manual triggering
export async function POST(request: NextRequest) {
  return GET(request);
}
