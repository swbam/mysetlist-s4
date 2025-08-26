"use client";

import { Badge } from "@repo/design-system/badge";
import { Card } from "@repo/design-system/card";
import {
  Calendar,
  Clock,
  Globe,
  MapPin,
  Phone,
  Star,
  Users,
} from "lucide-react";
import Image from "next/image";

interface VenueHeaderProps {
  venue: {
    id: string;
    name: string;
    address: string | null;
    city: string;
    state: string | null;
    country: string;
    imageUrl: string | null;
    capacity: number | null;
    venueType: string | null;
    description: string | null;
    phoneNumber?: string | null;
    website?: string | null;
    timezone?: string;
  };
  upcomingShowCount: number;
}

export function VenueHeader({ venue, upcomingShowCount }: VenueHeaderProps) {
  const formatCapacity = (capacity: number) => {
    if (capacity >= 1000) {
      return `${(capacity / 1000).toFixed(1)}k`;
    }
    return capacity.toString();
  };

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

  return (
    <div className="flex flex-col gap-6">
      {/* Venue Image */}
      {venue.imageUrl && (
        <div className="relative h-[300px] w-full overflow-hidden rounded-xl md:h-[400px]">
          <Image
            src={venue.imageUrl}
            alt={venue.name}
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <div className="absolute right-6 bottom-6 left-6">
            <h1 className="mb-2 font-bold text-4xl text-white md:text-6xl">
              {venue.name}
            </h1>
            <div className="flex items-center gap-2 text-white/90">
              <MapPin className="h-5 w-5" />
              <span>
                {venue.city}, {venue.state || venue.country}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Venue Info without image */}
      {!venue.imageUrl && (
        <div>
          <h1 className="mb-2 font-bold text-4xl md:text-6xl">{venue.name}</h1>
          <div className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="h-5 w-5" />
            <span>
              {venue.city}, {venue.state || venue.country}
            </span>
          </div>
        </div>
      )}

      {/* Venue Stats */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-muted-foreground text-sm">Capacity</p>
              <p className="font-semibold text-lg">
                {venue.capacity ? formatCapacity(venue.capacity) : "N/A"}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2">
              <Calendar className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-muted-foreground text-sm">Upcoming</p>
              <p className="font-semibold text-lg">{upcomingShowCount} shows</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Venue Type and Description */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-4">
          {venue.venueType && (
            <Badge variant="secondary" className="text-sm">
              {venueTypeLabels[venue.venueType] || venue.venueType}
            </Badge>
          )}

          {/* Quick Contact Info */}
          <div className="flex flex-wrap items-center gap-4 text-muted-foreground text-sm">
            {venue.phoneNumber && (
              <a
                href={`tel:${venue.phoneNumber}`}
                className="flex items-center gap-1 transition-colors hover:text-primary"
              >
                <Phone className="h-3 w-3" />
                {venue.phoneNumber}
              </a>
            )}

            {venue.website && (
              <a
                href={venue.website}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 transition-colors hover:text-primary"
              >
                <Globe className="h-3 w-3" />
                Website
              </a>
            )}

            {venue.timezone && (
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {venue.timezone.split("/").pop()?.replace("_", " ")}
              </div>
            )}
          </div>
        </div>

        {venue.description && (
          <p className="text-muted-foreground leading-relaxed">
            {venue.description}
          </p>
        )}
      </div>
    </div>
  );
}
