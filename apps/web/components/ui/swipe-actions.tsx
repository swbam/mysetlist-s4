'use client';

import { cn } from '@repo/design-system/lib/utils';
import type React from 'react';
import { useEffect, useRef, useState } from 'react';

interface SwipeAction {
  id: string;
  label: string;
  icon?: React.ReactNode;
  color?: 'primary' | 'secondary' | 'destructive' | 'success';
  onAction: () => void;
}

interface SwipeActionsProps {
  children: React.ReactNode;
  leftActions?: SwipeAction[];
  rightActions?: SwipeAction[];
  threshold?: number;
  disabled?: boolean;
  className?: string;
}

export function SwipeActions({
  children,
  leftActions = [],
  rightActions = [],
  threshold = 100,
  disabled = false,
  className,
}: SwipeActionsProps) {
  const [swipeDistance, setSwipeDistance] = useState(0);
  const [isSwipeActive, setIsSwipeActive] = useState(false);
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(
    null
  );
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number>();

  const colorClasses = {
    primary: 'bg-primary text-primary-foreground',
    secondary: 'bg-secondary text-secondary-foreground',
    destructive: 'bg-destructive text-destructive-foreground',
    success: 'bg-green-600 text-white',
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (disabled) return;
    const touch = e.touches[0];
    setTouchStart({ x: touch.clientX, y: touch.clientY });
    setIsSwipeActive(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStart || !isSwipeActive || disabled) return;

    const touch = e.touches[0];
    const deltaX = touch.clientX - touchStart.x;
    const deltaY = Math.abs(touch.clientY - touchStart.y);

    // Prevent swipe if vertical movement is too significant (scrolling)
    if (deltaY > 30) {
      setIsSwipeActive(false);
      return;
    }

    // Limit swipe distance based on available actions
    const maxLeft = leftActions.length > 0 ? threshold * leftActions.length : 0;
    const maxRight =
      rightActions.length > 0 ? threshold * rightActions.length : 0;

    const clampedDistance = Math.max(-maxRight, Math.min(maxLeft, deltaX));
    setSwipeDistance(clampedDistance);

    // Prevent default to avoid scrolling
    if (Math.abs(deltaX) > 10) {
      e.preventDefault();
    }
  };

  const handleTouchEnd = () => {
    if (!isSwipeActive || disabled) return;

    setIsSwipeActive(false);

    // Check if swipe threshold was reached
    if (Math.abs(swipeDistance) >= threshold) {
      const actions = swipeDistance > 0 ? leftActions : rightActions;
      const actionIndex = Math.floor(Math.abs(swipeDistance) / threshold) - 1;

      if (actions[actionIndex]) {
        actions[actionIndex].onAction();
      }
    }

    // Animate back to center
    const startDistance = swipeDistance;
    const startTime = Date.now();
    const duration = 200;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);

      const currentDistance = startDistance * (1 - easeOut);
      setSwipeDistance(currentDistance);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setSwipeDistance(0);
      }
    };

    animationRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  const renderActions = (actions: SwipeAction[], side: 'left' | 'right') => {
    if (actions.length === 0) return null;

    const isVisible = side === 'left' ? swipeDistance > 0 : swipeDistance < 0;
    const opacity = Math.min(Math.abs(swipeDistance) / threshold, 1);

    return (
      <div
        className={cn(
          'absolute top-0 bottom-0 flex items-center',
          side === 'left' ? 'left-0' : 'right-0',
          'transition-opacity duration-100'
        )}
        style={{
          opacity: isVisible ? opacity : 0,
          width: Math.abs(swipeDistance),
        }}
      >
        {actions.map((action, index) => (
          <div
            key={action.id}
            className={cn(
              'flex flex-col items-center justify-center',
              'h-full min-w-[80px] px-4',
              colorClasses[action.color || 'primary'],
              'font-medium text-sm'
            )}
            style={{
              width: threshold,
              transform: `translateX(${side === 'right' ? -index * threshold : index * threshold}px)`,
            }}
          >
            {action.icon && <div className="mb-1">{action.icon}</div>}
            <span className="text-xs">{action.label}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div
      ref={containerRef}
      className={cn('relative overflow-hidden', className)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {renderActions(leftActions, 'left')}
      {renderActions(rightActions, 'right')}

      <div
        className="relative z-10 transition-transform duration-100"
        style={{
          transform: `translateX(${swipeDistance}px)`,
        }}
      >
        {children}
      </div>
    </div>
  );
}
