import { db } from "@repo/database";
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
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Call the database function to update trending scores
    await db.execute(sql`SELECT update_trending_scores()`);

    // Refresh materialized views
    await db.execute(sql`SELECT refresh_trending_data()`);

    // Best-effort log entry
    try {
      await db.execute(sql`SELECT log_cron_run('calculate-trending', 'success')`);
    } catch {}

    return NextResponse.json({
      success: true,
      message: "Trending scores updated successfully",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Trending calculation failed:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Trending calculation failed",
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
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Call the database function to update trending scores
    await db.execute(sql`SELECT update_trending_scores()`);

    // Refresh materialized views
    await db.execute(sql`SELECT refresh_trending_data()`);

    // Best-effort log entry
    try {
      await db.execute(sql`SELECT log_cron_run('calculate-trending', 'success')`);
    } catch {}

    return NextResponse.json({
      success: true,
      message: "Trending scores updated successfully",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Trending calculation failed:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Trending calculation failed",
        message: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}
