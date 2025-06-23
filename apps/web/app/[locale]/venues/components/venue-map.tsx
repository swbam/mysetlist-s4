'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@repo/design-system/components/ui/card';
import { Badge } from '@repo/design-system/components/ui/badge';
import { Button } from '@repo/design-system/components/ui/button';
import { MapPin, Navigation } from 'lucide-react';

export const VenueMap = () => {
  return (
    <Card className="h-[600px]">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Venues Near You</span>
          <Button variant="outline" size="sm" className="gap-2">
            <Navigation className="h-4 w-4" />
            Center on me
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="h-[calc(100%-80px)]">
        <div className="h-full flex items-center justify-center bg-muted/30 rounded-lg">
          <div className="text-center space-y-4">
            <MapPin className="h-12 w-12 mx-auto text-muted-foreground" />
            <div>
              <h3 className="text-lg font-semibold">Interactive Map Coming Soon</h3>
              <p className="text-sm text-muted-foreground mt-2 max-w-xs">
                See all venues in your area with real-time show information
              </p>
            </div>
            <Badge variant="secondary">In Development</Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};