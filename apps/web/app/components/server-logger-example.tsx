import { logger } from '@/lib/logger';

interface ServerLoggerExampleProps {
  userId?: string;
}

export async function ServerLoggerExample({
  userId,
}: ServerLoggerExampleProps) {
  // Log server component render with trace
  logger.trace('Server component rendering started', {
    component: 'ServerLoggerExample',
    userId,
  });

  // Log server component render
  logger.info('Server component rendered', {
    component: 'ServerLoggerExample',
    userId,
    timestamp: new Date().toISOString(),
  });

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
    logger.error('Failed to fetch data in server component', error, {
      component: 'ServerLoggerExample',
      userId,
    });

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

  // Simulate occasional errors for testing
  if (Math.random() > 0.9) {
    throw new Error('Simulated API error');
  }

  return Array.from({ length: 5 }, (_, i) => ({ id: i, name: `Item ${i}` }));
}
