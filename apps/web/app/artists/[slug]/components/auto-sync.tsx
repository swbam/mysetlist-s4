"use client";

import { useEffect } from "react";
import { useAutoImportOnMount } from "~/hooks/use-artist-auto-import";
import { useCSRFToken } from "~/hooks/use-csrf-token";

type AutoSyncProps = {
  artistId?: string;
  artistName?: string;
  spotifyId?: string;
  enabled?: boolean;
};

export function AutoSyncOnEmptyShows({
  artistId,
  artistName,
  spotifyId,
  enabled = true,
}: AutoSyncProps) {
  // Only auto-import if we have proper identifiers (spotifyId)
  // Don't auto-import based on artistName alone to avoid API errors
  // artistId is the database UUID, not an external identifier
  const shouldAutoImport = enabled && Boolean(spotifyId);
  
  // Ensure CSRF cookie exists before auto-import
  useCSRFToken();
  const { loading, error } = useAutoImportOnMount({
    artistId,
    artistName: shouldAutoImport ? artistName : undefined,
    spotifyId,
    enabled: shouldAutoImport,
  });

  useEffect(() => {
    // no-op; hook triggers import on mount
  }, []);

  return null;
}
