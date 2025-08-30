import { Badge } from "@repo/design-system";
import { Button } from "@repo/design-system";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@repo/design-system";
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
    setlistCount: number;
    voteCount: number;
    ticketUrl?: string;
    status: "upcoming" | "ongoing" | "completed" | "cancelled";
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
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="font-bold text-2xl">Past Shows</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Historical setlists and performances
          </p>
        </div>
        <Badge variant="secondary">{shows.length} shows</Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {shows.map(({ show, venue, isHeadliner }) => (
          <Card
            key={show.id}
            className="group transition-shadow hover:shadow-lg h-fit"
          >
            <CardContent className="p-4">
              <div className="space-y-3">
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <Link
                      href={`/shows/${show.slug}`}
                      className="font-semibold hover:underline text-sm line-clamp-2"
                    >
                      {show.name}
                    </Link>
                    {isHeadliner && (
                      <Badge variant="outline" className="text-xs shrink-0">
                        Headliner
                      </Badge>
                    )}
                  </div>

                  <div className="space-y-1 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      <span>{formatDate(show.date)}</span>
                    </div>

                    {venue && (
                      <div className="flex items-start gap-1">
                        <MapPin className="h-3 w-3 mt-0.5 shrink-0" />
                        <span className="line-clamp-2">
                          {venue.name}, {venue.city}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {show.setlistCount != null && show.setlistCount > 0 && (
                      <div className="flex items-center gap-1">
                        <Music2 className="h-3 w-3" />
                        <span>{show.setlistCount} setlists</span>
                      </div>
                    )}
                    {show.voteCount > 0 && (
                      <div className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        <span>{show.voteCount} votes</span>
                      </div>
                    )}
                  </div>
                </div>

                <Button variant="ghost" size="sm" className="w-full" asChild>
                  <Link href={`/shows/${show.slug}`}>View Setlist</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {shows.length >= 20 && (
        <div className="mt-6 text-center">
          <Button variant="outline" asChild>
            <Link href={`/shows?artist=${artistName}`}>View All Shows</Link>
          </Button>
        </div>
      )}
    </div>
  );
});
