import { db } from "@repo/database";
import { sql } from "drizzle-orm";
import type { NextRequest } from "next/server";
import {
  createErrorResponse,
  createSuccessResponse,
  requireCronAuth,
} from "~/lib/api/auth-helpers";

// Force dynamic rendering for API route
export const dynamic = "force-dynamic";

async function executeTrendingUpdate() {
  try {
    // Call the database function to update trending scores
    await db.execute(sql`SELECT update_trending_scores()`);

    // Try to refresh materialized views (if function exists)
    try {
      await db.execute(sql`SELECT refresh_trending_data()`);
    } catch (refreshError) {
      console.warn(
        "refresh_trending_data function not available, skipping materialized view refresh:",
        refreshError,
      );
    }

    // Best-effort log entry
    try {
      await db.execute(
        sql`SELECT log_cron_run('calculate-trending', 'success')`,
      );
    } catch (logError) {
      console.warn(
        "log_cron_run function not available, skipping log:",
        logError,
      );
    }

    return { message: "Trending scores updated successfully" };
  } catch (error) {
    console.error("Trending calculation error:", error);

    // Try to log the error
    try {
      await db.execute(sql`SELECT log_cron_run('calculate-trending', 'error')`);
    } catch {}

    throw error;
  }
}

export async function POST(request: NextRequest) {
  try {
    // Standardized authentication
    await requireCronAuth();

    const result = await executeTrendingUpdate();
    return createSuccessResponse(result);
  } catch (error) {
    console.error("Trending calculation failed:", error);
    return createErrorResponse(
      "Trending calculation failed",
      500,
      error instanceof Error ? error.message : "Unknown error",
    );
  }
}

export async function GET(request: NextRequest) {
  // Support GET requests for manual triggers - delegate to POST
  return POST(request);
}
