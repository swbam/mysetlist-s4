'use client';

import { useState } from 'react';
import { VenueSearch } from './venue-search';
import { VenueMapView } from './venue-map-view';
import { useSearchParams } from 'next/navigation';

interface VenueMapWrapperProps {
  children: React.ReactNode;
  venues?: Array<{
    id: string;
    name: string;
    latitude: number;
    longitude: number;
    address: string;
    showCount?: number;
  }>;
}

export function VenueMapWrapper({ children, venues = [] }: VenueMapWrapperProps) {
  const [viewMode, setViewMode] = useState<'grid' | 'map'>('grid');
  const searchParams = useSearchParams();

  // Extract venue data from children if available
  // This is a temporary solution - in production, you'd pass venues from server component
  
  return (
    <>
      <VenueSearch onViewChange={setViewMode} currentView={viewMode} />
      
      {viewMode === 'map' ? (
        <VenueMapView venues={venues} />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="order-2 lg:order-1">
            {children}
          </div>
          <div className="order-1 lg:order-2 lg:sticky lg:top-8 h-fit">
            <VenueMapView compact venues={venues} />
          </div>
        </div>
      )}
    </>
  );
}