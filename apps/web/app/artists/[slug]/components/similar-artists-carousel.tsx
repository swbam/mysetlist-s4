'use client';

import { ContentSlider, ContentSliderItem } from '@/components/ui/content-slider';
import { Avatar, AvatarFallback, AvatarImage } from '@repo/design-system/components/ui/avatar';
import { Badge } from '@repo/design-system/components/ui/badge';
import { Card, CardContent } from '@repo/design-system/components/ui/card';
import { motion } from 'framer-motion';
import { Music, TrendingUp, Users } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import React, { useMemo } from 'react';

interface SimilarArtist {
  id: string;
  name: string;
  slug: string;
  imageUrl: string | null;
  genres: string[] | null;
  popularity: number;
  verified: boolean;
  followerCount?: number;
  trendingScore?: number;
}

interface SimilarArtistsCarouselProps {
  artists: SimilarArtist[];
  currentArtistId: string;
}

const ArtistCard = React.memo(function ArtistCard({
  artist,
  index,
}: {
  artist: SimilarArtist;
  index: number;
}) {
  const primaryGenre = artist.genres?.[0] || 'Artist';

  return (
    <Link href={`/artists/${artist.slug}`} className="block h-full">
      <Card className="group h-full overflow-hidden border-border/50 bg-card/50 backdrop-blur-sm transition-all duration-300 hover:border-primary/50 hover:bg-card/80 hover:shadow-lg">
        <CardContent className="p-0">
          {/* Image Section */}
          <div className="relative aspect-square overflow-hidden bg-gradient-to-br from-primary/10 to-purple-600/10">
            {artist.imageUrl ? (
              <>
                <Image
                  src={artist.imageUrl}
                  alt={artist.name}
                  fill
                  sizes="(max-width: 640px) 80vw, (max-width: 1024px) 40vw, 300px"
                  className="object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              </>
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-muted">
                <Music className="h-16 w-16 text-muted-foreground/50" />
              </div>
            )}

            {/* Verified Badge */}
            {artist.verified && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
                className="absolute top-3 right-3"
              >
                <div className="rounded-full bg-primary p-1.5 shadow-lg">
                  <svg
                    className="h-3 w-3 text-primary-foreground"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
              </motion.div>
            )}

            {/* Popularity indicator */}
            {artist.popularity > 70 && (
              <div className="absolute bottom-3 left-3">
                <Badge className="border-0 bg-black/70 backdrop-blur-sm">
                  <TrendingUp className="mr-1 h-3 w-3" />
                  Popular
                </Badge>
              </div>
            )}
          </div>

          {/* Content Section */}
          <div className="p-4 space-y-3">
            <div>
              <h3 className="font-semibold text-base line-clamp-1 transition-colors group-hover:text-primary">
                {artist.name}
              </h3>
              <p className="text-sm text-muted-foreground mt-1">{primaryGenre}</p>
            </div>

            {/* Stats */}
            {artist.followerCount && (
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" />
                  {artist.followerCount >= 1000000
                    ? `${(artist.followerCount / 1000000).toFixed(1)}M`
                    : artist.followerCount >= 1000
                    ? `${(artist.followerCount / 1000).toFixed(0)}K`
                    : artist.followerCount.toString()}
                </span>
                {artist.trendingScore && artist.trendingScore > 0 && (
                  <span className="flex items-center gap-1">
                    <TrendingUp className="h-3.5 w-3.5 text-primary" />
                    {artist.trendingScore.toFixed(0)}
                  </span>
                )}
              </div>
            )}

            {/* Genres */}
            {artist.genres && artist.genres.length > 1 && (
              <div className="flex flex-wrap gap-1">
                {artist.genres.slice(1, 3).map((genre) => (
                  <Badge key={genre} variant="outline" className="text-xs">
                    {genre}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
});

export const SimilarArtistsCarousel = React.memo(function SimilarArtistsCarousel({
  artists,
  currentArtistId,
}: SimilarArtistsCarouselProps) {
  // Filter out the current artist
  const filteredArtists = useMemo(
    () => artists.filter((artist) => artist.id !== currentArtistId),
    [artists, currentArtistId]
  );

  if (filteredArtists.length === 0) {
    return null;
  }

  return (
    <ContentSlider
      title="Similar Artists"
      subtitle="Discover artists with a similar sound"
      viewAllLink="/discover"
      viewAllText="Discover More"
      autoPlay={true}
      autoPlayInterval={6000}
      itemsPerView={{
        mobile: 1.5,
        tablet: 2.5,
        desktop: 4,
      }}
      showDots={false}
      gradientOverlay={false}
      className="py-8"
    >
      {filteredArtists.map((artist, index) => (
        <ContentSliderItem key={artist.id}>
          <ArtistCard artist={artist} index={index} />
        </ContentSliderItem>
      ))}
    </ContentSlider>
  );
});