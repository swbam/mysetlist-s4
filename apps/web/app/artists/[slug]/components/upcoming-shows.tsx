import { Card, CardContent, CardHeader, CardTitle } from '@repo/design-system/components/ui/card';
import { Badge } from '@repo/design-system/components/ui/badge';
import { Button } from '@repo/design-system/components/ui/button';
import { Calendar, MapPin, ExternalLink, Ticket } from 'lucide-react';
import Link from 'next/link';
import { formatDate } from '@/lib/utils';

interface Show {
  show: {
    id: string;
    name: string;
    slug: string;
    date: string;
    startTime: string | null;
    ticketUrl: string | null;
    minPrice: number | null;
    maxPrice: number | null;
    currency: string | null;
    venueId: string | null;
  };
  venue: {
    name: string;
    city: string;
    state: string | null;
    country: string;
  } | null;
  isHeadliner: boolean | null;
}

interface UpcomingShowsProps {
  shows: Show[];
  artistName: string;
}

export function UpcomingShows({ shows, artistName }: UpcomingShowsProps) {
  if (shows.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Upcoming Shows</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground">
            No upcoming shows scheduled
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Upcoming Shows</CardTitle>
          <Badge variant="secondary">{shows.length} shows</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {shows.map(({ show, venue, isHeadliner }) => (
            <div
              key={show.id}
              className="flex flex-col gap-3 rounded-lg border p-4 transition-colors hover:bg-muted/50"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-1">
                  <Link
                    href={`/shows/${show.slug}`}
                    className="font-semibold hover:underline"
                  >
                    {show.name}
                  </Link>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    <span>{formatDate(show.date)}</span>
                    {show.startTime && (
                      <>
                        <span>·</span>
                        <span>{show.startTime}</span>
                      </>
                    )}
                  </div>
                  {venue && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      <span>
                        {venue.name}, {venue.city}
                        {venue.state && `, ${venue.state}`}
                      </span>
                    </div>
                  )}
                  {isHeadliner && (
                    <Badge variant="outline" className="w-fit">
                      Headliner
                    </Badge>
                  )}
                </div>
                
                <div className="flex flex-col items-end gap-2">
                  {show.minPrice && show.maxPrice && (
                    <div className="text-right">
                      <p className="text-sm font-medium">
                        {show.currency === 'USD' ? '$' : show.currency}
                        {show.minPrice} - ${show.maxPrice}
                      </p>
                    </div>
                  )}
                  {show.ticketUrl && (
                    <Button size="sm" variant="outline" asChild>
                      <a
                        href={show.ticketUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Ticket className="mr-1 h-3 w-3" />
                        Tickets
                        <ExternalLink className="ml-1 h-3 w-3" />
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}