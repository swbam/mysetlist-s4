'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { SearchBox } from '@repo/design-system';
import { Button } from '@repo/design-system/components/ui/button';
import { Badge } from '@repo/design-system/components/ui/badge';
import { 
  Search, 
  X, 
  Clock, 
  TrendingUp,
  Filter,
  SlidersHorizontal
} from 'lucide-react';
import { cn } from '@repo/design-system/lib/utils';
import { PullToRefresh } from '@/components/ui/pull-to-refresh';
import { InfiniteScroll } from '@/components/ui/infinite-scroll';
import { SearchResultCard } from './search-result-card';

interface RecentSearch {
  id: string;
  query: string;
  timestamp: Date;
  type?: 'artist' | 'show' | 'venue';
}

interface TrendingQuery {
  id: string;
  query: string;
  count: number;
  category: string;
}

interface SearchFilter {
  type: 'all' | 'artist' | 'show' | 'venue';
  dateRange?: {
    start: Date;
    end: Date;
  };
  location?: string;
  genre?: string[];
}

interface MobileSearchInterfaceProps {
  onSearch?: (query: string, filters?: SearchFilter) => void;
  onFilterChange?: (filters: SearchFilter) => void;
  isLoading?: boolean;
  results?: any[];
  hasMore?: boolean;
  onLoadMore?: () => void;
  className?: string;
}

export function MobileSearchInterface({
  onSearch,
  onFilterChange,
  isLoading = false,
  results = [],
  hasMore = false,
  onLoadMore,
  className
}: MobileSearchInterfaceProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);
  const [trendingQueries, setTrendingQueries] = useState<TrendingQuery[]>([]);
  const [filters, setFilters] = useState<SearchFilter>({ type: 'all' });
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Load recent searches from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('recent-searches');
    if (stored) {
      try {
        const parsed = JSON.parse(stored).map((item: any) => ({
          ...item,
          timestamp: new Date(item.timestamp)
        }));
        setRecentSearches(parsed.slice(0, 5)); // Limit to 5 recent searches
      } catch (error) {
        console.error('Failed to parse recent searches:', error);
      }
    }

    // Mock trending queries - in real app, fetch from API
    setTrendingQueries([
      { id: '1', query: 'Taylor Swift', count: 1250, category: 'Artist' },
      { id: '2', query: 'The Weeknd', count: 980, category: 'Artist' },
      { id: '3', query: 'Madison Square Garden', count: 756, category: 'Venue' },
      { id: '4', query: 'Coachella 2024', count: 642, category: 'Show' },
      { id: '5', query: 'Billie Eilish', count: 589, category: 'Artist' },
    ]);
  }, []);

  const saveRecentSearch = useCallback((searchQuery: string) => {
    if (!searchQuery.trim()) return;

    const newSearch: RecentSearch = {
      id: Date.now().toString(),
      query: searchQuery.trim(),
      timestamp: new Date()
    };

    setRecentSearches(prev => {
      const filtered = prev.filter(item => 
        item.query.toLowerCase() !== searchQuery.toLowerCase()
      );
      const updated = [newSearch, ...filtered].slice(0, 5);
      
      localStorage.setItem('recent-searches', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const handleSearch = useCallback((searchQuery: string) => {
    if (!searchQuery.trim()) return;

    saveRecentSearch(searchQuery);
    onSearch?.(searchQuery, filters);
    setQuery(searchQuery);
    setIsSearchExpanded(false);
  }, [onSearch, filters, saveRecentSearch]);

  const handleFilterChange = useCallback((newFilters: SearchFilter) => {
    setFilters(newFilters);
    onFilterChange?.(newFilters);
    
    if (query) {
      onSearch?.(query, newFilters);
    }
  }, [onFilterChange, onSearch, query]);

  const clearRecentSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem('recent-searches');
  };

  const removeRecentSearch = (id: string) => {
    setRecentSearches(prev => {
      const updated = prev.filter(item => item.id !== id);
      localStorage.setItem('recent-searches', JSON.stringify(updated));
      return updated;
    });
  };

  const handleRefresh = async () => {
    if (query && onSearch) {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate refresh
      onSearch(query, filters);
    }
  };

  return (
    <div className={cn('flex flex-col h-full bg-background', className)}>
      {/* Search Header */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center gap-3 p-4">
          <div className="flex-1">
            <SearchBox
              ref={searchInputRef}
              placeholder="Search artists, shows, venues..."
              value={query}
              onChange={setQuery}
              onSubmit={handleSearch}
              onFocus={() => setIsSearchExpanded(true)}
              className="w-full mobile-text-enhance"
              autoFocus={isSearchExpanded}
            />
          </div>
          
          {/* Filter Toggle */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              'min-h-[40px] min-w-[40px] p-2',
              showFilters && 'bg-primary text-primary-foreground'
            )}
            aria-label="Toggle filters"
          >
            <SlidersHorizontal className="h-4 w-4" />
          </Button>
        </div>

        {/* Quick Filters */}
        {showFilters && (
          <div className="px-4 pb-4 space-y-3 animate-slide-up">
            <div className="flex flex-wrap gap-2">
              {(['all', 'artist', 'show', 'venue'] as const).map((type) => (
                <Button
                  key={type}
                  variant={filters.type === type ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleFilterChange({ ...filters, type })}
                  className="capitalize touch-manipulation"
                >
                  {type === 'all' ? 'All' : `${type}s`}
                </Button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Search Content */}
      <div className="flex-1 overflow-hidden">
        {!query && isSearchExpanded ? (
          /* Search Suggestions */
          <div className="p-4 space-y-6">
            {/* Recent Searches */}
            {recentSearches.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-sm text-muted-foreground flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Recent Searches
                  </h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearRecentSearches}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    Clear All
                  </Button>
                </div>
                
                <div className="space-y-2">
                  {recentSearches.map((search) => (
                    <div
                      key={search.id}
                      className="flex items-center justify-between p-3 rounded-lg border border-border/50 hover:bg-muted/50 transition-colors touch-manipulation"
                    >
                      <button
                        onClick={() => handleSearch(search.query)}
                        className="flex-1 text-left text-sm"
                      >
                        {search.query}
                      </button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeRecentSearch(search.id)}
                        className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                        aria-label={`Remove ${search.query} from recent searches`}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Trending Searches */}
            <div className="space-y-3">
              <h3 className="font-medium text-sm text-muted-foreground flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Trending Now
              </h3>
              
              <div className="space-y-2">
                {trendingQueries.map((trending) => (
                  <button
                    key={trending.id}
                    onClick={() => handleSearch(trending.query)}
                    className="flex items-center justify-between w-full p-3 rounded-lg border border-border/50 hover:bg-muted/50 transition-colors text-left touch-manipulation"
                  >
                    <div className="flex-1">
                      <div className="text-sm font-medium">{trending.query}</div>
                      <div className="text-xs text-muted-foreground">
                        {trending.count.toLocaleString()} searches
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {trending.category}
                    </Badge>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : query && results.length > 0 ? (
          /* Search Results */
          <PullToRefresh onRefresh={handleRefresh}>
            <InfiniteScroll
              hasMore={hasMore}
              isLoading={isLoading}
              onLoadMore={onLoadMore || (() => {})}
              className="p-4 space-y-4"
            >
              {results.map((result, index) => (
                <div key={result.id || index} className="animate-fade-in">
                  <SearchResultCard result={result} />
                </div>
              ))}
            </InfiniteScroll>
          </PullToRefresh>
        ) : query && !isLoading ? (
          /* No Results */
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <Search className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No results found</h3>
            <p className="text-muted-foreground mb-4">
              Try adjusting your search terms or filters
            </p>
            <Button
              variant="outline"
              onClick={() => setQuery('')}
              className="touch-manipulation"
            >
              Clear Search
            </Button>
          </div>
        ) : isLoading ? (
          /* Loading State */
          <div className="p-4 space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-20 bg-muted rounded-lg" />
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}