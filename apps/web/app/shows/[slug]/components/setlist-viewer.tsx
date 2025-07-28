"use client";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@repo/design-system/components/ui/avatar";
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
import { formatDistanceToNow } from "date-fns";
import {
  ArrowUpDown,
  CheckCircle,
  Clock,
  Edit,
  Lock,
  MoreVertical,
  Music2,
  User,
} from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { useAuth } from "~/app/providers/auth-provider";
import { AnonymousAddSongButton } from "~/components/anonymous-add-song-button";
import { createClient } from "~/lib/supabase/client";
import { lockSetlist, removeSongFromSetlist } from "../actions";
import { AnonymousAddSongDialog } from "./anonymous-add-song-dialog";
import { ReorderableSetlist } from "./reorderable-setlist";
import { SongItem } from "./song-item";

type SetlistViewerProps = {
  setlist: any;
  show: any;
  currentUser: any;
  type: "actual" | "predicted";
};

export function SetlistViewer({
  setlist,
  show,
  currentUser,
  type,
}: SetlistViewerProps) {
  const { session } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [showAddSong, setShowAddSong] = useState(false);
  const [isReordering, setIsReordering] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [setlistData, setSetlistData] = useState(setlist);

  const isOwner = currentUser?.id === setlistData.created_by;
  const canEdit = isOwner && !setlistData.is_locked;
  const totalSongs = setlistData.setlist_songs?.length || 0;
  const totalDuration =
    setlistData.setlist_songs?.reduce((acc: number, item: any) => {
      return acc + (item.song?.duration_ms || 0);
    }, 0) || 0;

  // Set up real-time subscription for votes
  useEffect(() => {
    const supabase = createClient();

    // Subscribe to vote changes for this setlist
    const channel = supabase
      .channel(`setlist-votes-${setlist.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "votes",
          filter: `setlist_song_id=in.(${setlistData.setlist_songs?.map((s: any) => s.id).join(",")})`,
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
            .eq("id", setlist.id)
            .single();

          if (!error && data) {
            // Process vote counts for each song
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
                  item.votes?.find((v: any) => v.user_id === currentUser?.id)
                    ?.vote_type || null,
              })),
            };
            setSetlistData(processedData);
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [setlist.id, currentUser?.id, setlistData.setlist_songs]);

  const formatDuration = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return hours > 0 ? `${hours}h ${remainingMinutes}m` : `${minutes}m`;
  };

  const handleLockSetlist = () => {
    startTransition(async () => {
      try {
        await lockSetlist(setlistData.id);
        toast.success("Setlist locked successfully");
      } catch (_error) {
        toast.error("Failed to lock setlist");
      }
    });
  };

  const handleDeleteSong = (setlistSongId: string) => {
    startTransition(async () => {
      try {
        await removeSongFromSetlist(setlistSongId);
        toast.success("Song removed from setlist");
      } catch (_error) {
        toast.error("Failed to remove song");
      }
    });
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <CardTitle>{setlistData.name || "Main Set"}</CardTitle>
                <Badge variant={type === "actual" ? "default" : "secondary"}>
                  {type}
                </Badge>
                {setlistData.is_locked && (
                  <Badge variant="outline" className="gap-1">
                    <Lock className="h-3 w-3" />
                    Locked
                  </Badge>
                )}
                {setlistData.accuracy_score > 90 && (
                  <Badge
                    variant="outline"
                    className="gap-1 border-green-600 text-green-600"
                  >
                    <CheckCircle className="h-3 w-3" />
                    Verified
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-4 text-muted-foreground text-sm">
                <div className="flex items-center gap-1">
                  <Music2 className="h-3 w-3" />
                  {totalSongs} songs
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatDuration(totalDuration)}
                </div>
                <div className="flex items-center gap-2">
                  <Avatar className="h-4 w-4">
                    <AvatarImage src={setlistData.creator?.avatar_url} />
                    <AvatarFallback>
                      <User className="h-3 w-3" />
                    </AvatarFallback>
                  </Avatar>
                  <span>
                    {setlistData.creator?.display_name || "Anonymous"}
                  </span>
                </div>
                <span>•</span>
                <span>
                  {formatDistanceToNow(new Date(setlistData.created_at))} ago
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Add Song button for anonymous users */}
              {!session && !setlistData.is_locked && (
                <AnonymousAddSongButton
                  setlistId={setlistData.id}
                  isAuthenticated={false}
                  onClick={() => setShowAddSong(true)}
                />
              )}

              {canEdit && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setIsEditing(!isEditing)}>
                      <Edit className="mr-2 h-4 w-4" />
                      {isEditing ? "Done Editing" : "Edit Setlist"}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setShowAddSong(true)}>
                      <Music2 className="mr-2 h-4 w-4" />
                      Add Songs
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setIsReordering(!isReordering)}
                    >
                      <ArrowUpDown className="mr-2 h-4 w-4" />
                      {isReordering ? "Stop Reordering" : "Reorder Songs"}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={handleLockSetlist}
                      disabled={isPending}
                    >
                      <Lock className="mr-2 h-4 w-4" />
                      Lock Setlist
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {setlistData.setlist_songs && setlistData.setlist_songs.length > 0 ? (
            isReordering ? (
              <ReorderableSetlist
                setlist={setlistData}
                show={show}
                currentUser={currentUser}
                onReorder={() => setIsReordering(false)}
                onCancel={() => setIsReordering(false)}
              />
            ) : (
              <div className="space-y-2">
                {setlistData.setlist_songs.map((item: any, index: number) => (
                  <SongItem
                    key={item.id}
                    item={item}
                    index={index}
                    isEditing={isEditing}
                    canVote={!setlistData.is_locked}
                    onDelete={() => handleDeleteSong(item.id)}
                  />
                ))}
              </div>
            )
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              <Music2 className="mx-auto mb-2 h-8 w-8 opacity-50" />
              <p>No songs added yet</p>
              {(canEdit || !session) && !setlistData.is_locked && (
                <AnonymousAddSongButton
                  setlistId={setlistData.id}
                  isAuthenticated={!!session}
                  onClick={() => setShowAddSong(true)}
                />
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Song Dialog */}
      {showAddSong && (
        <AnonymousAddSongDialog
          setlistId={setlistData.id}
          artistId={show.headliner_artist.id}
          open={showAddSong}
          onOpenChange={setShowAddSong}
          isAuthenticated={!!session}
        />
      )}
    </>
  );
}
