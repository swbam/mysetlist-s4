'use client';

import { cn } from '@repo/design-system/lib/utils';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

interface VirtualizedListProps<T> {
  items: T[];
  itemHeight: number | ((index: number) => number);
  renderItem: (item: T, index: number) => React.ReactNode;
  className?: string;
  containerHeight?: number;
  overscan?: number;
  onScroll?: (scrollTop: number) => void;
  onEndReached?: () => void;
  endReachedThreshold?: number;
  emptyComponent?: React.ReactNode;
  loadingComponent?: React.ReactNode;
  isLoading?: boolean;
  estimatedItemHeight?: number;
}

export function VirtualizedList<T>({
  items,
  itemHeight,
  renderItem,
  className,
  containerHeight = 400,
  overscan = 5,
  onScroll,
  onEndReached,
  endReachedThreshold = 0.8,
  emptyComponent,
  loadingComponent,
  isLoading = false,
  estimatedItemHeight = 100,
}: VirtualizedListProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);
  const [isScrolling, setIsScrolling] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Calculate item positions and heights
  const itemMetrics = useMemo(() => {
    let cumulativeHeight = 0;
    const positions: number[] = [];
    const heights: number[] = [];

    for (let i = 0; i < items.length; i++) {
      positions[i] = cumulativeHeight;

      const height =
        typeof itemHeight === 'function' ? itemHeight(i) : itemHeight;

      heights[i] = height;
      cumulativeHeight += height;
    }

    return {
      positions,
      heights,
      totalHeight: cumulativeHeight,
    };
  }, [items.length, itemHeight]);

  // Calculate visible range
  const visibleRange = useMemo(() => {
    if (items.length === 0) {
      return { start: 0, end: 0 };
    }

    const { positions, heights } = itemMetrics;

    // Find start index
    let start = 0;
    let end = items.length - 1;

    // Binary search for start index
    while (start < end) {
      const mid = Math.floor((start + end) / 2);
      if ((positions[mid] ?? 0) < scrollTop) {
        start = mid + 1;
      } else {
        end = mid;
      }
    }

    // Adjust start with overscan
    start = Math.max(0, start - overscan);

    // Find end index
    let endIndex = start;
    let accumulatedHeight = scrollTop;

    while (
      endIndex < items.length &&
      accumulatedHeight < scrollTop + containerHeight
    ) {
      accumulatedHeight += heights[endIndex] ?? 0;
      endIndex++;
    }

    // Adjust end with overscan
    endIndex = Math.min(items.length, endIndex + overscan);

    return { start, end: endIndex };
  }, [scrollTop, containerHeight, items.length, itemMetrics, overscan]);

  // Handle scroll
  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const newScrollTop = e.currentTarget.scrollTop;
      setScrollTop(newScrollTop);
      setIsScrolling(true);

      onScroll?.(newScrollTop);

      // Check if we've reached the end
      if (onEndReached) {
        const { scrollHeight, clientHeight } = e.currentTarget;
        const scrollPercent = (newScrollTop + clientHeight) / scrollHeight;

        if (scrollPercent >= endReachedThreshold) {
          onEndReached();
        }
      }

      // Clear scrolling state after a delay
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }

      scrollTimeoutRef.current = setTimeout(() => {
        setIsScrolling(false);
      }, 150);
    },
    [onScroll, onEndReached, endReachedThreshold]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!containerRef.current) {
        return;
      }

      const container = containerRef.current;
      const itemHeightValue =
        typeof itemHeight === 'function' ? estimatedItemHeight : itemHeight;

      switch (e.key) {
        case 'ArrowDown': {
          e.preventDefault();
          container.scrollTop = Math.min(
            container.scrollTop + itemHeightValue,
            itemMetrics.totalHeight - containerHeight
          );
          break;
        }
        case 'ArrowUp': {
          e.preventDefault();
          container.scrollTop = Math.max(
            container.scrollTop - itemHeightValue,
            0
          );
          break;
        }
        case 'PageDown': {
          e.preventDefault();
          container.scrollTop = Math.min(
            container.scrollTop + containerHeight * 0.8,
            itemMetrics.totalHeight - containerHeight
          );
          break;
        }
        case 'PageUp': {
          e.preventDefault();
          container.scrollTop = Math.max(
            container.scrollTop - containerHeight * 0.8,
            0
          );
          break;
        }
        case 'Home': {
          e.preventDefault();
          container.scrollTop = 0;
          break;
        }
        case 'End': {
          e.preventDefault();
          container.scrollTop = itemMetrics.totalHeight - containerHeight;
          break;
        }
      }
    },
    [itemHeight, estimatedItemHeight, itemMetrics.totalHeight, containerHeight]
  );

  // Render visible items
  const visibleItems = useMemo(() => {
    const result = [];

    for (let i = visibleRange.start; i < visibleRange.end; i++) {
      if (i >= items.length) {
        break;
      }

      const item = items[i];
      if (!item) continue;
      
      const top = itemMetrics.positions[i] ?? 0;
      const height = itemMetrics.heights[i] ?? estimatedItemHeight;

      result.push(
        <div
          key={i}
          style={{
            position: 'absolute',
            top,
            left: 0,
            right: 0,
            height,
          }}
          className={cn(
            'transition-opacity duration-150',
            isScrolling && 'pointer-events-none'
          )}
        >
          {renderItem(item, i)}
        </div>
      );
    }

    return result;
  }, [items, visibleRange, itemMetrics, renderItem, isScrolling]);

  // Empty state
  if (items.length === 0 && !isLoading) {
    return (
      <div
        className={cn('flex items-center justify-center', className)}
        style={{ height: containerHeight }}
      >
        {emptyComponent || (
          <div className="text-center text-muted-foreground">
            <p>No items to display</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        'scrollbar-thin scrollbar-thumb-border scrollbar-track-background relative overflow-auto',
        className
      )}
      style={{ height: containerHeight }}
      onScroll={handleScroll}
      onKeyDown={handleKeyDown}
      role="grid"
      aria-rowcount={items.length}
      aria-label="Virtualized list"
    >
      {/* Total height container */}
      <div
        style={{
          height: itemMetrics.totalHeight,
          position: 'relative',
        }}
      >
        {/* Visible items */}
        {visibleItems}

        {/* Loading indicator */}
        {isLoading && loadingComponent && (
          <div
            style={{
              position: 'absolute',
              top: itemMetrics.totalHeight,
              left: 0,
              right: 0,
              height: 100,
            }}
            className="flex items-center justify-center"
          >
            {loadingComponent}
          </div>
        )}
      </div>

      {/* Scroll indicator */}
      <div
        className={cn(
          'absolute top-1 right-1 bottom-1 w-1 rounded-full bg-muted transition-opacity duration-300',
          isScrolling ? 'opacity-100' : 'opacity-0'
        )}
      >
        <div
          className="absolute right-0 w-1 rounded-full bg-primary transition-all duration-150"
          style={{
            height: `${(containerHeight / itemMetrics.totalHeight) * 100}%`,
            top: `${(scrollTop / itemMetrics.totalHeight) * 100}%`,
          }}
        />
      </div>
    </div>
  );
}

// Specialized list components
export function ArtistList({
  artists,
  ...props
}: { artists: any[] } & Omit<
  VirtualizedListProps<any>,
  'items' | 'renderItem' | 'itemHeight'
>) {
  return (
    <VirtualizedList
      items={artists}
      itemHeight={80}
      renderItem={(artist, _index) => (
        <div className="border-b p-4 transition-colors hover:bg-muted/50">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-muted" />
            <div>
              <h3 className="font-medium">{artist.name}</h3>
              <p className="text-muted-foreground text-sm">{artist.genre}</p>
            </div>
          </div>
        </div>
      )}
      {...props}
    />
  );
}

export function ShowList({
  shows,
  ...props
}: { shows: any[] } & Omit<VirtualizedListProps<any>, 'items' | 'renderItem' | 'itemHeight'>) {
  return (
    <VirtualizedList
      items={shows}
      itemHeight={120}
      renderItem={(show, _index) => (
        <div className="border-b p-4 transition-colors hover:bg-muted/50">
          <div className="flex items-start gap-3">
            <div className="h-16 w-16 rounded bg-muted" />
            <div className="flex-1">
              <h3 className="font-medium">{show.name}</h3>
              <p className="text-muted-foreground text-sm">{show.artist}</p>
              <p className="text-muted-foreground text-sm">
                {show.venue} • {show.date}
              </p>
            </div>
          </div>
        </div>
      )}
      {...props}
    />
  );
}
