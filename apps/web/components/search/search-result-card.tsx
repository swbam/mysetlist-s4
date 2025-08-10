"use client";

import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import { Card, CardContent } from "@repo/design-system/components/ui/card";
import { cn } from "@repo/design-system/lib/utils";
import { format } from "date-fns";
import {
  Calendar,
  Clock,
  DollarSign,
  ExternalLink,
  Heart,
  MapPin,
  Music,
  Star,
  TrendingUp,
  Users,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { SyncStatusIndicator } from "~/components/sync-status-indicator";
import { useArtistSync } from "~/hooks/use-sync-status";

interface SearchResult {
  id: string;
  type: "artist" | "show" | "venue";
  title: string;
  subtitle: string;
  imageUrl?: string | null;
  slug: string;
  verified?: boolean;
  popularity?: number;
  genres?: string[];
  showCount?: number;
  followerCount?: number;
  spotifyId?: string;
  date?: string;
  venue?: {
    name: string;
    city: string;
    state: string;
  };
  artist?: {
    name: string;
    slug: string;
  };
  capacity?: number;
  price?: {
    min: number;
    max: number;
    currency: string;
  };
}

interface SearchResultCardProps {
  result: SearchResult;
  onFollow?: (artistId: string, isFollowing: boolean) => void;
  isFollowing?: boolean;
  showType?: boolean;
}

export function SearchResultCard({
  result,
  onFollow,
  isFollowing = false,
  showType = true,
}: SearchResultCardProps) {
  const { triggerArtistSync, getSyncJobId } = useArtistSync();
  const getResultIcon = () => {
    switch (result.type) {
      case "artist":
        return <Music className="h-4 w-4" />;
      case "show":
        return <Calendar className="h-4 w-4" />;
      case "venue":
        return <MapPin className="h-4 w-4" />;
    }
  };

  const getResultLink = () => {
    switch (result.type) {
      case "artist":
        return `/artists/${result.slug}`;
      case "show":
        return `/shows/${result.slug}`;
      case "venue":
        return `/venues/${result.slug}`;
      default:
        return "/";
    }
  };

  const getBadgeVariant = () => {
    switch (result.type) {
      case "artist":
        return "default";
      case "show":
        return "secondary";
      case "venue":
        return "outline";
    }
  };

  const formatPrice = (price: SearchResult["price"]) => {
    if (!price) {
      return null;
    }
    return `${price.currency}${price.min}-${price.max}`;
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return format(date, "MMM dd, yyyy");
    } catch {
      return dateString;
    }
  };

  const handleClick = () => {
    // Trigger background sync for artist data when clicking from search
    if (result.type === "artist" && result.spotifyId) {
      triggerArtistSync(result.id, result.spotifyId, "full_sync").catch(() => {
        // Silent fail - user still gets optimistic UI
      });
    }
  };

  // Get sync job ID for this artist
  const syncJobId = result.type === "artist" ? getSyncJobId(result.id) : null;

  return (
    <Card
      className={cn(
        "overflow-hidden transition-all duration-200 hover:scale-[1.02] hover:shadow-md",
        result.verified && "ring-2 ring-primary/20",
      )}
    >
      <CardContent className="p-6">
        <div className="flex items-center gap-4">
          {/* Image/Avatar */}
          {result.imageUrl ? (
            <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg">
              <Image
                src={result.imageUrl}
                alt={result.title}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 64px, 64px"
              />
            </div>
          ) : (
            <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-lg bg-muted">
              {getResultIcon()}
            </div>
          )}

          {/* Content */}
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex items-center gap-2">
              <Link
                href={getResultLink()}
                onClick={handleClick}
                className="truncate font-bold text-xl transition-colors hover:text-primary"
              >
                {result.title}
              </Link>

              {showType && (
                <Badge variant={getBadgeVariant()} className="text-xs">
                  {result.type}
                </Badge>
              )}

              {result.verified && (
                <Badge
                  variant="default"
                  className="bg-green-100 text-green-800 text-xs"
                >
                  <Star className="mr-1 h-3 w-3" />
                  Verified
                </Badge>
              )}

              {/* Show sync status for artists */}
              {result.type === "artist" && syncJobId && (
                <SyncStatusIndicator jobId={syncJobId} size="sm" />
              )}
            </div>

            <p className="mb-2 truncate text-muted-foreground">
              {result.subtitle}
            </p>

            {/* Type-specific metadata */}
            <div className="flex items-center gap-4 text-muted-foreground text-sm">
              {result.type === "artist" && (
                <>
                  {result.followerCount && (
                    <span className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      {result.followerCount.toLocaleString()} followers
                    </span>
                  )}
                  {result.showCount && (
                    <span className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {result.showCount} shows
                    </span>
                  )}
                  {result.popularity && (
                    <span className="flex items-center gap-1">
                      <TrendingUp className="h-4 w-4" />
                      {result.popularity}% popularity
                    </span>
                  )}
                </>
              )}

              {result.type === "show" && (
                <>
                  {result.date && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {formatDate(result.date)}
                    </span>
                  )}
                  {result.price && (
                    <span className="flex items-center gap-1">
                      <DollarSign className="h-4 w-4" />
                      {formatPrice(result.price)}
                    </span>
                  )}
                </>
              )}

              {result.type === "venue" && (
                <>
                  {result.capacity && (
                    <span className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      {result.capacity.toLocaleString()} capacity
                    </span>
                  )}
                  {result.showCount && (
                    <span className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {result.showCount} upcoming shows
                    </span>
                  )}
                </>
              )}
            </div>

            {/* Genres for artists */}
            {result.type === "artist" &&
              result.genres &&
              result.genres.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {result.genres.slice(0, 3).map((genre) => (
                    <Badge key={genre} variant="outline" className="text-xs">
                      {genre}
                    </Badge>
                  ))}
                  {result.genres.length > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{result.genres.length - 3} more
                    </Badge>
                  )}
                </div>
              )}
          </div>

          {/* Actions */}
          <div className="flex flex-shrink-0 gap-2">
            {result.type === "artist" && onFollow && (
              <Button
                variant={isFollowing ? "default" : "outline"}
                size="sm"
                onClick={() => onFollow(result.id, isFollowing)}
                className="gap-2"
              >
                <Heart
                  className={cn("h-4 w-4", isFollowing && "fill-current")}
                />
                {isFollowing ? "Following" : "Follow"}
              </Button>
            )}

            {result.type === "show" && result.venue && (
              <Link
                href={`/venues/${result.venue.name.toLowerCase().replace(/\s+/g, "-")}`}
              >
                <Button variant="outline" size="sm" className="gap-2">
                  <MapPin className="h-4 w-4" />
                  Venue
                </Button>
              </Link>
            )}

            <Link href={getResultLink()} onClick={handleClick}>
              <Button size="sm" className="gap-2">
                <ExternalLink className="h-4 w-4" />
                {result.type === "artist"
                  ? "View Artist"
                  : result.type === "show"
                    ? "View Show"
                    : "View Venue"}
              </Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
