'use client';

import { useRealtimeConnection } from '@/app/providers/realtime-provider';
import { cn } from '@repo/design-system/lib/utils';
import { Wifi, WifiOff, AlertCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@repo/design-system/components/ui/tooltip';
import { motion, AnimatePresence } from 'framer-motion';

interface RealtimeConnectionIndicatorProps {
  variant?: 'default' | 'minimal' | 'detailed';
  className?: string;
  showLabel?: boolean;
}

export function RealtimeConnectionIndicator({ 
  variant = 'default',
  className,
  showLabel = true 
}: RealtimeConnectionIndicatorProps) {
  const { connectionStatus, isConnected } = useRealtimeConnection();

  const statusConfig = {
    connecting: {
      icon: Wifi,
      className: 'text-yellow-500 animate-pulse',
      label: 'Connecting...',
      bgClass: 'bg-yellow-500/10',
    },
    connected: {
      icon: Wifi,
      className: 'text-green-500',
      label: 'Live',
      bgClass: 'bg-green-500/10',
    },
    disconnected: {
      icon: WifiOff,
      className: 'text-gray-400',
      label: 'Offline',
      bgClass: 'bg-gray-500/10',
    },
    error: {
      icon: AlertCircle,
      className: 'text-red-500',
      label: 'Error',
      bgClass: 'bg-red-500/10',
    },
  };

  const config = statusConfig[connectionStatus];
  const Icon = config.icon;

  if (variant === 'minimal') {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={cn('relative', className)}>
              <Icon className={cn('h-4 w-4', config.className)} />
              {isConnected && (
                <span className="absolute -top-1 -right-1 h-2 w-2 bg-green-500 rounded-full animate-pulse" />
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-xs">
              {isConnected 
                ? 'Real-time updates are active'
                : 'Real-time updates are unavailable'}
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  if (variant === 'detailed') {
    return (
      <AnimatePresence mode="wait">
        <motion.div
          key={connectionStatus}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          className={cn(
            'flex items-center gap-2 px-3 py-2 rounded-lg',
            config.bgClass,
            className
          )}
        >
          <Icon className={cn('h-5 w-5', config.className)} />
          <div className="flex flex-col">
            <span className={cn('text-sm font-medium', config.className)}>
              {config.label}
            </span>
            <span className="text-xs text-muted-foreground">
              {isConnected 
                ? 'Updates appear instantly'
                : 'Refresh for latest changes'}
            </span>
          </div>
        </motion.div>
      </AnimatePresence>
    );
  }

  // Default variant
  return (
    <div className={cn(
      'flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium transition-all duration-300',
      config.bgClass,
      className
    )}>
      <Icon className={cn('h-3 w-3', config.className)} />
      {showLabel && (
        <span className={cn(
          'hidden sm:inline-block',
          config.className
        )}>
          {config.label}
        </span>
      )}
    </div>
  );
}