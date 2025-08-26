"use client";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@repo/design-system/avatar";
import { Badge } from "@repo/design-system/badge";
import { Button } from "@repo/design-system/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system/card";
import { Skeleton } from "@repo/design-system/skeleton";
import {
  Calendar,
  ExternalLink,
  MapPin,
  Star,
  TrendingUp,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

interface HotVenue {
  id: string;
  name: string;
  slug: string;
  city: string;
  state: string | null;
  country: string;
  imageUrl: string | null;
  totalShows: number;
  upcomingShows: number;
  totalVotes: number;
  averageRating: number | null;
  recentActivity: number;
}

export function HotVenues() {
  const [venues, setVenues] = useState<HotVenue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchVenues();
  }, []);

  const fetchVenues = async () => {
    try {
      const response = await fetch(
        "/api/trending/insights?type=venues&limit=12",
      );
      if (!response.ok) {
        throw new Error("Failed to fetch hot venues");
      }

      const result = await response.json();
      setVenues(result.data.venues || []);
    } catch (err) {
      setError("Failed to load hot venues");
      console.error("Error fetching hot venues:", err);
    } finally {
      setLoading(false);
    }
  };

  const formatLocation = (venue: HotVenue) => {
    const parts = [venue.city];
    if (venue.state) parts.push(venue.state);
    if (venue.country !== "US") parts.push(venue.country);
    return parts.join(", ");
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-red-500" />
            Hot Venues
          </CardTitle>
          <CardDescription>
            Venues with the most buzz and upcoming shows
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-3 p-3 rounded-lg border"
              >
                <Skeleton className="h-12 w-12 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-3 w-16" />
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
            <MapPin className="h-5 w-5 text-red-500" />
            Hot Venues
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="py-8 text-center">
            <p className="mb-4 text-muted-foreground">{error}</p>
            <Button onClick={fetchVenues} variant="outline" size="sm">
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (venues.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-red-500" />
            Hot Venues
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="py-8 text-center">
            <MapPin className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground">No hot venues found</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-red-500" />
          Hot Venues
        </CardTitle>
        <CardDescription>
          Venues with the most buzz and upcoming shows
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {venues.map((venue, index) => (
            <div
              key={venue.id}
              className="flex items-center gap-3 p-3 rounded-lg border hover:shadow-md transition-shadow"
            >
              {/* Venue Image */}
              <Avatar className="h-12 w-12 rounded-lg">
                <AvatarImage src={venue.imageUrl || ""} alt={venue.name} />
                <AvatarFallback className="rounded-lg">
                  <MapPin className="h-6 w-6" />
                </AvatarFallback>
              </Avatar>

              {/* Venue Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-semibold truncate">{venue.name}</h4>
                  {index < 3 && (
                    <Badge variant="secondary" className="text-xs">
                      <TrendingUp className="h-3 w-3 mr-1" />#{index + 1}
                    </Badge>
                  )}
                </div>

                <p className="text-sm text-muted-foreground mb-1 truncate">
                  {formatLocation(venue)}
                </p>

                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {venue.upcomingShows} upcoming
                  </span>
                  {venue.averageRating && (
                    <span className="flex items-center gap-1">
                      <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                      {venue.averageRating.toFixed(1)}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {venue.totalVotes} votes
                  </span>
                </div>
              </div>

              {/* Action */}
              <Link href={`/venues/${venue.slug}`}>
                <Button variant="ghost" size="sm">
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          ))}
        </div>

        {/* View More */}
        <div className="mt-6 text-center">
          <Link href="/venues">
            <Button variant="outline" size="sm">
              View All Venues →
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
