'use client';

import { MapPin, Phone, Globe, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@repo/design-system/components/ui/card';
import Link from 'next/link';
import { Button } from '@repo/design-system/components/ui/button';

type VenueDetailsProps = {
  venue: {
    id: string;
    name: string;
    slug: string;
    address?: string;
    city: string;
    state?: string;
    country: string;
    postal_code?: string;
    latitude?: number;
    longitude?: number;
    capacity?: number;
    venue_type?: string;
    phone_number?: string;
    website?: string;
    image_url?: string;
  };
};

export function VenueDetails({ venue }: VenueDetailsProps) {
  const getFullAddress = () => {
    const parts = [];
    if (venue.address) parts.push(venue.address);
    parts.push(venue.city);
    if (venue.state) parts.push(venue.state);
    if (venue.postal_code) parts.push(venue.postal_code);
    parts.push(venue.country);
    return parts.join(', ');
  };
  
  const getMapUrl = () => {
    if (venue.latitude && venue.longitude) {
      return `https://www.google.com/maps/search/?api=1&query=${venue.latitude},${venue.longitude}`;
    }
    const query = encodeURIComponent(`${venue.name} ${getFullAddress()}`);
    return `https://www.google.com/maps/search/?api=1&query=${query}`;
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <Link 
            href={`/venues/${venue.slug}`}
            className="hover:underline"
          >
            {venue.name}
          </Link>
          <MapPin className="h-5 w-5 text-muted-foreground" />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Map Preview */}
        {venue.latitude && venue.longitude && (
          <div className="relative h-48 rounded-lg overflow-hidden bg-muted">
            <iframe
              width="100%"
              height="100%"
              frameBorder="0"
              style={{ border: 0 }}
              src={`https://www.google.com/maps/embed/v1/place?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY}&q=${venue.latitude},${venue.longitude}&zoom=15`}
              allowFullScreen
            />
          </div>
        )}
        
        <div className="space-y-3">
          {/* Address */}
          <div className="text-sm">
            <p className="font-medium mb-1">Address</p>
            <p className="text-muted-foreground">
              {venue.address && <span className="block">{venue.address}</span>}
              <span className="block">
                {venue.city}
                {venue.state && `, ${venue.state}`}
                {venue.postal_code && ` ${venue.postal_code}`}
              </span>
              <span className="block">{venue.country}</span>
            </p>
          </div>
          
          {/* Venue Type & Capacity */}
          <div className="flex gap-4 text-sm">
            {venue.venue_type && (
              <div>
                <p className="font-medium mb-1">Type</p>
                <p className="text-muted-foreground capitalize">
                  {venue.venue_type.replace('_', ' ')}
                </p>
              </div>
            )}
            
            {venue.capacity && (
              <div>
                <p className="font-medium mb-1">Capacity</p>
                <p className="text-muted-foreground flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {venue.capacity.toLocaleString()}
                </p>
              </div>
            )}
          </div>
          
          {/* Contact */}
          {(venue.phone_number || venue.website) && (
            <div className="space-y-2 text-sm">
              {venue.phone_number && (
                <a 
                  href={`tel:${venue.phone_number}`}
                  className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Phone className="h-3 w-3" />
                  {venue.phone_number}
                </a>
              )}
              
              {venue.website && (
                <a 
                  href={venue.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Globe className="h-3 w-3" />
                  Website
                </a>
              )}
            </div>
          )}
        </div>
        
        <Button 
          asChild 
          variant="outline" 
          className="w-full gap-2"
        >
          <a 
            href={getMapUrl()}
            target="_blank"
            rel="noopener noreferrer"
          >
            <MapPin className="h-4 w-4" />
            Get Directions
          </a>
        </Button>
      </CardContent>
    </Card>
  );
}