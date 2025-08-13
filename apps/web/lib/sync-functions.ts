import { createClient } from "./supabase/client";

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
      Authorization: `Bearer ${process.env.CRON_SECRET || ""}`,
    },
    body: JSON.stringify({ type, limit, mode: "manual" }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to trigger sync: ${error}`);
  }

  return response.json();
}

/**
 * Trigger trending calculation update
 */
export async function triggerTrendingUpdate() {
  const response = await fetch(`${getAppUrl()}/api/cron/calculate-trending`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.CRON_SECRET || ""}`,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to trigger trending update: ${error}`);
  }

  return response.json();
}

/**
 * Trigger artist data sync
 */
export async function triggerArtistSync(limit = 20, mode = "auto") {
  const response = await fetch(`${getAppUrl()}/api/cron/sync-artist-data`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.CRON_SECRET || ""}`,
    },
    body: JSON.stringify({ limit, mode }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to trigger artist sync: ${error}`);
  }

  return response.json();
}

/**
 * Trigger finish TheSet sync (creates setlists for shows)
 */
export async function triggerFinishSync(mode = "daily") {
  const response = await fetch(
    `${getAppUrl()}/api/cron/finish-mysetlist-sync`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.CRON_SECRET || ""}`,
      },
      body: JSON.stringify({ mode }),
    },
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to trigger finish sync: ${error}`);
  }

  return response.json();
}

/**
 * Trigger all sync operations
 */
export async function triggerAllSyncs() {
  const results = {
    masterSync: null as any,
    trendingUpdate: null as any,
    artistSync: null as any,
    finishSync: null as any,
    errors: [] as string[],
  };

  try {
    results.masterSync = await triggerManualSync("all", 10);
  } catch (error) {
    results.errors.push(
      `Master sync failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  try {
    results.trendingUpdate = await triggerTrendingUpdate();
  } catch (error) {
    results.errors.push(
      `Trending update failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  try {
    results.artistSync = await triggerArtistSync(20, "manual");
  } catch (error) {
    results.errors.push(
      `Artist sync failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  try {
    results.finishSync = await triggerFinishSync("manual");
  } catch (error) {
    results.errors.push(
      `Finish sync failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  return results;
}
