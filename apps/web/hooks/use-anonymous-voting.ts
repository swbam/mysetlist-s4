"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

interface Vote {
  setlistSongId: string;
  voteType: "up";
  timestamp: number;
}

interface UseAnonymousVotingOptions {
  onVoteLimitReached?: () => void;
}

interface UseAnonymousVotingReturn {
  vote: (
    setlistSongId: string,
    voteType: "up" | null,
  ) => Promise<void>;
  getVote: (setlistSongId: string) => "up" | null;
  syncVotes: () => Promise<void>;
  votesRemaining: number;
  sessionId: string;
  hasVotes: boolean;
}

const STORAGE_KEY = "mysetlist_anonymous_votes";
const SESSION_KEY = "mysetlist_session_id";
const DAILY_VOTE_LIMIT = 50;

export function useAnonymousVoting({
  onVoteLimitReached,
}: UseAnonymousVotingOptions = {}): UseAnonymousVotingReturn {
  const [votes, setVotes] = useState<Record<string, Vote>>({});
  const [sessionId, setSessionId] = useState<string>("");
  const [votesRemaining, setVotesRemaining] = useState(DAILY_VOTE_LIMIT);

  // Initialize session and load votes from localStorage
  useEffect(() => {
    // Get or create session ID
    let storedSessionId = localStorage.getItem(SESSION_KEY);
    if (!storedSessionId) {
      storedSessionId = `anon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem(SESSION_KEY, storedSessionId);
    }
    setSessionId(storedSessionId);

    // Load stored votes
    try {
      const storedVotes = localStorage.getItem(STORAGE_KEY);
      if (storedVotes) {
        const parsedVotes = JSON.parse(storedVotes);

        // Filter votes from today only
        const today = new Date().toDateString();
        const todayVotes: Record<string, Vote> = {};

        for (const [key, vote] of Object.entries(parsedVotes)) {
          const typedVote = vote as Vote;
          const voteDate = new Date(typedVote.timestamp).toDateString();
          if (voteDate === today) {
            todayVotes[key] = typedVote;
          }
        }

        setVotes(todayVotes);
        setVotesRemaining(
          Math.max(0, DAILY_VOTE_LIMIT - Object.keys(todayVotes).length),
        );
      }
    } catch (error) {
      console.warn("Failed to load anonymous votes:", error);
    }
  }, []);

  // Save votes to localStorage whenever votes change
  useEffect(() => {
    if (Object.keys(votes).length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(votes));
    }
  }, [votes]);

  const vote = useCallback(
    async (setlistSongId: string, voteType: "up" | null) => {
      if (voteType === null) {
        // Remove vote
        setVotes((prev) => {
          const newVotes = { ...prev };
          delete newVotes[setlistSongId];
          return newVotes;
        });
        setVotesRemaining((prev) => Math.min(DAILY_VOTE_LIMIT, prev + 1));
        return;
      }

      // Check if we have votes remaining (unless changing existing vote)
      const existingVote = votes[setlistSongId];
      if (!existingVote && votesRemaining <= 0) {
        onVoteLimitReached?.();
        toast.error("Daily vote limit reached. Sign in for unlimited voting!");
        return;
      }

      // Add or update vote
      const newVote: Vote = {
        setlistSongId,
        voteType: "up",
        timestamp: Date.now(),
      };

      setVotes((prev) => ({
        ...prev,
        [setlistSongId]: newVote,
      }));

      // Only decrease remaining if this is a new vote
      if (!existingVote) {
        setVotesRemaining((prev) => Math.max(0, prev - 1));
      }

      // Try to submit vote to server
      try {
        await fetch("/api/votes/anonymous", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            setlistSongId,
            voteType: "up",
            sessionId,
          }),
        });
      } catch (error) {
        // Silent fail - vote is stored locally and will sync later
        console.warn("Failed to submit anonymous vote:", error);
      }
    },
    [votes, votesRemaining, sessionId, onVoteLimitReached],
  );

  const getVote = useCallback(
    (setlistSongId: string): "up" | null => {
      return votes[setlistSongId]?.voteType || null;
    },
    [votes],
  );

  const syncVotes = useCallback(async () => {
    if (Object.keys(votes).length === 0) {
      return;
    }

    try {
      const response = await fetch("/api/auth/sync-anonymous", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionId,
          votes: Object.values(votes),
          songsAdded: [], // Future feature
        }),
      });

      if (response.ok) {
        const result = await response.json();
        toast.success(`Synced ${result.votesSynced} votes to your account!`);

        // Clear local storage after successful sync
        localStorage.removeItem(STORAGE_KEY);
        setVotes({});
        setVotesRemaining(DAILY_VOTE_LIMIT);
      }
    } catch (error) {
      toast.error("Failed to sync votes. Please try again later.");
      console.error("Vote sync error:", error);
    }
  }, [votes, sessionId]);

  return {
    vote,
    getVote,
    syncVotes,
    votesRemaining,
    sessionId,
    hasVotes: Object.keys(votes).length > 0,
  };
}
