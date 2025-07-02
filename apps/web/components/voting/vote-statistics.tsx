'use client';

import { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  BarChart3, 
  Clock,
  Activity,
  Award,
  Zap
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@repo/design-system/components/ui/card';
import { Badge } from '@repo/design-system/components/ui/badge';
import { Progress } from '@repo/design-system/components/ui/progress';
import { cn } from '@repo/design-system/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';

interface VoteStatisticsProps {
  showId: string;
  setlistId?: string;
  realtime?: boolean;
  className?: string;
}

interface VoteStats {
  totalVotes: number;
  totalUpvotes: number;
  totalDownvotes: number;
  uniqueVoters: number;
  averageNetVotes: number;
  topSongs: Array<{
    id: string;
    title: string;
    artist: string;
    netVotes: number;
    upvotes: number;
    downvotes: number;
    totalVotes: number;
    rank: number;
  }>;
  recentActivity: Array<{
    id: string;
    songTitle: string;
    voteType: 'up' | 'down';
    timestamp: string;
    username?: string;
  }>;
  votingTrends: {
    lastHour: number;
    peakTime?: string;
    quietTime?: string;
  };
}

export function VoteStatistics({ 
  showId, 
  setlistId, 
  realtime = false,
  className 
}: VoteStatisticsProps) {
  const [stats, setStats] = useState<VoteStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const fetchStats = async () => {
    try {
      const params = new URLSearchParams({ showId });
      if (setlistId) params.set('setlistId', setlistId);
      
      const response = await fetch(`/api/votes/statistics?${params}`);
      if (response.ok) {
        const data = await response.json();
        setStats(data);
        setLastUpdate(new Date());
      }
    } catch (error) {
      console.error('Failed to fetch vote statistics:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    
    if (realtime) {
      const interval = setInterval(fetchStats, 30000); // Update every 30 seconds
      return () => clearInterval(interval);
    }
  }, [showId, setlistId, realtime]);

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            <div className="h-6 w-32 bg-muted animate-pulse rounded" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!stats) {
    return (
      <Card className={className}>
        <CardContent className="py-8 text-center text-muted-foreground">
          <BarChart3 className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>No voting data available</p>
        </CardContent>
      </Card>
    );
  }

  const { 
    totalVotes, 
    totalUpvotes, 
    totalDownvotes, 
    uniqueVoters,
    topSongs, 
    recentActivity,
    votingTrends 
  } = stats;

  const netVotes = totalUpvotes - totalDownvotes;
  const upvotePercentage = totalVotes > 0 ? (totalUpvotes / totalVotes) * 100 : 0;
  const participationRate = uniqueVoters > 0 ? (totalVotes / uniqueVoters).toFixed(1) : '0';

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header with Live Indicator */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-6 w-6" />
          <h3 className="text-xl font-semibold">Vote Statistics</h3>
          {realtime && (
            <Badge variant="outline" className="gap-1">
              <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
              Live
            </Badge>
          )}
        </div>
        {lastUpdate && (
          <span className="text-xs text-muted-foreground">
            Updated {formatDistanceToNow(lastUpdate, { addSuffix: true })}
          </span>
        )}
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center gap-1 text-2xl font-bold">
                <Activity className="h-5 w-5 text-muted-foreground" />
                {totalVotes}
              </div>
              <p className="text-sm text-muted-foreground">Total Votes</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center gap-1 text-2xl font-bold text-green-600">
                <TrendingUp className="h-5 w-5" />
                {totalUpvotes}
              </div>
              <p className="text-sm text-muted-foreground">Upvotes</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card>
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center gap-1 text-2xl font-bold text-red-600">
                <TrendingDown className="h-5 w-5" />
                {totalDownvotes}
              </div>
              <p className="text-sm text-muted-foreground">Downvotes</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card>
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center gap-1 text-2xl font-bold">
                <Users className="h-5 w-5 text-muted-foreground" />
                {uniqueVoters}
              </div>
              <p className="text-sm text-muted-foreground">Voters</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Vote Distribution & Sentiment */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Vote Distribution */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Vote Distribution</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {totalVotes > 0 ? (
              <>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-green-600">
                      Upvotes ({upvotePercentage.toFixed(1)}%)
                    </span>
                    <span className="text-red-600">
                      Downvotes ({(100 - upvotePercentage).toFixed(1)}%)
                    </span>
                  </div>
                  <div className="flex gap-1 h-3 rounded-full overflow-hidden bg-muted">
                    <motion.div 
                      className="bg-green-500"
                      initial={{ width: 0 }}
                      animate={{ width: `${upvotePercentage}%` }}
                      transition={{ duration: 0.8, ease: "easeOut" }}
                    />
                    <motion.div 
                      className="bg-red-500"
                      initial={{ width: 0 }}
                      animate={{ width: `${100 - upvotePercentage}%` }}
                      transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <div className="text-lg font-semibold">{participationRate}</div>
                    <div className="text-xs text-muted-foreground">Avg votes per user</div>
                  </div>
                  <div>
                    <div className={cn(
                      "text-lg font-semibold",
                      netVotes > 0 && "text-green-600",
                      netVotes < 0 && "text-red-600"
                    )}>
                      {netVotes > 0 ? '+' : ''}{netVotes}
                    </div>
                    <div className="text-xs text-muted-foreground">Net sentiment</div>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-4 text-muted-foreground">
                <BarChart3 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No votes yet</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Voting Activity */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentActivity.length > 0 ? (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                <AnimatePresence>
                  {recentActivity.slice(0, 10).map((activity, index) => (
                    <motion.div
                      key={activity.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex items-center justify-between text-sm"
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div className={cn(
                          "w-2 h-2 rounded-full",
                          activity.voteType === 'up' ? "bg-green-500" : "bg-red-500"
                        )} />
                        <span className="truncate">
                          {activity.songTitle}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                      </span>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            ) : (
              <div className="text-center py-4 text-muted-foreground">
                <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No recent activity</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Songs */}
      {topSongs.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Award className="h-4 w-4" />
              Most Voted Songs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topSongs.slice(0, 5).map((song, index) => (
                <motion.div
                  key={song.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card/50"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted text-sm font-bold">
                      #{index + 1}
                    </div>
                    <div className="min-w-0">
                      <div className="font-medium truncate">{song.title}</div>
                      <div className="text-sm text-muted-foreground truncate">
                        {song.artist}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {song.netVotes >= 50 && (
                      <Badge variant="outline" className="gap-1 text-orange-600 border-orange-600">
                        <Zap className="h-3 w-3" />
                        Hot
                      </Badge>
                    )}
                    <Badge 
                      variant={song.netVotes > 0 ? "default" : song.netVotes < 0 ? "destructive" : "secondary"}
                    >
                      {song.netVotes > 0 ? '+' : ''}{song.netVotes}
                    </Badge>
                    <div className="text-xs text-muted-foreground text-right">
                      <div>{song.upvotes} ↑</div>
                      <div>{song.downvotes} ↓</div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Voting Trends */}
      {votingTrends.lastHour > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Voting Trends
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-blue-600">
                  {votingTrends.lastHour}
                </div>
                <div className="text-sm text-muted-foreground">Votes in last hour</div>
              </div>
              {votingTrends.peakTime && (
                <div>
                  <div className="text-lg font-semibold">
                    {votingTrends.peakTime}
                  </div>
                  <div className="text-sm text-muted-foreground">Peak voting time</div>
                </div>
              )}
              {votingTrends.quietTime && (
                <div>
                  <div className="text-lg font-semibold">
                    {votingTrends.quietTime}
                  </div>
                  <div className="text-sm text-muted-foreground">Quietest time</div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}