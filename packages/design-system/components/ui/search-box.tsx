'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Search, X, Loader2 } from 'lucide-react';
import { Input } from './input';
import { Button } from './button';
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from './command';
import { Popover, PopoverContent, PopoverTrigger } from './popover';
import { Badge } from './badge';
import { cn } from '../../lib/utils';
import { musicTokens } from '../../lib/design-tokens';

interface SearchResult {
  id: string;
  type: 'artist' | 'show' | 'venue' | 'song' | 'genre' | 'location' | 'recent' | 'trending';
  title: string;
  subtitle?: string;
  imageUrl?: string | null;
  metadata?: {
    popularity?: number;
    upcomingShows?: number;
    followerCount?: number;
    capacity?: number;
    showDate?: string;
    verified?: boolean;
  };
}

interface SearchBoxProps {
  placeholder?: string;
  onSearch: (query: string) => Promise<SearchResult[]>;
  onSelect: (result: SearchResult) => void;
  onSubmit?: (query: string) => void;
  className?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  showRecentSearches?: boolean;
  recentSearches?: string[];
  debounceMs?: number;
}

// Custom hook for debouncing
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export function SearchBox({ 
  placeholder = 'Search artists, shows, venues...', 
  onSearch, 
  onSelect,
  onSubmit,
  className,
  disabled = false,
  autoFocus = false,
  showRecentSearches = true,
  recentSearches = [],
  debounceMs = 300
}: SearchBoxProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const debouncedQuery = useDebounce(query, debounceMs);

  useEffect(() => {
    if (debouncedQuery.length >= 2) {
      performSearch(debouncedQuery);
    } else {
      setResults([]);
      setIsLoading(false);
    }
  }, [debouncedQuery]);

  const performSearch = async (searchQuery: string) => {
    setIsLoading(true);
    try {
      const searchResults = await onSearch(searchQuery);
      setResults(searchResults);
      setIsOpen(true);
      setSelectedIndex(-1);
    } catch (error) {
      console.error('Search failed:', error);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    
    if (value.length < 2) {
      setIsOpen(false);
    }
  };

  const handleSelect = (result: SearchResult) => {
    onSelect(result);
    setQuery('');
    setResults([]);
    setIsOpen(false);
    setSelectedIndex(-1);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      if (selectedIndex >= 0 && results[selectedIndex]) {
        handleSelect(results[selectedIndex]);
      } else {
        onSubmit?.(query.trim());
        setIsOpen(false);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < results.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : results.length - 1
        );
        break;
      case 'Escape':
        setIsOpen(false);
        setSelectedIndex(-1);
        inputRef.current?.blur();
        break;
    }
  };

  const clearSearch = () => {
    setQuery('');
    setResults([]);
    setIsOpen(false);
    setSelectedIndex(-1);
    inputRef.current?.focus();
  };

  const getResultIcon = (type: SearchResult['type']) => {
    const iconClass = "h-4 w-4 flex-shrink-0";
    switch (type) {
      case 'artist': 
        return <div className={cn(iconClass, "bg-primary/10 text-primary rounded p-1")}>🎤</div>;
      case 'show': 
        return <div className={cn(iconClass, "bg-blue-100 text-blue-600 rounded p-1")}>📅</div>;
      case 'venue': 
        return <div className={cn(iconClass, "bg-purple-100 text-purple-600 rounded p-1")}>🏟️</div>;
      case 'song': 
        return <div className={cn(iconClass, "bg-green-100 text-green-600 rounded p-1")}>🎵</div>;
      case 'genre': 
        return <div className={cn(iconClass, "bg-orange-100 text-orange-600 rounded p-1")}>🎼</div>;
      case 'location': 
        return <div className={cn(iconClass, "bg-red-100 text-red-600 rounded p-1")}>📍</div>;
      case 'recent': 
        return <div className={cn(iconClass, "bg-gray-100 text-gray-600 rounded p-1")}>🕒</div>;
      case 'trending': 
        return <div className={cn(iconClass, "bg-yellow-100 text-yellow-600 rounded p-1")}>📈</div>;
      default: 
        return <div className={cn(iconClass, "bg-gray-100 text-gray-600 rounded p-1")}>🔍</div>;
    }
  };

  const shouldShowRecentSearches = showRecentSearches && recentSearches.length > 0 && !query && !isLoading;

  return (
    <div className={cn("relative", className)}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <form onSubmit={handleSubmit} className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none z-10" />
            <Input
              ref={inputRef}
              value={query}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              className={cn(
                "pl-10 pr-10 h-11",
                disabled && "cursor-not-allowed opacity-50"
              )}
              disabled={disabled}
              autoFocus={autoFocus}
              onFocus={() => {
                if (query.length >= 2 || shouldShowRecentSearches) {
                  setIsOpen(true);
                }
              }}
            />
            {(query || isLoading) && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                {isLoading && (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                )}
                {query && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={clearSearch}
                    className="h-6 w-6 p-0 hover:bg-muted-foreground/10"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            )}
          </form>
        </PopoverTrigger>
        
        <PopoverContent 
          className="w-[400px] p-0" 
          align="start"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <Command shouldFilter={false}>
            <CommandList>
              {shouldShowRecentSearches && (
                <CommandGroup heading="Recent Searches">
                  {recentSearches.slice(0, 5).map((search, index) => (
                    <CommandItem
                      key={`recent-${index}`}
                      onSelect={() => {
                        setQuery(search);
                        performSearch(search);
                      }}
                      className="flex items-center gap-3 p-3 cursor-pointer"
                    >
                      {getResultIcon('recent')}
                      <span className="flex-1">{search}</span>
                      <Badge variant="outline" className="text-xs">
                        Recent
                      </Badge>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}

              {isLoading && (
                <div className="p-4 text-center">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Searching...</p>
                </div>
              )}
              
              {!isLoading && results.length === 0 && query.length >= 2 && (
                <CommandEmpty className="p-4 text-center">
                  <p className="text-sm text-muted-foreground">No results found for "{query}"</p>
                </CommandEmpty>
              )}
              
              {results.length > 0 && (
                <CommandGroup>
                  {results.map((result, index) => (
                    <CommandItem
                      key={result.id}
                      onSelect={() => handleSelect(result)}
                      className={cn(
                        "flex items-center gap-3 p-3 cursor-pointer",
                        selectedIndex === index && "bg-accent"
                      )}
                    >
                      {result.imageUrl ? (
                        <img
                          src={result.imageUrl}
                          alt={result.title}
                          className="h-10 w-10 rounded object-cover flex-shrink-0"
                        />
                      ) : (
                        getResultIcon(result.type)
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium truncate">{result.title}</span>
                          {result.metadata?.verified && (
                            <Badge variant="secondary" className="text-xs">
                              Verified
                            </Badge>
                          )}
                        </div>
                        {result.subtitle && (
                          <div className="text-sm text-muted-foreground truncate">
                            {result.subtitle}
                          </div>
                        )}
                        {result.metadata && (
                          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                            {result.metadata.followerCount && (
                              <span>{result.metadata.followerCount.toLocaleString()} followers</span>
                            )}
                            {result.metadata.upcomingShows && (
                              <span>{result.metadata.upcomingShows} shows</span>
                            )}
                            {result.metadata.capacity && (
                              <span>{result.metadata.capacity.toLocaleString()} capacity</span>
                            )}
                          </div>
                        )}
                      </div>
                      <Badge variant="outline" className="text-xs capitalize">
                        {result.type}
                      </Badge>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}