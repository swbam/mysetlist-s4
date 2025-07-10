'use client';

import { Card, CardContent } from '@repo/design-system/components/ui/card';
import { cn } from '@repo/design-system/lib/utils';
import { motion } from 'framer-motion';
import { useRef, useState } from 'react';
import { useTouchGestures } from '~/hooks/use-touch-gestures';

interface TouchCardProps {
  children: React.ReactNode;
  className?: string;
  onTap?: () => void;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onLongPress?: () => void;
  swipeActions?: {
    left?: {
      label: string;
      action: () => void;
      variant?: 'destructive' | 'default' | 'secondary';
      icon?: React.ReactNode;
    };
    right?: {
      label: string;
      action: () => void;
      variant?: 'destructive' | 'default' | 'secondary';
      icon?: React.ReactNode;
    };
  };
  disabled?: boolean;
  pressable?: boolean;
}

export function TouchCard({
  children,
  className,
  onTap,
  onSwipeLeft,
  onSwipeRight,
  onLongPress,
  swipeActions,
  disabled = false,
  pressable = true,
}: TouchCardProps) {
  const [isPressed, setIsPressed] = useState(false);
  const [isPressedLong, setIsPressedLong] = useState(false);
  const [_swipeDirection, setSwipeDirection] = useState<
    'left' | 'right' | null
  >(null);
  const [swipeDistance, setSwipeDistance] = useState(0);

  const cardRef = useRef<HTMLDivElement>(null);
  const longPressTimer = useRef<NodeJS.Timeout>();
  const touchStart = useRef<{ x: number; y: number; time: number } | null>(
    null
  );

  const handleTouchStart = (e: React.TouchEvent) => {
    if (disabled) {
      return;
    }

    const touch = e.touches[0];
    touchStart.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now(),
    };

    setIsPressed(true);

    // Start long press timer
    if (onLongPress) {
      longPressTimer.current = setTimeout(() => {
        setIsPressedLong(true);
        onLongPress();

        // Haptic feedback if available
        if ('vibrate' in navigator) {
          navigator.vibrate(50);
        }
      }, 500);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStart.current || disabled) {
      return;
    }

    const touch = e.touches[0];
    const deltaX = touch.clientX - touchStart.current.x;
    const deltaY = touch.clientY - touchStart.current.y;

    // Clear long press if moved too much
    if (
      (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10) &&
      longPressTimer.current
    ) {
      clearTimeout(longPressTimer.current);
    }

    // Handle horizontal swipe for actions
    if (swipeActions && Math.abs(deltaX) > Math.abs(deltaY)) {
      const maxSwipe = 120;
      const constrainedDistance = Math.max(
        -maxSwipe,
        Math.min(maxSwipe, deltaX)
      );

      setSwipeDistance(constrainedDistance);

      if (deltaX > 20) {
        setSwipeDirection('right');
      } else if (deltaX < -20) {
        setSwipeDirection('left');
      } else {
        setSwipeDirection(null);
      }

      // Prevent scrolling during horizontal swipe
      if (Math.abs(deltaX) > 20) {
        e.preventDefault();
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart.current || disabled) {
      return;
    }

    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchStart.current.x;
    const deltaY = touch.clientY - touchStart.current.y;
    const deltaTime = Date.now() - touchStart.current.time;

    // Clear long press timer
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
    }

    // Reset pressed state
    setIsPressed(false);
    setIsPressedLong(false);

    // Handle swipe actions
    if (swipeActions && Math.abs(deltaX) > 60) {
      if (deltaX > 0 && swipeActions.right && onSwipeRight) {
        onSwipeRight();
        swipeActions.right.action();
      } else if (deltaX < 0 && swipeActions.left && onSwipeLeft) {
        onSwipeLeft();
        swipeActions.left.action();
      }
    } else if (
      Math.abs(deltaX) < 10 &&
      Math.abs(deltaY) < 10 &&
      deltaTime < 300 &&
      onTap
    ) {
      // Handle tap
      onTap();
    }

    // Reset swipe state
    setSwipeDirection(null);
    setSwipeDistance(0);
    touchStart.current = null;
  };

  // Setup touch gestures hook for additional gesture support
  useTouchGestures(cardRef, {
    onSwipeLeft: () => {
      if (swipeActions?.left && onSwipeLeft) {
        onSwipeLeft();
      }
    },
    onSwipeRight: () => {
      if (swipeActions?.right && onSwipeRight) {
        onSwipeRight();
      }
    },
    threshold: 60,
  });

  return (
    <div className="relative overflow-hidden">
      {/* Swipe Action Backgrounds */}
      {swipeActions && (
        <>
          {/* Left swipe action (right side) */}
          {swipeActions.left && (
            <motion.div
              className={cn(
                'absolute top-0 right-0 flex h-full items-center px-4',
                swipeActions.left.variant === 'destructive' && 'bg-destructive',
                swipeActions.left.variant === 'secondary' && 'bg-secondary',
                (!swipeActions.left.variant ||
                  swipeActions.left.variant === 'default') &&
                  'bg-primary'
              )}
              style={{
                width: Math.max(0, -swipeDistance),
                opacity: Math.min(1, Math.abs(swipeDistance) / 60),
              }}
            >
              <div className="flex items-center gap-2 text-white">
                {swipeActions.left.icon}
                <span className="font-medium text-sm">
                  {swipeActions.left.label}
                </span>
              </div>
            </motion.div>
          )}

          {/* Right swipe action (left side) */}
          {swipeActions.right && (
            <motion.div
              className={cn(
                'absolute top-0 left-0 flex h-full items-center px-4',
                swipeActions.right.variant === 'destructive' &&
                  'bg-destructive',
                swipeActions.right.variant === 'secondary' && 'bg-secondary',
                (!swipeActions.right.variant ||
                  swipeActions.right.variant === 'default') &&
                  'bg-primary'
              )}
              style={{
                width: Math.max(0, swipeDistance),
                opacity: Math.min(1, swipeDistance / 60),
              }}
            >
              <div className="flex items-center gap-2 text-white">
                {swipeActions.right.icon}
                <span className="font-medium text-sm">
                  {swipeActions.right.label}
                </span>
              </div>
            </motion.div>
          )}
        </>
      )}

      {/* Main Card */}
      <motion.div
        ref={cardRef}
        className="relative"
        style={{
          x: swipeDistance,
        }}
        animate={{
          scale: isPressed && pressable ? 0.98 : 1,
          x: swipeDistance,
        }}
        transition={{
          type: 'spring',
          stiffness: 400,
          damping: 30,
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <Card
          className={cn(
            'relative transition-all duration-150',
            pressable && 'cursor-pointer select-none',
            isPressed && 'shadow-sm',
            isPressedLong && 'ring-2 ring-primary/50',
            disabled && 'cursor-not-allowed opacity-50',
            className
          )}
          style={{
            touchAction: swipeActions ? 'pan-y' : 'manipulation',
          }}
        >
          <CardContent className="p-0">{children}</CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
