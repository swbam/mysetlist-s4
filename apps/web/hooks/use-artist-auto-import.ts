import { useCallback, useEffect, useState } from 'react';

interface AutoImportResult {
  success: boolean;
  artist?: {
    id: string;
    name: string;
    slug: string;
    spotifyId?: string;
    ticketmasterId?: string;
    imageUrl?: string;
    genres: string[];
    popularity: number;
    followers: number;
    verified: boolean;
  };
  stats?: {
    showCount: number;
    songCount: number;
    lastSyncedAt?: Date;
    syncTriggered: boolean;
  };
  error?: string;
}

export function useArtistAutoImport() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const importArtist = useCallback(
    async (params: {
      artistId?: string;
      artistName?: string;
      spotifyId?: string;
    }): Promise<AutoImportResult> => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch('/api/artists/auto-import', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(params),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to import artist data');
        }

        const result = await response.json();
        return result;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'An error occurred';
        setError(errorMessage);
        return {
          success: false,
          error: errorMessage,
        };
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return {
    importArtist,
    loading,
    error,
  };
}

// Helper hook for automatic import on component mount
export function useAutoImportOnMount(params: {
  artistId?: string;
  artistName?: string;
  spotifyId?: string;
  enabled?: boolean;
}) {
  const { importArtist, loading, error } = useArtistAutoImport();
  const [hasImported, setHasImported] = useState(false);

  useEffect(() => {
    // Only run once on mount when enabled
    let isMounted = true;
    
    if (
      params.enabled !== false &&
      !hasImported &&
      (params.artistId || params.artistName || params.spotifyId)
    ) {
      const runImport = async () => {
        if (!isMounted) return;
        setHasImported(true);
        await importArtist(params);
      };
      
      runImport();
    }
    
    return () => {
      isMounted = false;
    };
    // Only re-run if enabled state changes or on initial mount
    // Don't include importArtist in deps to avoid loops
  }, [params.enabled, hasImported]);

  return { loading, error };
}
