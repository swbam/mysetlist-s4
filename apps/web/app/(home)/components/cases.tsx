"use client";

import {
  Carousel,
  type CarouselApi,
  CarouselContent,
  CarouselItem,
} from "@repo/design-system/components/ui/carousel";
import { Skeleton } from "@repo/design-system/components/ui/skeleton";
import { Music, TrendingUp, Users } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

interface TrendingArtist {
  id: string;
  name: string;
  slug: string;
  genres: string[];
  followers: number;
  imageUrl?: string;
}

export const Cases = () => {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const [artists, setArtists] = useState<TrendingArtist[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTrendingArtists();
  }, []);

  const fetchTrendingArtists = async () => {
    try {
      const response = await fetch("/api/trending/artists?limit=15");
      if (!response.ok) {
        throw new Error("Failed to fetch trending artists");
      }

      const data = await response.json();
      setArtists(data.artists || []);
    } catch (err) {
      console.error("Error fetching trending artists:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!api || artists.length === 0) {
      return;
    }

    const interval = setTimeout(() => {
      if (api.selectedScrollSnap() + 1 === api.scrollSnapList().length) {
        setCurrent(0);
        api.scrollTo(0);
      } else {
        api.scrollNext();
        setCurrent(current + 1);
      }
    }, 3000); // Auto-scroll every 3 seconds

    return () => clearTimeout(interval);
  }, [api, current, artists]);

  const formatFollowers = (count: number) => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    }
    if (count >= 1000) {
      return `${Math.round(count / 1000)}K`;
    }
    return count.toString();
  };

  if (loading) {
    return (
      <div className="w-full bg-gradient-to-b from-background to-muted/20 py-20 lg:py-40">
        <div className="container mx-auto">
          <div className="flex flex-col gap-10">
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="flex items-center gap-2 text-primary">
                <TrendingUp className="h-5 w-5" />
                <span className="font-medium text-sm uppercase tracking-wide">
                  Trending Now
                </span>
              </div>
              <h2 className="font-regular text-3xl tracking-tighter md:text-5xl lg:max-w-4xl">
                Top Artists on MySetlist
              </h2>
              <p className="max-w-2xl text-lg text-muted-foreground">
                Discover the most popular artists and their upcoming shows
              </p>
            </div>
            <div className="flex gap-4 justify-center">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="basis-1/3 md:basis-1/4 lg:basis-1/6">
                  <Skeleton className="aspect-square rounded-lg" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (artists.length === 0) {
    return null;
  }

  return (
    <div className="w-full bg-gradient-to-b from-background to-muted/20 py-20 lg:py-40">
      <div className="container mx-auto">
        <div className="flex flex-col gap-10">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="flex items-center gap-2 text-primary">
              <TrendingUp className="h-5 w-5" />
              <span className="font-medium text-sm uppercase tracking-wide">
                Trending Now
              </span>
            </div>
            <h2 className="font-regular text-3xl tracking-tighter md:text-5xl lg:max-w-4xl">
              Top Artists on MySetlist
            </h2>
            <p className="max-w-2xl text-lg text-muted-foreground">
              Discover the most popular artists and their upcoming shows
            </p>
          </div>
          <Carousel setApi={setApi} className="w-full">
            <CarouselContent>
              {artists.map((artist, index) => (
                <CarouselItem
                  className="basis-1/3 md:basis-1/4 lg:basis-1/6"
                  key={artist.id}
                >
                  <Link href={`/artists/${artist.slug}`}>
                    <div className="group cursor-pointer">
                      <div className="flex aspect-square items-center justify-center rounded-lg border border-border/50 bg-gradient-to-br from-primary/10 to-secondary/10 p-6 transition-all hover:scale-105 hover:shadow-lg">
                        <div className="flex flex-col items-center gap-2 text-center">
                          {artist.imageUrl ? (
                            <div className="flex h-12 w-12 items-center justify-center rounded-full overflow-hidden bg-primary/20">
                              <img
                                src={artist.imageUrl}
                                alt={artist.name}
                                className="h-full w-full object-cover"
                              />
                            </div>
                          ) : (
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/20">
                              <Music className="h-6 w-6 text-primary" />
                            </div>
                          )}
                          <div className="space-y-1">
                            <p className="w-full truncate font-medium text-sm">
                              {artist.name}
                            </p>
                            <p className="text-muted-foreground text-xs">
                              {artist.genres[0] || "Artist"}
                            </p>
                            <div className="flex items-center gap-1 text-muted-foreground text-xs">
                              <Users className="h-3 w-3" />
                              <span>{formatFollowers(artist.followers)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                </CarouselItem>
              ))}
            </CarouselContent>
          </Carousel>
        </div>
      </div>
    </div>
  );
};
