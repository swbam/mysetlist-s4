import { createCronJob } from "~/lib/cron/cron-wrapper";

// Force dynamic rendering for API route
export const dynamic = "force-dynamic";

/**
 * Health check endpoint for cron jobs:
 * - Tests database connectivity
 * - Verifies authentication
 * - Tests logging functionality
 * - Uses the new cron wrapper for standardized logging
 */
async function healthCheckHandler() {
  const startTime = Date.now();
  
  // Import database dynamically to avoid import path issues
  const { db, sql } = await import("@repo/database");
  
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
    return {
      success: false,
      error: "Database connection failed",
      data: results,
    };
  }

  // Test logging function (will be tested by the wrapper itself)
  try {
    await db.execute(sql`
      SELECT log_cron_run(
        'health-check-test', 
        'success',
        ${JSON.stringify({ test: true, timestamp: results.timestamp })}::jsonb
      )
    `);
    results.loggingWorking = true;
  } catch (error) {
    console.error("Logging test failed:", error);
    return {
      success: false,
      error: "Database logging failed",
      data: results,
    };
  }

  results.responseTime = Date.now() - startTime;
  const isHealthy = results.databaseConnected && results.loggingWorking;

  return {
    success: isHealthy,
    message: `Health check ${isHealthy ? "passed" : "failed"}`,
    data: {
      healthy: isHealthy,
      results,
    },
  };
}

// Create the cron job with proper logging
const cronJob = createCronJob('health-check', healthCheckHandler);

// Export the HTTP handlers
export const { POST, HEAD } = cronJob;

import type { NextRequest } from "next/server";

// Support GET requests for manual triggers
export async function GET(request: NextRequest) {
  return POST(request);
}