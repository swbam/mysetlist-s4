'use client';

import { Input } from '@repo/design-system/components/ui/input';
import { Button } from '@repo/design-system/components/ui/button';
import { Badge } from '@repo/design-system/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@repo/design-system/components/ui/select';
import { Search, MapPin, Music2, Grid3X3, Map } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Toggle } from '@repo/design-system/components/ui/toggle';

const venueTypes = [
  { value: 'arena', label: 'Arena' },
  { value: 'theater', label: 'Theater' },
  { value: 'club', label: 'Club' },
  { value: 'stadium', label: 'Stadium' },
  { value: 'outdoor-amphitheater', label: 'Outdoor Amphitheater' },
  { value: 'indoor-amphitheater', label: 'Indoor Amphitheater' },
  { value: 'ballroom', label: 'Ballroom' },
  { value: 'festival', label: 'Festival Grounds' },
];

interface VenueSearchProps {
  onViewChange?: (view: 'grid' | 'map') => void;
  currentView?: 'grid' | 'map';
}

export const VenueSearch = ({ onViewChange, currentView = 'grid' }: VenueSearchProps) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [selectedTypes, setSelectedTypes] = useState<string[]>(
    searchParams.get('types')?.split(',').filter(Boolean) || []
  );
  const [capacity, setCapacity] = useState(searchParams.get('capacity') || 'all');
  const [viewMode, setViewMode] = useState<'grid' | 'map'>(currentView);

  useEffect(() => {
    const params = new URLSearchParams(searchParams);
    
    if (searchQuery) {
      params.set('q', searchQuery);
    } else {
      params.delete('q');
    }

    if (selectedTypes.length > 0) {
      params.set('types', selectedTypes.join(','));
    } else {
      params.delete('types');
    }

    if (capacity !== 'all') {
      params.set('capacity', capacity);
    } else {
      params.delete('capacity');
    }

    const newUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
    router.push(newUrl);
  }, [searchQuery, selectedTypes, capacity, pathname, router, searchParams]);

  const toggleType = (type: string) => {
    setSelectedTypes(prev => 
      prev.includes(type) 
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  const handleNearMe = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const params = new URLSearchParams(searchParams);
          params.set('lat', position.coords.latitude.toString());
          params.set('lng', position.coords.longitude.toString());
          router.push(`${pathname}?${params.toString()}`);
        },
        (error) => {
          console.error('Error getting location:', error);
        }
      );
    }
  };

  const handleViewChange = (view: 'grid' | 'map') => {
    setViewMode(view);
    onViewChange?.(view);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search venues or locations..." 
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <Select value={capacity} onValueChange={setCapacity}>
            <SelectTrigger className="w-[180px]">
              <Music2 className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Capacity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All sizes</SelectItem>
              <SelectItem value="small">Under 1,000</SelectItem>
              <SelectItem value="medium">1,000 - 5,000</SelectItem>
              <SelectItem value="large">5,000 - 20,000</SelectItem>
              <SelectItem value="xlarge">20,000+</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={handleNearMe} variant="outline">
            <MapPin className="h-4 w-4 mr-2" />
            Near Me
          </Button>
          <div className="flex gap-1 border rounded-md p-1">
            <Toggle
              size="sm"
              pressed={viewMode === 'grid'}
              onPressedChange={() => handleViewChange('grid')}
            >
              <Grid3X3 className="h-4 w-4" />
            </Toggle>
            <Toggle
              size="sm"
              pressed={viewMode === 'map'}
              onPressedChange={() => handleViewChange('map')}
            >
              <Map className="h-4 w-4" />
            </Toggle>
          </div>
        </div>
      </div>
      
      <div className="flex flex-wrap gap-2">
        {venueTypes.map(type => (
          <Badge 
            key={type.value}
            variant={selectedTypes.includes(type.value) ? "default" : "outline"}
            className="cursor-pointer transition-colors"
            onClick={() => toggleType(type.value)}
          >
            {type.label}
          </Badge>
        ))}
      </div>
    </div>
  );
};