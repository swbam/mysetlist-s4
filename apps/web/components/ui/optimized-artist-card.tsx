"use client";

import { Badge } from "@repo/design-system/components/ui/badge";
import { Card, CardContent } from "@repo/design-system/components/ui/card";
import { cn } from "@repo/design-system/lib/utils";
import { motion } from "framer-motion";
import { Music, Sparkles, TrendingUp, Users } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import React from "react";
import { AccessibleIcon, ScreenReaderOnly } from "./accessibility-utils";

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

interface OptimizedArtistCardProps {
  artist: TrendingArtist;
  index?: number;
  priority?: boolean;
  className?: string;
  showRank?: boolean;
  showStats?: boolean;
  variant?: "default" | "compact" | "featured";
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

const getInitials = (name: string) => {
  return name
    .split(" ")
    .map((w: string) => w[0])
    .join("")
    .toUpperCase();
};

export const OptimizedArtistCard = React.memo(function OptimizedArtistCard({
  artist,
  index = 0,
  priority = false,
  className,
  showRank = true,
  showStats = true,
  variant = "default",
}: OptimizedArtistCardProps) {
  const isTopRanked = artist.rank <= 3;
  const hasGrowth = artist.weeklyGrowth > 0;

  const cardVariants = {
    default: "aspect-[3/4]",
    compact: "aspect-[4/3]",
    featured: "aspect-[3/4] md:aspect-[4/3]",
  };

  const textSizes = {
    default: {
      title: "text-xs sm:text-sm",
      subtitle: "text-xs",
    },
    compact: {
      title: "text-sm",
      subtitle: "text-xs",
    },
    featured: {
      title: "text-sm md:text-base",
      subtitle: "text-xs md:text-sm",
    },
  };

  return (
    <Link
      href={`/artists/${artist.slug}`}
      className={cn(
        "group block focus:outline-none rounded-lg",
        className,
      )}
      prefetch
    >
      <Card className="overflow-hidden border-0 bg-transparent transition-all duration-300 hover:bg-card/20">
        <CardContent className="relative p-0">
          {/* Artist image with gradient overlay */}
          <div
            className={cn(
              "relative overflow-hidden rounded-lg bg-gradient-to-br from-primary/20 to-purple-600/20 sm:rounded-xl",
              cardVariants[variant],
            )}
          >
            {artist.imageUrl ? (
              <Image
                src={artist.imageUrl}
                alt={`${artist.name} artist photo`}
                fill
                sizes={
                  variant === "featured"
                    ? "(max-width: 640px) 66vw, (max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                    : "(max-width: 640px) 66vw, (max-width: 768px) 50vw, (max-width: 1200px) 25vw, 16vw"
                }
                className="object-cover transition-transform duration-500 group-hover:scale-110 group-focus:scale-110"
                priority={priority || index < 4}
                quality={priority ? 85 : 75}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-muted/50 to-muted">
                <div className="font-bold text-4xl text-muted-foreground/50 sm:text-5xl">
                  {getInitials(artist.name)}
                </div>
                <ScreenReaderOnly>
                  No image available for {artist.name}
                </ScreenReaderOnly>
              </div>
            )}

            {/* Image overlay for better text readability */}
            {artist.imageUrl && (
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus:opacity-100" />
            )}

            {/* Rank badge */}
            {showRank && isTopRanked && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: index * 0.1, type: "spring" }}
                className="absolute top-2 right-2"
              >
                <Badge className="border-0 bg-gradient-to-r from-yellow-500 to-orange-500 px-2.5 py-1 shadow-lg">
                  <AccessibleIcon
                    icon={Sparkles}
                    label="Top ranked"
                    decorative
                  />
                  <span className="ml-1 font-semibold">#{artist.rank}</span>
                </Badge>
              </motion.div>
            )}

            {/* Growth indicator */}
            {showStats && hasGrowth && (
              <div className="absolute bottom-2 left-2 flex items-center gap-1 rounded-full bg-black/70 px-2.5 py-1 backdrop-blur-sm">
                <AccessibleIcon
                  icon={TrendingUp}
                  label="Trending up"
                  className="h-3 w-3 text-green-400"
                />
                <span className="font-medium text-green-400 text-xs">
                  +{artist.weeklyGrowth}%
                </span>
                <ScreenReaderOnly>
                  Weekly growth: {artist.weeklyGrowth} percent
                </ScreenReaderOnly>
              </div>
            )}

            {/* Hover overlay with stats */}
            {showStats && (
              <div className="absolute inset-0 flex flex-col justify-end p-3 opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus:opacity-100">
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 text-white/90">
                    <AccessibleIcon
                      icon={Users}
                      label="Followers"
                      className="h-3.5 w-3.5"
                    />
                    <span className="font-medium text-xs">
                      {formatFollowers(artist.followers)} fans
                    </span>
                  </div>
                  {artist.recentShows > 0 && (
                    <div className="flex items-center gap-1.5 text-white/90">
                      <AccessibleIcon
                        icon={Music}
                        label="Recent shows"
                        className="h-3.5 w-3.5"
                      />
                      <span className="font-medium text-xs">
                        {artist.recentShows} recent shows
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Artist info */}
          <div className="pt-2 pb-1 text-center sm:pt-3 sm:pb-2">
            <h3
              className={cn(
                "truncate font-semibold transition-colors group-hover:text-primary group-focus:text-primary",
                textSizes[variant].title,
              )}
            >
              {artist.name}
            </h3>
            {artist.genres && artist.genres.length > 0 && (
              <p
                className={cn(
                  "mt-0.5 truncate text-muted-foreground sm:mt-1",
                  textSizes[variant].subtitle,
                )}
              >
                {artist.genres[0]}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
});

export default OptimizedArtistCard;
