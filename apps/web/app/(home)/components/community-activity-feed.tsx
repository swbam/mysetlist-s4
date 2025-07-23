'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@repo/design-system/components/ui/avatar';
import { Badge } from '@repo/design-system/components/ui/badge';
import { Button } from '@repo/design-system/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@repo/design-system/components/ui/card';
import { Skeleton } from '@repo/design-system/components/ui/skeleton';
import { formatDistanceToNow } from 'date-fns';
import { motion } from 'framer-motion';
import { Activity, ChevronRight, ListMusic, ThumbsDown, ThumbsUp } from 'lucide-react';
import Link from 'next/link';
import React, { useEffect, useState } from 'react';

interface ActivityItem {
  id: string;
  type: 'vote' | 'setlist_create';
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
    songCount?: number;
  };
}

interface ActivityResponse {
  activities: ActivityItem[];
  total: number;
  hasMore: boolean;
  generatedAt: string;
  fallback?: boolean;
  error?: string;
}

// Activity item component
const ActivityItemComponent = ({ activity, index }: { activity: ActivityItem; index: number }) => {
  const getActivityIcon = () => {
    if (activity.type === 'vote') {
      return activity.metadata?.voteType === 'up' ? (
        <ThumbsUp className="h-4 w-4 text-green-500" />
      ) : (
        <ThumbsDown className="h-4 w-4 text-red-500" />
      );
    }
    return <ListMusic className="h-4 w-4 text-blue-500" />;
  };

  const getActivityText = () => {
    if (activity.type === 'vote') {
      const voteText = activity.metadata?.voteType === 'up' ? 'upvoted' : 'downvoted';
      return `${voteText} a song for`;
    }
    return 'created a setlist for';
  };

  const getTargetLink = () => {
    switch (activity.target.type) {
      case 'artist':
        return `/artists/${activity.target.slug}`;
      case 'show':
        return `/shows/${activity.target.slug}`;
      case 'venue':
        return `/venues/${activity.target.slug}`;
      default:
        return `/shows/${activity.target.slug}`;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/30 transition-colors duration-200"
    >
      <Avatar className="h-8 w-8 flex-shrink-0">
        <AvatarImage src={activity.user.avatarUrl} />
        <AvatarFallback className="text-xs">
          {activity.user.displayName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          {getActivityIcon()}
          <span className="font-medium text-sm truncate">
            {activity.user.displayName}
          </span>
          <span className="text-muted-foreground text-xs">
            {getActivityText()}
          </span>
        </div>
        
        <Link 
          href={getTargetLink()}
          className="text-sm text-primary hover:text-primary/80 transition-colors truncate block"
        >
          {activity.target.name}
        </Link>
        
        <div className="flex items-center justify-between mt-2">
          <span className="text-muted-foreground text-xs">
            {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
          </span>
          
          {activity.metadata?.songCount && (
            <Badge variant="secondary" className="text-xs">
              {activity.metadata.songCount} songs
            </Badge>
          )}
        </div>
      </div>
    </motion.div>
  );
};

// Loading skeleton component
const ActivitySkeleton = () => (
  <div className="flex items-start gap-3 p-3">
    <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
    <div className="flex-1 space-y-2">
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-3 w-2/3" />
      <Skeleton className="h-3 w-1/3" />
    </div>
  </div>
);

function CommunityActivityFeed() {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchActivities = async () => {
      try {
        const response = await fetch('/api/activity/recent?limit=8');
        const data: ActivityResponse = await response.json();
        
        if (data.fallback) {
          console.warn('Using fallback activity data:', data.error);
        }
        
        setActivities(data.activities || []);
        setError(data.error || null);
      } catch (err) {
        console.error('Error fetching activity feed:', err);
        setError('Failed to load activity feed');
        setActivities([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchActivities();
    
    // Refresh every 30 seconds for live updates
    const interval = setInterval(fetchActivities, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="py-16 md:py-24">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-8"
          >
            <h2 className="mb-2 bg-gradient-to-r from-white to-white/80 bg-clip-text font-bold text-3xl text-transparent tracking-tight md:text-4xl">
              Community Activity
            </h2>
            <p className="text-lg text-muted-foreground">
              See what the community is up to right now
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <CardTitle className="flex items-center gap-2 text-xl">
                  <Activity className="h-5 w-5 text-primary" />
                  Live Feed
                </CardTitle>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/activity" className="flex items-center gap-1">
                    View All
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </Button>
              </CardHeader>
              
              <CardContent className="pt-0">
                {isLoading ? (
                  <div className="space-y-4">
                    {[...Array(5)].map((_, i) => (
                      <ActivitySkeleton key={i} />
                    ))}
                  </div>
                ) : error && activities.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-muted-foreground text-sm">
                      {error}
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="mt-4"
                      onClick={() => window.location.reload()}
                    >
                      Try Again
                    </Button>
                  </div>
                ) : activities.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-muted-foreground text-sm">
                      No recent activity found. Be the first to vote or create a setlist!
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1 max-h-96 overflow-y-auto">
                    {activities.map((activity, index) => (
                      <ActivityItemComponent
                        key={activity.id}
                        activity={activity}
                        index={index}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

export default CommunityActivityFeed;