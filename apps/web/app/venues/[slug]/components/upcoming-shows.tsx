'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, startOfWeek, endOfWeek } from 'date-fns';
import { Calendar, ExternalLink, CalendarDays, List, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import { Card } from '@repo/design-system/components/ui/card';
import { Button } from '@repo/design-system/components/ui/button';
import { Badge } from '@repo/design-system/components/ui/badge';
import { Input } from '@repo/design-system/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@repo/design-system/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@repo/design-system/components/ui/tabs';

interface Show {
  id: string;
  name: string;
  date: Date;
  ticketUrl: string | null;
  artist: {
    id: string;
    name: string;
    slug: string;
    imageUrl: string | null;
    genres?: string[];
  };
}

interface UpcomingShowsProps {
  shows: Show[];
  venueId: string;
}

export function UpcomingShows({ shows, venueId }: UpcomingShowsProps) {
  const [view, setView] = useState<'list' | 'calendar'>('list');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState('all');
  const [genreFilter, setGenreFilter] = useState('all');

  // Extract unique genres from shows
  const availableGenres = useMemo(() => {
    const genres = new Set<string>();
    shows.forEach(show => {
      show.artist.genres?.forEach(genre => genres.add(genre));
    });
    return Array.from(genres).sort();
  }, [shows]);

  // Filter shows based on search and filters
  const filteredShows = useMemo(() => {
    let filtered = shows;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(show => 
        show.artist.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        show.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Date range filter
    if (dateRange !== 'all') {
      const now = new Date();
      const days = dateRange === 'week' ? 7 : dateRange === 'month' ? 30 : 90;
      const maxDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
      
      filtered = filtered.filter(show => 
        new Date(show.date) >= now && new Date(show.date) <= maxDate
      );
    }

    // Genre filter
    if (genreFilter !== 'all') {
      filtered = filtered.filter(show => 
        show.artist.genres?.includes(genreFilter)
      );
    }

    return filtered;
  }, [shows, searchTerm, dateRange, genreFilter]);

  // Get calendar days for current month
  const calendarDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentDate));
    const end = endOfWeek(endOfMonth(currentDate));
    return eachDayOfInterval({ start, end });
  }, [currentDate]);

  // Group shows by date for calendar view
  const showsByDate = useMemo(() => {
    const grouped: Record<string, Show[]> = {};
    filteredShows.forEach(show => {
      const dateKey = format(new Date(show.date), 'yyyy-MM-dd');
      if (!grouped[dateKey]) grouped[dateKey] = [];
      grouped[dateKey].push(show);
    });
    return grouped;
  }, [filteredShows]);

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + (direction === 'next' ? 1 : -1));
      return newDate;
    });
  };

  if (shows.length === 0) {
    return (
      <Card className="p-8 text-center">
        <Calendar className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">No Upcoming Shows</h3>
        <p className="text-muted-foreground">
          Check back later for upcoming performances at this venue.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Upcoming Shows</h2>
        <Badge variant="secondary">{filteredShows.length} shows</Badge>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="w-4 h-4" />
            <span className="font-medium">Filters</span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Input
                placeholder="Search artists or shows..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger>
                <SelectValue placeholder="Date range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All dates</SelectItem>
                <SelectItem value="week">Next 7 days</SelectItem>
                <SelectItem value="month">Next 30 days</SelectItem>
                <SelectItem value="quarter">Next 3 months</SelectItem>
              </SelectContent>
            </Select>

            {availableGenres.length > 0 && (
              <Select value={genreFilter} onValueChange={setGenreFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Genre" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All genres</SelectItem>
                  {availableGenres.map(genre => (
                    <SelectItem key={genre} value={genre}>{genre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <div className="flex gap-1 border rounded-md p-1">
              <Button
                variant={view === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setView('list')}
                className="flex-1"
              >
                <List className="w-4 h-4 mr-1" />
                List
              </Button>
              <Button
                variant={view === 'calendar' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setView('calendar')}
                className="flex-1"
              >
                <CalendarDays className="w-4 h-4 mr-1" />
                Calendar
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Views */}
      {view === 'list' ? (
        <div className="grid gap-4">
          {filteredShows.length === 0 ? (
            <Card className="p-8 text-center">
              <Calendar className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Shows Found</h3>
              <p className="text-muted-foreground">
                Try adjusting your filters to see more shows.
              </p>
            </Card>
          ) : (
            filteredShows.map((show) => (
              <Card key={show.id} className="overflow-hidden">
                <Link href={`/shows/${show.id}`}>
                  <div className="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors">
                    {/* Artist Image */}
                    <div className="relative w-20 h-20 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                      {show.artist.imageUrl ? (
                        <Image
                          src={show.artist.imageUrl}
                          alt={show.artist.name}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="text-2xl font-semibold text-muted-foreground">
                            {show.artist.name.charAt(0)}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Show Details */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-lg truncate">
                        {show.artist.name}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {show.name}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          {format(new Date(show.date), 'EEE, MMM d, yyyy • h:mm a')}
                        </span>
                      </div>
                      {show.artist.genres && show.artist.genres.length > 0 && (
                        <div className="flex gap-1 mt-2">
                          {show.artist.genres.slice(0, 2).map(genre => (
                            <Badge key={genre} variant="outline" className="text-xs">
                              {genre}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Ticket Button */}
                    {show.ticketUrl && (
                      <Button
                        size="sm"
                        variant="default"
                        className="flex-shrink-0"
                        onClick={(e) => {
                          e.preventDefault();
                          if (show.ticketUrl) {
                            window.open(show.ticketUrl, '_blank');
                          }
                        }}
                      >
                        Tickets
                        <ExternalLink className="w-3 h-3 ml-1" />
                      </Button>
                    )}
                  </div>
                </Link>
              </Card>
            ))
          )}
        </div>
      ) : (
        /* Calendar View */
        <Card className="p-6">
          {/* Calendar Header */}
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold">
              {format(currentDate, 'MMMM yyyy')}
            </h3>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => navigateMonth('prev')}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}>
                Today
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigateMonth('next')}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="p-2 text-center text-sm font-medium text-muted-foreground">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map(day => {
              const dateKey = format(day, 'yyyy-MM-dd');
              const dayShows = showsByDate[dateKey] || [];
              const isCurrentMonth = day.getMonth() === currentDate.getMonth();
              const isToday = isSameDay(day, new Date());
              
              return (
                <div
                  key={day.toISOString()}
                  className={`min-h-[100px] p-2 border rounded-lg ${
                    isCurrentMonth ? 'bg-background' : 'bg-muted/30'
                  } ${isToday ? 'ring-2 ring-primary' : ''}`}
                >
                  <div className={`text-sm ${isCurrentMonth ? 'text-foreground' : 'text-muted-foreground'} ${isToday ? 'font-bold' : ''}`}>
                    {format(day, 'd')}
                  </div>
                  
                  <div className="space-y-1 mt-1">
                    {dayShows.slice(0, 2).map(show => (
                      <Link
                        key={show.id}
                        href={`/shows/${show.id}`}
                        className="block"
                      >
                        <div className="text-xs p-1 bg-primary/10 text-primary rounded truncate hover:bg-primary/20 transition-colors">
                          {show.artist.name}
                        </div>
                      </Link>
                    ))}
                    {dayShows.length > 2 && (
                      <div className="text-xs text-muted-foreground">
                        +{dayShows.length - 2} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {filteredShows.length >= 20 && (
        <div className="text-center pt-4">
          <p className="text-sm text-muted-foreground">
            Showing {filteredShows.length} of {shows.length} shows
          </p>
        </div>
      )}
    </div>
  );
}