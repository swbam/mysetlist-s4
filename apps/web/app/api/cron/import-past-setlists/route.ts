import { db, shows, setlists } from "@repo/database";
import { SetlistSyncService } from "@repo/external-apis";
import { and, lt, sql, isNull, isNotNull, or } from "drizzle-orm";
import type { NextRequest } from "next/server";
import {
  createErrorResponse,
  createSuccessResponse,
  requireCronAuth,
} from "~/lib/api/auth-helpers";

// Force dynamic rendering for API route
export const dynamic = "force-dynamic";

async function executePastSetlistImport() {
  const syncService = new SetlistSyncService();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayDateString = today.toISOString().split('T')[0]!;

  // Find shows that occurred (date < today) without actual setlists
  const pastShowsWithoutSetlists = await db
    .select({
      id: shows.id,
      name: shows.name,
      date: shows.date,
      headlinerArtistId: shows.headlinerArtistId,
      venueId: shows.venueId,
      setlistFmId: shows.setlistFmId,
    })
    .from(shows)
    .leftJoin(setlists, and(
      sql`${setlists.showId} = ${shows.id}`,
      sql`${setlists.type} = 'actual'`
    ))
    .where(
      and(
        and(
          isNotNull(shows.date),
          lt(shows.date, todayDateString)
        ), // Past shows only
        isNull(setlists.id), // No actual setlist exists
        or(
          isNull(shows.setlistFmId), // No setlist.fm ID yet
          sql`${shows.setlistFmId} IS NOT NULL` // Or has ID but no imported setlist
        )
      )
    )
    .limit(20); // Process max 20 shows per run to avoid timeouts

  const results = {
    totalFound: pastShowsWithoutSetlists.length,
    processed: 0,
    imported: 0,
    skipped: 0,
    errors: [] as string[],
  };

  // Process each show to import setlist data
  for (const show of pastShowsWithoutSetlists) {
    try {
      results.processed++;

      // Try to sync setlist by show ID
      await syncService.syncSetlistByShowId(show.id);

      // Check if a setlist was actually imported
      const importedSetlist = await db
        .select({ id: setlists.id })
        .from(setlists)
        .where(and(
          sql`${setlists.showId} = ${show.id}`,
          sql`${setlists.type} = 'actual'`,
          sql`${setlists.importedFrom} = 'setlist.fm'`
        ))
        .limit(1);

      if (importedSetlist.length > 0) {
        results.imported++;
        console.log(`✅ Imported setlist for show: ${show.name} (${show.date})`);
      } else {
        results.skipped++;
        console.log(`⏭️ No setlist found for show: ${show.name} (${show.date})`);
      }

      // Rate limiting - pause between requests
      await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay

    } catch (error) {
      const errorMsg = `Failed to import setlist for show ${show.name}: ${
        error instanceof Error ? error.message : String(error)
      }`;
      results.errors.push(errorMsg);
      console.error(`❌ ${errorMsg}`);
    }
  }

  // Log successful completion
  try {
    await db.execute(sql`
      SELECT log_cron_run(
        'import-past-setlists', 
        'success',
        ${JSON.stringify(results)}
      )
    `);
  } catch {}

  return {
    message: "Past setlist import completed",
    results,
  };
}

export async function POST(request: NextRequest) {
  try {
    // Standardized authentication
    await requireCronAuth();

    const result = await executePastSetlistImport();
    return createSuccessResponse(result);
  } catch (error) {
    console.error("Past setlist import failed:", error);

    // Log error
    try {
      await db.execute(sql`
        SELECT log_cron_run(
          'import-past-setlists', 
          'failed',
          ${JSON.stringify({ error: error instanceof Error ? error.message : String(error) })}
        )
      `);
    } catch {}

    return createErrorResponse(
      "Past setlist import failed",
      500,
      error instanceof Error ? error.message : "Unknown error"
    );
  }
}

export async function GET(_request: NextRequest) {
  // Support GET requests for manual triggers - delegate to POST
  return POST(request);
}