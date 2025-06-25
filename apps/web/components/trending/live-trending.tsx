'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@repo/design-system/components/ui/card';
import { Badge } from '@repo/design-system/components/ui/badge';
import { Button } from '@repo/design-system/components/ui/button';
import { Skeleton } from '@repo/design-system/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@repo/design-system/components/ui/avatar';
import { 
  TrendingUp, 
  TrendingDown, 
  Music, 
  Calendar, 
  MapPin, 
  Eye, 
  Search,
  Activity,
  RefreshCw,
  Flame
} from 'lucide-react';
import { cn } from '@repo/design-system/lib/utils';

interface LiveTrendingItem {
  id: string;
  type: 'artist' | 'show' | 'venue';
  name: string;
  slug: string;
  imageUrl?: string;
  score: number;
  metrics: {
    searches: number;
    views: number;
    interactions: number;
    growth: number;
  };
  timeframe: '1h' | '6h' | '24h';
}

interface LiveTrendingProps {
  timeframe?: '1h' | '6h' | '24h';
  type?: 'artist' | 'show' | 'venue' | 'all';
  limit?: number;
  autoRefresh?: boolean;
  className?: string;
}

export function LiveTrending({ 
  timeframe = '24h', 
  type = 'all', 
  limit = 10,
  autoRefresh = true,
  className 
}: LiveTrendingProps) {
  const [trending, setTrending] = useState<LiveTrendingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchTrending = async (refresh = false) => {
    if (refresh) {
      setIsRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);
    
    try {
      const params = new URLSearchParams({
        timeframe,
        limit: limit.toString(),
        ...(type !== 'all' && { type })
      });
      
      const response = await fetch(`/api/trending/live?${params}`);
      if (!response.ok) throw new Error('Failed to fetch trending data');
      
      const data = await response.json();
      setTrending(data.trending);
      setLastUpdate(new Date());
    } catch (err) {
      console.error('Error fetching trending:', err);
      setError('Failed to load trending data');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTrending();
  }, [timeframe, type, limit]);

  // Auto-refresh every 5 minutes
  useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(() => {
      fetchTrending(true);
    }, 5 * 60 * 1000); // 5 minutes
    
    return () => clearInterval(interval);
  }, [autoRefresh, timeframe, type, limit]);

  const getIcon = (itemType: LiveTrendingItem['type']) => {
    switch (itemType) {
      case 'artist': return <Music className="h-4 w-4" />;
      case 'show': return <Calendar className="h-4 w-4" />;
      case 'venue': return <MapPin className="h-4 w-4" />;
    }
  };

  const getLink = (item: LiveTrendingItem) => {
    switch (item.type) {
      case 'artist': return `/artists/${item.slug}`;
      case 'show': return `/shows/${item.slug}`;
      case 'venue': return `/venues/${item.slug}`;
    }
  };

  const getGrowthColor = (growth: number) => {
    if (growth > 20) return 'text-red-500';
    if (growth > 10) return 'text-orange-500';
    if (growth > 0) return 'text-green-500';
    return 'text-gray-500';
  };

  const getGrowthIcon = (growth: number) => {
    return growth >= 0 ? TrendingUp : TrendingDown;
  };

  const formatTimeframe = (tf: string) => {
    switch (tf) {
      case '1h': return 'Last Hour';
      case '6h': return 'Last 6 Hours';
      case '24h': return 'Last 24 Hours';
      default: return tf;
    }
  };

  if (loading && !isRefreshing) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Flame className="h-5 w-5 text-orange-500" />
            Live Trending
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: limit }).map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="text-2xl font-bold text-muted-foreground w-8">
                  {i + 1}
                </div>
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <div className="text-right space-y-1">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-3 w-12" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Flame className="h-5 w-5 text-orange-500" />
            Live Trending
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={() => fetchTrending()} variant="outline">
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Flame className="h-5 w-5 text-orange-500" />
            Live Trending
            <Badge variant="outline" className="ml-2">
              {formatTimeframe(timeframe)}
            </Badge>
          </CardTitle>
          <div className="flex items-center gap-2">
            {lastUpdate && (
              <span className="text-xs text-muted-foreground">
                Updated {lastUpdate.toLocaleTimeString()}
              </span>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => fetchTrending(true)}
              disabled={isRefreshing}
              className="h-8 w-8 p-0"
            >
              <RefreshCw className={cn(
                "h-4 w-4",
                isRefreshing && "animate-spin"
              )} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {trending.map((item, index) => {
            const GrowthIcon = getGrowthIcon(item.metrics.growth);
            
            return (
              <div
                key={item.id}
                className="flex items-center gap-4 p-3 rounded-lg border hover:shadow-md transition-all duration-200 hover:scale-[1.02]"
              >
                {/* Rank */}
                <div className="text-2xl font-bold text-muted-foreground w-8">
                  {index + 1}
                </div>

                {/* Avatar/Icon */}
                <Avatar className="h-12 w-12">
                  {item.imageUrl ? (
                    <AvatarImage src={item.imageUrl} alt={item.name} />
                  ) : (
                    <AvatarFallback>
                      {getIcon(item.type)}
                    </AvatarFallback>
                  )}
                </Avatar>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Link
                      href={getLink(item)}
                      className="font-semibold hover:underline truncate"
                    >
                      {item.name}
                    </Link>
                    <Badge variant="outline" className="text-xs">
                      {item.type}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Search className="h-3 w-3" />
                      {item.metrics.searches}
                    </span>
                    <span className="flex items-center gap-1">
                      <Eye className="h-3 w-3" />
                      {item.metrics.views}
                    </span>
                    <span className="flex items-center gap-1">
                      <Activity className="h-3 w-3" />
                      {item.metrics.interactions}
                    </span>
                  </div>
                </div>

                {/* Score & Growth */}
                <div className="text-right">
                  <div className="flex items-center gap-1 text-sm font-medium">
                    <GrowthIcon className={cn("h-3 w-3", getGrowthColor(item.metrics.growth))} />
                    <span className={getGrowthColor(item.metrics.growth)}>
                      {item.metrics.growth > 0 ? '+' : ''}{item.metrics.growth.toFixed(1)}%
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Score: {item.score.toFixed(0)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}