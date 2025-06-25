'use client';

import { useState, useEffect } from 'react';
import { Plus, Music, ChevronDown } from 'lucide-react';
import { Button } from '@repo/design-system/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@repo/design-system/components/ui/dropdown-menu';
import { Badge } from '@repo/design-system/components/ui/badge';
import { toast } from 'sonner';

type SongDropdownProps = {
  show: any;
  setlists: any[];
  onSongAdded: () => void;
};

interface SpotifyTrack {
  id: string;
  name: string;
  duration_ms: number;
  popularity: number;
  preview_url?: string;
  external_urls: {
    spotify: string;
  };
}

export function SongDropdown({ show, setlists, onSongAdded }: SongDropdownProps) {
  const [topTracks, setTopTracks] = useState<SpotifyTrack[]>([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState<string | null>(null);

  // Get the primary setlist for adding songs
  const primarySetlist = setlists.find(s => s.type === 'predicted') || setlists[0];

  useEffect(() => {
    // Fetch artist's top tracks for the dropdown
    const fetchTopTracks = async () => {
      try {
        const response = await fetch(`/api/artists/${show.headliner_artist.id}/top-tracks`);
        if (response.ok) {
          const data = await response.json();
          setTopTracks(data.tracks || []);
        }
      } catch (error) {
        console.error('Failed to fetch top tracks:', error);
      }
    };

    if (show.headliner_artist?.id) {
      fetchTopTracks();
    }
  }, [show.headliner_artist?.id]);

  const addSongToSetlist = async (track: SpotifyTrack) => {
    if (!primarySetlist) {
      toast.error('No setlist available to add songs to');
      return;
    }

    setAdding(track.id);

    try {
      // First, upsert the song to our database
      const songResponse = await fetch('/api/songs/upsert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          spotifyId: track.id,
          title: track.name,
          duration: track.duration_ms,
          popularity: track.popularity,
          previewUrl: track.preview_url,
          spotifyUrl: track.external_urls.spotify,
        }),
      });

      if (!songResponse.ok) {
        throw new Error('Failed to save song');
      }

      const songData = await songResponse.json();

      // Then add to setlist
      const setlistResponse = await fetch('/api/setlists/songs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          setlistId: primarySetlist.id,
          songId: songData.song.id,
        }),
      });

      if (!setlistResponse.ok) {
        const errorData = await setlistResponse.json();
        throw new Error(errorData.error || 'Failed to add song to setlist');
      }

      toast.success(`Added "${track.name}" to setlist`);
      onSongAdded();
    } catch (error) {
      console.error('Error adding song:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to add song');
    } finally {
      setAdding(null);
    }
  };

  const formatDuration = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (!primarySetlist) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button className="gap-2" disabled={loading}>
          <Plus className="h-4 w-4" />
          Add Song
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-80" align="end">
        <DropdownMenuLabel className="flex items-center gap-2">
          <Music className="h-4 w-4" />
          Add to "{primarySetlist.name || 'Predicted Setlist'}"
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {topTracks.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground">
            <Music className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No popular songs found</p>
          </div>
        ) : (
          <div className="max-h-64 overflow-y-auto">
            {topTracks.slice(0, 10).map((track) => (
              <DropdownMenuItem
                key={track.id}
                className="flex items-center gap-3 p-3 cursor-pointer"
                onSelect={() => addSongToSetlist(track)}
                disabled={adding === track.id}
              >
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">
                    {track.name}
                  </div>
                  <div className="text-sm text-muted-foreground flex items-center gap-2">
                    <span>{formatDuration(track.duration_ms)}</span>
                    <Badge variant="secondary" className="text-xs">
                      {track.popularity}% popular
                    </Badge>
                  </div>
                </div>
                {adding === track.id && (
                  <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
                )}
              </DropdownMenuItem>
            ))}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}