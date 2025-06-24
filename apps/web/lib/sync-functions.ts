import { createClient } from './supabase/client';

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
 * Sync artist data from Spotify
 */
export async function syncArtist(params: SyncArtistParams) {
  try {
    const supabase = createClient();
    const { data, error } = await supabase.functions.invoke('sync-artists', {
      body: params,
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error syncing artist:', error);
    throw error;
  }
}

/**
 * Sync shows/concerts from Ticketmaster
 */
export async function syncShows(params: SyncShowsParams) {
  try {
    const supabase = createClient();
    const { data, error } = await supabase.functions.invoke('sync-shows', {
      body: params,
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error syncing shows:', error);
    throw error;
  }
}

/**
 * Sync setlist from Setlist.fm
 */
export async function syncSetlist(params: SyncSetlistParams) {
  try {
    const supabase = createClient();
    const { data, error } = await supabase.functions.invoke('sync-setlists', {
      body: params,
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error syncing setlist:', error);
    throw error;
  }
}

/**
 * Trigger a manual sync for all data types
 */
export async function triggerManualSync(type: 'all' | 'artists' | 'shows' | 'setlists' = 'all', limit = 10) {
  try {
    const supabase = createClient();
    const { data, error } = await supabase.functions.invoke('scheduled-sync', {
      body: { type, limit },
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error triggering manual sync:', error);
    throw error;
  }
}