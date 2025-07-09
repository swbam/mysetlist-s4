'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Skeleton } from '@repo/design-system/components/ui/skeleton';

interface RouteGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function RouteGuard({ children, fallback }: RouteGuardProps) {
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const handleRouteChange = () => {
      setIsLoading(true);
      setError(null);
    };

    const handleRouteComplete = () => {
      setIsLoading(false);
    };

    // Simulate route change detection
    handleRouteChange();
    const timer = setTimeout(handleRouteComplete, 100);

    return () => clearTimeout(timer);
  }, [pathname]);

  if (error) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-semibold mb-2">Page Load Error</h2>
          <p className="text-muted-foreground mb-4">
            There was an error loading this page.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md"
          >
            Reload Page
          </button>
        </div>
      </div>
    );
  }

  if (isLoading && fallback) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

export function PageLoadingSkeleton() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="space-y-8">
        <div>
          <Skeleton className="h-12 w-64 mb-4" />
          <Skeleton className="h-6 w-96" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="space-y-4">
              <Skeleton className="h-48 w-full rounded-lg" />
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}