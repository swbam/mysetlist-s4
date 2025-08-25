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
  // Ensure CSRF cookie exists before auto-import
  useCSRFToken();
  useAutoImportOnMount({
    ...(artistId && { artistId }),
    ...(artistName && { artistName }),
    ...(spotifyId && { spotifyId }),
    enabled,
  });

  useEffect(() => {
    // no-op; hook triggers import on mount
  }, []);

  return null;
}
