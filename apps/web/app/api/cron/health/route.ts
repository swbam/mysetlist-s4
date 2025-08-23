import { db } from "@repo/database";
import { sql } from "drizzle-orm";

import {
  createErrorResponse,
  createSuccessResponse,
  requireCronAuth,
} from "~/lib/api/auth-helpers";

// Force dynamic rendering for API route
export const dynamic = "force-dynamic";

/**
 * Health check endpoint for cron jobs:
 * - Tests database connectivity
 * - Verifies authentication
 * - Tests logging functionality
 */
export async function POST() {
  try {
    // Test authentication
    await requireCronAuth();

    const startTime = Date.now();
    const results = {
      databaseConnected: false,
      loggingWorking: false,
      responseTime: 0,
      timestamp: new Date().toISOString(),
    };

    // Test database connection
    try {
      await db.execute(sql`SELECT 1 as test`);
      results.databaseConnected = true;
    } catch (error) {
      console.error("Database connectivity test failed:", error);
    }

    // Test logging function
    try {
      await db.execute(sql`
        SELECT log_cron_run(
          'health-check', 
          'success',
          ${JSON.stringify({ test: true, timestamp: results.timestamp })}
        )
      `);
      results.loggingWorking = true;
    } catch (error) {
      console.error("Logging test failed:", error);
    }

    results.responseTime = Date.now() - startTime;

    const isHealthy = results.databaseConnected && results.loggingWorking;

    return createSuccessResponse({
      message: `Health check ${isHealthy ? "passed" : "failed"}`,
      healthy: isHealthy,
      results,
    });
  } catch (error) {
    console.error("Health check failed:", error);
    return createErrorResponse(
      "Health check failed",
      500,
      error instanceof Error ? error.message : "Unknown error",
    );
  }
}

export async function GET() {
  // Support GET requests for manual triggers
  return POST();
}