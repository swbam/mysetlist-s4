"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@repo/design-system/tooltip";
import { formatDistanceToNow } from "date-fns";
import { Clock } from "lucide-react";
import { useEffect, useState } from "react";

interface CachedIndicatorProps {
  cacheKey: string;
  className?: string;
}

export function CachedIndicator({ cacheKey, className }: CachedIndicatorProps) {
  const [cachedAt, setCachedAt] = useState<Date | null>(null);

  useEffect(() => {
    // Check if data is from cache
    const checkCache = async () => {
      if ("caches" in window) {
        try {
          const cache = await caches.open("TheSet-v1");
          const response = await cache.match(cacheKey);

          if (response) {
            const date = response.headers.get("date");
            if (date) {
              setCachedAt(new Date(date));
            }
          }
        } catch (_error) {}
      }
    };

    checkCache();
  }, [cacheKey]);

  if (!cachedAt) {
    return null;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={`flex items-center gap-1 text-muted-foreground text-xs ${className}`}
          >
            <Clock className="h-3 w-3" />
            <span>Cached</span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>Cached {formatDistanceToNow(cachedAt, { addSuffix: true })}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
