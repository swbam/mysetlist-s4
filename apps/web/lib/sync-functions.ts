export interface SyncArtistParams {
  spotifyId?: string;
  artistName?: string;
  forceSync?: boolean;
}

export interface SyncShowsParams {
  artistName?: string;
  artistId?: string;
  city?: string;
  dateRange?: {
    start: string;
    end: string;
  };
}

export interface SyncSetlistParams {
  setlistId?: string;
  showId?: string;
  artistName?: string;
  date?: string;
}

/**
 * Get the app URL for API calls
 */
function getAppUrl() {
  if (typeof window !== "undefined") {
    // Client-side
    return "";
  }
  // Server-side
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001";
}

/**
 * Sync artist data from Spotify
 */
export async function syncArtist(params: SyncArtistParams) {
  const response = await fetch(`${getAppUrl()}/api/sync/artists`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to sync artist: ${error}`);
  }

  return response.json();
}

/**
 * Sync shows/concerts from Ticketmaster
 */
export async function syncShows(params: SyncShowsParams) {
  const response = await fetch(`${getAppUrl()}/api/sync/shows`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to sync shows: ${error}`);
  }

  return response.json();
}

/**
 * Sync setlist from Setlist.fm
 */
export async function syncSetlist(params: SyncSetlistParams) {
  const response = await fetch(`${getAppUrl()}/api/sync/setlists`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to sync setlist: ${error}`);
  }

  return response.json();
}

/**
 * Trigger a manual sync for all data types
 */
export async function triggerManualSync(
  type: "all" | "artists" | "shows" | "setlists" = "all",
  limit = 10,
) {
  const response = await fetch(`${getAppUrl()}/api/cron/master-sync`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ type, limit, mode: "manual" }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to trigger sync: ${error}`);
  }

  return response.json();
}
