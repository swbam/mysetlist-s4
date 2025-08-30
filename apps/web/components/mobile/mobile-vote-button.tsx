"use client";

import { Button } from "@repo/design-system";
import { cn } from "@repo/design-system";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronUp, Heart, Zap } from "lucide-react";
import React, { useState, useCallback } from "react";
import { toast } from "sonner";
import { useAuth } from "~/app/providers/auth-provider";
import { useRealtimeVotes } from "~/hooks/use-realtime-votes";

interface MobileVoteButtonProps {
  songId: string;
  onVote: (songId: string, voteType: "up" | null) => Promise<void>;
  disabled?: boolean;
  className?: string;
  compact?: boolean;
  hapticFeedback?: boolean;
}

export function MobileVoteButton({
  songId,
  onVote,
  disabled = false,
  className,
  compact = false,
  hapticFeedback = true,
}: MobileVoteButtonProps) {
  const { session } = useAuth();
  const [isVoting, setIsVoting] = useState(false);
  const [lastVoteTime, setLastVoteTime] = useState(0);

  // Use real-time voting hook for live updates
  const { votes } = useRealtimeVotes({
    songId,
    ...(session?.user?.id && { userId: session.user.id }),
  });

  // Throttle votes to prevent spam
  const throttleDelay = 1000; // 1 second

  const triggerHaptic = useCallback(() => {
    if (hapticFeedback && "vibrate" in navigator) {
      navigator.vibrate(50); // Short vibration
    }
  }, [hapticFeedback]);

  const handleVote = async () => {
    const now = Date.now();

    if (isVoting || disabled || now - lastVoteTime < throttleDelay) {
      return;
    }

    if (!session) {
      toast.error("Please sign in to vote");
      return;
    }

    setIsVoting(true);
    setLastVoteTime(now);

    try {
      // Trigger haptic feedback
      triggerHaptic();

      // Toggle upvote
      const newVote = votes.userVote === "up" ? null : "up";
      await onVote(songId, newVote);

      // Show toast for significant votes
      if (newVote && votes.upvotes % 10 === 0) {
        toast.success(`Song hit ${votes.upvotes + 1} votes!`, {
          icon: "🎵",
        });
      }
    } catch (_error) {
      toast.error("Failed to vote. Please try again.");
    } finally {
      setTimeout(() => setIsVoting(false), 300); // Small delay for animation
    }
  };

  const getVoteIcon = () => {
    if (compact) {
      return ChevronUp;
    }

    // More expressive icons for mobile
    if (votes.userVote === "up") {
      return Heart;
    }

    return ChevronUp;
  };

  const getButtonStyle = () => {
    const baseClasses = compact ? "h-8 w-8 p-0" : "h-10 w-10 p-0 md:h-8 md:w-8";

    const activeClasses =
      votes.userVote === "up"
        ? "bg-green-100 text-green-700 border-green-200 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 shadow-sm"
        : "";

    return cn(baseClasses, activeClasses);
  };

  const getCountStyle = () => {
    if (compact) {
      return cn(
        "min-w-[1.5rem] text-center font-medium text-xs tabular-nums",
        votes.upvotes > 0 && "text-green-600 dark:text-green-400",
        votes.upvotes === 0 && "text-muted-foreground",
      );
    }

    return cn(
      "min-w-[2.5rem] text-center font-medium text-sm tabular-nums md:min-w-[2rem] md:text-xs",
      votes.upvotes > 0 && "text-green-600 dark:text-green-400",
      votes.upvotes === 0 && "text-muted-foreground",
    );
  };

  if (compact) {
    return (
      <div className={cn("flex items-center gap-1", className)}>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleVote}
          disabled={isVoting || disabled}
          className={getButtonStyle()}
          aria-label={`Upvote (${votes.upvotes} upvotes)`}
        >
          <motion.div
            animate={
              isVoting && votes.userVote === "up" ? { scale: [1, 1.2, 1] } : {}
            }
            transition={{ duration: 0.3 }}
          >
            {(() => {
              const Icon = getVoteIcon();
              return <Icon className="h-3 w-3" />;
            })()}
          </motion.div>
        </Button>

        <span className={getCountStyle()}>
          {votes.upvotes > 0 ? `+${votes.upvotes}` : votes.upvotes}
        </span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col items-center gap-1 md:flex-row md:gap-1",
        className,
      )}
    >
      <Button
        variant="ghost"
        size="sm"
        onClick={handleVote}
        disabled={isVoting || disabled}
        className={getButtonStyle()}
        aria-label={`Upvote (${votes.upvotes} upvotes)`}
      >
        <motion.div
          animate={
            isVoting && votes.userVote === "up"
              ? { scale: [1, 1.3, 1], rotate: [0, 5, -5, 0] }
              : {}
          }
          transition={{ duration: 0.4, ease: "easeOut" }}
        >
          {(() => {
            const Icon = getVoteIcon();
            return (
              <Icon
                className={cn(
                  "h-5 w-5 md:h-4 md:w-4",
                  votes.userVote === "up" && "drop-shadow-sm",
                )}
              />
            );
          })()}
        </motion.div>
      </Button>

      <div className="flex flex-col items-center md:flex-row md:items-center">
        <motion.span
          className={getCountStyle()}
          key={votes.upvotes} // Re-trigger animation on change
          initial={{ scale: 1 }}
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 0.2 }}
        >
          {votes.upvotes > 0 ? `+${votes.upvotes}` : votes.upvotes}
        </motion.span>

        {/* Show trending indicator for highly voted songs */}
        <AnimatePresence>
          {votes.upvotes >= 50 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mt-1 flex items-center gap-1 font-medium text-orange-500 text-xs md:mt-0 md:ml-1"
            >
              <Zap className="h-3 w-3" />
              <span className="hidden md:inline">Hot</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Total vote count for context */}
      <div className="mt-1 text-muted-foreground text-xs md:mt-0 md:ml-2">
        {votes.upvotes} votes
      </div>
    </div>
  );
}
