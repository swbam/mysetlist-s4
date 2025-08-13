import { db } from "@repo/database";
import { SyncScheduler } from "@repo/external-apis";
import { sql } from "drizzle-orm";
import { headers } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";

// Force dynamic rendering for API route
export const dynamic = "force-dynamic";

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

    if (
      validTokens.length > 0 &&
      !(authHeader && validTokens.some((t) => authHeader === `Bearer ${t}`))
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { mode = "daily", type = "all", limit = 10 } = body;

    const scheduler = new SyncScheduler();

    let result;
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
        return NextResponse.json(
          { error: "Invalid sync mode. Use: initial, daily, hourly" },
          { status: 400 },
        );
    }

    // Best-effort log entry
    try {
      await db.execute(sql`SELECT log_cron_run('master-sync', 'success')`);
    } catch {}

    return NextResponse.json({
      success: true,
      mode,
      result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Master sync failed:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Master sync failed",
        message: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Check for authorization
    const headersList = await headers();
    const authHeader = headersList.get("authorization");
    const validTokens = [
      process.env.CRON_SECRET,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      process.env.ADMIN_API_KEY,
    ].filter(Boolean) as string[];

    if (
      validTokens.length > 0 &&
      !(authHeader && validTokens.some((t) => authHeader === `Bearer ${t}`))
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const mode = searchParams.get("mode") || "daily";

    const scheduler = new SyncScheduler();

    let result;
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
        return NextResponse.json(
          { error: "Invalid sync mode. Use: initial, daily, hourly" },
          { status: 400 },
        );
    }

    // Best-effort log entry
    try {
      await db.execute(sql`SELECT log_cron_run('master-sync', 'success')`);
    } catch {}

    return NextResponse.json({
      success: true,
      mode,
      result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Master sync failed:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Master sync failed",
        message: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}
