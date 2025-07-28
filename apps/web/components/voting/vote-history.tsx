"use client"

import { Button } from "@repo/design-system/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/design-system/components/ui/select"
import { cn } from "@repo/design-system/lib/utils"
import { format, formatDistanceToNow } from "date-fns"
import { AnimatePresence, motion } from "framer-motion"
import {
  BarChart3,
  Calendar,
  Clock,
  History,
  Music,
  ThumbsDown,
  ThumbsUp,
  TrendingUp,
} from "lucide-react"
import { useEffect, useState } from "react"

interface VoteHistoryProps {
  userId?: string
  showId?: string
  className?: string
}

interface VoteHistoryItem {
  id: string
  songTitle: string
  artist: string
  voteType: "up" | "down"
  createdAt: string
  updatedAt: string
  showName: string
  showDate: string
  setlistSongId: string
  currentNetVotes?: number
}

interface VotePattern {
  totalVotes: number
  upvotes: number
  downvotes: number
  favoriteGenres: string[]
  mostActiveHour: number
  votingStreak: number
  averageVotesPerDay: number
  recentTrend: "up" | "down" | "stable"
}

interface DailyVoteData {
  date: string
  votes: number
  upvotes: number
  downvotes: number
}

export function VoteHistory({ userId, showId, className }: VoteHistoryProps) {
  const [history, setHistory] = useState<VoteHistoryItem[]>([])
  const [pattern, setPattern] = useState<VotePattern | null>(null)
  const [dailyData, setDailyData] = useState<DailyVoteData[]>([])
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState("7d")
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)

  const fetchVoteHistory = async (loadMore = false) => {
    try {
      const params = new URLSearchParams({
        period,
        page: loadMore ? page.toString() : "1",
        limit: "20",
      })

      if (userId) {
        params.set("userId", userId)
      }
      if (showId) {
        params.set("showId", showId)
      }

      const response = await fetch(`/api/votes/history?${params}`)
      if (response.ok) {
        const data = await response.json()

        if (loadMore) {
          setHistory((prev) => [...prev, ...data.history])
        } else {
          setHistory(data.history)
          setPattern(data.pattern)
          setDailyData(data.dailyData || [])
        }

        setHasMore(data.hasMore)

        if (loadMore) {
          setPage((prev) => prev + 1)
        } else {
          setPage(1)
        }
      }
    } catch (_error) {
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchVoteHistory()
  }, [userId, showId, period])

  const loadMore = () => {
    fetchVoteHistory(true)
  }

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <div className="flex items-center gap-2">
            <History className="h-5 w-5" />
            <div className="h-6 w-32 animate-pulse rounded bg-muted" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...new Array(5)].map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-3 rounded-lg border p-3"
              >
                <div className="h-10 w-10 animate-pulse rounded bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 animate-pulse rounded bg-muted" />
                  <div className="h-3 w-2/3 animate-pulse rounded bg-muted" />
                </div>
                <div className="h-6 w-12 animate-pulse rounded bg-muted" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  const maxDailyVotes = Math.max(...dailyData.map((d) => d.votes), 1)

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header and Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History className="h-6 w-6" />
          <h3 className="font-semibold text-xl">
            {userId ? "Your Voting History" : "Vote History"}
          </h3>
        </div>

        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1d">Last 24 hours</SelectItem>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
            <SelectItem value="all">All time</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Voting Pattern Summary */}
      {pattern && (
        <div className="grid gap-6 md:grid-cols-2">
          {/* Stats Overview */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <BarChart3 className="h-4 w-4" />
                Voting Pattern
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <div className="font-bold text-2xl text-green-600">
                    {pattern.upvotes}
                  </div>
                  <div className="text-muted-foreground text-sm">Upvotes</div>
                </div>
                <div>
                  <div className="font-bold text-2xl text-red-600">
                    {pattern.downvotes}
                  </div>
                  <div className="text-muted-foreground text-sm">Downvotes</div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Positivity Ratio</span>
                  <span className="font-medium">
                    {pattern.totalVotes > 0
                      ? ((pattern.upvotes / pattern.totalVotes) * 100).toFixed(
                          1
                        )
                      : 0}
                    %
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full bg-green-500 transition-all duration-500"
                    style={{
                      width:
                        pattern.totalVotes > 0
                          ? `${(pattern.upvotes / pattern.totalVotes) * 100}%`
                          : "0%",
                    }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-center text-sm">
                <div>
                  <div className="font-semibold">
                    {pattern.averageVotesPerDay.toFixed(1)}
                  </div>
                  <div className="text-muted-foreground">Avg/day</div>
                </div>
                <div>
                  <div className="font-semibold">{pattern.votingStreak}</div>
                  <div className="text-muted-foreground">Day streak</div>
                </div>
              </div>

              {pattern.mostActiveHour !== undefined && (
                <div className="text-center">
                  <div className="text-muted-foreground text-sm">
                    Most active time
                  </div>
                  <div className="font-medium">
                    {pattern.mostActiveHour}:00 - {pattern.mostActiveHour + 1}
                    :00
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Daily Activity Chart */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <TrendingUp className="h-4 w-4" />
                Daily Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              {dailyData.length > 0 ? (
                <div className="space-y-2">
                  {dailyData.map((day, index) => (
                    <div key={day.date} className="flex items-center gap-2">
                      <div className="w-16 text-muted-foreground text-xs">
                        {format(new Date(day.date), "MMM dd")}
                      </div>
                      <div className="flex flex-1 items-center gap-1">
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                          <motion.div
                            className="h-full bg-blue-500"
                            initial={{ width: 0 }}
                            animate={{
                              width: `${(day.votes / maxDailyVotes) * 100}%`,
                            }}
                            transition={{ delay: index * 0.1, duration: 0.5 }}
                          />
                        </div>
                        <div className="w-8 text-right font-medium text-xs">
                          {day.votes}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-4 text-center text-muted-foreground">
                  <Calendar className="mx-auto mb-2 h-8 w-8 opacity-50" />
                  <p className="text-sm">No activity data available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Vote History List */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Clock className="h-4 w-4" />
            Recent Votes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {history.length > 0 ? (
            <div className="space-y-3">
              <AnimatePresence>
                {history.map((vote, index) => (
                  <motion.div
                    key={vote.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ delay: index * 0.02 }}
                    className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50"
                  >
                    <div
                      className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-full",
                        vote.voteType === "up"
                          ? "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400"
                          : "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
                      )}
                    >
                      {vote.voteType === "up" ? (
                        <ThumbsUp className="h-4 w-4" />
                      ) : (
                        <ThumbsDown className="h-4 w-4" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">
                        {vote.songTitle}
                      </div>
                      <div className="text-muted-foreground text-sm">
                        <span className="truncate">{vote.artist}</span>
                        {!showId && (
                          <>
                            <span className="mx-1">•</span>
                            <span className="truncate">{vote.showName}</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-muted-foreground text-xs">
                        {formatDistanceToNow(new Date(vote.createdAt), {
                          addSuffix: true,
                        })}
                      </div>
                      {vote.currentNetVotes !== undefined && (
                        <div className="font-medium text-sm">
                          Net: {vote.currentNetVotes > 0 ? "+" : ""}
                          {vote.currentNetVotes}
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {hasMore && (
                <div className="pt-4 text-center">
                  <Button variant="outline" onClick={loadMore}>
                    Load More
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              <Music className="mx-auto mb-2 h-8 w-8 opacity-50" />
              <p className="text-sm">No votes found</p>
              {userId && (
                <p className="mt-1 text-xs">
                  Start voting on songs to see your history here
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
