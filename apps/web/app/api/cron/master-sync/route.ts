import { db } from "@repo/database";
import { SyncScheduler } from "@repo/external-apis";
import { sql } from "drizzle-orm";
import { type NextRequest } from "next/server";
import {
  createErrorResponse,
  createSuccessResponse,
  requireCronAuth,
} from "~/lib/api/auth-helpers";

// Force dynamic rendering for API route
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    // Standardized authentication
    await requireCronAuth();

    const body = await request.json().catch(() => ({}));
    const { mode = "daily" } = body as { mode?: string };

    const scheduler = new SyncScheduler();

    let result: any;
    switch (mode) {
      case "initial":
        result = await scheduler.runInitialSync();
        break;
      case "daily":
        result = await scheduler.runDailySync();
        break;
      case "hourly":
        // For hourly sync, do a lighter sync
        result = await scheduler.syncCustom({
          artists: true,
          shows: true,
        });
        break;
      default:
        return createErrorResponse(
          "Invalid sync mode. Use: initial, daily, hourly",
          400
        );
    }

    // Best-effort log entry
    try {
      await db.execute(sql`SELECT log_cron_run('master-sync', 'success')`);
    } catch {}

    return createSuccessResponse({
      mode,
      result,
    });
  } catch (error) {
    console.error("Master sync failed:", error);
    return createErrorResponse(
      "Master sync failed",
      500,
      error instanceof Error ? error.message : "Unknown error"
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Standardized authentication
    await requireCronAuth();

    const { searchParams } = new URL(request.url);
    const mode = searchParams.get("mode") || "daily";

    const scheduler = new SyncScheduler();

    let result: any;
    switch (mode) {
      case "initial":
        result = await scheduler.runInitialSync();
        break;
      case "daily":
        result = await scheduler.runDailySync();
        break;
      case "hourly":
        result = await scheduler.syncCustom({
          artists: true,
          shows: true,
        });
        break;
      default:
        return createErrorResponse(
          "Invalid sync mode. Use: initial, daily, hourly",
          400
        );
    }

    // Best-effort log entry
    try {
      await db.execute(sql`SELECT log_cron_run('master-sync', 'success')`);
    } catch {}

    return createSuccessResponse({
      mode,
      result,
    });
  } catch (error) {
    console.error("Master sync failed:", error);
    return createErrorResponse(
      "Master sync failed",
      500,
      error instanceof Error ? error.message : "Unknown error"
    );
  }
}
