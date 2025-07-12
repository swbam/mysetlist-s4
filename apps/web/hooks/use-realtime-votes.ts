'use client';

import type {
  RealtimeChannel,
  RealtimePostgresChangesPayload,
} from '@supabase/supabase-js';
import { useEffect, useRef, useState } from 'react';
import { createClient } from '~/lib/supabase/client';

type VoteData = {
  upvotes: number;
  downvotes: number;
  netVotes: number;
  userVote?: 'up' | 'down' | null;
};

type VoteUpdate = {
  setlistSongId: string;
  upvotes: number;
  downvotes: number;
  netVotes: number;
  userVote?: 'up' | 'down' | null;
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
    downvotes: 0,
    netVotes: 0,
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
        .channel(`votes-${effectiveSongIds.join('-')}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'votes',
            filter: `setlist_song_id=in.(${effectiveSongIds.join(',')})`,
          },
          async (payload: RealtimePostgresChangesPayload<any>) => {
            // When a vote changes, fetch the updated counts
            const setlistSongId =
              (payload.new as any)?.['setlist_song_id'] || (payload.old as any)?.['setlist_song_id'];
            if (setlistSongId) {
              await fetchVoteCounts(setlistSongId);
            }
          }
        )
        .subscribe((status) => {
          setIsSubscribed(status === 'SUBSCRIBED');
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
        const response = await fetch(`/api/votes/${setlistSongId}/count`);
        if (response.ok) {
          const data = await response.json();
          const update: VoteUpdate = {
            setlistSongId,
            upvotes: data.upvotes,
            downvotes: data.downvotes,
            netVotes: data.netVotes,
            userVote: data.userVote,
          };

          setVoteCounts((prev) => ({
            ...prev,
            [setlistSongId]: update,
          }));

          // For single song interface
          if (songId === setlistSongId) {
            const voteData: VoteData = {
              upvotes: data.upvotes,
              downvotes: data.downvotes,
              netVotes: data.netVotes,
              userVote: data.userVote,
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
  }, [effectiveSongIds.join(','), userId, supabase]);

  const vote = async (
    setlistSongId: string,
    voteType: 'up' | 'down' | null
  ) => {
    const response = await fetch('/api/votes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        setlistSongId,
        voteType,
      }),
    });

    if (response.ok) {
      const result = await response.json();

      // Update local state immediately
      const update: VoteUpdate = {
        setlistSongId,
        upvotes: result.upvotes,
        downvotes: result.downvotes,
        netVotes: result.netVotes,
        userVote: result.userVote,
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
