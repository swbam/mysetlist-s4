import { db } from "@repo/database";
import { sql } from "drizzle-orm";
import { type NextRequest } from "next/server";
import { requireCronAuth, createSuccessResponse, createErrorResponse } from "~/lib/api/auth-helpers";

// Force dynamic rendering for API route
export const dynamic = "force-dynamic";

async function executeTrendingUpdate() {
  // Call the database function to update trending scores
  await db.execute(sql`SELECT update_trending_scores()`);

  // Refresh materialized views
  await db.execute(sql`SELECT refresh_trending_data()`);

  // Best-effort log entry
  try {
    await db.execute(sql`SELECT log_cron_run('calculate-trending', 'success')`);
  } catch {}

  return { message: "Trending scores updated successfully" };
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
      error instanceof Error ? error.message : "Unknown error"
    );
  }
}

export async function GET(request: NextRequest) {
  // Support GET requests for manual triggers - delegate to POST
  return POST(request);
}
