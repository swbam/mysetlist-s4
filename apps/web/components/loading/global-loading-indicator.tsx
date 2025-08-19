"use client";

import { useEffect, useState } from "react";
import { useLoading } from "./loading-manager";
import { Progress } from "@repo/design-system/components/ui/progress";
import { cn } from "@repo/design-system/lib/utils";

interface GlobalLoadingIndicatorProps {
  className?: string;
  showProgress?: boolean;
  delay?: number;
}

export function GlobalLoadingIndicator({ 
  className,
  showProgress = true,
  delay = 200
}: GlobalLoadingIndicatorProps) {
  const { isAnyLoading } = useLoading();
  const [showLoading, setShowLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    let intervalId: NodeJS.Timeout;

    if (isAnyLoading()) {
      // Show loading after delay to prevent flashing
      timeoutId = setTimeout(() => {
        setShowLoading(true);
        
        if (showProgress) {
          // Simulate progress
          let currentProgress = 0;
          intervalId = setInterval(() => {
            currentProgress += Math.random() * 10;
            if (currentProgress > 90) {
              currentProgress = 90; // Don't complete until actually done
            }
            setProgress(currentProgress);
          }, 200);
        }
      }, delay);
    } else {
      // Hide loading immediately when done
      setShowLoading(false);
      setProgress(100);
      
      // Reset progress after animation
      setTimeout(() => setProgress(0), 300);
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      if (intervalId) clearInterval(intervalId);
    };
  }, [isAnyLoading, showProgress, delay]);

  if (!showLoading && !isAnyLoading()) {
    return null;
  }

  return (
    <div
      className={cn(
        "fixed top-0 left-0 right-0 z-50 h-1",
        className
      )}
    >
      {showProgress ? (
        <Progress 
          value={progress} 
          className="h-full border-none bg-transparent"
        />
      ) : (
        <div className="h-full bg-primary animate-pulse" />
      )}
    </div>
  );
}