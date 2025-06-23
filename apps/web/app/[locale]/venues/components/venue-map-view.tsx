'use client';

import { useEffect, useRef } from 'react';
import { Card } from '@repo/design-system/components/ui/card';
import { MapPin, Loader2 } from 'lucide-react';
import { useSearchParams } from 'next/navigation';

interface VenueMapViewProps {
  compact?: boolean;
}

export function VenueMapView({ compact = false }: VenueMapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const searchParams = useSearchParams();
  
  const userLat = searchParams.get('lat');
  const userLng = searchParams.get('lng');

  useEffect(() => {
    // In a real implementation, you would initialize a map library here
    // For example: Leaflet, Mapbox GL, or Google Maps
    console.log('Map would be initialized here', { userLat, userLng });
  }, [userLat, userLng]);

  const height = compact ? 'h-[400px]' : 'h-[600px]';

  return (
    <Card className="overflow-hidden">
      <div 
        ref={mapRef} 
        className={`${height} bg-muted flex items-center justify-center relative`}
      >
        {/* Mock map placeholder */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/20 dark:to-blue-900/20" />
        
        <div className="relative z-10 text-center">
          <MapPin className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Map View</h3>
          <p className="text-sm text-muted-foreground max-w-xs">
            In a production app, this would show an interactive map with venue locations
          </p>
          
          {userLat && userLng && (
            <p className="text-xs text-muted-foreground mt-4">
              Showing venues near: {parseFloat(userLat).toFixed(4)}, {parseFloat(userLng).toFixed(4)}
            </p>
          )}
        </div>

        {/* Map attribution */}
        <div className="absolute bottom-2 right-2 text-xs text-muted-foreground bg-background/80 px-2 py-1 rounded">
          Map Preview
        </div>
      </div>

      {/* Map Legend */}
      <div className="p-4 border-t">
        <h4 className="text-sm font-medium mb-2">Legend</h4>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-primary rounded-full" />
            <span className="text-muted-foreground">Your Location</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-secondary rounded-full" />
            <span className="text-muted-foreground">Venues</span>
          </div>
        </div>
      </div>
    </Card>
  );
}