import { artists, db, shows } from "@repo/database";
import { ShowSyncService } from "@repo/external-apis";
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
 * Regular cron job for show data synchronization:
 * - Syncs upcoming shows from Ticketmaster
 * - Updates existing show information
 * - Adds new shows for tracked artists
 * - Suitable for daily/hourly execution
 */
export async function POST(request: NextRequest) {
  try {
    // Standardized authentication
    await requireCronAuth();

    const body = await request.json().catch(() => ({}));
    const { 
      limit = 50, 
      daysAhead = 90,
      syncMode = "upcoming", // "upcoming", "active_artists", "all"
      includePastShows = false
    } = body;

    const showSyncService = new ShowSyncService();
    const startTime = Date.now();

    const results = {
      totalArtistsProcessed: 0,
      newShowsAdded: 0,
      existingShowsUpdated: 0,
      errors: [] as string[],
      processingTime: 0,
      syncMode,
    };

    let artistsToProcess: any[] = [];

    // Determine which artists to sync shows for
    switch (syncMode) {
      case "active_artists":
        // Sync shows for artists with recent activity
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        artistsToProcess = await db
          .select({
            id: artists.id,
            name: artists.name,
            ticketmasterId: artists.ticketmasterId,
            lastSyncedAt: artists.lastSyncedAt,
          })
          .from(artists)
          .leftJoin(shows, sql`${shows.headlinerArtistId} = ${artists.id}`)
          .where(
            sql`
              (
                ${shows.date} >= ${thirtyDaysAgo.toISOString()}
                OR ${artists.updatedAt} >= ${thirtyDaysAgo.toISOString()}
                OR ${artists.lastSyncedAt} IS NULL
                OR ${artists.lastSyncedAt} < NOW() - INTERVAL '12 hours'
              )
              AND ${artists.ticketmasterId} IS NOT NULL
            `,
          )
          .orderBy(desc(artists.popularity))
          .limit(limit);
        break;

      case "all":
        // Sync shows for all artists with Ticketmaster IDs
        artistsToProcess = await db
          .select({
            id: artists.id,
            name: artists.name,
            ticketmasterId: artists.ticketmasterId,
            lastSyncedAt: artists.lastSyncedAt,
          })
          .from(artists)
          .where(sql`${artists.ticketmasterId} IS NOT NULL`)
          .orderBy(desc(artists.popularity))
          .limit(limit);
        break;

      case "upcoming":
      default:
        // Use general upcoming shows sync
        try {
          const upcomingResult = await showSyncService.syncUpcomingShows({
            classificationName: "Music",
            startDateTime: new Date().toISOString(),
            endDateTime: new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000).toISOString(),
          });
          
          results.newShowsAdded = upcomingResult?.newShows || 0;
          results.existingShowsUpdated = upcomingResult?.updatedShows || 0;
        } catch (error) {
          results.errors.push(
            `Upcoming shows sync failed: ${error instanceof Error ? error.message : String(error)}`
          );
        }
        break;
    }

    // Process individual artists if not using general upcoming sync
    if (syncMode !== "upcoming" && artistsToProcess.length > 0) {
      results.totalArtistsProcessed = artistsToProcess.length;

      // Process artists in batches to respect API rate limits
      const batchSize = 3; // Conservative batch size for show sync
      const batches: (typeof artistsToProcess)[] = [];
      for (let i = 0; i < artistsToProcess.length; i += batchSize) {
        batches.push(artistsToProcess.slice(i, i + batchSize));
      }

      for (const batch of batches) {
        const batchPromises = batch.map(async (artist) => {
          try {
            if (!artist.ticketmasterId) {
              return { success: false, reason: "No Ticketmaster ID" };
            }

            // Sync shows for this specific artist
            const artistShowResult = await showSyncService.syncArtistShows(artist.id);
            
            if (artistShowResult) {
              results.newShowsAdded += artistShowResult.newShows || 0;
              results.existingShowsUpdated += artistShowResult.updatedShows || 0;
            }

            return { success: true, artistName: artist.name };
          } catch (error) {
            const errorMsg = `Show sync failed for ${artist.name}: ${error instanceof Error ? error.message : String(error)}`;
            results.errors.push(errorMsg);
            return { success: false, reason: errorMsg };
          }
        });

        // Wait for batch to complete
        await Promise.allSettled(batchPromises);

        // Rate limiting - wait between batches
        if (batches.indexOf(batch) < batches.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 2000)); // 2 seconds between batches
        }
      }
    }

    results.processingTime = Date.now() - startTime;

    // Log successful completion
    try {
      await db.execute(sql`
        SELECT log_cron_run(
          'sync-shows', 
          'success',
          ${JSON.stringify(results)}
        )
      `);
    } catch {}

    return createSuccessResponse({
      message: "Show sync completed successfully",
      results,
    });
  } catch (error) {
    console.error("Show sync failed:", error);

    // Log error
    try {
      await db.execute(sql`
        SELECT log_cron_run(
          'sync-shows', 
          'failed',
          ${JSON.stringify({ error: error instanceof Error ? error.message : String(error) })}
        )
      `);
    } catch {}

    return createErrorResponse(
      "Show sync failed",
      500,
      error instanceof Error ? error.message : "Unknown error",
    );
  }
}

export async function GET(request: NextRequest) {
  // Support GET requests for manual triggers
  return POST(request);
}