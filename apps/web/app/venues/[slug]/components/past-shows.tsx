'use client';

import Link from 'next/link';
import Image from 'next/image';
import { format } from 'date-fns';
import { Calendar, Music } from 'lucide-react';
import { Card } from '@repo/design-system/components/ui/card';
import { Badge } from '@repo/design-system/components/ui/badge';

interface Show {
  id: string;
  name: string;
  date: Date;
  artist: {
    id: string;
    name: string;
    slug: string;
    imageUrl: string | null;
  };
}

interface PastShowsProps {
  shows: Show[];
  venueId: string;
}

export function PastShows({ shows, venueId }: PastShowsProps) {
  if (shows.length === 0) {
    return (
      <Card className="p-8 text-center">
        <Music className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">No Past Shows</h3>
        <p className="text-muted-foreground">
          No shows have been recorded at this venue yet.
        </p>
      </Card>
    );
  }

  // Group shows by year
  const showsByYear = shows.reduce((acc, show) => {
    const year = new Date(show.date).getFullYear();
    if (!acc[year]) {
      acc[year] = [];
    }
    acc[year].push(show);
    return acc;
  }, {} as Record<number, Show[]>);

  const years = Object.keys(showsByYear).sort((a, b) => Number(b) - Number(a));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-semibold">Show History</h2>
        <Badge variant="secondary">{shows.length} shows</Badge>
      </div>

      {years.map((year) => (
        <div key={year} className="space-y-4">
          <h3 className="text-lg font-semibold text-muted-foreground">
            {year}
          </h3>
          
          <div className="grid gap-3">
            {showsByYear[Number(year)].map((show) => (
              <Card key={show.id} className="overflow-hidden">
                <Link href={`/shows/${show.id}`}>
                  <div className="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors">
                    {/* Artist Image */}
                    <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                      {show.artist.imageUrl ? (
                        <Image
                          src={show.artist.imageUrl}
                          alt={show.artist.name}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="text-xl font-semibold text-muted-foreground">
                            {show.artist.name.charAt(0)}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Show Details */}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold truncate">
                        {show.artist.name}
                      </h4>
                      <div className="flex items-center gap-2 mt-1">
                        <Calendar className="w-3 h-3 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          {format(new Date(show.date), 'MMMM d, yyyy')}
                        </span>
                      </div>
                    </div>

                    {/* View Setlist */}
                    <span className="text-sm text-primary">
                      View Setlist →
                    </span>
                  </div>
                </Link>
              </Card>
            ))}
          </div>
        </div>
      ))}

      {shows.length >= 20 && (
        <div className="text-center pt-4">
          <p className="text-sm text-muted-foreground">
            Showing the last 20 shows
          </p>
        </div>
      )}
    </div>
  );
}