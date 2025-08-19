import { db, setlists, shows } from "@repo/database";
import { SetlistSyncService } from "@repo/external-apis";
import { and, lt, sql, isNull } from "drizzle-orm";
import type { NextRequest } from "next/server";
import {
  createErrorResponse,
  createSuccessResponse,
  requireCronAuth,
} from "~/lib/api/auth-helpers";

// Force dynamic rendering for API route
export const dynamic = "force-dynamic";

async function executePastSetlistSync() {
  const syncService = new SetlistSyncService();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayDateString = today.toISOString().split('T')[0]!;

  // Past shows in the last 7 days without an imported actual setlist
  const targetShows = await db
    .select({ id: shows.id, name: shows.name, date: shows.date })
    .from(shows)
    .leftJoin(setlists, and(
      sql`${setlists.showId} = ${shows.id}`,
      sql`${setlists.type} = 'actual'`
    ))
    .where(and(
      lt(shows.date, todayDateString),
      sql`${shows.date} >= CURRENT_DATE - INTERVAL '7 days'`,
      isNull(setlists.id)
    ))
    .limit(20);

  const results = { processed: 0, imported: 0, skipped: 0, errors: [] as string[] };

  for (const s of targetShows) {
    try {
      results.processed++;
      await syncService.syncSetlistByShowId(s.id);

      const imported = await db
        .select({ id: setlists.id })
        .from(setlists)
        .where(and(
          sql`${setlists.showId} = ${s.id}`,
          sql`${setlists.type} = 'actual'`
        ))
        .limit(1);

      if (imported.length > 0) {
        results.imported++;
      } else {
        results.skipped++;
      }

      await new Promise(r => setTimeout(r, 1000));
    } catch (e) {
      results.errors.push(e instanceof Error ? e.message : String(e));
    }
  }

  // Best-effort log
  try {
    await db.execute(sql`SELECT log_cron_run('sync-past-setlists', 'success', ${JSON.stringify(results)})`);
  } catch {}

  return { message: "Past setlist sync complete", results };
}

export async function POST(request: NextRequest) {
  try {
    await requireCronAuth();
    const result = await executePastSetlistSync();
    return createSuccessResponse(result);
  } catch (error) {
    try {
      await db.execute(sql`SELECT log_cron_run('sync-past-setlists', 'failed')`);
    } catch {}
    return createErrorResponse(
      "Past setlist sync failed",
      500,
      error instanceof Error ? error.message : "Unknown error",
    );
  }
}

export async function GET(request: NextRequest) {
  return POST(request);
}
