import { type NextRequest } from "next/server";
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import {
  createErrorResponse,
  createSuccessResponse,
  requireCronAuth,
} from "~/lib/api/auth-helpers";

// Force dynamic rendering for API route
export const dynamic = "force-dynamic";

/**
 * Autonomous System Status Endpoint
 * Provides comprehensive monitoring of all autonomous pipelines
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate admin request
    await requireCronAuth();

    const supabase = createRouteHandlerClient({ 
      cookies: cookies
    });

    // Get autonomous sync status from database
    const { data: syncStatus, error: syncError } = await supabase
      .rpc('get_autonomous_sync_status');

    if (syncError) {
      throw new Error(`Failed to get sync status: ${syncError.message}`);
    }

    // Get autonomous sync health view
    const { data: healthStatus, error: healthError } = await supabase
      .from('autonomous_sync_health')
      .select('*');

    if (healthError) {
      throw new Error(`Failed to get health status: ${healthError.message}`);
    }

    // Calculate overall system health
    const overallHealth = calculateOverallHealth(syncStatus, healthStatus);

    // Check if all required pipelines are present
    const requiredPipelines = ['trending', 'sync', 'maintenance'];
    const activePipelines = (syncStatus || []).map((status: any) => status.pipeline);
    const missingPipelines = requiredPipelines.filter(p => !activePipelines.includes(p));

    return createSuccessResponse({
      systemStatus: overallHealth,
      pipelines: {
        active: activePipelines,
        missing: missingPipelines,
        details: syncStatus || [],
      },
      health: {
        overall: overallHealth,
        details: healthStatus || [],
      },
      grokCompliance: {
        score: calculateGrokComplianceScore(syncStatus, missingPipelines),
        missingComponents: missingPipelines,
        autonomousSystemActive: missingPipelines.length === 0,
      },
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error("Autonomous status check error:", error);
    return createErrorResponse(
      "Failed to get autonomous status",
      500,
      error instanceof Error ? error.message : "Unknown error"
    );
  }
}

function calculateOverallHealth(syncStatus: any[], healthStatus: any[]): string {
  if (!syncStatus || syncStatus.length === 0) {
    return 'unknown';
  }

  const recentFailures = syncStatus.filter((status: any) => 
    status.status === 'failed' && status.success_rate < 80
  );

  const staleJobs = healthStatus?.filter((health: any) => 
    health.health_status === 'stale'
  ) || [];

  if (recentFailures.length > 0) {
    return 'unhealthy';
  }

  if (staleJobs.length > 0) {
    return 'degraded';
  }

  return 'healthy';
}

function calculateGrokComplianceScore(syncStatus: any[], missingPipelines: string[]): number {
  const baseScore = 85; // Current implementation level
  
  // Deduct points for missing pipelines
  const pipelinePenalty = missingPipelines.length * 5;
  
  // Add points for active pipelines with good success rates
  const activePipelineBonus = (syncStatus || [])
    .filter((status: any) => status.success_rate >= 90)
    .length * 2;
  
  // Add bonus for full autonomous operation
  const autonomousBonus = missingPipelines.length === 0 ? 10 : 0;
  
  return Math.min(100, Math.max(0, baseScore - pipelinePenalty + activePipelineBonus + autonomousBonus));
}

// Support POST for manual health checks
export async function POST(request: NextRequest) {
  return GET(request);
}