'use client';

import { Input } from '@repo/design-system/components/ui/input';
import { Button } from '@repo/design-system/components/ui/button';
import { Badge } from '@repo/design-system/components/ui/badge';
import { Calendar } from '@repo/design-system/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@repo/design-system/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@repo/design-system/components/ui/select';
import { MapPin, CalendarIcon, TrendingUp, Clock, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { format, addDays, startOfWeek, endOfWeek, addWeeks } from 'date-fns';
import { useRouter, useSearchParams } from 'next/navigation';
import { fetchCities } from '../actions';

export const ShowsFilter = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [city, setCity] = useState(searchParams.get('city') || '');
  const [dateFrom, setDateFrom] = useState<Date | undefined>(
    searchParams.get('dateFrom') ? new Date(searchParams.get('dateFrom')!) : undefined
  );
  const [dateTo, setDateTo] = useState<Date | undefined>(
    searchParams.get('dateTo') ? new Date(searchParams.get('dateTo')!) : undefined
  );
  const [orderBy, setOrderBy] = useState(searchParams.get('orderBy') || 'date');
  const [availableCities, setAvailableCities] = useState<string[]>([]);

  useEffect(() => {
    // Load available cities
    fetchCities().then(cities => setAvailableCities(cities));
  }, []);

  const applyFilters = () => {
    const params = new URLSearchParams();
    
    if (city) params.set('city', city);
    if (dateFrom) params.set('dateFrom', format(dateFrom, 'yyyy-MM-dd'));
    if (dateTo) params.set('dateTo', format(dateTo, 'yyyy-MM-dd'));
    if (orderBy !== 'date') params.set('orderBy', orderBy);
    
    router.push(`/shows?${params.toString()}`);
  };

  const clearFilters = () => {
    setCity('');
    setDateFrom(undefined);
    setDateTo(undefined);
    setOrderBy('date');
    router.push('/shows');
  };

  const setThisWeekend = () => {
    const now = new Date();
    // Get this weekend (Saturday and Sunday)
    const startOfCurrentWeek = startOfWeek(now, { weekStartsOn: 1 }); // Monday start
    const weekendStart = addDays(startOfCurrentWeek, 5); // Saturday
    const weekendEnd = addDays(startOfCurrentWeek, 6); // Sunday
    setDateFrom(weekendStart);
    setDateTo(weekendEnd);
  };

  const setNext30Days = () => {
    const now = new Date();
    setDateFrom(now);
    setDateTo(addDays(now, 30));
  };

  const hasActiveFilters = city || dateFrom || dateTo || orderBy !== 'date';

  return (
    <div className="flex flex-col gap-4 p-4 border rounded-lg bg-card">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Select value={city} onValueChange={setCity}>
          <SelectTrigger>
            <MapPin className="mr-2 h-4 w-4" />
            <SelectValue placeholder="All cities" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All cities</SelectItem>
            {availableCities.map(cityName => (
              <SelectItem key={cityName} value={cityName}>
                {cityName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="justify-start text-left font-normal">
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateFrom ? (
                dateTo ? (
                  `${format(dateFrom, 'MMM d')} - ${format(dateTo, 'MMM d')}`
                ) : (
                  format(dateFrom, 'PPP')
                )
              ) : (
                'Date range'
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <div className="p-3 space-y-3">
              <div>
                <p className="text-sm font-medium mb-2">From</p>
                <Calendar
                  mode="single"
                  selected={dateFrom}
                  onSelect={setDateFrom}
                  initialFocus
                />
              </div>
              <div>
                <p className="text-sm font-medium mb-2">To</p>
                <Calendar
                  mode="single"
                  selected={dateTo}
                  onSelect={setDateTo}
                  disabled={(date) => dateFrom ? date < dateFrom : false}
                />
              </div>
            </div>
          </PopoverContent>
        </Popover>
        
        <Select value={orderBy} onValueChange={setOrderBy}>
          <SelectTrigger>
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="date">
              <div className="flex items-center">
                <Clock className="mr-2 h-4 w-4" />
                Date
              </div>
            </SelectItem>
            <SelectItem value="trending">
              <div className="flex items-center">
                <TrendingUp className="mr-2 h-4 w-4" />
                Trending
              </div>
            </SelectItem>
            <SelectItem value="popularity">
              <div className="flex items-center">
                <TrendingUp className="mr-2 h-4 w-4" />
                Popularity
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
        
        <div className="flex gap-2">
          <Button onClick={applyFilters} className="flex-1">
            Apply Filters
          </Button>
          {hasActiveFilters && (
            <Button 
              variant="outline" 
              size="icon"
              onClick={clearFilters}
              title="Clear filters"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        <p className="text-sm text-muted-foreground">Quick filters:</p>
        <Button
          variant="outline"
          size="sm"
          onClick={setThisWeekend}
        >
          This Weekend
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={setNext30Days}
        >
          Next 30 Days
        </Button>
      </div>
    </div>
  );
};