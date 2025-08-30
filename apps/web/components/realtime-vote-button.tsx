"use client";

import { Button } from "@repo/design-system";
import { cn } from "@repo/design-system";
import { ChevronUp } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "~/app/providers/auth-provider";
import { useRealtimeVotes } from "~/hooks/use-realtime-votes";

interface RealtimeVoteButtonProps {
  songId: string;
  onVote: (songId: string, voteType: "up" | null) => Promise<void>;
  disabled?: boolean;
  className?: string;
}

export function RealtimeVoteButton({
  songId,
  onVote,
  disabled = false,
  className,
}: RealtimeVoteButtonProps) {
  const { session } = useAuth();
  const [isVoting, setIsVoting] = useState(false);

  // Use real-time voting hook for live updates
  const { votes } = useRealtimeVotes({
    songId,
    userId: session?.user?.id,
  });

  const handleVote = async () => {
    if (isVoting || disabled) {
      return;
    }

    if (!session) {
      toast.error("Please sign in to vote");
      return;
    }

    setIsVoting(true);
    try {
      // Toggle upvote
      const newVote = votes.userVote === "up" ? null : "up";
      await onVote(songId, newVote);
    } catch (_error) {
      toast.error("Failed to vote. Please try again.");
    } finally {
      setIsVoting(false);
    }
  };

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleVote}
        disabled={isVoting || disabled}
        className={cn(
          "h-8 w-8 p-0 transition-all",
          votes.userVote === "up" &&
            "bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400",
        )}
        aria-label={`Upvote (${votes.upvotes} upvotes)`}
      >
        <ChevronUp className="h-4 w-4" />
      </Button>

      <span
        className={cn(
          "min-w-[2rem] text-center font-medium text-sm tabular-nums",
          votes.upvotes > 0 && "text-green-600 dark:text-green-400",
          votes.upvotes === 0 && "text-muted-foreground",
        )}
      >
        {votes.upvotes > 0 ? `+${votes.upvotes}` : votes.upvotes}
      </span>
    </div>
  );
}
