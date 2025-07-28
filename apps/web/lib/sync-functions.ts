import { createClient } from "./supabase/client"

export interface SyncArtistParams {
  spotifyId?: string
  artistName?: string
  forceSync?: boolean
}

export interface SyncShowsParams {
  artistName?: string
  artistId?: string
  city?: string
  dateRange?: {
    start: string
    end: string
  }
}

export interface SyncSetlistParams {
  setlistId?: string
  showId?: string
  artistName?: string
  date?: string
}

/**
 * Sync artist data from Spotify
 */
export async function syncArtist(params: SyncArtistParams) {
  const supabase = createClient()
  const { data, error } = await supabase.functions.invoke("sync-artists", {
    body: params,
  })

  if (error) {
    throw error
  }
  return data
}

/**
 * Sync shows/concerts from Ticketmaster
 */
export async function syncShows(params: SyncShowsParams) {
  const supabase = createClient()
  const { data, error } = await supabase.functions.invoke("sync-shows", {
    body: params,
  })

  if (error) {
    throw error
  }
  return data
}

/**
 * Sync setlist from Setlist.fm
 */
export async function syncSetlist(params: SyncSetlistParams) {
  const supabase = createClient()
  const { data, error } = await supabase.functions.invoke("sync-setlists", {
    body: params,
  })

  if (error) {
    throw error
  }
  return data
}

/**
 * Trigger a manual sync for all data types
 */
export async function triggerManualSync(
  type: "all" | "artists" | "shows" | "setlists" = "all",
  limit = 10
) {
  const supabase = createClient()
  const { data, error } = await supabase.functions.invoke("scheduled-sync", {
    body: { type, limit },
  })

  if (error) {
    throw error
  }
  return data
}
