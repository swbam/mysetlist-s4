"use client";

import { Button } from "@repo/design-system/components/ui/button";
import { format } from "date-fns";
import Link from "next/link";
import { useRealtimeShow } from "~/hooks/use-realtime-show";

type ShowHeaderProps = {
  show: {
    id: string;
    name: string;
    slug: string;
    date: string;
    start_time?: string | null;
    doors_time?: string | null;
    status: "upcoming" | "ongoing" | "completed" | "cancelled";
    headliner_artist: {
      id: string;
      name: string;
      slug: string;
      image_url?: string;
      verified?: boolean;
    };
    venue?: {
      id: string;
      name: string;
      slug: string;
      city: string;
      state?: string | null;
      country: string;
    };
    is_featured?: boolean;
    is_verified?: boolean;
    ticket_url?: string | null;
  };
};

export function ShowHeader({ show }: ShowHeaderProps) {
  const showDate = new Date(show.date);

  // Use real-time show status
  const { showStatus: _showStatus } = useRealtimeShow({
    showId: show.id,
    initialStatus: show.status as "upcoming" | "ongoing" | "completed",
  });

  const bg = show.headliner_artist.image_url ?? undefined;

  return (
    <section className="relative h-72 w-full overflow-hidden rounded-xl md:h-96">
      {bg ? (
        <img
          src={bg}
          alt={show.headliner_artist.name}
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 bg-muted/20" />
      )}
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 to-black/90" />
      <div className="absolute bottom-8 left-8 max-w-lg text-white">
        <h1 className="mb-2 font-extrabold text-3xl md:text-5xl">
          {show.headliner_artist.name}
        </h1>
        <div className="mb-3 space-y-1">
          <p className="text-white text-sm md:text-base">
            {show.venue?.name ? `${show.venue.name} · ` : ""}
            {format(showDate, "MMM d, yyyy")}
          </p>
          <div className="flex flex-wrap gap-4 text-white/80 text-xs md:text-sm">
            {show.doors_time && (
              <span>Doors: {show.doors_time}</span>
            )}
            {show.start_time && (
              <span>Show: {show.start_time}</span>
            )}
            {show.venue && (
              <span>{show.venue.city}, {show.venue.state || show.venue.country}</span>
            )}
          </div>
        </div>
        <div className="mt-4 flex gap-3">
          <Button size="sm" asChild>
            <Link href="#setlists">Vote Setlist</Link>
          </Button>
          {show.ticket_url && (
            <Button variant="outline" size="sm" asChild>
              <Link href={show.ticket_url} target="_blank" rel="noopener">
                Buy Tickets
              </Link>
            </Button>
          )}
        </div>
      </div>
    </section>
  );
}
