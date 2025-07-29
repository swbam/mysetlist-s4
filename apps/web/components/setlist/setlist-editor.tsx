"use client";

import { DragDropContext, Draggable, Droppable } from "@hello-pangea/dnd";
import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@repo/design-system/components/ui/dropdown-menu";
import { Input } from "@repo/design-system/components/ui/input";
import { cn } from "@repo/design-system/lib/utils";
import {
  Edit3,
  GripVertical,
  Lock,
  MoreVertical,
  Music2,
  Plus,
  Trash2,
  Unlock,
} from "lucide-react";
import Image from "next/image";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { createClient } from "~/lib/supabase/client";
import { VoteButton } from "../voting/vote-button";
import { AddSongModal } from "./add-song-modal";

interface SetlistSong {
  id: string;
  position: number;
  notes?: string;
  song: {
    id: string;
    title: string;
    artist: string;
    album?: string;
    albumArtUrl?: string;
    durationMs?: number;
    isExplicit?: boolean;
    spotifyId?: string;
  };
  upvotes: number;
  downvotes: number;
  netVotes: number;
  userVote?: "up" | "down" | null;
}

interface SetlistEditorProps {
  setlist: {
    id: string;
    name: string;
    type: "predicted" | "actual";
    isLocked: boolean;
    createdBy: string;
    songs: SetlistSong[];
  };
  currentUser?: {
    id: string;
  };
  artistId: string;
  onUpdate?: () => void;
  canEdit?: boolean;
  canVote?: boolean;
}

export function SetlistEditor({
  setlist,
  currentUser: _currentUser,
  artistId,
  onUpdate,
  canEdit = false,
  canVote = false,
}: SetlistEditorProps) {
  const [songs, setSongs] = useState(setlist.songs);
  const [isEditing, setIsEditing] = useState(false);
  const [showAddSong, setShowAddSong] = useState(false);
  const [setlistName, setListName] = useState(setlist.name);
  const [isPending, startTransition] = useTransition();

  // Set up realtime subscription for votes
  useEffect(() => {
    if (!canVote) return;

    const supabase = createClient();
    const songIds = songs.map((song) => song.id);

    if (songIds.length === 0) return;

    // Subscribe to vote changes for this setlist's songs
    const channel = supabase
      .channel(`setlist-votes-${setlist.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "votes",
          filter: `setlist_song_id=in.(${songIds.join(",")})`,
        },
        async (payload: any) => {
          // Refetch vote counts for the affected song
          const setlistSongId =
            payload.new?.setlist_song_id || payload.old?.setlist_song_id;
          if (!setlistSongId) return;

          try {
            const response = await fetch(`/api/votes/${setlistSongId}/count`);
            if (response.ok) {
              const { upvotes, downvotes, userVote } = await response.json();

              setSongs((prevSongs) =>
                prevSongs.map((song) =>
                  song.id === setlistSongId
                    ? {
                        ...song,
                        upvotes,
                        downvotes,
                        netVotes: upvotes - downvotes,
                        userVote,
                      }
                    : song,
                ),
              );
            }
          } catch (error) {
            console.error("Failed to fetch vote counts:", error);
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [setlist.id, songs.length, canVote]);

  const handleDragEnd = (result: any) => {
    if (!result.destination || !canEdit) {
      return;
    }

    const items = Array.from(songs);
    const [reorderedItem] = items.splice(result.source.index, 1);
    if (!reorderedItem) return;
    items.splice(result.destination.index, 0, reorderedItem);

    // Update positions
    const updatedItems = items.map((item, index) => ({
      ...item,
      position: index + 1,
    }));

    setSongs(updatedItems);

    // Save to server
    saveReorder(updatedItems);
  };

  const saveReorder = async (reorderedSongs: SetlistSong[]) => {
    try {
      const updates = reorderedSongs.map((song, index) => ({
        id: song.id,
        position: index + 1,
      }));

      const response = await fetch("/api/setlists/reorder", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          setlistId: setlist.id,
          updates,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to reorder songs");
      }

      onUpdate?.();
    } catch (_error) {
      toast.error("Failed to reorder songs");
      // Revert changes
      setSongs(setlist.songs);
    }
  };

  const removeSong = async (songId: string) => {
    startTransition(async () => {
      try {
        const response = await fetch(
          `/api/setlists/songs?setlistSongId=${songId}`,
          {
            method: "DELETE",
          },
        );

        if (!response.ok) {
          throw new Error("Failed to remove song");
        }

        setSongs(songs.filter((song) => song.id !== songId));
        toast.success("Song removed from setlist");
        onUpdate?.();
      } catch (_error) {
        toast.error("Failed to remove song");
      }
    });
  };

  const updateSongNotes = async (songId: string, notes: string) => {
    try {
      const response = await fetch("/api/setlists/songs/notes", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          setlistSongId: songId,
          notes,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update notes");
      }

      setSongs(
        songs.map((song) => (song.id === songId ? { ...song, notes } : song)),
      );

      onUpdate?.();
    } catch (_error) {
      toast.error("Failed to update notes");
    }
  };

  const toggleLock = async () => {
    startTransition(async () => {
      try {
        const response = await fetch("/api/setlists/lock", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            setlistId: setlist.id,
            isLocked: !setlist.isLocked,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to toggle lock");
        }

        toast.success(setlist.isLocked ? "Setlist unlocked" : "Setlist locked");
        onUpdate?.();
      } catch (_error) {
        toast.error("Failed to toggle lock");
      }
    });
  };

  const handleVote = async (songId: string, voteType: "up" | "down" | null) => {
    // Optimistically update UI
    const previousSongs = [...songs];
    setSongs(
      songs.map((song) => {
        if (song.id === songId) {
          const currentVote = song.userVote;
          const upDelta = voteType === "up" ? 1 : currentVote === "up" ? -1 : 0;
          const downDelta =
            voteType === "down" ? 1 : currentVote === "down" ? -1 : 0;

          return {
            ...song,
            upvotes: song.upvotes + upDelta,
            downvotes: song.downvotes + downDelta,
            netVotes: song.upvotes + upDelta - (song.downvotes + downDelta),
            userVote: voteType,
          };
        }
        return song;
      }),
    );

    try {
      const response = await fetch("/api/songs/votes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          setlistSongId: songId,
          voteType,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to vote");
      }
    } catch (error) {
      // Revert on error
      setSongs(previousSongs);
      toast.error("Failed to save vote");
      throw error;
    }
  };

  const formatDuration = (ms?: number) => {
    if (!ms) {
      return "";
    }
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                {isEditing && canEdit ? (
                  <Input
                    value={setlistName}
                    onChange={(e) => setListName(e.target.value)}
                    className="h-auto border-none p-0 font-semibold text-lg shadow-none"
                  />
                ) : (
                  <CardTitle>{setlistName}</CardTitle>
                )}
                <Badge
                  variant={setlist.type === "actual" ? "default" : "secondary"}
                >
                  {setlist.type}
                </Badge>
                {setlist.isLocked && (
                  <Badge variant="outline" className="gap-1">
                    <Lock className="h-3 w-3" />
                    Locked
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-2 text-muted-foreground text-xs sm:gap-4 sm:text-sm">
                <span>{songs.length} songs</span>
                <span className="hidden sm:inline">
                  {formatDuration(
                    songs.reduce(
                      (acc, song) => acc + (song.song.durationMs || 0),
                      0,
                    ),
                  )}
                </span>
              </div>
            </div>

            {canEdit && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setIsEditing(!isEditing)}>
                    <Edit3 className="mr-2 h-4 w-4" />
                    {isEditing ? "Done Editing" : "Edit Setlist"}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setShowAddSong(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Songs
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={toggleLock} disabled={isPending}>
                    {setlist.isLocked ? (
                      <>
                        <Unlock className="mr-2 h-4 w-4" />
                        Unlock Setlist
                      </>
                    ) : (
                      <>
                        <Lock className="mr-2 h-4 w-4" />
                        Lock Setlist
                      </>
                    )}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </CardHeader>

        <CardContent>
          {songs.length > 0 ? (
            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="setlist">
                {(provided) => (
                  <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className="space-y-2"
                  >
                    {songs.map((song, index) => (
                      <Draggable
                        key={song.id}
                        draggableId={song.id}
                        index={index}
                        isDragDisabled={!canEdit || !isEditing}
                      >
                        {(provided) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className={cn(
                              "flex items-center gap-2 rounded-lg border p-2 transition-colors sm:gap-3 sm:p-3",
                              "hover:bg-muted/50",
                              isEditing && canEdit && "cursor-move",
                            )}
                          >
                            {/* Drag Handle */}
                            {isEditing && canEdit && (
                              <div {...provided.dragHandleProps}>
                                <GripVertical className="h-4 w-4 text-muted-foreground" />
                              </div>
                            )}

                            {/* Position */}
                            <div className="w-6 text-center font-medium text-muted-foreground text-xs sm:w-8 sm:text-sm">
                              {index + 1}
                            </div>

                            {/* Album Art */}
                            <div className="relative h-8 w-8 flex-shrink-0 rounded bg-muted sm:h-10 sm:w-10">
                              {song.song.albumArtUrl ? (
                                <Image
                                  src={song.song.albumArtUrl}
                                  alt={song.song.album || song.song.title}
                                  fill
                                  className="rounded object-cover"
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center">
                                  <Music2 className="h-3 w-3 text-muted-foreground sm:h-4 sm:w-4" />
                                </div>
                              )}
                            </div>

                            {/* Song Info */}
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1 sm:gap-2">
                                <h4 className="truncate font-medium text-sm sm:text-base">
                                  {song.song.title}
                                </h4>
                                {song.song.isExplicit && (
                                  <Badge
                                    variant="outline"
                                    className="text-[10px] sm:text-xs"
                                  >
                                    E
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-1 text-muted-foreground text-xs sm:gap-2 sm:text-sm">
                                <span className="truncate">
                                  {song.song.artist}
                                </span>
                                {song.song.album && (
                                  <>
                                    <span className="hidden sm:inline">•</span>
                                    <span className="hidden truncate sm:inline">
                                      {song.song.album}
                                    </span>
                                  </>
                                )}
                                {song.song.durationMs && (
                                  <>
                                    <span>•</span>
                                    <span className="hidden sm:inline">
                                      {formatDuration(song.song.durationMs)}
                                    </span>
                                  </>
                                )}
                              </div>
                              {(song.notes || isEditing) && (
                                <div className="mt-1">
                                  {isEditing && canEdit ? (
                                    <Input
                                      value={song.notes || ""}
                                      onChange={(e) =>
                                        updateSongNotes(song.id, e.target.value)
                                      }
                                      placeholder="Add notes (acoustic, cover, etc.)"
                                      className="h-6 text-xs"
                                    />
                                  ) : song.notes ? (
                                    <Badge
                                      variant="secondary"
                                      className="text-xs"
                                    >
                                      {song.notes}
                                    </Badge>
                                  ) : null}
                                </div>
                              )}
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-2">
                              {/* Voting */}
                              {canVote && !isEditing && !setlist.isLocked && (
                                <VoteButton
                                  setlistSongId={song.id}
                                  currentVote={song.userVote}
                                  upvotes={song.upvotes}
                                  downvotes={song.downvotes}
                                  onVote={(voteType) =>
                                    handleVote(song.id, voteType)
                                  }
                                  variant="compact"
                                  size="sm"
                                />
                              )}

                              {/* Delete */}
                              {isEditing && canEdit && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive"
                                  onClick={() => removeSong(song.id)}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              )}
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              <Music2 className="mx-auto mb-2 h-8 w-8 opacity-50" />
              <p>No songs added yet</p>
              {canEdit && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={() => setShowAddSong(true)}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Songs
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Song Modal */}
      <AddSongModal
        open={showAddSong}
        onOpenChange={setShowAddSong}
        setlistId={setlist.id}
        artistId={artistId}
        onSongAdded={() => {
          onUpdate?.();
          // Refresh local state
          // In a real app, you'd probably refetch or get the new song from the API response
        }}
      />
    </>
  );
}
