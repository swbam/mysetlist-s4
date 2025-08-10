"use client";

import { Button } from "@repo/design-system/components/ui/button";
import { cn } from "@repo/design-system/lib/utils";
import { ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { memo, useCallback, useState, useTransition } from "react";
import { toast } from "sonner";

interface VoteButtonProps {
  setlistSongId: string;
  currentVote?: "up" | null;
  upvotes: number;
  onVote?: (voteType: "up" | null) => Promise<void>;
  disabled?: boolean;
  size?: "sm" | "md" | "lg";
  variant?: "default" | "compact";
}

const VoteButtonComponent = function VoteButton({
  setlistSongId,
  currentVote,
  upvotes,
  onVote,
  disabled = false,
  size = "md",
  variant = "default",
}: VoteButtonProps) {
  const [isVoting, setIsVoting] = useState(false);
  const [isPending, startTransition] = useTransition();
  const safeUpvotes = Number.isFinite(Number(upvotes)) ? Number(upvotes) : 0;
  const netVotes = safeUpvotes;

  const handleVote = useCallback(async () => {
    if (isVoting || disabled || isPending) {
      return;
    }

    setIsVoting(true);

    startTransition(async () => {
      try {
        // Only upvote: toggle if already upvoted
        const newVote: "up" | null = currentVote === "up" ? null : "up";

        if (onVote) {
          await onVote(newVote);
        } else {
          // Default API call
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
            const error = await response.text();
            throw new Error(error || "Failed to vote");
          }
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Failed to vote";
        if (errorMessage.includes("Unauthorized")) {
          toast.error("Please sign in to vote");
        } else {
          toast.error("Failed to vote");
        }
      } finally {
        setIsVoting(false);
      }
    });
  }, [isVoting, disabled, isPending, currentVote, onVote, setlistSongId]);

  // Updated touch targets for mobile accessibility (minimum 44px per Apple guidelines)
  const buttonSize =
    size === "sm" ? "h-8 w-8" : size === "lg" ? "h-12 w-12" : "h-11 w-11";
  const iconSize =
    size === "sm" ? "h-4 w-4" : size === "lg" ? "h-6 w-6" : "h-5 w-5";

  if (variant === "compact") {
    return (
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleVote}
          disabled={isVoting || disabled || isPending}
          className={cn(
            buttonSize,
            "p-0",
            currentVote === "up" &&
              "bg-green-100 text-green-700 hover:bg-green-200",
          )}
          aria-label="Upvote song"
          data-testid="vote-up"
          aria-pressed={currentVote === "up"}
        >
          {isVoting && currentVote === "up" ? (
            <Loader2 className={cn(iconSize, "animate-spin")} />
          ) : (
            <ChevronUp className={iconSize} />
          )}
        </Button>

        <span
          className={cn(
            "min-w-[2rem] text-center font-medium text-sm",
            netVotes > 0 && "text-green-600",
            netVotes === 0 && "text-muted-foreground",
          )}
        >
          {netVotes > 0 ? `+${netVotes}` : netVotes}
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-1">
      <Button
        variant="ghost"
        size="sm"
        onClick={handleVote}
        disabled={isVoting || disabled || isPending}
        className={cn(
          buttonSize,
          "p-0",
          currentVote === "up" &&
            "bg-green-100 text-green-700 hover:bg-green-200",
        )}
        aria-label="Upvote song"
        data-testid="vote-up"
        aria-pressed={currentVote === "up"}
      >
        {isVoting && currentVote === "up" ? (
          <Loader2 className={cn(iconSize, "animate-spin")} />
        ) : (
          <ChevronUp className={iconSize} />
        )}
      </Button>

      <span
        className={cn(
          "font-medium text-sm",
          netVotes > 0 && "text-green-600",
          netVotes === 0 && "text-muted-foreground",
        )}
      >
        {netVotes > 0 ? `+${netVotes}` : netVotes}
      </span>
    </div>
  );
};

// Memoized export with custom comparison for better performance
export const VoteButton = memo(VoteButtonComponent, (prevProps, nextProps) => {
  // Custom comparison to prevent unnecessary re-renders
  return (
    prevProps.setlistSongId === nextProps.setlistSongId &&
    prevProps.currentVote === nextProps.currentVote &&
    prevProps.upvotes === nextProps.upvotes &&
    prevProps.disabled === nextProps.disabled &&
    prevProps.size === nextProps.size &&
    prevProps.variant === nextProps.variant &&
    prevProps.onVote === nextProps.onVote
  );
});
