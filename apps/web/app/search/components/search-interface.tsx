'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Input } from '@repo/design-system/components/ui/input';
import { Button } from '@repo/design-system/components/ui/button';
import { Badge } from '@repo/design-system/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@repo/design-system/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@repo/design-system/components/ui/card';
import { 
  Search, 
  Filter, 
  MapPin, 
  Calendar, 
  Music, 
  Users, 
  Heart,
  Clock,
  Star,
  Loader2
} from 'lucide-react';
import Link from 'next/link';
import { useDebounce } from '@/hooks/use-debounce';
import { format } from 'date-fns';

interface SearchResult {
  id: string;
  type: 'artist' | 'venue' | 'show' | 'song';
  title: string;
  subtitle?: string;
  description?: string;
  imageUrl?: string;
  metadata?: {
    followers?: number;
    capacity?: number;
    date?: string;
    genre?: string[];
    location?: string;
    rating?: number;
  };
  slug: string;
}

const SEARCH_CATEGORIES = [
  { id: 'all', label: 'All', icon: Search },
  { id: 'artists', label: 'Artists', icon: Users },
  { id: 'venues', label: 'Venues', icon: MapPin },
  { id: 'shows', label: 'Shows', icon: Calendar },
  { id: 'songs', label: 'Songs', icon: Music },
] as const;

export function SearchInterface() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [category, setCategory] = useState(searchParams.get('category') || 'all');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filters, setFilters] = useState({
    location: searchParams.get('location') || '',
    genre: searchParams.get('genre') || '',
    dateRange: searchParams.get('dateRange') || '',
  });

  const debouncedQuery = useDebounce(query, 300);

  // Perform search
  const performSearch = useCallback(async (searchQuery: string, searchCategory: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        q: searchQuery,
        category: searchCategory,
        ...Object.fromEntries(Object.entries(filters).filter(([, value]) => value))
      });

      const response = await fetch(`/api/search?${params}`);
      const data = await response.json();
      
      setResults(data.results || []);
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  // Update URL when search changes
  useEffect(() => {
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    if (category !== 'all') params.set('category', category);
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });

    const newUrl = `/search${params.toString() ? '?' + params.toString() : ''}`;
    router.replace(newUrl, { scroll: false });
  }, [query, category, filters, router]);

  // Search when debounced query changes
  useEffect(() => {
    performSearch(debouncedQuery, category);
  }, [debouncedQuery, category, performSearch]);

  // Filter results by category
  const filteredResults = useMemo(() => {
    if (category === 'all') return results;
    return results.filter(result => result.type === category.slice(0, -1)); // Remove 's' from category
  }, [results, category]);

  const resultsByCategory = useMemo(() => {
    return SEARCH_CATEGORIES.slice(1).reduce((acc, cat) => {
      const categoryType = cat.id.slice(0, -1) as SearchResult['type'];
      acc[categoryType] = results.filter(result => result.type === categoryType);
      return acc;
    }, {} as Record<SearchResult['type'], SearchResult[]>);
  }, [results]);

  const renderSearchResult = (result: SearchResult) => {
    const Icon = SEARCH_CATEGORIES.find(cat => result.type === cat.id.slice(0, -1))?.icon || Search;
    
    return (
      <Card key={result.id} className="hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <Link href={`/${result.type}s/${result.slug}`} className="block">
            <div className="flex items-start gap-4">
              {result.imageUrl ? (
                <img 
                  src={result.imageUrl} 
                  alt={result.title}
                  className="w-16 h-16 rounded-lg object-cover"
                />
              ) : (
                <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center">
                  <Icon className="h-6 w-6 text-muted-foreground" />
                </div>
              )}
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-lg truncate">{result.title}</h3>
                  <Badge variant="outline" className="text-xs">
                    {result.type}
                  </Badge>
                </div>
                
                {result.subtitle && (
                  <p className="text-muted-foreground text-sm mb-2">{result.subtitle}</p>
                )}
                
                {result.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">{result.description}</p>
                )}
                
                {result.metadata && (
                  <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                    {result.metadata.followers && (
                      <div className="flex items-center gap-1">
                        <Heart className="h-3 w-3" />
                        {result.metadata.followers.toLocaleString()} followers
                      </div>
                    )}
                    {result.metadata.capacity && (
                      <div className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {result.metadata.capacity.toLocaleString()} capacity
                      </div>
                    )}
                    {result.metadata.date && (
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(result.metadata.date), 'MMM d, yyyy')}
                      </div>
                    )}
                    {result.metadata.location && (
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {result.metadata.location}
                      </div>
                    )}
                    {result.metadata.rating && (
                      <div className="flex items-center gap-1">
                        <Star className="h-3 w-3 fill-current text-yellow-500" />
                        {result.metadata.rating.toFixed(1)}
                      </div>
                    )}
                  </div>
                )}
                
                {result.metadata?.genre && result.metadata.genre.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {result.metadata.genre.slice(0, 3).map((genre) => (
                      <Badge key={genre} variant="secondary" className="text-xs">
                        {genre}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </Link>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          placeholder="Search for artists, venues, shows, or songs..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-10 pr-4 h-12 text-lg"
        />
      </div>

      {/* Quick Filters */}
      {query && (
        <div className="flex flex-wrap gap-2">
          <Input
            placeholder="Location..."
            value={filters.location}
            onChange={(e) => setFilters(prev => ({ ...prev, location: e.target.value }))}
            className="w-auto"
          />
          <Input
            placeholder="Genre..."
            value={filters.genre}
            onChange={(e) => setFilters(prev => ({ ...prev, genre: e.target.value }))}
            className="w-auto"
          />
          <Button 
            variant="outline" 
            onClick={() => setFilters({ location: '', genre: '', dateRange: '' })}
            disabled={!Object.values(filters).some(Boolean)}
          >
            <Filter className="h-4 w-4 mr-2" />
            Clear Filters
          </Button>
        </div>
      )}

      {/* Results */}
      {query ? (
        <Tabs value={category} onValueChange={setCategory}>
          <TabsList className="grid w-full grid-cols-5">
            {SEARCH_CATEGORIES.map((cat) => {
              const count = cat.id === 'all' 
                ? results.length 
                : resultsByCategory[cat.id.slice(0, -1) as SearchResult['type']]?.length || 0;
              
              return (
                <TabsTrigger key={cat.id} value={cat.id} className="flex items-center gap-2">
                  <cat.icon className="h-4 w-4" />
                  {cat.label}
                  {count > 0 && (
                    <Badge variant="secondary" className="ml-1 text-xs">
                      {count}
                    </Badge>
                  )}
                </TabsTrigger>
              );
            })}
          </TabsList>

          <div className="mt-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : (
              <TabsContent value="all" className="space-y-4">
                {results.length === 0 ? (
                  <div className="text-center py-12">
                    <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">No results found</h3>
                    <p className="text-muted-foreground">
                      Try adjusting your search terms or filters
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {results.map(renderSearchResult)}
                  </div>
                )}
              </TabsContent>
            )}

            {SEARCH_CATEGORIES.slice(1).map((cat) => {
              const categoryType = cat.id.slice(0, -1) as SearchResult['type'];
              const categoryResults = resultsByCategory[categoryType] || [];
              
              return (
                <TabsContent key={cat.id} value={cat.id} className="space-y-4">
                  {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin" />
                    </div>
                  ) : categoryResults.length === 0 ? (
                    <div className="text-center py-12">
                      <cat.icon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-medium mb-2">No {cat.label.toLowerCase()} found</h3>
                      <p className="text-muted-foreground">
                        Try different search terms
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {categoryResults.map(renderSearchResult)}
                    </div>
                  )}
                </TabsContent>
              );
            })}
          </div>
        </Tabs>
      ) : (
        // Empty state
        <div className="text-center py-12">
          <Search className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-xl font-medium mb-2">Start searching</h3>
          <p className="text-muted-foreground mb-6">
            Find your favorite artists, discover new venues, or explore upcoming shows
          </p>
          <div className="grid gap-4 md:grid-cols-4 max-w-2xl mx-auto">
            {SEARCH_CATEGORIES.slice(1).map((cat) => (
              <Button
                key={cat.id}
                variant="outline"
                className="h-16 flex-col"
                onClick={() => {
                  setCategory(cat.id);
                  setQuery('*');
                }}
              >
                <cat.icon className="h-6 w-6 mb-2" />
                Browse {cat.label}
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
} 