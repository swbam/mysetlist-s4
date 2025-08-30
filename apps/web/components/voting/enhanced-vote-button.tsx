"use client";

import { Button } from "@repo/design-system";
import { cn } from "@repo/design-system";
import { ChevronUp, Loader2, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { memo, useCallback, useState, useTransition } from "react";
import { toast } from "sonner";
import { useAuth } from "~/app/providers/auth-provider";
import { useAnonymousVoting } from "~/hooks/use-anonymous-voting";

interface EnhancedVoteButtonProps {
  setlistSongId: string;
  currentVote?: "up" | null;
  upvotes: number;
  onVote?: (voteType: "up" | null) => Promise<void>;
  disabled?: boolean;
  size?: "sm" | "md" | "lg";
  variant?: "default" | "compact";
  showSignInPrompt?: boolean;
}

const EnhancedVoteButtonComponent = function EnhancedVoteButton({
  setlistSongId,
  currentVote,
  upvotes,
  onVote,
  disabled = false,
  size = "md",
  variant = "default",
  showSignInPrompt = true,
}: EnhancedVoteButtonProps) {
  const router = useRouter();
  const { session } = useAuth();
  const [isVoting, setIsVoting] = useState(false);
  const [isPending, startTransition] = useTransition();

  const anonymousVoting = useAnonymousVoting({
    onVoteLimitReached: () => {
      if (showSignInPrompt) {
        toast.error("Daily vote limit reached. Sign in for unlimited voting!", {
          action: {
            label: "Sign In",
            onClick: () => router.push("/auth/sign-in"),
          },
        });
      }
    },
  });

  const netVotes = upvotes;

  // Use anonymous vote if not authenticated
  const displayVote = session?.user
    ? currentVote
    : anonymousVoting.getVote(setlistSongId);

  const handleVote = useCallback(
    async (voteType: "up") => {
      if (isVoting || disabled || isPending) {
        return;
      }

      setIsVoting(true);

      startTransition(async () => {
        try {
          // Toggle vote if same type, otherwise switch
          const newVote = displayVote === voteType ? null : voteType;

          if (session?.user) {
            // Authenticated user - use standard API
            if (onVote) {
              await onVote(newVote);
            } else {
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
          } else {
            // Anonymous user - use local storage voting
            await anonymousVoting.vote(setlistSongId, newVote);

            // Show helpful prompts
            if (
              newVote &&
              anonymousVoting.votesRemaining <= 5 &&
              showSignInPrompt
            ) {
              toast.info(
                `${anonymousVoting.votesRemaining} votes remaining today. Sign in for unlimited voting!`,
                {
                  action: {
                    label: "Sign In",
                    onClick: () => router.push("/auth/sign-in"),
                  },
                },
              );
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
    },
    [
      isVoting,
      disabled,
      isPending,
      displayVote,
      onVote,
      setlistSongId,
      session,
      anonymousVoting,
      showSignInPrompt,
      router,
    ],
  );

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
          onClick={() => handleVote("up")}
          disabled={isVoting || disabled || isPending}
          className={cn(
            buttonSize,
            "p-0",
            displayVote === "up" &&
              "bg-green-100 text-green-700 hover:bg-green-200",
          )}
          title={
            session?.user
              ? "Vote up"
              : `Vote up (${anonymousVoting.votesRemaining} anonymous votes remaining)`
          }
        >
          {isVoting && displayVote === "up" ? (
            <Loader2 className={cn(iconSize, "animate-spin")} />
          ) : (
            <ChevronUp className={iconSize} />
          )}
        </Button>

        <span
          className={cn(
            "min-w-[2rem] text-center font-medium text-sm",
            netVotes > 0 && "text-green-600",
            netVotes < 0 && "text-red-600",
            netVotes === 0 && "text-muted-foreground",
          )}
        >
          {netVotes > 0 ? `+${netVotes}` : netVotes}
        </span>

        {/* Downvote removed */}

        {/* Anonymous voting indicator */}
        {!session?.user && showSignInPrompt && anonymousVoting.hasVotes && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/auth/sign-in")}
            className="ml-2 h-6 px-2 text-xs"
            title="Sign in to sync your votes and get unlimited voting"
          >
            <UserPlus className="h-3 w-3 mr-1" />
            Sign In
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-1">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => handleVote("up")}
        disabled={isVoting || disabled || isPending}
        className={cn(
          buttonSize,
          "p-0",
          displayVote === "up" &&
            "bg-green-100 text-green-700 hover:bg-green-200",
        )}
        title={
          session?.user
            ? "Vote up"
            : `Vote up (${anonymousVoting.votesRemaining} anonymous votes remaining)`
        }
      >
        {isVoting && displayVote === "up" ? (
          <Loader2 className={cn(iconSize, "animate-spin")} />
        ) : (
          <ChevronUp className={iconSize} />
        )}
      </Button>

      <span
        className={cn(
          "font-medium text-sm",
          netVotes > 0 && "text-green-600",
          netVotes < 0 && "text-red-600",
          netVotes === 0 && "text-muted-foreground",
        )}
      >
        {netVotes > 0 ? `+${netVotes}` : netVotes}
      </span>

      {/* Downvote removed */}

      {/* Anonymous voting indicator for default variant */}
      {!session?.user && showSignInPrompt && anonymousVoting.hasVotes && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/auth/sign-in")}
          className="mt-1 h-6 px-2 text-xs"
          title="Sign in to sync your votes and get unlimited voting"
        >
          <UserPlus className="h-3 w-3 mr-1" />
          Sign In
        </Button>
      )}
    </div>
  );
};

// Memoized export with custom comparison for better performance
export const EnhancedVoteButton = memo(
  EnhancedVoteButtonComponent,
  (prevProps, nextProps) => {
    // Custom comparison to prevent unnecessary re-renders
    return (
      prevProps.setlistSongId === nextProps.setlistSongId &&
      prevProps.currentVote === nextProps.currentVote &&
      prevProps.upvotes === nextProps.upvotes &&
      true &&
      prevProps.disabled === nextProps.disabled &&
      prevProps.size === nextProps.size &&
      prevProps.variant === nextProps.variant &&
      prevProps.onVote === nextProps.onVote &&
      prevProps.showSignInPrompt === nextProps.showSignInPrompt
    );
  },
);
