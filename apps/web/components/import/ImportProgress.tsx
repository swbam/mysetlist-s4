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
  Database,
  Loader2,
  MapPin,
  Music,
  RefreshCw,
  Users,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

export interface ImportProgressData {
  stage: 
    | "initializing"
    | "identity" 
    | "shows"
    | "catalog"
    | "completed"
    | "failed";
  progress: number;
  message: string;
  at: string;
  error?: string;
  phaseTimings?: Record<string, number>;
  metadata?: {
    stats?: {
      songsImported?: number;
      showsImported?: number;
      venuesImported?: number;
    };
  };
}

interface ImportProgressProps {
  artistId: string;
  onComplete?: (data: ImportProgressData) => void;
  onError?: (error: string) => void;
  className?: string;
  showTitle?: boolean;
  showEstimatedTime?: boolean;
  autoRetry?: boolean;
  compact?: boolean;
}

// Stage configurations for better UX
const STAGE_CONFIG = {
  initializing: {
    label: "Initializing",
    description: "Setting up the import process...",
    icon: <Loader2 className="h-4 w-4 animate-spin" />,
    color: "text-blue-500",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
  },
  identity: {
    label: "Identity Phase",
    description: "Creating artist record and fetching basic information...",
    icon: <Database className="h-4 w-4 animate-pulse" />,
    color: "text-purple-500",
    bgColor: "bg-purple-50",
    borderColor: "border-purple-200",
  },
  shows: {
    label: "Shows & Venues",
    description: "Importing shows and venue information from Ticketmaster...",
    icon: <MapPin className="h-4 w-4 animate-pulse" />,
    color: "text-orange-500",
    bgColor: "bg-orange-50",
    borderColor: "border-orange-200",
  },
  catalog: {
    label: "Song Catalog",
    description: "Importing studio-only tracks from Spotify (filtering out live versions)...",
    icon: <Music className="h-4 w-4 animate-pulse" />,
    color: "text-green-500",
    bgColor: "bg-green-50",
    borderColor: "border-green-200",
  },
  completed: {
    label: "Import Complete!",
    description: "All artist data has been successfully imported",
    icon: <CheckCircle className="h-4 w-4 text-green-500" />,
    color: "text-green-500",
    bgColor: "bg-green-50",
    borderColor: "border-green-200",
  },
  failed: {
    label: "Import Failed",
    description: "An error occurred during the import process",
    icon: <AlertCircle className="h-4 w-4 text-red-500" />,
    color: "text-red-500",
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
  },
} as const;

export function ImportProgress({
  artistId,
  onComplete,
  onError,
  className,
  showTitle = true,
  showEstimatedTime = true,
  autoRetry = true,
  compact = false,
}: ImportProgressProps) {
  const [progressData, setProgressData] = useState<ImportProgressData | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<
    "connecting" | "connected" | "error" | "closed"
  >("connecting");
  const [error, setError] = useState<string | null>(null);
  const [estimatedTimeRemaining, setEstimatedTimeRemaining] = useState<number | null>(null);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const eventSourceRef = useRef<EventSource | null>(null);
  const fallbackIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Calculate estimated time remaining
  const updateEstimatedTime = useCallback((data: ImportProgressData) => {
    if (!startTime || data.stage === "completed" || data.stage === "failed" || data.progress >= 100) {
      setEstimatedTimeRemaining(null);
      return;
    }

    const elapsed = Date.now() - startTime.getTime();
    const progress = Math.max(data.progress, 1);
    const estimatedTotal = (elapsed / progress) * 100;
    const remaining = Math.max(0, estimatedTotal - elapsed);

    setEstimatedTimeRemaining(Math.floor(remaining / 1000));
  }, [startTime]);

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

    console.log("[ImportProgress] Starting fallback polling");
    fallbackIntervalRef.current = setInterval(async () => {
      try {
        const response = await fetch(`/api/artists/${artistId}/status`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const data = await response.json();
        const progressData: ImportProgressData = {
          stage: data.stage === "initializing" ? "identity" : data.stage,
          progress: data.progress || data.percentage || 0,
          message: data.message,
          at: data.updatedAt || new Date().toISOString(),
          error: data.error,
          metadata: data.metadata,
        };

        setProgressData(progressData);
        updateEstimatedTime(progressData);

        if (progressData.stage === "completed" || progressData.stage === "failed") {
          if (fallbackIntervalRef.current) {
            clearInterval(fallbackIntervalRef.current);
            fallbackIntervalRef.current = null;
          }

          if (progressData.stage === "completed") {
            onComplete?.(progressData);
          } else if (progressData.stage === "failed") {
            onError?.(progressData.error || "Import failed");
          }
        }
      } catch (err) {
        console.error("[ImportProgress] Polling failed:", err);
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

    console.log("[ImportProgress] Setting up SSE connection");
    setConnectionStatus("connecting");

    const eventSource = new EventSource(`/api/artists/${artistId}/stream`);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      console.log("[ImportProgress] SSE connection opened");
      setConnectionStatus("connected");
      setError(null);
      setRetryCount(0);
      setStartTime(new Date());
      stopPolling();
    };

    eventSource.onmessage = (event) => {
      try {
        const data: ImportProgressData = JSON.parse(event.data);
        console.log("[ImportProgress] Progress update:", data);
        
        setProgressData(data);
        updateEstimatedTime(data);

        // Handle completion
        if (data.stage === "completed") {
          eventSource.close();
          onComplete?.(data);
        } else if (data.stage === "failed") {
          eventSource.close();
          setError(data.error || "Import failed");
          onError?.(data.error || "Import failed");
        }
      } catch (err) {
        console.error("[ImportProgress] Failed to parse SSE data:", err);
      }
    };

    eventSource.onerror = (event) => {
      console.error("[ImportProgress] SSE connection error:", event);
      setConnectionStatus("error");
      eventSource.close();

      // Retry logic with exponential backoff
      if (autoRetry && retryCount < 3) {
        const delay = Math.pow(2, retryCount) * 1000;
        console.log(`[ImportProgress] Retrying SSE connection in ${delay}ms`);

        retryTimeoutRef.current = setTimeout(() => {
          setRetryCount(prev => prev + 1);
          eventSourceRef.current = null;
          setupSSE();
        }, delay);
      } else {
        console.log("[ImportProgress] SSE failed, falling back to polling");
        startPolling();
      }
    };

    return eventSource;
  }, [artistId, onComplete, onError, updateEstimatedTime, startPolling, stopPolling, autoRetry, retryCount]);

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
    setRetryCount(0);
    setTimeout(setupSSE, 1000);
  }, [cleanup, setupSSE]);

  // Loading state
  if (!progressData && !error && connectionStatus === "connecting") {
    return (
      <Card className={cn("w-full", compact ? "p-4" : "", className)}>
        <CardContent className={cn(compact ? "p-3" : "p-6")}>
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
  const stageConfig = STAGE_CONFIG[currentStage] || STAGE_CONFIG['initializing'];

  if (compact) {
    return (
      <div className={cn("space-y-2", className)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {stageConfig.icon}
            <span className="text-sm font-medium">{stageConfig.label}</span>
            {connectionStatus === "connected" && (
              <Badge variant="outline" className="text-xs">
                <Zap className="h-3 w-3 mr-1" />
                Live
              </Badge>
            )}
          </div>
          <span className="text-xs text-muted-foreground">
            {Math.round(progressData?.progress || 0)}%
          </span>
        </div>
        
        <Progress
          value={progressData?.progress || 0}
          className="h-2 transition-all duration-300"
        />
        
        {progressData?.message && (
          <p className="text-xs text-muted-foreground">{progressData.message}</p>
        )}
        
        {error && (
          <div className="flex items-center justify-between text-xs text-red-600">
            <span>{error}</span>
            <Button size="sm" variant="outline" onClick={handleRetry}>
              Retry
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <Card className={cn("w-full", className)}>
      {showTitle && (
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {stageConfig.icon}
              <span>
                {progressData?.stage === "completed"
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
              {connectionStatus === "error" && (
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
            <div className={cn("rounded-md p-4", stageConfig.bgColor, stageConfig.borderColor, "border")}>
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
        ) : progressData ? (
          <div className="space-y-4">
            {/* Stage and Status */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Badge
                  variant={progressData.stage === "completed" ? "default" : "secondary"}
                  className="text-xs"
                >
                  {stageConfig.label}
                </Badge>
                <span className="text-sm font-medium">
                  {Math.round(progressData.progress)}%
                </span>
              </div>

              {/* Estimated time remaining */}
              {showEstimatedTime &&
                estimatedTimeRemaining &&
                estimatedTimeRemaining > 0 &&
                progressData.stage !== "completed" && (
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

            {/* Stage-specific information */}
            <div className={cn("rounded-md p-3", stageConfig.bgColor, stageConfig.borderColor, "border")}>
              <div className="flex items-center space-x-2 text-sm">
                {stageConfig.icon}
                <div>
                  <p className={cn("font-medium", stageConfig.color)}>
                    {stageConfig.label}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {stageConfig.description}
                  </p>
                </div>
              </div>
            </div>

            {/* Completion state with stats */}
            {progressData.stage === "completed" && (
              <div className="rounded-md bg-green-50 border border-green-200 p-4">
                <div className="flex items-start space-x-3">
                  <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-green-800">
                      Import Successful!
                    </h4>
                    <p className="text-sm text-green-700 mt-1">
                      Artist data has been successfully imported and is ready for use.
                    </p>
                    
                    {progressData.metadata?.stats && (
                      <div className="mt-3 grid grid-cols-3 gap-4 text-center">
                        {progressData.metadata.stats.songsImported && (
                          <div className="flex flex-col">
                            <span className="text-lg font-bold text-green-700">
                              {progressData.metadata.stats.songsImported}
                            </span>
                            <span className="text-xs text-green-600">Studio Songs</span>
                          </div>
                        )}
                        {progressData.metadata.stats.showsImported && (
                          <div className="flex flex-col">
                            <span className="text-lg font-bold text-green-700">
                              {progressData.metadata.stats.showsImported}
                            </span>
                            <span className="text-xs text-green-600">Shows</span>
                          </div>
                        )}
                        {progressData.metadata.stats.venuesImported && (
                          <div className="flex flex-col">
                            <span className="text-lg font-bold text-green-700">
                              {progressData.metadata.stats.venuesImported}
                            </span>
                            <span className="text-xs text-green-600">Venues</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Real-time indicator */}
            {connectionStatus === "connected" &&
              progressData.stage !== "completed" &&
              progressData.stage !== "failed" && (
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
                  <span>Real-time updates active</span>
                </div>
              )}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}