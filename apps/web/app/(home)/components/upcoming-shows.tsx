import { Badge } from '@repo/design-system/components/ui/badge';
import { Button } from '@repo/design-system/components/ui/button';
import { Card, CardContent } from '@repo/design-system/components/ui/card';
import { format } from 'date-fns';
import { Calendar, ChevronRight, Clock, MapPin } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { createServiceClient } from '~/lib/supabase/server';

async function getUpcomingShows() {
  try {
    const supabase = await createServiceClient();
    
    // Get upcoming shows with artist and venue information
    const { data: shows, error } = await supabase
      .from('shows')
      .select(`
        id,
        name,
        slug,
        date,
        start_time,
        status,
        headliner_artist:artists!shows_headliner_artist_id_fkey (
          id,
          name,
          slug,
          image_url
        ),
        venue:venues (
          id,
          name,
          slug,
          city,
          state
        )
      `)
      .eq('status', 'upcoming')
      .gte('date', new Date().toISOString().split('T')[0])
      .order('date', { ascending: true })
      .limit(3);

    if (error) {
      console.error('Error fetching upcoming shows:', error);
      return [];
    }

    // Transform data to match component expectations
    return (shows || []).map(show => ({
      id: show.id,
      name: show.name,
      slug: show.slug,
      date: show.date,
      startTime: show.start_time,
      status: show.status,
      artist: show.headliner_artist ? {
        id: show.headliner_artist.id,
        name: show.headliner_artist.name,
        slug: show.headliner_artist.slug,
        imageUrl: show.headliner_artist.image_url,
      } : null,
      venue: show.venue ? {
        id: show.venue.id,
        name: show.venue.name,
        slug: show.venue.slug,
        city: show.venue.city,
        state: show.venue.state,
      } : null,
    }));
  } catch (error) {
    console.error('Failed to fetch upcoming shows:', error);
    return [];
  }
}

export async function UpcomingShows() {
  const upcomingShows = await getUpcomingShows();
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
                        {show.artist?.imageUrl && (
                          <Image
                            src={show.artist.imageUrl}
                            alt={show.artist?.name || 'Artist'}
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
                          {show.artist?.name || 'Unknown Artist'}
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
