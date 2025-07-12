import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

interface SyncResult {
  success: boolean;
  mode: string;
  timestamp: string;
  results: {
    artist: { updated: boolean; data: any };
    songs: { synced: number; errors: number };
    shows: { synced: number; errors: number };
    venues: { synced: number; errors: number };
    setlists: { synced: number; errors: number };
    stats: { calculated: boolean };
  };
}

interface SyncProgress {
  artistId: string;
  artistName: string;
  status: 'pending' | 'in-progress' | 'completed' | 'failed';
  startedAt: string;
  updatedAt: string;
  completedAt?: string;
  error?: string;
  progress: {
    currentStep: string;
    totalSteps: number;
    completedSteps: number;
    details: {
      songs: { synced: number; errors: number; total?: number };
      shows: { synced: number; errors: number; total?: number };
      venues: { synced: number; errors: number; total?: number };
      setlists: { synced: number; errors: number; total?: number };
    };
  };
}

export function useArtistSync() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [result, setResult] = useState<SyncResult | null>(null);
  const [progress, setProgress] = useState<SyncProgress | null>(null);
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(
    null
  );

  // Clean up polling on unmount
  useEffect(() => {
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
        setPollingInterval(null);
      }
    };
  }, [pollingInterval]);

  const startProgressPolling = useCallback(
    (artistId: string) => {
      // Clear any existing polling
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }

      // Poll for progress updates every 1 second
      const interval = setInterval(async () => {
        try {
          const response = await fetch(
            `/api/sync/progress?artistId=${artistId}`
          );
          if (response.ok) {
            const data = await response.json();
            if (data.success && data.progress) {
              setProgress(data.progress);

              // Stop polling if sync is completed or failed
              if (
                data.progress.status === 'completed' ||
                data.progress.status === 'failed'
              ) {
                clearInterval(interval);
                setPollingInterval(null);
              }
            }
          }
        } catch (_error) {}
      }, 1000);

      setPollingInterval(interval);
    },
    [pollingInterval]
  );

  const syncArtist = useCallback(
    async (artistId: string) => {
      setIsLoading(true);
      setError(null);
      setProgress(null);

      try {
        // Start polling for progress
        startProgressPolling(artistId);

        // Get CSRF token if needed
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };

        if (process.env["NODE_ENV"] !== 'development') {
          try {
            const csrfResponse = await fetch('/api/csrf-token');
            if (csrfResponse.ok) {
              const csrfData = await csrfResponse.json();
              headers['x-csrf-token'] = csrfData.token;
            }
          } catch {
            // Ignore CSRF token errors in development
          }
        }

        const response = await fetch('/api/sync/unified-pipeline', {
          method: 'POST',
          headers,
          body: JSON.stringify({ artistId, mode: 'single' }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Sync failed');
        }

        const data: SyncResult = await response.json();
        setResult(data);

        // Show success message with details
        const totalSynced =
          data.results.songs.synced +
          data.results.shows.synced +
          data.results.venues.synced +
          data.results.setlists.synced;

        if (totalSynced > 0) {
          toast.success(
            `Artist data synchronized successfully! Synced ${data.results.shows.synced} shows, ${data.results.songs.synced} songs, and ${data.results.setlists.synced} setlists.`
          );
        } else {
          toast.info('Artist data is already up to date');
        }

        return data;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Unknown error');
        setError(error);
        toast.error(`Sync failed: ${error.message}`);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [startProgressPolling]
  );

  const syncBulkArtists = useCallback(async (artistIds: string[]) => {
    setIsLoading(true);
    setError(null);

    try {
      // Get CSRF token if needed
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (process.env["NODE_ENV"] !== 'development') {
        try {
          const csrfResponse = await fetch('/api/csrf-token');
          if (csrfResponse.ok) {
            const csrfData = await csrfResponse.json();
            headers['x-csrf-token'] = csrfData.token;
          }
        } catch {
          // Ignore CSRF token errors in development
        }
      }

      const response = await fetch('/api/sync/unified-pipeline', {
        method: 'POST',
        headers,
        body: JSON.stringify({ artistIds, mode: 'bulk' }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Bulk sync failed');
      }

      const data: SyncResult = await response.json();
      setResult(data);

      toast.success(`Bulk sync completed for ${artistIds.length} artists`);
      return data;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      toast.error(`Bulk sync failed: ${error.message}`);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearProgress = useCallback(async (artistId: string) => {
    try {
      await fetch(`/api/sync/progress?artistId=${artistId}`, {
        method: 'DELETE',
      });
      setProgress(null);
    } catch (_error) {}
  }, []);

  return {
    syncArtist,
    syncBulkArtists,
    clearProgress,
    isLoading,
    error,
    result,
    progress,
  };
}
