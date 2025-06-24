'use client';

import { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@repo/design-system/components/ui/card';
import { Button } from '@repo/design-system/components/ui/button';
import { MapPin, Navigation, Loader2, AlertCircle } from 'lucide-react';
import { useVenueGeolocation } from '@/hooks/use-venue-geolocation';
import { GeolocationService } from '@/lib/geolocation';
import { toast } from 'sonner';

interface VenueMapProps {
  venues?: Array<{
    id: string;
    name: string;
    latitude: number;
    longitude: number;
    address: string;
    showCount?: number;
  }>;
  onVenueClick?: (venueId: string) => void;
}

export const VenueMap = ({ venues = [], onVenueClick }: VenueMapProps) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  
  const { position, loading, updateLocation, hasLocation } = useVenueGeolocation();

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const loadMap = async () => {
      try {
        // Dynamically import mapbox-gl to avoid SSR issues
        const mapboxgl = (await import('mapbox-gl')).default;
        
        // Check if token exists
        if (!process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN) {
          setMapError('Mapbox token not configured');
          return;
        }

        mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

        const map = new mapboxgl.Map({
          container: mapContainerRef.current!,
          style: 'mapbox://styles/mapbox/streets-v12',
          center: position ? [position.longitude, position.latitude] : [-74.006, 40.7128], // NYC default
          zoom: position ? 13 : 11,
        });

        mapRef.current = map;

        // Add navigation controls
        map.addControl(new mapboxgl.NavigationControl(), 'top-right');

        map.on('load', () => {
          setMapLoaded(true);
          
          // Add user location marker if available
          if (position) {
            new mapboxgl.Marker({ color: '#3b82f6' })
              .setLngLat([position.longitude, position.latitude])
              .setPopup(new mapboxgl.Popup().setText('Your Location'))
              .addTo(map);
          }
        });

        // Import CSS
        const link = document.createElement('link');
        link.href = 'https://api.mapbox.com/mapbox-gl-js/v3.0.1/mapbox-gl.css';
        link.rel = 'stylesheet';
        document.head.appendChild(link);

      } catch (error) {
        console.error('Error loading map:', error);
        setMapError('Failed to load map');
      }
    };

    loadMap();

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [position]);

  // Update venue markers
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;

    const loadMapboxgl = async () => {
      const mapboxgl = (await import('mapbox-gl')).default;

      // Clear existing markers
      markersRef.current.forEach(marker => marker.remove());
      markersRef.current = [];

      // Add venue markers
      venues.forEach(venue => {
        const el = document.createElement('div');
        el.className = 'w-8 h-8 bg-primary rounded-full flex items-center justify-center cursor-pointer hover:scale-110 transition-transform';
        el.innerHTML = '<svg class="w-5 h-5 text-primary-foreground" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd"></path></svg>';
        
        const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(`
          <div class="p-2">
            <h3 class="font-semibold">${venue.name}</h3>
            <p class="text-sm text-muted-foreground">${venue.address}</p>
            ${venue.showCount ? `<p class="text-sm font-medium mt-1">${venue.showCount} upcoming shows</p>` : ''}
          </div>
        `);

        const marker = new mapboxgl.Marker({ element: el })
          .setLngLat([venue.longitude, venue.latitude])
          .setPopup(popup)
          .addTo(mapRef.current!);

        el.addEventListener('click', () => {
          if (onVenueClick) {
            onVenueClick(venue.id);
          }
        });

        markersRef.current.push(marker);
      });

      // Fit bounds to show all markers
      if (venues.length > 0) {
        const bounds = new mapboxgl.LngLatBounds();
        
        venues.forEach(venue => {
          bounds.extend([venue.longitude, venue.latitude]);
        });
        
        if (position) {
          bounds.extend([position.longitude, position.latitude]);
        }

        mapRef.current!.fitBounds(bounds, { padding: 50 });
      }
    };

    loadMapboxgl();
  }, [venues, mapLoaded, position, onVenueClick]);

  const handleCenterOnMe = async () => {
    await updateLocation();
    
    if (position && mapRef.current) {
      mapRef.current.flyTo({
        center: [position.longitude, position.latitude],
        zoom: 14,
        duration: 1500,
      });
    }
  };

  if (mapError) {
    return (
      <Card className="h-[600px]">
        <CardHeader>
          <CardTitle>Venue Map</CardTitle>
        </CardHeader>
        <CardContent className="h-[calc(100%-80px)] flex items-center justify-center">
          <div className="text-center space-y-4">
            <AlertCircle className="h-12 w-12 mx-auto text-destructive" />
            <div>
              <h3 className="text-lg font-semibold">Map Unavailable</h3>
              <p className="text-sm text-muted-foreground mt-2">{mapError}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-[600px]">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Venues Near You</span>
          <Button 
            variant="outline" 
            size="sm" 
            className="gap-2"
            onClick={handleCenterOnMe}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Navigation className="h-4 w-4" />
            )}
            {hasLocation ? 'Update location' : 'Use my location'}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="h-[calc(100%-80px)] relative">
        <div ref={mapContainerRef} className="h-full w-full rounded-lg overflow-hidden" />
        
        {!mapLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm rounded-lg">
            <div className="text-center space-y-4">
              <Loader2 className="h-8 w-8 animate-spin mx-auto" />
              <p className="text-sm text-muted-foreground">Loading map...</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};