'use client';

import { Music } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ShowCard } from './show-card';
import { type ShowWithDetails, fetchShows } from '../actions';
import { Card } from '@repo/design-system/components/ui/card';

export const ShowsGrid = () => {
  const [shows, setShows] = useState<ShowWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const searchParams = useSearchParams();

  useEffect(() => {
    const loadShows = async () => {
      setLoading(true);
      try {
        const city = searchParams.get('city') || undefined;
        const dateFrom = searchParams.get('dateFrom') || undefined;
        const dateTo = searchParams.get('dateTo') || undefined;
        const orderBy =
          (searchParams.get('orderBy') as 'date' | 'trending' | 'popularity') ||
          'date';

        const { shows: fetchedShows } = await fetchShows({
          status: 'upcoming',
          ...(city && { city }),
          ...(dateFrom && { dateFrom }),
          ...(dateTo && { dateTo }),
          orderBy,
          limit: 20,
        });

        setShows(fetchedShows);
      } catch (_error) {
        // Silent error handling
      } finally {
        setLoading(false);
      }
    };

    loadShows();
  }, [searchParams]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <Card key={i} className="overflow-hidden">
            <div className="aspect-square animate-pulse bg-muted" />
            <div className="p-4 space-y-2">
              <div className="h-4 animate-pulse bg-muted rounded" />
              <div className="h-3 animate-pulse bg-muted rounded w-3/4" />
              <div className="h-3 animate-pulse bg-muted rounded w-1/2" />
            </div>
          </Card>
        ))}
      </div>
    );
  }

  if (shows.length === 0) {
    return (
      <Card className="p-8 text-center">
        <Music className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
        <h3 className="mb-2 font-semibold text-lg">No shows found</h3>
        <p className="text-muted-foreground">
          Try adjusting your filters or check back later for new shows.
        </p>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
      {shows.map((show) => (
        <ShowCard key={show.id} show={show} />
      ))}
    </div>
  );
};