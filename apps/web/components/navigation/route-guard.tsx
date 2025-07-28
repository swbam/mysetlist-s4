"use client";

import { Skeleton } from "@repo/design-system/components/ui/skeleton";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

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
          <h2 className="mb-2 font-semibold text-2xl">Page Load Error</h2>
          <p className="mb-4 text-muted-foreground">
            There was an error loading this page.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="rounded-md bg-primary px-4 py-2 text-primary-foreground"
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
          <Skeleton className="mb-4 h-12 w-64" />
          <Skeleton className="h-6 w-96" />
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
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
