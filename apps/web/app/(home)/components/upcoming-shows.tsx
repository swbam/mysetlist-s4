import { Badge } from '@repo/design-system/components/ui/badge';
import { Button } from '@repo/design-system/components/ui/button';
import { Card, CardContent } from '@repo/design-system/components/ui/card';
import { format } from 'date-fns';
import { Calendar, ChevronRight, Clock, MapPin } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

// Sample data for demonstration - In production, this would come from the database
const sampleUpcomingShows = [
  {
    id: '1',
    name: 'Summer Tour 2024',
    slug: 'summer-tour-2024-nashville',
    date: '2024-08-15',
    startTime: '20:00',
    status: 'upcoming',
    artist: {
      id: '1',
      name: 'Taylor Swift',
      slug: 'taylor-swift',
      imageUrl:
        'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=100&h=100&fit=crop',
    },
    venue: {
      id: '1',
      name: 'Nissan Stadium',
      slug: 'nissan-stadium',
      city: 'Nashville',
      state: 'TN',
    },
  },
  {
    id: '2',
    name: 'World Tour',
    slug: 'world-tour-los-angeles',
    date: '2024-08-22',
    startTime: '19:30',
    status: 'upcoming',
    artist: {
      id: '2',
      name: 'The Weeknd',
      slug: 'the-weeknd',
      imageUrl:
        'https://images.unsplash.com/photo-1547355253-ff0740f6e8c1?w=100&h=100&fit=crop',
    },
    venue: {
      id: '2',
      name: 'SoFi Stadium',
      slug: 'sofi-stadium',
      city: 'Los Angeles',
      state: 'CA',
    },
  },
  {
    id: '3',
    name: 'Arena Tour',
    slug: 'arena-tour-chicago',
    date: '2024-09-05',
    startTime: '20:00',
    status: 'upcoming',
    artist: {
      id: '3',
      name: 'Billie Eilish',
      slug: 'billie-eilish',
      imageUrl:
        'https://images.unsplash.com/photo-1520872024865-3ff2805d8bb3?w=100&h=100&fit=crop',
    },
    venue: {
      id: '3',
      name: 'United Center',
      slug: 'united-center',
      city: 'Chicago',
      state: 'IL',
    },
  },
];

export function UpcomingShows() {
  const upcomingShows = sampleUpcomingShows;
  return (
    <section className="bg-muted/50 py-16 md:py-24">
      <div className="container mx-auto px-4">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h2 className="mb-2 font-bold text-3xl tracking-tight md:text-4xl">
              Upcoming Shows
            </h2>
            <p className="text-muted-foreground">
              Don't miss out on these upcoming concerts
            </p>
          </div>
          <Button variant="outline" asChild>
            <Link href="/shows">View All Shows</Link>
          </Button>
        </div>

        <div className="space-y-4">
          {upcomingShows.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-muted-foreground">No upcoming shows found.</p>
              <Button variant="outline" asChild className="mt-4">
                <Link href="/shows">Browse All Shows</Link>
              </Button>
            </div>
          ) : (
            upcomingShows.map((show) => (
              <Card
                key={show.id}
                className="overflow-hidden transition-shadow hover:shadow-lg"
              >
                <CardContent className="p-0">
                  <div className="flex flex-col md:flex-row">
                    <div className="flex flex-1 items-center gap-4 p-6">
                      <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-full bg-muted">
                        {show.artist.imageUrl && (
                          <Image
                            src={show.artist.imageUrl}
                            alt={show.artist.name}
                            fill
                            className="object-cover"
                          />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <Link href={`/shows/${show.slug}`}>
                          <h3 className="truncate font-semibold text-lg transition-colors hover:text-primary">
                            {show.name}
                          </h3>
                        </Link>
                        <p className="text-muted-foreground">
                          {show.artist.name}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col items-start gap-4 border-t p-6 md:flex-row md:items-center md:border-t-0 md:border-l">
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>
                          {format(new Date(show.date), 'MMM dd, yyyy')}
                        </span>
                      </div>

                      {show.startTime && (
                        <div className="flex items-center gap-2 text-sm">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span>{show.startTime}</span>
                        </div>
                      )}

                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span>
                          {show.venue
                            ? `${show.venue.name}, ${show.venue.city || ''}`
                            : 'Venue TBA'}
                        </span>
                      </div>

                      <Badge
                        variant={
                          show.status === 'cancelled'
                            ? 'destructive'
                            : 'default'
                        }
                      >
                        {show.status === 'cancelled' ? 'Cancelled' : 'Upcoming'}
                      </Badge>

                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/shows/${show.slug}`}>
                          View Details
                          <ChevronRight className="ml-1 h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </section>
  );
}
