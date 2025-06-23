'use client';

import { Cloud, CloudOff, RefreshCw } from 'lucide-react';
import { Button } from '@repo/design-system/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@repo/design-system/components/ui/tooltip';
import { useOffline } from '@/hooks/use-offline';

export function SyncStatus() {
  const { isOffline, queueCount, syncNow } = useOffline();

  if (!isOffline && queueCount === 0) {
    return null;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={isOffline ? undefined : syncNow}
            disabled={isOffline}
            className="relative"
          >
            {isOffline ? (
              <CloudOff className="h-4 w-4 text-muted-foreground" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            {queueCount > 0 && (
              <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary text-[10px] font-bold text-primary-foreground flex items-center justify-center">
                {queueCount}
              </span>
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>
            {isOffline
              ? `${queueCount} actions waiting to sync`
              : `Click to sync ${queueCount} pending actions`}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}