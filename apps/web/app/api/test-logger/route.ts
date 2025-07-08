import { logger } from '@/lib/logger';
import { type NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Set user context (in a real app, this would come from authentication)
    logger.setUser({
      id: 'test-user-123',
      email: 'test@example.com',
      username: 'testuser',
    });

    // Add breadcrumb for tracking user actions
    logger.addBreadcrumb('User accessed test logger endpoint', 'navigation');

    // Example trace log (new in Sentry logging API)
    logger.trace('Request processing starting', {
      action: 'test-logger',
      endpoint: '/api/test-logger',
    });

    // Example debug log
    logger.debug('Test logger endpoint accessed', {
      action: 'test-logger',
      timestamp: new Date().toISOString(),
    });

    // Example info log
    logger.info('Processing test request', {
      userId: 'test-user-123',
      action: 'test-request',
      metadata: {
        source: 'api',
        version: '1.0',
      },
    });

    // Example warning log (using new 'warn' method)
    logger.warn('This is a test warning', {
      action: 'test-warning',
      severity: 'low',
    });

    // Simulate an error scenario
    const testError = request.nextUrl.searchParams.get('error');
    if (testError === 'true') {
      throw new Error('This is a test error for Sentry logging');
    }

    // Example of performance tracking
    const transaction = logger.startTransaction('test-api-call', 'http.server');

    // Simulate some work
    await new Promise((resolve) => setTimeout(resolve, 100));

    transaction.finish();

    // Clear user context
    logger.clearUser();

    return NextResponse.json({
      success: true,
      message: 'Logger test completed. Check Sentry dashboard for logs.',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    // Example error logging with actual error object
    logger.error('Test endpoint error', error, {
      action: 'test-error',
      endpoint: '/api/test-logger',
    });

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Example of logging with request data
    logger.info('Test POST request received', {
      action: 'test-post',
      requestData: body,
      contentType: request.headers.get('content-type'),
    });

    // Example of a fatal error
    if (body.triggerFatal) {
      const fatalError = new Error('This is a test fatal error');
      logger.fatal('Fatal error in test endpoint', fatalError, {
        action: 'test-fatal',
        requestData: body,
      });
      throw fatalError;
    }

    return NextResponse.json({
      success: true,
      message: 'POST request logged successfully',
      receivedData: body,
    });
  } catch (error) {
    logger.error('POST request failed', error, {
      action: 'test-post-error',
    });

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
