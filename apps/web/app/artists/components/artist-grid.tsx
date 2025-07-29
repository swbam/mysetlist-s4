"use client";

import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import { Card, CardContent } from "@repo/design-system/components/ui/card";
import { Skeleton } from "@repo/design-system/components/ui/skeleton";
import { Calendar, Heart, Music, TrendingUp } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

interface Artist {
  id: string;
  name: string;
  slug: string;
  genres: string[] | null;
  imageUrl: string | null;
  followers: number | null;
  upcomingShows: number;
  trendingScore: number;
}

export const ArtistGrid = () => {
  const [artists, setArtists] = useState<Artist[]>([]);
  const [followedArtists, setFollowedArtists] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchArtists();
  }, []);

  const fetchArtists = async () => {
    try {
      const response = await fetch("/api/artists?limit=20");
      if (!response.ok) {
        throw new Error("Failed to fetch artists");
      }

      const data = await response.json();

      // Map the API response to our component's interface
      const mappedArtists: Artist[] = data.artists.map((artist: any) => ({
        id: artist.id,
        name: artist.name,
        slug: artist.slug,
        genres: artist.genres,
        imageUrl: artist.imageUrl || artist.image_url,
        followers: artist.followers,
        upcomingShows: artist.upcomingShows || artist.upcoming_shows || 0,
        trendingScore: artist.trendingScore || artist.trending_score || 0,
      }));

      setArtists(mappedArtists);
    } catch (err) {
      console.error("Error fetching artists:", err);
      setError("Failed to load artists. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  const toggleFollow = (artistId: string) => {
    setFollowedArtists((prev) =>
      prev.includes(artistId)
        ? prev.filter((id) => id !== artistId)
        : [...prev, artistId],
    );
  };

  const formatFollowers = (count: number) => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    }
    if (count >= 1000) {
      return `${(count / 1000).toFixed(0)}K`;
    }
    return count.toString();
  };

  // Loading skeleton
  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 12 }).map((_, i) => (
          <Card key={i} className="overflow-hidden">
            <Skeleton className="aspect-square" />
            <CardContent className="p-4">
              <Skeleton className="h-6 w-3/4 mb-2" />
              <Skeleton className="h-4 w-1/2 mb-3" />
              <Skeleton className="h-4 w-full mb-4" />
              <Skeleton className="h-9 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground mb-4">{error}</p>
        <Button onClick={fetchArtists} variant="outline">
          Try Again
        </Button>
      </div>
    );
  }

  // Empty state
  if (artists.length === 0) {
    return (
      <div className="text-center py-12">
        <Music className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground">No artists found.</p>
      </div>
    );
  }

  // Main content
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
      {artists.map((artist) => (
        <Card
          key={artist.id}
          className="overflow-hidden transition-shadow hover:shadow-lg"
        >
          <Link href={`/artists/${artist.slug || artist.id}`}>
            <div className="relative aspect-square cursor-pointer bg-gradient-to-br from-primary/20 to-primary/5">
              {artist.imageUrl ? (
                <img
                  src={artist.imageUrl}
                  alt={artist.name}
                  className="absolute inset-0 w-full h-full object-cover"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="font-bold text-6xl text-primary/20">
                    {artist.name
                      .split(" ")
                      .map((word) => word[0])
                      .join("")}
                  </div>
                </div>
              )}
              {artist.trendingScore > 85 && (
                <div className="absolute top-2 right-2">
                  <Badge variant="secondary" className="gap-1">
                    <TrendingUp className="h-3 w-3" />
                    Hot
                  </Badge>
                </div>
              )}
            </div>
          </Link>
          <CardContent className="p-4">
            <Link href={`/artists/${artist.slug || artist.id}`}>
              <h3 className="mb-1 font-semibold text-lg transition-colors hover:text-primary">
                {artist.name}
              </h3>
            </Link>
            {artist.genres && artist.genres.length > 0 && (
              <Badge variant="outline" className="mb-3">
                {artist.genres[0]}
              </Badge>
            )}

            <div className="mb-4 flex items-center justify-between text-muted-foreground text-sm">
              <span>{formatFollowers(artist.followers || 0)} followers</span>
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                <span>{artist.upcomingShows} shows</span>
              </div>
            </div>

            <Button
              variant={
                followedArtists.includes(artist.id) ? "default" : "outline"
              }
              size="sm"
              className="w-full gap-2"
              onClick={() => toggleFollow(artist.id)}
            >
              <Heart
                className={`h-4 w-4 ${followedArtists.includes(artist.id) ? "fill-current" : ""}`}
              />
              {followedArtists.includes(artist.id) ? "Following" : "Follow"}
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
