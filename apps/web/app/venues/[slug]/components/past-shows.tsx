"use client";

import { Badge } from "@repo/design-system/badge";
import { Card } from "@repo/design-system/card";
import { format } from "date-fns";
import { Calendar, Music } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

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

export function PastShows({ shows, venueId: _venueId }: PastShowsProps) {
  if (shows.length === 0) {
    return (
      <Card className="p-8 text-center">
        <Music className="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
        <h3 className="mb-2 font-semibold text-lg">No Past Shows</h3>
        <p className="text-muted-foreground">
          No shows have been recorded at this venue yet.
        </p>
      </Card>
    );
  }

  // Group shows by year
  const showsByYear = shows.reduce(
    (acc, show) => {
      const year = new Date(show.date).getFullYear();
      if (!acc[year]) {
        acc[year] = [];
      }
      acc[year].push(show);
      return acc;
    },
    {} as Record<number, Show[]>,
  );

  const years = Object.keys(showsByYear).sort((a, b) => Number(b) - Number(a));

  return (
    <div className="space-y-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-semibold text-2xl">Show History</h2>
        <Badge variant="secondary">{shows.length} shows</Badge>
      </div>

      {years.map((year) => (
        <div key={year} className="space-y-4">
          <h3 className="font-semibold text-lg text-muted-foreground">
            {year}
          </h3>

          <div className="grid gap-3">
            {showsByYear[Number(year)]?.map((show) => (
              <Card key={show.id} className="overflow-hidden">
                <Link href={`/shows/${show.id}`}>
                  <div className="flex items-center gap-4 p-4 transition-colors hover:bg-muted/50">
                    {/* Artist Image */}
                    <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-muted">
                      {show.artist.imageUrl ? (
                        <Image
                          src={show.artist.imageUrl}
                          alt={show.artist.name}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <span className="font-semibold text-muted-foreground text-xl">
                            {show.artist.name.charAt(0)}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Show Details */}
                    <div className="min-w-0 flex-1">
                      <h4 className="truncate font-semibold">
                        {show.artist.name}
                      </h4>
                      <div className="mt-1 flex items-center gap-2">
                        <Calendar className="h-3 w-3 text-muted-foreground" />
                        <span className="text-muted-foreground text-sm">
                          {format(new Date(show.date), "MMMM d, yyyy")}
                        </span>
                      </div>
                    </div>

                    {/* View Setlist */}
                    <span className="text-primary text-sm">View Setlist →</span>
                  </div>
                </Link>
              </Card>
            ))}
          </div>
        </div>
      ))}

      {shows.length >= 20 && (
        <div className="pt-4 text-center">
          <p className="text-muted-foreground text-sm">
            Showing the last 20 shows
          </p>
        </div>
      )}
    </div>
  );
}
