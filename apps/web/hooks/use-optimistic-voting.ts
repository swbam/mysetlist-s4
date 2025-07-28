import { useCallback, useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

interface VoteState {
  upvotes: number;
  downvotes: number;
  userVote: "up" | "down" | null;
  pendingVote?: "up" | "down" | null;
}

interface UseOptimisticVotingOptions {
  setlistSongId: string;
  userId?: string;
  initialVotes?: VoteState;
  onVoteSuccess?: (result: any) => void;
  onVoteError?: (error: Error) => void;
}

export function useOptimisticVoting({
  setlistSongId,
  userId,
  initialVotes = { upvotes: 0, downvotes: 0, userVote: null },
  onVoteSuccess,
  onVoteError,
}: UseOptimisticVotingOptions) {
  const [votes, setVotes] = useState<VoteState>(initialVotes);
  const [isVoting, setIsVoting] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [isOptimistic, setIsOptimistic] = useState(false);

  // Fetch initial vote state
  useEffect(() => {
    if (!setlistSongId) {
      return;
    }

    const fetchVotes = async () => {
      try {
        const response = await fetch(
          `/api/votes?setlistSongId=${setlistSongId}`,
        );
        if (response.ok) {
          const data = await response.json();
          setVotes({
            upvotes: data.upvotes || 0,
            downvotes: data.downvotes || 0,
            userVote: data.userVote || null,
          });
        }
      } catch (_error) {}
    };

    fetchVotes();
  }, [setlistSongId]);

  const vote = useCallback(
    async (voteType: "up" | "down") => {
      if (!userId) {
        toast.error("Please sign in to vote");
        return;
      }

      if (isVoting) {
        return;
      }

      setIsVoting(true);
      setIsOptimistic(true);

      // Calculate optimistic state
      const currentVote = votes.userVote;
      const newVote = currentVote === voteType ? null : voteType;

      // Apply optimistic update
      const optimisticUpdate = { ...votes };

      // Remove previous vote
      if (currentVote === "up") {
        optimisticUpdate.upvotes = Math.max(0, optimisticUpdate.upvotes - 1);
      } else if (currentVote === "down") {
        optimisticUpdate.downvotes = Math.max(
          0,
          optimisticUpdate.downvotes - 1,
        );
      }

      // Add new vote
      if (newVote === "up") {
        optimisticUpdate.upvotes += 1;
      } else if (newVote === "down") {
        optimisticUpdate.downvotes += 1;
      }

      optimisticUpdate.userVote = newVote;
      optimisticUpdate.pendingVote = voteType;

      setVotes(optimisticUpdate);

      startTransition(async () => {
        try {
          const response = await fetch("/api/votes", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              setlistSongId,
              voteType: newVote,
            }),
          });

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(errorText || "Failed to vote");
          }

          const result = await response.json();

          // Update with server response
          setVotes({
            upvotes: result.upvotes,
            downvotes: result.downvotes,
            userVote: result.userVote,
          });

          onVoteSuccess?.(result);
        } catch (error) {
          // Rollback optimistic update
          setVotes(votes);

          const errorMessage =
            error instanceof Error ? error.message : "Failed to vote";

          if (errorMessage.includes("Unauthorized")) {
            toast.error("Please sign in to vote");
          } else {
            toast.error(errorMessage);
          }

          onVoteError?.(error as Error);
        } finally {
          setIsVoting(false);
          setIsOptimistic(false);
        }
      });
    },
    [votes, userId, setlistSongId, isVoting, onVoteSuccess, onVoteError],
  );

  return {
    votes,
    isVoting,
    isPending,
    isOptimistic,
    vote,
    refresh: async () => {
      try {
        const response = await fetch(
          `/api/votes?setlistSongId=${setlistSongId}`,
        );
        if (response.ok) {
          const data = await response.json();
          setVotes({
            upvotes: data.upvotes || 0,
            downvotes: data.downvotes || 0,
            userVote: data.userVote || null,
          });
        }
      } catch (_error) {}
    },
  };
}
