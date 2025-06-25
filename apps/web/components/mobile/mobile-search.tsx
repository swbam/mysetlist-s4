'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  X, 
  Clock, 
  TrendingUp,
  Music,
  Calendar,
  MapPin,
  ArrowRight
} from 'lucide-react';
import { Button } from '@repo/design-system/components/ui/button';
import { Input } from '@repo/design-system/components/ui/input';
import { Badge } from '@repo/design-system/components/ui/badge';
import { Card, CardContent } from '@repo/design-system/components/ui/card';
import { useDebounce } from '@/hooks/use-debounce';
import { cn } from '@repo/design-system/lib/utils';

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
  'Sphere Las Vegas'
];

const mockRecentSearches = [
  'Arctic Monkeys',
  'Red Rocks',
  'Billie Eilish',
  'Coachella'
];

export function MobileSearch({
  onSearch,
  onResultSelect,
  className,
  placeholder = "Search artists, shows, venues...",
  recentSearches = mockRecentSearches,
  trendingSearches = mockTrendingSearches
}: MobileSearchProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const debouncedQuery = useDebounce(query, 300);

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
      const searchResults = onSearch ? await onSearch(searchQuery) : [];
      setResults(searchResults);
    } catch (error) {
      console.error('Search failed:', error);
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
    onResultSelect?.(result);
    
    // Add to recent searches
    const updatedRecent = [result.title, ...recentSearches.filter(s => s !== result.title)].slice(0, 5);
    // In a real app, you'd persist this to localStorage or user preferences
    
    handleClose();
  };

  const handleQuickSearch = (searchTerm: string) => {
    setQuery(searchTerm);
    performSearch(searchTerm);
  };

  const getResultIcon = (type: string) => {
    switch (type) {
      case 'artist': return Music;
      case 'show': return Calendar;
      case 'venue': return MapPin;
      case 'song': return Music;
      default: return Search;
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
          "flex-1 justify-start gap-2 text-muted-foreground md:hidden",
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
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      ref={inputRef}
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder={placeholder}
                      className="pl-10 pr-4 h-12 text-base"
                      autoFocus
                    />
                    {query && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setQuery('')}
                        className="absolute right-2 top-1/2 h-6 w-6 -translate-y-1/2 p-0"
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
                    <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
                  </div>
                )}

                {/* Search Results */}
                {results.length > 0 && !isLoading && (
                  <div className="p-4">
                    <h3 className="text-sm font-medium text-muted-foreground mb-3">
                      Search Results
                    </h3>
                    <div className="space-y-2">
                      {results.map((result, index) => {
                        const Icon = getResultIcon(result.type);
                        return (
                          <Card
                            key={result.id}
                            className={cn(
                              "cursor-pointer transition-colors hover:bg-muted/50",
                              focusedIndex === index && "bg-muted"
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
                                <div className="h-10 w-10 rounded bg-muted flex items-center justify-center">
                                  <Icon className="h-5 w-5 text-muted-foreground" />
                                </div>
                              )}
                              
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="font-medium text-sm truncate">
                                    {result.title}
                                  </p>
                                  {result.trending && (
                                    <TrendingUp className="h-3 w-3 text-orange-500" />
                                  )}
                                </div>
                                {result.subtitle && (
                                  <p className="text-xs text-muted-foreground truncate">
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
                    <Search className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="font-medium mb-2">No results found</h3>
                    <p className="text-sm text-muted-foreground">
                      Try searching with different keywords
                    </p>
                  </div>
                )}

                {/* Recent & Trending */}
                {query.length === 0 && (
                  <div className="p-4 space-y-6">
                    {/* Recent Searches */}
                    {recentSearches.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-3">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <h3 className="text-sm font-medium text-muted-foreground">
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
                      <div className="flex items-center gap-2 mb-3">
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                        <h3 className="text-sm font-medium text-muted-foreground">
                          Trending
                        </h3>
                      </div>
                      <div className="space-y-2">
                        {trendingSearches.map((search, index) => (
                          <Button
                            key={search}
                            variant="ghost"
                            onClick={() => handleQuickSearch(search)}
                            className="w-full justify-between h-auto p-3"
                          >
                            <div className="flex items-center gap-3">
                              <div className="h-6 w-6 rounded bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center text-white text-xs font-bold">
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