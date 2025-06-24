'use client';

import { useState, useTransition, useEffect } from 'react';
import { Search, Music, Plus, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@repo/design-system/components/ui/dialog';
import { Button } from '@repo/design-system/components/ui/button';
import { Input } from '@repo/design-system/components/ui/input';
import { ScrollArea } from '@repo/design-system/components/ui/scroll-area';
import { toast } from 'sonner';
import { searchSongs, addSongToSetlist } from '../actions';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Badge } from '@repo/design-system/components/ui/badge';

type AddSongDialogProps = {
  setlistId: string;
  artistId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function AddSongDialog({ 
  setlistId, 
  artistId,
  open, 
  onOpenChange 
}: AddSongDialogProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [addingSongId, setAddingSongId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    
    const timeoutId = setTimeout(() => {
      handleSearch();
    }, 300);
    
    return () => clearTimeout(timeoutId);
  }, [query]);
  
  const handleSearch = async () => {
    if (!query.trim()) return;
    
    setIsSearching(true);
    try {
      const songs = await searchSongs(query, artistId);
      setResults(songs);
    } catch (error) {
      toast.error('Failed to search songs');
    } finally {
      setIsSearching(false);
    }
  };
  
  const handleAddSong = (songId: string) => {
    setAddingSongId(songId);
    
    startTransition(async () => {
      try {
        // Add at the end of the setlist
        const position = 999; // Will be adjusted by the server
        await addSongToSetlist(setlistId, songId, position);
        
        toast.success('Song added to setlist');
        
        // Clear search and close if only adding one song
        setQuery('');
        setResults([]);
        
        router.refresh();
      } catch (error: any) {
        if (error.message.includes('logged in')) {
          toast.error('Please sign in to add songs');
          router.push('/auth/sign-in');
        } else {
          toast.error('Failed to add song');
        }
      } finally {
        setAddingSongId(null);
      }
    });
  };
  
  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Music className="h-5 w-5" />
            Add Songs to Setlist
          </DialogTitle>
          <DialogDescription>
            Search for songs to add to the setlist
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search for songs..."
              className="pl-9"
              autoFocus
            />
            {isSearching && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </div>
          
          {/* Results */}
          <ScrollArea className="h-[400px] pr-4">
            {results.length > 0 ? (
              <div className="space-y-2">
                {results.map((song) => (
                  <div
                    key={song.id}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    {/* Album Art */}
                    <div className="relative w-12 h-12 rounded bg-muted flex-shrink-0">
                      {song.album_art_url ? (
                        <Image
                          src={song.album_art_url}
                          alt={song.album || song.title}
                          fill
                          className="object-cover rounded"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Music className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    
                    {/* Song Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium truncate">{song.title}</h4>
                        {song.is_explicit && (
                          <Badge variant="outline" className="text-xs">
                            E
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
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
                      variant="outline"
                      onClick={() => handleAddSong(song.id)}
                      disabled={isPending || addingSongId === song.id}
                      className="gap-2"
                    >
                      {addingSongId === song.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Plus className="h-3 w-3" />
                      )}
                      Add
                    </Button>
                  </div>
                ))}
              </div>
            ) : query.trim() && !isSearching ? (
              <div className="text-center py-8 text-muted-foreground">
                <Music className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No songs found</p>
                <p className="text-sm mt-1">Try a different search term</p>
              </div>
            ) : !query.trim() ? (
              <div className="text-center py-8 text-muted-foreground">
                <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Start typing to search for songs</p>
              </div>
            ) : null}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}