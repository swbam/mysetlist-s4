"use client";

import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import { Progress } from "@repo/design-system/components/ui/progress";
import { cn } from "@repo/design-system/lib/utils";
import {
  AlertCircle,
  CheckCircle,
  Clock,
  Loader2,
  RefreshCw,
  Zap,
} from "lucide-react";
import type * as React from "react";
import { useCallback, useEffect, useRef, useState } from "react";

interface ImportProgressData {
  stage: string;
  progress: number;
  message: string;
  timestamp: string;
  artistId: string;
  isComplete: boolean;
  hasError?: boolean;
  errorMessage?: string;
  startedAt?: string;
  completedAt?: string;
  totalSongs?: number;
  totalShows?: number;
  totalVenues?: number;
}

interface ImportProgressSSEProps {
  artistId: string;
  onComplete?: (data: ImportProgressData) => void;
  onError?: (error: string) => void;
  className?: string;
  showTitle?: boolean;
  showEstimatedTime?: boolean;
  fallbackToPolling?: boolean;
}

// Stage descriptions for better UX
const STAGE_DESCRIPTIONS: Record<
  string,
  { label: string; icon: React.ReactNode }
> = {
  initializing: {
    label: "Getting started",
    icon: <Loader2 className="h-4 w-4 animate-spin" />,
  },
  "syncing-identifiers": {
    label: "Finding artist details",
    icon: <Loader2 className="h-4 w-4 animate-spin" />,
  },
  "importing-songs": {
    label: "Building song catalog",
    icon: <Loader2 className="h-4 w-4 animate-spin" />,
  },
  "importing-shows": {
    label: "Loading upcoming shows",
    icon: <Loader2 className="h-4 w-4 animate-spin" />,
  },
  "creating-setlists": {
    label: "Creating initial setlists",
    icon: <Loader2 className="h-4 w-4 animate-spin" />,
  },
  completed: {
    label: "Import complete!",
    icon: <CheckCircle className="h-4 w-4 text-green-500" />,
  },
  failed: {
    label: "Import failed",
    icon: <AlertCircle className="h-4 w-4 text-red-500" />,
  },
};

export function ImportProgressSSE({
  artistId,
  onComplete,
  onError,
  className,
  showTitle = true,
  showEstimatedTime = true,
  fallbackToPolling = true,
}: ImportProgressSSEProps) {
  const [progressData, setProgressData] = useState<ImportProgressData | null>(
    null,
  );
  const [connectionStatus, setConnectionStatus] = useState<
    "connecting" | "connected" | "error" | "closed"
  >("connecting");
  const [error, setError] = useState<string | null>(null);
  const [estimatedTimeRemaining, setEstimatedTimeRemaining] = useState<
    number | null
  >(null);
  const [startTime, setStartTime] = useState<Date | null>(null);

  const eventSourceRef = useRef<EventSource | null>(null);
  const fallbackIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const retryCount = useRef(0);

  // Calculate estimated time remaining
  const updateEstimatedTime = useCallback(
    (data: ImportProgressData) => {
      if (
        !startTime ||
        data.isComplete ||
        data.hasError ||
        data.progress >= 100
      ) {
        setEstimatedTimeRemaining(null);
        return;
      }

      const elapsed = Date.now() - startTime.getTime();
      const progress = Math.max(data.progress, 1); // Avoid division by zero
      const estimatedTotal = (elapsed / progress) * 100;
      const remaining = Math.max(0, estimatedTotal - elapsed);

      setEstimatedTimeRemaining(Math.floor(remaining / 1000));
    },
    [startTime],
  );

  // Format time remaining
  const formatTimeRemaining = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  // Fallback polling function
  const startPolling = useCallback(() => {
    if (fallbackIntervalRef.current) return;

    console.log("ImportProgressSSE: Starting fallback polling");
    fallbackIntervalRef.current = setInterval(async () => {
      try {
        const response = await fetch(`/api/artists/${artistId}/import-status`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const data = await response.json();
        const progressData: ImportProgressData = {
          stage: data.stage,
          progress: data.progress || data.percentage || 0,
          message: data.message,
          timestamp: data.updatedAt || new Date().toISOString(),
          artistId: data.artistId || artistId,
          isComplete: data.isComplete || data.stage === "completed",
          hasError: data.hasError || data.stage === "failed",
          errorMessage: data.errorMessage || data.error,
          startedAt: data.startedAt,
          completedAt: data.completedAt,
        };

        setProgressData(progressData);
        updateEstimatedTime(progressData);

        if (progressData.isComplete || progressData.hasError) {
          if (fallbackIntervalRef.current) {
            clearInterval(fallbackIntervalRef.current);
            fallbackIntervalRef.current = null;
          }

          if (progressData.isComplete) {
            onComplete?.(progressData);
          } else if (progressData.hasError) {
            onError?.(progressData.errorMessage || "Import failed");
          }
        }
      } catch (err) {
        console.error("ImportProgressSSE: Polling failed:", err);
      }
    }, 2000);
  }, [artistId, onComplete, onError, updateEstimatedTime]);

  // Stop polling
  const stopPolling = useCallback(() => {
    if (fallbackIntervalRef.current) {
      clearInterval(fallbackIntervalRef.current);
      fallbackIntervalRef.current = null;
    }
  }, []);

  // Setup SSE connection
  const setupSSE = useCallback(() => {
    if (eventSourceRef.current) return;

    console.log("ImportProgressSSE: Setting up SSE connection");
    setConnectionStatus("connecting");

    const eventSource = new EventSource(
      `/api/artists/${artistId}/import-progress`,
    );
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      console.log("ImportProgressSSE: SSE connection opened");
      setConnectionStatus("connected");
      setError(null);
      retryCount.current = 0;
      stopPolling(); // Stop polling if SSE is working
    };

    eventSource.addEventListener("connected", (event) => {
      const data = JSON.parse(event.data);
      console.log("ImportProgressSSE: Connected to stream", data);
      setStartTime(new Date(data.timestamp));
    });

    eventSource.addEventListener("progress", (event) => {
      const data: ImportProgressData = JSON.parse(event.data);
      console.log("ImportProgressSSE: Progress update", data);
      setProgressData(data);
      updateEstimatedTime(data);
    });

    eventSource.addEventListener("complete", (event) => {
      const data: ImportProgressData = JSON.parse(event.data);
      console.log("ImportProgressSSE: Import completed", data);
      setProgressData(data);
      onComplete?.(data);
      eventSource.close();
    });

    eventSource.addEventListener("error", (event: MessageEvent) => {
      const data = JSON.parse(event.data);
      console.log("ImportProgressSSE: Import error", data);
      setError(data.message);
      onError?.(data.message);
      eventSource.close();
    });

    eventSource.onerror = (event) => {
      console.error("ImportProgressSSE: SSE connection error", event);
      setConnectionStatus("error");
      eventSource.close();

      // Retry logic with exponential backoff
      if (retryCount.current < 3) {
        const delay = 2 ** retryCount.current * 1000;
        console.log(`ImportProgressSSE: Retrying SSE connection in ${delay}ms`);

        retryTimeoutRef.current = setTimeout(() => {
          retryCount.current++;
          eventSourceRef.current = null;
          setupSSE();
        }, delay);
      } else if (fallbackToPolling) {
        console.log("ImportProgressSSE: SSE failed, falling back to polling");
        startPolling();
      }
    };

    return eventSource;
  }, [
    artistId,
    onComplete,
    onError,
    updateEstimatedTime,
    startPolling,
    stopPolling,
    fallbackToPolling,
  ]);

  // Cleanup function
  const cleanup = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    stopPolling();
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
  }, [stopPolling]);

  // Setup connection on mount
  useEffect(() => {
    setupSSE();
    return cleanup;
  }, [setupSSE, cleanup]);

  // Manual retry function
  const handleRetry = useCallback(() => {
    cleanup();
    setError(null);
    setProgressData(null);
    retryCount.current = 0;
    setTimeout(setupSSE, 1000);
  }, [cleanup, setupSSE]);

  // Loading state
  if (!progressData && !error && connectionStatus === "connecting") {
    return (
      <Card className={cn("w-full", className)}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center space-x-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm text-muted-foreground">
              Connecting to import stream...
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const currentStage = progressData?.stage || "initializing";
  const stageInfo =
    STAGE_DESCRIPTIONS[currentStage] || STAGE_DESCRIPTIONS['initializing'];

  return (
    <Card className={cn("w-full", className)}>
      {showTitle && (
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {stageInfo?.icon}
              <span>
                {progressData?.isComplete
                  ? "Import Complete"
                  : error
                    ? "Import Error"
                    : "Importing Artist Data"}
              </span>
            </div>

            {/* Connection status indicator */}
            <div className="flex items-center space-x-2">
              {connectionStatus === "connected" && (
                <Badge variant="outline" className="text-xs">
                  <Zap className="h-3 w-3 mr-1" />
                  Live
                </Badge>
              )}
              {connectionStatus === "error" && fallbackToPolling && (
                <Badge variant="secondary" className="text-xs">
                  Polling
                </Badge>
              )}
            </div>
          </CardTitle>
        </CardHeader>
      )}

      <CardContent className="space-y-4">
        {error ? (
          <div className="space-y-4">
            <div className="rounded-md bg-red-50 border border-red-200 p-4">
              <div className="flex items-start space-x-3">
                <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-red-800">
                    Import Failed
                  </h4>
                  <p className="text-sm text-red-700 mt-1">{error}</p>
                </div>
              </div>
            </div>

            <div className="flex space-x-2">
              <Button
                onClick={handleRetry}
                size="sm"
                variant="outline"
                className="flex items-center space-x-2"
              >
                <RefreshCw className="h-4 w-4" />
                <span>Retry</span>
              </Button>
            </div>
          </div>
        ) : (
          progressData && (
            <div className="space-y-4">
              {/* Stage and Status */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Badge
                    variant={progressData.isComplete ? "default" : "secondary"}
                    className="text-xs"
                  >
                    {stageInfo?.label}
                  </Badge>
                  <span className="text-sm font-medium">
                    {Math.round(progressData.progress)}%
                  </span>
                </div>

                {/* Estimated time remaining */}
                {showEstimatedTime &&
                  estimatedTimeRemaining &&
                  estimatedTimeRemaining > 0 && (
                    <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>{formatTimeRemaining(estimatedTimeRemaining)}</span>
                    </div>
                  )}
              </div>

              {/* Progress Bar */}
              <div className="space-y-2">
                <Progress
                  value={progressData.progress}
                  className="h-3 transition-all duration-500 ease-out"
                />

                {/* Message */}
                <p className="text-sm text-muted-foreground">
                  {progressData.message}
                </p>
              </div>

              {/* Completion state */}
              {progressData.isComplete && (
                <div className="rounded-md bg-green-50 border border-green-200 p-4">
                  <div className="flex items-start space-x-3">
                    <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-green-800">
                        Import Successful!
                      </h4>
                      <p className="text-sm text-green-700 mt-1">
                        Artist data has been successfully imported and is ready
                        for use.
                      </p>
                      {(progressData.totalSongs || progressData.totalShows) && (
                        <div className="mt-2 flex space-x-4 text-xs text-green-600">
                          {progressData.totalSongs && (
                            <span>{progressData.totalSongs} songs</span>
                          )}
                          {progressData.totalShows && (
                            <span>{progressData.totalShows} shows</span>
                          )}
                          {progressData.totalVenues && (
                            <span>{progressData.totalVenues} venues</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Real-time indicator */}
              {connectionStatus === "connected" &&
                !progressData.isComplete &&
                !progressData.hasError && (
                  <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                    <div className="flex space-x-1">
                      {[0, 150, 300].map((delay, i) => (
                        <div
                          key={i}
                          className="w-1 h-1 bg-current rounded-full animate-pulse"
                          style={{ animationDelay: `${delay}ms` }}
                        />
                      ))}
                    </div>
                    <span>Real-time updates</span>
                  </div>
                )}
            </div>
          )
        )}
      </CardContent>
    </Card>
  );
}
