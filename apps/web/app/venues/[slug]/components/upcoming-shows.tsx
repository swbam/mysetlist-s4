'use client';

import { Badge } from '@repo/design-system/components/ui/badge';
import { Button } from '@repo/design-system/components/ui/button';
import { Card } from '@repo/design-system/components/ui/card';
import { Input } from '@repo/design-system/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@repo/design-system/components/ui/select';
import {
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import {
  Calendar,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Filter,
  List,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useMemo, useState } from 'react';

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

export function UpcomingShows({ shows, venueId: _venueId }: UpcomingShowsProps) {
  const [view, setView] = useState<'list' | 'calendar'>('list');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState('all');
  const [genreFilter, setGenreFilter] = useState('all');

  // Extract unique genres from shows
  const availableGenres = useMemo(() => {
    const genres = new Set<string>();
    shows.forEach((show) => {
      show.artist.genres?.forEach((genre) => genres.add(genre));
    });
    return Array.from(genres).sort();
  }, [shows]);

  // Filter shows based on search and filters
  const filteredShows = useMemo(() => {
    let filtered = shows;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (show) =>
          show.artist.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          show.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Date range filter
    if (dateRange !== 'all') {
      const now = new Date();
      const days = dateRange === 'week' ? 7 : dateRange === 'month' ? 30 : 90;
      const maxDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

      filtered = filtered.filter(
        (show) => new Date(show.date) >= now && new Date(show.date) <= maxDate
      );
    }

    // Genre filter
    if (genreFilter !== 'all') {
      filtered = filtered.filter((show) =>
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
    filteredShows.forEach((show) => {
      const dateKey = format(new Date(show.date), 'yyyy-MM-dd');
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(show);
    });
    return grouped;
  }, [filteredShows]);

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + (direction === 'next' ? 1 : -1));
      return newDate;
    });
  };

  if (shows.length === 0) {
    return (
      <Card className="p-8 text-center">
        <Calendar className="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
        <h3 className="mb-2 font-semibold text-lg">No Upcoming Shows</h3>
        <p className="text-muted-foreground">
          Check back later for upcoming performances at this venue.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-2xl">Upcoming Shows</h2>
        <Badge variant="secondary">{filteredShows.length} shows</Badge>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="space-y-4">
          <div className="mb-3 flex items-center gap-2">
            <Filter className="h-4 w-4" />
            <span className="font-medium">Filters</span>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
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
                  {availableGenres.map((genre) => (
                    <SelectItem key={genre} value={genre}>
                      {genre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <div className="flex gap-1 rounded-md border p-1">
              <Button
                variant={view === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setView('list')}
                className="flex-1"
              >
                <List className="mr-1 h-4 w-4" />
                List
              </Button>
              <Button
                variant={view === 'calendar' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setView('calendar')}
                className="flex-1"
              >
                <CalendarDays className="mr-1 h-4 w-4" />
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
              <Calendar className="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
              <h3 className="mb-2 font-semibold text-lg">No Shows Found</h3>
              <p className="text-muted-foreground">
                Try adjusting your filters to see more shows.
              </p>
            </Card>
          ) : (
            filteredShows.map((show) => (
              <Card key={show.id} className="overflow-hidden">
                <Link href={`/shows/${show.id}`}>
                  <div className="flex items-center gap-4 p-4 transition-colors hover:bg-muted/50">
                    {/* Artist Image */}
                    <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg bg-muted">
                      {show.artist.imageUrl ? (
                        <Image
                          src={show.artist.imageUrl}
                          alt={show.artist.name}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <span className="font-semibold text-2xl text-muted-foreground">
                            {show.artist.name.charAt(0)}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Show Details */}
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate font-semibold text-lg">
                        {show.artist.name}
                      </h3>
                      <p className="text-muted-foreground text-sm">
                        {show.name}
                      </p>
                      <div className="mt-1 flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground text-sm">
                          {format(
                            new Date(show.date),
                            'EEE, MMM d, yyyy • h:mm a'
                          )}
                        </span>
                      </div>
                      {show.artist.genres && show.artist.genres.length > 0 && (
                        <div className="mt-2 flex gap-1">
                          {show.artist.genres.slice(0, 2).map((genre) => (
                            <Badge
                              key={genre}
                              variant="outline"
                              className="text-xs"
                            >
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
                        <ExternalLink className="ml-1 h-3 w-3" />
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
          <div className="mb-6 flex items-center justify-between">
            <h3 className="font-semibold text-lg">
              {format(currentDate, 'MMMM yyyy')}
            </h3>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateMonth('prev')}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentDate(new Date())}
              >
                Today
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateMonth('next')}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="mb-2 grid grid-cols-7 gap-1">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div
                key={day}
                className="p-2 text-center font-medium text-muted-foreground text-sm"
              >
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day) => {
              const dateKey = format(day, 'yyyy-MM-dd');
              const dayShows = showsByDate[dateKey] || [];
              const isCurrentMonth = day.getMonth() === currentDate.getMonth();
              const isToday = isSameDay(day, new Date());

              return (
                <div
                  key={day.toISOString()}
                  className={`min-h-[100px] rounded-lg border p-2 ${
                    isCurrentMonth ? 'bg-background' : 'bg-muted/30'
                  } ${isToday ? 'ring-2 ring-primary' : ''}`}
                >
                  <div
                    className={`text-sm ${isCurrentMonth ? 'text-foreground' : 'text-muted-foreground'} ${isToday ? 'font-bold' : ''}`}
                  >
                    {format(day, 'd')}
                  </div>

                  <div className="mt-1 space-y-1">
                    {dayShows.slice(0, 2).map((show) => (
                      <Link
                        key={show.id}
                        href={`/shows/${show.id}`}
                        className="block"
                      >
                        <div className="truncate rounded bg-primary/10 p-1 text-primary text-xs transition-colors hover:bg-primary/20">
                          {show.artist.name}
                        </div>
                      </Link>
                    ))}
                    {dayShows.length > 2 && (
                      <div className="text-muted-foreground text-xs">
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
        <div className="pt-4 text-center">
          <p className="text-muted-foreground text-sm">
            Showing {filteredShows.length} of {shows.length} shows
          </p>
        </div>
      )}
    </div>
  );
}
