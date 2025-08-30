import { artists, db } from "@repo/database";
import { ArtistSyncService } from "@repo/external-apis";
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
 * Daily deep update cron job (2 AM daily) for trending artists:
 * - Complete discography refresh for top 100 trending artists
 * - New album detection
 * - Song popularity updates
 * - Historical setlist data sync
 */
export async function POST(request: NextRequest) {
  try {
    // Standardized authentication
    await requireCronAuth();

    const body = await request.json().catch(() => ({}));
    const { limit = 100, skipRecentlyUpdated = true } = body;

    const syncService = new ArtistSyncService();
    const startTime = Date.now();

    // Get top trending artists based on recent activity and popularity
    const trendingArtists = await db
      .select({
        id: artists.id,
        spotifyId: artists.spotifyId,
        name: artists.name,
        lastSyncedAt: artists.lastSyncedAt,
        songCatalogSyncedAt: artists.songCatalogSyncedAt,
        popularity: artists.popularity,
      })
      .from(artists)
      .where(
        sql`
          ${artists.spotifyId} IS NOT NULL
          AND (
            ${skipRecentlyUpdated} = false
            OR ${artists.songCatalogSyncedAt} IS NULL
            OR ${artists.songCatalogSyncedAt} < NOW() - INTERVAL '7 days'
          )
        `,
      )
      .orderBy(
        // Order by trending score (combination of recent activity and popularity)
        sql`(
          COALESCE(${artists.popularity}, 0) * 0.7 +
          (
            SELECT COUNT(*) * 10
            FROM shows s
            WHERE s.artistId = ${artists.id}
            AND s.date >= NOW() - INTERVAL '30 days'
          ) +
          (
            SELECT COUNT(*) * 5
            FROM votes v
            JOIN setlists sl ON v.setlist_id = sl.id
            JOIN shows s ON sl.showId = s.id
            WHERE s.artistId = ${artists.id}
            AND v._creationTime >= NOW() - INTERVAL '7 days'
          )
        ) DESC`,
      )
      .limit(limit);

    const results = {
      totalFound: trendingArtists.length,
      processed: 0,
      fullySynced: 0,
      partialSync: 0,
      errors: [] as string[],
      processingTime: 0,
      newAlbumsFound: 0,
      songsUpdated: 0,
    };

    // Process artists in smaller batches with longer delays for deep sync
    const batchSize = 3; // Smaller batches for intensive operations
    const batches: (typeof trendingArtists)[] = [];
    for (let i = 0; i < trendingArtists.length; i += batchSize) {
      batches.push(trendingArtists.slice(i, i + batchSize));
    }

    for (const batch of batches) {
      const batchPromises = batch.map(async (artist) => {
        try {
          if (!artist.spotifyId)
            return { success: false, reason: "No Spotify ID" };

          // Perform deep sync including:
          // 1. Artist profile update
          // 2. Complete discography refresh
          // 3. Song popularity updates
          await syncService.syncArtist(artist.spotifyId);
          const syncResult = await syncService.syncCatalog(artist.spotifyId);

          results.processed++;

          if (syncResult) {
            results.fullySynced++;
            results.newAlbumsFound += syncResult.totalAlbums || 0;
            results.songsUpdated += syncResult.totalSongs || 0;
          } else {
            results.partialSync++;
          }

          // Update the song catalog synced timestamp
          await db
            .update(artists)
            .set({
              songCatalogSyncedAt: new Date(),
              lastSyncedAt: new Date(),
            })
            .where(sql`${artists.id} = ${artist.id}`);

          return {
            success: true,
            artistName: artist.name,
            syncResult,
          };
        } catch (error) {
          const errorMsg = `Deep sync failed for ${artist.name}: ${error instanceof Error ? error.message : String(error)}`;
          results.errors.push(errorMsg);
          results.processed++;
          return { success: false, reason: errorMsg };
        }
      });

      // Wait for batch to complete
      await Promise.allSettled(batchPromises);

      // Longer delay between batches for API rate limiting
      if (batches.indexOf(batch) < batches.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 3000)); // 3 seconds between batches
      }
    }

    results.processingTime = Date.now() - startTime;

    // Update trending scores after sync
    try {
      await db.execute(sql`SELECT update_trendingScores()`);
      await db.execute(sql`SELECT refresh_trending_data()`);
    } catch (error) {
      console.warn("Failed to update trending scores:", error);
    }

    // Log successful completion
    try {
      await db.execute(sql`
        SELECT log_cron_run(
          'trending-artist-sync', 
          'success',
          ${JSON.stringify(results)}
        )
      `);
    } catch {}

    return createSuccessResponse({
      message: "Trending artists deep sync completed",
      results,
    });
  } catch (error) {
    console.error("Trending artist sync failed:", error);

    // Log error
    try {
      await db.execute(sql`
        SELECT log_cron_run(
          'trending-artist-sync', 
          'failed',
          ${JSON.stringify({ error: error instanceof Error ? error.message : String(error) })}
        )
      `);
    } catch {}

    return createErrorResponse(
      "Trending artist sync failed",
      500,
      error instanceof Error ? error.message : "Unknown error",
    );
  }
}

export async function GET(request: NextRequest) {
  // Support GET requests for manual triggers
  return POST(request);
}