"use client";

import { Badge } from "@repo/design-system";
import { Button } from "@repo/design-system";
import { Card, CardContent } from "@repo/design-system";
import { cn } from "@repo/design-system";
import {
  Calendar,
  CheckCircle2,
  Heart,
  Music,
  Play,
  TrendingUp,
  Users,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import {
  animations,
  focusRing,
  touchTargets,
} from "~/components/layout/grid-utils";
import { parseGenres } from "~/lib/parse-genres";

interface ArtistCardProps {
  artist: {
    id: string;
    name: string;
    slug: string;
    imageUrl?: string | null;
    smallImageUrl?: string | null;
    genres?: string | string[] | null;
    followers?: number | null;
    followerCount?: number | null;
    popularity?: number | null;
    verified?: boolean;
    trendingScore?: number | null;
    upcomingShows?: number;
    totalShows?: number;
    lastShowDate?: string | null;
  };
  variant?: "default" | "compact" | "detailed";
  showFollowButton?: boolean;
  onFollow?: (artistId: string) => void;
  className?: string;
}

export function ArtistCard({
  artist,
  variant = "default",
  showFollowButton = false,
  onFollow,
  className,
}: ArtistCardProps) {
  const [isFollowing, setIsFollowing] = useState(false);
  const [imageError, setImageError] = useState(false);

  // Parse genres consistently
  const genres = Array.isArray(artist.genres)
    ? artist.genres
    : parseGenres(artist.genres);

  // Get the best image URL
  const imageUrl = artist.smallImageUrl || artist.imageUrl;

  // Format follower count
  const formatFollowers = (count?: number | null) => {
    if (!count) return "0";
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(0)}k`;
    return count.toString();
  };

  // Handle follow action
  const handleFollow = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsFollowing(!isFollowing);
    onFollow?.(artist.id);
  };

  // Determine if artist is trending
  const isTrending = artist.trendingScore && artist.trendingScore > 75;
  const isHot = artist.trendingScore && artist.trendingScore > 90;

  return (
    <Card
      className={cn(
        "group overflow-hidden",
        animations.all,
        animations.shadow,
        animations.scale,
        focusRing.card,
        className,
      )}
      role="article"
      aria-label={`Artist: ${artist.name}`}
    >
      <Link
        href={`/artists/${artist.slug}`}
        className="block focus:outline-none"
        tabIndex={0}
        aria-label={`View ${artist.name}'s profile`}
      >
        {/* Artist Image */}
        <div className="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-primary/10 to-primary/5">
          {imageUrl && !imageError ? (
            <Image
              src={imageUrl}
              alt={`${artist.name} photo`}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-110"
              sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, (max-width: 1280px) 25vw, 20vw"
              onError={() => setImageError(true)}
              priority={false}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <Music
                className="h-16 w-16 text-muted-foreground/30"
                aria-hidden="true"
              />
            </div>
          )}

          {/* Trending/Hot Badge */}
          {isHot ? (
            <div className="absolute top-3 right-3">
              <Badge
                variant="secondary"
                className="gap-1 bg-red-500/90 text-white hover:bg-red-500"
              >
                <TrendingUp className="h-3 w-3" aria-hidden="true" />
                Hot
              </Badge>
            </div>
          ) : isTrending ? (
            <div className="absolute top-3 right-3">
              <Badge variant="secondary" className="gap-1">
                <TrendingUp className="h-3 w-3" aria-hidden="true" />
                Trending
              </Badge>
            </div>
          ) : null}

          {/* Verified Badge */}
          {artist.verified && (
            <div className="absolute top-3 left-3">
              <div className="rounded-full bg-primary/90 p-1.5">
                <CheckCircle2
                  className="h-4 w-4 text-primary-foreground fill-current"
                  aria-label="Verified artist"
                />
              </div>
            </div>
          )}

          {/* Hover overlay */}
          <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/20">
            <div className="flex h-full w-full items-center justify-center opacity-0 transition-opacity group-hover:opacity-100">
              <div className="rounded-full bg-white/90 p-3">
                <Play className="h-6 w-6 text-primary" aria-hidden="true" />
              </div>
            </div>
          </div>
        </div>
      </Link>

      {/* Card Content */}
      <CardContent className="p-4">
        <div className="mb-3">
          <Link href={`/artists/${artist.slug}`} className="focus:outline-none">
            <h3 className="truncate font-semibold text-lg transition-colors group-hover:text-primary">
              {artist.name}
            </h3>
          </Link>

          {/* Genres */}
          {genres.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {genres.slice(0, 2).map((genre) => (
                <Badge key={genre} variant="outline" className="text-xs">
                  {genre}
                </Badge>
              ))}
              {genres.length > 2 && (
                <Badge variant="outline" className="text-xs">
                  +{genres.length - 2}
                </Badge>
              )}
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Users className="h-3 w-3" aria-hidden="true" />
            <span>
              {formatFollowers(artist.followers || artist.followerCount)} fans
            </span>
          </div>

          {artist.upcomingShows && artist.upcomingShows > 0 && (
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" aria-hidden="true" />
              <span>{artist.upcomingShows} shows</span>
            </div>
          )}
        </div>

        {/* Follow Button */}
        {showFollowButton && (
          <Button
            variant={isFollowing ? "default" : "outline"}
            size="sm"
            className={cn(
              "mt-3 w-full",
              touchTargets.comfortable,
              focusRing.button,
            )}
            onClick={handleFollow}
            aria-label={
              isFollowing ? `Unfollow ${artist.name}` : `Follow ${artist.name}`
            }
          >
            <Heart
              className={cn("mr-2 h-4 w-4", isFollowing && "fill-current")}
              aria-hidden="true"
            />
            {isFollowing ? "Following" : "Follow"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
