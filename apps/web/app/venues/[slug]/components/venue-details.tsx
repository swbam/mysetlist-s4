'use client';

import { Card } from '@repo/design-system/components/ui/card';
import { Badge } from '@repo/design-system/components/ui/badge';
import { 
  MapPin, 
  Phone, 
  Globe, 
  Clock, 
  Wifi, 
  Car, 
  Utensils, 
  Wine,
  Accessibility,
  Music,
  Shield,
  CreditCard
} from 'lucide-react';
import Link from 'next/link';

interface VenueDetailsProps {
  venue: {
    id: string;
    name: string;
    address: string | null;
    city: string;
    state: string | null;
    country: string;
    postalCode: string | null;
    phoneNumber: string | null;
    website: string | null;
    timezone: string;
    amenities: string | null;
  };
}

export function VenueDetails({ venue }: VenueDetailsProps) {
  // Parse amenities if they exist
  const amenitiesList = venue.amenities ? JSON.parse(venue.amenities) : [];

  const amenityIcons: Record<string, any> = {
    wifi: Wifi,
    parking: Car,
    food: Utensils,
    bar: Wine,
    accessible: Accessibility,
    'live-music': Music,
    security: Shield,
    'cashless': CreditCard,
  };

  const amenityLabels: Record<string, string> = {
    wifi: 'Free WiFi',
    parking: 'Parking',
    food: 'Food Available',
    bar: 'Full Bar',
    accessible: 'Accessible',
    'live-music': 'Live Music',
    security: 'Security',
    'cashless': 'Cashless Venue',
  };

  const formatTimezone = (tz: string) => {
    // Convert timezone to readable format
    const offset = new Date().toLocaleString('en-US', { timeZone: tz, timeZoneName: 'short' }).split(' ').pop();
    return offset || tz;
  };

  return (
    <Card className="p-6">
      <h2 className="text-lg font-semibold mb-4">Venue Information</h2>
      
      <div className="space-y-4">
        {/* Address */}
        {venue.address && (
          <div className="flex items-start gap-3">
            <MapPin className="w-5 h-5 text-muted-foreground mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium">Address</p>
              <p className="text-sm text-muted-foreground">
                {venue.address}<br />
                {venue.city}, {venue.state && `${venue.state}, `}{venue.country}
                {venue.postalCode && ` ${venue.postalCode}`}
              </p>
            </div>
          </div>
        )}

        {/* Phone */}
        {venue.phoneNumber && (
          <div className="flex items-start gap-3">
            <Phone className="w-5 h-5 text-muted-foreground mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium">Phone</p>
              <a 
                href={`tel:${venue.phoneNumber}`}
                className="text-sm text-primary hover:underline"
              >
                {venue.phoneNumber}
              </a>
            </div>
          </div>
        )}

        {/* Website */}
        {venue.website && (
          <div className="flex items-start gap-3">
            <Globe className="w-5 h-5 text-muted-foreground mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium">Website</p>
              <Link
                href={venue.website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline break-all"
              >
                {venue.website.replace(/^https?:\/\//, '')}
              </Link>
            </div>
          </div>
        )}

        {/* Timezone */}
        <div className="flex items-start gap-3">
          <Clock className="w-5 h-5 text-muted-foreground mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium">Time Zone</p>
            <p className="text-sm text-muted-foreground">
              {formatTimezone(venue.timezone)}
            </p>
          </div>
        </div>

        {/* Amenities */}
        {amenitiesList.length > 0 && (
          <div className="pt-4 border-t">
            <h3 className="text-sm font-medium mb-3">Amenities</h3>
            <div className="flex flex-wrap gap-2">
              {amenitiesList.map((amenity: string) => {
                const Icon = amenityIcons[amenity];
                return (
                  <Badge key={amenity} variant="secondary" className="gap-1">
                    {Icon && <Icon className="w-3 h-3" />}
                    {amenityLabels[amenity] || amenity}
                  </Badge>
                );
              })}
            </div>
          </div>
        )}

        {/* Quick Tips */}
        <div className="pt-4 border-t">
          <h3 className="text-sm font-medium mb-2">Quick Tips</h3>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Arrive early for better parking options</li>
            <li>• Check venue website for bag policies</li>
            <li>• Most venues are cashless - bring cards</li>
          </ul>
        </div>
      </div>
    </Card>
  );
}