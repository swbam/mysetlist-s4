"use client";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@repo/design-system/components/ui/avatar";
import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import { Skeleton } from "@repo/design-system/components/ui/skeleton";
import {
  Calendar,
  ExternalLink,
  Music,
  Sparkles,
  TrendingUp,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

interface RisingArtist {
  id: string;
  name: string;
  slug: string;
  imageUrl: string | null;
  followerGrowth: number;
  voteGrowth: number;
  showsAdded: number;
  daysActive: number;
  popularity: number;
  rank: number;
}

export function RisingArtists() {
  const [artists, setArtists] = useState<RisingArtist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchArtists();
  }, []);

  const fetchArtists = async () => {
    try {
      const response = await fetch("/api/trending/insights?type=rising&limit=10");
      if (!response.ok) {
        throw new Error("Failed to fetch rising artists");
      }

      const result = await response.json();
      setArtists(result.data.rising || []);
    } catch (err) {
      setError("Failed to load rising artists");
      console.error("Error fetching rising artists:", err);
    } finally {
      setLoading(false);
    }
  };

  const getRisingBadge = (artist: RisingArtist) => {
    const totalGrowth = artist.followerGrowth + artist.voteGrowth;
    
    if (totalGrowth > 50 || artist.daysActive < 7) {
      return {
        label: "Breakout",
        variant: "default" as const,
        color: "text-yellow-500",
      };
    }
    if (totalGrowth > 25 || artist.daysActive < 14) {
      return {
        label: "Hot",
        variant: "secondary" as const,
        color: "text-red-500",
      };
    }
    return {
      label: "Rising",
      variant: "outline" as const,
      color: "text-green-500",
    };
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-yellow-500" />
            Rising Artists
          </CardTitle>
          <CardDescription>
            New and emerging artists gaining momentum
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 p-3 rounded-lg border">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-48" />
                </div>
                <div className="text-right space-y-1">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-3 w-12" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-yellow-500" />
            Rising Artists
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="py-8 text-center">
            <p className="mb-4 text-muted-foreground">{error}</p>
            <Button onClick={fetchArtists} variant="outline" size="sm">
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (artists.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-yellow-500" />
            Rising Artists
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="py-8 text-center">
            <Sparkles className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground">No rising artists found</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-yellow-500" />
          Rising Artists
        </CardTitle>
        <CardDescription>
          New and emerging artists gaining momentum
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {artists.map((artist, index) => {
            const badge = getRisingBadge(artist);
            return (
              <div
                key={artist.id}
                className="flex items-center gap-4 p-3 rounded-lg border hover:shadow-md transition-shadow"
              >
                {/* Rank */}
                <div className="w-8 text-center">
                  <span className="font-bold text-lg text-muted-foreground">
                    {index + 1}
                  </span>
                </div>

                {/* Artist Avatar */}
                <Avatar className="h-12 w-12">
                  <AvatarImage src={artist.imageUrl || ""} alt={artist.name} />
                  <AvatarFallback>
                    <Music className="h-6 w-6" />
                  </AvatarFallback>
                </Avatar>

                {/* Artist Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Link
                      href={`/artists/${artist.slug}`}
                      className="font-semibold truncate hover:underline"
                    >
                      {artist.name}
                    </Link>
                    <Badge variant={badge.variant} className="text-xs">
                      <Sparkles className="h-3 w-3 mr-1" />
                      {badge.label}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      +{artist.followerGrowth.toFixed(0)}% followers
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {artist.daysActive} days active
                    </span>
                    {artist.showsAdded > 0 && (
                      <span className="flex items-center gap-1">
                        <Music className="h-3 w-3" />
                        {artist.showsAdded} shows
                      </span>
                    )}
                  </div>
                </div>

                {/* Growth Stats */}
                <div className="text-right">
                  <div className="flex items-center gap-1 font-semibold text-green-600">
                    <TrendingUp className={`h-3 w-3 ${badge.color}`} />
                    +{(artist.followerGrowth + artist.voteGrowth).toFixed(0)}%
                  </div>
                  <p className="text-xs text-muted-foreground">
                    growth
                  </p>
                </div>

                {/* Action */}
                <Link href={`/artists/${artist.slug}`}>
                  <Button variant="ghost" size="sm">
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            );
          })}
        </div>

        {/* View More */}
        <div className="mt-6 text-center">
          <Link href="/artists?filter=new">
            <Button variant="outline" size="sm">
              Discover More Rising Artists →
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}