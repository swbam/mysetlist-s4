'use client';

import { useCallback, useEffect, useState } from 'react';

export interface RecentActivityItem {
  id: string;
  type: 'vote' | 'attendance' | 'comment' | 'follow';
  user: {
    name: string;
    avatar?: string;
  };
  target: {
    type: 'show' | 'artist' | 'venue';
    name: string;
    slug: string;
  };
  timestamp: string;
  metadata?: {
    voteCount?: number;
    comment?: string;
  };
}

export interface UseRecentActivityOptions {
  limit?: number;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export function useRecentActivity(options: UseRecentActivityOptions = {}) {
  const {
    limit = 20,
    autoRefresh = true,
    refreshInterval = 30 * 1000, // 30 seconds
  } = options;

  const [activities, setActivities] = useState<RecentActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchActivities = useCallback(async () => {
    try {
      setError(null);
      const params = new URLSearchParams({
        limit: limit.toString(),
      });

      const response = await fetch(`/api/activity-feed?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch recent activity');
      }

      const data = await response.json();

      // Transform the data to match our interface
      const transformedActivities: RecentActivityItem[] =
        data.activities?.map((activity: any) => ({
          id: activity.id,
          type: activity.type,
          user: {
            name: activity.userName || 'Anonymous',
            avatar: activity.userAvatar,
          },
          target: {
            type: activity.targetType,
            name: activity.targetName,
            slug: activity.targetSlug,
          },
          timestamp: activity.createdAt,
          metadata: {
            voteCount: activity.voteCount,
            comment: activity.comment,
          },
        })) || [];

      setActivities(transformedActivities);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load recent activity'
      );
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  useEffect(() => {
    if (!autoRefresh) {
      return;
    }

    const interval = setInterval(fetchActivities, refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, fetchActivities]);

  return {
    activities,
    loading,
    error,
    refetch: fetchActivities,
  };
}
