'use client';

import { useState } from 'react';
import { VenueSearch } from './venue-search';
import { VenueMapView } from './venue-map-view';

interface VenueMapWrapperProps {
  children: React.ReactNode;
}

export function VenueMapWrapper({ children }: VenueMapWrapperProps) {
  const [viewMode, setViewMode] = useState<'grid' | 'map'>('grid');

  return (
    <>
      <VenueSearch onViewChange={setViewMode} currentView={viewMode} />
      
      {viewMode === 'map' ? (
        <VenueMapView />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="order-2 lg:order-1">
            {children}
          </div>
          <div className="order-1 lg:order-2 lg:sticky lg:top-8 h-fit">
            <VenueMapView compact />
          </div>
        </div>
      )}
    </>
  );
}