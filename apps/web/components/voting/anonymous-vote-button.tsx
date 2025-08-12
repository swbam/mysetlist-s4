"use client";

import { Button } from "@repo/design-system/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@repo/design-system/components/ui/tooltip";
import { cn } from "@repo/design-system/lib/utils";
import { ChevronUp, Loader2, Lock } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { anonymousUser } from "~/lib/anonymous-user";

interface AnonymousVoteButtonProps {
  setlistSongId: string;
  initialUpvotes: number;
  isAuthenticated: boolean;
  onVote?: (voteType: "up" | null) => Promise<void>;
  disabled?: boolean;
  size?: "sm" | "md" | "lg";
  variant?: "default" | "compact";
}

export function AnonymousVoteButton({
  setlistSongId,
  initialUpvotes,
  isAuthenticated,
  onVote,
  disabled = false,
  size = "md",
  variant = "default",
}: AnonymousVoteButtonProps) {
  const router = useRouter();
  const [isVoting, setIsVoting] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [currentVote, setCurrentVote] = useState<"up" | null>(null);
  const [upvotes, setUpvotes] = useState(initialUpvotes);
  const [canVote, setCanVote] = useState(true);

  useEffect(() => {
    // Check if user has already voted on this song
    if (!isAuthenticated) {
      const vote = anonymousUser.getVote(setlistSongId);
      setCurrentVote(vote);
      setCanVote(anonymousUser.canVote() || vote !== null);
    }
  }, [setlistSongId, isAuthenticated]);

  const handleVote = async () => {
    if (isVoting || disabled || isPending) {
      return;
    }

    // If not authenticated and can't vote, prompt to sign up
    if (!isAuthenticated && !canVote && currentVote === null) {
      toast.error("You've used your free vote! Sign up to vote more.", {
        action: {
          label: "Sign Up",
          onClick: () => router.push("/auth/sign-up"),
        },
      });
      return;
    }

    setIsVoting(true);

    startTransition(async () => {
      try {
        const newVote = currentVote === "up" ? null : "up";

        if (isAuthenticated && onVote) {
          // Authenticated user flow
          await onVote(newVote);
        } else if (isAuthenticated) {
          // Authenticated user with default API
          const response = await fetch("/api/votes", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              setlistSongId,
            }),
          });

          if (!response.ok) {
            throw new Error("Failed to vote");
          }

          const data = await response.json();
          setUpvotes(data.up || 0);
          setCurrentVote(data.currentUserUpvoted ? "up" : null);
        } else {
          // Anonymous user flow
          if (newVote === null) {
            // Removing vote
            anonymousUser.removeVote(setlistSongId);

            // Update local state
            if (currentVote === "up") {
              setUpvotes((prev) => Math.max(0, prev - 1));
            }
          } else {
            // Adding vote
            const success = anonymousUser.addVote(setlistSongId, "up");

            if (!success) {
              toast.error("You've used your free vote! Sign up to vote more.", {
                action: {
                  label: "Sign Up",
                  onClick: () => router.push("/auth/sign-up"),
                },
              });
              return;
            }

            // Update local state optimistically
            if (currentVote === "up") {
              setUpvotes((prev) => Math.max(0, prev - 1));
            }

            setUpvotes((prev) => prev + 1);
          }

          setCurrentVote(newVote);
          setCanVote(anonymousUser.canVote() || newVote !== null);

          // Show toast for anonymous users
          if (
            newVote !== null &&
            anonymousUser.getRemainingVotes() === 0 &&
            currentVote === null
          ) {
            toast.success("Vote recorded! Sign up to vote on more songs.", {
              action: {
                label: "Sign Up",
                onClick: () => router.push("/auth/sign-up"),
              },
            });
          }
        }
      } catch (_error) {
        toast.error("Failed to vote");
      } finally {
        setIsVoting(false);
      }
    });
  };

  const buttonSize =
    size === "sm" ? "h-6 w-6" : size === "lg" ? "h-10 w-10" : "h-8 w-8";
  const iconSize =
    size === "sm" ? "h-3 w-3" : size === "lg" ? "h-5 w-5" : "h-4 w-4";

  const VoteButtonContent = () => {
    const isActive = currentVote === "up";
    const isDisabled =
      isVoting ||
      disabled ||
      isPending ||
      (!isAuthenticated && !canVote && currentVote === null);

    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={handleVote}
        disabled={isDisabled}
        className={cn(
          buttonSize,
          "relative p-0",
          isActive && "bg-green-100 text-green-700 hover:bg-green-200",
          !isAuthenticated && !canVote && currentVote === null && "opacity-50",
        )}
      >
        {isVoting && currentVote === "up" ? (
          <Loader2 className={cn(iconSize, "animate-spin")} />
        ) : (
          <ChevronUp className={iconSize} />
        )}
        {!isAuthenticated && !canVote && currentVote === null && (
          <Lock className="-top-1 -right-1 absolute h-2 w-2" />
        )}
      </Button>
    );
  };

  if (variant === "compact") {
    return (
      <TooltipProvider>
        <div className="flex items-center gap-1">
          {!isAuthenticated && (canVote || currentVote !== null) ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <VoteButtonContent />
                </span>
              </TooltipTrigger>
              <TooltipContent>
                <p>
                  Anonymous vote ({anonymousUser.getRemainingVotes()} remaining)
                </p>
              </TooltipContent>
            </Tooltip>
          ) : (
            <VoteButtonContent />
          )}

          <span
            className={cn(
              "min-w-[2rem] text-center font-medium text-sm",
              upvotes > 0 && "text-green-600",
              upvotes === 0 && "text-muted-foreground",
            )}
          >
            {upvotes > 0 ? `+${upvotes}` : upvotes}
          </span>
        </div>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <div className="flex flex-col items-center gap-1">
        {!isAuthenticated && (canVote || currentVote !== null) ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <span>
                <VoteButtonContent />
              </span>
            </TooltipTrigger>
            <TooltipContent>
              <p>
                Anonymous vote ({anonymousUser.getRemainingVotes()} remaining)
              </p>
            </TooltipContent>
          </Tooltip>
        ) : (
          <VoteButtonContent />
        )}

        <span
          className={cn(
            "font-medium text-sm",
            upvotes > 0 && "text-green-600",
            upvotes === 0 && "text-muted-foreground",
          )}
        >
          {upvotes > 0 ? `+${upvotes}` : upvotes}
        </span>
      </div>
    </TooltipProvider>
  );
}