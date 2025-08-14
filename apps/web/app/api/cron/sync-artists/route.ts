import { artists, db } from "@repo/database";
import { ArtistSyncService } from "@repo/external-apis";
import { desc, sql } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import {
  createErrorResponse,
  createSuccessResponse,
  requireCronAuth,
} from "~/lib/api/auth-helpers";

// Force dynamic rendering for API route
export const dynamic = "force-dynamic";

/**
 * High-frequency cron job for artist data synchronization:
 * - Syncs existing artists that haven't been updated recently  
 * - Updates popularity metrics from Spotify
 * - Checks for new releases
 * - Lightweight sync suitable for frequent execution
 */
export async function POST(request: NextRequest) {
  try {
    // Standardized authentication
    await requireCronAuth();

    const body = await request.json().catch(() => ({}));
    const { limit = 25, mode = "auto", skipRecentlyUpdated = true } = body;

    const syncService = new ArtistSyncService();
    const startTime = Date.now();

    const results = {
      totalFound: 0,
      processed: 0,
      updated: 0,
      skipped: 0,
      errors: [] as string[],
      processingTime: 0,
    };

    let artistsToSync: any[] = [];

    if (mode === "popular") {
      // Sync popular artists from various genres
      const syncResult = await syncService.syncPopularArtists();
      results.processed = syncResult?.totalArtists || 0;
      results.updated = syncResult?.totalArtists || 0;
    } else {
      // Sync existing artists that haven't been updated recently
      const cutoffHours = skipRecentlyUpdated ? 6 : 0;
      artistsToSync = await db
        .select({
          id: artists.id,
          spotifyId: artists.spotifyId,
          name: artists.name,
          lastSyncedAt: artists.lastSyncedAt,
          popularity: artists.popularity,
        })
        .from(artists)
        .where(
          sql`
            ${artists.spotifyId} IS NOT NULL
            AND (
              ${artists.lastSyncedAt} IS NULL
              OR ${artists.lastSyncedAt} < NOW() - INTERVAL '${cutoffHours} hours'
            )
          `,
        )
        .orderBy(desc(artists.popularity))
        .limit(limit);

      results.totalFound = artistsToSync.length;

      // Process artists in parallel batches to respect API rate limits
      const batchSize = 5;
      const batches: (typeof artistsToSync)[] = [];
      for (let i = 0; i < artistsToSync.length; i += batchSize) {
        batches.push(artistsToSync.slice(i, i + batchSize));
      }

      for (const batch of batches) {
        const batchPromises = batch.map(async (artist) => {
          try {
            if (!artist.spotifyId) {
              results.skipped++;
              return { success: false, reason: "No Spotify ID" };
            }

            // Sync artist data (Spotify profile, albums, popularity)
            await syncService.syncArtist(artist.spotifyId);
            results.processed++;
            results.updated++;

            return { success: true, artistName: artist.name };
          } catch (error) {
            const errorMsg = `Failed to sync ${artist.name}: ${error instanceof Error ? error.message : String(error)}`;
            results.errors.push(errorMsg);
            results.processed++;
            return { success: false, reason: errorMsg };
          }
        });

        // Wait for batch to complete
        await Promise.allSettled(batchPromises);

        // Rate limiting - wait between batches
        if (batches.indexOf(batch) < batches.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 1000)); // 1 second between batches
        }
      }
    }

    results.processingTime = Date.now() - startTime;

    // Log successful completion
    try {
      await db.execute(sql`
        SELECT log_cron_run(
          'sync-artists', 
          'success',
          ${JSON.stringify(results)}
        )
      `);
    } catch {}

    return createSuccessResponse({
      message: "Artist sync completed successfully",
      results,
    });
  } catch (error) {
    console.error("Artist sync failed:", error);

    // Log error
    try {
      await db.execute(sql`
        SELECT log_cron_run(
          'sync-artists', 
          'failed',
          ${JSON.stringify({ error: error instanceof Error ? error.message : String(error) })}
        )
      `);
    } catch {}

    return createErrorResponse(
      "Artist sync failed",
      500,
      error instanceof Error ? error.message : "Unknown error",
    );
  }
}

export async function GET(request: NextRequest) {
  // Support GET requests for manual triggers
  return POST(request);
}