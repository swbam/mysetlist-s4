'use client';

import { useRealtimeShows } from '@/hooks/use-realtime-shows';
import { RealtimeShowCard } from './realtime-show-card';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, BellRing } from 'lucide-react';
import { useState, useEffect } from 'react';
import { cn } from '@repo/design-system/lib/utils';

interface RealtimeShowsFeedProps {
  limit?: number;
  status?: 'upcoming' | 'ongoing' | 'completed';
  artistId?: string;
  venueId?: string;
  className?: string;
}

export function RealtimeShowsFeed({ 
  limit = 10,
  status,
  artistId,
  venueId,
  className
}: RealtimeShowsFeedProps) {
  const [hasNewShows, setHasNewShows] = useState(false);
  
  const { shows, isLoading } = useRealtimeShows({
    limit,
    status,
    artistId,
    venueId,
    onNewShow: () => {
      setHasNewShows(true);
      // Auto-dismiss notification after 5 seconds
      setTimeout(() => setHasNewShows(false), 5000);
    },
  });

  // Filter to show only live shows first, then upcoming, then past
  const sortedShows = [...shows].sort((a, b) => {
    const statusOrder = { ongoing: 0, upcoming: 1, completed: 2 };
    const statusDiff = statusOrder[a.status] - statusOrder[b.status];
    if (statusDiff !== 0) return statusDiff;
    
    // Within same status, sort by date
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });

  const liveShows = sortedShows.filter(show => show.status === 'ongoing');
  const hasLiveShows = liveShows.length > 0;

  if (isLoading) {
    return (
      <div className={cn("space-y-4", className)}>
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-32 bg-muted animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* New show notification */}
      <AnimatePresence>
        {hasNewShows && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex items-center gap-2 p-3 bg-primary/10 rounded-lg"
          >
            <BellRing className="h-4 w-4 text-primary animate-pulse" />
            <span className="text-sm font-medium">New show added!</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Live shows section */}
      {hasLiveShows && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold">Live Now</h3>
            <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {liveShows.map(show => (
              <RealtimeShowCard
                key={show.id}
                show={show}
                className="border-red-500/20"
              />
            ))}
          </div>
        </div>
      )}

      {/* All shows */}
      <div className="space-y-3">
        {!status && <h3 className="text-lg font-semibold">Recent Shows</h3>}
        <div className="grid gap-4 md:grid-cols-2">
          {sortedShows
            .filter(show => !hasLiveShows || show.status !== 'ongoing')
            .map(show => (
              <RealtimeShowCard
                key={show.id}
                show={show}
              />
            ))}
        </div>
      </div>

      {shows.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <Bell className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>No shows found</p>
        </div>
      )}
    </div>
  );
}