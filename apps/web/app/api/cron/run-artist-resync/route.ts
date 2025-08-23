import { artists, db } from "@repo/database";
import { desc, sql, and, lt, or, isNull } from "drizzle-orm";
import { type NextRequest } from "next/server";
import {
  createErrorResponse,
  createSuccessResponse,
  requireCronAuth,
} from "~/lib/api/auth-helpers";
import { runFullImport } from "~/lib/services/orchestrators/ArtistImportOrchestrator";

// Force dynamic rendering for API route
export const dynamic = "force-dynamic";

/**
 * GROK.md Section 14: Artist Resync Cron Route
 * Server route that calls runFullImport per artist and awaits completion
 * NOT fire-and-forget - must await completion for each artist
 * Processes artists that need resyncing based on sync timestamps
 */
export async function POST(request: NextRequest) {
  try {
    // Standardized authentication
    await requireCronAuth();

    const body = await request.json().catch(() => ({}));
    const { 
      limit = 10, 
      mode = "auto", 
      forceResync = false,
      maxAge = 24 // hours
    } = body;

    const startTime = Date.now();

    const results = {
      totalFound: 0,
      processed: 0,
      completed: 0,
      failed: 0,
      errors: [] as string[],
      processingTime: 0,
      artistDetails: [] as Array<{ id: string; name: string; status: string; duration?: number; error?: string }>
    };

    // Find artists that need resyncing
    let artistsToResync: any[] = [];

    if (mode === "all") {
      // Resync all artists (dangerous - use with care)
      artistsToResync = await db
        .select({
          id: artists.id,
          name: artists.name,
          slug: artists.slug,
          tmAttractionId: artists.tmAttractionId,
          spotifyId: artists.spotifyId,
          lastFullSyncAt: artists.lastFullSyncAt,
          songCatalogSyncedAt: artists.songCatalogSyncedAt,
          showsSyncedAt: artists.showsSyncedAt,
        })
        .from(artists)
        .where(and(
          sql`${artists.tmAttractionId} IS NOT NULL`,
          sql`${artists.importStatus} != 'failed'`
        ))
        .orderBy(desc(artists.popularity))
        .limit(limit);
    } else if (mode === "stale") {
      // Resync artists that haven't been fully synced recently
      const cutoffTime = new Date(Date.now() - maxAge * 60 * 60 * 1000);
      
      artistsToResync = await db
        .select({
          id: artists.id,
          name: artists.name,
          slug: artists.slug,
          tmAttractionId: artists.tmAttractionId,
          spotifyId: artists.spotifyId,
          lastFullSyncAt: artists.lastFullSyncAt,
          songCatalogSyncedAt: artists.songCatalogSyncedAt,
          showsSyncedAt: artists.showsSyncedAt,
        })
        .from(artists)
        .where(and(
          sql`${artists.tmAttractionId} IS NOT NULL`,
          or(
            isNull(artists.lastFullSyncAt),
            lt(artists.lastFullSyncAt, cutoffTime),
            // Also include artists with incomplete syncs
            and(
              sql`${artists.importStatus} = 'completed'`,
              or(
                isNull(artists.songCatalogSyncedAt),
                isNull(artists.showsSyncedAt)
              )
            )
          )
        ))
        .orderBy(desc(artists.popularity))
        .limit(limit);
    } else {
      // Default "auto" mode - resync failed and incomplete imports
      artistsToResync = await db
        .select({
          id: artists.id,
          name: artists.name,
          slug: artists.slug,
          tmAttractionId: artists.tmAttractionId,
          spotifyId: artists.spotifyId,
          lastFullSyncAt: artists.lastFullSyncAt,
          songCatalogSyncedAt: artists.songCatalogSyncedAt,
          showsSyncedAt: artists.showsSyncedAt,
        })
        .from(artists)
        .where(and(
          sql`${artists.tmAttractionId} IS NOT NULL`,
          or(
            sql`${artists.importStatus} = 'failed'`,
            sql`${artists.importStatus} = 'in_progress'`,
            and(
              sql`${artists.importStatus} = 'initializing'`,
              lt(artists.updatedAt, new Date(Date.now() - 30 * 60 * 1000)) // Stuck for > 30 min
            )
          )
        ))
        .orderBy(desc(artists.popularity))
        .limit(limit);
    }

    results.totalFound = artistsToResync.length;

    if (artistsToResync.length === 0) {
      return createSuccessResponse({
        message: "No artists found that need resyncing",
        results,
      });
    }

    // Process each artist sequentially and await completion
    // This ensures we don't overwhelm external APIs and properly handle failures
    for (const artist of artistsToResync) {
      const artistStartTime = Date.now();
      results.processed++;

      try {
        console.log(`[RESYNC] Starting full import for artist: ${artist.name} (${artist.id})`);
        
        // Call runFullImport and await completion - NOT fire-and-forget
        const importResult = await runFullImport(artist.id);
        
        const artistDuration = Date.now() - artistStartTime;
        
        if (importResult.success) {
          results.completed++;
          results.artistDetails.push({
            id: artist.id,
            name: artist.name,
            status: 'completed',
            duration: artistDuration
          });
          
          console.log(`[RESYNC] Completed import for ${artist.name} in ${artistDuration}ms`);
        } else {
          results.failed++;
          const errorMsg = `Failed to resync ${artist.name}: ${importResult.error || 'Unknown error'}`;
          results.errors.push(errorMsg);
          results.artistDetails.push({
            id: artist.id,
            name: artist.name,
            status: 'failed',
            duration: artistDuration,
            error: importResult.error
          });
          
          console.error(`[RESYNC] ${errorMsg}`);
        }

      } catch (error) {
        const artistDuration = Date.now() - artistStartTime;
        results.failed++;
        const errorMsg = `Exception during resync of ${artist.name}: ${error instanceof Error ? error.message : String(error)}`;
        results.errors.push(errorMsg);
        results.artistDetails.push({
          id: artist.id,
          name: artist.name,
          status: 'failed',
          duration: artistDuration,
          error: errorMsg
        });
        
        console.error(`[RESYNC] ${errorMsg}`, error);
      }

      // Rate limiting - wait between artists to be respectful to external APIs
      if (results.processed < artistsToResync.length) {
        await new Promise((resolve) => setTimeout(resolve, 2000)); // 2 seconds between artists
      }
    }

    results.processingTime = Date.now() - startTime;

    // Log successful completion
    try {
      await db.execute(sql`
        SELECT log_cron_run(
          'run-artist-resync', 
          'success',
          ${JSON.stringify(results)}
        )
      `);
    } catch (logError) {
      console.warn('Failed to log cron run:', logError);
    }

    return createSuccessResponse({
      message: `Artist resync completed: ${results.completed} successful, ${results.failed} failed`,
      results,
    });

  } catch (error) {
    console.error("Artist resync cron failed:", error);

    // Log error
    try {
      await db.execute(sql`
        SELECT log_cron_run(
          'run-artist-resync', 
          'failed',
          ${JSON.stringify({ error: error instanceof Error ? error.message : String(error) })}
        )
      `);
    } catch (logError) {
      console.warn('Failed to log cron error:', logError);
    }

    return createErrorResponse(
      "Artist resync cron failed",
      500,
      error instanceof Error ? error.message : "Unknown error",
    );
  }
}

export async function GET(request: NextRequest) {
  // Support GET requests for manual triggers
  return POST(request);
}