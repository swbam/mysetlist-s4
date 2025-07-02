'use client';

import { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Activity,
  Clock,
  Calendar,
  BarChart3,
  Zap,
  Users
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@repo/design-system/components/ui/card';
import { Badge } from '@repo/design-system/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@repo/design-system/components/ui/select';
import { cn } from '@repo/design-system/lib/utils';
import { motion } from 'framer-motion';
import { format, subHours, eachHourOfInterval, startOfHour } from 'date-fns';

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
            <div className="h-6 w-32 bg-muted animate-pulse rounded" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="h-32 bg-muted animate-pulse rounded-lg" />
            <div className="grid grid-cols-3 gap-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-16 bg-muted animate-pulse rounded" />
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
          <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>No trend data available</p>
        </CardContent>
      </Card>
    );
  }

  const maxVotes = Math.max(...data.hourly.map(h => h.votes), 1);
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
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="h-6 w-6" />
          <h3 className="text-xl font-semibold">Voting Trends</h3>
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
      <div className="grid md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center gap-1 text-2xl font-bold">
              {getTrendIcon()}
              {data.summary.totalVotes}
            </div>
            <p className="text-sm text-muted-foreground">Total Votes</p>
            <Badge 
              variant="outline" 
              className={cn(
                "mt-1 text-xs",
                data.summary.currentTrend === 'up' && "border-green-600 text-green-600",
                data.summary.currentTrend === 'down' && "border-red-600 text-red-600"
              )}
            >
              {data.summary.currentTrend}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-orange-600">
              {data.summary.peakHour}
            </div>
            <p className="text-sm text-muted-foreground">Peak Hour</p>
            <div className="text-xs text-muted-foreground mt-1">
              Most active time
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold">
              {data.summary.averageVotesPerHour.toFixed(1)}
            </div>
            <p className="text-sm text-muted-foreground">Avg/Hour</p>
            <div className="text-xs text-muted-foreground mt-1">
              Voting rate
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <div className={cn(
              "text-2xl font-bold",
              getMomentumColor(data.summary.momentumScore)
            )}>
              {(data.summary.momentumScore * 100).toFixed(0)}%
            </div>
            <p className="text-sm text-muted-foreground">Momentum</p>
            <div className="text-xs text-muted-foreground mt-1">
              Engagement score
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Hourly Chart */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
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
                <div className="text-xs text-muted-foreground w-12 text-right">
                  {hour.hour}
                </div>
                
                <div className="flex-1 flex items-center gap-2">
                  <div className="flex-1 h-6 bg-muted rounded-full overflow-hidden relative">
                    <motion.div 
                      className="h-full bg-blue-500 relative"
                      initial={{ width: 0 }}
                      animate={{ width: `${(hour.votes / maxVotes) * 100}%` }}
                      transition={{ delay: index * 0.02, duration: 0.5 }}
                    >
                      {/* Upvotes portion */}
                      <div 
                        className="h-full bg-green-500 absolute top-0 left-0"
                        style={{ 
                          width: hour.votes > 0 ? `${(hour.upvotes / hour.votes) * 100}%` : '0%' 
                        }}
                      />
                    </motion.div>
                    
                    {/* Peak indicator */}
                    {hour.votes === maxVotes && maxVotes > 0 && (
                      <Zap className="absolute right-1 top-1/2 -translate-y-1/2 h-3 w-3 text-yellow-400" />
                    )}
                  </div>
                  
                  <div className="text-sm font-medium w-8 text-right">
                    {hour.votes}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
          
          {/* Legend */}
          <div className="flex items-center justify-center gap-4 mt-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-green-500 rounded" />
              <span>Upvotes</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-blue-500 rounded" />
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
      <div className="grid md:grid-cols-2 gap-6">
        {/* Top Moments */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
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
                    className="flex items-center gap-3 p-2 rounded-lg border"
                  >
                    <div className={cn(
                      "w-2 h-2 rounded-full",
                      moment.impact === 'high' && "bg-red-500",
                      moment.impact === 'medium' && "bg-yellow-500",
                      moment.impact === 'low' && "bg-green-500"
                    )} />
                    
                    <div className="flex-1">
                      <div className="font-medium text-sm">{moment.event}</div>
                      <div className="text-xs text-muted-foreground">
                        {moment.time} • {moment.votes} votes
                      </div>
                    </div>
                    
                    <Badge 
                      variant="outline"
                      className={cn(
                        "text-xs",
                        moment.impact === 'high' && "border-red-500 text-red-600",
                        moment.impact === 'medium' && "border-yellow-500 text-yellow-600",
                        moment.impact === 'low' && "border-green-500 text-green-600"
                      )}
                    >
                      {moment.impact}
                    </Badge>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-muted-foreground">
                <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No significant moments detected</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Predictions */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Predictions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {data.predictions.nextHourVotes}
              </div>
              <div className="text-sm text-muted-foreground">
                Predicted votes next hour
              </div>
              <Badge variant="outline" className="mt-2">
                {(data.predictions.confidence * 100).toFixed(0)}% confidence
              </Badge>
            </div>
            
            {data.predictions.factors.length > 0 && (
              <div>
                <div className="text-sm font-medium mb-2">Influencing factors:</div>
                <div className="space-y-1">
                  {data.predictions.factors.map((factor, index) => (
                    <div key={index} className="text-xs text-muted-foreground flex items-center gap-1">
                      <div className="w-1 h-1 bg-blue-500 rounded-full" />
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