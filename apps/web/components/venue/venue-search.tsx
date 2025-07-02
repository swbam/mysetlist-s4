'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { SearchBox } from '@repo/design-system';
import { VenueCard } from '@repo/design-system';
import { Card, CardContent, CardHeader, CardTitle } from '@repo/design-system';
import { Button } from '@repo/design-system';
import { Badge } from '@repo/design-system';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@repo/design-system';
import { 
  MapPin, 
  Search, 
  Filter, 
  Grid3X3, 
  List,
  Users,
  Calendar,
  TrendingUp,
  Music
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@repo/design-system';
import { cn } from '@repo/design-system/lib/utils';
import { toast } from 'sonner';

interface Venue {
  id: string;
  name: string;
  slug: string;
  imageUrl?: string | null;
  address?: string | null;
  city: string;
  state?: string | null;
  country: string;
  capacity?: number | null;
  upcomingShows?: number;
  totalShows?: number;
  website?: string | null;
  verified?: boolean;
}

interface VenueSearchProps {
  initialVenues?: Venue[];
  title?: string;
  variant?: 'grid' | 'list';
  showFilters?: boolean;
  className?: string;
}

export function VenueSearch({
  initialVenues = [],
  title = 'Venues',
  variant = 'grid',
  showFilters = true,
  className
}: VenueSearchProps) {
  const router = useRouter();
  const [venues, setVenues] = useState<Venue[]>(initialVenues);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(variant);
  const [sortBy, setSortBy] = useState('popularity');
  const [filterBy, setFilterBy] = useState('all');
  const [locationFilter, setLocationFilter] = useState('');

  // Fetch venues when filters change
  useEffect(() => {
    if (initialVenues.length === 0) {
      fetchVenues(true);
    }
  }, [searchQuery, sortBy, filterBy, locationFilter]);

  const buildSearchUrl = (query: string) => {
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    params.set('type', 'venue');
    params.set('limit', '20');
    return `/api/search?${params.toString()}`;
  };

  const buildVenuesUrl = (pageNum: number, reset: boolean = false) => {
    const params = new URLSearchParams();
    params.set('page', pageNum.toString());
    params.set('limit', '20');
    params.set('sort', sortBy);
    
    if (filterBy !== 'all') {
      params.set('filter', filterBy);
    }
    if (locationFilter) {
      params.set('location', locationFilter);
    }
    if (searchQuery) {
      params.set('q', searchQuery);
    }
    
    return `/api/venues?${params.toString()}`;
  };

  const handleSearch = async (query: string) => {
    if (query.length < 2) return [];

    try {
      const response = await fetch(buildSearchUrl(query));
      if (response.ok) {
        const data = await response.json();
        return data.results?.filter((result: any) => result.type === 'venue') || [];
      }
    } catch (error) {
      console.error('Venue search failed:', error);
    }
    
    return [];
  };

  const fetchVenues = async (reset: boolean = false) => {
    setLoading(true);
    try {
      const pageNum = reset ? 1 : page;
      const url = buildVenuesUrl(pageNum, reset);
      const response = await fetch(url);
      
      if (response.ok) {
        const data = await response.json();
        const newVenues = data.venues || [];
        
        if (reset) {
          setVenues(newVenues);
          setPage(2);
        } else {
          setVenues(prev => [...prev, ...newVenues]);
          setPage(prev => prev + 1);
        }
        
        setHasMore(newVenues.length === 20);
      } else {
        throw new Error('Failed to fetch venues');
      }
    } catch (error) {
      console.error('Failed to fetch venues:', error);
      toast.error('Failed to load venues');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSelect = (result: any) => {
    if (result.type === 'venue') {
      router.push(`/venues/${result.slug}`);
    } else {
      setSearchQuery(result.title);
      fetchVenues(true);
    }
  };

  const handleSearchSubmit = (query: string) => {
    setSearchQuery(query);
    setPage(1);
  };

  const handleVenueClick = (venue: Venue) => {
    router.push(`/venues/${venue.slug}`);
  };

  const handleLoadMore = () => {
    if (!loading && hasMore) {
      fetchVenues(false);
    }
  };

  const handleSortChange = (newSort: string) => {
    setSortBy(newSort);
    setPage(1);
  };

  const handleFilterChange = (newFilter: string) => {
    setFilterBy(newFilter);
    setPage(1);
  };

  const getSortLabel = (sort: string) => {
    switch (sort) {
      case 'name': return 'Name A-Z';
      case 'popularity': return 'Most Popular';
      case 'capacity': return 'Largest First';
      case 'shows': return 'Most Shows';
      default: return 'Sort';
    }
  };

  const getFilterLabel = (filter: string) => {
    switch (filter) {
      case 'all': return 'All Venues';
      case 'verified': return 'Verified Only';
      case 'has-shows': return 'With Upcoming Shows';
      case 'large': return 'Large Venues (5K+)';
      default: return 'Filter';
    }
  };

  const getGridClasses = () => {
    if (viewMode === 'list') {
      return 'space-y-4';
    }
    return 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4';
  };

  const popularCities = [
    'New York, NY',
    'Los Angeles, CA', 
    'Chicago, IL',
    'Nashville, TN',
    'Austin, TX',
    'London, UK',
    'Toronto, ON',
    'Sydney, AU'
  ];

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold mb-1">{title}</h2>
          <p className="text-muted-foreground">
            {venues.length} venue{venues.length !== 1 ? 's' : ''}
            {loading && ' (loading...)'}
          </p>
        </div>
        
        {showFilters && (
          <div className="flex items-center gap-2">
            {/* View Mode Toggle */}
            <div className="flex items-center border rounded-lg">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
                className="rounded-r-none"
              >
                <Grid3X3 className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
                className="rounded-l-none border-l"
              >
                <List className="h-4 w-4" />
              </Button>
            </div>

            {/* Sort Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <TrendingUp className="h-4 w-4" />
                  {getSortLabel(sortBy)}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleSortChange('popularity')}>
                  Most Popular
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleSortChange('name')}>
                  Name A-Z
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleSortChange('capacity')}>
                  Largest First
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleSortChange('shows')}>
                  Most Shows
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Filter Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Filter className="h-4 w-4" />
                  {getFilterLabel(filterBy)}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleFilterChange('all')}>
                  All Venues
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleFilterChange('verified')}>
                  Verified Only
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleFilterChange('has-shows')}>
                  With Upcoming Shows
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleFilterChange('large')}>
                  Large Venues (5K+)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>

      {/* Search */}
      <SearchBox
        placeholder="Search venues by name or location..."
        onSearch={handleSearch}
        onSelect={handleSearchSelect}
        onSubmit={handleSearchSubmit}
        className="w-full max-w-2xl"
      />

      {/* Popular Cities */}
      {!searchQuery && !locationFilter && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Popular Cities
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {popularCities.map((city) => (
                <Badge
                  key={city}
                  variant="secondary"
                  className="cursor-pointer hover:bg-secondary/80"
                  onClick={() => {
                    setLocationFilter(city);
                    setPage(1);
                  }}
                >
                  {city}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Venues Grid/List */}
      {venues.length > 0 ? (
        <div className={getGridClasses()}>
          {venues.map((venue) => (
            <div
              key={venue.id}
              className="cursor-pointer"
              onClick={() => handleVenueClick(venue)}
            >
              <VenueCard
                venue={{
                  ...venue,
                  upcomingShows: venue.upcomingShows || 0,
                }}
                variant={viewMode === 'list' ? 'detailed' : 'default'}
              />
            </div>
          ))}
        </div>
      ) : !loading ? (
        <Card>
          <CardContent className="p-12 text-center">
            <MapPin className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-30" />
            <h3 className="text-xl font-semibold mb-2">No venues found</h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              {searchQuery || locationFilter
                ? "Try adjusting your search terms or exploring different cities."
                : "Start by searching for venues in your city or explore popular locations."}
            </p>
            {(searchQuery || locationFilter) && (
              <Button
                variant="outline"
                onClick={() => {
                  setSearchQuery('');
                  setLocationFilter('');
                  setPage(1);
                }}
                className="gap-2"
              >
                <Search className="h-4 w-4" />
                Clear filters
              </Button>
            )}
          </CardContent>
        </Card>
      ) : null}

      {/* Loading */}
      {loading && venues.length === 0 && (
        <div className={getGridClasses()}>
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <div className="aspect-video bg-muted animate-pulse" />
              <div className="p-4 space-y-2">
                <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
                <div className="h-3 bg-muted rounded animate-pulse w-1/2" />
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Load More */}
      {hasMore && !loading && venues.length > 0 && (
        <div className="flex justify-center pt-6">
          <Button variant="outline" onClick={handleLoadMore} className="gap-2">
            <MapPin className="h-4 w-4" />
            Load More Venues
          </Button>
        </div>
      )}

      {/* Loading More */}
      {loading && venues.length > 0 && (
        <div className="flex justify-center py-8">
          <div className="flex items-center gap-2 text-muted-foreground">
            <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            Loading more venues...
          </div>
        </div>
      )}
    </div>
  );
}