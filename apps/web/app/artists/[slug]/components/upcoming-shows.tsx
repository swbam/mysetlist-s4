"use client";

import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import { Skeleton } from "@repo/design-system/components/ui/skeleton";
import { format } from "date-fns";
import { Calendar, MapPin, Ticket } from "lucide-react";
import Link from "next/link";
import React from "react";

interface Show {
  show: {
    id: string;
    name: string;
    slug: string;
    date: string;
    ticketUrl?: string;
    status: string;
  };
  venue?: {
    id: string;
    name: string;
    city: string;
    state?: string;
    country: string;
  };
  isHeadliner: boolean;
  orderIndex: number;
}

interface UpcomingShowsProps {
  shows: Show[];
  artistName: string;
  artistId?: string;
}

function ShowSkeleton() {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-4 w-24" />
          </div>
          <Skeleton className="h-10 w-24" />
        </div>
      </CardContent>
    </Card>
  );
}

export const UpcomingShows = React.memo(function UpcomingShows({
  shows,
  artistName,
  artistId,
}: UpcomingShowsProps) {
  // Note: Autonomous sync happens server-side via scheduled cron jobs
  // Client-side sync removed for security reasons (CRON_SECRET should never be exposed)

  if (shows.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Upcoming Shows</CardTitle>
          <CardDescription>
            No upcoming shows scheduled for {artistName}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="py-8 text-center">
            <Calendar className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground">
              Check back later for new tour dates. Shows are automatically
              updated from Ticketmaster.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="mb-4">
        <h2 className="font-bold text-2xl">Upcoming Shows</h2>
        <p className="text-muted-foreground text-sm mt-1">
          Shows automatically updated from Ticketmaster
        </p>
      </div>

      {shows.map(({ show, venue, isHeadliner }) => (
        <Card key={show.id} className="transition-shadow hover:shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Link href={`/shows/${show.slug}`}>
                    <h3 className="font-semibold hover:underline">
                      {show.name}
                    </h3>
                  </Link>
                  {isHeadliner && <Badge variant="secondary">Headliner</Badge>}
                </div>

                <div className="flex items-center gap-4 text-muted-foreground text-sm">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {format(new Date(show.date), "PPP")}
                  </span>

                  {venue && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      <Link
                        href={`/venues/${venue.id}`}
                        className="hover:underline"
                      >
                        {venue.name}, {venue.city}
                        {venue.state && `, ${venue.state}`}
                      </Link>
                    </span>
                  )}
                </div>

                <Badge
                  variant={
                    show.status === "confirmed" ? "default" : "secondary"
                  }
                >
                  {show.status}
                </Badge>
              </div>

              {show.ticketUrl && (
                <Button asChild>
                  <a
                    href={show.ticketUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Ticket className="mr-2 h-4 w-4" />
                    Get Tickets
                  </a>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
});
