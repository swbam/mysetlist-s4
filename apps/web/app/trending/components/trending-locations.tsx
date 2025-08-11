"use client";

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
  MapPin,
  Music,
  TrendingUp,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

interface TrendingLocation {
  city: string;
  state: string | null;
  country: string;
  showCount: number;
  upcomingShows: number;
  totalVotes: number;
  totalVenues: number;
  topArtist: string;
  rank: number;
}

export function TrendingLocations() {
  const [locations, setLocations] = useState<TrendingLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchLocations();
  }, []);

  const fetchLocations = async () => {
    try {
      const response = await fetch("/api/trending/insights?type=locations&limit=8");
      if (!response.ok) {
        throw new Error("Failed to fetch trending locations");
      }

      const result = await response.json();
      setLocations(result.data.locations || []);
    } catch (err) {
      setError("Failed to load trending locations");
      console.error("Error fetching trending locations:", err);
    } finally {
      setLoading(false);
    }
  };

  const formatLocation = (location: TrendingLocation) => {
    const parts = [location.city];
    if (location.state) parts.push(location.state);
    if (location.country !== "US") parts.push(location.country);
    return parts.join(", ");
  };

  const getLocationSearchUrl = (location: TrendingLocation) => {
    return `/search?location=${encodeURIComponent(formatLocation(location))}`;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-indigo-500" />
            Trending Cities
          </CardTitle>
          <CardDescription>
            Cities with the most concert activity
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-lg border">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div className="space-y-1">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
                <Skeleton className="h-4 w-16" />
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
            <MapPin className="h-5 w-5 text-indigo-500" />
            Trending Cities
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="py-8 text-center">
            <p className="mb-4 text-muted-foreground">{error}</p>
            <Button onClick={fetchLocations} variant="outline" size="sm">
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (locations.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-indigo-500" />
            Trending Cities
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="py-8 text-center">
            <MapPin className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground">No trending locations found</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-indigo-500" />
          Trending Cities
        </CardTitle>
        <CardDescription>
          Cities with the most concert activity
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {locations.map((location, index) => (
            <div
              key={`${location.city}-${location.state}-${location.country}`}
              className="flex items-center justify-between p-3 rounded-lg border hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-3">
                {/* Rank */}
                <div className="flex items-center justify-center h-8 w-8 rounded-full bg-indigo-100 dark:bg-indigo-900">
                  <span className="font-bold text-sm text-indigo-600 dark:text-indigo-400">
                    {index + 1}
                  </span>
                </div>

                {/* Location Info */}
                <div>
                  <h4 className="font-semibold">{formatLocation(location)}</h4>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {location.upcomingShows} upcoming
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {location.totalVotes} votes
                    </span>
                    {location.topArtist && (
                      <span className="flex items-center gap-1">
                        <Music className="h-3 w-3" />
                        {location.topArtist}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Badges & Actions */}
              <div className="flex items-center gap-2">
                {index < 3 && (
                  <Badge 
                    variant={index === 0 ? "default" : "secondary"} 
                    className="text-xs"
                  >
                    <TrendingUp className="h-3 w-3 mr-1" />
                    {index === 0 ? "Hottest" : index === 1 ? "Rising" : "Popular"}
                  </Badge>
                )}
                
                <Link href={getLocationSearchUrl(location)}>
                  <Button variant="outline" size="sm">
                    Explore
                  </Button>
                </Link>
              </div>
            </div>
          ))}
        </div>

        {/* View More */}
        <div className="mt-6 text-center">
          <Link href="/search">
            <Button variant="outline" size="sm">
              Search All Locations →
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}