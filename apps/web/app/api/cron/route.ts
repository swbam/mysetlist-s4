/**
 * Main Cron Route Handler
 * Coordinates background jobs and scheduled tasks
 */

import { NextRequest, NextResponse } from 'next/server';
import { executeJob, JobType, JobContext } from '../../../lib/jobs/processors';
import { calculateTrendingScores } from '../../../lib/jobs/trending-calculator';

// Verify cron secret to prevent unauthorized access
function verifyCronAuth(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  
  if (!cronSecret) {
    console.error('CRON_SECRET not configured');
    return false;
  }
  
  return authHeader === `Bearer ${cronSecret}`;
}

/**
 * Main cron endpoint handler
 */
export async function POST(request: NextRequest) {
  try {
    // Verify authorization
    if (!verifyCronAuth(request)) {
      console.error('Unauthorized cron request');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { 
      jobType, 
      payload = {}, 
      priority = 'medium',
      metadata = {} 
    } = body;

    if (!jobType) {
      return NextResponse.json({ error: 'jobType is required' }, { status: 400 });
    }

    // Create job context
    const context: JobContext = {
      jobId: `cron-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      priority,
      metadata: {
        ...metadata,
        triggeredBy: 'cron',
        timestamp: new Date().toISOString(),
      },
    };

    console.log(`Processing cron job: ${jobType}`, { context, payload });

    // Execute the job
    const result = await executeJob(jobType as JobType, payload, context);

    const responseStatus = result.success ? 200 : 500;
    
    return NextResponse.json({
      success: result.success,
      message: result.message,
      data: result.data,
      error: result.error,
      jobId: context.jobId,
      timestamp: new Date().toISOString(),
    }, { status: responseStatus });

  } catch (error) {
    console.error('Cron route error:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Cron job execution failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}

/**
 * GET handler for health checks and job status
 */
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const action = url.searchParams.get('action');

    // Health check
    if (action === 'health') {
      const result = await executeJob('health-check', {}, {
        jobId: `health-${Date.now()}`,
        priority: 'high',
      });

      return NextResponse.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        healthCheck: result,
      });
    }

    // Trending calculation status
    if (action === 'trending-status') {
      try {
        const result = await calculateTrendingScores({ forceRecalculate: false });
        return NextResponse.json({
          status: 'completed',
          result,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        return NextResponse.json({
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
        }, { status: 500 });
      }
    }

    // Default response
    return NextResponse.json({
      status: 'ready',
      availableActions: [
        'health',
        'trending-status',
      ],
      availableJobs: [
        'artist-import',
        'batch-artist-import',
        'ticketmaster-sync',
        'spotify-catalog-sync',
        'trending-calculation',
        'stale-data-cleanup',
        'health-check',
      ],
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Cron GET route error:', error);
    
    return NextResponse.json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}

/**
 * Convenience endpoints for common operations
 */

// PUT /api/cron - Manual job scheduling
export async function PUT(request: NextRequest) {
  try {
    if (!verifyCronAuth(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action, ...payload } = body;

    switch (action) {
      case 'calculate-trending':
        const trendingResult = await executeJob('trending-calculation', {
          forceRecalculate: true,
          ...payload,
        }, {
          jobId: `manual-trending-${Date.now()}`,
          priority: 'high',
        });

        return NextResponse.json({
          action: 'calculate-trending',
          result: trendingResult,
          timestamp: new Date().toISOString(),
        });

      case 'cleanup-stale-data':
        const cleanupResult = await executeJob('stale-data-cleanup', {
          olderThanDays: payload.olderThanDays || 30,
        }, {
          jobId: `manual-cleanup-${Date.now()}`,
          priority: 'medium',
        });

        return NextResponse.json({
          action: 'cleanup-stale-data',
          result: cleanupResult,
          timestamp: new Date().toISOString(),
        });

      case 'batch-import':
        if (!payload.tmAttractionIds || !Array.isArray(payload.tmAttractionIds)) {
          return NextResponse.json({ 
            error: 'tmAttractionIds array is required for batch-import' 
          }, { status: 400 });
        }

        const batchResult = await executeJob('batch-artist-import', {
          tmAttractionIds: payload.tmAttractionIds,
          config: payload.config || {},
        }, {
          jobId: `manual-batch-${Date.now()}`,
          priority: 'high',
        });

        return NextResponse.json({
          action: 'batch-import',
          result: batchResult,
          timestamp: new Date().toISOString(),
        });

      default:
        return NextResponse.json({ 
          error: `Unknown action: ${action}` 
        }, { status: 400 });
    }

  } catch (error) {
    console.error('Cron PUT route error:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Manual job execution failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}

// OPTIONS handler for CORS
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}