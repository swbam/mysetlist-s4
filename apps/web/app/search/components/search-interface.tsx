'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@repo/design-system/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@repo/design-system/components/ui/card';
import { Badge } from '@repo/design-system/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@repo/design-system/components/ui/tabs';
import { Skeleton } from '@repo/design-system/components/ui/skeleton';
import { Search, Music, MapPin, Calendar, Users, ExternalLink, Heart, TrendingUp, Filter, Star } from 'lucide-react';
import { format } from 'date-fns';
import Link from 'next/link';
import Image from 'next/image';
import { toast } from 'sonner';
import { cn } from '@repo/design-system/lib/utils';
import { SearchAutocomplete } from '@/components/search/search-autocomplete';
import { SearchFilters } from '@/components/search/search-filters';
import { SearchResultCard } from '@/components/search/search-result-card';

interface SearchFiltersType {
  dateFrom?: Date;
  dateTo?: Date;
  location?: string;
  genre?: string;
  priceMin?: number;
  priceMax?: number;
  radius?: number;
  sortBy?: 'relevance' | 'date' | 'popularity' | 'alphabetical';
}

interface SearchSuggestion {
  id: string;
  type: 'artist' | 'show' | 'venue' | 'genre' | 'location' | 'recent' | 'trending';
  title: string;
  subtitle?: string;
  imageUrl?: string;
  metadata?: {
    popularity?: number;
    upcomingShows?: number;
    followerCount?: number;
    capacity?: number;
    showDate?: string;
  };
}

type SearchResult = {
  id: string;
  type: 'artist' | 'show' | 'venue';
  title: string;
  subtitle: string;
  imageUrl?: string | null;
  slug: string;
  verified?: boolean;
  popularity?: number;
  genres?: string[];
  showCount?: number;
  followerCount?: number;
  date?: string;
  venue?: {
    name: string;
    city: string;
    state: string;
  };
  artist?: {
    name: string;
    slug: string;
  };
  capacity?: number;
  price?: {
    min: number;
    max: number;
    currency: string;
  };
};

type ComprehensiveSearchResults = {
  artists: SearchResult[];
  shows: SearchResult[];
  venues: SearchResult[];
  total: number;
  query: string;
  filters: SearchFiltersType;
  suggestions?: string[];
};

export function SearchInterface() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [results, setResults] = useState<ComprehensiveSearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [followingArtists, setFollowingArtists] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState<SearchFiltersType>({
    sortBy: 'relevance',
  });

  // Initialize filters from URL params
  useEffect(() => {
    const urlFilters: SearchFiltersType = {
      dateFrom: searchParams.get('dateFrom') ? new Date(searchParams.get('dateFrom')!) : undefined,
      dateTo: searchParams.get('dateTo') ? new Date(searchParams.get('dateTo')!) : undefined,
      location: searchParams.get('location') || undefined,
      genre: searchParams.get('genre') || undefined,
      priceMin: searchParams.get('priceMin') ? parseInt(searchParams.get('priceMin')!) : undefined,
      priceMax: searchParams.get('priceMax') ? parseInt(searchParams.get('priceMax')!) : undefined,
      radius: searchParams.get('radius') ? parseInt(searchParams.get('radius')!) : undefined,
      sortBy: (searchParams.get('sortBy') as SearchFiltersType['sortBy']) || 'relevance',
    };
    setFilters(urlFilters);
  }, [searchParams]);

  // Perform search when query or filters change
  useEffect(() => {
    const q = searchParams.get('q');
    if (q && q !== query) {
      setQuery(q);
    }
    if (q) {
      performSearch(q, filters);
    }
  }, [searchParams, filters]);

  // Check if user is following artists
  useEffect(() => {
    const checkFollowingStatus = async () => {
      if (!results?.artists.length) return;
      
      try {
        const response = await fetch('/api/user/following');
        if (response.ok) {
          const data = await response.json();
          setFollowingArtists(new Set(data.artistIds));
        }
      } catch (error) {
        console.error('Failed to fetch following status:', error);
      }
    };

    checkFollowingStatus();
  }, [results]);

  const buildSearchUrl = useCallback((searchQuery: string, searchFilters: SearchFiltersType) => {
    const params = new URLSearchParams();
    params.set('q', searchQuery);
    
    if (searchFilters.dateFrom) {
      params.set('dateFrom', searchFilters.dateFrom.toISOString().split('T')[0]);
    }
    if (searchFilters.dateTo) {
      params.set('dateTo', searchFilters.dateTo.toISOString().split('T')[0]);
    }
    if (searchFilters.location) {
      params.set('location', searchFilters.location);
    }
    if (searchFilters.genre) {
      params.set('genre', searchFilters.genre);
    }
    if (searchFilters.priceMin !== undefined) {
      params.set('priceMin', searchFilters.priceMin.toString());
    }
    if (searchFilters.priceMax !== undefined) {
      params.set('priceMax', searchFilters.priceMax.toString());
    }
    if (searchFilters.radius !== undefined) {
      params.set('radius', searchFilters.radius.toString());
    }
    if (searchFilters.sortBy && searchFilters.sortBy !== 'relevance') {
      params.set('sortBy', searchFilters.sortBy);
    }
    
    return `/api/search?${params.toString()}`;
  }, []);

  const performSearch = async (searchQuery: string, searchFilters: SearchFiltersType = filters) => {
    if (!searchQuery.trim()) {
      setResults(null);
      return;
    }

    setLoading(true);
    try {
      const url = buildSearchUrl(searchQuery, searchFilters);
      const response = await fetch(url);
      
      if (response.ok) {
        const data = await response.json();
        setResults(data);
        
        // Update URL with search params
        const newUrl = new URL(window.location.href);
        const params = new URLSearchParams();
        params.set('q', searchQuery);
        
        Object.entries(searchFilters).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== '') {
            if (value instanceof Date) {
              params.set(key, value.toISOString().split('T')[0]);
            } else {
              params.set(key, value.toString());
            }
          }
        });
        
        newUrl.search = params.toString();
        router.replace(newUrl.toString());
      }
    } catch (error) {
      console.error('Search failed:', error);
      toast.error('Search failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    performSearch(query, filters);
  };

  const handleSuggestionSelect = (suggestion: SearchSuggestion) => {
    if (suggestion.type === 'genre') {
      setFilters(prev => ({ ...prev, genre: suggestion.title }));
    } else if (suggestion.type === 'location') {
      setFilters(prev => ({ ...prev, location: suggestion.title }));
    }
    // Auto-search when suggestion is selected
    performSearch(suggestion.title, filters);
  };

  const handleFiltersChange = (newFilters: SearchFiltersType) => {
    setFilters(newFilters);
    if (query) {
      performSearch(query, newFilters);
    }
  };

  const handleClearFilters = () => {
    const clearedFilters: SearchFiltersType = { sortBy: 'relevance' };
    setFilters(clearedFilters);
    if (query) {
      performSearch(query, clearedFilters);
    }
  };

  const handleFollow = async (artistId: string, currentlyFollowing: boolean) => {
    try {
      const response = await fetch(`/api/artists/${artistId}/follow`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          following: !currentlyFollowing,
        }),
      });

      if (response.ok) {
        if (currentlyFollowing) {
          setFollowingArtists(prev => {
            const next = new Set(prev);
            next.delete(artistId);
            return next;
          });
          toast.success('Unfollowed artist');
        } else {
          setFollowingArtists(prev => new Set(prev).add(artistId));
          toast.success('Following artist');
        }
      } else if (response.status === 401) {
        toast.error('Please sign in to follow artists');
        router.push('/auth/sign-in');
      }
    } catch (error) {
      toast.error('Failed to update follow status');
    }
  };

  const resultCounts = results ? {
    all: results.total,
    artists: results.artists.length,
    shows: results.shows.length,
    venues: results.venues.length,
  } : { all: 0, artists: 0, shows: 0, venues: 0 };

  return (
    <div className="space-y-6">
      {/* Enhanced Search Form */}
      <div className="space-y-4">
        <SearchAutocomplete
          value={query}
          onChange={setQuery}
          onSelect={handleSuggestionSelect}
          onSearch={handleSearch}
          placeholder="Search artists, shows, venues..."
          disabled={loading}
        />
        
        {/* Advanced Filters */}
        <SearchFilters
          filters={filters}
          onFiltersChange={handleFiltersChange}
          onClearFilters={handleClearFilters}
        />
      </div>

      {/* Loading State */}
      {loading && (
        <div className="text-center py-8">
          <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-muted-foreground">Searching Ticketmaster...</p>
        </div>
      )}

      {/* Search Results Summary */}
      {results && !loading && (
        <div className="flex items-center justify-between py-4 border-b">
          <div>
            <h2 className="text-2xl font-bold">
              {results.total} results for "{results.query}"
            </h2>
            {results.suggestions && results.suggestions.length > 0 && (
              <div className="flex items-center gap-2 mt-2">
                <span className="text-sm text-muted-foreground">Suggestions:</span>
                {results.suggestions.map((suggestion, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setQuery(suggestion);
                      performSearch(suggestion, filters);
                    }}
                  >
                    {suggestion}
                  </Button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Results Tabs */}
      {results && !loading && (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="all" className="gap-2">
              <Search className="h-4 w-4" />
              All ({resultCounts.all})
            </TabsTrigger>
            <TabsTrigger value="artists" className="gap-2">
              <Music className="h-4 w-4" />
              Artists ({resultCounts.artists})
            </TabsTrigger>
            <TabsTrigger value="shows" className="gap-2">
              <Calendar className="h-4 w-4" />
              Shows ({resultCounts.shows})
            </TabsTrigger>
            <TabsTrigger value="venues" className="gap-2">
              <MapPin className="h-4 w-4" />
              Venues ({resultCounts.venues})
            </TabsTrigger>
          </TabsList>

          {/* All Results Tab */}
          <TabsContent value="all" className="mt-6">
            <div className="space-y-6">
              {results.artists.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Music className="h-5 w-5" />
                    Artists
                  </h3>
                  <div className="grid gap-4">
                    {results.artists.slice(0, 3).map((artist) => (
                      <SearchResultCard key={artist.id} result={artist} onFollow={handleFollow} isFollowing={followingArtists.has(artist.id)} />
                    ))}
                    {results.artists.length > 3 && (
                      <Button variant="outline" onClick={() => setActiveTab('artists')}>
                        View all {results.artists.length} artists
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {results.shows.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Shows
                  </h3>
                  <div className="grid gap-4">
                    {results.shows.slice(0, 3).map((show) => (
                      <SearchResultCard key={show.id} result={show} />
                    ))}
                    {results.shows.length > 3 && (
                      <Button variant="outline" onClick={() => setActiveTab('shows')}>
                        View all {results.shows.length} shows
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {results.venues.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Venues
                  </h3>
                  <div className="grid gap-4">
                    {results.venues.slice(0, 3).map((venue) => (
                      <SearchResultCard key={venue.id} result={venue} />
                    ))}
                    {results.venues.length > 3 && (
                      <Button variant="outline" onClick={() => setActiveTab('venues')}>
                        View all {results.venues.length} venues
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {results.total === 0 && (
                <Card>
                  <CardContent className="p-8 text-center">
                    <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No results found</h3>
                    <p className="text-muted-foreground mb-4">
                      Try adjusting your search terms or filters.
                    </p>
                    <Button variant="outline" onClick={handleClearFilters}>
                      Clear all filters
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="artists" className="mt-6">
            {results.artists.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Music className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No artists found</h3>
                  <p className="text-muted-foreground">
                    Try searching for a different artist name or adjusting your filters.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {results.artists.map((artist) => (
                  <SearchResultCard 
                    key={artist.id} 
                    result={artist} 
                    onFollow={handleFollow} 
                    isFollowing={followingArtists.has(artist.id)}
                    showType={false}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="shows" className="mt-6">
            {results.shows.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No shows found</h3>
                  <p className="text-muted-foreground">
                    No upcoming shows match your search criteria. Try adjusting your filters.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {results.shows.map((show) => (
                  <SearchResultCard 
                    key={show.id} 
                    result={show} 
                    showType={false}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="venues" className="mt-6">
            {results.venues.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No venues found</h3>
                  <p className="text-muted-foreground">
                    No venues match your search criteria. Try adjusting your location filters.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {results.venues.map((venue) => (
                  <SearchResultCard 
                    key={venue.id} 
                    result={venue} 
                    showType={false}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}

      {/* Search Tips & Getting Started */}
      {!results && !loading && !query && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                Search Tips
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Finding Artists</h4>
                <p className="text-sm text-muted-foreground">
                  Search for artist names like "Taylor Swift", "The Beatles", or "Ed Sheeran". 
                  We'll find them on Ticketmaster and add their shows to our database.
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Advanced Filters</h4>
                <p className="text-sm text-muted-foreground">
                  Use filters to narrow down by date range, location, genre, and price range.
                  Perfect for finding shows in your area.
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Live Data</h4>
                <p className="text-sm text-muted-foreground">
                  All artist and show data comes directly from Ticketmaster, so you'll always 
                  see the most up-to-date concert information.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Popular Searches
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {['Taylor Swift', 'Coldplay', 'Ed Sheeran', 'BTS', 'Billie Eilish', 'Drake', 'Ariana Grande', 'Post Malone'].map((artist) => (
                  <Button
                    key={artist}
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setQuery(artist);
                      performSearch(artist, filters);
                    }}
                  >
                    {artist}
                  </Button>
                ))}
              </div>
              <div className="mt-4">
                <h4 className="font-semibold mb-2">Popular Genres</h4>
                <div className="flex flex-wrap gap-2">
                  {['Rock', 'Pop', 'Hip-Hop', 'Electronic', 'Country', 'Jazz'].map((genre) => (
                    <Button
                      key={genre}
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setFilters(prev => ({ ...prev, genre }));
                        if (query) {
                          performSearch(query, { ...filters, genre });
                        }
                      }}
                    >
                      {genre}
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
} 