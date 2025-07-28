"use client";

import { Button } from "@repo/design-system/components/ui/button";
import { ChevronUp, ChevronDown } from "lucide-react";
import { useEffect, useState, useCallback } from "react";
import { createClient } from "~/lib/supabase/client";
import { useRealtimeConnection } from "~/app/providers/realtime-provider";

interface VoteData {
  upvotes: number;
  downvotes: number;
  netVotes: number;
  userVote: "up" | "down" | null;
}

interface RealtimeVotingProps {
  setlistSongId: string;
  initialVotes: VoteData;
  userId?: string;
}

export function RealtimeVoting({
  setlistSongId,
  initialVotes,
  userId,
}: RealtimeVotingProps) {
  const [votes, setVotes] = useState<VoteData>(initialVotes);
  const [isVoting, setIsVoting] = useState(false);
  const { isConnected, isRealtimeEnabled } = useRealtimeConnection();

  // Subscribe to real-time vote updates
  useEffect(() => {
    if (!isRealtimeEnabled || !isConnected) {
      return;
    }

    const supabase = createClient();

    // Subscribe to setlist_songs table changes for this specific song
    const channel = supabase
      .channel(`setlist-song-${setlistSongId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "setlist_songs",
          filter: `id=eq.${setlistSongId}`,
        },
        (payload) => {
          const newData = payload.new as any;
          setVotes((prev) => ({
            ...prev,
            upvotes: newData.upvotes || 0,
            downvotes: newData.downvotes || 0,
            netVotes: newData.net_votes || 0,
          }));
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [setlistSongId, isConnected, isRealtimeEnabled]);

  const handleVote = useCallback(
    async (voteType: "up" | "down" | null) => {
      if (!userId) {
        // Redirect to login or show login modal
        return;
      }

      if (isVoting) return;

      setIsVoting(true);

      try {
        // Optimistic update
        const previousVotes = votes;
        const newUserVote = votes.userVote === voteType ? null : voteType;

        let newUpvotes = votes.upvotes;
        let newDownvotes = votes.downvotes;

        // Remove previous vote
        if (votes.userVote === "up") {
          newUpvotes--;
        } else if (votes.userVote === "down") {
          newDownvotes--;
        }

        // Add new vote
        if (newUserVote === "up") {
          newUpvotes++;
        } else if (newUserVote === "down") {
          newDownvotes++;
        }

        const newNetVotes = newUpvotes - newDownvotes;

        setVotes({
          upvotes: newUpvotes,
          downvotes: newDownvotes,
          netVotes: newNetVotes,
          userVote: newUserVote,
        });

        // Send vote to API
        const response = await fetch("/api/votes", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            setlistSongId,
            voteType: newUserVote,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to vote");
        }

        const result = await response.json();

        // Update with server response (in case of conflicts)
        setVotes({
          upvotes: result.upvotes,
          downvotes: result.downvotes,
          netVotes: result.netVotes,
          userVote: result.userVote,
        });
      } catch (error) {
        console.error("Voting error:", error);
        // Revert optimistic update on error
        setVotes(votes);
      } finally {
        setIsVoting(false);
      }
    },
    [setlistSongId, userId, votes, isVoting],
  );

  return (
    <div className="flex items-center gap-2">
      <Button
        variant={votes.userVote === "up" ? "default" : "outline"}
        size="sm"
        onClick={() => handleVote("up")}
        disabled={isVoting || !userId}
        className="flex items-center gap-1"
      >
        <ChevronUp className="h-4 w-4" />
        {votes.upvotes}
      </Button>

      <span className="text-sm font-medium text-muted-foreground">
        {votes.netVotes > 0 ? "+" : ""}
        {votes.netVotes}
      </span>

      <Button
        variant={votes.userVote === "down" ? "default" : "outline"}
        size="sm"
        onClick={() => handleVote("down")}
        disabled={isVoting || !userId}
        className="flex items-center gap-1"
      >
        <ChevronDown className="h-4 w-4" />
        {votes.downvotes}
      </Button>

      {!isRealtimeEnabled && (
        <span className="text-xs text-muted-foreground ml-2">
          (Live updates disabled)
        </span>
      )}
    </div>
  );
}
