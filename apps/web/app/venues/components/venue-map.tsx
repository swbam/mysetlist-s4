'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@repo/design-system/components/ui/card';
import { MapPin } from 'lucide-react';

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

export const VenueMap = ({ venues = [] }: VenueMapProps) => {
  return (
    <Card className="h-[600px]">
      <CardHeader>
        <CardTitle>Venue Map</CardTitle>
      </CardHeader>
      <CardContent className="h-[calc(100%-80px)] flex items-center justify-center">
        <div className="text-center space-y-4">
          <MapPin className="h-12 w-12 mx-auto text-muted-foreground" />
          <div>
            <h3 className="text-lg font-semibold">Interactive Map Coming Soon</h3>
            <p className="text-sm text-muted-foreground mt-2">
              Map functionality to be implemented in future versions
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};