"use client";

import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import { Card, CardContent } from "@repo/design-system/components/ui/card";
import { Separator } from "@repo/design-system/components/ui/separator";
import { cn } from "@repo/design-system/lib/utils";
import {
  CheckCircle,
  Clock,
  Database,
  Loader2,
  MapPin,
  Music,
  RefreshCw,
  Wifi,
  WifiOff,
  X,
  Zap,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ImportProgress } from "./ImportProgress";
import { useImportProgress } from "~/hooks/useImportProgress";

interface ImportProgressWrapperProps {
  artistId: string;
  artistName: string;
  initialImportStatus?: string | null;
  children: React.ReactNode;
  className?: string;
}

const STAGE_LABELS = {
  initializing: "Setting up import...",
  identity: "Creating artist profile...",
  shows: "Loading shows & venues...",
  catalog: "Building song catalog...",
  completed: "Import complete!",
  failed: "Import failed",
} as const;

export function ImportProgressWrapper({
  artistId,
  artistName,
  initialImportStatus,
  children,
  className,
}: ImportProgressWrapperProps) {
  const router = useRouter();
  const [showCompactView, setShowCompactView] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  const {
    progress,
    connectionStatus,
    error,
    estimatedTimeRemaining,
    isComplete,
    hasFailed,
    retry,
    startMonitoring,
    stopMonitoring,
  } = useImportProgress();

  // Start monitoring if artist has import status
  useEffect(() => {
    if (
      initialImportStatus &&
      initialImportStatus !== "completed" &&
      initialImportStatus !== "failed"
    ) {
      startMonitoring(artistId);
    }
  }, [artistId, initialImportStatus, startMonitoring]);

  // Handle completion - refresh the page to show new data
  const handleComplete = useCallback(() => {
    setTimeout(() => {
      router.refresh();
    }, 2000);
  }, [router]);

  // Handle dismissal
  const handleDismiss = useCallback(() => {
    setIsDismissed(true);
    stopMonitoring();
  }, [stopMonitoring]);

  // Handle retry
  const handleRetry = useCallback(() => {
    setIsDismissed(false);
    retry();
  }, [retry]);

  // Format time remaining
  const formatTimeRemaining = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  // Don't show anything if dismissed or no import in progress
  if (isDismissed || (!progress && !error && !initialImportStatus)) {
    return (
      <div className={className}>
        {children}
      </div>
    );
  }

  // Show import progress if in progress
  const showProgress = progress && !isComplete && !hasFailed;
  const showCompleted = isComplete;
  const showFailed = hasFailed || error;

  return (
    <div className={className}>
      {/* Fixed position notification for import progress */}
      {(showProgress || showCompleted || showFailed) && (
        <div className="fixed top-20 right-4 z-50 w-80">
          <Card className="border shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-2">
                  {showProgress && (
                    <>
                      <div className="relative">
                        <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                      </div>
                      <span className="text-sm font-medium">Importing...</span>
                    </>
                  )}
                  {showCompleted && (
                    <>
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span className="text-sm font-medium text-green-700">Complete!</span>
                    </>
                  )}
                  {showFailed && (
                    <>
                      <X className="h-4 w-4 text-red-500" />
                      <span className="text-sm font-medium text-red-700">Failed</span>
                    </>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  {/* Connection status */}
                  {connectionStatus === "connected" && (
                    <Badge variant="outline" className="text-xs">
                      <Zap className="h-3 w-3 mr-1" />
                      Live
                    </Badge>
                  )}
                  
                  {/* Dismiss button */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleDismiss}
                    className="h-6 w-6 p-0"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>

              {showProgress && progress && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">
                      {STAGE_LABELS[progress.stage as keyof typeof STAGE_LABELS] || progress.stage}
                    </span>
                    <div className="flex items-center space-x-2">
                      <span>{Math.round(progress.progress)}%</span>
                      {estimatedTimeRemaining && estimatedTimeRemaining > 0 && (
                        <span className="text-muted-foreground flex items-center">
                          <Clock className="h-3 w-3 mr-1" />
                          {formatTimeRemaining(estimatedTimeRemaining)}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${progress.progress}%` }}
                    />
                  </div>

                  {progress.message && (
                    <p className="text-xs text-muted-foreground">
                      {progress.message}
                    </p>
                  )}

                  {/* Stage-specific indicators */}
                  <div className="flex items-center justify-center space-x-4 text-xs">
                    <div className={cn(
                      "flex items-center space-x-1",
                      progress.stage === "identity" ? "text-purple-600" : "text-muted-foreground"
                    )}>
                      <Database className="h-3 w-3" />
                      <span>Identity</span>
                    </div>
                    <div className={cn(
                      "flex items-center space-x-1",
                      progress.stage === "shows" ? "text-orange-600" : "text-muted-foreground"
                    )}>
                      <MapPin className="h-3 w-3" />
                      <span>Shows</span>
                    </div>
                    <div className={cn(
                      "flex items-center space-x-1",
                      progress.stage === "catalog" ? "text-green-600" : "text-muted-foreground"
                    )}>
                      <Music className="h-3 w-3" />
                      <span>Catalog</span>
                    </div>
                  </div>
                </div>
              )}

              {showCompleted && progress?.metadata?.stats && (
                <div className="space-y-2">
                  <p className="text-xs text-green-600">
                    {artistName} has been successfully imported!
                  </p>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex space-x-3">
                      {progress.metadata.stats.songsImported && (
                        <span>{progress.metadata.stats.songsImported} songs</span>
                      )}
                      {progress.metadata.stats.showsImported && (
                        <span>{progress.metadata.stats.showsImported} shows</span>
                      )}
                      {progress.metadata.stats.venuesImported && (
                        <span>{progress.metadata.stats.venuesImported} venues</span>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Page will refresh automatically...
                  </p>
                </div>
              )}

              {showFailed && (
                <div className="space-y-2">
                  <p className="text-xs text-red-600">
                    {error || "Something went wrong during import"}
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleRetry}
                    className="w-full text-xs h-7"
                  >
                    <RefreshCw className="h-3 w-3 mr-2" />
                    Try Again
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Connection status indicator */}
      {connectionStatus !== "closed" && (
        <div className="fixed top-4 right-4 z-40">
          <Badge
            variant={connectionStatus === "connected" ? "default" : "destructive"}
            className="flex items-center gap-1 text-xs"
          >
            {connectionStatus === "connected" ? (
              <>
                <Wifi className="h-3 w-3" />
                Connected
              </>
            ) : connectionStatus === "connecting" ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <WifiOff className="h-3 w-3" />
                Disconnected
              </>
            )}
          </Badge>
        </div>
      )}

      {/* Full-width progress bar for active imports */}
      {showProgress && progress && (
        <div className="container mx-auto pt-6 pb-4">
          <Card className="border-blue-200 bg-blue-50/50">
            <CardContent className="p-4">
              <ImportProgress
                artistId={artistId}
                onComplete={handleComplete}
                compact
                className="border-0 bg-transparent shadow-none"
              />
            </CardContent>
          </Card>
          <Separator className="mt-6" />
        </div>
      )}

      {children}
    </div>
  );
}