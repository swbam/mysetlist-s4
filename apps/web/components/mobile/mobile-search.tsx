'use client';

import { Badge } from '@repo/design-system/components/ui/badge';
import { Button } from '@repo/design-system/components/ui/button';
import { Card, CardContent } from '@repo/design-system/components/ui/card';
import { Input } from '@repo/design-system/components/ui/input';
import { cn } from '@repo/design-system/lib/utils';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowRight,
  Calendar,
  Clock,
  MapPin,
  Music,
  Search,
  TrendingUp,
  X,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useDebounce } from '~/hooks/use-debounce';

interface SearchResult {
  id: string;
  type: 'artist' | 'show' | 'venue' | 'song';
  title: string;
  subtitle?: string;
  imageUrl?: string;
  trending?: boolean;
}

interface MobileSearchProps {
  onSearch?: (query: string) => Promise<SearchResult[]>;
  onResultSelect?: (result: SearchResult) => void;
  className?: string;
  placeholder?: string;
  recentSearches?: string[];
  trendingSearches?: string[];
}

const mockTrendingSearches = [
  'Taylor Swift',
  'The Eras Tour',
  'Madison Square Garden',
  'Coldplay',
  'Sphere Las Vegas',
];

const mockRecentSearches = [
  'Arctic Monkeys',
  'Red Rocks',
  'Billie Eilish',
  'Coachella',
];

export function MobileSearch({
  onSearch,
  onResultSelect,
  className,
  placeholder = 'Search artists, shows, venues...',
  recentSearches = mockRecentSearches,
  trendingSearches = mockTrendingSearches,
}: MobileSearchProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);

  const inputRef = useRef<HTMLInputElement>(null);
  const debouncedQuery = useDebounce(query, 300);
  const router = useRouter();

  // Handle search
  useEffect(() => {
    if (debouncedQuery.length >= 2 && onSearch) {
      performSearch(debouncedQuery);
    } else {
      setResults([]);
    }
  }, [debouncedQuery, onSearch]);

  const performSearch = async (searchQuery: string) => {
    setIsLoading(true);
    try {
      let searchResults: SearchResult[] = [];

      if (onSearch) {
        // allow parent override
        searchResults = await onSearch(searchQuery);
      } else {
        const res = await fetch(
          `/api/artists/search?q=${encodeURIComponent(searchQuery)}`
        );
        if (res.ok) {
          const data = await res.json();
          searchResults = (data.artists || []).map(
            (a: {
              id: string;
              name: string;
              slug?: string;
              imageUrl?: string;
              genres?: string[];
            }) => ({
              id: a.slug ?? a.id,
              type: 'artist' as const,
              title: a.name,
              imageUrl: a.imageUrl,
              subtitle: a.genres?.[0],
              trending: false,
            })
          );
        }
      }

      setResults(searchResults);
    } catch (_error) {
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpen = () => {
    setIsOpen(true);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  };

  const handleClose = () => {
    setIsOpen(false);
    setQuery('');
    setResults([]);
    setFocusedIndex(-1);
  };

  const handleResultSelect = (result: SearchResult) => {
    if (onResultSelect) {
      onResultSelect(result);
    } else if (result.type === 'artist') {
      router.push(`/artists/${result.id}`);
    }

    // Note: persist recent searches can be implemented later
    handleClose();
  };

  const handleQuickSearch = (searchTerm: string) => {
    setQuery(searchTerm);
    performSearch(searchTerm);
  };

  const getResultIcon = (type: string) => {
    switch (type) {
      case 'artist':
        return Music;
      case 'show':
        return Calendar;
      case 'venue':
        return MapPin;
      case 'song':
        return Music;
      default:
        return Search;
    }
  };

  // Prevent body scroll when search is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  return (
    <>
      {/* Search Trigger */}
      <Button
        variant="ghost"
        onClick={handleOpen}
        className={cn(
          'flex-1 justify-start gap-2 text-muted-foreground md:hidden',
          className
        )}
      >
        <Search className="h-4 w-4" />
        <span className="text-sm">Search...</span>
      </Button>

      {/* Full Screen Search Modal */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-background md:hidden"
          >
            <div className="flex h-full flex-col">
              {/* Search Header */}
              <div className="border-b p-4">
                <div className="flex items-center gap-3">
                  <div className="relative flex-1">
                    <Search className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      ref={inputRef}
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder={placeholder}
                      className="h-12 pr-4 pl-10 text-base"
                      autoFocus
                    />
                    {query && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setQuery('')}
                        className="-translate-y-1/2 absolute top-1/2 right-2 h-6 w-6 p-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <Button variant="ghost" onClick={handleClose}>
                    Cancel
                  </Button>
                </div>
              </div>

              {/* Search Content */}
              <div className="flex-1 overflow-y-auto">
                {/* Loading */}
                {isLoading && (
                  <div className="flex items-center justify-center p-8">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  </div>
                )}

                {/* Search Results */}
                {results.length > 0 && !isLoading && (
                  <div className="p-4">
                    <h3 className="mb-3 font-medium text-muted-foreground text-sm">
                      Search Results
                    </h3>
                    <div className="space-y-2">
                      {results.map((result, index) => {
                        const Icon = getResultIcon(result.type);
                        return (
                          <Card
                            key={result.id}
                            className={cn(
                              'cursor-pointer transition-colors hover:bg-muted/50',
                              focusedIndex === index && 'bg-muted'
                            )}
                            onClick={() => handleResultSelect(result)}
                          >
                            <CardContent className="flex items-center gap-3 p-3">
                              {result.imageUrl ? (
                                <img
                                  src={result.imageUrl}
                                  alt={result.title}
                                  className="h-10 w-10 rounded object-cover"
                                />
                              ) : (
                                <div className="flex h-10 w-10 items-center justify-center rounded bg-muted">
                                  <Icon className="h-5 w-5 text-muted-foreground" />
                                </div>
                              )}

                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <p className="truncate font-medium text-sm">
                                    {result.title}
                                  </p>
                                  {result.trending && (
                                    <TrendingUp className="h-3 w-3 text-orange-500" />
                                  )}
                                </div>
                                {result.subtitle && (
                                  <p className="truncate text-muted-foreground text-xs">
                                    {result.subtitle}
                                  </p>
                                )}
                              </div>

                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-xs">
                                  {result.type}
                                </Badge>
                                <ArrowRight className="h-4 w-4 text-muted-foreground" />
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* No Results */}
                {query.length >= 2 && results.length === 0 && !isLoading && (
                  <div className="flex flex-col items-center justify-center p-8 text-center">
                    <Search className="mb-4 h-12 w-12 text-muted-foreground" />
                    <h3 className="mb-2 font-medium">No results found</h3>
                    <p className="text-muted-foreground text-sm">
                      Try searching with different keywords
                    </p>
                  </div>
                )}

                {/* Recent & Trending */}
                {query.length === 0 && (
                  <div className="space-y-6 p-4">
                    {/* Recent Searches */}
                    {recentSearches.length > 0 && (
                      <div>
                        <div className="mb-3 flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <h3 className="font-medium text-muted-foreground text-sm">
                            Recent Searches
                          </h3>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {recentSearches.map((search) => (
                            <Button
                              key={search}
                              variant="outline"
                              size="sm"
                              onClick={() => handleQuickSearch(search)}
                              className="h-8"
                            >
                              {search}
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Trending Searches */}
                    <div>
                      <div className="mb-3 flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                        <h3 className="font-medium text-muted-foreground text-sm">
                          Trending
                        </h3>
                      </div>
                      <div className="space-y-2">
                        {trendingSearches.map((search, index) => (
                          <Button
                            key={search}
                            variant="ghost"
                            onClick={() => handleQuickSearch(search)}
                            className="h-auto w-full justify-between p-3"
                          >
                            <div className="flex items-center gap-3">
                              <div className="flex h-6 w-6 items-center justify-center rounded bg-gradient-to-br from-orange-400 to-red-500 font-bold text-white text-xs">
                                {index + 1}
                              </div>
                              <span className="text-sm">{search}</span>
                            </div>
                            <ArrowRight className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
