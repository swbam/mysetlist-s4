'use client';

import Link from 'next/link';
import Image from 'next/image';
import { format } from 'date-fns';
import { Calendar, ExternalLink } from 'lucide-react';
import { Card } from '@repo/design-system/components/ui/card';
import { Button } from '@repo/design-system/components/ui/button';
import { Badge } from '@repo/design-system/components/ui/badge';

interface Show {
  id: string;
  name: string;
  date: Date;
  ticketUrl: string | null;
  artist: {
    id: string;
    name: string;
    slug: string;
    imageUrl: string | null;
  };
}

interface UpcomingShowsProps {
  shows: Show[];
  venueId: string;
}

export function UpcomingShows({ shows, venueId }: UpcomingShowsProps) {
  if (shows.length === 0) {
    return (
      <Card className="p-8 text-center">
        <Calendar className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">No Upcoming Shows</h3>
        <p className="text-muted-foreground">
          Check back later for upcoming performances at this venue.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-semibold">Upcoming Shows</h2>
        <Badge variant="secondary">{shows.length} shows</Badge>
      </div>

      <div className="grid gap-4">
        {shows.map((show) => (
          <Card key={show.id} className="overflow-hidden">
            <Link href={`/shows/${show.id}`}>
              <div className="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors">
                {/* Artist Image */}
                <div className="relative w-20 h-20 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                  {show.artist.imageUrl ? (
                    <Image
                      src={show.artist.imageUrl}
                      alt={show.artist.name}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-2xl font-semibold text-muted-foreground">
                        {show.artist.name.charAt(0)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Show Details */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-lg truncate">
                    {show.artist.name}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {show.name}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      {format(new Date(show.date), 'EEE, MMM d, yyyy • h:mm a')}
                    </span>
                  </div>
                </div>

                {/* Ticket Button */}
                {show.ticketUrl && (
                  <Button
                    size="sm"
                    variant="default"
                    className="flex-shrink-0"
                    onClick={(e) => {
                      e.preventDefault();
                      if (show.ticketUrl) {
                        window.open(show.ticketUrl, '_blank');
                      }
                    }}
                  >
                    Tickets
                    <ExternalLink className="w-3 h-3 ml-1" />
                  </Button>
                )}
              </div>
            </Link>
          </Card>
        ))}
      </div>

      {shows.length >= 20 && (
        <div className="text-center pt-4">
          <p className="text-sm text-muted-foreground">
            Showing the next 20 shows
          </p>
        </div>
      )}
    </div>
  );
}