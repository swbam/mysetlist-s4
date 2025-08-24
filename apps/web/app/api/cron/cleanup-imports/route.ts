// MySetlist-S4 Cleanup Imports Cron Job
// File: apps/web/app/api/cron/cleanup-imports/route.ts
// Cleans up old completed/failed import statuses

import { NextRequest } from 'next/server';
import { cleanupCompletedImports } from '~/lib/import-status';
import {
  createErrorResponse,
  createSuccessResponse,
  requireCronAuth,
} from '~/lib/api/auth-helpers';
import { db, sql } from '@repo/database';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    // Authentication check
    await requireCronAuth();

    const startTime = Date.now();
    console.log('🧹 Starting import status cleanup...');

    // Cleanup imports older than 24 hours by default
    const olderThanHours = 24;
    const cleanedCount = await cleanupCompletedImports(olderThanHours);

    const processingTime = Date.now() - startTime;

    // Log successful completion
    try {
      await db.execute(sql`
        SELECT log_cron_run(
          'cleanup-imports', 
          'success',
          ${JSON.stringify({
            cleanedCount,
            olderThanHours,
            processingTime,
          })}::jsonb
        )
      `);
    } catch (logError) {
      console.error('Failed to log cron run:', logError);
    }

    console.log(`✅ Import cleanup completed: ${cleanedCount} records cleaned in ${processingTime}ms`);

    return createSuccessResponse({
      message: 'Import cleanup completed',
      cleanedCount,
      olderThanHours,
      processingTime,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Import cleanup failed:', error);
    
    // Log error
    try {
      await db.execute(sql`
        SELECT log_cron_run(
          'cleanup-imports', 
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
      'Import cleanup failed',
      500,
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}

export async function GET(_request: NextRequest) {
  return POST();
}
