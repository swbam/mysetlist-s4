'use client';

import { cn } from '@repo/design-system/lib/utils';
import { ChevronDown, RefreshCw } from 'lucide-react';
import type React from 'react';
import { useCallback, useRef, useState } from 'react';

interface PullToRefreshProps {
  children: React.ReactNode;
  onRefresh: () => Promise<void>;
  threshold?: number;
  disabled?: boolean;
  refreshText?: string;
  releaseText?: string;
  loadingText?: string;
}

export function PullToRefresh({
  children,
  onRefresh,
  threshold = 100,
  disabled = false,
  refreshText = 'Pull to refresh',
  releaseText = 'Release to refresh',
  loadingText = 'Refreshing...',
}: PullToRefreshProps) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (disabled || isRefreshing) return;

      // Only start pull-to-refresh if we're at the top of the page
      if (window.scrollY > 0) return;

      setTouchStart(e.touches[0].clientY);
      setIsPulling(true);
    },
    [disabled, isRefreshing]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!touchStart || !isPulling || disabled || isRefreshing) return;

      const currentY = e.touches[0].clientY;
      const deltaY = currentY - touchStart;

      // Only allow pulling down
      if (deltaY > 0 && window.scrollY === 0) {
        e.preventDefault();

        // Apply resistance to the pull
        const resistance = 0.5;
        const distance = Math.min(deltaY * resistance, threshold * 1.5);
        setPullDistance(distance);
      }
    },
    [touchStart, isPulling, disabled, isRefreshing, threshold]
  );

  const handleTouchEnd = useCallback(async () => {
    if (!isPulling || disabled || isRefreshing) return;

    setIsPulling(false);

    if (pullDistance >= threshold) {
      setIsRefreshing(true);

      try {
        await onRefresh();
      } catch (error) {
        console.error('Refresh failed:', error);
      } finally {
        setIsRefreshing(false);
      }
    }

    // Animate back to 0
    const startDistance = pullDistance;
    const startTime = Date.now();
    const duration = 300;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);

      const currentDistance = startDistance * (1 - easeOut);
      setPullDistance(currentDistance);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setPullDistance(0);
      }
    };

    requestAnimationFrame(animate);
  }, [isPulling, disabled, isRefreshing, pullDistance, threshold, onRefresh]);

  const getIndicatorText = () => {
    if (isRefreshing) return loadingText;
    if (pullDistance >= threshold) return releaseText;
    return refreshText;
  };

  const getIndicatorIcon = () => {
    if (isRefreshing) {
      return <RefreshCw className="h-5 w-5 animate-spin" />;
    }

    const rotation = Math.min((pullDistance / threshold) * 180, 180);
    return (
      <ChevronDown
        className="h-5 w-5 transition-transform duration-200"
        style={{ transform: `rotate(${rotation}deg)` }}
      />
    );
  };

  return (
    <div
      ref={containerRef}
      className="relative"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull indicator */}
      <div
        className={cn(
          'absolute top-0 right-0 left-0 z-50',
          'flex flex-col items-center justify-center',
          'bg-background/90 backdrop-blur-sm',
          'transition-all duration-200',
          pullDistance > 0 ? 'opacity-100' : 'opacity-0'
        )}
        style={{
          height: Math.max(pullDistance, 0),
          transform: `translateY(-${Math.max(0, threshold - pullDistance)}px)`,
        }}
      >
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          {getIndicatorIcon()}
          <span>{getIndicatorText()}</span>
        </div>
      </div>

      {/* Content */}
      <div
        className="transition-transform duration-200"
        style={{
          transform: `translateY(${Math.max(0, pullDistance)}px)`,
        }}
      >
        {children}
      </div>
    </div>
  );
}
