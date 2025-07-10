'use client';

import { Badge } from '@repo/design-system/components/ui/badge';
import { Button } from '@repo/design-system/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@repo/design-system/components/ui/dropdown-menu';
import { Input } from '@repo/design-system/components/ui/input';
import { ChevronDown, Loader2, Music, Plus, Search } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useDebounce } from '~/hooks/use-debounce';

type SongDropdownProps = {
  show: any;
  setlists: any[];
  onSongAdded: () => void;
};

interface Song {
  id: string;
  spotifyId?: string | null;
  title: string;
  artist: string;
  album?: string | null;
  albumArtUrl?: string | null;
  durationMs?: number | null;
  popularity?: number | null;
  previewUrl?: string | null;
}

export function SongDropdown({
  show,
  setlists,
  onSongAdded,
}: SongDropdownProps) {
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // Get the primary setlist for adding songs
  const primarySetlist =
    setlists.find((s) => s.type === 'predicted') || setlists[0];

  const fetchSongs = useCallback(
    async (query = '') => {
      if (!show.headliner_artist?.slug) {
        return;
      }

      setLoading(true);
      try {
        const url = new URL(
          `/api/artists/${show.headliner_artist.slug}/songs`,
          window.location.origin
        );
        if (query) {
          url.searchParams.set('q', query);
        }
        url.searchParams.set('limit', '20');

        const response = await fetch(url.toString());
        if (response.ok) {
          const data = await response.json();
          setSongs(data.songs || []);
        } else {
          setSongs([]);
        }
      } catch (_error) {
        setSongs([]);
      } finally {
        setLoading(false);
      }
    },
    [show.headliner_artist?.slug]
  );

  useEffect(() => {
    if (isOpen) {
      fetchSongs(debouncedSearchQuery);
    }
  }, [debouncedSearchQuery, isOpen, fetchSongs]);

  const addSongToSetlist = async (song: Song) => {
    if (!primarySetlist) {
      toast.error('No setlist available to add songs to');
      return;
    }

    setAdding(song.id);

    try {
      // First, upsert the song to our database
      const songResponse = await fetch('/api/songs/upsert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          spotifyId: song.spotifyId,
          title: song.title,
          artist: song.artist,
          album: song.album,
          albumArtUrl: song.albumArtUrl,
          duration: song.durationMs,
          popularity: song.popularity,
          previewUrl: song.previewUrl,
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

      toast.success(`Added "${song.title}" to setlist`);
      onSongAdded();
      setSearchQuery(''); // Clear search after successful add
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to add song'
      );
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
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Add Song
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-96" align="end">
        <DropdownMenuLabel className="flex items-center gap-2">
          <Music className="h-4 w-4" />
          Add to "{primarySetlist.name || 'Predicted Setlist'}"
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {/* Search input */}
        <div className="p-2">
          <div className="relative">
            <Search className="absolute top-2.5 left-2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={`Search ${show.headliner_artist.name} songs...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
              autoFocus
            />
          </div>
        </div>

        {loading ? (
          <div className="p-4 text-center">
            <Loader2 className="mx-auto mb-2 h-6 w-6 animate-spin" />
            <p className="text-muted-foreground text-sm">Loading songs...</p>
          </div>
        ) : songs.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground">
            <Music className="mx-auto mb-2 h-8 w-8 opacity-50" />
            <p className="text-sm">
              {searchQuery
                ? 'No songs found matching your search'
                : 'No songs found'}
            </p>
          </div>
        ) : (
          <div className="max-h-80 overflow-y-auto">
            {songs.map((song) => (
              <DropdownMenuItem
                key={song.id}
                className="flex cursor-pointer items-center gap-3 p-3"
                onSelect={() => addSongToSetlist(song)}
                disabled={adding === song.id}
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{song.title}</div>
                  <div className="flex items-center gap-2 text-muted-foreground text-sm">
                    {song.album && (
                      <span className="truncate">{song.album}</span>
                    )}
                    {song.durationMs && (
                      <>
                        <span>•</span>
                        <span>{formatDuration(song.durationMs)}</span>
                      </>
                    )}
                    {song.popularity && (
                      <Badge variant="secondary" className="text-xs">
                        {song.popularity}% popular
                      </Badge>
                    )}
                  </div>
                </div>
                {adding === song.id && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
              </DropdownMenuItem>
            ))}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
