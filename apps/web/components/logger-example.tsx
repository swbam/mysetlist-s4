'use client';

import { Button } from '@repo/design-system/components/ui/button';
import { useEffect } from 'react';
import { logger } from '~/lib/logger';

export function LoggerExample() {
  useEffect(() => {
    // Log component mount
    logger.info('LoggerExample component mounted', {
      component: 'LoggerExample',
      action: 'mount',
    });

    // Add breadcrumb
    logger.addBreadcrumb('User viewed logger example', 'ui');

    return () => {
      // Log component unmount
      logger.info('LoggerExample component unmounted', {
        component: 'LoggerExample',
        action: 'unmount',
      });
    };
  }, []);

  const handleDebugLog = () => {
    logger.debug('Debug button clicked', {
      component: 'LoggerExample',
      action: 'debug-click',
    });
  };

  const handleInfoLog = () => {
    logger.info('Info button clicked', {
      component: 'LoggerExample',
      action: 'info-click',
      timestamp: new Date().toISOString(),
    });
  };

  const handleWarningLog = () => {
    logger.warn('Warning button clicked - this is a test warning', {
      component: 'LoggerExample',
      action: 'warning-click',
    });
  };

  const handleTraceLog = () => {
    logger.trace('Trace button clicked - detailed execution flow', {
      component: 'LoggerExample',
      action: 'trace-click',
      executionPath: 'user-interaction',
    });
  };

  const handleErrorLog = () => {
    const testError = new Error('This is a test error from the UI');
    logger.error('Error button clicked', testError, {
      component: 'LoggerExample',
      action: 'error-click',
    });
  };

  const handleApiTest = async () => {
    try {
      logger.info('Starting API test', {
        component: 'LoggerExample',
        action: 'api-test-start',
      });

      const response = await fetch('/api/test-logger');
      const data = await response.json();

      logger.info('API test completed', {
        component: 'LoggerExample',
        action: 'api-test-complete',
        success: data.success,
      });
    } catch (error) {
      logger.error('API test failed', error as Error, {
        component: 'LoggerExample',
        action: 'api-test-error',
      });
    }
  };

  const handleApiErrorTest = async () => {
    try {
      logger.info('Starting API error test', {
        component: 'LoggerExample',
        action: 'api-error-test-start',
      });

      const response = await fetch('/api/test-logger?error=true');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'API request failed');
      }
    } catch (error) {
      logger.error('API error test failed (expected)', error as Error, {
        component: 'LoggerExample',
        action: 'api-error-test',
      });
    }
  };

  return (
    <div className="space-y-4 p-4">
      <h2 className="font-bold text-2xl">Sentry Logger Example</h2>
      <p className="text-muted-foreground">
        Click the buttons below to test different log levels. Check the Sentry
        dashboard to see the logs.
      </p>

      <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-4">
        <Button onClick={handleTraceLog} variant="outline" size="sm">
          Log Trace Message
        </Button>

        <Button onClick={handleDebugLog} variant="outline" size="sm">
          Log Debug Message
        </Button>

        <Button onClick={handleInfoLog} variant="outline" size="sm">
          Log Info Message
        </Button>

        <Button onClick={handleWarningLog} variant="outline" size="sm">
          Log Warning Message
        </Button>

        <Button onClick={handleErrorLog} variant="destructive" size="sm">
          Log Error Message
        </Button>

        <Button onClick={handleApiTest} variant="secondary" size="sm">
          Test API Logger
        </Button>

        <Button onClick={handleApiErrorTest} variant="destructive" size="sm">
          Test API Error
        </Button>
      </div>

      <div className="mt-4 rounded-lg bg-muted p-4">
        <h3 className="mb-2 font-semibold">Note:</h3>
        <ul className="list-inside list-disc space-y-1 text-sm">
          <li>In development, logs will also appear in the browser console</li>
          <li>All logs are sent to Sentry with appropriate severity levels</li>
          <li>Error logs include stack traces when available</li>
          <li>Context data is attached to help with debugging</li>
        </ul>
      </div>
    </div>
  );
}
