'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Search, X, Music, Calendar, MapPin, Disc } from 'lucide-react';
import { Input } from '@repo/design-system/components/ui/input';
import { Button } from '@repo/design-system/components/ui/button';
import { Badge } from '@repo/design-system/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@repo/design-system/components/ui/avatar';
import { Card, CardContent } from '@repo/design-system/components/ui/card';
import { Command, CommandList, CommandEmpty, CommandGroup, CommandItem } from '@repo/design-system/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@repo/design-system/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@repo/design-system/components/ui/tabs';
import { useDebounce } from '@/hooks/use-debounce';
import { useRouter } from 'next/navigation';
import { cn } from '@repo/design-system/lib/utils';

interface SearchResult {
  id: string;
  type: 'artist' | 'show' | 'venue' | 'song';
  title: string;
  subtitle?: string;
  imageUrl?: string;
  slug?: string;
  date?: string;
  verified?: boolean;
}

interface SearchBarProps {
  placeholder?: string;
  className?: string;
  variant?: 'default' | 'hero';
}

export function SearchBar({ 
  placeholder = 'Search artists...', 
  className,
  variant = 'default'
}: SearchBarProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedType] = useState<'artist'>('artist');
  const [error, setError] = useState<string | null>(null);
  
  const debouncedQuery = useDebounce(query, 300);
  const inputRef = useRef<HTMLInputElement>(null);

  const performSearch = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < 2) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/artists/search?q=${encodeURIComponent(searchQuery)}`);
      
      if (!response.ok) {
        throw new Error('Search failed');
      }

      const data = await response.json();
      const artists = data.artists || [];
      const mapped = artists.map((a: any) => ({
        id: a.slug ?? a.id,
        type: 'artist',
        title: a.name,
        imageUrl: a.imageUrl,
        slug: a.slug ?? a.id,
      })) as SearchResult[];
      setResults(mapped);
      setIsOpen(true);
    } catch (err) {
      console.error('Search failed:', err);
      setError('Search failed. Please try again.');
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debouncedQuery) {
      performSearch(debouncedQuery);
    } else {
      setResults([]);
      setIsOpen(false);
    }
  }, [debouncedQuery, performSearch]);

  const handleSelect = (result: SearchResult) => {
    let path = '';
    
    switch (result.type) {
      case 'artist':
        path = `/artists/${result.slug || result.id}`;
        break;
      case 'show':
        path = `/shows/${result.id}`;
        break;
      case 'venue':
        path = `/venues/${result.slug || result.id}`;
        break;
      case 'song':
        // Navigate to first show that has this song (if available)
        path = `/search?q=${encodeURIComponent(result.title)}&type=song`;
        break;
      default:
        path = `/search?q=${encodeURIComponent(query)}`;
    }

    router.push(path);
    setQuery('');
    setResults([]);
    setIsOpen(false);
  };

  const clearSearch = () => {
    setQuery('');
    setResults([]);
    setIsOpen(false);
    setError(null);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      clearSearch();
    } else if (e.key === 'Enter' && results.length) {
      handleSelect(results[0]);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'artist': return '🎤';
      case 'show': return '🎵';
      case 'venue': return '🏛️';
      case 'song': return '🎶';
      default: return '🔍';
    }
  };

  const formatSubtitle = (result: SearchResult) => {
    return result.subtitle || '';
  };

  // Group results by type for better organization
  const groupedResults = results.reduce((groups, result) => {
    const type = result.type;
    if (!groups[type]) {
      groups[type] = [];
    }
    groups[type].push(result);
    return groups;
  }, {} as Record<string, SearchResult[]>);

  const typeOrder = ['artist'];
  const typeLabels = { artist: 'Artists' } as const;

  if (variant === 'hero') {
    return (
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <div className={cn('relative w-full max-w-2xl', className)}>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                className="h-14 pl-12 pr-12 text-lg bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-2 border-primary/20 hover:border-primary/30 focus:border-primary/50 transition-colors"
                onFocus={() => setIsOpen(query.length >= 2 && results.length > 0)}
              />
              {query && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearSearch}
                  className="absolute right-2 top-1/2 h-8 w-8 -translate-y-1/2 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-[600px] p-0" align="start">
          <SearchResults 
            results={results} 
            isLoading={isLoading} 
            query={query} 
            onSelect={handleSelect} 
          />
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <div className={cn('relative w-full max-w-md', className)}>
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="pl-10 pr-10"
            onFocus={() => setIsOpen(query.length >= 2 && results.length > 0)}
          />
          {query && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearSearch}
              className="absolute right-2 top-1/2 h-6 w-6 -translate-y-1/2 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <SearchResults 
          results={results} 
          isLoading={isLoading} 
          query={query} 
          onSelect={handleSelect} 
        />
      </PopoverContent>
    </Popover>
  );
}

function SearchResults({ 
  results, 
  isLoading, 
  query, 
  onSelect 
}: {
  results: SearchResult[];
  isLoading: boolean;
  query: string;
  onSelect: (result: SearchResult) => void;
}) {
  const getResultIcon = (type: string) => {
    switch (type) {
      case 'artist':
        return Music;
      case 'show':
        return Calendar;
      case 'venue':
        return MapPin;
      case 'song':
        return Disc;
      default:
        return Search;
    }
  };

  const getResultBadgeColor = (type: string) => {
    switch (type) {
      case 'artist':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300';
      case 'show':
        return 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300';
      case 'venue':
        return 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300';
      case 'song':
        return 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300';
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Group results by type
  const groupedResults = results.reduce((acc, result) => {
    if (!acc[result.type]) {
      acc[result.type] = [];
    }
    acc[result.type].push(result);
    return acc;
  }, {} as Record<string, SearchResult[]>);

  const typeOrder = ['artist'];
  const typeLabels = { artist: 'Artists' } as const;

  return (
    <Command shouldFilter={false}>
      <CommandList className="max-h-80">
        {isLoading && (
          <CommandEmpty>Searching...</CommandEmpty>
        )}
        {!isLoading && results.length === 0 && query.length >= 2 && (
          <CommandEmpty>
            <div className="text-center py-4">
              <Search className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No results found for "{query}"</p>
              <p className="text-xs text-muted-foreground mt-1">Try searching for artists, shows, venues, or songs</p>
            </div>
          </CommandEmpty>
        )}
        
        {typeOrder.map((type) => {
          const typeResults = groupedResults[type];
          if (!typeResults?.length) return null;

          return (
            <CommandGroup key={type} heading={typeLabels[type as keyof typeof typeLabels]}>
              {typeResults.map((result) => {
                const Icon = getResultIcon(result.type);
                
                return (
                  <CommandItem
                    key={result.id}
                    onSelect={() => onSelect(result)}
                    className="flex items-center gap-3 p-3 cursor-pointer"
                  >
                    {result.imageUrl ? (
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={result.imageUrl} alt={result.title} />
                        <AvatarFallback>
                          <Icon className="h-4 w-4" />
                        </AvatarFallback>
                      </Avatar>
                    ) : (
                      <div className="h-10 w-10 rounded bg-muted flex items-center justify-center">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">{result.title}</span>
                        {result.verified && (
                          <div className="h-1 w-1 rounded-full bg-blue-500" />
                        )}
                      </div>
                      {result.subtitle && (
                        <p className="text-sm text-muted-foreground truncate">
                          {result.subtitle}
                          {result.date && ` • ${formatDate(result.date)}`}
                        </p>
                      )}
                    </div>

                    <Badge 
                      variant="outline" 
                      className={cn('text-xs capitalize', getResultBadgeColor(result.type))}
                    >
                      {result.type}
                    </Badge>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          );
        })}
      </CommandList>
    </Command>
  );
} 