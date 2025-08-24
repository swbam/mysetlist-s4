// MySetlist-S4 Sync US Shows Cron Job
// File: apps/web/app/api/cron/sync-us-shows/route.ts
// Synchronizes US shows with Ticketmaster API during optimal hours

import { NextRequest } from 'next/server';
import { db, sql } from '@repo/database';
import { queueManager, QueueName, Priority } from '~/lib/queues/queue-manager';
import { batchApiOptimizer } from '~/lib/services/batch-api-optimizer';

export const dynamic = 'force-dynamic';


// Response helpers
function createSuccessResponse(data: any) {
  return new Response(JSON.stringify({ success: true, ...data }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

function createErrorResponse(message: string, status: number = 500, details?: string) {
  return new Response(
    JSON.stringify({ 
      success: false, 
      error: message, 
      details,
      timestamp: new Date().toISOString() 
    }),
    {
      status,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}

export async function POST(request: NextRequest) {
  try {
    // Authentication check
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env['CRON_SECRET']}`) {
      return createErrorResponse('Unauthorized', 401);
    }

    const startTime = Date.now();
    console.log('🇺🇸 Starting US shows sync...');

    // Initialize queue manager if needed
    await queueManager.initialize();

    // Get US shows that need syncing
    const usShowsResult = await db.execute(sql`
      SELECT s.id, s.ticketmaster_id, s.date, s.last_sync_at, 
             v.name as venue_name, v.city, v.state, v.timezone, v.country
      FROM shows s
      JOIN venues v ON s.venue_id = v.id
      WHERE v.country = 'US'
      AND s.date BETWEEN NOW() AND NOW() + INTERVAL '30 days'
      AND (s.last_sync_at IS NULL OR s.last_sync_at < NOW() - INTERVAL '12 hours')
      AND s.ticketmaster_id IS NOT NULL
      ORDER BY s.date ASC
      LIMIT 100
    `);

    const usShows = Array.isArray((usShowsResult as any).rows) ? (usShowsResult as any).rows : [];
    console.log(`Found ${usShows.length} US shows to sync`);

    if (usShows.length === 0) {
      const processingTime = Date.now() - startTime;
      
      // Log successful completion
      try {
        await db.execute(sql`
          SELECT log_cron_run(
            'sync-us-shows', 
            'success',
            ${JSON.stringify({
              showsFound: 0,
              showsProcessed: 0,
              processingTime,
              region: 'US'
            })}::jsonb
          )
        `);
      } catch (logError) {
        console.error('Failed to log cron run:', logError);
      }

      return createSuccessResponse({
        message: 'No US shows need syncing',
        showsFound: 0,
        showsProcessed: 0,
        processingTime,
        timestamp: new Date().toISOString(),
      });
    }

    // Group shows by priority (upcoming shows get higher priority)
    const now = new Date();
    type USShow = { id: string; ticketmaster_id: string; date: string } & Record<string, any>;
    const typedShows = (usShows as unknown as USShow[]);

    const priorityShows = typedShows.filter((show) => {
      const showDate = new Date(show.date);
      const daysUntilShow = (showDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
      return daysUntilShow <= 7; // Shows within a week
    });

    const regularShows = typedShows.filter((show) => {
      const showDate = new Date(show.date);
      const daysUntilShow = (showDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
      return daysUntilShow > 7;
    });

    console.log(`Priority shows (within 7 days): ${priorityShows.length}`);
    console.log(`Regular shows: ${regularShows.length}`);

    // Process priority shows with batch API optimizer
    const priorityResults = await Promise.allSettled(
      priorityShows.map(show => 
        batchApiOptimizer.request('ticketmaster', 'getEvent', {
          id: show.ticketmaster_id,
          locale: 'en-us',
          includeTest: 'no'
        }, { 
          priority: 8,
          cacheKey: `tm-event-${show.ticketmaster_id}`
        })
      )
    );

    // Process regular shows with lower priority
    const regularResults = await Promise.allSettled(
      regularShows.map(show => 
        batchApiOptimizer.request('ticketmaster', 'getEvent', {
          id: show.ticketmaster_id,
          locale: 'en-us',
          includeTest: 'no'
        }, { 
          priority: 5,
          cacheKey: `tm-event-${show.ticketmaster_id}`
        })
      )
    );

    // Count successful syncs
    const prioritySuccessCount = priorityResults.filter(r => r.status === 'fulfilled').length;
    const regularSuccessCount = regularResults.filter(r => r.status === 'fulfilled').length;
    const totalSuccessCount = prioritySuccessCount + regularSuccessCount;

    // Add bulk sync job to queue for any failed individual requests
    const failedShows = [
      ...priorityShows.filter((_, i) => i < priorityResults.length && (priorityResults[i] as PromiseSettledResult<any>)?.status === 'rejected'),
      ...regularShows.filter((_, i) => i < regularResults.length && (regularResults[i] as PromiseSettledResult<any>)?.status === 'rejected')
    ];

    if (failedShows.length > 0) {
      console.log(`Adding ${failedShows.length} failed shows to queue for retry`);
      
      await queueManager.addJob(
        QueueName.TICKETMASTER_SYNC,
        'sync-us-shows-retry',
        { 
          showIds: failedShows.map(s => s.id), 
          region: 'US',
          retryAttempt: true
        },
        { priority: Priority.HIGH }
      );
    }

    // Add main sync job to queue for comprehensive processing
    await queueManager.addJob(
      QueueName.TICKETMASTER_SYNC,
      'sync-us-shows',
      { 
        showIds: typedShows.map((s) => s.id), 
        region: 'US',
        timezone: 'America/New_York',
        syncType: 'scheduled'
      },
      { priority: Priority.HIGH }
    );

    // Update last sync timestamp for successfully processed shows
    const successfulShowIds = [
      ...priorityShows
        .filter((_, i) => i < priorityResults.length && (priorityResults[i] as PromiseSettledResult<any>)?.status === 'fulfilled')
        .map((s: USShow) => s.id),
      ...regularShows
        .filter((_, i) => i < regularResults.length && (regularResults[i] as PromiseSettledResult<any>)?.status === 'fulfilled')
        .map((s: USShow) => s.id)
    ];

    if (successfulShowIds.length > 0) {
      await db.execute(sql`
        UPDATE shows 
        SET last_sync_at = NOW(), 
            sync_status = 'completed',
            updated_at = NOW()
        WHERE id = ANY(${successfulShowIds})
      `);
    }

    const processingTime = Date.now() - startTime;

    // Calculate performance metrics
    const successRate = usShows.length > 0 ? (totalSuccessCount / usShows.length) * 100 : 0;
    const avgProcessingTimePerShow = usShows.length > 0 ? processingTime / usShows.length : 0;

    // Log successful completion with detailed metrics
    try {
      await db.execute(sql`
        SELECT log_cron_run(
          'sync-us-shows', 
          'success',
          ${JSON.stringify({
            showsFound: usShows.length,
            showsProcessed: totalSuccessCount,
            priorityShows: priorityShows.length,
            regularShows: regularShows.length,
            failedShows: failedShows.length,
            successRate: Math.round(successRate * 100) / 100,
            processingTime,
            avgProcessingTimePerShow: Math.round(avgProcessingTimePerShow * 100) / 100,
            region: 'US',
            queueJobsAdded: failedShows.length > 0 ? 2 : 1
          })}::jsonb
        )
      `);
    } catch (logError) {
      console.error('Failed to log cron run:', logError);
    }

    console.log(`✅ US shows sync completed: ${totalSuccessCount}/${usShows.length} shows processed in ${processingTime}ms`);
    console.log(`📊 Success rate: ${successRate.toFixed(1)}%, Avg time per show: ${avgProcessingTimePerShow.toFixed(1)}ms`);

    return createSuccessResponse({
      message: 'US shows sync completed',
      showsFound: usShows.length,
      showsProcessed: totalSuccessCount,
      priorityShows: priorityShows.length,
      regularShows: regularShows.length,
      failedShows: failedShows.length,
      successRate: Math.round(successRate * 100) / 100,
      processingTime,
      avgProcessingTimePerShow: Math.round(avgProcessingTimePerShow * 100) / 100,
      queueJobsAdded: failedShows.length > 0 ? 2 : 1,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('US shows sync failed:', error);
    
    // Log error
    try {
      await db.execute(sql`
        SELECT log_cron_run(
          'sync-us-shows', 
          'failed',
          ${JSON.stringify({ 
            error: error instanceof Error ? error.message : String(error),
            region: 'US',
            timestamp: new Date().toISOString(),
          })}::jsonb
        )
      `);
    } catch (logError) {
      console.error('Failed to log error:', logError);
    }

    return createErrorResponse(
      'US shows sync failed',
      500,
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}

export async function GET(request: NextRequest) {
  return POST(request);
}