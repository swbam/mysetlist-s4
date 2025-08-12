"use client";

import { useEffect, useState } from "react";

interface Stats {
  activeArtists: string;
  votesCast: string;
  musicFans: string;
  activeShows: string;
}

export function RealStats() {
  const [stats, setStats] = useState<Stats>({
    activeArtists: "0",
    votesCast: "0",
    musicFans: "0",
    activeShows: "0",
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch("/api/stats");
        if (response.ok) {
          const data = await response.json();
          setStats(data.stats);
        }
      } catch (error) {
        console.error("Failed to load stats:", error);
        // Keep default values on error
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (isLoading) {
    return (
      <div
        className="mx-auto mt-16 grid max-w-2xl grid-cols-2 gap-6 px-4 sm:px-0 md:grid-cols-3 md:gap-8"
        role="region"
        aria-label="Platform statistics"
      >
        <div className="text-center">
          <div className="font-bold text-2xl sm:text-3xl md:text-4xl animate-pulse">
            <div className="h-8 w-16 bg-muted rounded mx-auto" />
          </div>
          <div className="mt-1 text-muted-foreground text-xs sm:text-sm">
            Active Artists
          </div>
        </div>
        <div className="text-center">
          <div className="font-bold text-2xl sm:text-3xl md:text-4xl animate-pulse">
            <div className="h-8 w-16 bg-muted rounded mx-auto" />
          </div>
          <div className="mt-1 text-muted-foreground text-xs sm:text-sm">
            Votes Cast
          </div>
        </div>
        <div className="col-span-2 text-center md:col-span-1">
          <div className="font-bold text-2xl sm:text-3xl md:text-4xl animate-pulse">
            <div className="h-8 w-16 bg-muted rounded mx-auto" />
          </div>
          <div className="mt-1 text-muted-foreground text-xs sm:text-sm">
            Music Fans
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="mx-auto mt-16 grid max-w-2xl grid-cols-2 gap-6 px-4 sm:px-0 md:grid-cols-3 md:gap-8"
      role="region"
      aria-label="Platform statistics"
    >
      <div className="text-center">
        <div className="font-bold text-2xl sm:text-3xl md:text-4xl">
          {stats.activeArtists}
        </div>
        <div className="mt-1 text-muted-foreground text-xs sm:text-sm">
          Active Artists
        </div>
      </div>
      <div className="text-center">
        <div className="font-bold text-2xl sm:text-3xl md:text-4xl">
          {stats.votesCast}
        </div>
        <div className="mt-1 text-muted-foreground text-xs sm:text-sm">
          Votes Cast
        </div>
      </div>
      <div className="col-span-2 text-center md:col-span-1">
        <div className="font-bold text-2xl sm:text-3xl md:text-4xl">
          {stats.musicFans}
        </div>
        <div className="mt-1 text-muted-foreground text-xs sm:text-sm">
          Music Fans
        </div>
      </div>
    </div>
  );
}
