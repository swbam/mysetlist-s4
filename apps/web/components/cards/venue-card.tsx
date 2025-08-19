"use client";

import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import { Card, CardContent } from "@repo/design-system/components/ui/card";
import { cn } from "@repo/design-system/lib/utils";
import {
  Accessibility,
  Calendar,
  Car,
  ExternalLink,
  Heart,
  MapPin,
  Music,
  Users,
  Wifi,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import {
  animations,
  focusRing,
  touchTargets,
} from "~/components/layout/grid-utils";

interface VenueCardProps {
  venue: {
    id: string;
    name: string;
    slug: string;
    imageUrl?: string | null;
    address?: string | null;
    city: string;
    state?: string | null;
    country: string;
    capacity?: number | null;
    venueType?: string | null;
    upcomingShowCount?: number;
    distance?: number;
    amenities?: string | null;
    website?: string | null;
  };
  variant?: "default" | "compact" | "detailed";
  showFavoriteButton?: boolean;
  onFavorite?: (venueId: string) => void;
  className?: string;
}

export function VenueCard({
  venue,
  variant = "default",
  showFavoriteButton = false,
  onFavorite,
  className,
}: VenueCardProps) {
  const [isFavorite, setIsFavorite] = useState(false);
  const [imageError, setImageError] = useState(false);

  // Format capacity
  const formatCapacity = (capacity?: number | null) => {
    if (!capacity) return null;
    if (capacity >= 1000) return `${(capacity / 1000).toFixed(1)}k`;
    return capacity.toString();
  };

  // Format distance
  const formatDistance = (distance?: number) => {
    if (!distance) return null;
    if (distance < 1) return `${Math.round(distance * 1000)}m`;
    return `${distance.toFixed(1)}km`;
  };

  // Format location
  const formatLocation = () => {
    if (venue.state) {
      return `${venue.city}, ${venue.state}`;
    }
    return `${venue.city}, ${venue.country}`;
  };

  // Parse amenities safely
  let amenities: string[] = [];
  if (venue.amenities) {
    try {
      const parsed = JSON.parse(venue.amenities);
      amenities = Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      // If JSON parsing fails, check if it's a comma-separated string
      amenities = venue.amenities.split(",").map((item) => item.trim());
    }
  }
  const hasParking = amenities.includes("parking");
  const hasWifi = amenities.includes("wifi");
  const hasAccessibility = amenities.includes("accessibility");

  // Venue type labels
  const venueTypeLabels: Record<string, string> = {
    arena: "Arena",
    stadium: "Stadium",
    theater: "Theater",
    club: "Club",
    "outdoor-amphitheater": "Outdoor Amphitheater",
    "indoor-amphitheater": "Indoor Amphitheater",
    ballroom: "Ballroom",
    festival: "Festival Grounds",
    other: "Other",
  };

  // Handle favorite action
  const handleFavorite = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsFavorite(!isFavorite);
    onFavorite?.(venue.id);
  };

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
      aria-label={`Venue: ${venue.name}`}
    >
      <Link
        href={`/venues/${venue.slug}`}
        className="block focus:outline-none"
        tabIndex={0}
        aria-label={`View ${venue.name} details`}
      >
        {/* Venue Image */}
        <div className="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-primary/10 to-primary/5">
          {venue.imageUrl && !imageError ? (
            <Image
              src={venue.imageUrl}
              alt={`${venue.name} photo`}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-110"
              sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
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

          {/* Distance Badge */}
          {venue.distance !== undefined && (
            <div className="absolute top-3 right-3">
              <Badge
                variant="secondary"
                className="bg-black/50 text-white hover:bg-black/60"
              >
                {formatDistance(venue.distance)} away
              </Badge>
            </div>
          )}


          {/* Favorite Button */}
          {showFavoriteButton && (
            <div className="absolute bottom-3 right-3">
              <Button
                variant="secondary"
                size="icon"
                className={cn(
                  "bg-white/90 hover:bg-white",
                  touchTargets.comfortable,
                  focusRing.button,
                )}
                onClick={handleFavorite}
                aria-label={
                  isFavorite
                    ? `Remove ${venue.name} from favorites`
                    : `Add ${venue.name} to favorites`
                }
              >
                <Heart
                  className={cn(
                    "h-4 w-4",
                    isFavorite
                      ? "fill-red-500 text-red-500"
                      : "text-muted-foreground",
                  )}
                  aria-hidden="true"
                />
              </Button>
            </div>
          )}
        </div>
      </Link>

      {/* Card Content */}
      <CardContent className="p-4">
        <div className="mb-3">
          <Link href={`/venues/${venue.slug}`} className="focus:outline-none">
            <h3 className="font-semibold text-lg leading-tight transition-colors group-hover:text-primary line-clamp-2">
              {venue.name}
            </h3>
          </Link>

          {/* Location */}
          <div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="h-3 w-3 flex-shrink-0" aria-hidden="true" />
            <span className="truncate">{formatLocation()}</span>
          </div>
        </div>

        {/* Venue Type & Capacity */}
        <div className="mb-3 flex flex-wrap items-center gap-2">
          {venue.venueType && (
            <Badge variant="outline" className="text-xs">
              {venueTypeLabels[venue.venueType] || venue.venueType}
            </Badge>
          )}
          {venue.capacity && (
            <Badge variant="secondary" className="text-xs">
              <Users className="mr-1 h-3 w-3" aria-hidden="true" />
              {formatCapacity(venue.capacity)}
            </Badge>
          )}
        </div>

        {/* Amenities */}
        {amenities.length > 0 && (
          <div className="mb-3 flex gap-3 text-xs text-muted-foreground">
            {hasParking && (
              <div
                className="flex items-center gap-1"
                title="Parking available"
              >
                <Car className="h-3 w-3" aria-hidden="true" />
                <span className="sr-only">Parking available</span>
              </div>
            )}
            {hasWifi && (
              <div className="flex items-center gap-1" title="WiFi available">
                <Wifi className="h-3 w-3" aria-hidden="true" />
                <span className="sr-only">WiFi available</span>
              </div>
            )}
            {hasAccessibility && (
              <div className="flex items-center gap-1" title="Accessible">
                <Accessibility className="h-3 w-3" aria-hidden="true" />
                <span className="sr-only">Wheelchair accessible</span>
              </div>
            )}
          </div>
        )}

        {/* Stats Footer */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          {venue.upcomingShowCount !== undefined &&
          venue.upcomingShowCount > 0 ? (
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" aria-hidden="true" />
              <span>{venue.upcomingShowCount} upcoming shows</span>
            </div>
          ) : (
            <span>No upcoming shows</span>
          )}

          {venue.website && (
            <Button
              variant="ghost"
              size="sm"
              className={cn("text-xs", touchTargets.minimum, focusRing.button)}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (venue.website) {
                  window.open(venue.website, "_blank", "noopener,noreferrer");
                }
              }}
              aria-label={`Visit ${venue.name} website`}
            >
              <ExternalLink className="h-3 w-3" aria-hidden="true" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
