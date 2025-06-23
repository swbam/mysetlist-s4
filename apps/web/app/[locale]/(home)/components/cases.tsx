'use client';

import {
  Carousel,
  type CarouselApi,
  CarouselContent,
  CarouselItem,
} from '@repo/design-system/components/ui/carousel';
import { Card, CardContent } from '@repo/design-system/components/ui/card';
import { Badge } from '@repo/design-system/components/ui/badge';
import type { Dictionary } from '@repo/internationalization';
import { TrendingUp, Users, Calendar } from 'lucide-react';
import { useEffect, useState } from 'react';
import Link from 'next/link';

type CasesProps = {
  dictionary: Dictionary;
};

// Mock data for trending artists and shows
const trendingArtists = [
  { id: 1, name: 'Taylor Swift', genre: 'Pop', shows: 52, trending: 98 },
  { id: 2, name: 'The Weeknd', genre: 'R&B', shows: 45, trending: 92 },
  { id: 3, name: 'Olivia Rodrigo', genre: 'Pop Rock', shows: 38, trending: 89 },
  { id: 4, name: 'Arctic Monkeys', genre: 'Indie Rock', shows: 41, trending: 87 },
  { id: 5, name: 'Billie Eilish', genre: 'Alternative', shows: 35, trending: 85 },
  { id: 6, name: 'Post Malone', genre: 'Hip Hop', shows: 32, trending: 82 },
  { id: 7, name: 'Dua Lipa', genre: 'Pop', shows: 29, trending: 79 },
  { id: 8, name: 'The 1975', genre: 'Indie Pop', shows: 27, trending: 76 },
];

export const Cases = ({ dictionary }: CasesProps) => {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (!api) {
      return;
    }

    const interval = setInterval(() => {
      if (api.selectedScrollSnap() + 1 === api.scrollSnapList().length) {
        setCurrent(0);
        api.scrollTo(0);
      } else {
        api.scrollNext();
        setCurrent(current + 1);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [api, current]);

  return (
    <div className="w-full py-20 lg:py-40">
      <div className="container mx-auto">
        <div className="flex flex-col gap-10">
          <div className="flex items-center justify-between">
            <h2 className="text-left font-regular text-xl tracking-tighter md:text-5xl lg:max-w-xl">
              {dictionary.web.home.cases.title}
            </h2>
            <Link href="/artists" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              View all artists →
            </Link>
          </div>
          <Carousel setApi={setApi} className="w-full">
            <CarouselContent>
              {trendingArtists.map((artist) => (
                <CarouselItem className="basis-full sm:basis-1/2 md:basis-1/3 lg:basis-1/4" key={artist.id}>
                  <Link href={`/artists/${artist.id}`}>
                    <Card className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer">
                      <div className="aspect-square bg-gradient-to-br from-primary/20 to-primary/5 relative">
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="text-4xl font-bold text-primary/20">
                            {artist.name.split(' ').map(word => word[0]).join('')}
                          </div>
                        </div>
                      </div>
                      <CardContent className="p-4">
                        <h3 className="font-semibold text-lg mb-1">{artist.name}</h3>
                        <Badge variant="secondary" className="mb-3">{artist.genre}</Badge>
                        <div className="flex items-center justify-between text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            <span>{artist.shows} shows</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <TrendingUp className="h-3 w-3 text-green-500" />
                            <span>{artist.trending}%</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
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
