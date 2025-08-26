"use client";

import { Button } from "@repo/design-system/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@repo/design-system/tooltip";
import { cn } from "@repo/design-system";
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
  size?: "sm" | "default" | "lg";
  variant?: "default" | "compact";
}

export function AnonymousVoteButton({
  setlistSongId,
  initialUpvotes,
  isAuthenticated,
  onVote,
  disabled = false,
  size = "default",
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
      const vote = anonymousUser.getVote(setlistSongId) as "up" | null;
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
            setUpvotes((prev) => prev + 1);
          }

          setCurrentVote(newVote);
        }
      } catch (error) {
        toast.error("Voting failed. Please try again.");
      } finally {
        setIsVoting(false);
      }
    });
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={variant === "default" ? "default" : "ghost"}
            size={size}
            className={cn(
              "gap-1",
              variant === "compact" && "h-8 px-2",
              currentVote === "up" &&
                "bg-green-600 text-white hover:bg-green-700",
            )}
            onClick={handleVote}
            disabled={disabled || isVoting || isPending}
          >
            {isVoting || isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ChevronUp className="h-4 w-4" />
            )}
            <span className="min-w-[1.5rem] text-center">{upvotes}</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          {isAuthenticated
            ? "Vote this song up"
            : currentVote === "up"
              ? "Remove your vote"
              : "Upvote this song"}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
