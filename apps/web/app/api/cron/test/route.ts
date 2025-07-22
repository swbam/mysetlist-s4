import { NextRequest, NextResponse } from 'next/server';
import { db } from '@repo/database';
import { sql } from 'drizzle-orm';

const CRON_SECRET = process.env['CRON_SECRET'] || '6155002300';

export async function GET(request: NextRequest) {
  // Check authorization
  const authHeader = request.headers.get('authorization');
  if (!authHeader || authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get list of all cron endpoints
    const cronEndpoints = [
      { name: 'calculate-trending', path: '/api/cron/calculate-trending' },
      { name: 'sync-popular-artists', path: '/api/cron/sync-popular-artists' },
      { name: 'show-lifecycle', path: '/api/cron/show-lifecycle' },
      { name: 'hourly-update', path: '/api/cron/hourly-update' },
      { name: 'daily-sync', path: '/api/cron/daily-sync' },
      { name: 'email-processing', path: '/api/cron/email-processing' },
      { name: 'data-maintenance', path: '/api/cron/data-maintenance' },
      { name: 'weekly-digest', path: '/api/cron/weekly-digest' },
    ];

    // Test database connection
    const dbTest = await db.execute(sql`SELECT NOW() as current_time`);
    
    // Get cron job status from Supabase
    let cronJobStatus = null;
    try {
      const { data: cronJobs } = await db.execute(sql`
        SELECT jobname, schedule, active, 
               (SELECT COUNT(*) FROM cron.job_run_details WHERE jobid = j.jobid AND status = 'succeeded') as successful_runs,
               (SELECT COUNT(*) FROM cron.job_run_details WHERE jobid = j.jobid AND status = 'failed') as failed_runs,
               (SELECT MAX(start_time) FROM cron.job_run_details WHERE jobid = j.jobid) as last_run
        FROM cron.job j
        ORDER BY jobname
      `);
      cronJobStatus = cronJobs;
    } catch (error) {
      console.error('Failed to get cron job status:', error);
    }

    // Get sync log entries
    let syncLogs = null;
    try {
      const { data: logs } = await db.execute(sql`
        SELECT sync_type, status, started_at, completed_at, records_processed, error_message
        FROM sync_log
        ORDER BY started_at DESC
        LIMIT 10
      `);
      syncLogs = logs;
    } catch (error) {
      console.error('Failed to get sync logs:', error);
    }

    return NextResponse.json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      database: {
        connected: !!dbTest,
        currentTime: dbTest?.rows?.[0]?.current_time,
      },
      cronEndpoints: cronEndpoints.map(ep => ({
        ...ep,
        testUrl: `${process.env['NEXT_PUBLIC_APP_URL']}${ep.path}`,
      })),
      supabaseCronJobs: cronJobStatus,
      recentSyncLogs: syncLogs,
      configuration: {
        appUrl: process.env['NEXT_PUBLIC_APP_URL'],
        cronSecretConfigured: !!process.env['CRON_SECRET'],
        supabaseConfigured: !!process.env['SUPABASE_URL'],
      },
      testInstructions: {
        message: 'To test a specific cron job, make a GET or POST request to the endpoint with Authorization header',
        example: `curl -X GET ${process.env['NEXT_PUBLIC_APP_URL']}/api/cron/calculate-trending -H "Authorization: Bearer ${CRON_SECRET}"`,
      },
    });
  } catch (error) {
    console.error('Cron test error:', error);
    return NextResponse.json(
      {
        error: 'Failed to test cron system',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// Support POST for consistency
export async function POST(request: NextRequest) {
  return GET(request);
}