'use client';

import { Badge } from '@repo/design-system/components/ui/badge';
import { Card, CardContent } from '@repo/design-system/components/ui/card';
import { motion } from 'framer-motion';
import { Building2, Calendar, MapPin, TrendingUp, Users } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import React from 'react';
import {
  ContentSlider,
  ContentSliderItem,
} from '~/components/ui/content-slider';
import type { TrendingVenue } from '~/types/api';

interface PopularVenuesSliderProps {
  venues: TrendingVenue[];
}

// Helper function to format capacity numbers
const formatCapacity = (num: number | null) => {
  if (!num) return 'N/A';
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return num.toString();
};

// Helper function to get venue image placeholder
const getVenueImagePlaceholder = (venueName: string) => {
  // Create a simple color based on venue name hash
  const hash = venueName.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
  const colors = [
    'from-blue-500/20 to-blue-700/20',
    'from-purple-500/20 to-purple-700/20', 
    'from-green-500/20 to-green-700/20',
    'from-red-500/20 to-red-700/20',
    'from-yellow-500/20 to-yellow-700/20',
    'from-pink-500/20 to-pink-700/20',
    'from-indigo-500/20 to-indigo-700/20',
  ];
  
  return colors[hash % colors.length];
};

function PopularVenuesSlider({ venues }: PopularVenuesSliderProps) {
  if (!venues || venues.length === 0) {
    return null;
  }

  return (
    <ContentSlider
      title="Popular Venues"
      subtitle="Discover the hottest concert venues around the world"
      viewAllLink="/venues"
      viewAllText="Explore All Venues"
      autoPlay={true}
      autoPlayInterval={6000}
      itemsPerView={{
        mobile: 1.2,
        tablet: 2.5,
        desktop: 3.5,
        wide: 5,
      }}
      showDots={true}
      className="bg-gradient-to-b from-background via-background/98 to-background"
    >
      {venues.map((venue, index) => (
        <ContentSliderItem key={venue.id}>
          <Link href={`/venues/${venue.slug}`} className="block h-full">
            <Card className="group h-full overflow-hidden border-border/50 bg-card/50 backdrop-blur-sm transition-all duration-300 hover:border-primary/50 hover:bg-card/80 hover:shadow-xl">
              <CardContent className="flex h-full flex-col p-0">
                {/* Venue image section with placeholder */}
                <div className={`relative aspect-[16/10] overflow-hidden bg-gradient-to-br ${getVenueImagePlaceholder(venue.name)}`}>
                  {/* For now, use placeholder - in real app would fetch venue images */}
                  <div className="flex h-full w-full items-center justify-center">
                    <div className="text-center">
                      <Building2 className="mx-auto mb-2 h-12 w-12 text-white/40" />
                      <div className="font-semibold text-sm text-white/60">
                        {venue.name.split(' ').map(word => word[0]).join('').slice(0, 3).toUpperCase()}
                      </div>
                    </div>
                  </div>
                  
                  {/* Gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                  
                  {/* Trending badge */}
                  {venue.rank <= 5 && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.1 }}
                      className="absolute top-3 left-3"
                    >
                      <Badge className="border-0 bg-primary/90 shadow-lg backdrop-blur-sm">
                        <TrendingUp className="mr-1 h-3 w-3" />
                        Top #{venue.rank}
                      </Badge>
                    </motion.div>
                  )}

                  {/* Capacity indicator */}
                  {venue.capacity && (
                    <div className="absolute top-3 right-3 flex items-center gap-1.5 rounded-lg bg-black/70 px-3 py-1.5 backdrop-blur-sm">
                      <Users className="h-3.5 w-3.5 text-white/80" />
                      <span className="font-medium text-sm text-white">
                        {formatCapacity(venue.capacity)}
                      </span>
                    </div>
                  )}

                  {/* Growth indicator */}
                  {venue.weeklyGrowth > 0 && (
                    <div className="absolute bottom-3 right-3 flex items-center gap-1 rounded-full bg-green-500/20 px-2.5 py-1 backdrop-blur-sm">
                      <TrendingUp className="h-3 w-3 text-green-400" />
                      <span className="font-medium text-green-400 text-xs">
                        +{venue.weeklyGrowth}%
                      </span>
                    </div>
                  )}
                </div>

                {/* Content section */}
                <div className="flex-1 space-y-2 p-3 sm:space-y-3 sm:p-4">
                  <div>
                    <h3 className="line-clamp-2 font-semibold text-base transition-colors group-hover:text-primary sm:text-lg">
                      {venue.name}
                    </h3>
                    
                    {/* Location info */}
                    {(venue.city || venue.state || venue.country) && (
                      <div className="mt-1 flex items-center gap-1.5 text-muted-foreground text-sm">
                        <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                        <span className="line-clamp-1">
                          {[venue.city, venue.state, venue.country].filter(Boolean).join(', ')}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Stats section */}
                  <div className="mt-auto flex items-center justify-between pt-2">
                    <div className="flex items-center gap-3 text-xs sm:text-sm">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3 text-muted-foreground" />
                        <span className="font-medium">{venue.upcomingShows}</span>
                        <span className="text-muted-foreground hidden sm:inline">upcoming</span>
                        <span className="text-muted-foreground sm:hidden">shows</span>
                      </div>
                    </div>

                    {/* Trending score visualization */}
                    <div className="flex items-center gap-1 text-xs">
                      <div className="h-1.5 w-8 rounded-full bg-muted overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-primary to-primary/70 transition-all duration-300"
                          style={{ width: `${Math.min((venue.trendingScore / 100) * 100, 100)}%` }}
                        />
                      </div>
                      <span className="text-muted-foreground text-xs">
                        {Math.round(venue.trendingScore)}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        </ContentSliderItem>
      ))}
    </ContentSlider>
  );
}

export default PopularVenuesSlider;