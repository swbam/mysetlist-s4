"use client";

import { Badge } from "@repo/design-system";
import {
  Carousel,
  type CarouselApi,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@repo/design-system";
import { Users } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

interface Artist {
  id: string;
  name: string;
  slug?: string;
  imageUrl?: string | null;
  followers?: number;
  trendingScore?: number;
}

interface TopArtistsCarouselProps {
  artists: Artist[];
}

export default function TopArtistsCarousel({
  artists,
}: TopArtistsCarouselProps) {
  const [api, setApi] = useState<CarouselApi>();

  // Auto-scroll every 3 seconds similar to Next-Forge template
  useEffect(() => {
    if (!api) {
      return;
    }

    const interval = setInterval(() => {
      if (api.selectedScrollSnap() + 1 === api.scrollSnapList().length) {
        api.scrollTo(0);
      } else {
        api.scrollNext();
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [api]);

  const formatFollowers = (count: number | undefined) => {
    if (!count) {
      return "0";
    }
    if (count >= 1_000_000) {
      return `${(count / 1_000_000).toFixed(1)}M`;
    }
    if (count >= 1_000) {
      return `${Math.round(count / 1_000)}K`;
    }
    return `${count}`;
  };

  return (
    <section className="bg-muted/50 py-16 md:py-24">
      <div className="container mx-auto px-4">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h2 className="mb-2 font-bold text-3xl tracking-tight md:text-4xl">
              Top Artists
            </h2>
            <p className="text-muted-foreground">
              Explore the artists fans are loving right now
            </p>
          </div>
          <Link
            href="/artists"
            className="font-medium text-primary hover:underline"
          >
            View All Artists →
          </Link>
        </div>

        <div className="relative">
          <Carousel
            setApi={setApi}
            opts={{ loop: true, align: "start" }}
            className="w-full"
          >
            <CarouselContent>
              {artists.map((artist) => (
                <CarouselItem
                  key={artist.id}
                  className="basis-2/3 sm:basis-1/3 md:basis-1/4 lg:basis-1/6"
                >
                  <Link
                    href={`/artists/${artist.slug ?? ""}`}
                    className="group block overflow-hidden rounded-lg border border-border bg-background transition-shadow hover:shadow-lg"
                  >
                    <div className="relative aspect-square overflow-hidden">
                      {artist.imageUrl ? (
                        <Image
                          src={artist.imageUrl}
                          alt={artist.name}
                          fill
                          sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 200px"
                          className="object-cover transition-transform group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-muted">
                          <span className="font-bold text-5xl text-muted-foreground">
                            {artist.name.charAt(0)}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="space-y-1 p-3">
                      <h3 className="truncate font-semibold group-hover:text-primary">
                        {artist.name}
                      </h3>
                      <div className="flex items-center gap-1 text-muted-foreground text-xs">
                        <Users className="h-3 w-3" />
                        {formatFollowers(artist.followers)} followers
                      </div>
                      {artist.trendingScore && artist.trendingScore > 85 && (
                        <Badge variant="secondary" className="text-[10px]">
                          Hot 🔥
                        </Badge>
                      )}
                    </div>
                  </Link>
                </CarouselItem>
              ))}
            </CarouselContent>
            {/* Navigation buttons */}
            <CarouselPrevious className="-left-4" />
            <CarouselNext className="-right-4" />
          </Carousel>
        </div>
      </div>
    </section>
  );
}
