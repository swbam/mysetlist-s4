'use client';

import { Badge } from '@repo/design-system/components/ui/badge';
import { Button } from '@repo/design-system/components/ui/button';
import { Card, CardContent } from '@repo/design-system/components/ui/card';
import { Input } from '@repo/design-system/components/ui/input';
import { ScrollArea } from '@repo/design-system/components/ui/scroll-area';
import { Loader2, Music, Plus, Search } from 'lucide-react';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

interface Song {
  id: string;
  spotify_id: string;
  title: string;
  artist: string;
  album?: string;
  album_art_url?: string;
  duration_ms?: number;
  is_explicit?: boolean;
}

interface SongSelectorProps {
  onSongSelect: (song: Song) => void;
  artistId?: string;
  placeholder?: string;
  maxHeight?: string;
  disabled?: boolean;
}

export function SongSelector({
  onSongSelect,
  artistId,
  placeholder = 'Search for songs...',
  maxHeight = '300px',
  disabled = false,
}: SongSelectorProps) {
  const [query, setQuery] = useState('');
  const [songs, setSongs] = useState<Song[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [addingSongId, setAddingSongId] = useState<string | null>(null);

  useEffect(() => {
    if (!query.trim()) {
      setSongs([]);
      return;
    }

    const timeoutId = setTimeout(() => {
      searchSongs();
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query]);

  const searchSongs = async () => {
    if (!query.trim()) {
      return;
    }

    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        q: query,
        limit: '20',
      });

      if (artistId) {
        params.append('artistId', artistId);
      }

      const response = await fetch(`/api/songs/search?${params}`);

      if (!response.ok) {
        throw new Error('Failed to search songs');
      }

      const data = await response.json();
      setSongs(data.songs || []);
    } catch (_error) {
      toast.error('Failed to search songs');
      setSongs([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSongSelect = async (song: Song) => {
    if (disabled) {
      return;
    }

    setAddingSongId(song.id);
    try {
      await onSongSelect(song);
      setQuery('');
      setSongs([]);
    } catch (_error) {
    } finally {
      setAddingSongId(null);
    }
  };

  const formatDuration = (ms?: number) => {
    if (!ms) {
      return '';
    }
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-3">
      {/* Search Input */}
      <div className="relative">
        <Search className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="pl-9"
          disabled={disabled}
        />
        {isLoading && (
          <Loader2 className="-translate-y-1/2 absolute top-1/2 right-3 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {/* Search Results */}
      {songs.length > 0 && (
        <Card>
          <CardContent className="p-0">
            <ScrollArea style={{ height: maxHeight }} className="w-full">
              <div className="space-y-1 p-2">
                {songs.map((song) => (
                  <div
                    key={song.id}
                    className="flex cursor-pointer items-center gap-3 rounded-lg p-3 transition-colors hover:bg-muted/50"
                    onClick={() => !disabled && handleSongSelect(song)}
                  >
                    {/* Album Art */}
                    <div className="relative h-10 w-10 flex-shrink-0 rounded bg-muted">
                      {song.album_art_url ? (
                        <Image
                          src={song.album_art_url}
                          alt={song.album || song.title}
                          fill
                          className="rounded object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <Music className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                    </div>

                    {/* Song Info */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="truncate font-medium text-sm">
                          {song.title}
                        </h4>
                        {song.is_explicit && (
                          <Badge variant="outline" className="text-xs">
                            E
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground text-xs">
                        <span className="truncate">{song.artist}</span>
                        {song.album && (
                          <>
                            <span>•</span>
                            <span className="truncate">{song.album}</span>
                          </>
                        )}
                        {song.duration_ms && (
                          <>
                            <span>•</span>
                            <span>{formatDuration(song.duration_ms)}</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Add Button */}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0"
                      disabled={disabled || addingSongId === song.id}
                    >
                      {addingSongId === song.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Plus className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {query.trim() && !isLoading && songs.length === 0 && (
        <div className="py-6 text-center text-muted-foreground">
          <Music className="mx-auto mb-2 h-8 w-8 opacity-50" />
          <p className="text-sm">No songs found</p>
          <p className="mt-1 text-xs">Try a different search term</p>
        </div>
      )}
    </div>
  );
}
