'use client';

import { Card } from '@repo/design-system/components/ui/card';
import { Badge } from '@repo/design-system/components/ui/badge';
import { MapPin } from 'lucide-react';

export const ShowsMap = () => {
  return (
    <div className="relative">
      <Card className="h-[600px] flex items-center justify-center bg-muted/30">
        <div className="text-center space-y-4">
          <MapPin className="h-12 w-12 mx-auto text-muted-foreground" />
          <div>
            <h3 className="text-lg font-semibold">Interactive Map Coming Soon</h3>
            <p className="text-sm text-muted-foreground mt-2">
              See all shows happening near you on an interactive map
            </p>
          </div>
          <Badge variant="secondary">In Development</Badge>
        </div>
      </Card>
      
      {/* Placeholder for future map implementation */}
      <div className="absolute top-4 left-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 p-4 rounded-lg shadow-lg max-w-xs">
        <h4 className="font-semibold mb-2">Shows Near You</h4>
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 bg-red-500 rounded-full" />
            <span>5 shows tonight</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 bg-orange-500 rounded-full" />
            <span>12 shows this weekend</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 bg-blue-500 rounded-full" />
            <span>28 shows this month</span>
          </div>
        </div>
      </div>
    </div>
  );
};