"use client";

import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import { cn } from "@repo/design-system/lib/utils";
import { ExternalLink, GripVertical, Music, Trash2 } from "lucide-react";
import Image from "next/image";
import { useTransition } from "react";
import { toast } from "sonner";
import { useAuth } from "~/app/providers/auth-provider";
import { MobileVoteButton } from "~/components/mobile/mobile-vote-button";
import { AnonymousVoteButton } from "~/components/voting/anonymous-vote-button";
import { useRealtimeVotes } from "~/hooks/use-realtime-votes";
import { voteSong } from "../actions";

type SongItemProps = {
  item: {
    id: string;
    upvotes: number;
    downvotes: number;
    userVote: "up" | "down" | null;
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
  };
  index: number;
  isEditing: boolean;
  canVote: boolean;
  onDelete: () => void;
};

export function SongItem({
  item,
  index,
  isEditing,
  canVote,
  onDelete,
}: SongItemProps) {
  const { session } = useAuth();
  const [isPending, startTransition] = useTransition();

  // Use real-time votes hook
  const { votes } = useRealtimeVotes({
    songId: item.id,
    ...(session?.user?.id && { userId: session.user.id }),
  });

  // Use real-time data if available, otherwise fall back to props
  const upvotes = votes.upvotes || item.upvotes || 0;
  const downvotes = votes.downvotes || item.downvotes || 0;

  const song = item.song;
  const position = index + 1;

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  const handleVote = (voteType: "up" | "down") => {
    if (!canVote) {
      return;
    }

    startTransition(async () => {
      try {
        // The vote action will trigger real-time updates
        await voteSong(item.id, voteType);
        // Don't manually update state - real-time hook will handle it
      } catch (error: any) {
        if (error.message.includes("logged in")) {
          toast.error("Please sign in to vote");
        } else {
          toast.error("Failed to vote");
        }
      }
    });
  };

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg p-3 transition-colors",
        "hover:bg-muted/50",
        isEditing && "cursor-move",
      )}
    >
      {/* Drag Handle */}
      {isEditing && <GripVertical className="h-4 w-4 text-muted-foreground" />}

      {/* Position */}
      <div className="w-8 text-center font-medium text-muted-foreground text-sm">
        {position}
      </div>

      {/* Album Art */}
      <div className="relative h-10 w-10 flex-shrink-0 rounded bg-muted">
        {song.albumArtUrl ? (
          <Image
            src={song.albumArtUrl}
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
          <h4 className="truncate font-medium">{song.title}</h4>
          {item.notes && (
            <Badge variant="secondary" className="text-xs">
              {item.notes}
            </Badge>
          )}
          {song.isExplicit && (
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
          {song.durationMs && (
            <>
              <span>•</span>
              <span>{formatDuration(song.durationMs)}</span>
            </>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {/* Voting */}
        {canVote && !isEditing && (
          <>
            {/* Desktop Vote Button */}
            <div className="hidden md:block">
              <AnonymousVoteButton
                setlistSongId={item.id}
                initialUpvotes={upvotes}
                initialDownvotes={downvotes}
                isAuthenticated={!!session}
                onVote={async (voteType) => {
                  if (voteType === "up") {
                    await handleVote("up");
                  } else if (voteType === "down") {
                    await handleVote("down");
                  }
                }}
                variant="compact"
                size="sm"
                disabled={isPending}
              />
            </div>

            {/* Mobile Vote Button */}
            <div className="block md:hidden">
              <MobileVoteButton
                songId={item.id}
                onVote={async (_songId, voteType) => {
                  if (voteType === "up") {
                    await handleVote("up");
                  } else if (voteType === "down") {
                    await handleVote("down");
                  }
                }}
                compact={true}
                disabled={isPending}
                hapticFeedback={true}
              />
            </div>
          </>
        )}

        {/* Spotify Link */}
        {song.spotifyId && (
          <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
            <a
              href={`https://open.spotify.com/track/${song.spotifyId}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink className="h-3 w-3" />
            </a>
          </Button>
        )}

        {/* Delete */}
        {isEditing && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive"
            onClick={onDelete}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        )}
      </div>
    </div>
  );
}
