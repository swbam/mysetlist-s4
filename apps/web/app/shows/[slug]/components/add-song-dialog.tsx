"use client";

import { Badge } from "@repo/design-system/badge";
import { Button } from "@repo/design-system/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@repo/design-system/dialog";
import { Input } from "@repo/design-system/input";
import { ScrollArea } from "@repo/design-system/scroll-area";
import { Loader2, Music, Plus, Search } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { addSongToSetlist, searchSongs } from "../actions";

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
  onOpenChange,
}: AddSongDialogProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
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
    if (!query.trim()) {
      return;
    }

    setIsSearching(true);
    try {
      const songs = await searchSongs(query, artistId);
      setResults(songs);
    } catch (_error) {
      toast.error("Failed to search songs");
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

        toast.success("Song added to setlist");

        // Clear search and close if only adding one song
        setQuery("");
        setResults([]);

        router.refresh();
      } catch (error: any) {
        if (error.message.includes("logged in")) {
          toast.error("Please sign in to add songs");
          router.push("/auth/sign-in");
        } else {
          toast.error("Failed to add song");
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
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
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
            <Search className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search for songs..."
              className="pl-9"
              autoFocus
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
              <div className="py-8 text-center text-muted-foreground">
                <Music className="mx-auto mb-2 h-8 w-8 opacity-50" />
                <p>No songs found</p>
                <p className="mt-1 text-sm">Try a different search term</p>
              </div>
            ) : query.trim() ? null : (
              <div className="py-8 text-center text-muted-foreground">
                <Search className="mx-auto mb-2 h-8 w-8 opacity-50" />
                <p>Start typing to search for songs</p>
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
