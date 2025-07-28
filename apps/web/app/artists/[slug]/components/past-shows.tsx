import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import { Calendar, MapPin, Music2, Users } from "lucide-react";
import Link from "next/link";
import React from "react";
import { formatDate } from "~/lib/utils";

interface Show {
  show: {
    id: string;
    name: string;
    slug: string;
    date: string;
    venueId?: string | null;
    setlistCount?: number | null;
    attendeeCount?: number | null;
    voteCount?: number | null;
    ticketUrl?: string;
    status?: string;
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

interface PastShowsProps {
  shows: Show[];
  artistName: string;
  artistId?: string;
}

export const PastShows = React.memo(function PastShows({
  shows,
  artistName,
  artistId: _artistId,
}: PastShowsProps) {
  if (shows.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Past Shows</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground">
            No past shows recorded
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Past Shows</CardTitle>
          <Badge variant="secondary">{shows.length} shows</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {shows.map(({ show, venue, isHeadliner }) => (
            <div
              key={show.id}
              className="group flex items-center justify-between gap-4 rounded-lg border p-4 transition-colors hover:bg-muted/50"
            >
              <div className="flex-1 space-y-2">
                <div>
                  <Link
                    href={`/shows/${show.slug}`}
                    className="font-semibold hover:underline"
                  >
                    {show.name}
                  </Link>
                  <div className="mt-1 flex items-center gap-2 text-muted-foreground text-sm">
                    <Calendar className="h-3 w-3" />
                    <span>{formatDate(show.date)}</span>
                    {isHeadliner && (
                      <>
                        <span>·</span>
                        <Badge variant="outline" className="text-xs">
                          Headliner
                        </Badge>
                      </>
                    )}
                  </div>
                  {venue && (
                    <div className="flex items-center gap-2 text-muted-foreground text-sm">
                      <MapPin className="h-3 w-3" />
                      <span>
                        {venue.name}, {venue.city}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-4 text-muted-foreground text-sm">
                  {show.setlistCount != null && show.setlistCount > 0 && (
                    <div className="flex items-center gap-1">
                      <Music2 className="h-3 w-3" />
                      <span>{show.setlistCount} setlists</span>
                    </div>
                  )}
                  {show.attendeeCount != null && show.attendeeCount > 0 && (
                    <div className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      <span>{show.attendeeCount} attendees</span>
                    </div>
                  )}
                </div>
              </div>

              <Button variant="ghost" size="sm" asChild>
                <Link href={`/setlists/${show.id}`}>View Setlists</Link>
              </Button>
            </div>
          ))}
        </div>

        {shows.length >= 20 && (
          <div className="mt-6 text-center">
            <Button variant="outline" asChild>
              <Link href={`/shows?artist=${artistName}`}>View All Shows</Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
});
