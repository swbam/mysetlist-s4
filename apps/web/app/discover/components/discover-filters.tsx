'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@repo/design-system/components/ui/button';
import { Input } from '@repo/design-system/components/ui/input';
import { Badge } from '@repo/design-system/components/ui/badge';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@repo/design-system/components/ui/select';
import { Card, CardContent } from '@repo/design-system/components/ui/card';
import { Switch } from '@repo/design-system/components/ui/switch';
import { Label } from '@repo/design-system/components/ui/label';
import { Filter, X, MapPin, Calendar, Music, Heart } from 'lucide-react';

interface DiscoverFiltersProps {
  currentLocation: string;
  currentDate: string;
  currentGenre: string;
  currentFollowing: boolean;
  popularGenres: string[];
}

const DATE_OPTIONS = [
  { value: '', label: 'Any time' },
  { value: 'this_week', label: 'This week' },
  { value: 'this_month', label: 'This month' },
  { value: 'next_3_months', label: 'Next 3 months' },
];

export function DiscoverFilters({
  currentLocation,
  currentDate,
  currentGenre,
  currentFollowing,
  popularGenres
}: DiscoverFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [location, setLocation] = useState(currentLocation);
  const [date, setDate] = useState(currentDate);
  const [genre, setGenre] = useState(currentGenre);
  const [following, setFollowing] = useState(currentFollowing);
  const [isOpen, setIsOpen] = useState(false);

  const applyFilters = () => {
    const params = new URLSearchParams();
    
    if (location) params.set('location', location);
    if (date) params.set('date', date);
    if (genre) params.set('genre', genre);
    if (following) params.set('following', 'true');
    
    // Reset to page 1 when filters change
    if (params.toString()) {
      params.set('page', '1');
    }
    
    const newUrl = `/discover${params.toString() ? '?' + params.toString() : ''}`;
    router.push(newUrl);
  };

  const clearFilters = () => {
    setLocation('');
    setDate('');
    setGenre('');
    setFollowing(false);
    router.push('/discover');
  };

  const hasActiveFilters = currentLocation || currentDate || currentGenre || currentFollowing;

  const activeFilterCount = [currentLocation, currentDate, currentGenre, currentFollowing].filter(Boolean).length;

  return (
    <Card>
      <CardContent className="p-4">
        {/* Filter Toggle */}
        <div className="flex items-center justify-between mb-4">
          <Button
            variant="outline"
            onClick={() => setIsOpen(!isOpen)}
            className="gap-2"
          >
            <Filter className="h-4 w-4" />
            Filters
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="ml-1">
                {activeFilterCount}
              </Badge>
            )}
          </Button>
          
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="h-4 w-4 mr-2" />
              Clear All
            </Button>
          )}
        </div>

        {/* Active Filters */}
        {hasActiveFilters && (
          <div className="flex flex-wrap gap-2 mb-4">
            {currentLocation && (
              <Badge variant="outline" className="gap-1">
                <MapPin className="h-3 w-3" />
                {currentLocation}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0 ml-1"
                  onClick={() => {
                    const params = new URLSearchParams(searchParams);
                    params.delete('location');
                    router.push(`/discover?${params.toString()}`);
                  }}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            )}
            
            {currentDate && (
              <Badge variant="outline" className="gap-1">
                <Calendar className="h-3 w-3" />
                {DATE_OPTIONS.find(opt => opt.value === currentDate)?.label}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0 ml-1"
                  onClick={() => {
                    const params = new URLSearchParams(searchParams);
                    params.delete('date');
                    router.push(`/discover?${params.toString()}`);
                  }}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            )}
            
            {currentGenre && (
              <Badge variant="outline" className="gap-1">
                <Music className="h-3 w-3" />
                {currentGenre}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0 ml-1"
                  onClick={() => {
                    const params = new URLSearchParams(searchParams);
                    params.delete('genre');
                    router.push(`/discover?${params.toString()}`);
                  }}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            )}
            
            {currentFollowing && (
              <Badge variant="outline" className="gap-1">
                <Heart className="h-3 w-3 fill-current" />
                Following Only
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0 ml-1"
                  onClick={() => {
                    const params = new URLSearchParams(searchParams);
                    params.delete('following');
                    router.push(`/discover?${params.toString()}`);
                  }}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            )}
          </div>
        )}

        {/* Filter Controls */}
        {isOpen && (
          <div className="space-y-4 pt-4 border-t">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {/* Location Filter */}
              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Location
                </Label>
                <Input
                  placeholder="City, state, or country..."
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
              </div>

              {/* Date Filter */}
              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Date Range
                </Label>
                <Select value={date} onValueChange={setDate}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select date range" />
                  </SelectTrigger>
                  <SelectContent>
                    {DATE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Genre Filter */}
              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Music className="h-4 w-4" />
                  Genre
                </Label>
                <Select value={genre} onValueChange={setGenre}>
                  <SelectTrigger>
                    <SelectValue placeholder="Any genre" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Any genre</SelectItem>
                    {popularGenres.slice(0, 15).map((genreName) => (
                      <SelectItem key={genreName} value={genreName}>
                        {genreName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Following Only */}
              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Heart className="h-4 w-4" />
                  Following Only
                </Label>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="following-filter"
                    checked={following}
                    onCheckedChange={setFollowing}
                  />
                  <Label htmlFor="following-filter" className="text-sm">
                    Show only artists I follow
                  </Label>
                </div>
              </div>
            </div>

            {/* Popular Genres Quick Select */}
            {popularGenres.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Popular Genres</Label>
                <div className="flex flex-wrap gap-2">
                  {popularGenres.slice(0, 8).map((genreName) => (
                    <Button
                      key={genreName}
                      variant={genre === genreName ? "default" : "outline"}
                      size="sm"
                      onClick={() => setGenre(genre === genreName ? '' : genreName)}
                    >
                      {genreName}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Apply/Clear Buttons */}
            <div className="flex gap-2 pt-4">
              <Button onClick={applyFilters} className="flex-1">
                Apply Filters
              </Button>
              <Button variant="outline" onClick={clearFilters}>
                Clear
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 