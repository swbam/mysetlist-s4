'use client';

import {
  Carousel,
  type CarouselApi,
  CarouselContent,
  CarouselItem,
} from '@repo/design-system/components/ui/carousel';
import { Music, Users, TrendingUp } from 'lucide-react';
import Image from 'next/image';
import { useEffect, useState } from 'react';

// Mock data for top artists - this would come from your API
const topArtists = [
  { name: 'Taylor Swift', genre: 'Pop', followers: '95M', image: '/artists/taylor-swift.jpg' },
  { name: 'The Beatles', genre: 'Rock', followers: '78M', image: '/artists/beatles.jpg' },
  { name: 'Ed Sheeran', genre: 'Pop', followers: '67M', image: '/artists/ed-sheeran.jpg' },
  { name: 'Ariana Grande', genre: 'Pop', followers: '62M', image: '/artists/ariana-grande.jpg' },
  { name: 'Drake', genre: 'Hip Hop', followers: '58M', image: '/artists/drake.jpg' },
  { name: 'Post Malone', genre: 'Hip Hop', followers: '54M', image: '/artists/post-malone.jpg' },
  { name: 'Billie Eilish', genre: 'Alternative', followers: '51M', image: '/artists/billie-eilish.jpg' },
  { name: 'Justin Bieber', genre: 'Pop', followers: '49M', image: '/artists/justin-bieber.jpg' },
  { name: 'Olivia Rodrigo', genre: 'Pop', followers: '45M', image: '/artists/olivia-rodrigo.jpg' },
  { name: 'The Weeknd', genre: 'R&B', followers: '43M', image: '/artists/weeknd.jpg' },
  { name: 'Bad Bunny', genre: 'Reggaeton', followers: '41M', image: '/artists/bad-bunny.jpg' },
  { name: 'Dua Lipa', genre: 'Pop', followers: '39M', image: '/artists/dua-lipa.jpg' },
  { name: 'Harry Styles', genre: 'Pop Rock', followers: '37M', image: '/artists/harry-styles.jpg' },
  { name: 'Adele', genre: 'Soul', followers: '35M', image: '/artists/adele.jpg' },
  { name: 'Bruno Mars', genre: 'Pop', followers: '33M', image: '/artists/bruno-mars.jpg' },
];

export const Cases = () => {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (!api) {
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
    }, 2000); // Slower animation for better readability

    return () => clearTimeout(interval);
  }, [api, current]);

  return (
    <div className="w-full py-20 lg:py-40 bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto">
        <div className="flex flex-col gap-10">
          <div className="flex flex-col items-center text-center gap-4">
            <div className="flex items-center gap-2 text-primary">
              <TrendingUp className="h-5 w-5" />
              <span className="text-sm font-medium tracking-wide uppercase">Trending Now</span>
            </div>
            <h2 className="font-regular text-3xl tracking-tighter md:text-5xl lg:max-w-4xl">
              Top Artists on MySetlist
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl">
              Discover the most popular artists and their upcoming shows
            </p>
          </div>
          <Carousel setApi={setApi} className="w-full">
            <CarouselContent>
              {topArtists.map((artist, index) => (
                <CarouselItem className="basis-1/3 md:basis-1/4 lg:basis-1/6" key={index}>
                  <div className="group cursor-pointer">
                    <div className="flex aspect-square items-center justify-center rounded-lg bg-gradient-to-br from-primary/10 to-secondary/10 p-6 transition-all hover:shadow-lg hover:scale-105 border border-border/50">
                      <div className="flex flex-col items-center gap-2 text-center">
                        <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                          <Music className="h-6 w-6 text-primary" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm font-medium truncate w-full">
                            {artist.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {artist.genre}
                          </p>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Users className="h-3 w-3" />
                            <span>{artist.followers}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
          </Carousel>
        </div>
      </div>
    </div>
  );
};
