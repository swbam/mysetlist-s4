import { NextRequest, NextResponse } from 'next/server';
import { db } from '@repo/database';
import { sql } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
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

    return NextResponse.json({
      status: 'healthy',
      timestamp,
      checks: {
        database: dbCheck.length > 0 ? 'connected' : 'disconnected',
        environment: envCheck,
      },
      version: process.env.npm_package_version || 'unknown',
    });
  } catch (error) {
    console.error('Health check failed:', error);
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