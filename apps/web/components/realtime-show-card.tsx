'use client';

import { Badge } from '@repo/design-system/components/ui/badge';
import {
  Card,
  CardContent,
  CardHeader,
} from '@repo/design-system/components/ui/card';
import { cn } from '@repo/design-system/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { motion } from 'framer-motion';
import { Calendar, MapPin } from 'lucide-react';
import Link from 'next/link';
import { useRealtimeShow } from '~/hooks/use-realtime-show';
import { LiveIndicator } from './live-indicator';

interface RealtimeShowCardProps {
  show: {
    id: string;
    name: string;
    date: string;
    status: 'upcoming' | 'ongoing' | 'completed';
    artist?: {
      id: string;
      name: string;
      slug: string;
    };
    venue?: {
      id: string;
      name: string;
      city: string;
      country: string;
    };
  };
  className?: string;
}

export function RealtimeShowCard({
  show,
  className,
}: RealtimeShowCardProps) {
  const { showStatus } = useRealtimeShow({
    showId: show.id,
    initialStatus: show.status,
  });

  const isLive = showStatus === 'ongoing';
  const isPast = showStatus === 'completed';
  const showDate = new Date(show.date);
  const isToday = new Date().toDateString() === showDate.toDateString();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card
        className={cn(
          'overflow-hidden transition-all duration-200 hover:shadow-lg',
          isLive && 'ring-2 ring-red-500 ring-offset-2',
          className
        )}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <Link href={`/shows/${show.id}`} className="hover:underline">
                <h3 className="line-clamp-1 font-semibold text-lg">
                  {show.name}
                </h3>
              </Link>

              {show.artist && (
                <Link
                  href={`/artists/${show.artist.slug}`}
                  className="text-muted-foreground text-sm transition-colors hover:text-foreground"
                >
                  {show.artist.name}
                </Link>
              )}
            </div>

            <div className="flex items-center gap-2">
              {isLive && <LiveIndicator size="sm" />}
              {isPast && (
                <Badge variant="secondary" className="text-xs">
                  Past
                </Badge>
              )}
              {isToday && !isLive && !isPast && (
                <Badge variant="default" className="bg-blue-500 text-xs">
                  Today
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Calendar className="h-4 w-4" />
            <time dateTime={show.date}>
              {showDate.toLocaleDateString('en-US', {
                weekday: 'short',
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })}
            </time>
            {!isPast && (
              <span className="text-xs">
                ({formatDistanceToNow(showDate, { addSuffix: true })})
              </span>
            )}
          </div>

          {show.venue && (
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <MapPin className="h-4 w-4" />
              <span className="line-clamp-1">
                {show.venue.name}, {show.venue.city}
              </span>
            </div>
          )}

        </CardContent>
      </Card>
    </motion.div>
  );
}
