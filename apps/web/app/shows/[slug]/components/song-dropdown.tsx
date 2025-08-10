"use client";

import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@repo/design-system/components/ui/dropdown-menu";
import { Input } from "@repo/design-system/components/ui/input";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@repo/design-system/components/ui/tabs";
import {
  ChevronDown,
  Loader2,
  Music,
  Plus,
  Search,
  TrendingUp,
  Vote,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "~/app/providers/auth-provider";
import { AnonymousVoteButton } from "~/components/voting/anonymous-vote-button";
import { useDebounce } from "~/hooks/use-debounce";
import { createClient } from "~/lib/supabase/client";
import { voteSong } from "../actions";

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

interface SetlistSong {
  id: string;
  position: number;
  upvotes: number;
  userVote: "up" | null;
  notes?: string;
  song: Song;
}

export function SongDropdown({
  show,
  setlists,
  onSongAdded,
}: SongDropdownProps) {
  const { session } = useAuth();
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState<string | null>(null);
  const [voting, setVoting] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"predicted" | "catalog">(
    "predicted",
  );
  const [realtimeSetlistData, setRealtimeSetlistData] = useState(null);

  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // Get the primary setlist for adding songs
  const primarySetlist =
    setlists.find((s) => s.type === "predicted") || setlists[0];

  // Use real-time data if available, otherwise fall back to props
  const currentSetlistData = realtimeSetlistData || primarySetlist;

  // Get predicted setlist songs with vote counts
  const predictedSongs: SetlistSong[] =
    currentSetlistData?.setlist_songs
      ?.map((item: any) => ({
        id: item.id,
        position: item.position,
        upvotes: item.upvotes || 0,
        userVote: item.userVote || null,
        notes: item.notes,
        song: item.song,
      }))
      .sort((a: SetlistSong, b: SetlistSong) => a.position - b.position) || [];

  const fetchSongs = useCallback(
    async (query = "") => {
      if (!show.headliner_artist?.slug) {
        return;
      }

      setLoading(true);
      try {
        const url = new URL(
          `/api/artists/${show.headliner_artist.slug}/songs`,
          window.location.origin,
        );
        if (query) {
          url.searchParams.set("q", query);
        }
        url.searchParams.set("limit", "20");

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
    [show.headliner_artist?.slug],
  );

  useEffect(() => {
    if (isOpen && activeTab === "catalog") {
      fetchSongs(debouncedSearchQuery);
    }
  }, [debouncedSearchQuery, isOpen, activeTab, fetchSongs]);

  const handleVote = async (setlistSongId: string, voteType: "up") => {
    if (!session) {
      toast.error("Please sign in to vote");
      return;
    }

    setVoting(setlistSongId);
    try {
      await voteSong(setlistSongId, voteType);
      // The real-time system will handle updating the UI
      toast.success("Vote added!");
    } catch (error: any) {
      toast.error(error.message || "Failed to vote");
    } finally {
      setVoting(null);
    }
  };

  // Set up real-time subscription for setlist and vote changes
  useEffect(() => {
    if (!primarySetlist?.id) return;

    const supabase = createClient();
    const channel = supabase
      .channel(`setlist-dropdown-${primarySetlist.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "votes",
          filter: `setlist_song_id=in.(${predictedSongs.map((s) => s.id).join(",")})`,
        },
        async () => {
          // Refresh setlist data when votes change
          const { data, error } = await supabase
            .from("setlists")
            .select(
              `
              *,
              setlist_songs(
                *,
                song:songs(*),
                votes(*)
              )
            `,
            )
            .eq("id", primarySetlist.id)
            .single();

          if (!error && data) {
            // Process vote counts for each song
            const processedData = {
              ...data,
              setlist_songs: data.setlist_songs?.map((item: any) => ({
                ...item,
                upvotes: item.votes?.length || 0,
                userVote:
                  item.votes?.find((v: any) => v.user_id === session?.user?.id)
                    ? "up"
                    : null,
              })),
            };
            setRealtimeSetlistData(processedData);
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "setlist_songs",
          filter: `setlist_id=eq.${primarySetlist.id}`,
        },
        async () => {
          // Refresh when setlist songs are added/removed
          const { data, error } = await supabase
            .from("setlists")
            .select(
              `
              *,
              setlist_songs(
                *,
                song:songs(*),
                votes(*)
              )
            `,
            )
            .eq("id", primarySetlist.id)
            .single();

          if (!error && data) {
            const processedData = {
              ...data,
              setlist_songs: data.setlist_songs?.map((item: any) => ({
                ...item,
                upvotes:
                  item.votes?.filter((v: any) => v.vote_type === "up").length ||
                  0,
                downvotes:
                  item.votes?.filter((v: any) => v.vote_type === "down")
                    .length || 0,
                userVote:
                  item.votes?.find((v: any) => v.user_id === session?.user?.id)
                    ?.vote_type || null,
              })),
            };
            setRealtimeSetlistData(processedData);
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [primarySetlist?.id, session?.user?.id, predictedSongs.length]);

  const addSongToSetlist = async (song: Song) => {
    if (!primarySetlist) {
      toast.error("No setlist available to add songs to");
      return;
    }

    setAdding(song.id);

    try {
      // First, upsert the song to our database
      const songResponse = await fetch("/api/songs/upsert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
        throw new Error("Failed to save song");
      }

      const songData = await songResponse.json();

      // Then add to setlist
      const setlistResponse = await fetch("/api/setlists/songs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          setlistId: primarySetlist.id,
          songId: songData.song.id,
        }),
      });

      if (!setlistResponse.ok) {
        const errorData = await setlistResponse.json();
        throw new Error(errorData.error || "Failed to add song to setlist");
      }

      toast.success(`Added "${song.title}" to setlist`);
      onSongAdded();
      setSearchQuery(""); // Clear search after successful add
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to add song",
      );
    } finally {
      setAdding(null);
    }
  };

  const formatDuration = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  if (!primarySetlist) {
    return null;
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button className="gap-2" variant="outline">
          <Vote className="h-4 w-4" />
          Setlist & Voting
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-[500px]" align="end">
        <DropdownMenuLabel className="flex items-center gap-2">
          <Vote className="h-4 w-4" />"
          {primarySetlist.name || "Predicted Setlist"}" - Vote & Add Songs
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        <Tabs
          value={activeTab}
          onValueChange={(value) =>
            setActiveTab(value as "predicted" | "catalog")
          }
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-2 mx-2 mb-2">
            <TabsTrigger value="predicted" className="gap-2">
              <TrendingUp className="h-3 w-3" />
              Predicted ({predictedSongs.length})
            </TabsTrigger>
            <TabsTrigger value="catalog" className="gap-2">
              <Plus className="h-3 w-3" />
              Add Songs
            </TabsTrigger>
          </TabsList>

          <TabsContent value="predicted" className="mt-0">
            {predictedSongs.length > 0 ? (
              <div className="max-h-80 overflow-y-auto">
                {predictedSongs.map((setlistSong, index) => (
                  <div
                    key={setlistSong.id}
                    className="flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors"
                  >
                    {/* Position */}
                    <div className="w-6 text-center font-medium text-muted-foreground text-sm">
                      {index + 1}
                    </div>

                    {/* Song Info */}
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">
                        {setlistSong.song.title}
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground text-sm">
                        <span className="truncate">
                          {setlistSong.song.artist}
                        </span>
                        {setlistSong.song.album && (
                          <>
                            <span>•</span>
                            <span className="truncate">
                              {setlistSong.song.album}
                            </span>
                          </>
                        )}
                        {setlistSong.song.durationMs && (
                          <>
                            <span>•</span>
                            <span>
                              {formatDuration(setlistSong.song.durationMs)}
                            </span>
                          </>
                        )}
                      </div>
                      {setlistSong.notes && (
                        <Badge variant="secondary" className="text-xs mt-1">
                          {setlistSong.notes}
                        </Badge>
                      )}
                    </div>

                    {/* Voting */}
                    <div className="flex-shrink-0">
                      <AnonymousVoteButton
                        setlistSongId={setlistSong.id}
                        initialUpvotes={setlistSong.upvotes}
                        initialDownvotes={0} // Downvotes are not tracked in the new SetlistSong interface
                        isAuthenticated={!!session}
                        onVote={async (voteType) => {
                          if (voteType === "up") {
                            await handleVote(setlistSong.id, "up");
                          }
                        }}
                        variant="compact"
                        size="sm"
                        disabled={voting === setlistSong.id}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center text-muted-foreground">
                <Music className="mx-auto mb-2 h-8 w-8 opacity-50" />
                <p className="text-sm">No songs in predicted setlist yet</p>
                <p className="text-xs mt-1">
                  Switch to "Add Songs" to start building the setlist
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="catalog" className="mt-0">
            {/* Search input */}
            <div className="p-2">
              <div className="relative">
                <Search className="absolute top-2.5 left-2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={`Search ${show.headliner_artist.name} songs...`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                  autoFocus={activeTab === "catalog"}
                />
              </div>
            </div>

            {loading ? (
              <div className="p-4 text-center">
                <Loader2 className="mx-auto mb-2 h-6 w-6 animate-spin" />
                <p className="text-muted-foreground text-sm">
                  Loading songs...
                </p>
              </div>
            ) : songs.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground">
                <Music className="mx-auto mb-2 h-8 w-8 opacity-50" />
                <p className="text-sm">
                  {searchQuery
                    ? "No songs found matching your search"
                    : "Search for songs to add to the setlist"}
                </p>
              </div>
            ) : (
              <div className="max-h-80 overflow-y-auto">
                {songs.map((song) => (
                  <div
                    key={song.id}
                    className="flex cursor-pointer items-center gap-3 p-3 hover:bg-muted/50 transition-colors"
                    onClick={() => addSongToSetlist(song)}
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
                    {adding === song.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Plus className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
