'use client';

import { Card, CardContent, CardHeader } from '@repo/design-system/components/ui/card';
import { Button } from '@repo/design-system/components/ui/button';
import { Badge } from '@repo/design-system/components/ui/badge';
import { Calendar, MapPin, Ticket, Users, Heart, Music, Star } from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { fetchShows, type ShowWithDetails } from '../actions';
import { useSearchParams } from 'next/navigation';
import { Skeleton } from '@repo/design-system/components/ui/skeleton';

export const ShowsList = () => {
  const [shows, setShows] = useState<ShowWithDetails[]>([]);
  const [savedShows, setSavedShows] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const searchParams = useSearchParams();

  useEffect(() => {
    const loadShows = async () => {
      setLoading(true);
      try {
        const city = searchParams.get('city') || undefined;
        const dateFrom = searchParams.get('dateFrom') || undefined;
        const dateTo = searchParams.get('dateTo') || undefined;
        const orderBy = (searchParams.get('orderBy') as 'date' | 'trending' | 'popularity') || 'date';
        
        const { shows: fetchedShows } = await fetchShows({
          status: 'upcoming',
          city,
          dateFrom,
          dateTo,
          orderBy,
          limit: 20,
        });
        
        setShows(fetchedShows);
      } catch (error) {
        console.error('Error loading shows:', error);
      } finally {
        setLoading(false);
      }
    };

    loadShows();
  }, [searchParams]);

  const toggleSave = (showId: string) => {
    setSavedShows(prev => 
      prev.includes(showId)
        ? prev.filter(id => id !== showId)
        : [...prev, showId]
    );
  };

  const getAttendancePercentage = (attending: number, capacity: number | null) => {
    if (!capacity || capacity === 0) return 0;
    return Math.round((attending / capacity) * 100);
  };

  const formatPrice = (minPrice: number | null, maxPrice: number | null, currency: string) => {
    if (!minPrice) return 'Price TBA';
    const currencySymbol = currency === 'USD' ? '$' : currency;
    if (maxPrice && maxPrice !== minPrice) {
      return `${currencySymbol}${minPrice}-${currencySymbol}${maxPrice}`;
    }
    return `${currencySymbol}${minPrice}+`;
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <Card key={i} className="overflow-hidden">
            <CardHeader className="pb-4">
              <div className="flex justify-between items-start">
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-8 w-2/3" />
                  <Skeleton className="h-4 w-1/3" />
                </div>
                <Skeleton className="h-6 w-20" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
                <div className="flex items-end justify-end gap-4">
                  <Skeleton className="h-10 w-32" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (shows.length === 0) {
    return (
      <Card className="p-8 text-center">
        <Music className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">No shows found</h3>
        <p className="text-muted-foreground">
          Try adjusting your filters or check back later for new shows.
        </p>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {shows.map((show) => {
        const attendancePercentage = show.venue?.capacity 
          ? getAttendancePercentage(show.attendeeCount, show.venue.capacity)
          : 0;
        const mainGenre = show.headlinerArtist.genres?.[0] || 'Live Music';
        
        return (
          <Card key={show.id} className="overflow-hidden hover:shadow-lg transition-shadow">
            <CardHeader className="pb-4">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <Link href={`/shows/${show.slug}`}>
                    <h3 className="text-2xl font-semibold hover:text-primary transition-colors">
                      {show.headlinerArtist.name}
                    </h3>
                  </Link>
                  <div className="flex items-center gap-2 mt-1">
                    {show.name !== show.headlinerArtist.name && (
                      <p className="text-sm text-muted-foreground">{show.name}</p>
                    )}
                    {show.headlinerArtist.verified && (
                      <Star className="h-4 w-4 text-primary fill-current" />
                    )}
                  </div>
                  {show.supportingArtists.length > 0 && (
                    <p className="text-sm text-muted-foreground mt-1">
                      with {show.supportingArtists.map(sa => sa.artist.name).join(', ')}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{mainGenre}</Badge>
                  {show.isFeatured && (
                    <Badge variant="default">Featured</Badge>
                  )}
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => toggleSave(show.id)}
                  >
                    <Heart className={`h-4 w-4 ${savedShows.includes(show.id) ? 'fill-current text-red-500' : ''}`} />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  {show.venue && (
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{show.venue.name}</span>
                      <span className="text-muted-foreground">
                        • {show.venue.city}{show.venue.state ? `, ${show.venue.state}` : ''}, {show.venue.country}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>{format(new Date(show.date), 'EEEE, MMMM d, yyyy')}</span>
                    {show.startTime && (
                      <span className="text-muted-foreground">• {show.startTime}</span>
                    )}
                  </div>
                  {show.venue?.capacity && show.venue.capacity > 0 && (
                    <div className="flex items-center gap-2 text-sm">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <div className="flex items-center gap-2">
                        <span>{show.attendeeCount.toLocaleString()} interested</span>
                        {attendancePercentage > 0 && (
                          <Badge variant={attendancePercentage > 90 ? "destructive" : "secondary"}>
                            {attendancePercentage}% full
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="flex items-end justify-end gap-4">
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">
                      {show.minPrice ? 'Starting from' : ''}
                    </p>
                    <p className="text-2xl font-semibold">
                      {formatPrice(show.minPrice, show.maxPrice, show.currency)}
                    </p>
                  </div>
                  <Button 
                    asChild
                    disabled={!show.ticketUrl || show.status === 'cancelled'}
                    className="gap-2"
                  >
                    {show.ticketUrl ? (
                      <a href={show.ticketUrl} target="_blank" rel="noopener noreferrer">
                        <Ticket className="h-4 w-4" />
                        {show.status === 'cancelled' ? 'Cancelled' : 'Get Tickets'}
                      </a>
                    ) : (
                      <span>
                        <Ticket className="h-4 w-4" />
                        Tickets TBA
                      </span>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};