'use client';

import { format } from 'date-fns';
import Image from 'next/image';
import Link from 'next/link';
import { Calendar, Clock, MapPin } from 'lucide-react';
import { Badge } from '@repo/design-system/components/ui/badge';
import { cn } from '@repo/design-system/lib/utils';
import { LiveIndicator } from '@/components/live-indicator';
import { useRealtimeShow } from '@/hooks/use-realtime-show';

type ShowHeaderProps = {
  show: {
    id: string;
    name: string;
    slug: string;
    date: string;
    start_time?: string;
    doors_time?: string;
    status: 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
    headliner_artist: {
      id: string;
      name: string;
      slug: string;
      image_url?: string;
      verified?: boolean;
    };
    venue?: {
      id: string;
      name: string;
      slug: string;
      city: string;
      state?: string;
      country: string;
    };
    is_featured?: boolean;
    is_verified?: boolean;
  };
};

export function ShowHeader({ show }: ShowHeaderProps) {
  const showDate = new Date(show.date);
  const formattedDate = format(showDate, 'EEEE, MMMM d, yyyy');
  
  // Use real-time show status
  const { showStatus } = useRealtimeShow({
    showId: show.id,
    initialStatus: show.status as 'upcoming' | 'ongoing' | 'completed',
  });
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'upcoming':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'ongoing':
        return 'bg-green-500/10 text-green-500 border-green-500/20 animate-pulse';
      case 'completed':
        return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
      case 'cancelled':
        return 'bg-red-500/10 text-red-500 border-red-500/20';
      default:
        return '';
    }
  };
  
  const getVenueLocation = () => {
    if (!show.venue) return 'Venue TBA';
    const parts = [show.venue.city];
    if (show.venue.state) parts.push(show.venue.state);
    parts.push(show.venue.country);
    return parts.join(', ');
  };
  
  return (
    <div className="flex flex-col gap-6">
      {/* Artist Image & Info */}
      <div className="flex flex-col sm:flex-row gap-6 items-start">
        {show.headliner_artist.image_url && (
          <div className="relative w-full sm:w-32 h-48 sm:h-32 rounded-lg overflow-hidden bg-muted">
            <Image
              src={show.headliner_artist.image_url}
              alt={show.headliner_artist.name}
              fill
              className="object-cover"
              priority
            />
          </div>
        )}
        
        <div className="flex-1">
          <div className="flex items-start justify-between gap-4 mb-2">
            <h1 className="text-3xl md:text-4xl font-bold">
              <Link 
                href={`/artists/${show.headliner_artist.slug}`}
                className="hover:underline"
              >
                {show.headliner_artist.name}
              </Link>
            </h1>
            
            <div className="flex gap-2">
              {showStatus === 'ongoing' ? (
                <LiveIndicator size="md" />
              ) : (
                <Badge 
                  variant="outline" 
                  className={cn("capitalize", getStatusColor(showStatus))}
                >
                  {showStatus}
                </Badge>
              )}
              
              {show.is_featured && (
                <Badge variant="default" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">
                  Featured
                </Badge>
              )}
              
              {show.is_verified && (
                <Badge variant="default" className="bg-blue-500/10 text-blue-500 border-blue-500/20">
                  Verified
                </Badge>
              )}
            </div>
          </div>
          
          <div className="space-y-2 text-muted-foreground">
            {/* Date */}
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>{formattedDate}</span>
            </div>
            
            {/* Time */}
            {(show.doors_time || show.start_time) && (
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>
                  {show.doors_time && `Doors: ${show.doors_time}`}
                  {show.doors_time && show.start_time && ' • '}
                  {show.start_time && `Show: ${show.start_time}`}
                </span>
              </div>
            )}
            
            {/* Venue */}
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              <span>
                {show.venue ? (
                  <>
                    <Link 
                      href={`/venues/${show.venue.slug}`}
                      className="hover:underline font-medium text-foreground"
                    >
                      {show.venue.name}
                    </Link>
                    <span className="text-muted-foreground"> • {getVenueLocation()}</span>
                  </>
                ) : (
                  'Venue TBA'
                )}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}