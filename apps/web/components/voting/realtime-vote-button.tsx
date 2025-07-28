"use client"

import { Button } from "@repo/design-system/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@repo/design-system/components/ui/tooltip"
import { cn } from "@repo/design-system/lib/utils"
import { AnimatePresence, motion } from "framer-motion"
import {
  ChevronDown,
  ChevronUp,
  Loader2,
  Wifi,
  WifiOff,
  Zap,
} from "lucide-react"
import { memo, useCallback, useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { useRealtimeConnection } from "~/app/providers/realtime-provider"
import { useOptimisticVoting } from "~/hooks/use-optimistic-voting"

interface RealtimeVoteButtonProps {
  setlistSongId: string
  showId: string
  userId?: string
  disabled?: boolean
  size?: "sm" | "md" | "lg"
  variant?: "default" | "compact" | "minimal"
  showLimits?: boolean
  showConnection?: boolean
  hapticFeedback?: boolean
  className?: string
}

const buttonVariants = {
  scale: { scale: 0.95 },
  tap: { scale: 0.9 },
  hover: { scale: 1.05 },
}

const countVariants = {
  increase: {
    scale: [1, 1.2, 1],
    color: ["currentColor", "#22c55e", "currentColor"],
    transition: { duration: 0.3 },
  },
  decrease: {
    scale: [1, 1.2, 1],
    color: ["currentColor", "#ef4444", "currentColor"],
    transition: { duration: 0.3 },
  },
}

const RealtimeVoteButtonComponent = function RealtimeVoteButton({
  setlistSongId,
  showId: _showId,
  userId,
  disabled = false,
  size = "md",
  variant = "default",
  showLimits = true,
  showConnection = true,
  hapticFeedback = true,
  className,
}: RealtimeVoteButtonProps) {
  const [voteLimits, setVoteLimits] = useState<any>(null)
  const [lastVoteAnimation, setLastVoteAnimation] = useState<
    "increase" | "decrease" | null
  >(null)
  const previousNetVotes = useRef<number>(0)

  const { isConnected, connectionStatus: _connectionStatus } =
    useRealtimeConnection()

  // Use optimistic voting for instant feedback
  const {
    votes,
    isVoting,
    vote: optimisticVote,
    isOptimistic,
  } = useOptimisticVoting({
    setlistSongId,
    ...(userId && { userId }),
    onVoteSuccess: (result) => {
      if (result.voteLimits) {
        setVoteLimits(result.voteLimits)
      }

      // Show success feedback for milestones
      const totalVotes = result.upvotes + result.downvotes
      if (totalVotes > 0 && totalVotes % 5 === 0) {
        toast.success(`🎵 Song hit ${totalVotes} votes!`, {
          duration: 2000,
        })
      }
    },
    onVoteError: (_error) => {
      // Haptic feedback for errors on mobile
      if (hapticFeedback && "vibrate" in navigator) {
        navigator.vibrate([50, 100, 50]) // Error vibration pattern
      }
    },
  })

  const { upvotes = 0, downvotes = 0, userVote = null } = votes
  const netVotes = upvotes - downvotes

  // Animate vote count changes
  useEffect(() => {
    if (previousNetVotes.current !== netVotes) {
      const direction =
        netVotes > previousNetVotes.current ? "increase" : "decrease"
      setLastVoteAnimation(direction)
      previousNetVotes.current = netVotes

      // Clear animation after delay
      const timer = setTimeout(() => setLastVoteAnimation(null), 500)
      return () => clearTimeout(timer)
    }
    return undefined
  }, [netVotes])

  const triggerHapticFeedback = useCallback(
    (pattern: number[] = [10]) => {
      if (hapticFeedback && "vibrate" in navigator) {
        navigator.vibrate(pattern)
      }
    },
    [hapticFeedback]
  )

  const handleVote = async (voteType: "up" | "down") => {
    if (isVoting || disabled) {
      return
    }

    if (!userId) {
      toast.error("Please sign in to vote")
      return
    }

    // Immediate haptic feedback
    triggerHapticFeedback([25])

    // Check connection status
    if (!isConnected) {
      toast.warning("Connection lost - vote may not sync immediately", {
        description: "Your vote will be applied when connection is restored",
      })
    }

    // Use optimistic voting
    await optimisticVote(voteType)
  }

  const buttonSize =
    size === "sm" ? "h-6 w-6" : size === "lg" ? "h-10 w-10" : "h-8 w-8"
  const iconSize =
    size === "sm" ? "h-3 w-3" : size === "lg" ? "h-5 w-5" : "h-4 w-4"

  const ConnectionIndicator = () => {
    if (!showConnection) {
      return null
    }

    const Icon = isConnected ? Wifi : WifiOff
    const iconClass = isConnected ? "text-green-500" : "text-red-500"

    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Icon className={cn("h-3 w-3", iconClass)} />
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-xs">
            {isConnected ? "Live updates active" : "Connection lost"}
          </div>
        </TooltipContent>
      </Tooltip>
    )
  }

  const VoteLimitTooltip = () => {
    if (!showLimits || !voteLimits) {
      return null
    }

    return (
      <div className="space-y-1 text-xs">
        <div>Show votes: {voteLimits.showVotesRemaining}/10</div>
        <div>Daily votes: {voteLimits.dailyVotesRemaining}/50</div>
        {!voteLimits.canVote && (
          <div className="text-destructive">Vote limit reached</div>
        )}
      </div>
    )
  }

  if (variant === "minimal") {
    return (
      <TooltipProvider>
        <div className={cn("flex items-center gap-1", className)}>
          <motion.span
            className={cn(
              "select-none font-medium text-sm tabular-nums",
              netVotes > 0 && "text-green-600 dark:text-green-400",
              netVotes < 0 && "text-red-600 dark:text-red-400",
              netVotes === 0 && "text-muted-foreground",
              isOptimistic && "opacity-80"
            )}
            variants={countVariants}
            animate={lastVoteAnimation || "none"}
            aria-live="polite"
            aria-atomic="true"
          >
            {netVotes > 0 ? `+${netVotes}` : netVotes}
          </motion.span>

          {isOptimistic && (
            <Zap className="h-3 w-3 animate-pulse text-yellow-500" />
          )}

          <ConnectionIndicator />
        </div>
      </TooltipProvider>
    )
  }

  if (variant === "compact") {
    return (
      <TooltipProvider>
        <div
          className={cn(
            "flex touch-manipulation items-center gap-1",
            className
          )}
        >
          <Tooltip>
            <TooltipTrigger asChild>
              <motion.div
                variants={buttonVariants}
                whileHover="hover"
                whileTap="tap"
              >
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleVote("up")}
                  disabled={
                    isVoting || disabled || (voteLimits && !voteLimits.canVote)
                  }
                  className={cn(
                    buttonSize,
                    "touch-manipulation p-0 transition-all duration-150",
                    "min-h-[32px] min-w-[32px]",
                    "focus-visible:ring-2 focus-visible:ring-green-500/20",
                    userVote === "up" &&
                      "bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400",
                    isOptimistic && "opacity-80"
                  )}
                  aria-label="Upvote this song"
                >
                  <AnimatePresence mode="wait">
                    {isVoting && votes.pendingVote === "up" ? (
                      <motion.div
                        key="loading"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                      >
                        <Loader2 className={cn(iconSize, "animate-spin")} />
                      </motion.div>
                    ) : (
                      <motion.div
                        key="icon"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                      >
                        <ChevronUp className={iconSize} />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Button>
              </motion.div>
            </TooltipTrigger>
            <TooltipContent>
              <div>Upvote</div>
              <VoteLimitTooltip />
            </TooltipContent>
          </Tooltip>

          <motion.span
            className={cn(
              "min-w-[2rem] text-center font-medium text-sm tabular-nums transition-all duration-150",
              "select-none px-1",
              netVotes > 0 && "text-green-600 dark:text-green-400",
              netVotes < 0 && "text-red-600 dark:text-red-400",
              netVotes === 0 && "text-muted-foreground",
              isOptimistic && "opacity-80"
            )}
            variants={countVariants}
            animate={lastVoteAnimation || "none"}
            aria-live="polite"
            aria-atomic="true"
          >
            {netVotes > 0 ? `+${netVotes}` : netVotes}
          </motion.span>

          <Tooltip>
            <TooltipTrigger asChild>
              <motion.div
                variants={buttonVariants}
                whileHover="hover"
                whileTap="tap"
              >
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleVote("down")}
                  disabled={
                    isVoting || disabled || (voteLimits && !voteLimits.canVote)
                  }
                  className={cn(
                    buttonSize,
                    "touch-manipulation p-0 transition-all duration-150",
                    "min-h-[32px] min-w-[32px]",
                    "focus-visible:ring-2 focus-visible:ring-red-500/20",
                    userVote === "down" &&
                      "bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400",
                    isOptimistic && "opacity-80"
                  )}
                  aria-label="Downvote this song"
                >
                  <AnimatePresence mode="wait">
                    {isVoting && votes.pendingVote === "down" ? (
                      <motion.div
                        key="loading"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                      >
                        <Loader2 className={cn(iconSize, "animate-spin")} />
                      </motion.div>
                    ) : (
                      <motion.div
                        key="icon"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                      >
                        <ChevronDown className={iconSize} />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Button>
              </motion.div>
            </TooltipTrigger>
            <TooltipContent>
              <div>Downvote</div>
              <VoteLimitTooltip />
            </TooltipContent>
          </Tooltip>

          <div className="flex items-center gap-1">
            {isOptimistic && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Zap className="h-3 w-3 animate-pulse text-yellow-500" />
                </TooltipTrigger>
                <TooltipContent>
                  <div className="text-xs">Syncing vote...</div>
                </TooltipContent>
              </Tooltip>
            )}
            <ConnectionIndicator />
          </div>
        </div>
      </TooltipProvider>
    )
  }

  // Default variant
  return (
    <TooltipProvider>
      <div
        className={cn(
          "flex touch-manipulation flex-col items-center gap-1",
          className
        )}
      >
        <Tooltip>
          <TooltipTrigger asChild>
            <motion.div
              variants={buttonVariants}
              whileHover="hover"
              whileTap="tap"
            >
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleVote("up")}
                disabled={
                  isVoting || disabled || (voteLimits && !voteLimits.canVote)
                }
                className={cn(
                  buttonSize,
                  "touch-manipulation p-0 transition-all duration-150",
                  "focus-visible:ring-2 focus-visible:ring-green-500/20",
                  userVote === "up" &&
                    "bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400",
                  isOptimistic && "opacity-80"
                )}
                aria-label="Upvote this song"
              >
                <AnimatePresence mode="wait">
                  {isVoting && userVote === "up" ? (
                    <motion.div
                      key="loading"
                      initial={{ opacity: 0, rotate: 0 }}
                      animate={{ opacity: 1, rotate: 360 }}
                      exit={{ opacity: 0 }}
                    >
                      <Loader2 className={cn(iconSize, "animate-spin")} />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="icon"
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                    >
                      <ChevronUp className={iconSize} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </Button>
            </motion.div>
          </TooltipTrigger>
          <TooltipContent>
            <div>Upvote</div>
            <VoteLimitTooltip />
          </TooltipContent>
        </Tooltip>

        <motion.span
          className={cn(
            "font-medium text-sm tabular-nums transition-all duration-150",
            "select-none px-1",
            netVotes > 0 && "text-green-600 dark:text-green-400",
            netVotes < 0 && "text-red-600 dark:text-red-400",
            netVotes === 0 && "text-muted-foreground",
            isOptimistic && "opacity-80"
          )}
          variants={countVariants}
          animate={lastVoteAnimation || "none"}
          aria-live="polite"
          aria-atomic="true"
        >
          {netVotes > 0 ? `+${netVotes}` : netVotes}
        </motion.span>

        <Tooltip>
          <TooltipTrigger asChild>
            <motion.div
              variants={buttonVariants}
              whileHover="hover"
              whileTap="tap"
            >
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleVote("down")}
                disabled={
                  isVoting || disabled || (voteLimits && !voteLimits.canVote)
                }
                className={cn(
                  buttonSize,
                  "touch-manipulation p-0 transition-all duration-150",
                  "focus-visible:ring-2 focus-visible:ring-red-500/20",
                  userVote === "down" &&
                    "bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400",
                  isOptimistic && "opacity-80"
                )}
                aria-label="Downvote this song"
              >
                <AnimatePresence mode="wait">
                  {isVoting && userVote === "down" ? (
                    <motion.div
                      key="loading"
                      initial={{ opacity: 0, rotate: 0 }}
                      animate={{ opacity: 1, rotate: 360 }}
                      exit={{ opacity: 0 }}
                    >
                      <Loader2 className={cn(iconSize, "animate-spin")} />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="icon"
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 5 }}
                    >
                      <ChevronDown className={iconSize} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </Button>
            </motion.div>
          </TooltipTrigger>
          <TooltipContent>
            <div>Downvote</div>
            <VoteLimitTooltip />
          </TooltipContent>
        </Tooltip>

        <div className="mt-1 flex items-center justify-center gap-1">
          {isOptimistic && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Zap className="h-3 w-3 animate-pulse text-yellow-500" />
              </TooltipTrigger>
              <TooltipContent>
                <div className="text-xs">Syncing vote...</div>
              </TooltipContent>
            </Tooltip>
          )}
          <ConnectionIndicator />
        </div>
      </div>
    </TooltipProvider>
  )
}

// Memoized export with custom comparison for better performance
export const RealtimeVoteButton = memo(
  RealtimeVoteButtonComponent,
  (prevProps, nextProps) => {
    // Custom comparison to prevent unnecessary re-renders
    return (
      prevProps.setlistSongId === nextProps.setlistSongId &&
      prevProps.showId === nextProps.showId &&
      prevProps.userId === nextProps.userId &&
      prevProps.disabled === nextProps.disabled &&
      prevProps.size === nextProps.size &&
      prevProps.variant === nextProps.variant &&
      prevProps.showLimits === nextProps.showLimits &&
      prevProps.showConnection === nextProps.showConnection &&
      prevProps.hapticFeedback === nextProps.hapticFeedback &&
      prevProps.className === nextProps.className
    )
  }
)
