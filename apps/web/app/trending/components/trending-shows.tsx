"use client";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@repo/design-system/components/ui/avatar";
import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import { Skeleton } from "@repo/design-system/components/ui/skeleton";
import {
  Calendar,
  ExternalLink,
  MapPin,
  TrendingUp,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

interface TrendingShow {
  id: string;
  name: string;
  slug: string;
  date: string;
  status: "upcoming" | "ongoing" | "completed";
  artist: {
    name: string;
    slug: string;
    imageUrl?: string;
  };
  venue: {
    name: string;
    city: string;
    state?: string;
  };
  voteCount: number;
  attendeeCount: number;
  trendingScore: number;
  weeklyGrowth: number;
}

export function TrendingShows() {
  const [shows, setShows] = useState<TrendingShow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTrendingShows();
  }, []);

  const fetchTrendingShows = async () => {
    try {
      const response = await fetch("/api/trending/shows");
      if (!response.ok) {
        throw new Error("Failed to fetch trending shows");
      }

      const data = await response.json();
      setShows(data.shows || []);
    } catch (_err) {
      setError("Failed to load trending shows");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "upcoming":
        return {
          variant: "default" as const,
          text: "Upcoming",
          color: "text-blue-500",
        };
      case "ongoing":
        return {
          variant: "default" as const,
          text: "Live",
          color: "text-red-500",
        };
      case "completed":
        return {
          variant: "secondary" as const,
          text: "Completed",
          color: "text-gray-500",
        };
      default:
        return {
          variant: "outline" as const,
          text: status,
          color: "text-gray-500",
        };
    }
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
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-64" />
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
        <Button onClick={fetchTrendingShows} variant="outline">
          Try Again
        </Button>
      </div>
    );
  }

  if (shows.length === 0) {
    return (
      <div className="py-8 text-center">
        <Calendar className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
        <p className="text-muted-foreground">No trending shows found</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {shows.map((show, index) => {
        const statusBadge = getStatusBadge(show.status);
        const growthBadge = getGrowthBadge(show.weeklyGrowth);

        return (
          <div
            key={show.id}
            className="flex items-center gap-4 rounded-lg border p-4 transition-shadow hover:shadow-md"
          >
            {/* Rank */}
            <div className="w-8 font-bold text-muted-foreground text-xl">
              {index + 1}
            </div>

            {/* Artist Avatar */}
            <Avatar className="h-12 w-12">
              <AvatarImage src={show.artist.imageUrl} alt={show.artist.name} />
              <AvatarFallback>
                <Calendar className="h-6 w-6" />
              </AvatarFallback>
            </Avatar>

            {/* Show Info */}
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex items-center gap-2">
                <Link
                  href={`/shows/${show.slug}`}
                  className="truncate font-semibold hover:underline"
                >
                  {show.artist.name}
                </Link>
                <Badge variant={statusBadge.variant} className="text-xs">
                  {statusBadge.text}
                </Badge>
                <Badge variant={growthBadge.variant} className="text-xs">
                  {growthBadge.text}
                </Badge>
              </div>

              <div className="mb-1 flex items-center gap-4 text-muted-foreground text-sm">
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {show.venue.name}, {show.venue.city}
                  {show.venue.state && `, ${show.venue.state}`}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {formatDate(show.date)}
                </span>
              </div>

              <div className="flex items-center gap-4 text-muted-foreground text-sm">
                <span className="flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  {show.voteCount} votes
                </span>
                <span className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {show.attendeeCount} attending
                </span>
              </div>
            </div>

            {/* Stats */}
            <div className="text-right">
              <div className="flex items-center gap-1 font-medium text-sm">
                <TrendingUp className={`h-3 w-3 ${growthBadge.color}`} />
                {show.weeklyGrowth > 0 ? "+" : ""}
                {show.weeklyGrowth.toFixed(1)}%
              </div>
              <div className="text-muted-foreground text-xs">
                Score: {show.trendingScore.toFixed(0)}
              </div>
            </div>

            {/* External Link */}
            <Link href={`/shows/${show.slug}`}>
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
