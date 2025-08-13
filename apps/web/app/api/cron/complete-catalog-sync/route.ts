import { artists, db, shows, songs } from "@repo/database";
import { ArtistSyncService, ShowSyncService } from "@repo/external-apis";
import { sql } from "drizzle-orm";
import { headers } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";

// Force dynamic rendering for API route
export const dynamic = "force-dynamic";

/**
 * Weekly full catalog sync cron job:
 * - Full show history refresh for all artists
 * - Complete discography verification
 * - Clean up duplicate/outdated records
 * - Data integrity checks
 */
export async function POST(request: NextRequest) {
  try {
    // Check for authorization
    const headersList = await headers();
    const authHeader = headersList.get("authorization");
    const validTokens = [
      process.env.CRON_SECRET,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      process.env.ADMIN_API_KEY,
    ].filter(Boolean) as string[];

    if (validTokens.length > 0 && !(authHeader && validTokens.some((t) => authHeader === `Bearer ${t}`))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { 
      skipRecentlyUpdated = true, 
      maxArtists = 500,
      includeDataCleanup = true,
      performIntegrityChecks = true 
    } = body;

    const artistSyncService = new ArtistSyncService();
    const showSyncService = new ShowSyncService();
    const startTime = Date.now();

    const results = {
      phase: "initialization",
      artistsProcessed: 0,
      showsRefreshed: 0,
      songsVerified: 0,
      duplicatesRemoved: 0,
      integrityIssuesFixed: 0,
      errors: [] as string[],
      processingTime: 0,
      phases: {
        artistSync: { completed: false, duration: 0, errors: 0 },
        showSync: { completed: false, duration: 0, errors: 0 },
        dataCleanup: { completed: false, duration: 0, errors: 0 },
        integrityCheck: { completed: false, duration: 0, errors: 0 },
      },
    };

    // PHASE 1: Artist Catalog Sync
    results.phase = "artist-catalog-sync";
    const phase1Start = Date.now();

    try {
      // Get all artists that need full catalog sync
      const artistsToSync = await db
        .select({
          id: artists.id,
          spotifyId: artists.spotifyId,
          name: artists.name,
          songCatalogSyncedAt: artists.songCatalogSyncedAt,
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
          `
        )
        .limit(maxArtists);

      // Process artists in small batches with conservative rate limiting
      const batchSize = 2;
      const batches: typeof artistsToSync[] = [];
      for (let i = 0; i < artistsToSync.length; i += batchSize) {
        batches.push(artistsToSync.slice(i, i + batchSize));
      }

      for (const batch of batches) {
        const batchPromises = batch.map(async (artist) => {
          try {
            if (!artist.spotifyId) return;

            // Full artist sync including complete discography
            await artistSyncService.syncFullDiscography(artist.spotifyId);

            // Update sync timestamp
            await db
              .update(artists)
              .set({ 
                songCatalogSyncedAt: new Date(),
                lastSyncedAt: new Date(),
              })
              .where(sql`${artists.id} = ${artist.id}`);

            results.artistsProcessed++;
          } catch (error) {
            const errorMsg = `Full sync failed for ${artist.name}: ${error instanceof Error ? error.message : String(error)}`;
            results.errors.push(errorMsg);
            results.phases.artistSync.errors++;
          }
        });

        await Promise.allSettled(batchPromises);

        // Conservative rate limiting for weekly job
        if (batches.indexOf(batch) < batches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 5000)); // 5 seconds between batches
        }
      }

      results.phases.artistSync.completed = true;
      results.phases.artistSync.duration = Date.now() - phase1Start;
    } catch (error) {
      results.errors.push(`Artist sync phase failed: ${error instanceof Error ? error.message : String(error)}`);
      results.phases.artistSync.errors++;
    }

    // PHASE 2: Show History Refresh
    results.phase = "show-history-refresh";
    const phase2Start = Date.now();

    try {
      // Get all artists for show sync
      const artistsForShows = await db
        .select({ id: artists.id, name: artists.name })
        .from(artists)
        .where(sql`${artists.spotifyId} IS NOT NULL`)
        .limit(100); // Limit for weekly job

      for (const artist of artistsForShows) {
        try {
          // Sync historical shows and upcoming shows
          await showSyncService.syncHistoricalSetlists(artist.name);
          results.showsRefreshed++;
        } catch (error) {
          results.errors.push(`Show sync failed for ${artist.name}: ${error instanceof Error ? error.message : String(error)}`);
          results.phases.showSync.errors++;
        }

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      results.phases.showSync.completed = true;
      results.phases.showSync.duration = Date.now() - phase2Start;
    } catch (error) {
      results.errors.push(`Show sync phase failed: ${error instanceof Error ? error.message : String(error)}`);
      results.phases.showSync.errors++;
    }

    // PHASE 3: Data Cleanup
    if (includeDataCleanup) {
      results.phase = "data-cleanup";
      const phase3Start = Date.now();

      try {
        // Remove duplicate songs
        await db.execute(sql`
          DELETE FROM songs s1
          USING songs s2
          WHERE s1.id < s2.id
          AND s1.artist_id = s2.artist_id
          AND s1.title = s2.title
          AND s1.spotify_id = s2.spotify_id
        `);
        // Note: Row count tracking not available in this Drizzle version

        // Remove orphaned records
        await db.execute(sql`
          DELETE FROM songs
          WHERE artist_id NOT IN (SELECT id FROM artists)
        `);

        await db.execute(sql`
          DELETE FROM shows
          WHERE artist_id NOT IN (SELECT id FROM artists)
        `);

        // Update song counts
        await db.execute(sql`
          UPDATE artists
          SET song_count = (
            SELECT COUNT(*)
            FROM songs
            WHERE songs.artist_id = artists.id
          )
        `);

        results.phases.dataCleanup.completed = true;
        results.phases.dataCleanup.duration = Date.now() - phase3Start;
      } catch (error) {
        results.errors.push(`Data cleanup phase failed: ${error instanceof Error ? error.message : String(error)}`);
        results.phases.dataCleanup.errors++;
      }
    }

    // PHASE 4: Data Integrity Checks
    if (performIntegrityChecks) {
      results.phase = "integrity-checks";
      const phase4Start = Date.now();

      try {
        // Check for artists without Spotify IDs
        const artistsWithoutSpotify = await db
          .select({ count: sql`COUNT(*)` })
          .from(artists)
          .where(sql`${artists.spotifyId} IS NULL`);

        // Check for shows without venues
        const showsWithoutVenues = await db
          .select({ count: sql`COUNT(*)` })
          .from(shows)
          .where(sql`${shows.venueId} IS NULL`);

        // Check for songs without Spotify IDs
        const songsWithoutSpotify = await db
          .select({ count: sql`COUNT(*)` })
          .from(songs)
          .where(sql`${songs.spotifyId} IS NULL`);

        // Log integrity issues
        const integrityReport = {
          artistsWithoutSpotify: artistsWithoutSpotify[0]?.count || 0,
          showsWithoutVenues: showsWithoutVenues[0]?.count || 0,
          songsWithoutSpotify: songsWithoutSpotify[0]?.count || 0,
        };

        console.log("Weekly integrity report:", integrityReport);

        results.phases.integrityCheck.completed = true;
        results.phases.integrityCheck.duration = Date.now() - phase4Start;
      } catch (error) {
        results.errors.push(`Integrity check phase failed: ${error instanceof Error ? error.message : String(error)}`);
        results.phases.integrityCheck.errors++;
      }
    }

    results.phase = "completed";
    results.processingTime = Date.now() - startTime;

    // Update trending data after complete sync
    try {
      await db.execute(sql`SELECT update_trending_scores()`);
      await db.execute(sql`SELECT refresh_trending_data()`);
    } catch (error) {
      console.warn("Failed to update trending scores:", error);
    }

    // Log successful completion
    try {
      await db.execute(sql`
        SELECT log_cron_run(
          'complete-catalog-sync', 
          'success',
          ${JSON.stringify(results)}
        )
      `);
    } catch {}

    return NextResponse.json({
      success: true,
      message: "Complete catalog sync finished",
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Complete catalog sync failed:", error);
    
    // Log error
    try {
      await db.execute(sql`
        SELECT log_cron_run(
          'complete-catalog-sync', 
          'failed',
          ${JSON.stringify({ error: error instanceof Error ? error.message : String(error) })}
        )
      `);
    } catch {}

    return NextResponse.json(
      {
        success: false,
        error: "Complete catalog sync failed",
        message: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  // Support GET requests for manual triggers
  return POST(request);
}
