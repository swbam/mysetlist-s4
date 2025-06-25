'use client';

import { useState } from 'react';
import { Button } from '@repo/design-system/components/ui/button';
import { Input } from '@repo/design-system/components/ui/input';
import { Label } from '@repo/design-system/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@repo/design-system/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@repo/design-system/components/ui/card';
import { Badge } from '@repo/design-system/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@repo/design-system/components/ui/collapsible';
import { Slider } from '@repo/design-system/components/ui/slider';
import { Calendar } from '@repo/design-system/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@repo/design-system/components/ui/popover';
import { 
  Filter, 
  CalendarIcon, 
  MapPin, 
  Music, 
  DollarSign, 
  ChevronDown, 
  X,
  Search,
  Clock,
  Users
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@repo/design-system/lib/utils';

export interface SearchFilters {
  dateFrom?: Date;
  dateTo?: Date;
  location?: string;
  genre?: string;
  priceMin?: number;
  priceMax?: number;
  radius?: number;
  sortBy?: 'relevance' | 'date' | 'popularity' | 'alphabetical';
}

interface SearchFiltersProps {
  filters: SearchFilters;
  onFiltersChange: (filters: SearchFilters) => void;
  onClearFilters: () => void;
  availableGenres?: string[];
  popularLocations?: string[];
}

const MUSIC_GENRES = [
  'Rock', 'Pop', 'Hip-Hop', 'Electronic', 'Jazz', 'Blues', 'Country', 
  'Classical', 'Folk', 'Reggae', 'Metal', 'Punk', 'R&B', 'Soul',
  'Alternative', 'Indie', 'World', 'Latin', 'Funk', 'Gospel'
];

const POPULAR_LOCATIONS = [
  'New York, NY', 'Los Angeles, CA', 'Chicago, IL', 'Houston, TX',
  'Phoenix, AZ', 'Philadelphia, PA', 'San Antonio, TX', 'San Diego, CA',
  'Dallas, TX', 'San Jose, CA', 'Austin, TX', 'Jacksonville, FL',
  'Fort Worth, TX', 'Columbus, OH', 'Charlotte, NC', 'San Francisco, CA',
  'Indianapolis, IN', 'Seattle, WA', 'Denver, CO', 'Washington, DC'
];

const RADIUS_OPTIONS = [
  { value: 25, label: '25 miles' },
  { value: 50, label: '50 miles' },
  { value: 100, label: '100 miles' },
  { value: 200, label: '200 miles' },
  { value: 500, label: '500 miles' },
];

export function SearchFilters({ 
  filters, 
  onFiltersChange, 
  onClearFilters,
  availableGenres = MUSIC_GENRES,
  popularLocations = POPULAR_LOCATIONS
}: SearchFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  const updateFilter = (key: keyof SearchFilters, value: any) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const removeFilter = (key: keyof SearchFilters) => {
    const newFilters = { ...filters };
    delete newFilters[key];
    onFiltersChange(newFilters);
  };

  const hasActiveFilters = Object.keys(filters).some(key => {
    const value = filters[key as keyof SearchFilters];
    return value !== undefined && value !== null && value !== '';
  });

  const getActiveFilterCount = () => {
    return Object.keys(filters).filter(key => {
      const value = filters[key as keyof SearchFilters];
      return value !== undefined && value !== null && value !== '';
    }).length;
  };

  return (
    <Card className="border-dashed">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Advanced Filters
                {hasActiveFilters && (
                  <Badge variant="secondary" className="ml-2">
                    {getActiveFilterCount()} active
                  </Badge>
                )}
              </div>
              <ChevronDown className={cn(
                "h-4 w-4 transition-transform",
                isOpen && "rotate-180"
              )} />
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="space-y-6">
            {/* Date Range */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <CalendarIcon className="h-4 w-4" />
                Date Range
              </Label>
              <div className="flex gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "flex-1 justify-start text-left font-normal",
                        !filters.dateFrom && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {filters.dateFrom ? format(filters.dateFrom, 'PPP') : 'From date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={filters.dateFrom}
                      onSelect={(date) => updateFilter('dateFrom', date)}
                      disabled={(date) => date < new Date()}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "flex-1 justify-start text-left font-normal",
                        !filters.dateTo && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {filters.dateTo ? format(filters.dateTo, 'PPP') : 'To date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={filters.dateTo}
                      onSelect={(date) => updateFilter('dateTo', date)}
                      disabled={(date) => date < (filters.dateFrom || new Date())}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Location */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Location
              </Label>
              <div className="space-y-2">
                <Select value={filters.location || ''} onValueChange={(value) => updateFilter('location', value || undefined)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a city or enter custom location" />
                  </SelectTrigger>
                  <SelectContent>
                    {popularLocations.map((location) => (
                      <SelectItem key={location} value={location}>
                        {location}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  placeholder="Or enter a custom location..."
                  value={filters.location || ''}
                  onChange={(e) => updateFilter('location', e.target.value || undefined)}
                />
              </div>
              
              {filters.location && (
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">Search Radius</Label>
                  <Select 
                    value={filters.radius?.toString() || '50'} 
                    onValueChange={(value) => updateFilter('radius', parseInt(value))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {RADIUS_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value.toString()}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Genre */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <Music className="h-4 w-4" />
                Genre
              </Label>
              <Select value={filters.genre || ''} onValueChange={(value) => updateFilter('genre', value || undefined)}>
                <SelectTrigger>
                  <SelectValue placeholder="Any genre" />
                </SelectTrigger>
                <SelectContent>
                  {availableGenres.map((genre) => (
                    <SelectItem key={genre} value={genre}>
                      {genre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Price Range */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Price Range
              </Label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs text-muted-foreground">Min Price</Label>
                  <Input
                    type="number"
                    placeholder="$0"
                    value={filters.priceMin || ''}
                    onChange={(e) => updateFilter('priceMin', e.target.value ? parseInt(e.target.value) : undefined)}
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Max Price</Label>
                  <Input
                    type="number"
                    placeholder="No limit"
                    value={filters.priceMax || ''}
                    onChange={(e) => updateFilter('priceMax', e.target.value ? parseInt(e.target.value) : undefined)}
                  />
                </div>
              </div>
            </div>

            {/* Sort Options */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Sort By
              </Label>
              <Select 
                value={filters.sortBy || 'relevance'} 
                onValueChange={(value) => updateFilter('sortBy', value as SearchFilters['sortBy'])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="relevance">Relevance</SelectItem>
                  <SelectItem value="date">Date</SelectItem>
                  <SelectItem value="popularity">Popularity</SelectItem>
                  <SelectItem value="alphabetical">Alphabetical</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Active Filters Display */}
            {hasActiveFilters && (
              <div className="space-y-3">
                <Label>Active Filters</Label>
                <div className="flex flex-wrap gap-2">
                  {filters.dateFrom && (
                    <Badge variant="secondary" className="gap-1">
                      From: {format(filters.dateFrom, 'MMM dd, yyyy')}
                      <X 
                        className="h-3 w-3 cursor-pointer" 
                        onClick={() => removeFilter('dateFrom')}
                      />
                    </Badge>
                  )}
                  {filters.dateTo && (
                    <Badge variant="secondary" className="gap-1">
                      To: {format(filters.dateTo, 'MMM dd, yyyy')}
                      <X 
                        className="h-3 w-3 cursor-pointer" 
                        onClick={() => removeFilter('dateTo')}
                      />
                    </Badge>
                  )}
                  {filters.location && (
                    <Badge variant="secondary" className="gap-1">
                      Location: {filters.location}
                      <X 
                        className="h-3 w-3 cursor-pointer" 
                        onClick={() => removeFilter('location')}
                      />
                    </Badge>
                  )}
                  {filters.genre && (
                    <Badge variant="secondary" className="gap-1">
                      Genre: {filters.genre}
                      <X 
                        className="h-3 w-3 cursor-pointer" 
                        onClick={() => removeFilter('genre')}
                      />
                    </Badge>
                  )}
                  {(filters.priceMin !== undefined || filters.priceMax !== undefined) && (
                    <Badge variant="secondary" className="gap-1">
                      Price: ${filters.priceMin || 0} - ${filters.priceMax || '∞'}
                      <X 
                        className="h-3 w-3 cursor-pointer" 
                        onClick={() => {
                          removeFilter('priceMin');
                          removeFilter('priceMax');
                        }}
                      />
                    </Badge>
                  )}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2 pt-4 border-t">
              <Button 
                variant="outline" 
                onClick={onClearFilters}
                disabled={!hasActiveFilters}
                className="flex-1"
              >
                Clear All Filters
              </Button>
              <Button 
                onClick={() => setIsOpen(false)}
                className="flex-1"
              >
                Apply Filters
              </Button>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}