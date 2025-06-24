'use client';

import { useEffect, useRef, useState } from 'react';
import { Card } from '@repo/design-system/components/ui/card';
import { MapPin, Loader2, Navigation } from 'lucide-react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@repo/design-system/components/ui/button';
import { useVenueGeolocation } from '@/hooks/use-venue-geolocation';
import { GeolocationService } from '@/lib/geolocation';

interface VenueMapViewProps {
  compact?: boolean;
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

export function VenueMapView({ compact = false, venues = [], onVenueClick }: VenueMapViewProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const router = useRouter();
  
  const { position, loading, updateLocation, hasLocation } = useVenueGeolocation();

  const height = compact ? 'h-[400px]' : 'h-[600px]';

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
        if (!compact) {
          map.addControl(new mapboxgl.NavigationControl(), 'top-right');
        }

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
  }, [position, compact]);

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
        el.className = 'w-8 h-8 bg-primary rounded-full flex items-center justify-center cursor-pointer hover:scale-110 transition-transform shadow-lg';
        el.innerHTML = '<svg class="w-5 h-5 text-primary-foreground" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd"></path></svg>';
        
        const distance = position ? GeolocationService.calculateDistance(
          position.latitude,
          position.longitude,
          venue.latitude,
          venue.longitude
        ) : null;

        const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(`
          <div class="p-2">
            <h3 class="font-semibold">${venue.name}</h3>
            <p class="text-sm text-muted-foreground">${venue.address}</p>
            ${venue.showCount ? `<p class="text-sm font-medium mt-1">${venue.showCount} upcoming shows</p>` : ''}
            ${distance ? `<p class="text-xs text-muted-foreground mt-1">${GeolocationService.formatDistance(distance)}</p>` : ''}
          </div>
        `);

        const marker = new mapboxgl.Marker({ element: el })
          .setLngLat([venue.longitude, venue.latitude])
          .setPopup(popup)
          .addTo(mapRef.current!);

        el.addEventListener('click', () => {
          if (onVenueClick) {
            onVenueClick(venue.id);
          } else {
            router.push(`/venues/${venue.id}`);
          }
        });

        markersRef.current.push(marker);
      });

      // Fit bounds to show all markers
      if (venues.length > 0 && !compact) {
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
  }, [venues, mapLoaded, position, onVenueClick, compact, router]);

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
      <Card className="overflow-hidden">
        <div className={`${height} bg-muted flex items-center justify-center`}>
          <div className="text-center space-y-4">
            <MapPin className="w-12 h-12 text-muted-foreground/50 mx-auto" />
            <div>
              <h3 className="text-lg font-semibold">Map Preview</h3>
              <p className="text-sm text-muted-foreground max-w-xs mt-2">
                Interactive map requires Mapbox configuration
              </p>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <div className="relative">
        <div ref={mapContainerRef} className={`${height} w-full`} />
        
        {!mapLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm">
            <div className="text-center space-y-4">
              <Loader2 className="h-8 w-8 animate-spin mx-auto" />
              <p className="text-sm text-muted-foreground">Loading map...</p>
            </div>
          </div>
        )}

        {/* Location button overlay */}
        {!compact && (
          <Button
            variant="secondary"
            size="sm"
            className="absolute top-4 left-4 gap-2 shadow-lg"
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
        )}
      </div>

      {/* Map Legend */}
      {!compact && (
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
      )}
    </Card>
  );
}