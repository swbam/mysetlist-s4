'use client';

import { anonymousUser } from '@/lib/anonymous-user';
import {
  Alert,
  AlertDescription,
} from '@repo/design-system/components/ui/alert';
import { Badge } from '@repo/design-system/components/ui/badge';
import { Button } from '@repo/design-system/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@repo/design-system/components/ui/dialog';
import { Input } from '@repo/design-system/components/ui/input';
import { ScrollArea } from '@repo/design-system/components/ui/scroll-area';
import { Loader2, Lock, Music, Plus, Search } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { searchSongs } from '../actions';
import { recordAnonymousSongSuggestion } from '../anonymous-actions';

type AnonymousAddSongDialogProps = {
  setlistId: string;
  artistId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isAuthenticated: boolean;
  onAddSong?: (songId: string) => Promise<void>;
};

export function AnonymousAddSongDialog({
  setlistId,
  artistId,
  open,
  onOpenChange,
  isAuthenticated,
  onAddSong,
}: AnonymousAddSongDialogProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [addingSongId, setAddingSongId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [canAddSong, setCanAddSong] = useState(true);
  const [hasAddedToThisSetlist, setHasAddedToThisSetlist] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      setCanAddSong(anonymousUser.canAddSong());
      setHasAddedToThisSetlist(anonymousUser.hasAddedSongToSetlist(setlistId));
    }
  }, [setlistId, isAuthenticated, open]);

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
    // Check if anonymous user can add song
    if (!isAuthenticated && (!canAddSong || hasAddedToThisSetlist)) {
      toast.error("You've already added a song! Sign up to add more.", {
        action: {
          label: 'Sign Up',
          onClick: () => router.push('/auth/sign-up'),
        },
      });
      return;
    }

    setAddingSongId(songId);

    startTransition(async () => {
      try {
        if (isAuthenticated && onAddSong) {
          // Use provided handler for authenticated users
          await onAddSong(songId);
        } else if (!isAuthenticated) {
          // Handle anonymous song addition
          const success = anonymousUser.addSong(setlistId, songId);

          if (!success) {
            toast.error("You've already added a song! Sign up to add more.", {
              action: {
                label: 'Sign Up',
                onClick: () => router.push('/auth/sign-up'),
              },
            });
            return;
          }

          // Record the suggestion in the database
          try {
            const sessionData = anonymousUser.getSessionData();
            await recordAnonymousSongSuggestion(
              setlistId,
              songId,
              sessionData.sessionId
            );
          } catch (error) {
            console.warn('Failed to record anonymous suggestion:', error);
            // Continue anyway - the client-side tracking is what matters
          }

          // Show success message for anonymous users
          toast.success('Song suggestion added! Sign up to add more songs.', {
            action: {
              label: 'Sign Up',
              onClick: () => router.push('/auth/sign-up'),
            },
          });

          // Update local state
          setCanAddSong(false);
          setHasAddedToThisSetlist(true);

          // Clear search and close dialog
          setQuery('');
          setResults([]);
          onOpenChange(false);
        }

        router.refresh();
      } catch (error: any) {
        console.error('Failed to add song:', error);
        toast.error('Failed to add song');
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

  const isDisabled = !isAuthenticated && (!canAddSong || hasAddedToThisSetlist);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Music className="h-5 w-5" />
            Add Songs to Setlist
          </DialogTitle>
          <DialogDescription>
            {isAuthenticated
              ? 'Search for songs to add to the setlist'
              : 'As a guest, you can add 1 song suggestion'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Anonymous user alert */}
          {!isAuthenticated && (
            <Alert>
              <Lock className="h-4 w-4" />
              <AlertDescription>
                {canAddSong && !hasAddedToThisSetlist
                  ? 'You can add 1 song as a guest. Sign up for unlimited additions!'
                  : "You've used your guest song addition. Sign up to add more!"}
                <Button
                  size="sm"
                  variant="link"
                  className="ml-2 h-auto p-0"
                  onClick={() => router.push('/auth/sign-up')}
                >
                  Sign Up
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {/* Search Input */}
          <div className="relative">
            <Search className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search for songs..."
              className="pl-9"
              autoFocus
              disabled={isDisabled}
            />
            {isSearching && (
              <Loader2 className="-translate-y-1/2 absolute top-1/2 right-3 h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </div>

          {/* Results */}
          <ScrollArea className="h-[400px] pr-4">
            {results.length > 0 ? (
              <div className="space-y-2">
                {results.map((song) => (
                  <div
                    key={song.id}
                    className="flex items-center gap-3 rounded-lg p-3 transition-colors hover:bg-muted/50"
                  >
                    {/* Album Art */}
                    <div className="relative h-12 w-12 flex-shrink-0 rounded bg-muted">
                      {song.album_art_url ? (
                        <Image
                          src={song.album_art_url}
                          alt={song.album || song.title}
                          fill
                          className="rounded object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <Music className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                    </div>

                    {/* Song Info */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="truncate font-medium">{song.title}</h4>
                        {song.is_explicit && (
                          <Badge variant="outline" className="text-xs">
                            E
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground text-sm">
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
                      disabled={
                        isPending || addingSongId === song.id || isDisabled
                      }
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
              <div className="py-8 text-center text-muted-foreground">
                <Music className="mx-auto mb-2 h-8 w-8 opacity-50" />
                <p>No songs found</p>
                <p className="mt-1 text-sm">Try a different search term</p>
              </div>
            ) : !query.trim() && !isDisabled ? (
              <div className="py-8 text-center text-muted-foreground">
                <Search className="mx-auto mb-2 h-8 w-8 opacity-50" />
                <p>Start typing to search for songs</p>
              </div>
            ) : isDisabled ? (
              <div className="py-8 text-center text-muted-foreground">
                <Lock className="mx-auto mb-2 h-8 w-8 opacity-50" />
                <p>You've used your guest song addition</p>
                <Button
                  size="sm"
                  className="mt-2"
                  onClick={() => router.push('/auth/sign-up')}
                >
                  Sign Up to Add More
                </Button>
              </div>
            ) : null}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
