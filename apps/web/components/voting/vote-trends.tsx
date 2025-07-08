'use client';

import { Badge } from '@repo/design-system/components/ui/badge';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@repo/design-system/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@repo/design-system/components/ui/select';
import { cn } from '@repo/design-system/lib/utils';
import { motion } from 'framer-motion';
import {
  Activity,
  BarChart3,
  Clock,
  TrendingDown,
  TrendingUp,
  Zap,
} from 'lucide-react';
import { useEffect, useState } from 'react';

interface VoteTrendsProps {
  showId: string;
  setlistId?: string;
  className?: string;
}

interface TrendData {
  hourly: Array<{
    hour: string;
    votes: number;
    upvotes: number;
    downvotes: number;
    timestamp: string;
  }>;
  summary: {
    totalVotes: number;
    peakHour: string;
    quietHour: string;
    averageVotesPerHour: number;
    currentTrend: 'up' | 'down' | 'stable';
    momentumScore: number;
  };
  topMoments: Array<{
    time: string;
    event: string;
    votes: number;
    impact: 'high' | 'medium' | 'low';
  }>;
  predictions: {
    nextHourVotes: number;
    confidence: number;
    factors: string[];
  };
}

export function VoteTrends({ showId, setlistId, className }: VoteTrendsProps) {
  const [data, setData] = useState<TrendData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState('24h');

  useEffect(() => {
    const fetchTrends = async () => {
      try {
        const params = new URLSearchParams({ showId, timeframe });
        if (setlistId) params.set('setlistId', setlistId);

        const response = await fetch(`/api/votes/trends?${params}`);
        if (response.ok) {
          const result = await response.json();
          setData(result);
        }
      } catch (error) {
        console.error('Failed to fetch vote trends:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTrends();

    // Auto-refresh every 5 minutes
    const interval = setInterval(fetchTrends, 300000);
    return () => clearInterval(interval);
  }, [showId, setlistId, timeframe]);

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            <div className="h-6 w-32 animate-pulse rounded bg-muted" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="h-32 animate-pulse rounded-lg bg-muted" />
            <div className="grid grid-cols-3 gap-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-16 animate-pulse rounded bg-muted" />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card className={className}>
        <CardContent className="py-8 text-center text-muted-foreground">
          <Activity className="mx-auto mb-2 h-8 w-8 opacity-50" />
          <p>No trend data available</p>
        </CardContent>
      </Card>
    );
  }

  const maxVotes = Math.max(...data.hourly.map((h) => h.votes), 1);
  const getTrendIcon = () => {
    switch (data.summary.currentTrend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'down':
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      default:
        return <Activity className="h-4 w-4 text-blue-600" />;
    }
  };

  const getMomentumColor = (score: number) => {
    if (score >= 0.7) return 'text-green-600';
    if (score >= 0.4) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="h-6 w-6" />
          <h3 className="font-semibold text-xl">Voting Trends</h3>
        </div>

        <Select value={timeframe} onValueChange={setTimeframe}>
          <SelectTrigger className="w-[120px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="6h">Last 6 hours</SelectItem>
            <SelectItem value="12h">Last 12 hours</SelectItem>
            <SelectItem value="24h">Last 24 hours</SelectItem>
            <SelectItem value="48h">Last 48 hours</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center gap-1 font-bold text-2xl">
              {getTrendIcon()}
              {data.summary.totalVotes}
            </div>
            <p className="text-muted-foreground text-sm">Total Votes</p>
            <Badge
              variant="outline"
              className={cn(
                'mt-1 text-xs',
                data.summary.currentTrend === 'up' &&
                  'border-green-600 text-green-600',
                data.summary.currentTrend === 'down' &&
                  'border-red-600 text-red-600'
              )}
            >
              {data.summary.currentTrend}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <div className="font-bold text-2xl text-orange-600">
              {data.summary.peakHour}
            </div>
            <p className="text-muted-foreground text-sm">Peak Hour</p>
            <div className="mt-1 text-muted-foreground text-xs">
              Most active time
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <div className="font-bold text-2xl">
              {data.summary.averageVotesPerHour.toFixed(1)}
            </div>
            <p className="text-muted-foreground text-sm">Avg/Hour</p>
            <div className="mt-1 text-muted-foreground text-xs">
              Voting rate
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <div
              className={cn(
                'font-bold text-2xl',
                getMomentumColor(data.summary.momentumScore)
              )}
            >
              {(data.summary.momentumScore * 100).toFixed(0)}%
            </div>
            <p className="text-muted-foreground text-sm">Momentum</p>
            <div className="mt-1 text-muted-foreground text-xs">
              Engagement score
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Hourly Chart */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <BarChart3 className="h-4 w-4" />
            Hourly Voting Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {data.hourly.map((hour, index) => (
              <motion.div
                key={hour.hour}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.02 }}
                className="flex items-center gap-3"
              >
                <div className="w-12 text-right text-muted-foreground text-xs">
                  {hour.hour}
                </div>

                <div className="flex flex-1 items-center gap-2">
                  <div className="relative h-6 flex-1 overflow-hidden rounded-full bg-muted">
                    <motion.div
                      className="relative h-full bg-blue-500"
                      initial={{ width: 0 }}
                      animate={{ width: `${(hour.votes / maxVotes) * 100}%` }}
                      transition={{ delay: index * 0.02, duration: 0.5 }}
                    >
                      {/* Upvotes portion */}
                      <div
                        className="absolute top-0 left-0 h-full bg-green-500"
                        style={{
                          width:
                            hour.votes > 0
                              ? `${(hour.upvotes / hour.votes) * 100}%`
                              : '0%',
                        }}
                      />
                    </motion.div>

                    {/* Peak indicator */}
                    {hour.votes === maxVotes && maxVotes > 0 && (
                      <Zap className="-translate-y-1/2 absolute top-1/2 right-1 h-3 w-3 text-yellow-400" />
                    )}
                  </div>

                  <div className="w-8 text-right font-medium text-sm">
                    {hour.votes}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Legend */}
          <div className="mt-4 flex items-center justify-center gap-4 text-muted-foreground text-xs">
            <div className="flex items-center gap-1">
              <div className="h-3 w-3 rounded bg-green-500" />
              <span>Upvotes</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="h-3 w-3 rounded bg-blue-500" />
              <span>Total Votes</span>
            </div>
            <div className="flex items-center gap-1">
              <Zap className="h-3 w-3 text-yellow-400" />
              <span>Peak Activity</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Moments & Predictions */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Top Moments */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Clock className="h-4 w-4" />
              Key Moments
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.topMoments.length > 0 ? (
              <div className="space-y-3">
                {data.topMoments.map((moment, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center gap-3 rounded-lg border p-2"
                  >
                    <div
                      className={cn(
                        'h-2 w-2 rounded-full',
                        moment.impact === 'high' && 'bg-red-500',
                        moment.impact === 'medium' && 'bg-yellow-500',
                        moment.impact === 'low' && 'bg-green-500'
                      )}
                    />

                    <div className="flex-1">
                      <div className="font-medium text-sm">{moment.event}</div>
                      <div className="text-muted-foreground text-xs">
                        {moment.time} • {moment.votes} votes
                      </div>
                    </div>

                    <Badge
                      variant="outline"
                      className={cn(
                        'text-xs',
                        moment.impact === 'high' &&
                          'border-red-500 text-red-600',
                        moment.impact === 'medium' &&
                          'border-yellow-500 text-yellow-600',
                        moment.impact === 'low' &&
                          'border-green-500 text-green-600'
                      )}
                    >
                      {moment.impact}
                    </Badge>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="py-4 text-center text-muted-foreground">
                <Clock className="mx-auto mb-2 h-8 w-8 opacity-50" />
                <p className="text-sm">No significant moments detected</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Predictions */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="h-4 w-4" />
              Predictions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border p-4 text-center">
              <div className="font-bold text-2xl text-blue-600">
                {data.predictions.nextHourVotes}
              </div>
              <div className="text-muted-foreground text-sm">
                Predicted votes next hour
              </div>
              <Badge variant="outline" className="mt-2">
                {(data.predictions.confidence * 100).toFixed(0)}% confidence
              </Badge>
            </div>

            {data.predictions.factors.length > 0 && (
              <div>
                <div className="mb-2 font-medium text-sm">
                  Influencing factors:
                </div>
                <div className="space-y-1">
                  {data.predictions.factors.map((factor, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-1 text-muted-foreground text-xs"
                    >
                      <div className="h-1 w-1 rounded-full bg-blue-500" />
                      {factor}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
