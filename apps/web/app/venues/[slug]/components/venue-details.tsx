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
  CreditCard,
  Navigation,
  Train,
  Bus,
  Users,
  Volume2,
  Eye,
  Info,
  Banknote
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
    'coat-check': Users,
    'merch': Banknote,
    'atm': CreditCard,
    'outdoor-area': Globe,
  };

  const amenityLabels: Record<string, string> = {
    wifi: 'Free WiFi',
    parking: 'Parking Available',
    food: 'Food & Concessions',
    bar: 'Full Bar',
    accessible: 'Wheelchair Accessible',
    'live-music': 'Live Music Venue',
    security: '24/7 Security',
    'cashless': 'Cashless Only',
    'coat-check': 'Coat Check',
    'merch': 'Merchandise Stand',
    'atm': 'ATM Available',
    'outdoor-area': 'Outdoor Area',
  };

  const formatTimezone = (tz: string) => {
    // Convert timezone to readable format
    try {
      const offset = new Date().toLocaleString('en-US', { 
        timeZone: tz, 
        timeZoneName: 'short' 
      }).split(' ').pop();
      return offset || tz;
    } catch {
      return tz;
    }
  };

  const getDirectionsUrl = () => {
    if (venue.address) {
      const address = `${venue.address}, ${venue.city}, ${venue.state || venue.country}`;
      return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;
    }
    return null;
  };

  const getTransitUrl = () => {
    if (venue.address) {
      const address = `${venue.address}, ${venue.city}, ${venue.state || venue.country}`;
      return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}&travelmode=transit`;
    }
    return null;
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

        {/* Transportation Options */}
        <div className="pt-4 border-t">
          <h3 className="text-sm font-medium mb-3">Getting There</h3>
          <div className="space-y-3">
            {getDirectionsUrl() && (
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Navigation className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1">
                  <Link
                    href={getDirectionsUrl()!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-primary hover:underline"
                  >
                    Get Driving Directions
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    Google Maps driving directions
                  </p>
                </div>
              </div>
            )}
            
            {getTransitUrl() && (
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Train className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1">
                  <Link
                    href={getTransitUrl()!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-primary hover:underline"
                  >
                    Public Transit Options
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    Bus, train, and transit directions
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Car className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">Parking Information</p>
                <p className="text-xs text-muted-foreground">
                  {amenitiesList.includes('parking') 
                    ? 'Parking available - check venue for rates' 
                    : 'Limited parking - consider public transit'
                  }
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Accessibility Information */}
        <div className="pt-4 border-t">
          <h3 className="text-sm font-medium mb-3">Accessibility & Info</h3>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Accessibility className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">Accessibility</p>
                <p className="text-xs text-muted-foreground">
                  {amenitiesList.includes('accessible') 
                    ? 'Wheelchair accessible with ADA compliance' 
                    : 'Contact venue for accessibility information'
                  }
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Volume2 className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">Sound & Acoustics</p>
                <p className="text-xs text-muted-foreground">
                  Professional sound system - check reviews for details
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Eye className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">Sightlines</p>
                <p className="text-xs text-muted-foreground">
                  Venue layout designed for optimal viewing - see reviews
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Important Policies */}
        <div className="pt-4 border-t">
          <h3 className="text-sm font-medium mb-3">Important Policies</h3>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Info className="w-3 h-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">
                {amenitiesList.includes('cashless') 
                  ? 'Cashless venue - cards and mobile payments only' 
                  : 'Cash and cards accepted'
                }
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Info className="w-3 h-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">
                Bag policy enforced - check venue website before arrival
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Info className="w-3 h-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">
                Arrive early for security screening and best parking
              </span>
            </div>
            {amenitiesList.includes('security') && (
              <div className="flex items-center gap-2">
                <Shield className="w-3 h-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">
                  Professional security staff on-site
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}