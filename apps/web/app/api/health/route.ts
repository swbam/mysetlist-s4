import { NextRequest, NextResponse } from 'next/server';
import { db } from '@repo/database';
import { sql } from 'drizzle-orm';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    logger.debug('Health check started', {
      action: 'health-check',
      timestamp: new Date().toISOString(),
    });

    // Check database connection
    const dbCheck = await db
      .select({ count: sql<number>`1` })
      .from(sql`(SELECT 1) AS test`);

    // Check environment variables
    const envCheck = {
      supabase: !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
      serviceRole: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      cron: !!process.env.CRON_SECRET,
    };

    // Get current timestamp
    const timestamp = new Date().toISOString();
    const duration = Date.now() - startTime;

    const response = {
      status: 'healthy',
      timestamp,
      checks: {
        database: dbCheck.length > 0 ? 'connected' : 'disconnected',
        environment: envCheck,
      },
      version: process.env.npm_package_version || 'unknown',
    };

    logger.info('Health check completed successfully', {
      action: 'health-check',
      duration,
      checks: response.checks,
    });

    return NextResponse.json(response);
  } catch (error) {
    const duration = Date.now() - startTime;
    
    logger.error('Health check failed', error, {
      action: 'health-check-error',
      duration,
    });
    
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: (error as Error).message,
      },
      { status: 503 }
    );
  }
}