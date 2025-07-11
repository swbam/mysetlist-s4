'use client';

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@repo/design-system/components/ui/tooltip';
import { cn } from '@repo/design-system/lib/utils';
import { AlertCircle, Wifi, WifiOff } from 'lucide-react';
import React, { useMemo } from 'react';
import { useRealtimeConnection } from '~/app/providers/realtime-provider';

export const RealtimeStatus = React.memo(function RealtimeStatus() {
  const { connectionStatus, isConnected } = useRealtimeConnection();

  const statusConfig = useMemo(() => ({
    connecting: {
      icon: Wifi,
      className: 'text-yellow-500 animate-pulse',
      label: 'Connecting...',
    },
    connected: {
      icon: Wifi,
      className: 'text-green-500',
      label: 'Live updates active',
    },
    disconnected: {
      icon: WifiOff,
      className: 'text-gray-400',
      label: 'Disconnected',
    },
    error: {
      icon: AlertCircle,
      className: 'text-red-500',
      label: 'Connection error',
    },
    disabled: {
      icon: WifiOff,
      className: 'text-gray-400',
      label: 'Disabled',
    },
  }), []);

  const config = statusConfig[connectionStatus];
  const Icon = config.icon;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              'flex items-center gap-1.5 rounded-full px-2 py-1 font-medium text-xs transition-all duration-300',
              isConnected ? 'bg-green-500/10' : 'bg-gray-500/10'
            )}
          >
            <Icon className={cn('h-3 w-3', config.className)} />
            <span className={cn('hidden sm:inline-block', config.className)}>
              {config.label}
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">
            {isConnected
              ? 'Real-time updates are active. Changes will appear instantly.'
              : 'Real-time updates are unavailable. Please refresh to see latest changes.'}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
});
