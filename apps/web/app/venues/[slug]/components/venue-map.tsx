'use client';

import { useEffect, useRef, useState } from 'react';
import { MapPin, Navigation, Train, Car, Bus, Bike, ExternalLink, Share2 } from 'lucide-react';
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
  const [selectedTransport, setSelectedTransport] = useState<'driving' | 'transit' | 'walking' | 'bicycling'>('driving');

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

  const getDirectionsUrl = (mode: string = 'driving') => {
    if (!venue.latitude || !venue.longitude) return null;
    
    const baseUrl = 'https://www.google.com/maps/dir/?api=1';
    const destination = `destination=${venue.latitude},${venue.longitude}`;
    const travelMode = mode !== 'driving' ? `&travelmode=${mode}` : '';
    
    return `${baseUrl}&${destination}${travelMode}`;
  };

  const handleGetDirections = (mode: string = selectedTransport) => {
    const url = getDirectionsUrl(mode);
    if (url) {
      window.open(url, '_blank');
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

  const handleShareLocation = async () => {
    const shareData = {
      title: venue.name,
      text: `Check out ${venue.name} venue location`,
      url: window.location.href,
    };

    if (navigator.share && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.log('Error sharing:', err);
      }
    } else {
      // Fallback to copying to clipboard
      try {
        await navigator.clipboard.writeText(window.location.href);
        // Could show a toast here
      } catch (err) {
        console.log('Error copying to clipboard:', err);
      }
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
            <div className="flex gap-1 bg-background/90 backdrop-blur-sm rounded-lg p-1">
              <Button
                size="sm"
                variant={selectedTransport === 'driving' ? 'default' : 'ghost'}
                className="h-8 w-8 p-0"
                onClick={() => setSelectedTransport('driving')}
                title="Driving"
              >
                <Car className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant={selectedTransport === 'transit' ? 'default' : 'ghost'}
                className="h-8 w-8 p-0"
                onClick={() => setSelectedTransport('transit')}
                title="Public Transit"
              >
                <Bus className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant={selectedTransport === 'walking' ? 'default' : 'ghost'}
                className="h-8 w-8 p-0"
                onClick={() => setSelectedTransport('walking')}
                title="Walking"
              >
                <MapPin className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant={selectedTransport === 'bicycling' ? 'default' : 'ghost'}
                className="h-8 w-8 p-0"
                onClick={() => setSelectedTransport('bicycling')}
                title="Bicycling"
              >
                <Bike className="w-4 h-4" />
              </Button>
            </div>
            
            <Button
              size="sm"
              variant="secondary"
              className="shadow-md bg-background/90 backdrop-blur-sm"
              onClick={() => handleGetDirections()}
            >
              <Navigation className="w-4 h-4 mr-1" />
              Directions
              <ExternalLink className="w-3 h-3 ml-1" />
            </Button>
            
            <Button
              size="sm"
              variant="secondary"
              className="shadow-md bg-background/90 backdrop-blur-sm"
              onClick={handleStreetView}
            >
              <MapPin className="w-4 h-4 mr-1" />
              Street View
            </Button>
            
            <Button
              size="sm"
              variant="secondary"
              className="shadow-md bg-background/90 backdrop-blur-sm"
              onClick={handleShareLocation}
            >
              <Share2 className="w-4 h-4 mr-1" />
              Share
            </Button>
          </div>
        )}
      </div>

      {/* Transportation Options */}
      {venue.address && (
        <div className="p-4 border-t">
          <h3 className="font-semibold mb-3">Transportation Options</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Button
              variant="outline"
              className="justify-start h-auto p-3"
              onClick={() => handleGetDirections('driving')}
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Car className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium">Driving Directions</p>
                  <p className="text-xs text-muted-foreground">
                    Get turn-by-turn navigation
                  </p>
                </div>
                <ExternalLink className="w-3 h-3" />
              </div>
            </Button>

            <Button
              variant="outline"
              className="justify-start h-auto p-3"
              onClick={() => handleGetDirections('transit')}
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Bus className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium">Public Transit</p>
                  <p className="text-xs text-muted-foreground">
                    Bus, train, and metro options
                  </p>
                </div>
                <ExternalLink className="w-3 h-3" />
              </div>
            </Button>

            <Button
              variant="outline"
              className="justify-start h-auto p-3"
              onClick={() => handleGetDirections('walking')}
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <MapPin className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium">Walking Directions</p>
                  <p className="text-xs text-muted-foreground">
                    Pedestrian-friendly routes
                  </p>
                </div>
                <ExternalLink className="w-3 h-3" />
              </div>
            </Button>

            <Button
              variant="outline"
              className="justify-start h-auto p-3"
              onClick={() => handleGetDirections('bicycling')}
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Bike className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium">Bike Directions</p>
                  <p className="text-xs text-muted-foreground">
                    Bike lanes and paths
                  </p>
                </div>
                <ExternalLink className="w-3 h-3" />
              </div>
            </Button>
          </div>

          {/* Nearby Venues Preview */}
          {nearbyVenues.length > 0 && (
            <div className="mt-4 pt-4 border-t">
              <h4 className="text-sm font-medium mb-2">Nearby Venues</h4>
              <div className="flex flex-wrap gap-1">
                {nearbyVenues.slice(0, 3).map((nearby) => (
                  <Badge key={nearby.id} variant="outline" className="text-xs">
                    {nearby.name} ({nearby.distance.toFixed(1)}km)
                  </Badge>
                ))}
                {nearbyVenues.length > 3 && (
                  <Badge variant="outline" className="text-xs">
                    +{nearbyVenues.length - 3} more
                  </Badge>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}