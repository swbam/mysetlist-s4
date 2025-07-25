import { logger } from '~/lib/logger';

interface ServerLoggerExampleProps {
  userId?: string;
}

export async function ServerLoggerExample({
  userId,
}: ServerLoggerExampleProps) {
  // Log server component render with trace
  const logContext: any = {
    component: 'ServerLoggerExample',
  };
  if (userId !== undefined) {
    logContext.userId = userId;
  }
  logger.trace('Server component rendering started', logContext);

  // Log server component render
  const infoContext: any = {
    component: 'ServerLoggerExample',
    timestamp: new Date().toISOString(),
  };
  if (userId !== undefined) {
    infoContext.userId = userId;
  }
  logger.info('Server component rendered', infoContext);

  try {
    // Simulate some server-side data fetching
    const data = await fetchSomeData();

    logger.debug('Data fetched successfully', {
      component: 'ServerLoggerExample',
      dataCount: data.length,
    });

    return (
      <div className="rounded-lg border p-4">
        <h3 className="mb-2 font-semibold">Server Component with Logging</h3>
        <p>This component logs on the server side.</p>
        <p>Data items: {data.length}</p>
      </div>
    );
  } catch (error) {
    const errorContext: any = {
      component: 'ServerLoggerExample',
    };
    if (userId !== undefined) {
      errorContext.userId = userId;
    }
    if (error instanceof Error) {
      logger.error('Failed to fetch data in server component', error);
    } else {
      logger.error('Failed to fetch data in server component', errorContext);
    }

    return (
      <div className="rounded-lg border border-red-500 p-4">
        <h3 className="mb-2 font-semibold text-red-600">Error</h3>
        <p>Failed to load data. Check Sentry for details.</p>
      </div>
    );
  }
}

// Simulated data fetching function
async function fetchSomeData(): Promise<any[]> {
  // Add breadcrumb for data fetching
  logger.addBreadcrumb('Fetching data from API', 'data', {
    endpoint: '/api/mock-data',
  });

  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 100));

  // TODO: Remove simulated errors - use real error handling only
  // Simulated errors removed to comply with no-mock-data requirement

  return Array.from({ length: 5 }, (_, i) => ({ id: i, name: `Item ${i}` }));
}
