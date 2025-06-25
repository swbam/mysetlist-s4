'use client';

import Image from 'next/image';
import { MapPin, Calendar, Star, Users, Phone, Globe, Mail, Clock } from 'lucide-react';
import { Badge } from '@repo/design-system/components/ui/badge';
import { Card } from '@repo/design-system/components/ui/card';

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
  avgRating: number | null;
  reviewCount: number;
  upcomingShowCount: number;
}

export function VenueHeader({ venue, avgRating, reviewCount, upcomingShowCount }: VenueHeaderProps) {
  const formatCapacity = (capacity: number) => {
    if (capacity >= 1000) {
      return `${(capacity / 1000).toFixed(1)}k`;
    }
    return capacity.toString();
  };

  const venueTypeLabels: Record<string, string> = {
    arena: 'Arena',
    stadium: 'Stadium',
    theater: 'Theater',
    club: 'Club',
    'outdoor-amphitheater': 'Outdoor Amphitheater',
    'indoor-amphitheater': 'Indoor Amphitheater',
    ballroom: 'Ballroom',
    festival: 'Festival Grounds',
    other: 'Other',
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Venue Image */}
      {venue.imageUrl && (
        <div className="relative w-full h-[300px] md:h-[400px] rounded-xl overflow-hidden">
          <Image
            src={venue.imageUrl}
            alt={venue.name}
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <div className="absolute bottom-6 left-6 right-6">
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-2">
              {venue.name}
            </h1>
            <div className="flex items-center gap-2 text-white/90">
              <MapPin className="w-5 h-5" />
              <span>{venue.city}, {venue.state || venue.country}</span>
            </div>
          </div>
        </div>
      )}

      {/* Venue Info without image */}
      {!venue.imageUrl && (
        <div>
          <h1 className="text-4xl md:text-6xl font-bold mb-2">
            {venue.name}
          </h1>
          <div className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="w-5 h-5" />
            <span>{venue.city}, {venue.state || venue.country}</span>
          </div>
        </div>
      )}

      {/* Venue Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Capacity</p>
              <p className="text-lg font-semibold">
                {venue.capacity ? formatCapacity(venue.capacity) : 'N/A'}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Calendar className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Upcoming</p>
              <p className="text-lg font-semibold">{upcomingShowCount} shows</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Star className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Rating</p>
              <p className="text-lg font-semibold">
                {avgRating ? avgRating.toFixed(1) : 'N/A'}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Star className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Reviews</p>
              <p className="text-lg font-semibold">{reviewCount}</p>
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
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            {venue.phoneNumber && (
              <a 
                href={`tel:${venue.phoneNumber}`}
                className="flex items-center gap-1 hover:text-primary transition-colors"
              >
                <Phone className="w-3 h-3" />
                {venue.phoneNumber}
              </a>
            )}
            
            {venue.website && (
              <a 
                href={venue.website}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 hover:text-primary transition-colors"
              >
                <Globe className="w-3 h-3" />
                Website
              </a>
            )}
            
            {venue.timezone && (
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {venue.timezone.split('/').pop()?.replace('_', ' ')}
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