import { useCallback, useEffect, useState } from "react";
import { useCSRFToken } from "~/hooks/use-csrf-token";

interface AutoImportResult {
  success: boolean;
  artist?: {
    id: string;
    name: string;
    slug: string;
    spotifyId?: string;
    tmAttractionId?: string;
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
  const { fetchWithCSRF } = useCSRFToken();

  const importArtist = useCallback(
    async (params: {
      artistId?: string;
      artistName?: string;
      spotifyId?: string;
    }): Promise<AutoImportResult> => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetchWithCSRF("/api/artists/auto-import", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(params),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to import artist data");
        }

        const result = await response.json();
        return result;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "An error occurred";
        setError(errorMessage);
        return {
          success: false,
          error: errorMessage,
        };
      } finally {
        setLoading(false);
      }
    },
    [],
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
    if (
      params.enabled !== false &&
      !hasImported &&
      (params.artistId || params.artistName || params.spotifyId)
    ) {
      setHasImported(true);
      importArtist(params);
    }
  }, [
    params.artistId,
    params.artistName,
    params.spotifyId,
    params.enabled,
    hasImported,
    importArtist,
  ]);

  return { loading, error };
}
