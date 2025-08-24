// Cron Job Database Logging Wrapper
// File: apps/web/lib/cron/cron-wrapper.ts
// Integrates cron jobs with database logging

import { NextRequest, NextResponse } from "next/server";
import { createSuccessResponse, createErrorResponse, requireCronAuth } from "../api/auth-helpers";

interface CronJobResult {
  success: boolean;
  data?: any;
  message?: string;
  error?: string;
}

interface CronJobHandler {
  (): Promise<CronJobResult>;
}

/**
 * Wrapper for cron jobs that provides:
 * - Authentication checking
 * - Database logging via log_cron_run function
 * - Standardized response format
 * - Error handling and performance tracking
 */
export async function withCronLogging(
  jobName: string,
  handler: CronJobHandler,
  _request: NextRequest
): Promise<NextResponse> {
  const startTime = Date.now();
  
  try {
    // Authentication check
    await requireCronAuth();
    
    // Log job start to database
    await logCronRun(jobName, 'running', null);
    
    console.log(`🚀 Starting cron job: ${jobName}`);
    
    // Execute the job handler
    const result = await handler();
    const executionTime = Date.now() - startTime;
    
    if (result.success) {
      // Log successful completion
      const logData = {
        ...result.data,
        executionTimeMs: executionTime,
        message: result.message,
      };
      
      await logCronRun(jobName, 'success', logData);
      
      console.log(`✅ Cron job completed: ${jobName} (${executionTime}ms)`);
      
      return createSuccessResponse({
        message: result.message || `${jobName} completed successfully`,
        data: result.data,
        executionTime: executionTime,
        timestamp: new Date().toISOString(),
      });
    } else {
      // Log failed completion
      const errorData = {
        error: result.error || 'Unknown error',
        executionTimeMs: executionTime,
      };
      
      await logCronRun(jobName, 'failed', errorData);
      
      console.error(`❌ Cron job failed: ${jobName} - ${result.error}`);
      
      return createErrorResponse(
        result.error || `${jobName} failed`,
        500,
        errorData
      );
    }
  } catch (error) {
    const executionTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    try {
      // Log failure to database
      await logCronRun(jobName, 'failed', {
        error: errorMessage,
        executionTimeMs: executionTime,
        stack: error instanceof Error ? error.stack : undefined,
      });
    } catch (logError) {
      console.error('Failed to log cron job error to database:', logError);
    }
    
    console.error(`❌ Cron job error: ${jobName}`, error);
    
    return createErrorResponse(
      `${jobName} failed`,
      500,
      { error: errorMessage, executionTime }
    );
  }
}

/**
 * Call the database log_cron_run function
 */
async function logCronRun(jobName: string, status: 'running' | 'success' | 'failed', result: any): Promise<void> {
  try {
    // Use dynamic import to avoid module resolution issues at startup
    const databaseModule = await import("@repo/database");
    const { db, sql } = databaseModule;
    
    await db.execute(sql`
      SELECT log_cron_run(${jobName}, ${status}, ${result ? JSON.stringify(result) : null}::jsonb)
    `);
  } catch (error) {
    console.error(`Failed to log cron job ${jobName} (${status}):`, error);
    // Don't throw - we don't want logging failures to break cron jobs
  }
}

/**
 * Health check wrapper for cron jobs
 */
export async function withCronHealthCheck(
  jobName: string,
  healthCheckFn?: () => Promise<boolean>
): Promise<NextResponse> {
  try {
    // Basic database connectivity check
    const databaseModule = await import("@repo/database");
    const { db, sql } = databaseModule;
    await db.execute(sql`SELECT 1`);
    
    // Run custom health check if provided
    if (healthCheckFn && !(await healthCheckFn())) {
      return NextResponse.json(null, { 
        status: 503,
        headers: { 'Cache-Control': 'no-cache' },
      });
    }
    
    return NextResponse.json(null, { 
      status: 200,
      headers: { 
        'Cache-Control': 'no-cache',
        'X-Cron-Job': jobName,
      },
    });
  } catch (error) {
    console.error(`Health check failed for ${jobName}:`, error);
    return NextResponse.json(null, { 
      status: 503,
      headers: { 'Cache-Control': 'no-cache' },
    });
  }
}

/**
 * Create a wrapped cron job handler
 */
export function createCronJob(
  jobName: string,
  handler: CronJobHandler
) {
  return {
    async POST(request: NextRequest): Promise<NextResponse> {
      return withCronLogging(jobName, handler, request);
    },
    
    async HEAD(_request: NextRequest): Promise<NextResponse> {
      return withCronHealthCheck(jobName);
    },
  };
}
