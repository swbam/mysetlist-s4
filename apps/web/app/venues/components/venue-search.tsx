'use client';

import { Badge } from '@repo/design-system/components/ui/badge';
import { Button } from '@repo/design-system/components/ui/button';
import { Input } from '@repo/design-system/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@repo/design-system/components/ui/select';
import { Toggle } from '@repo/design-system/components/ui/toggle';
import { Grid3X3, Loader2, Map, MapPin, Music2, Search } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

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

export const VenueSearch = ({
  onViewChange,
  currentView = 'grid',
}: VenueSearchProps) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [selectedTypes, setSelectedTypes] = useState<string[]>(
    searchParams.get('types')?.split(',').filter(Boolean) || []
  );
  const [capacity, setCapacity] = useState(
    searchParams.get('capacity') || 'all'
  );
  const [viewMode, setViewMode] = useState<'grid' | 'map'>(currentView);
  const [isLocating, setIsLocating] = useState(false);
  const [hasLocation, setHasLocation] = useState(
    !!(searchParams.get('lat') && searchParams.get('lng'))
  );

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

    const newUrl = params.toString()
      ? `${pathname}?${params.toString()}`
      : pathname;
    router.push(newUrl);
  }, [searchQuery, selectedTypes, capacity, pathname, router, searchParams]);

  const toggleType = (type: string) => {
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const handleViewChange = (view: 'grid' | 'map') => {
    setViewMode(view);
    onViewChange?.(view);
  };

  const handleUseLocation = async () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by this browser.');
      return;
    }

    setIsLocating(true);

    try {
      const position = await new Promise<GeolocationPosition>(
        (resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 300000, // 5 minutes
          });
        }
      );

      const { latitude, longitude } = position.coords;

      // Update URL with location params
      const params = new URLSearchParams(searchParams);
      params.set('lat', latitude.toString());
      params.set('lng', longitude.toString());

      const newUrl = `${pathname}?${params.toString()}`;
      router.push(newUrl);

      setHasLocation(true);
    } catch (error) {
      console.error('Error getting location:', error);
      alert(
        'Unable to get your location. Please try again or search manually.'
      );
    } finally {
      setIsLocating(false);
    }
  };

  const clearLocation = () => {
    const params = new URLSearchParams(searchParams);
    params.delete('lat');
    params.delete('lng');

    const newUrl = params.toString()
      ? `${pathname}?${params.toString()}`
      : pathname;
    router.push(newUrl);

    setHasLocation(false);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 text-muted-foreground" />
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

          {/* Location Button */}
          {hasLocation ? (
            <Button
              variant="outline"
              size="sm"
              onClick={clearLocation}
              className="border-primary text-primary"
            >
              <MapPin className="mr-1 h-4 w-4" />
              Near Me ✓
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={handleUseLocation}
              disabled={isLocating}
            >
              {isLocating ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <MapPin className="mr-1 h-4 w-4" />
              )}
              {isLocating ? 'Locating...' : 'Near Me'}
            </Button>
          )}

          <div className="flex gap-1 rounded-md border p-1">
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
        {venueTypes.map((type) => (
          <Badge
            key={type.value}
            variant={selectedTypes.includes(type.value) ? 'default' : 'outline'}
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
