"use client";

import { Badge, Card, CardContent, Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext } from "@repo/design-system";
import { motion } from "framer-motion";
import { Building2, Calendar, MapPin, Users } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import React from "react";

interface FeaturedVenue {
  id: string;
  name: string;
  slug: string;
  imageUrl?: string;
  city: string | null;
  state: string | null;
  country: string;
  capacity: number | null;
  upcomingShows: number;
  totalShows: number;
  trendingScore: number;
  weeklyGrowth: number;
  rank: number;
}

interface FeaturedVenuesSliderProps {
  venues: FeaturedVenue[];
}

// Memoize the format function to prevent recreating on every render
const formatCapacity = (num: number) => {
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return num.toString();
};

function FeaturedVenuesSlider({ venues }: FeaturedVenuesSliderProps) {
  if (!venues || venues.length === 0) {
    return null;
  }

  return (
    <div className="relative w-full">
      <div className="mb-4">
        <h2 className="text-2xl font-bold">Featured Venues</h2>
        <p className="text-muted-foreground">Discover the best venues hosting incredible shows</p>
      </div>
      <Carousel className="w-full">
        <CarouselContent className="-ml-1">
          {venues.map((venue, index) => (
            <CarouselItem key={venue.id} className="pl-1 basis-1/2 md:basis-1/3 lg:basis-1/4">
          <Link href={`/venues/${venue.slug}`} className="group block">
            <Card className="overflow-hidden border-border/50 bg-card/50 backdrop-blur-sm transition-all duration-300 hover:border-primary/50 hover:bg-card/80">
              <CardContent className="relative p-0">
                {/* Venue image with gradient overlay */}
                <div className="relative aspect-[4/3] overflow-hidden rounded-t-lg bg-gradient-to-br from-purple-600/20 to-primary/20">
                  {venue.imageUrl ? (
                    <Image
                      src={venue.imageUrl}
                      alt={venue.name}
                      fill
                      sizes="(max-width: 640px) 80vw, (max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                      className="object-cover transition-transform duration-500 group-hover:scale-110"
                      priority={index < 4}
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
                      <Building2 className="h-12 w-12 text-muted-foreground/50" />
                    </div>
                  )}
                  {venue.imageUrl && (
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                  )}

                  {/* Top venue badge */}
                  {venue.rank <= 3 && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: index * 0.1, type: "spring" }}
                      className="absolute top-2 right-2"
                    >
                      <Badge className="border-0 bg-gradient-to-r from-purple-500 to-primary px-2 py-0.5 text-xs shadow-lg">
                        #{venue.rank} Venue
                      </Badge>
                    </motion.div>
                  )}

                  {/* Stats overlay on hover */}
                  <div className="absolute inset-0 flex items-end p-3 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                    <div className="flex w-full items-center justify-between">
                      {venue.capacity && (
                        <div className="flex items-center gap-1.5 text-white/90">
                          <Users className="h-3.5 w-3.5" />
                          <span className="font-medium text-xs">
                            {formatCapacity(venue.capacity)} capacity
                          </span>
                        </div>
                      )}
                      {venue.upcomingShows > 0 && (
                        <div className="flex items-center gap-1.5 text-white/90">
                          <Calendar className="h-3.5 w-3.5" />
                          <span className="font-medium text-xs">
                            {venue.upcomingShows} shows
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Venue info */}
                <div className="p-3 sm:p-4">
                  <h3 className="line-clamp-1 font-semibold text-sm transition-colors group-hover:text-primary sm:text-base">
                    {venue.name}
                  </h3>
                  <div className="mt-1 flex items-center gap-1 text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    <p className="text-xs sm:text-sm">
                      {venue.city}
                      {venue.state && `, ${venue.state}`}, {venue.country}
                    </p>
                  </div>

                  {/* Show weekly growth */}
                  {venue.weeklyGrowth > 0 && (
                    <div className="mt-2 flex items-center gap-1">
                      <Badge
                        variant="secondary"
                        className="px-1.5 py-0 text-xs"
                      >
                        +{venue.weeklyGrowth}% this week
                      </Badge>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </Link>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious />
        <CarouselNext />
      </Carousel>
    </div>
  );
}

export default FeaturedVenuesSlider;
