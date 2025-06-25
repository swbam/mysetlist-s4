'use client';

import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';

type VoteUpdate = {
  setlistSongId: string;
  upvotes: number;
  downvotes: number;
  netVotes: number;
  userVote?: 'up' | 'down' | null;
};

interface UseRealtimeVotesOptions {
  setlistSongIds: string[];
  userId?: string;
  onVoteUpdate?: (update: VoteUpdate) => void;
}

export function useRealtimeVotes({ 
  setlistSongIds, 
  userId,
  onVoteUpdate 
}: UseRealtimeVotesOptions) {
  const [voteCounts, setVoteCounts] = useState<Record<string, VoteUpdate>>({});
  const [isSubscribed, setIsSubscribed] = useState(false);
  const supabase = createClient();
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (setlistSongIds.length === 0) return;

    const setupSubscription = async () => {
      // Clean up existing subscription
      if (channelRef.current) {
        await supabase.removeChannel(channelRef.current);
      }

      // Create new subscription
      const channel = supabase
        .channel(`votes-${setlistSongIds.join('-')}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'votes',
            filter: `setlist_song_id=in.(${setlistSongIds.join(',')})`,
          },
          async (payload: RealtimePostgresChangesPayload<any>) => {
            // When a vote changes, fetch the updated counts
            const setlistSongId = payload.new?.setlist_song_id || payload.old?.setlist_song_id;
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
      for (const songId of setlistSongIds) {
        await fetchVoteCounts(songId);
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
          
          setVoteCounts(prev => ({
            ...prev,
            [setlistSongId]: update,
          }));
          
          if (onVoteUpdate) {
            onVoteUpdate(update);
          }
        }
      } catch (error) {
        console.error('Failed to fetch vote counts:', error);
      }
    };

    setupSubscription();
    fetchInitialCounts();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [setlistSongIds.join(','), userId, supabase]);

  const vote = async (setlistSongId: string, voteType: 'up' | 'down' | null) => {
    try {
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
        
        setVoteCounts(prev => ({
          ...prev,
          [setlistSongId]: update,
        }));
        
        if (onVoteUpdate) {
          onVoteUpdate(update);
        }
        
        return result;
      }
    } catch (error) {
      console.error('Failed to vote:', error);
      throw error;
    }
  };

  return {
    voteCounts,
    isSubscribed,
    vote,
  };
}