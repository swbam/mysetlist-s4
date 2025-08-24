import { artists, db, shows } from "@repo/database";
import { ArtistSyncService } from "@repo/external-apis";
import { desc, sql } from "drizzle-orm";
import { headers } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";

// Force dynamic rendering for API route
export const dynamic = "force-dynamic";

/**
 * High-frequency cron job (every 6 hours) for active artists:
 * - Updates artists with activity in last 30 days
 * - Checks for new shows (Ticketmaster)
 * - Updates popularity metrics (Spotify)
 * - Checks for new releases (Spotify)
 */
export async function POST(request: NextRequest) {
  try {
    // Check for authorization
    const headersList = await headers();
    const authHeader = headersList.get("authorization");
    const validTokens = [
      process.env['CRON_SECRET'],
      process.env['SUPABASE_SERVICE_ROLE_KEY'],
      process.env['ADMIN_API_KEY'],
    ].filter(Boolean) as string[];

    if (
      validTokens.length > 0 &&
      !(authHeader && validTokens.some((t) => authHeader === `Bearer ${t}`))
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { limit = 50, forceSync = false } = body;

    const syncService = new ArtistSyncService();
    const startTime = Date.now();

    // Find active artists - those with recent activity (shows, votes, or updates)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const activeArtists = await db
      .select({
        id: artists.id,
        spotifyId: artists.spotifyId,
        name: artists.name,
        lastSyncedAt: artists.lastSyncedAt,
        popularity: artists.popularity,
      })
      .from(artists)
      .leftJoin(shows, sql`${shows.headlinerArtistId} = ${artists.id}`)
      .where(
        sql`
          (
            ${shows.date} >= ${thirtyDaysAgo.toISOString()}
            OR ${artists.updatedAt} >= ${thirtyDaysAgo.toISOString()}
            OR ${artists.lastSyncedAt} IS NULL
            OR ${artists.lastSyncedAt} < NOW() - INTERVAL '6 hours'
          )
          AND ${artists.spotifyId} IS NOT NULL
        `,
      )
      .orderBy(desc(artists.popularity))
      .limit(limit);

    const results = {
      totalFound: activeArtists.length,
      processed: 0,
      updated: 0,
      errors: [] as string[],
      processingTime: 0,
    };

    // Process artists in parallel batches to respect API rate limits
    const batchSize = 5;
    const batches: (typeof activeArtists)[] = [];
    for (let i = 0; i < activeArtists.length; i += batchSize) {
      batches.push(activeArtists.slice(i, i + batchSize));
    }

    for (const batch of batches) {
      // Process batch in parallel
      const batchPromises = batch.map(async (artist) => {
        try {
          if (!artist.spotifyId)
            return { success: false, reason: "No Spotify ID" };

          // Skip if recently synced (unless forced)
          if (!forceSync && artist.lastSyncedAt) {
            const sixHoursAgo = new Date();
            sixHoursAgo.setHours(sixHoursAgo.getHours() - 6);
            if (new Date(artist.lastSyncedAt) > sixHoursAgo) {
              return { success: false, reason: "Recently synced" };
            }
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

    results.processingTime = Date.now() - startTime;

    // Log successful completion
    try {
      await db.execute(sql`
        SELECT log_cron_run(
          'update-active-artists', 
          'success',
          ${JSON.stringify(results)}
        )
      `);
    } catch {}

    return NextResponse.json({
      success: true,
      message: "Active artists sync completed",
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Active artists sync failed:", error);

    // Log error
    try {
      await db.execute(sql`
        SELECT log_cron_run(
          'update-active-artists', 
          'failed',
          ${JSON.stringify({ error: error instanceof Error ? error.message : String(error) })}
        )
      `);
    } catch {}

    return NextResponse.json(
      {
        success: false,
        error: "Active artists sync failed",
        message: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  // Support GET requests for manual triggers
  return POST(request);
}
