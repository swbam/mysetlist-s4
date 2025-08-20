"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ImportProgressData } from "~/components/import/ImportProgress";

export interface ArtistImportOptions {
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
  /** Auto-start import when artistId is provided */
  autoStart?: boolean;
}

export interface ArtistImportState {
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
  /** Whether currently importing */
  isImporting: boolean;
  /** Current retry count */
  retryCount: number;
}

export interface ArtistImportActions {
  /** Start import for an artist */
  startImport: (artistId: string) => Promise<void>;
  /** Start monitoring existing import progress */
  startMonitoring: (artistId: string) => void;
  /** Stop monitoring progress */
  stopMonitoring: () => void;
  /** Manual retry function */
  retry: () => void;
  /** Disconnect function */
  disconnect: () => void;
}

export interface UseArtistImportReturn extends ArtistImportState, ArtistImportActions {}

export function useArtistImport(
  initialArtistId?: string,
  options: ArtistImportOptions = {}
): UseArtistImportReturn {
  const {
    autoRetry = true,
    maxRetries = 3,
    fallbackToPolling = true,
    pollingInterval = 2000,
    showEstimatedTime = true,
    autoStart = false,
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
  const [isImporting, setIsImporting] = useState(false);

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

    console.log("[useArtistImport] Starting fallback polling");
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
            setIsImporting(false);
          }
        }
      } catch (err) {
        console.error("[useArtistImport] Polling failed:", err);
        // Don't set error state for polling failures, just continue trying
      }
    }, pollingInterval);
  }, [pollingInterval, updateEstimatedTime]);

  // Setup SSE connection
  const setupSSE = useCallback((id: string) => {
    if (eventSourceRef.current) return;

    console.log("[useArtistImport] Setting up SSE connection for:", id);
    setConnectionStatus("connecting");
    setError(null);

    const eventSource = new EventSource(`/api/artists/${id}/stream`);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      console.log("[useArtistImport] SSE connection opened");
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
        console.log("[useArtistImport] Progress update:", data);
        
        setProgress(data);
        updateEstimatedTime(data);

        // Handle completion
        if (data.stage === "completed" || data.stage === "failed") {
          eventSource.close();
          setConnectionStatus("closed");
          setIsImporting(false);
        }
      } catch (err) {
        console.error("[useArtistImport] Failed to parse SSE data:", err);
      }
    };

    eventSource.onerror = (event) => {
      console.error("[useArtistImport] SSE connection error:", event);
      setConnectionStatus("error");
      eventSource.close();

      // Retry logic with exponential backoff
      if (autoRetry && retryCount < maxRetries) {
        const delay = Math.pow(2, retryCount) * 1000;
        console.log(`[useArtistImport] Retrying SSE connection in ${delay}ms (attempt ${retryCount + 1})`);

        retryTimeoutRef.current = setTimeout(() => {
          setRetryCount(prev => prev + 1);
          eventSourceRef.current = null;
          setupSSE(id);
        }, delay);
      } else if (fallbackToPolling) {
        console.log("[useArtistImport] SSE failed, falling back to polling");
        startPolling(id);
      } else {
        setError("Connection lost and retries exhausted");
        setIsImporting(false);
      }
    };
  }, [autoRetry, maxRetries, retryCount, fallbackToPolling, startPolling, updateEstimatedTime]);

  // Start import function
  const startImport = useCallback(async (id: string) => {
    if (isImporting) {
      console.log("[useArtistImport] Import already in progress");
      return;
    }

    try {
      setIsImporting(true);
      setError(null);
      setProgress(null);
      setArtistId(id);

      // Start monitoring immediately
      setupSSE(id);

      // Note: The SSE route already triggers the import, so we don't need a separate API call
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Failed to start import";
      console.error("[useArtistImport] Import start failed:", err);
      setError(errorMsg);
      setIsImporting(false);
    }
  }, [isImporting, setupSSE]);

  // Start monitoring function (without triggering import)
  const startMonitoring = useCallback((id: string) => {
    if (artistId === id && connectionStatus === "connected") return;
    
    cleanup();
    setArtistId(id);
    setProgress(null);
    setError(null);
    setRetryCount(0);
    setIsImporting(true);
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
    setIsImporting(false);
  }, [cleanup]);

  // Manual retry function
  const retry = useCallback(() => {
    if (!artistId) return;
    
    cleanup();
    setError(null);
    setProgress(null);
    setRetryCount(0);
    setConnectionStatus("closed");
    
    setTimeout(() => {
      setIsImporting(true);
      setupSSE(artistId);
    }, 1000);
  }, [artistId, cleanup, setupSSE]);

  // Disconnect function
  const disconnect = useCallback(() => {
    cleanup();
    setConnectionStatus("closed");
    setIsImporting(false);
  }, [cleanup]);

  // Effect to auto-start monitoring/import when artistId changes
  useEffect(() => {
    if (artistId && connectionStatus === "closed") {
      if (autoStart) {
        setIsImporting(true);
      }
      setupSSE(artistId);
    }
  }, [artistId, connectionStatus, autoStart, setupSSE]);

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  return {
    // State
    progress,
    connectionStatus,
    error,
    estimatedTimeRemaining,
    isComplete,
    hasFailed,
    isImporting,
    retryCount,
    
    // Actions
    startImport,
    startMonitoring,
    stopMonitoring,
    retry,
    disconnect,
  };
}