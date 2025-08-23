import { headers } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
// Temporarily disable cron monitor to fix build
// import { cronMonitor } from "../../../../lib/monitoring/cron-monitor";

// Force dynamic rendering for API route
export const dynamic = "force-dynamic";

/**
 * Cron job health monitoring API endpoint
 * Provides health status, metrics, and alerts for all cron jobs
 */
export async function GET(_request: NextRequest) {
  try {
    // Check for authorization (admin only)
    const headersList = await headers();
    const authHeader = headersList.get("authorization");
    const validTokens = [
      process.env['CRON_SECRET'],
      process.env['SUPABASE_SERVICE_ROLE_KEY'],
      process.env['ADMIN_API_KEY'],
    ].filter(Boolean) as string[];

    if (
      validTokens.length > 0 &&
      !(authHeader && validTokens.some((t) => authHeader === `Bearer ${t}`))
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const jobName = searchParams.get("jobName");
    const includeMetrics = searchParams.get("includeMetrics") === "true";
    const includeReport = searchParams.get("includeReport") === "true";

    const response: any = {
      timestamp: new Date().toISOString(),
      systemHealth: { status: 'disabled', message: 'Monitoring temporarily disabled' },
    };

    if (jobName) {
      // Get specific job health and metrics
      response.jobHealth = { status: 'disabled' };

      if (includeMetrics) {
        response.metrics = [];
      }
    } else {
      // Get all jobs health
      response.allJobs = [];

      if (includeReport) {
        response.fullReport = { status: 'disabled' };
      }
    }

    // Add alert rules
    response.alertRules = [];

    return NextResponse.json({
      success: true,
      data: response,
    });
  } catch (error) {
    console.error("Cron health check failed:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Health check failed",
        message: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}

/**
 * Update alert rules or trigger manual health checks
 */
export async function POST(request: NextRequest) {
  try {
    // Check for authorization (admin only)
    const headersList = await headers();
    const authHeader = headersList.get("authorization");
    const validTokens = [
      process.env['CRON_SECRET'],
      process.env['SUPABASE_SERVICE_ROLE_KEY'],
      process.env['ADMIN_API_KEY'],
    ].filter(Boolean) as string[];

    if (
      validTokens.length > 0 &&
      !(authHeader && validTokens.some((t) => authHeader === `Bearer ${t}`))
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { action, alertRule, jobName } = body;

    let result: any = {};

    switch (action) {
      case "addAlertRule":
        result = { message: "Monitoring temporarily disabled" };
        break;

      case "triggerHealthCheck":
        // Manually trigger a health check
        result = {
          systemHealth: { status: 'disabled' },
          timestamp: new Date().toISOString(),
        };
        break;

      case "getMetrics":
        if (jobName) {
          result = {
            jobName,
            metrics: [],
            health: { status: 'disabled' },
          };
        } else {
          return NextResponse.json(
            { error: "Job name required for metrics" },
            { status: 400 },
          );
        }
        break;

      default:
        return NextResponse.json(
          {
            error:
              "Invalid action. Use: addAlertRule, triggerHealthCheck, getMetrics",
          },
          { status: 400 },
        );
    }

    return NextResponse.json({
      success: true,
      result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Cron monitoring action failed:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Monitoring action failed",
        message: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}
