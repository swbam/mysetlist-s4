"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ImportProgressData } from "~/components/import/ImportProgress";

export interface UseImportProgressOptions {
  /** Enable automatic retries on connection failure */
  autoRetry?: boolean;
  /** Maximum number of retry attempts */
  maxRetries?: number;
  /** Fallback to polling if SSE fails */
  fallbackToPolling?: boolean;
  /** Polling interval in milliseconds */
  pollingInterval?: number;
  /** Enable estimated time calculation */
  showEstimatedTime?: boolean;
}

export interface UseImportProgressReturn {
  /** Current progress data */
  progress: ImportProgressData | null;
  /** Connection status */
  connectionStatus: "connecting" | "connected" | "error" | "closed";
  /** Current error message if any */
  error: string | null;
  /** Estimated time remaining in seconds */
  estimatedTimeRemaining: number | null;
  /** Whether the import is complete */
  isComplete: boolean;
  /** Whether the import has failed */
  hasFailed: boolean;
  /** Current retry count */
  retryCount: number;
  /** Manual retry function */
  retry: () => void;
  /** Disconnect function */
  disconnect: () => void;
  /** Start monitoring progress for an artist */
  startMonitoring: (artistId: string) => void;
  /** Stop monitoring progress */
  stopMonitoring: () => void;
}

export function useImportProgress(
  initialArtistId?: string,
  options: UseImportProgressOptions = {}
): UseImportProgressReturn {
  const {
    autoRetry = true,
    maxRetries = 3,
    fallbackToPolling = true,
    pollingInterval = 2000,
    showEstimatedTime = true,
  } = options;

  // State
  const [artistId, setArtistId] = useState<string | undefined>(initialArtistId);
  const [progress, setProgress] = useState<ImportProgressData | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<
    "connecting" | "connected" | "error" | "closed"
  >("closed");
  const [error, setError] = useState<string | null>(null);
  const [estimatedTimeRemaining, setEstimatedTimeRemaining] = useState<number | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [startTime, setStartTime] = useState<Date | null>(null);

  // Refs
  const eventSourceRef = useRef<EventSource | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Computed values
  const isComplete = progress?.stage === "completed";
  const hasFailed = progress?.stage === "failed" || !!error;

  // Calculate estimated time remaining
  const updateEstimatedTime = useCallback((progressData: ImportProgressData) => {
    if (!showEstimatedTime || !startTime || progressData.stage === "completed" || progressData.stage === "failed" || progressData.progress >= 100) {
      setEstimatedTimeRemaining(null);
      return;
    }

    const elapsed = Date.now() - startTime.getTime();
    const progressValue = Math.max(progressData.progress, 1);
    const estimatedTotal = (elapsed / progressValue) * 100;
    const remaining = Math.max(0, estimatedTotal - elapsed);

    setEstimatedTimeRemaining(Math.floor(remaining / 1000));
  }, [showEstimatedTime, startTime]);

  // Cleanup function
  const cleanup = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
  }, []);

  // Polling fallback
  const startPolling = useCallback((id: string) => {
    if (pollingIntervalRef.current) return;

    console.log("[useImportProgress] Starting fallback polling");
    setConnectionStatus("connected"); // Show as connected in polling mode

    pollingIntervalRef.current = setInterval(async () => {
      try {
        const response = await fetch(`/api/artists/${id}/status`);
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

        setProgress(progressData);
        updateEstimatedTime(progressData);

        // Stop polling when complete or failed
        if (progressData.stage === "completed" || progressData.stage === "failed") {
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
            setConnectionStatus("closed");
          }
        }
      } catch (err) {
        console.error("[useImportProgress] Polling failed:", err);
        // Don't set error state for polling failures, just continue trying
      }
    }, pollingInterval);
  }, [pollingInterval, updateEstimatedTime]);

  // Setup SSE connection
  const setupSSE = useCallback((id: string) => {
    if (eventSourceRef.current) return;

    console.log("[useImportProgress] Setting up SSE connection for:", id);
    setConnectionStatus("connecting");
    setError(null);

    const eventSource = new EventSource(`/api/artists/${id}/stream`);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      console.log("[useImportProgress] SSE connection opened");
      setConnectionStatus("connected");
      setError(null);
      setRetryCount(0);
      setStartTime(new Date());
      
      // Stop polling if it was running
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };

    eventSource.onmessage = (event) => {
      try {
        const data: ImportProgressData = JSON.parse(event.data);
        console.log("[useImportProgress] Progress update:", data);
        
        setProgress(data);
        updateEstimatedTime(data);

        // Handle completion
        if (data.stage === "completed" || data.stage === "failed") {
          eventSource.close();
          setConnectionStatus("closed");
        }
      } catch (err) {
        console.error("[useImportProgress] Failed to parse SSE data:", err);
      }
    };

    eventSource.onerror = (event) => {
      console.error("[useImportProgress] SSE connection error:", event);
      setConnectionStatus("error");
      eventSource.close();

      // Retry logic with exponential backoff
      if (autoRetry && retryCount < maxRetries) {
        const delay = Math.pow(2, retryCount) * 1000;
        console.log(`[useImportProgress] Retrying SSE connection in ${delay}ms (attempt ${retryCount + 1})`);

        retryTimeoutRef.current = setTimeout(() => {
          setRetryCount(prev => prev + 1);
          eventSourceRef.current = null;
          setupSSE(id);
        }, delay);
      } else if (fallbackToPolling) {
        console.log("[useImportProgress] SSE failed, falling back to polling");
        startPolling(id);
      } else {
        setError("Connection lost and retries exhausted");
      }
    };
  }, [autoRetry, maxRetries, retryCount, fallbackToPolling, startPolling, updateEstimatedTime]);

  // Manual retry function
  const retry = useCallback(() => {
    if (!artistId) return;
    
    cleanup();
    setError(null);
    setProgress(null);
    setRetryCount(0);
    setConnectionStatus("closed");
    
    setTimeout(() => setupSSE(artistId), 1000);
  }, [artistId, cleanup, setupSSE]);

  // Disconnect function
  const disconnect = useCallback(() => {
    cleanup();
    setConnectionStatus("closed");
  }, [cleanup]);

  // Start monitoring function
  const startMonitoring = useCallback((id: string) => {
    if (artistId === id && connectionStatus === "connected") return;
    
    cleanup();
    setArtistId(id);
    setProgress(null);
    setError(null);
    setRetryCount(0);
    setupSSE(id);
  }, [artistId, connectionStatus, cleanup, setupSSE]);

  // Stop monitoring function
  const stopMonitoring = useCallback(() => {
    cleanup();
    setArtistId(undefined);
    setProgress(null);
    setError(null);
    setRetryCount(0);
    setConnectionStatus("closed");
  }, [cleanup]);

  // Effect to start monitoring when artistId changes
  useEffect(() => {
    if (artistId && connectionStatus === "closed") {
      setupSSE(artistId);
    }
  }, [artistId, connectionStatus, setupSSE]);

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  return {
    progress,
    connectionStatus,
    error,
    estimatedTimeRemaining,
    isComplete,
    hasFailed,
    retryCount,
    retry,
    disconnect,
    startMonitoring,
    stopMonitoring,
  };
}