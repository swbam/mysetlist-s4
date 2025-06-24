'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@repo/design-system/components/ui/avatar';
import { Badge } from '@repo/design-system/components/ui/badge';
import { Button } from '@repo/design-system/components/ui/button';
import { Skeleton } from '@repo/design-system/components/ui/skeleton';
import { 
  TrendingUp, 
  Users, 
  MessageCircle, 
  Heart, 
  Music, 
  Calendar, 
  UserPlus,
  Vote,
  Clock
} from 'lucide-react';

interface ActivityItem {
  id: string;
  type: 'vote' | 'comment' | 'follow' | 'attendance' | 'setlist_create' | 'show_create';
  user: {
    id: string;
    displayName: string;
    avatarUrl?: string;
  };
  target: {
    id: string;
    name: string;
    slug: string;
    type: 'artist' | 'show' | 'venue' | 'setlist';
  };
  createdAt: string;
  metadata?: {
    voteType?: 'up' | 'down';
    commentText?: string;
    songCount?: number;
  };
}

export function RecentActivity() {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchRecentActivity();
  }, []);

  const fetchRecentActivity = async () => {
    try {
      const response = await fetch('/api/activity/recent?limit=15');
      if (!response.ok) throw new Error('Failed to fetch recent activity');
      
      const data = await response.json();
      setActivities(data.activities || []);
    } catch (err) {
      console.error('Error fetching recent activity:', err);
      setError('Failed to load recent activity');
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'vote': return <Vote className="h-3 w-3" />;
      case 'comment': return <MessageCircle className="h-3 w-3" />;
      case 'follow': return <UserPlus className="h-3 w-3" />;
      case 'attendance': return <Users className="h-3 w-3" />;
      case 'setlist_create': return <Music className="h-3 w-3" />;
      case 'show_create': return <Calendar className="h-3 w-3" />;
      default: return <Heart className="h-3 w-3" />;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'vote': return 'text-green-500';
      case 'comment': return 'text-blue-500';
      case 'follow': return 'text-purple-500';
      case 'attendance': return 'text-orange-500';
      case 'setlist_create': return 'text-pink-500';
      case 'show_create': return 'text-indigo-500';
      default: return 'text-gray-500';
    }
  };

  const getActivityText = (activity: ActivityItem) => {
    const { type, target, metadata } = activity;
    
    switch (type) {
      case 'vote':
        return `${metadata?.voteType === 'up' ? 'upvoted' : 'downvoted'} ${target.name}`;
      case 'comment':
        return `commented on ${target.name}`;
      case 'follow':
        return `started following ${target.name}`;
      case 'attendance':
        return `marked attending ${target.name}`;
      case 'setlist_create':
        return `created setlist for ${target.name}`;
      case 'show_create':
        return `added show ${target.name}`;
      default:
        return `interacted with ${target.name}`;
    }
  };

  const getTargetLink = (target: ActivityItem['target']) => {
    switch (target.type) {
      case 'artist': return `/artists/${target.slug}`;
      case 'show': return `/shows/${target.slug}`;
      case 'venue': return `/venues/${target.slug}`;
      case 'setlist': return `/setlists/${target.slug}`;
      default: return '#';
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-start gap-3">
            <Skeleton className="h-8 w-8 rounded-full" />
            <div className="flex-1 space-y-1">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground mb-4 text-sm">{error}</p>
        <Button onClick={fetchRecentActivity} variant="outline" size="sm">
          Try Again
        </Button>
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="text-center py-8">
        <Clock className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
        <p className="text-muted-foreground text-sm">No recent activity</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {activities.map((activity) => (
        <div key={activity.id} className="flex items-start gap-3">
          {/* User Avatar */}
          <Avatar className="h-8 w-8">
            <AvatarImage src={activity.user.avatarUrl} alt={activity.user.displayName} />
            <AvatarFallback className="text-xs">
              {activity.user.displayName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          {/* Activity Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1 mb-1">
              <span className={`${getActivityColor(activity.type)}`}>
                {getActivityIcon(activity.type)}
              </span>
              <Badge variant="outline" className="text-xs">
                {activity.type.replace('_', ' ')}
              </Badge>
            </div>
            
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">
                {activity.user.displayName}
              </span>{' '}
              {getActivityText(activity)}
            </p>
            
            {activity.metadata?.commentText && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                "{activity.metadata.commentText}"
              </p>
            )}
            
            <div className="flex items-center justify-between mt-2">
              <Link
                href={getTargetLink(activity.target)}
                className="text-xs text-primary hover:underline"
              >
                View {activity.target.type}
              </Link>
              <span className="text-xs text-muted-foreground">
                {formatTimeAgo(activity.createdAt)}
              </span>
            </div>
          </div>
        </div>
      ))}
      
      {/* View More Link */}
      <div className="text-center pt-4 border-t">
        <Link href="/activity" className="text-sm text-primary hover:underline">
          View all activity →
        </Link>
      </div>
    </div>
  );
} 