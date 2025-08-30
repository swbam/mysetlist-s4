"use client";

import { Button } from "@repo/design-system";
import { Card } from "@repo/design-system";
import { Progress } from "@repo/design-system";
import { cn } from "@repo/design-system";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, ChevronUp, Music, Sparkles, Users } from "lucide-react";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "~/app/providers/auth-provider";
import { createClient } from "~/lib/supabase/client";

interface Song {
  id: string;
  title: string;
  artist: string;
  duration?: number;
  spotifyId?: string;
  votes: number;
  userVote?: "up" | "down" | null;
}

interface RealTimeVotingProps {
  showId: string;
  setlistId?: string;
  songs: Song[];
  className?: string;
  onVoteUpdate?: (songId: string, newVoteCount: number) => void;
}

const VoteButton = React.memo(function VoteButton({
  type,
  active,
  onClick,
  disabled,
  count,
}: {
  type: "up" | "down";
  active: boolean;
  onClick: () => void;
  disabled: boolean;
  count?: number;
}) {
  return (
    <Button
      size="sm"
      variant={active ? "default" : "outline"}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "gap-1.5 transition-all",
        type === "up" && active && "bg-green-600 hover:bg-green-700",
        type === "down" && active && "bg-red-600 hover:bg-red-700",
      )}
    >
      {type === "up" ? (
        <ChevronUp className="h-4 w-4" />
      ) : (
        <ChevronDown className="h-4 w-4" />
      )}
      {count !== undefined && <span className="font-medium">{count}</span>}
    </Button>
  );
});

const SongCard = React.memo(function SongCard({
  song,
  rank,
  totalVotes,
  onVote,
  isVoting,
}: {
  song: Song;
  rank: number;
  totalVotes: number;
  onVote: (type: "up" | "down") => void;
  isVoting: boolean;
}) {
  const votePercentage = totalVotes > 0 ? (song.votes / totalVotes) * 100 : 0;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="overflow-hidden border-border/50 bg-card/50 backdrop-blur-sm">
        <div className="p-4">
          <div className="flex items-center justify-between gap-4">
            {/* Rank and Song Info */}
            <div className="flex min-w-0 flex-1 items-center gap-4">
              <div className="relative">
                <div
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-full font-bold text-lg",
                    rank === 1 && "bg-yellow-500/20 text-yellow-500",
                    rank === 2 && "bg-gray-400/20 text-gray-400",
                    rank === 3 && "bg-orange-600/20 text-orange-600",
                    rank > 3 && "bg-muted text-muted-foreground",
                  )}
                >
                  {rank}
                </div>
                {rank <= 3 && (
                  <motion.div
                    className="-top-1 -right-1 absolute"
                    animate={{ rotate: [0, 10, -10, 0] }}
                    transition={{
                      duration: 2,
                      repeat: Number.POSITIVE_INFINITY,
                      repeatDelay: 3,
                    }}
                  >
                    <Sparkles className="h-4 w-4 text-yellow-500" />
                  </motion.div>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <h4 className="truncate font-semibold text-base">
                  {song.title}
                </h4>
                <p className="truncate text-muted-foreground text-sm">
                  {song.artist}
                  {song.duration && (
                    <span className="ml-2">
                      • {Math.floor(song.duration / 60)}:
                      {(song.duration % 60).toString().padStart(2, "0")}
                    </span>
                  )}
                </p>
              </div>
            </div>

            {/* Vote Controls */}
            <div className="flex items-center gap-2">
              <VoteButton
                type="down"
                active={song.userVote === "down"}
                onClick={() => onVote("down")}
                disabled={isVoting}
              />

              <div className="min-w-[60px] text-center">
                <motion.div
                  key={song.votes}
                  initial={{ scale: 1.2 }}
                  animate={{ scale: 1 }}
                  className="font-bold text-lg"
                >
                  {song.votes}
                </motion.div>
                <div className="text-muted-foreground text-xs">votes</div>
              </div>

              <VoteButton
                type="up"
                active={song.userVote === "up"}
                onClick={() => onVote("up")}
                disabled={isVoting}
              />
            </div>
          </div>

          {/* Vote Progress Bar */}
          <div className="mt-3">
            <Progress value={votePercentage} className="h-2" />
            <p className="mt-1 text-muted-foreground text-xs">
              {votePercentage.toFixed(1)}% of total votes
            </p>
          </div>
        </div>
      </Card>
    </motion.div>
  );
});

export const RealTimeVoting = React.memo(function RealTimeVoting({
  showId,
  setlistId,
  songs: initialSongs,
  className,
  onVoteUpdate: _onVoteUpdate,
}: RealTimeVotingProps) {
  const { user } = useAuth();
  const [songs, setSongs] = useState(initialSongs);
  const [votingStates, setVotingStates] = useState<Record<string, boolean>>({});
  const [activeVoters, setActiveVoters] = useState(0);

  const supabase = createClient();

  // Calculate total votes
  const totalVotes = useMemo(
    () => songs.reduce((sum, song) => sum + song.votes, 0),
    [songs],
  );

  // Sort songs by votes
  const sortedSongs = useMemo(
    () => [...songs].sort((a, b) => b.votes - a.votes),
    [songs],
  );

  // Handle voting
  const handleVote = useCallback(
    async (songId: string, voteType: "up" | "down") => {
      if (!user) {
        toast.error("Please sign in to vote");
        return;
      }

      setVotingStates((prev) => ({ ...prev, [songId]: true }));

      try {
        const song = songs.find((s) => s.id === songId);
        if (!song) {
          return;
        }

        // Optimistic update
        setSongs((prevSongs) =>
          prevSongs.map((s) => {
            if (s.id !== songId) {
              return s;
            }

            let newVotes = s.votes;
            let newUserVote: "up" | "down" | null = voteType;

            // Handle vote logic
            if (s.userVote === voteType) {
              // Remove vote
              newVotes = voteType === "up" ? s.votes - 1 : s.votes + 1;
              newUserVote = null;
            } else if (s.userVote) {
              // Change vote
              newVotes = voteType === "up" ? s.votes + 2 : s.votes - 2;
            } else {
              // New vote
              newVotes = voteType === "up" ? s.votes + 1 : s.votes - 1;
            }

            return { ...s, votes: newVotes, userVote: newUserVote };
          }),
        );

        // Send to server
        const { error } = await supabase.rpc("cast_vote", {
          p_userId: user.id,
          p_song_id: songId,
          p_showId: showId,
          p_setlist_id: setlistId,
          p_vote_type: voteType,
        });

        if (error) {
          throw error;
        }

        toast.success("Vote recorded!");
      } catch (_error) {
        toast.error("Failed to record vote");

        // Revert optimistic update
        setSongs(initialSongs);
      } finally {
        setVotingStates((prev) => ({ ...prev, [songId]: false }));
      }
    },
    [user, songs, showId, setlistId, supabase, initialSongs],
  );

  // Subscribe to real-time updates
  useEffect(() => {
    if (!showId) {
      return;
    }

    const channel = supabase
      .channel(`votes:${showId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_votes",
          filter: `showId=eq.${showId}`,
        },
        (payload) => {
          // Update active voters count
          if (payload.eventType === "INSERT") {
            setActiveVoters((prev) => prev + 1);
          }
        },
      )
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        setActiveVoters(Object.keys(state).length);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [showId, supabase]);

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-lg">Vote for Songs</h3>
          <p className="text-muted-foreground text-sm">
            Help predict the setlist by voting for your favorite songs
          </p>
        </div>

        {activeVoters > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1.5"
          >
            <Users className="h-4 w-4 text-primary" />
            <span className="font-medium text-sm">
              {activeVoters} {activeVoters === 1 ? "person" : "people"} voting
            </span>
            <div className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
          </motion.div>
        )}
      </div>

      {/* Songs List */}
      {sortedSongs.length > 0 ? (
        <AnimatePresence mode="popLayout">
          <div className="space-y-3">
            {sortedSongs.map((song, index) => (
              <SongCard
                key={song.id}
                song={song}
                rank={index + 1}
                totalVotes={totalVotes}
                onVote={(type) => handleVote(song.id, type)}
                isVoting={votingStates[song.id] || false}
              />
            ))}
          </div>
        </AnimatePresence>
      ) : (
        <Card className="p-8 text-center">
          <Music className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
          <p className="text-muted-foreground">
            No songs available for voting yet
          </p>
        </Card>
      )}
    </div>
  );
});
