'use client';

import { formatDistanceToNow } from 'date-fns';
import { Calendar, MapPin, Users } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@repo/design-system/components/ui/card';
import { Badge } from '@repo/design-system/components/ui/badge';
import { LiveIndicator } from './live-indicator';
import { useRealtimeShow } from '@/hooks/use-realtime-show';
import { motion } from 'framer-motion';
import { cn } from '@repo/design-system/lib/utils';
import Link from 'next/link';

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
  initialAttendanceCount?: number;
  showAttendance?: boolean;
  className?: string;
}

export function RealtimeShowCard({ 
  show, 
  initialAttendanceCount = 0,
  showAttendance = true,
  className
}: RealtimeShowCardProps) {
  const { attendanceCount, showStatus } = useRealtimeShow({
    showId: show.id,
    initialAttendanceCount,
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
      <Card className={cn(
        "overflow-hidden transition-all duration-200 hover:shadow-lg",
        isLive && "ring-2 ring-red-500 ring-offset-2",
        className
      )}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <Link 
                href={`/shows/${show.id}`}
                className="hover:underline"
              >
                <h3 className="font-semibold text-lg line-clamp-1">
                  {show.name}
                </h3>
              </Link>
              
              {show.artist && (
                <Link 
                  href={`/artists/${show.artist.slug}`}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
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
                <Badge variant="default" className="text-xs bg-blue-500">
                  Today
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
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
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span className="line-clamp-1">
                {show.venue.name}, {show.venue.city}
              </span>
            </div>
          )}
          
          {showAttendance && (
            <div className="flex items-center gap-2 text-sm">
              <Users className="h-4 w-4 text-muted-foreground" />
              <motion.span
                key={attendanceCount}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.2 }}
                className="font-medium"
              >
                {attendanceCount}
              </motion.span>
              <span className="text-muted-foreground">
                {attendanceCount === 1 ? 'person' : 'people'} attending
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}