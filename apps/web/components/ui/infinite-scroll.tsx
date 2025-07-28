"use client";

import { cn } from "@repo/design-system/lib/utils";
import React, { useEffect, useRef, useCallback } from "react";
import { LoadingSpinner } from "~/components/loading-states";

interface InfiniteScrollProps {
  children: React.ReactNode;
  hasMore: boolean;
  isLoading: boolean;
  onLoadMore: () => void;
  threshold?: number;
  loadingComponent?: React.ReactNode;
  endMessage?: React.ReactNode;
  className?: string;
  role?: string;
}

export function InfiniteScroll({
  children,
  hasMore,
  isLoading,
  onLoadMore,
  threshold = 100,
  loadingComponent,
  endMessage,
  className,
  role = "feed",
}: InfiniteScrollProps) {
  const loaderRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const handleIntersection = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [entry] = entries;
      if (entry?.isIntersecting && hasMore && !isLoading) {
        onLoadMore();
      }
    },
    [hasMore, isLoading, onLoadMore],
  );

  useEffect(() => {
    const loader = loaderRef.current;
    if (!loader) {
      return;
    }

    // Create intersection observer
    observerRef.current = new IntersectionObserver(handleIntersection, {
      rootMargin: `${threshold}px`,
      threshold: 0.1,
    });

    observerRef.current.observe(loader);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [handleIntersection, threshold]);

  const defaultLoadingComponent = (
    <div className="flex justify-center py-8">
      <LoadingSpinner size="md" />
    </div>
  );

  const defaultEndMessage = (
    <div className="py-8 text-center text-muted-foreground">
      <p>No more items to load</p>
    </div>
  );

  return (
    <div className={cn("w-full", className)} role={role}>
      {children}

      {hasMore && (
        <div
          ref={loaderRef}
          className="w-full"
          aria-label="Loading more content"
        >
          {isLoading && (loadingComponent || defaultLoadingComponent)}
        </div>
      )}

      {!hasMore && !isLoading && (endMessage || defaultEndMessage)}
    </div>
  );
}

// Hook for managing infinite scroll state
export function useInfiniteScroll<T>({
  initialData = [],
  pageSize = 10,
  loadMore,
}: {
  initialData?: T[];
  pageSize?: number;
  loadMore: (page: number, pageSize: number) => Promise<T[]>;
}) {
  const [data, setData] = React.useState<T[]>(initialData);
  const [page, setPage] = React.useState(1);
  const [isLoading, setIsLoading] = React.useState(false);
  const [hasMore, setHasMore] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const loadMoreData = useCallback(async () => {
    if (isLoading || !hasMore) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const newData = await loadMore(page, pageSize);

      if (newData.length === 0) {
        setHasMore(false);
      } else {
        setData((prev) => [...prev, ...newData]);
        setPage((prev) => prev + 1);

        // If we received less than the page size, we've reached the end
        if (newData.length < pageSize) {
          setHasMore(false);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load more data");
    } finally {
      setIsLoading(false);
    }
  }, [page, pageSize, loadMore, isLoading, hasMore]);

  const reset = useCallback(() => {
    setData(initialData);
    setPage(1);
    setIsLoading(false);
    setHasMore(true);
    setError(null);
  }, [initialData]);

  const refetch = useCallback(async () => {
    reset();
    await loadMoreData();
  }, [reset, loadMoreData]);

  return {
    data,
    isLoading,
    hasMore,
    error,
    loadMore: loadMoreData,
    reset,
    refetch,
  };
}
