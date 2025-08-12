"use client";

import { Button } from "@repo/design-system/components/ui/button";
import { cn } from "@repo/design-system/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import { ThumbsUp } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { useRealtimeVotes } from "~/hooks/use-realtime-votes";

interface SongVoteButtonsProps {
  songId: string;
  userId?: string;
  size?: "sm" | "md" | "lg";
  showCounts?: boolean;
  onVote?: (songId: string, voteType: "up" | null) => Promise<void>;
}

export function SongVoteButtons({
  songId,
  userId,
  size = "md",
  showCounts = true,
  onVote,
}: SongVoteButtonsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [optimisticVote, setOptimisticVote] = useState<"up" | null>(null);

  const { votes } = useRealtimeVotes({
    songId,
    userId,
  });

  const currentVote = optimisticVote ?? votes.userVote;

  const sizeClasses = {
    sm: {
      button: "h-7 px-2 text-xs",
      icon: "h-3 w-3",
    },
    md: {
      button: "h-9 px-3 text-sm",
      icon: "h-4 w-4",
    },
    lg: {
      button: "h-11 px-4 text-base",
      icon: "h-5 w-5",
    },
  };

  const classes = sizeClasses[size];

  const handleVote = () => {
    if (!userId) {
      toast.error("Please sign in to vote");
      router.push("/auth/sign-in");
      return;
    }

    const newVote = currentVote === "up" ? null : "up";

    // Optimistic update
    setOptimisticVote(newVote);

    startTransition(async () => {
      try {
        if (onVote) {
          await onVote(songId, newVote);
        } else {
          // Default vote handler
          const response = await fetch("/api/songs/votes", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              songId,
              voteType: newVote,
            }),
          });

          if (!response.ok) {
            throw new Error("Failed to vote");
          }
        }

        toast.success(newVote === null ? "Vote removed" : "Upvoted song");
      } catch (_error) {
        // Revert optimistic update
        setOptimisticVote(votes.userVote ?? null);
        toast.error("Failed to update vote");
      }
    });
  };

  return (
    <div className="flex items-center gap-1">
      <Button
        variant={currentVote === "up" ? "default" : "outline"}
        size="sm"
        onClick={handleVote}
        disabled={isPending}
        className={cn(
          classes.button,
          currentVote === "up" && "bg-green-600 hover:bg-green-700",
        )}
      >
        <ThumbsUp className={classes.icon} />
        {showCounts && (
          <AnimatePresence mode="wait">
            <motion.span
              key={votes.upvotes}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.15 }}
              className="ml-1 font-medium"
            >
              {votes.upvotes}
            </motion.span>
          </AnimatePresence>
        )}
      </Button>
    </div>
  );
}
