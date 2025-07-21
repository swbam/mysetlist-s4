'use client';

import { Badge } from '@repo/design-system/components/ui/badge';
import { Card, CardContent } from '@repo/design-system/components/ui/card';
import { motion } from 'framer-motion';
import { Music, Sparkles, TrendingUp, Users } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import React from 'react';
import {
  ContentSlider,
  ContentSliderItem,
} from '~/components/ui/content-slider';

interface TrendingArtist {
  id: string;
  name: string;
  slug: string;
  imageUrl?: string;
  followers: number;
  popularity: number;
  trendingScore: number;
  genres: string[];
  recentShows: number;
  weeklyGrowth: number;
  rank: number;
}

interface TopArtistsSliderProps {
  artists: TrendingArtist[];
}

// Memoize the format function to prevent recreating on every render
const formatFollowers = (num: number) => {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(0)}K`;
  }
  return num.toString();
};

function TopArtistsSlider({
  artists,
}: TopArtistsSliderProps) {
  if (!artists || artists.length === 0) {
    return null;
  }

  return (
    <ContentSlider
      title="Trending Artists"
      subtitle="Vote for your favorite artists and shape their setlists"
      viewAllLink="/artists"
      viewAllText="Discover More Artists"
      autoPlay={true}
      autoPlayInterval={4000}
      itemsPerView={{
        mobile: 1.5,
        tablet: 3,
        desktop: 5,
        wide: 7,
      }}
      className="bg-gradient-to-b from-background via-background/95 to-background"
    >
      {artists.map((artist, index) => (
        <ContentSliderItem key={artist.id}>
          <Link href={`/artists/${artist.slug}`} className="group block">
            <Card className="overflow-hidden border-0 bg-transparent transition-all duration-300 hover:bg-card/20">
              <CardContent className="relative p-0">
                {/* Artist image with gradient overlay */}
                <div className="relative aspect-[3/4] overflow-hidden rounded-lg bg-gradient-to-br from-primary/20 to-purple-600/20 sm:rounded-xl">
                  {artist.imageUrl ? (
                    <Image
                      src={artist.imageUrl}
                      alt={artist.name}
                      fill
                      sizes="(max-width: 640px) 66vw, (max-width: 768px) 50vw, (max-width: 1200px) 25vw, 16vw"
                      className="object-cover transition-transform duration-500 group-hover:scale-110"
                      priority={index < 4}
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <div className="font-bold text-5xl text-muted-foreground/30">
                        {artist.name
                          .split(' ')
                          .map((w: string) => w[0])
                          .join('')}
                      </div>
                    </div>
                  )}
                  {artist.imageUrl && (
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                  )}

                  {/* Rank badge */}
                  {artist.rank <= 3 && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: index * 0.1, type: 'spring' }}
                      className="absolute top-2 right-2"
                    >
                      <Badge className="border-0 bg-gradient-to-r from-yellow-500 to-orange-500 px-2.5 py-1 shadow-lg">
                        <Sparkles className="mr-1 h-3 w-3" />#{artist.rank}
                      </Badge>
                    </motion.div>
                  )}

                  {/* Growth indicator */}
                  {artist.weeklyGrowth > 0 && (
                    <div className="absolute bottom-2 left-2 flex items-center gap-1 rounded-full bg-black/70 px-2.5 py-1 backdrop-blur-sm">
                      <TrendingUp className="h-3 w-3 text-green-400" />
                      <span className="font-medium text-green-400 text-xs">
                        +{artist.weeklyGrowth}%
                      </span>
                    </div>
                  )}

                  {/* Hover overlay with stats */}
                  <div className="absolute inset-0 flex flex-col justify-end p-3 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                    <div className="space-y-2">
                      <div className="flex items-center gap-1.5 text-white/90">
                        <Users className="h-3.5 w-3.5" />
                        <span className="font-medium text-xs">
                          {formatFollowers(artist.followers)} fans
                        </span>
                      </div>
                      {artist.recentShows > 0 && (
                        <div className="flex items-center gap-1.5 text-white/90">
                          <Music className="h-3.5 w-3.5" />
                          <span className="font-medium text-xs">
                            {artist.recentShows} recent shows
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Artist info */}
                <div className="pt-2 pb-1 text-center sm:pt-3 sm:pb-2">
                  <h3 className="truncate font-semibold text-xs transition-colors group-hover:text-primary sm:text-sm">
                    {artist.name}
                  </h3>
                  {artist.genres && artist.genres.length > 0 && (
                    <p className="mt-0.5 truncate text-muted-foreground text-xs sm:mt-1">
                      {artist.genres[0]}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </Link>
        </ContentSliderItem>
      ))}
    </ContentSlider>
  );
}

export default TopArtistsSlider;
