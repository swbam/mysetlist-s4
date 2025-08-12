"use client";

import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@repo/design-system/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@repo/design-system/components/ui/popover";
import { cn } from "@repo/design-system/lib/utils";
import {
  ChevronDown,
  Clock,
  Loader2,
  Music,
  Plus,
  Search,
  Volume2,
} from "lucide-react";
import { useEffect, useState } from "react";

type Song = {
  id: string;
  spotify_id?: string;
  title: string;
  artist: string;
  album?: string;
  album_art_url?: string;
  duration_ms?: number;
  popularity?: number;
  preview_url?: string;
  is_explicit?: boolean;
  release_date?: string;
  album_type?: string;
};

type SongSelectorProps = {
  artistId: string;
  artistName: string;
  onSongSelect: (song: Song) => void;
  disabled?: boolean;
  className?: string;
};

export function SongSelector({
  artistId,
  artistName,
  onSongSelect,
  disabled = false,
  className,
}: SongSelectorProps) {
  const [open, setOpen] = useState(false);
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch artist's song catalog
  const fetchSongs = async (search?: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        limit: "100",
        ...(search && { search }),
      });

      const response = await fetch(`/api/artists/${artistId}/songs?${params}`);
      if (!response.ok) {
        throw new Error("Failed to fetch songs");
      }

      const data = await response.json();
      setSongs(data.songs || []);
    } catch (error) {
      console.error("Error fetching songs:", error);
      setSongs([]);
    } finally {
      setLoading(false);
    }
  };

  // Initial load when opened
  useEffect(() => {
    if (open && songs.length === 0) {
      fetchSongs();
    }
  }, [open]);

  // Search functionality with debouncing
  useEffect(() => {
    if (!open) return;

    const timeoutId = setTimeout(() => {
      if (searchQuery.length >= 2) {
        fetchSongs(searchQuery);
      } else if (searchQuery.length === 0) {
        fetchSongs();
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, open]);

  const formatDuration = (durationMs?: number) => {
    if (!durationMs) return "?:??";
    const minutes = Math.floor(durationMs / 60000);
    const seconds = Math.floor((durationMs % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const handleSongSelect = (song: Song) => {
    onSongSelect(song);
    setOpen(false);
    setSearchQuery("");
  };

  return (
    <div className={cn("w-full", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="w-full justify-between gap-2 h-auto py-3 px-4"
            disabled={disabled}
          >
            <div className="flex items-center gap-2">
              <Plus className="h-4 w-4 text-muted-foreground" />
              <span>Suggest a song from {artistName}'s catalog</span>
            </div>
            <ChevronDown className="h-4 w-4 opacity-50" />
          </Button>
        </PopoverTrigger>

        <PopoverContent
          className="w-[--radix-popover-trigger-width] p-0"
          align="start"
        >
          <Command shouldFilter={false}>
            <CommandInput
              placeholder={`Search ${artistName}'s songs...`}
              value={searchQuery}
              onValueChange={setSearchQuery}
            />

            <CommandList>
              {loading && (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="ml-2 text-sm text-muted-foreground">
                    Loading songs...
                  </span>
                </div>
              )}

              {!loading && songs.length === 0 && (
                <CommandEmpty>
                  {searchQuery ? (
                    <div className="text-center py-6">
                      <Search className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        No songs found matching "{searchQuery}"
                      </p>
                    </div>
                  ) : (
                    <div className="text-center py-6">
                      <Music className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        No songs available for {artistName}
                      </p>
                    </div>
                  )}
                </CommandEmpty>
              )}

              {!loading && songs.length > 0 && (
                <CommandGroup heading={`${songs.length} songs found`}>
                  {songs.map((song) => (
                    <CommandItem
                      key={song.id}
                      className="flex items-center gap-3 p-3 cursor-pointer"
                      onSelect={() => handleSongSelect(song)}
                    >
                      {/* Album Art */}
                      {song.album_art_url ? (
                        <img
                          src={song.album_art_url}
                          alt={`${song.title} album art`}
                          className="w-10 h-10 rounded object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded bg-muted flex items-center justify-center flex-shrink-0">
                          <Music className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}

                      {/* Song Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium text-sm truncate">
                            {song.title}
                          </h4>
                          {song.is_explicit && (
                            <Badge
                              variant="secondary"
                              className="h-4 px-1 text-xs"
                            >
                              E
                            </Badge>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          {song.album && (
                            <>
                              <span className="truncate">{song.album}</span>
                              <span>•</span>
                            </>
                          )}
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span>{formatDuration(song.duration_ms)}</span>
                          </div>
                          {song.preview_url && (
                            <>
                              <span>•</span>
                              <div className="flex items-center gap-1">
                                <Volume2 className="h-3 w-3" />
                                <span>Preview</span>
                              </div>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Popularity indicator */}
                      {song.popularity && song.popularity > 70 && (
                        <Badge variant="secondary" className="text-xs">
                          Popular
                        </Badge>
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
