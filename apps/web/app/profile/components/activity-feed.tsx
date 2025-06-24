'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { formatDistanceToNow } from 'date-fns';
import { 
  Calendar, 
  Music, 
  TrendingUp, 
  Plus,
  Loader2,
  ChevronRight 
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { ActivityItem } from '@/app/api/activity-feed/route';

export function ActivityFeed() {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const fetchActivities = async (newOffset = 0) => {
    try {
      setError(null);
      const response = await fetch(`/api/activity-feed?offset=${newOffset}&limit=10`);
      
      if (!response.ok) {
        if (response.status === 401) {
          setError('Please sign in to see your activity feed');
          return;
        }
        throw new Error('Failed to fetch activities');
      }

      const data = await response.json();
      
      if (newOffset === 0) {
        setActivities(data.activities);
      } else {
        setActivities(prev => [...prev, ...data.activities]);
      }
      
      setHasMore(data.hasMore);
      setOffset(newOffset);
      
      if (data.message && data.activities.length === 0) {
        setError(data.message);
      }
    } catch (err) {
      setError('Unable to load activity feed');
      console.error('Error fetching activities:', err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchActivities();
  }, []);

  const loadMore = () => {
    setLoadingMore(true);
    fetchActivities(offset + 10);
  };

  const getActivityIcon = (type: ActivityItem['type']) => {
    switch (type) {
      case 'new_show':
        return Calendar;
      case 'setlist_added':
        return Music;
      case 'show_update':
        return TrendingUp;
      default:
        return Calendar;
    }
  };

  const getActivityColor = (type: ActivityItem['type']) => {
    switch (type) {
      case 'new_show':
        return 'text-blue-500';
      case 'setlist_added':
        return 'text-green-500';
      case 'show_update':
        return 'text-orange-500';
      default:
        return 'text-gray-500';
    }
  };

  if (loading) {
    return <ActivityFeedSkeleton />;
  }

  if (error) {
    return (
      <Alert>
        <AlertDescription>{error}</AlertDescription>
        {error.includes('Follow') && (
          <Button asChild size="sm" className="mt-3">
            <Link href="/artists">Browse Artists</Link>
          </Button>
        )}
      </Alert>
    );
  }

  if (activities.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Music className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">No activity yet</h3>
          <p className="text-muted-foreground mb-4">
            Follow your favorite artists to see their latest updates here
          </p>
          <Button asChild>
            <Link href="/artists">Discover Artists</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Music className="w-5 h-5" />
            Activity Feed
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {activities.map((activity) => {
              const Icon = getActivityIcon(activity.type);
              const iconColor = getActivityColor(activity.type);
              
              return (
                <Link
                  key={activity.id}
                  href={activity.link || '#'}
                  className="block hover:bg-muted/50 transition-colors"
                >
                  <div className="p-4 flex items-start gap-3">
                    <div className={`mt-1 ${iconColor}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <p className="font-medium line-clamp-1">
                            {activity.title}
                          </p>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {activity.description}
                          </p>
                        </div>
                        
                        {activity.artistImage && (
                          <div className="relative w-10 h-10 rounded-md overflow-hidden flex-shrink-0">
                            <Image
                              src={activity.artistImage}
                              alt={activity.artistName}
                              fill
                              className="object-cover"
                            />
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-xs text-muted-foreground">
                          {activity.relativeTime}
                        </span>
                        
                        {activity.metadata?.voteCount && (
                          <Badge variant="secondary" className="text-xs">
                            {activity.metadata.voteCount} votes
                          </Badge>
                        )}
                        
                        {activity.metadata?.showDate && (
                          <span className="text-xs text-muted-foreground">
                            {new Date(activity.metadata.showDate).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-1" />
                  </div>
                </Link>
              );
            })}
          </div>
          
          {hasMore && (
            <div className="p-4 border-t">
              <Button
                onClick={loadMore}
                disabled={loadingMore}
                variant="outline"
                className="w-full"
              >
                {loadingMore ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Loading...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Load More
                  </>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ActivityFeedSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-32" />
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="p-4 flex items-start gap-3">
              <Skeleton className="w-5 h-5 rounded" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="w-10 h-10 rounded-md" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}