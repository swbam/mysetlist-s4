'use client';

import { useCallback, useEffect, useRef } from 'react';

interface TouchGestureOptions {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  onPullToRefresh?: () => Promise<void>;
  threshold?: number;
  pullThreshold?: number;
}

export function useTouchGestures(
  elementRef: React.RefObject<HTMLElement>,
  options: TouchGestureOptions
) {
  const {
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    onPullToRefresh,
    threshold = 50,
    pullThreshold = 80,
  } = options;

  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const pullStartRef = useRef<number | null>(null);
  const isPullingRef = useRef(false);

  const handleTouchStart = useCallback(
    (e: TouchEvent) => {
      touchStartRef.current = {
        x: e.touches[0]?.clientX ?? 0,
        y: e.touches[0]?.clientY ?? 0,
      };

      // Check if at top of page for pull to refresh
      if (window.scrollY === 0 && onPullToRefresh) {
        pullStartRef.current = e.touches[0]?.clientY ?? 0;
      }
    },
    [onPullToRefresh]
  );

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!touchStartRef.current) {
        return;
      }

      const currentY = e.touches[0]?.clientY ?? 0;

      // Handle pull to refresh
      if (pullStartRef.current !== null && onPullToRefresh) {
        const pullDistance = currentY - pullStartRef.current;

        if (pullDistance > 0 && window.scrollY === 0) {
          e.preventDefault();

          if (pullDistance > pullThreshold && !isPullingRef.current) {
            isPullingRef.current = true;

            // Show pull to refresh indicator
            const indicator = document.createElement('div');
            indicator.id = 'pull-to-refresh-indicator';
            indicator.className =
              'fixed top-0 left-0 right-0 h-16 bg-primary/10 flex items-center justify-center z-50';
            indicator.innerHTML =
              '<div class="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full"></div>';
            document.body.appendChild(indicator);
          }
        }
      }
    },
    [onPullToRefresh, pullThreshold]
  );

  const handleTouchEnd = useCallback(
    async (e: TouchEvent) => {
      if (!touchStartRef.current) {
        return;
      }

      const touchEnd = {
        x: e.changedTouches[0]?.clientX ?? 0,
        y: e.changedTouches[0]?.clientY ?? 0,
      };

      const deltaX = touchEnd.x - touchStartRef.current.x;
      const deltaY = touchEnd.y - touchStartRef.current.y;

      // Handle pull to refresh
      if (isPullingRef.current && onPullToRefresh) {
        isPullingRef.current = false;

        // Remove indicator
        const indicator = document.getElementById('pull-to-refresh-indicator');
        if (indicator) {
          indicator.remove();
        }

        // Execute refresh
        await onPullToRefresh();

        pullStartRef.current = null;
        touchStartRef.current = null;
        return;
      }

      // Determine swipe direction
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        // Horizontal swipe
        if (Math.abs(deltaX) > threshold) {
          if (deltaX > 0 && onSwipeRight) {
            onSwipeRight();
          } else if (deltaX < 0 && onSwipeLeft) {
            onSwipeLeft();
          }
        }
      } else {
        // Vertical swipe
        if (Math.abs(deltaY) > threshold) {
          if (deltaY > 0 && onSwipeDown) {
            onSwipeDown();
          } else if (deltaY < 0 && onSwipeUp) {
            onSwipeUp();
          }
        }
      }

      touchStartRef.current = null;
      pullStartRef.current = null;
    },
    [
      onSwipeLeft,
      onSwipeRight,
      onSwipeUp,
      onSwipeDown,
      onPullToRefresh,
      threshold,
    ]
  );

  useEffect(() => {
    const element = elementRef.current;
    if (!element) {
      return;
    }

    element.addEventListener('touchstart', handleTouchStart, { passive: true });
    element.addEventListener('touchmove', handleTouchMove, { passive: false });
    element.addEventListener('touchend', handleTouchEnd);

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);
}
