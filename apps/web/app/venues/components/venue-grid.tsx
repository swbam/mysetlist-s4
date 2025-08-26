"use client";

import { Badge } from "@repo/design-system/badge";
import { Button } from "@repo/design-system/button";
import {
  Card,
  CardContent,
  CardHeader,
} from "@repo/design-system/card";
import { Skeleton } from "@repo/design-system/skeleton";
import { Building, Car, Heart, MapPin, Star, Train, Users } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

interface Venue {
  id: string;
  name: string;
  slug: string;
  venueType: string | null;
  city: string;
  state: string | null;
  country: string | null;
  capacity: number | null;
  rating?: number;
  reviewCount?: number;
  upcomingShows: number;
  website?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  amenities?: string[] | null;
}

export const VenueGrid = () => {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [favoriteVenues, setFavoriteVenues] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchVenues();
  }, []);

  const fetchVenues = async () => {
    try {
      const response = await fetch("/api/venues?limit=20");
      if (!response.ok) {
        throw new Error("Failed to fetch venues");
      }

      const data = await response.json();
      setVenues(data.venues || []);
    } catch (err) {
      console.error("Error fetching venues:", err);
      setError("Failed to load venues. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  const toggleFavorite = (venueId: string) => {
    setFavoriteVenues((prev) =>
      prev.includes(venueId)
        ? prev.filter((id) => id !== venueId)
        : [...prev, venueId],
    );
  };

  const formatCapacity = (capacity: number) => {
    if (capacity >= 1000) {
      return `${(capacity / 1000).toFixed(1)}K`;
    }
    return capacity.toString();
  };

  // Loading skeleton
  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="overflow-hidden">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <Skeleton className="h-6 w-48 mb-2" />
                  <Skeleton className="h-4 w-32" />
                </div>
                <Skeleton className="h-10 w-10" />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-10 w-full" />
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
        <Button onClick={fetchVenues} variant="outline">
          Try Again
        </Button>
      </div>
    );
  }

  // Empty state
  if (venues.length === 0) {
    return (
      <div className="text-center py-12">
        <Building className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground">No venues found.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {venues.map((venue) => (
        <Card
          key={venue.id}
          className="overflow-hidden transition-shadow hover:shadow-lg"
        >
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <Link href={`/venues/${venue.slug || venue.id}`}>
                  <h3 className="font-semibold text-xl transition-colors hover:text-primary">
                    {venue.name}
                  </h3>
                </Link>
                <div className="mt-1 flex items-center gap-2">
                  {venue.venueType && (
                    <Badge variant="outline">{venue.venueType}</Badge>
                  )}
                  {venue.capacity && (
                    <span className="text-muted-foreground text-sm">
                      Capacity: {formatCapacity(venue.capacity)}
                    </span>
                  )}
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => toggleFavorite(venue.id)}
              >
                <Heart
                  className={`h-4 w-4 ${favoriteVenues.includes(venue.id) ? "fill-current text-red-500" : ""}`}
                />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span>
                  {venue.city}
                  {venue.state && `, ${venue.state}`}
                  {venue.country &&
                    venue.country !== "US" &&
                    `, ${venue.country}`}
                </span>
              </div>
              {venue.rating && (
                <div className="flex items-center gap-1">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  <span className="font-medium">{venue.rating.toFixed(1)}</span>
                  {venue.reviewCount && (
                    <span className="text-muted-foreground text-sm">
                      ({venue.reviewCount})
                    </span>
                  )}
                </div>
              )}
            </div>

            <div className="flex gap-4 text-sm">
              {venue.amenities?.includes("parking") && (
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Car className="h-4 w-4" />
                  <span>Parking</span>
                </div>
              )}
              {venue.amenities?.includes("public_transit") && (
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Train className="h-4 w-4" />
                  <span>Transit</span>
                </div>
              )}
              <div className="flex items-center gap-1 text-muted-foreground">
                <Users className="h-4 w-4" />
                <span>{venue.upcomingShows || 0} upcoming shows</span>
              </div>
            </div>

            <Link href={`/venues/${venue.slug || venue.id}`}>
              <Button variant="outline" className="w-full">
                View Details & Shows
              </Button>
            </Link>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
