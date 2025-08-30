// MySetlist-S4 Cleanup Old Data Cron Job
// File: apps/web/app/api/cron/cleanup-old-data/route.ts
// Comprehensive cleanup of old data across all system components

import { NextRequest } from 'next/server';
import {
  createErrorResponse,
  createSuccessResponse,
  requireCronAuth,
} from '~/lib/api/auth-helpers';
import { db, sql } from '@repo/database';
import { cacheManager } from '~/lib/cache/cache-manager';

export const dynamic = 'force-dynamic';

interface CleanupResults {
  importStatuses: number;
  syncJobs: number;
  cronLogs: number;
  queueJobLogs: number;
  cacheEntries: number;
  tempFiles: number;
  errorLogs: number;
}

export async function POST() {
  try {
    // Authentication check
    await requireCronAuth();

    const startTime = Date.now();
    console.log('🧹 Starting comprehensive data cleanup...');

    const results: CleanupResults = {
      importStatuses: 0,
      syncJobs: 0,
      cronLogs: 0,
      queueJobLogs: 0,
      cacheEntries: 0,
      tempFiles: 0,
      errorLogs: 0,
    };

    // 1. Clean up old import statuses (completed/failed older than 7 days)
    console.log('Cleaning up old import statuses...');
    try {
      const importResult = await db.execute(sql`
        DELETE FROM import_status 
        WHERE stage IN ('completed', 'failed') 
        AND updated_at < NOW() - INTERVAL '7 days'
        RETURNING id
      `);
      results.importStatuses = Array.isArray((importResult as any).rows) ? (importResult as any).rows.length : 0;
      console.log(`✅ Cleaned ${results.importStatuses} old import statuses`);
    } catch (error) {
      console.error('Failed to clean import statuses:', error);
    }

    // 2. Clean up old sync job logs (completed older than 30 days)
    console.log('Cleaning up old sync jobs...');
    try {
      const syncResult = await db.execute(sql`
        DELETE FROM sync_jobs 
        WHERE status = 'completed' 
        AND completed_at < NOW() - INTERVAL '30 days'
        RETURNING id
      `);
      results.syncJobs = Array.isArray((syncResult as any).rows) ? (syncResult as any).rows.length : 0;
      console.log(`✅ Cleaned ${results.syncJobs} old sync jobs`);
    } catch (error) {
      console.error('Failed to clean sync jobs:', error);
    }

    // 3. Clean up old cron logs (older than 14 days)
    console.log('Cleaning up old cron logs...');
    try {
      const cronResult = await db.execute(sql`
        DELETE FROM cron_logs 
        WHERE _creationTime < NOW() - INTERVAL '14 days'
        AND status = 'success'
        RETURNING id
      `);
      results.cronLogs = Array.isArray((cronResult as any).rows) ? (cronResult as any).rows.length : 0;
      console.log(`✅ Cleaned ${results.cronLogs} old cron logs`);
    } catch (error) {
      console.error('Failed to clean cron logs:', error);
    }

    // 4. Clean up old queue job logs (older than 7 days)
    console.log('Cleaning up old queue job logs...');
    try {
      const queueResult = await db.execute(sql`
        DELETE FROM queue_jobs 
        WHERE status IN ('completed', 'failed') 
        AND updated_at < NOW() - INTERVAL '7 days'
        RETURNING id
      `);
      results.queueJobLogs = Array.isArray((queueResult as any).rows) ? (queueResult as any).rows.length : 0;
      console.log(`✅ Cleaned ${results.queueJobLogs} old queue job logs`);
    } catch (error) {
      console.error('Failed to clean queue job logs:', error);
    }

    // 5. Clean up old error logs (older than 30 days, keep recent errors longer)
    console.log('Cleaning up old error logs...');
    try {
      const errorResult = await db.execute(sql`
        DELETE FROM error_logs 
        WHERE _creationTime < NOW() - INTERVAL '30 days'
        AND severity NOT IN ('critical', 'fatal')
        RETURNING id
      `);
      results.errorLogs = Array.isArray((errorResult as any).rows) ? (errorResult as any).rows.length : 0;
      console.log(`✅ Cleaned ${results.errorLogs} old error logs`);
    } catch (error) {
      console.error('Failed to clean error logs:', error);
    }

    // 6. Clean up temporary files and uploads (older than 24 hours)
    console.log('Cleaning up temporary files...');
    try {
      const tempResult = await db.execute(sql`
        DELETE FROM temp_uploads 
        WHERE _creationTime < NOW() - INTERVAL '24 hours'
        AND status != 'processing'
        RETURNING id
      `);
      results.tempFiles = Array.isArray((tempResult as any).rows) ? (tempResult as any).rows.length : 0;
      console.log(`✅ Cleaned ${results.tempFiles} temporary files`);
    } catch (error) {
      console.error('Failed to clean temporary files:', error);
    }

    // 7. Clean up expired cache entries
    console.log('Cleaning up expired cache entries...');
    try {
      // Clean up various cache namespaces
      const expiredNamespaces = ['expired', 'temp', 'session-temp'];
      let totalCacheCleared = 0;
      
      for (const namespace of expiredNamespaces) {
        const cleared = await cacheManager.clearNamespace(namespace);
        totalCacheCleared += cleared;
      }

      // Also clean up old warming metadata
      const warmingCleared = await cacheManager.clearNamespace('warming');
      totalCacheCleared += warmingCleared;

      results.cacheEntries = totalCacheCleared;
      console.log(`✅ Cleaned ${results.cacheEntries} cache entries`);
    } catch (error) {
      console.error('Failed to clean cache entries:', error);
    }

    // 8. Clean up old session data (if applicable)
    console.log('Cleaning up old session data...');
    try {
      await db.execute(sql`
        DELETE FROM user_sessions 
        WHERE expires_at < NOW()
        OR (last_activity < NOW() - INTERVAL '30 days' AND remember_me = false)
      `);
      console.log('✅ Cleaned expired sessions');
    } catch (error) {
      console.error('Failed to clean sessions:', error);
    }

    // 9. Clean up old analytics data (keep aggregated, remove raw older than 90 days)
    console.log('Cleaning up old analytics data...');
    try {
      await db.execute(sql`
        DELETE FROM analytics_events 
        WHERE _creationTime < NOW() - INTERVAL '90 days'
        AND event_type NOT IN ('conversion', 'error', 'performance_critical')
      `);
      console.log('✅ Cleaned old analytics data');
    } catch (error) {
      console.error('Failed to clean analytics data:', error);
    }

    // 10. Optimize database tables after cleanup
    console.log('Optimizing database tables...');
    try {
      await db.execute(sql`VACUUM ANALYZE import_status`);
      await db.execute(sql`VACUUM ANALYZE sync_jobs`);
      await db.execute(sql`VACUUM ANALYZE cron_logs`);
      await db.execute(sql`VACUUM ANALYZE queue_jobs`);
      console.log('✅ Database tables optimized');
    } catch (error) {
      console.error('Failed to optimize tables:', error);
    }

    const processingTime = Date.now() - startTime;
    const totalCleaned = Object.values(results).reduce((sum, count) => sum + count, 0);

    // Log successful completion
    try {
      await db.execute(sql`
        SELECT log_cron_run(
          'cleanup-old-data', 
          'success',
          ${JSON.stringify({
            ...results,
            totalCleaned,
            processingTime,
            timestamp: new Date().toISOString(),
          })}::jsonb
        )
      `);
    } catch (logError) {
      console.error('Failed to log cron run:', logError);
    }

    console.log(`✅ Data cleanup completed: ${totalCleaned} total records cleaned in ${processingTime}ms`);
    console.log('📊 Cleanup breakdown:', results);

    return createSuccessResponse({
      message: 'Data cleanup completed successfully',
      results,
      totalCleaned,
      processingTime,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Data cleanup failed:', error);
    
    // Log error
    try {
      await db.execute(sql`
        SELECT log_cron_run(
          'cleanup-old-data', 
          'failed',
          ${JSON.stringify({ 
            error: error instanceof Error ? error.message : String(error),
            timestamp: new Date().toISOString(),
          })}::jsonb
        )
      `);
    } catch (logError) {
      console.error('Failed to log error:', logError);
    }

    return createErrorResponse(
      'Data cleanup failed',
      500,
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}

export async function GET(_request: NextRequest) {
  return POST();
}