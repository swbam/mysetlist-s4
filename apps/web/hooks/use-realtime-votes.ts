'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

interface SongVote {
  id: string;
  song_id: string;
  user_id: string;
  vote_type: 'up' | 'down';
  created_at: string;
}

interface VoteCount {
  upvotes: number;
  downvotes: number;
  userVote: 'up' | 'down' | null;
}

interface UseRealtimeVotesOptions {
  songId: string;
  userId?: string;
  onVoteChange?: (votes: VoteCount) => void;
}

export function useRealtimeVotes({ 
  songId, 
  userId,
  onVoteChange 
}: UseRealtimeVotesOptions) {
  const [votes, setVotes] = useState<VoteCount>({
    upvotes: 0,
    downvotes: 0,
    userVote: null,
  });
  const [isLoading, setIsLoading] = useState(false);
  const supabase = createClient();

  // Fetch current vote counts
  const fetchVoteCounts = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Get vote counts
      const { data: votesData, error: votesError } = await supabase
        .from('song_votes')
        .select('vote_type')
        .eq('song_id', songId);

      if (!votesError && votesData) {
        const upvotes = votesData.filter(v => v.vote_type === 'up').length;
        const downvotes = votesData.filter(v => v.vote_type === 'down').length;

        // Get user's vote if userId is provided
        let userVote: 'up' | 'down' | null = null;
        if (userId) {
          const { data: userVoteData } = await supabase
            .from('song_votes')
            .select('vote_type')
            .eq('song_id', songId)
            .eq('user_id', userId)
            .single();

          if (userVoteData) {
            userVote = userVoteData.vote_type;
          }
        }

        const newVotes = { upvotes, downvotes, userVote };
        setVotes(newVotes);
        onVoteChange?.(newVotes);
      }
    } catch (error) {
      console.error('Error fetching vote counts:', error);
    } finally {
      setIsLoading(false);
    }
  }, [songId, userId, supabase, onVoteChange]);

  useEffect(() => {
    // Initial fetch
    fetchVoteCounts();

    // Subscribe to vote changes
    const channel = supabase
      .channel(`song-votes-${songId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'song_votes',
          filter: `song_id=eq.${songId}`,
        },
        (payload: RealtimePostgresChangesPayload<SongVote>) => {
          if (payload.eventType === 'INSERT' && payload.new) {
            setVotes(prev => {
              const newVotes = { ...prev };
              if (payload.new.vote_type === 'up') {
                newVotes.upvotes += 1;
              } else {
                newVotes.downvotes += 1;
              }
              
              if (userId && payload.new.user_id === userId) {
                newVotes.userVote = payload.new.vote_type;
              }
              
              onVoteChange?.(newVotes);
              return newVotes;
            });
          } else if (payload.eventType === 'DELETE' && payload.old) {
            setVotes(prev => {
              const newVotes = { ...prev };
              if (payload.old.vote_type === 'up') {
                newVotes.upvotes = Math.max(0, newVotes.upvotes - 1);
              } else {
                newVotes.downvotes = Math.max(0, newVotes.downvotes - 1);
              }
              
              if (userId && payload.old.user_id === userId) {
                newVotes.userVote = null;
              }
              
              onVoteChange?.(newVotes);
              return newVotes;
            });
          } else if (payload.eventType === 'UPDATE' && payload.new && payload.old) {
            setVotes(prev => {
              const newVotes = { ...prev };
              
              // Handle vote type change
              if (payload.old.vote_type === 'up') {
                newVotes.upvotes = Math.max(0, newVotes.upvotes - 1);
              } else {
                newVotes.downvotes = Math.max(0, newVotes.downvotes - 1);
              }
              
              if (payload.new.vote_type === 'up') {
                newVotes.upvotes += 1;
              } else {
                newVotes.downvotes += 1;
              }
              
              if (userId && payload.new.user_id === userId) {
                newVotes.userVote = payload.new.vote_type;
              }
              
              onVoteChange?.(newVotes);
              return newVotes;
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [songId, userId, supabase, fetchVoteCounts, onVoteChange]);

  return {
    votes,
    isLoading,
    refetch: fetchVoteCounts,
  };
}