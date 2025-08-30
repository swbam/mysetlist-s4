"use client";

import { Badge } from "@repo/design-system";
import { Card, CardContent } from "@repo/design-system";
import { motion } from "framer-motion";
import { Building2, Calendar, MapPin, Users } from "lucide-react";
// Image not needed for this component
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

export function FeaturedVenuesSlider({ venues }: FeaturedVenuesSliderProps) {
  if (!venues || venues.length === 0) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-bold text-2xl tracking-tight">Featured Venues</h2>
          <p className="text-muted-foreground">
            Discover the best venues hosting incredible shows
          </p>
        </div>
        <Link href="/venues" className="text-primary hover:underline">
          View all venues
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {venues.map((venue) => (
          <motion.div
            key={venue.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="overflow-hidden transition-all hover:shadow-lg">
              <Link href={`/venues/${venue.slug}`}>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <h3 className="font-semibold text-lg">{venue.name}</h3>
                        <div className="flex items-center space-x-1 text-muted-foreground text-sm">
                          <MapPin className="h-4 w-4" />
                          <span>
                            {venue.city}
                            {venue.state && `, ${venue.state}`}
                          </span>
                        </div>
                      </div>
                      {venue.rank <= 3 && (
                        <Badge variant="secondary">#{venue.rank}</Badge>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4 text-blue-500" />
                        <span>{venue.upcomingShows} upcoming</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Users className="h-4 w-4 text-green-500" />
                        <span>{venue.capacity?.toLocaleString() || "N/A"}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Building2 className="h-4 w-4 text-purple-500" />
                        <span>{venue.totalShows} total</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs">
                          {venue.weeklyGrowth > 0 ? "📈" : "📉"} {Math.abs(venue.weeklyGrowth)}%
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Link>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}