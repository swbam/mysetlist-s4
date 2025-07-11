'use client';

import { Badge } from '@repo/design-system/components/ui/badge';
import { cn } from '@repo/design-system/lib/utils';
import { formatDistanceToNow, isFuture, isPast, isToday } from 'date-fns';
import { Calendar, Pause, Radio } from 'lucide-react';

interface LiveShowIndicatorProps {
  showDate: Date;
  showStatus?: 'scheduled' | 'live' | 'completed' | 'cancelled';
  variant?: 'default' | 'minimal' | 'detailed';
  className?: string;
}

export function LiveShowIndicator({
  showDate,
  showStatus = 'scheduled',
  variant = 'default',
  className,
}: LiveShowIndicatorProps) {
  // Removed unused currentTime state

  // Determine show status based on date and time
  const getShowStatus = () => {
    if (showStatus === 'cancelled') {
      return 'cancelled';
    }
    if (showStatus === 'completed') {
      return 'completed';
    }
    if (showStatus === 'live') {
      return 'live';
    }

    const showTime = new Date(showDate);
    const showEndTime = new Date(showTime.getTime() + 3 * 60 * 60 * 1000); // Assume 3-hour show

    if (isFuture(showTime)) {
      return 'upcoming';
    }
    if (isPast(showEndTime)) {
      return 'completed';
    }
    return 'live';
  };

  const status = getShowStatus();

  const statusConfig = {
    live: {
      icon: Radio,
      label: 'LIVE NOW',
      color: 'text-red-600',
      bgColor: 'bg-red-50 dark:bg-red-950',
      borderColor: 'border-red-200 dark:border-red-800',
      pulseColor: 'bg-red-500',
    },
    upcoming: {
      icon: Calendar,
      label: isToday(showDate)
        ? `Today at ${new Date(showDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
        : `In ${formatDistanceToNow(showDate)}`,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50 dark:bg-blue-950',
      borderColor: 'border-blue-200 dark:border-blue-800',
    },
    completed: {
      icon: Pause,
      label: 'Show ended',
      color: 'text-gray-600',
      bgColor: 'bg-gray-50 dark:bg-gray-950',
      borderColor: 'border-gray-200 dark:border-gray-800',
    },
    cancelled: {
      icon: Pause,
      label: 'Cancelled',
      color: 'text-gray-600',
      bgColor: 'bg-gray-50 dark:bg-gray-950',
      borderColor: 'border-gray-200 dark:border-gray-800',
    },
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  if (variant === 'minimal') {
    if (status !== 'live') {
      return null;
    }

    return (
      <div className={cn('relative', className)}>
        <span className="relative flex h-3 w-3">
          <span
            className={cn(
              'absolute inline-flex h-full w-full animate-ping rounded-full opacity-75',
              (config as any).pulseColor || ''
            )}
          />
          <span
            className={cn(
              'relative inline-flex h-3 w-3 rounded-full',
              (config as any).pulseColor || ''
            )}
          />
        </span>
      </div>
    );
  }

  if (variant === 'detailed') {
    return (
      <div
        className={cn(
          'flex items-center gap-3 rounded-lg border p-3',
          config.bgColor,
          config.borderColor,
          className
        )}
      >
        <div className="relative">
          <Icon className={cn('h-5 w-5', config.color)} />
          {status === 'live' && (
            <span className="-top-1 -right-1 absolute flex h-2 w-2">
              <span
                className={cn(
                  'absolute inline-flex h-full w-full animate-ping rounded-full opacity-75',
                  (config as any).pulseColor || ''
                )}
              />
              <span
                className={cn(
                  'relative inline-flex h-2 w-2 rounded-full',
                  (config as any).pulseColor || ''
                )}
              />
            </span>
          )}
        </div>
        <div>
          <p className={cn('font-semibold text-sm', config.color)}>
            {config.label}
          </p>
          {status === 'live' && (
            <p className="text-muted-foreground text-xs">
              Started {formatDistanceToNow(showDate, { addSuffix: true })}
            </p>
          )}
        </div>
      </div>
    );
  }

  // Default variant
  return (
    <Badge
      variant={status === 'live' ? 'destructive' : 'outline'}
      className={cn('gap-1.5', status === 'live' && 'animate-pulse', className)}
    >
      <Icon className="h-3 w-3" />
      {status === 'live' && (
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
        </span>
      )}
      <span className="font-medium">{config.label}</span>
    </Badge>
  );
}
