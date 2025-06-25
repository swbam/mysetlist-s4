'use client';

import { useState, useEffect } from 'react';
import { Search, Music, Plus, Loader2 } from 'lucide-react';
import { Input } from '@repo/design-system/components/ui/input';
import { Button } from '@repo/design-system/components/ui/button';
import { ScrollArea } from '@repo/design-system/components/ui/scroll-area';
import { Badge } from '@repo/design-system/components/ui/badge';
import { Card, CardContent } from '@repo/design-system/components/ui/card';
import { toast } from 'sonner';
import Image from 'next/image';

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
  placeholder = "Search for songs...",
  maxHeight = "300px",
  disabled = false
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
    if (!query.trim()) return;

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
    } catch (error) {
      console.error('Search error:', error);
      toast.error('Failed to search songs');
      setSongs([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSongSelect = async (song: Song) => {
    if (disabled) return;
    
    setAddingSongId(song.id);
    try {
      await onSongSelect(song);
      setQuery('');
      setSongs([]);
    } catch (error) {
      console.error('Error selecting song:', error);
    } finally {
      setAddingSongId(null);
    }
  };

  const formatDuration = (ms?: number) => {
    if (!ms) return '';
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-3">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="pl-9"
          disabled={disabled}
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {/* Search Results */}
      {songs.length > 0 && (
        <Card>
          <CardContent className="p-0">
            <ScrollArea style={{ height: maxHeight }} className="w-full">
              <div className="p-2 space-y-1">
                {songs.map((song) => (
                  <div
                    key={song.id}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => !disabled && handleSongSelect(song)}
                  >
                    {/* Album Art */}
                    <div className="relative w-10 h-10 rounded bg-muted flex-shrink-0">
                      {song.album_art_url ? (
                        <Image
                          src={song.album_art_url}
                          alt={song.album || song.title}
                          fill
                          className="object-cover rounded"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Music className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                    </div>

                    {/* Song Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium truncate text-sm">{song.title}</h4>
                        {song.is_explicit && (
                          <Badge variant="outline" className="text-xs">
                            E
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
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
        <div className="text-center py-6 text-muted-foreground">
          <Music className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No songs found</p>
          <p className="text-xs mt-1">Try a different search term</p>
        </div>
      )}
    </div>
  );
}