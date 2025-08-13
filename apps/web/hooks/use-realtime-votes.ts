"use client";

import type {
  RealtimeChannel,
  RealtimePostgresChangesPayload,
} from "@supabase/supabase-js";
import { useEffect, useRef, useState } from "react";
import { createClient } from "~/lib/supabase/client";

type VoteData = {
  upvotes: number;
  userVote?: "up" | null;
};

type VoteUpdate = {
  setlistSongId: string;
  upvotes: number;
  userVote?: "up" | null;
};

interface UseRealtimeVotesOptions {
  songId?: string | undefined;
  setlistSongIds?: string[] | undefined;
  userId?: string | undefined;
  onVoteUpdate?: ((update: VoteUpdate) => void) | undefined;
  onVoteChange?: ((votes: VoteData) => void) | undefined;
}

export function useRealtimeVotes({
  songId,
  setlistSongIds,
  userId,
  onVoteUpdate,
  onVoteChange,
}: UseRealtimeVotesOptions) {
  const [voteCounts, setVoteCounts] = useState<Record<string, VoteUpdate>>({});
  const [isSubscribed, setIsSubscribed] = useState(false);
  const supabase = createClient();
  const channelRef = useRef<RealtimeChannel | null>(null);

  // For single song interface
  const [votes, setVotes] = useState<VoteData>({
    upvotes: 0,
    userVote: null,
  });

  const effectiveSongIds = songId ? [songId] : setlistSongIds || [];

  useEffect(() => {
    if (effectiveSongIds.length === 0) {
      return;
    }

    const setupSubscription = async () => {
      // Clean up existing subscription
      if (channelRef.current) {
        await supabase.removeChannel(channelRef.current);
      }

      // Create new subscription
      const channel = supabase
        .channel(`votes-${effectiveSongIds.join("-")}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "votes",
            filter: `setlist_song_id=in.(${effectiveSongIds.join(",")})`,
          },
          async (payload: RealtimePostgresChangesPayload<any>) => {
            // When a vote changes, fetch the updated counts
            const setlistSongId =
              (payload.new as any)?.setlist_song_id ||
              (payload.old as any)?.setlist_song_id;
            if (setlistSongId) {
              await fetchVoteCounts(setlistSongId);
            }
          },
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "setlist_songs",
            filter: `id=in.(${effectiveSongIds.join(",")})`,
          },
          async (payload: RealtimePostgresChangesPayload<any>) => {
            // When setlist_songs vote counts update, fetch the updated counts
            const setlistSongId = (payload.new as any)?.id;
            if (setlistSongId) {
              await fetchVoteCounts(setlistSongId);
            }
          },
        )
        .subscribe((status) => {
          setIsSubscribed(status === "SUBSCRIBED");
        });

      channelRef.current = channel;
    };

    // Fetch initial vote counts
    const fetchInitialCounts = async () => {
      for (const id of effectiveSongIds) {
        await fetchVoteCounts(id);
      }
    };

    const fetchVoteCounts = async (setlistSongId: string) => {
      try {
        // Fetch vote counts from the API
        const response = await fetch(
          `/api/votes?setlistSongId=${setlistSongId}`,
        );
        if (response.ok) {
          const data = await response.json();
          const update: VoteUpdate = {
            setlistSongId,
            upvotes: data.up || 0,
            userVote: data.currentUserUpvoted ? "up" : null,
          };

          setVoteCounts((prev) => ({
            ...prev,
            [setlistSongId]: update,
          }));

          // For single song interface
          if (songId === setlistSongId) {
            const voteData: VoteData = {
              upvotes: data.up || 0,
              userVote: data.currentUserUpvoted ? "up" : null,
            };
            setVotes(voteData);

            if (onVoteChange) {
              onVoteChange(voteData);
            }
          }

          if (onVoteUpdate) {
            onVoteUpdate(update);
          }
        }
      } catch (_error) {}
    };

    setupSubscription();
    fetchInitialCounts();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [effectiveSongIds.join(","), userId, supabase]);

  const vote = async (setlistSongId: string, voteType: "up" | null) => {
    const response = await fetch("/api/votes", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        setlistSongId,
      }),
    });

    if (response.ok) {
      const result = await response.json();

      // Update local state immediately
      const update: VoteUpdate = {
        setlistSongId,
        upvotes: result.up || 0,
        userVote: result.currentUserUpvoted ? "up" : null,
      };

      setVoteCounts((prev) => ({
        ...prev,
        [setlistSongId]: update,
      }));

      if (onVoteUpdate) {
        onVoteUpdate(update);
      }

      return result;
    }
  };

  return {
    voteCounts,
    isSubscribed,
    vote,
    votes, // For single song interface
  };
}
