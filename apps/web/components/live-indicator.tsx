'use client';

import { cn } from '@repo/design-system/lib/utils';
import { Radio } from 'lucide-react';

interface LiveIndicatorProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showText?: boolean;
}

export function LiveIndicator({
  size = 'md',
  className,
  showText = true,
}: LiveIndicatorProps) {
  const sizeClasses = {
    sm: {
      container: 'px-2 py-0.5 text-xs gap-1',
      icon: 'h-2 w-2',
      pulse: 'h-2 w-2',
    },
    md: {
      container: 'px-3 py-1 text-sm gap-1.5',
      icon: 'h-3 w-3',
      pulse: 'h-3 w-3',
    },
    lg: {
      container: 'px-4 py-1.5 text-base gap-2',
      icon: 'h-4 w-4',
      pulse: 'h-4 w-4',
    },
  };

  const classes = sizeClasses[size];

  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full bg-red-500 font-medium text-white',
        classes.container,
        className
      )}
    >
      <div className="relative flex items-center justify-center">
        <Radio className={cn('relative z-10', classes.icon)} />
        <span
          className={cn(
            'absolute inline-flex animate-ping rounded-full bg-white opacity-75',
            classes.pulse
          )}
        />
      </div>
      {showText && <span>LIVE</span>}
    </div>
  );
}
