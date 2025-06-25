'use client';

import { useState, useEffect } from 'react';
import { Badge } from '@repo/design-system/components/ui/badge';
import { cn } from '@repo/design-system/lib/utils';
import { Radio, Pause, Calendar } from 'lucide-react';
import { formatDistanceToNow, isFuture, isPast, isToday } from 'date-fns';

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
  className 
}: LiveShowIndicatorProps) {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(timer);
  }, []);

  // Determine show status based on date and time
  const getShowStatus = () => {
    if (showStatus === 'cancelled') return 'cancelled';
    if (showStatus === 'completed') return 'completed';
    if (showStatus === 'live') return 'live';

    const now = currentTime;
    const showTime = new Date(showDate);
    const showEndTime = new Date(showTime.getTime() + 3 * 60 * 60 * 1000); // Assume 3-hour show

    if (isFuture(showTime)) {
      return 'upcoming';
    } else if (isPast(showEndTime)) {
      return 'completed';
    } else {
      return 'live';
    }
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
    if (status !== 'live') return null;
    
    return (
      <div className={cn('relative', className)}>
        <span className="relative flex h-3 w-3">
          <span className={cn(
            'animate-ping absolute inline-flex h-full w-full rounded-full opacity-75',
            config.pulseColor
          )} />
          <span className={cn(
            'relative inline-flex rounded-full h-3 w-3',
            config.pulseColor
          )} />
        </span>
      </div>
    );
  }

  if (variant === 'detailed') {
    return (
      <div className={cn(
        'flex items-center gap-3 p-3 rounded-lg border',
        config.bgColor,
        config.borderColor,
        className
      )}>
        <div className="relative">
          <Icon className={cn('h-5 w-5', config.color)} />
          {status === 'live' && (
            <span className="absolute -top-1 -right-1 flex h-2 w-2">
              <span className={cn(
                'animate-ping absolute inline-flex h-full w-full rounded-full opacity-75',
                config.pulseColor
              )} />
              <span className={cn(
                'relative inline-flex rounded-full h-2 w-2',
                config.pulseColor
              )} />
            </span>
          )}
        </div>
        <div>
          <p className={cn('text-sm font-semibold', config.color)}>
            {config.label}
          </p>
          {status === 'live' && (
            <p className="text-xs text-muted-foreground">
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
      className={cn(
        'gap-1.5',
        status === 'live' && 'animate-pulse',
        className
      )}
    >
      <Icon className="h-3 w-3" />
      {status === 'live' && (
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
        </span>
      )}
      <span className="font-medium">{config.label}</span>
    </Badge>
  );
}