'use client';

import { Card, CardContent } from '@repo/design-system/components/ui/card';
import { Badge } from '@repo/design-system/components/ui/badge';
import { Button } from '@repo/design-system/components/ui/button';
import { Calendar, MapPin, Users, Share2, Heart } from 'lucide-react';
import { format } from 'date-fns';
import { useState } from 'react';
import { LiveShowIndicator } from '@/components/live-show-indicator';

type ShowInfoProps = {
  showId: string;
  show: {
    shows: {
      id: string;
      name: string;
      date: string;
      status: "upcoming" | "ongoing" | "completed" | "cancelled";
      attendeeCount?: number | null;
    };
    artists: {
      id: string;
      name: string;
      imageUrl?: string | null;
    } | null;
    venues: {
      id: string;
      name: string;
      city: string;
      country: string;
      capacity?: number | null;
    } | null;
  };
};

export const ShowInfo = ({ showId, show }: ShowInfoProps) => {
  const [isSaved, setIsSaved] = useState(false);

  const isLive = show.shows.status === 'ongoing';
  const showDate = new Date(show.shows.date);
  const artistName = show.artists?.name || 'Unknown Artist';
  const venueName = show.venues?.name || 'Unknown Venue';
  const venueLocation = show.venues ? `${show.venues.city}, ${show.venues.country}` : 'Unknown Location';
  const attendeeCount = show.shows.attendeeCount || 0;

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold">{artistName}</h1>
              <LiveShowIndicator 
                showDate={showDate} 
                showStatus={show.shows.status === 'ongoing' ? 'live' : show.shows.status} 
              />
            </div>
            <p className="text-lg text-muted-foreground mb-4">{show.shows.name}</p>
            
            <div className="flex flex-col sm:flex-row gap-4 text-sm">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span>{venueName} • {venueLocation}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>{format(showDate, 'EEEE, MMMM d, yyyy')}</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span>{attendeeCount.toLocaleString()} attending</span>
              </div>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" size="icon">
              <Share2 className="h-4 w-4" />
            </Button>
            <Button 
              variant={isSaved ? "default" : "outline"}
              onClick={() => setIsSaved(!isSaved)}
              className="gap-2"
            >
              <Heart className={`h-4 w-4 ${isSaved ? 'fill-current' : ''}`} />
              {isSaved ? 'Saved' : 'Save'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};