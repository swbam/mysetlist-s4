"use client";

import { Badge } from "@repo/design-system/badge";
import { Button } from "@repo/design-system/button";
import { Skeleton } from "@repo/design-system/skeleton";
import {
  Building,
  Calendar,
  ExternalLink,
  MapPin,
  TrendingUp,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

interface TrendingVenue {
  id: string;
  name: string;
  slug: string;
  city: string;
  state?: string;
  country: string;
  capacity?: number;
  upcomingShows: number;
  totalShows: number;
  trendingScore: number;
  weeklyGrowth: number;
  imageUrl?: string;
}

export function TrendingVenues() {
  const [venues, setVenues] = useState<TrendingVenue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTrendingVenues();
  }, []);

  const fetchTrendingVenues = async () => {
    try {
      const response = await fetch("/api/trending/venues");
      if (!response.ok) {
        throw new Error("Failed to fetch trending venues");
      }

      const data = await response.json();
      setVenues(data.venues || []);
    } catch (_err) {
      setError("Failed to load trending venues");
    } finally {
      setLoading(false);
    }
  };

  const formatCapacity = (capacity?: number) => {
    if (!capacity) {
      return "N/A";
    }
    if (capacity >= 1000) {
      return `${(capacity / 1000).toFixed(1)}K`;
    }
    return capacity.toString();
  };

  const getGrowthBadge = (growth: number) => {
    if (growth > 20) {
      return {
        variant: "default" as const,
        text: "Hot",
        color: "text-red-500",
      };
    }
    if (growth > 10) {
      return {
        variant: "secondary" as const,
        text: "Rising",
        color: "text-orange-500",
      };
    }
    if (growth > 0) {
      return {
        variant: "outline" as const,
        text: "Growing",
        color: "text-green-500",
      };
    }
    return {
      variant: "outline" as const,
      text: "Stable",
      color: "text-gray-500",
    };
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 10 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 rounded-lg border p-4"
          >
            <div className="w-8 font-bold text-lg text-muted-foreground">
              {i + 1}
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
              <Building className="h-6 w-6 text-muted-foreground" />
            </div>
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
            <div className="space-y-1 text-right">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-3 w-12" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-8 text-center">
        <p className="mb-4 text-muted-foreground">{error}</p>
        <Button onClick={fetchTrendingVenues} variant="outline">
          Try Again
        </Button>
      </div>
    );
  }

  if (venues.length === 0) {
    return (
      <div className="py-8 text-center">
        <Building className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
        <p className="text-muted-foreground">No trending venues found</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {venues.map((venue, index) => {
        const growthBadge = getGrowthBadge(venue.weeklyGrowth);

        return (
          <div
            key={venue.id}
            className="flex items-center gap-4 rounded-lg border p-4 transition-shadow hover:shadow-md"
          >
            {/* Rank */}
            <div className="w-8 font-bold text-muted-foreground text-xl">
              {index + 1}
            </div>

            {/* Venue Icon/Image */}
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-muted">
              {venue.imageUrl ? (
                <img
                  src={venue.imageUrl}
                  alt={venue.name}
                  className="h-12 w-12 rounded-lg object-cover"
                />
              ) : (
                <Building className="h-6 w-6 text-muted-foreground" />
              )}
            </div>

            {/* Venue Info */}
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex items-center gap-2">
                <Link
                  href={`/venues/${venue.slug}`}
                  className="truncate font-semibold hover:underline"
                >
                  {venue.name}
                </Link>
                <Badge variant={growthBadge.variant} className="text-xs">
                  {growthBadge.text}
                </Badge>
              </div>

              <div className="mb-1 flex items-center gap-4 text-muted-foreground text-sm">
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {venue.city}
                  {venue.state && `, ${venue.state}`}
                  {venue.country && `, ${venue.country}`}
                </span>
                {venue.capacity && (
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {formatCapacity(venue.capacity)} capacity
                  </span>
                )}
              </div>

              <div className="flex items-center gap-4 text-muted-foreground text-sm">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {venue.upcomingShows} upcoming shows
                </span>
                <span className="flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  {venue.totalShows} total shows
                </span>
              </div>
            </div>

            {/* Stats */}
            <div className="text-right">
              <div className="flex items-center gap-1 font-medium text-sm">
                <TrendingUp className={`h-3 w-3 ${growthBadge.color}`} />
                {venue.weeklyGrowth > 0 ? "+" : ""}
                {venue.weeklyGrowth.toFixed(1)}%
              </div>
              <div className="text-muted-foreground text-xs">
                Score: {venue.trendingScore.toFixed(0)}
              </div>
            </div>

            {/* External Link */}
            <Link href={`/venues/${venue.slug}`}>
              <Button variant="ghost" size="sm">
                <ExternalLink className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        );
      })}
    </div>
  );
}
