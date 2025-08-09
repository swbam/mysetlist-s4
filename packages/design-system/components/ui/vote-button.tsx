"use client";

import { useState } from "react";
import { Button } from "./button";
import { ChevronUp } from "lucide-react";
import { cn } from "@repo/design-system/lib/utils";

interface VoteButtonProps {
  songId: string;
  currentVote?: "up" | null;
  upvotes: number;
  onVote: (songId: string, voteType: "up" | null) => Promise<void>;
  disabled?: boolean;
}

export function VoteButton({
  songId,
  currentVote,
  upvotes,
  onVote,
  disabled = false,
}: VoteButtonProps) {
  const [isVoting, setIsVoting] = useState(false);
  const netVotes = upvotes;

  const handleVote = async (voteType: "up") => {
    if (isVoting || disabled) return;

    setIsVoting(true);
    try {
      // Toggle vote if same type, otherwise switch
      const newVote = currentVote === voteType ? null : voteType;
      await onVote(songId, newVote);
    } catch (error) {
      console.error("Vote failed:", error);
    } finally {
      setIsVoting(false);
    }
  };

  return (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => handleVote("up")}
        disabled={isVoting || disabled}
        className={cn(
          "h-8 w-8 p-0",
          currentVote === "up" &&
            "bg-green-100 text-green-700 hover:bg-green-200",
        )}
      >
        <ChevronUp className="h-4 w-4" />
      </Button>

      <span
        className={cn(
          "text-sm font-medium min-w-[2rem] text-center",
          netVotes > 0 && "text-green-600",
          netVotes < 0 && "text-red-600",
          netVotes === 0 && "text-muted-foreground",
        )}
      >
        {netVotes > 0 ? `+${netVotes}` : netVotes}
      </span>

      {/* Downvote removed */}
    </div>
  );
}
