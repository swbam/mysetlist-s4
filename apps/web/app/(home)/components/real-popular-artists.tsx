"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

interface Artist {
  name: string;
  slug: string;
}

export function RealPopularArtists() {
  const [artists, setArtists] = useState<Artist[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchPopularArtists = async () => {
      try {
        const response = await fetch("/api/popular-artists?limit=4");
        if (response.ok) {
          const data = await response.json();
          setArtists(data.artists || []);
        } else {
          setArtists([]);
        }
      } catch (error) {
        console.error("Failed to load popular artists:", error);
        setArtists([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPopularArtists();
  }, []);

  if (isLoading) {
    return (
      <div className="flex flex-wrap items-center justify-center gap-2 px-4 text-sm sm:px-0">
        <span className="text-muted-foreground hidden sm:inline">Popular:</span>
        <span className="text-muted-foreground text-xs sm:hidden">
          Trending:
        </span>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={`trending-skeleton-${i}`} className="animate-pulse">
            <div className="h-7 w-20 bg-muted rounded-full" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-center gap-2 px-4 text-sm sm:px-0">
      <span className="text-muted-foreground hidden sm:inline">Popular:</span>
      <span className="text-muted-foreground text-xs sm:hidden">Trending:</span>
      {artists.map((artist) => (
        <Link
          key={artist.slug}
          href={`/artists/${artist.slug}`}
          className="rounded-full border border-border px-3 py-1.5 text-xs hover:bg-muted sm:text-sm"
        >
          {artist.name}
        </Link>
      ))}
    </div>
  );
}
