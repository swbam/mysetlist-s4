'use client';

import { Card } from '@repo/design-system/components/ui/card';
import { MapPin } from 'lucide-react';

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

export function VenueMapView({ compact = false, venues = [] }: VenueMapViewProps) {
  const height = compact ? 'h-[400px]' : 'h-[600px]';

  return (
    <Card className="overflow-hidden">
      <div className={`${height} bg-muted flex items-center justify-center`}>
        <div className="text-center space-y-4">
          <MapPin className="w-12 h-12 text-muted-foreground/50 mx-auto" />
          <div>
            <h3 className="text-lg font-semibold">Venue Map</h3>
            <p className="text-sm text-muted-foreground max-w-xs mt-2">
              Map functionality to be implemented in future versions
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
}