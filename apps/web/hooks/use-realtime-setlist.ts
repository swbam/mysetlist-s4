'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

interface SetlistSong {
  id: string;
  setlist_id: string;
  song_id: string;
  position: number;
  notes?: string;
  is_cover: boolean;
  is_debut: boolean;
  created_at: string;
  song?: {
    id: string;
    title: string;
    artist_id: string;
  };
}

interface UseRealtimeSetlistOptions {
  setlistId?: string;
  showId?: string;
  onSongAdded?: (song: SetlistSong) => void;
  onSongRemoved?: (songId: string) => void;
  onSongUpdated?: (song: SetlistSong) => void;
  onSetlistReordered?: (songs: SetlistSong[]) => void;
}

export function useRealtimeSetlist({ 
  setlistId,
  showId,
  onSongAdded,
  onSongRemoved,
  onSongUpdated,
  onSetlistReordered
}: UseRealtimeSetlistOptions) {
  const [songs, setSongs] = useState<SetlistSong[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const supabase = createClient();

  // Fetch current setlist songs
  const fetchSetlistSongs = useCallback(async () => {
    if (!setlistId && !showId) return;

    try {
      setIsLoading(true);
      let query = supabase
        .from('setlist_songs')
        .select(`
          *,
          song:songs(id, title, artist_id)
        `)
        .order('position', { ascending: true });

      if (setlistId) {
        query = query.eq('setlist_id', setlistId);
      } else if (showId) {
        // Get setlist for the show first
        const { data: setlistData } = await supabase
          .from('setlists')
          .select('id')
          .eq('show_id', showId)
          .single();
        
        if (setlistData) {
          query = query.eq('setlist_id', setlistData.id);
        }
      }

      const { data, error } = await query;

      if (!error && data) {
        setSongs(data);
      }
    } catch (error) {
      console.error('Error fetching setlist songs:', error);
    } finally {
      setIsLoading(false);
    }
  }, [setlistId, showId, supabase]);

  useEffect(() => {
    // Initial fetch
    fetchSetlistSongs();

    if (!setlistId && !showId) return;

    // Build the filter based on what we have
    let filter = '';
    if (setlistId) {
      filter = `setlist_id=eq.${setlistId}`;
    } else if (showId) {
      filter = `setlist_id=in.(select id from setlists where show_id=eq.${showId})`;
    }

    // Subscribe to setlist changes
    const channel = supabase
      .channel(`setlist-songs-${setlistId || showId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'setlist_songs',
          filter,
        },
        async (payload: RealtimePostgresChangesPayload<SetlistSong>) => {
          if (payload.eventType === 'INSERT' && payload.new) {
            // Fetch the full song data
            const { data: songData } = await supabase
              .from('songs')
              .select('id, title, artist_id')
              .eq('id', payload.new.song_id)
              .single();

            const newSong = { ...payload.new, song: songData || undefined };
            
            setSongs(prev => {
              const updated = [...prev, newSong as SetlistSong].sort((a, b) => a.position - b.position);
              onSongAdded?.(newSong as SetlistSong);
              return updated;
            });
          } else if (payload.eventType === 'DELETE' && payload.old) {
            setSongs(prev => {
              const updated = prev.filter(song => song.id !== payload.old.id);
              if (payload.old.id) {
                onSongRemoved?.(payload.old.id);
              }
              return updated;
            });
          } else if (payload.eventType === 'UPDATE' && payload.new) {
            setSongs(prev => {
              const updated = prev.map(song => 
                song.id === payload.new.id 
                  ? { ...song, ...payload.new }
                  : song
              ).sort((a, b) => a.position - b.position);
              
              const updatedSong = updated.find(s => s.id === payload.new.id);
              if (updatedSong) {
                onSongUpdated?.(updatedSong);
              }
              
              // Check if positions changed (reordering)
              const positionChanged = prev.find(s => s.id === payload.new.id)?.position !== payload.new.position;
              if (positionChanged) {
                onSetlistReordered?.(updated);
              }
              
              return updated;
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [setlistId, showId, supabase, fetchSetlistSongs, onSongAdded, onSongRemoved, onSongUpdated, onSetlistReordered]);

  return {
    songs,
    isLoading,
    refetch: fetchSetlistSongs,
  };
}