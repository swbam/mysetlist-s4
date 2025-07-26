'use client';

import { Badge } from '@repo/design-system/components/ui/badge';
import { Card, CardContent } from '@repo/design-system/components/ui/card';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import { Calendar, MapPin, TrendingUp, Users } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import React from 'react';
import {
  ContentSlider,
  ContentSliderItem,
} from '~/components/ui/content-slider';
import type { TrendingShow } from '~/types/api';

interface TrendingShowsCarouselProps {
  shows: TrendingShow[];
}

// Memoized show card component to prevent unnecessary re-renders
const ShowCard = React.memo(({ show, index }: { show: TrendingShow; index: number }) => (
  <ContentSliderItem key={show.id}>
    <Link href={`/shows/${show.slug ?? ''}`} className="block h-full">
      <Card className="group h-full overflow-hidden border-border/50 bg-card/50 backdrop-blur-sm transition-all duration-300 hover:border-primary/50 hover:bg-card/80">
        <CardContent className="flex h-full flex-col p-0">
          {/* Image section with overlay */}
          <div className="relative aspect-[16/10] overflow-hidden bg-gradient-to-br from-primary/10 to-purple-600/10">
            {show.artist.imageUrl ? (
              <>
                <Image
                  src={show.artist.imageUrl}
                  alt={show.name}
                  fill
                  sizes="(max-width: 640px) 95vw, (max-width: 768px) 50vw, (max-width: 1024px) 40vw, 350px"
                  className="object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
              </>
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <div className="text-6xl opacity-20">🎵</div>
              </div>
            )}

            {/* Trending badge */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="absolute top-3 left-3"
            >
              <Badge className="border-0 bg-primary/90 shadow-lg backdrop-blur-sm">
                <TrendingUp className="mr-1 h-3 w-3" />
                Trending #{show.rank}
              </Badge>
            </motion.div>

            {/* Date overlay */}
            {show.date && (
              <div className="absolute right-3 bottom-3 flex items-center gap-1.5 rounded-lg bg-black/70 px-3 py-1.5 backdrop-blur-sm">
                <Calendar className="h-3.5 w-3.5 text-white/80" />
                <span className="font-medium text-sm text-white">
                  {format(new Date(show.date), 'MMM dd')}
                </span>
              </div>
            )}
          </div>

          {/* Content section */}
          <div className="flex-1 space-y-2 p-3 sm:space-y-3 sm:p-4">
            <div>
              <h3 className="line-clamp-2 font-semibold text-base transition-colors group-hover:text-primary sm:text-lg">
                {show.name}
              </h3>
              <p className="mt-0.5 text-muted-foreground text-xs sm:mt-1 sm:text-sm">
                by {show.artist.name}
              </p>
            </div>

            {/* Venue info */}
            {show.venue.name && (
              <div className="flex items-start gap-2 text-muted-foreground text-sm">
                <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <span className="line-clamp-2">
                  {show.venue.name}
                  {show.venue.city && `, ${show.venue.city}`}
                  {show.venue.state && `, ${show.venue.state}`}
                </span>
              </div>
            )}

            {/* Stats */}
            <div className="mt-auto flex items-center gap-3 pt-1 sm:gap-4 sm:pt-2">
              <div className="flex items-center gap-1 text-xs sm:gap-1.5 sm:text-sm">
                <Users className="h-3 w-3 text-muted-foreground sm:h-3.5 sm:w-3.5" />
                <span className="font-medium">{show.attendeeCount}</span>
                <span className="text-muted-foreground hidden sm:inline">attending</span>
                <span className="text-muted-foreground sm:hidden">going</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  </ContentSliderItem>
));

ShowCard.displayName = 'ShowCard';

const TrendingShowsCarousel = React.memo(({ shows }: TrendingShowsCarouselProps) => {
  return (
    <ContentSlider
      title="Trending Shows"
      subtitle="Discover the hottest concerts happening now"
      viewAllLink="/shows"
      viewAllText="Explore All Shows"
      autoPlay={true}
      autoPlayInterval={5000}
      itemsPerView={{
        mobile: 1.1,
        tablet: 2.2,
        desktop: 3.5,
        wide: 5,
      }}
      showDots={true}
    >
      {shows.map((show, index) => (
        <ShowCard key={show.id} show={show} index={index} />
      ))}
    </ContentSlider>
  );
});

TrendingShowsCarousel.displayName = 'TrendingShowsCarousel';

export default TrendingShowsCarousel;
