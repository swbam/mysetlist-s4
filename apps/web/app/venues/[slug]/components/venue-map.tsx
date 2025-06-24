'use client';

import { useEffect, useRef } from 'react';
import { MapPin, Navigation, Train, Car } from 'lucide-react';
import { Card } from '@repo/design-system/components/ui/card';
import { Button } from '@repo/design-system/components/ui/button';
import { Badge } from '@repo/design-system/components/ui/badge';

interface VenueMapProps {
  venue: {
    id: string;
    name: string;
    address: string | null;
    latitude: number | null;
    longitude: number | null;
  };
  nearbyVenues?: Array<{
    id: string;
    name: string;
    distance: number;
  }>;
}

export function VenueMap({ venue, nearbyVenues = [] }: VenueMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);

  // Mock map implementation - in production, you would use Leaflet, Mapbox, or Google Maps
  useEffect(() => {
    if (!venue.latitude || !venue.longitude) return;

    // For now, we'll just show a placeholder
    // In production, initialize your map library here
    console.log('Map would be initialized with:', {
      center: [venue.latitude, venue.longitude],
      zoom: 15,
    });
  }, [venue.latitude, venue.longitude]);

  const handleGetDirections = () => {
    if (venue.latitude && venue.longitude) {
      // Open in Google Maps
      window.open(
        `https://www.google.com/maps/dir/?api=1&destination=${venue.latitude},${venue.longitude}`,
        '_blank'
      );
    }
  };

  const handleStreetView = () => {
    if (venue.latitude && venue.longitude) {
      // Open Google Street View
      window.open(
        `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${venue.latitude},${venue.longitude}`,
        '_blank'
      );
    }
  };

  return (
    <Card className="overflow-hidden">
      <div className="relative">
        {/* Map Placeholder */}
        <div 
          ref={mapRef} 
          className="w-full h-[400px] bg-muted flex items-center justify-center relative"
        >
          {venue.latitude && venue.longitude ? (
            <>
              {/* Mock map background */}
              <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/20 dark:to-blue-900/20" />
              
              {/* Venue marker */}
              <div className="relative z-10 flex flex-col items-center gap-2">
                <div className="p-4 bg-primary rounded-full shadow-lg animate-pulse">
                  <MapPin className="w-8 h-8 text-primary-foreground" />
                </div>
                <Badge className="shadow-md">{venue.name}</Badge>
              </div>

              {/* Nearby venues indicators */}
              {nearbyVenues.map((nearby, index) => {
                const angle = (index * 360) / nearbyVenues.length;
                const radius = 100 + (nearby.distance * 10); // Scale based on distance
                const x = Math.cos((angle * Math.PI) / 180) * radius;
                const y = Math.sin((angle * Math.PI) / 180) * radius;
                
                return (
                  <div
                    key={nearby.id}
                    className="absolute z-5"
                    style={{
                      transform: `translate(${x}px, ${y}px)`,
                      left: '50%',
                      top: '50%',
                    }}
                  >
                    <div className="p-2 bg-secondary rounded-full shadow-md">
                      <MapPin className="w-4 h-4 text-secondary-foreground" />
                    </div>
                  </div>
                );
              })}

              {/* Map attribution */}
              <div className="absolute bottom-2 right-2 text-xs text-muted-foreground bg-background/80 px-2 py-1 rounded">
                Map Preview
              </div>
            </>
          ) : (
            <div className="text-center">
              <MapPin className="w-12 h-12 text-muted-foreground/50 mb-2" />
              <p className="text-muted-foreground">Location not available</p>
            </div>
          )}
        </div>

        {/* Map Controls */}
        {venue.latitude && venue.longitude && (
          <div className="absolute top-4 right-4 flex flex-col gap-2">
            <Button
              size="sm"
              variant="secondary"
              className="shadow-md"
              onClick={handleGetDirections}
            >
              <Navigation className="w-4 h-4 mr-1" />
              Directions
            </Button>
            <Button
              size="sm"
              variant="secondary"
              className="shadow-md"
              onClick={handleStreetView}
            >
              <MapPin className="w-4 h-4 mr-1" />
              Street View
            </Button>
          </div>
        )}
      </div>

      {/* Transportation Options */}
      {venue.address && (
        <div className="p-4 border-t">
          <h3 className="font-semibold mb-3">Getting There</h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Car className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">By Car</p>
                <p className="text-sm text-muted-foreground">
                  Parking available nearby
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Train className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">Public Transit</p>
                <p className="text-sm text-muted-foreground">
                  Check local transit options
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}