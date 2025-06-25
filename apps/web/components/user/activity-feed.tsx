'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../../app/providers/auth-provider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@repo/design-system/components/ui/card';
import { Button } from '@repo/design-system/components/ui/button';
import { Badge } from '@repo/design-system/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@repo/design-system/components/ui/avatar';
import { UserDisplay } from './user-avatar';
import { 
  Activity, 
  Heart, 
  Music, 
  Calendar, 
  ChevronUp, 
  ChevronDown, 
  Users,
  RefreshCw,
  Clock
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface ActivityItem {
  id: string;
  type: 'follow' | 'unfollow' | 'vote_up' | 'vote_down' | 'setlist_create' | 'show_attend' | 'show_plan';
  user: {
    id: string;
    email?: string;
    displayName?: string;
    avatarUrl?: string;
  };
  artist?: {
    id: string;
    name: string;
    imageUrl?: string;
    slug: string;
  };
  show?: {
    id: string;
    name: string;
    date: string;
    slug: string;
  };
  venue?: {
    id: string;
    name: string;
    slug: string;
  };
  song?: {
    id: string;
    title: string;
    artist: string;
  };
  timestamp: string;
  metadata?: Record<string, any>;
}

interface ActivityFeedProps {
  userId?: string; // If provided, show only this user's activity
  artistId?: string; // If provided, show only activity related to this artist
  showId?: string; // If provided, show only activity related to this show
  limit?: number;
  showHeader?: boolean;
  className?: string;
}

export function ActivityFeed({
  userId,
  artistId,
  showId,
  limit = 20,
  showHeader = true,
  className,
}: ActivityFeedProps) {
  const { user: currentUser } = useAuth();
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchActivities();
    
    // Set up real-time subscription if user is authenticated
    if (currentUser) {
      // setupRealtimeSubscription();
    }
  }, [userId, artistId, showId, currentUser]);

  const fetchActivities = async () => {
    try {
      const params = new URLSearchParams();
      if (userId) params.set('userId', userId);
      if (artistId) params.set('artistId', artistId);
      if (showId) params.set('showId', showId);
      if (limit) params.set('limit', limit.toString());

      const response = await fetch(`/api/activity-feed?${params}`);
      if (response.ok) {
        const data = await response.json();
        setActivities(data.activities || []);
      }
    } catch (error) {
      console.error('Failed to fetch activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchActivities();
    setRefreshing(false);
  };

  const formatTimeAgo = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  };

  const getActivityIcon = (type: string) => {
    const iconClass = "h-4 w-4";
    switch (type) {
      case 'follow':
        return <Heart className={cn(iconClass, "text-red-500")} />;
      case 'unfollow':
        return <Heart className={cn(iconClass, "text-muted-foreground")} />;
      case 'vote_up':
        return <ChevronUp className={cn(iconClass, "text-green-500")} />;
      case 'vote_down':
        return <ChevronDown className={cn(iconClass, "text-red-500")} />;
      case 'setlist_create':
        return <Music className={cn(iconClass, "text-blue-500")} />;
      case 'show_attend':
        return <Calendar className={cn(iconClass, "text-purple-500")} />;
      case 'show_plan':
        return <Calendar className={cn(iconClass, "text-orange-500")} />;
      default:
        return <Activity className={iconClass} />;
    }
  };

  const getActivityDescription = (activity: ActivityItem) => {
    const userName = activity.user.displayName || activity.user.email?.split('@')[0] || 'User';
    
    switch (activity.type) {
      case 'follow':
        return (
          <span>
            <strong>{userName}</strong> started following{' '}
            <Link href={`/artists/${activity.artist?.slug}`} className="font-medium text-primary hover:underline">
              {activity.artist?.name}
            </Link>
          </span>
        );
      case 'unfollow':
        return (
          <span>
            <strong>{userName}</strong> unfollowed{' '}
            <span className="font-medium">{activity.artist?.name}</span>
          </span>
        );
      case 'vote_up':
        return (
          <span>
            <strong>{userName}</strong> upvoted{' '}
            <span className="font-medium">{activity.song?.title}</span>
            {activity.show && (
              <>
                {' '}for{' '}
                <Link href={`/shows/${activity.show.slug}`} className="font-medium text-primary hover:underline">
                  {activity.show.name}
                </Link>
              </>
            )}
          </span>
        );
      case 'vote_down':
        return (
          <span>
            <strong>{userName}</strong> downvoted{' '}
            <span className="font-medium">{activity.song?.title}</span>
            {activity.show && (
              <>
                {' '}for{' '}
                <Link href={`/shows/${activity.show.slug}`} className="font-medium text-primary hover:underline">
                  {activity.show.name}
                </Link>
              </>
            )}
          </span>
        );
      case 'setlist_create':
        return (
          <span>
            <strong>{userName}</strong> created a setlist for{' '}
            <Link href={`/shows/${activity.show?.slug}`} className="font-medium text-primary hover:underline">
              {activity.show?.name}
            </Link>
          </span>
        );
      case 'show_attend':
        return (
          <span>
            <strong>{userName}</strong> attended{' '}
            <Link href={`/shows/${activity.show?.slug}`} className="font-medium text-primary hover:underline">
              {activity.show?.name}
            </Link>
            {activity.venue && <span> at {activity.venue.name}</span>}
          </span>
        );
      case 'show_plan':
        return (
          <span>
            <strong>{userName}</strong> is planning to attend{' '}
            <Link href={`/shows/${activity.show?.slug}`} className="font-medium text-primary hover:underline">
              {activity.show?.name}
            </Link>
            {activity.venue && <span> at {activity.venue.name}</span>}
          </span>
        );
      default:
        return <span><strong>{userName}</strong> performed an action</span>;
    }
  };

  if (loading) {
    return (
      <Card className={className}>
        {showHeader && (
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Activity Feed
            </CardTitle>
          </CardHeader>
        )}
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-start gap-3 animate-pulse">
                <div className="h-8 w-8 bg-muted rounded-full"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                  <div className="h-3 bg-muted rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      {showHeader && (
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Activity Feed
              </CardTitle>
              <CardDescription>
                {userId ? 'User activity' : 'Recent community activity'}
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
            </Button>
          </div>
        </CardHeader>
      )}
      
      <CardContent className={showHeader ? "" : "pt-6"}>
        <div className="space-y-4">
          {activities.length === 0 ? (
            <div className="text-center py-8">
              <Activity className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No recent activity</h3>
              <p className="text-muted-foreground">
                Activity will appear here when users interact with shows and artists.
              </p>
            </div>
          ) : (
            activities.map((activity) => (
              <div key={activity.id} className="flex items-start gap-3 group">
                <div className="flex-shrink-0 mt-1">
                  {getActivityIcon(activity.type)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-3">
                    <UserDisplay
                      user={activity.user}
                      size="sm"
                      showName={false}
                      className="flex-shrink-0"
                    />
                    
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">
                        {getActivityDescription(activity)}
                      </p>
                      
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-muted-foreground">
                          {formatTimeAgo(activity.timestamp)}
                        </span>
                        
                        {activity.show?.date && (
                          <Badge variant="outline" className="text-xs">
                            {new Date(activity.show.date).toLocaleDateString()}
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    {activity.artist?.imageUrl && (
                      <Avatar className="h-6 w-6 flex-shrink-0">
                        <AvatarImage src={activity.artist.imageUrl} alt={activity.artist.name} />
                        <AvatarFallback>
                          <Music className="h-3 w-3" />
                        </AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
          
          {activities.length >= limit && (
            <div className="text-center pt-4">
              <Button variant="outline" size="sm">
                Load More Activity
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Compact version for sidebar or smaller spaces
export function ActivityFeedCompact(props: ActivityFeedProps) {
  return (
    <ActivityFeed
      {...props}
      limit={5}
      showHeader={false}
      className={cn("border-0 shadow-none", props.className)}
    />
  );
}