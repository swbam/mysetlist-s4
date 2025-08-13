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
import { AlertCircle, CheckCircle, Loader2, RefreshCw } from "lucide-react";
import * as React from "react";
import { useCallback, useEffect, useState } from "react";

interface ImportStatus {
  stage: string;
  percentage: number;
  message: string;
  isComplete: boolean;
  hasError?: boolean;
  errorMessage?: string;
}

interface ImportProgressProps {
  artistId: string;
  onComplete?: (status: ImportStatus) => void;
  onError?: (error: string) => void;
  className?: string;
  showTitle?: boolean;
  pollInterval?: number;
  maxAttempts?: number;
}

export function ImportProgress({
  artistId,
  onComplete,
  onError,
  className,
  showTitle = true,
  pollInterval = 2000, // 2 seconds
  maxAttempts = 150, // 5 minutes total (150 * 2s)
}: ImportProgressProps) {
  const [status, setStatus] = useState<ImportStatus | null>(null);
  const [isPolling, setIsPolling] = useState(true);
  const [attempts, setAttempts] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Fetch import status
  const fetchStatus = useCallback(async () => {
    try {
      const response = await fetch(`/api/artists/${artistId}/import-status`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch import status");
      }

      const data: ImportStatus = await response.json();
      setStatus(data);
      setError(null);

      // Check if import is complete or has error
      if (data.isComplete) {
        setIsPolling(false);
        onComplete?.(data);
      } else if (data.hasError) {
        setIsPolling(false);
        const errorMsg = data.errorMessage || "Import failed";
        setError(errorMsg);
        onError?.(errorMsg);
      }

      return data;
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : "Failed to fetch status";
      console.error("Import status fetch error:", err);
      setError(errorMsg);
      return null;
    }
  }, [artistId, onComplete, onError]);

  // Polling effect
  useEffect(() => {
    if (!isPolling || !artistId) return;

    const poll = async () => {
      if (attempts >= maxAttempts) {
        setIsPolling(false);
        const timeoutMsg =
          "Import is taking longer than expected. Please refresh the page or contact support.";
        setError(timeoutMsg);
        onError?.(timeoutMsg);
        return;
      }

      await fetchStatus();
      setAttempts((prev) => prev + 1);
    };

    // Initial fetch
    poll();

    // Set up polling
    const interval = setInterval(poll, pollInterval);

    return () => clearInterval(interval);
  }, [isPolling, artistId, attempts, maxAttempts, pollInterval, fetchStatus]);

  // Retry function
  const handleRetry = useCallback(() => {
    setError(null);
    setAttempts(0);
    setIsPolling(true);
  }, []);

  // Stop polling
  const handleStop = useCallback(() => {
    setIsPolling(false);
  }, []);

  if (!status && !error) {
    return (
      <Card className={cn("w-full", className)}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center space-x-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm text-muted-foreground">
              Checking import status...
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("w-full", className)}>
      {showTitle && (
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center space-x-2">
            {status?.isComplete ? (
              <CheckCircle className="h-5 w-5 text-green-500" />
            ) : error ? (
              <AlertCircle className="h-5 w-5 text-red-500" />
            ) : (
              <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
            )}
            <span>
              {status?.isComplete
                ? "Import Complete"
                : error
                  ? "Import Error"
                  : "Importing Artist Data"}
            </span>
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
          status && (
            <div className="space-y-4">
              {/* Stage and Status */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Badge
                    variant={status.isComplete ? "default" : "secondary"}
                    className="text-xs"
                  >
                    {status.stage}
                  </Badge>
                  <span className="text-sm font-medium">
                    {status.percentage}%
                  </span>
                </div>

                {isPolling && !status.isComplete && (
                  <Button
                    onClick={handleStop}
                    size="sm"
                    variant="ghost"
                    className="text-xs"
                  >
                    Stop
                  </Button>
                )}
              </div>

              {/* Progress Bar */}
              <div className="space-y-2">
                <Progress
                  value={status.percentage}
                  className="h-2"
                  style={{
                    transition: "all 0.3s ease-in-out",
                  }}
                />

                {/* Message */}
                <p className="text-sm text-muted-foreground">
                  {status.message}
                </p>
              </div>

              {/* Additional Info */}
              {status.isComplete && (
                <div className="rounded-md bg-green-50 border border-green-200 p-4">
                  <div className="flex items-start space-x-3">
                    <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-green-800">
                        Import Successful
                      </h4>
                      <p className="text-sm text-green-700 mt-1">
                        Artist data has been successfully imported and is ready
                        for use.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Polling indicator */}
              {isPolling && !status.isComplete && (
                <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                  <div className="flex space-x-1">
                    <div
                      className="w-1 h-1 bg-current rounded-full animate-pulse"
                      style={{ animationDelay: "0ms" }}
                    />
                    <div
                      className="w-1 h-1 bg-current rounded-full animate-pulse"
                      style={{ animationDelay: "150ms" }}
                    />
                    <div
                      className="w-1 h-1 bg-current rounded-full animate-pulse"
                      style={{ animationDelay: "300ms" }}
                    />
                  </div>
                  <span>Checking for updates...</span>
                </div>
              )}
            </div>
          )
        )}
      </CardContent>
    </Card>
  );
}
