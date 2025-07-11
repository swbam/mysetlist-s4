'use client';

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@repo/design-system/components/ui/avatar';
import { Badge } from '@repo/design-system/components/ui/badge';
import { Button } from '@repo/design-system/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from '@repo/design-system/components/ui/command';
import { Input } from '@repo/design-system/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@repo/design-system/components/ui/popover';
import { cn } from '@repo/design-system/lib/utils';
import { Calendar, Disc, MapPin, Music, Search, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useDebounce } from '~/hooks/use-debounce';

interface SearchResult {
  id: string;
  type: 'artist' | 'show' | 'venue' | 'song';
  title: string;
  subtitle?: string;
  imageUrl?: string;
  slug?: string;
  date?: string;
  verified?: boolean;
  source: 'database' | 'ticketmaster';
  externalId?: string;
  requiresSync?: boolean;
}

interface SearchBarProps {
  placeholder?: string;
  className?: string;
  variant?: 'default' | 'hero';
}

export function SearchBar({
  placeholder = 'Search artists...',
  className,
  variant = 'default',
}: SearchBarProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [searched, setSearched] = useState(false);
  const [_error, setError] = useState<string | null>(null);

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
      // ARTIST-ONLY SEARCH as per PRD requirements
      const response = await fetch(
        `/api/search/suggestions?query=${encodeURIComponent(searchQuery)}&limit=8`
      );

      if (!response.ok) {
        throw new Error('Search failed');
      }

      const data = await response.json();
      const artists = data.suggestions || [];

      // Map to our SearchResult format
      const mapped = artists.map((artist: any) => ({
        id: artist.id,
        type: 'artist' as const,
        title: artist.title,
        subtitle: artist.subtitle,
        imageUrl: artist.imageUrl,
        slug: artist.href?.replace('/artists/', '') || artist.id,
        verified: artist.verified,
        requiresSync: artist.requiresSync,
      })) as SearchResult[];

      setResults(mapped);
      setSearched(true);
      setIsOpen(true);
    } catch (_err) {
      setError('Artist search failed. Please try again.');
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

  const handleSelect = async (result: SearchResult) => {
    // Core PRD flow: Click artist → Trigger sync → Go to artist page
    if (result.requiresSync) {
      try {
        setIsLoading(true);
        const resp = await fetch('/api/artists/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            artistName: result.title,
            artistId: result.id,
          }),
        });
        const data = await resp.json();
        if (resp.ok && data.artist?.slug) {
          router.push(`/artists/${data.artist.slug}`);
        } else {
          throw new Error('Sync failed');
        }
      } catch (_error) {
        setError('Failed to import artist data. Please try again.');
        setIsLoading(false);
        return;
      }
    } else {
      // Artist already in database
      router.push(`/artists/${result.slug || result.id}`);
    }

    setQuery('');
    setResults([]);
    setIsOpen(false);
    setIsLoading(false);
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
    } else if (e.key === 'Enter' && results.length > 0 && results[0]) {
      handleSelect(results[0]);
    }
  };


  if (variant === 'hero') {
    return (
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <div className={cn('relative w-full max-w-2xl', className)}>
            <div className="relative">
              <Search className="-translate-y-1/2 absolute top-1/2 left-4 h-5 w-5 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                className="h-12 border-2 border-primary/20 bg-background/95 pr-12 pl-12 text-base backdrop-blur transition-colors hover:border-primary/30 focus:border-primary/50 supports-[backdrop-filter]:bg-background/80 md:h-14 md:text-lg"
                onFocus={() =>
                  setIsOpen(query.length >= 2 && results.length > 0)
                }
              />
              {query && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearSearch}
                  className="-translate-y-1/2 absolute top-1/2 right-2 h-8 w-8 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </PopoverTrigger>
        <PopoverContent
          className="w-[90vw] max-w-[600px] p-0 md:w-[600px]"
          align="start"
        >
          <SearchResults
            results={results}
            isLoading={isLoading}
            query={query}
            onSelect={handleSelect}
            searched={searched}
          />
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <div className={cn('relative w-full max-w-md', className)}>
          <Search className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="pr-10 pl-10"
            onFocus={() => setIsOpen(query.length >= 2 && results.length > 0)}
          />
          {query && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearSearch}
              className="-translate-y-1/2 absolute top-1/2 right-2 h-6 w-6 p-0"
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
          searched={searched}
        />
      </PopoverContent>
    </Popover>
  );
}

function SearchResults({
  results,
  isLoading,
  query,
  onSelect,
  searched,
}: {
  results: SearchResult[];
  isLoading: boolean;
  query: string;
  onSelect: (result: SearchResult) => void;
  searched: boolean;
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
  const groupedResults = results.reduce(
    (acc, result) => {
      if (!acc[result.type]) {
        acc[result.type] = [];
      }
      acc[result.type]!.push(result);
      return acc;
    },
    {} as Record<string, SearchResult[]>
  );

  const typeOrder = ['artist'];

  return (
    <Command shouldFilter={false}>
      <CommandList className="max-h-80">
        {isLoading && <CommandEmpty>Searching...</CommandEmpty>}
        {!isLoading && results.length === 0 && searched && (
          <CommandEmpty>
            <div className="py-4 text-center">
              <Search className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
              <p className="text-muted-foreground text-sm">
                No results found for "{query}"
              </p>
              <p className="mt-1 text-muted-foreground text-xs">
                Try searching for different artists
              </p>
            </div>
          </CommandEmpty>
        )}

        {typeOrder.map((type) => {
          const typeResults = groupedResults[type];
          if (!typeResults?.length) {
            return null;
          }

          return (
            <CommandGroup
              key={type}
              heading={type === 'artist' ? 'Artists' : type}
            >
              {typeResults.map((result) => {
                const Icon = getResultIcon(result.type);

                return (
                  <CommandItem
                    key={result.id}
                    onSelect={() => onSelect(result)}
                    className="flex cursor-pointer items-center gap-3 p-3"
                  >
                    {result.imageUrl ? (
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={result.imageUrl} alt={result.title} />
                        <AvatarFallback>
                          <Icon className="h-4 w-4" />
                        </AvatarFallback>
                      </Avatar>
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded bg-muted">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate font-medium">
                          {result.title}
                        </span>
                        {result.verified && (
                          <div className="h-1 w-1 rounded-full bg-blue-500" />
                        )}
                      </div>
                      {result.subtitle && (
                        <p className="truncate text-muted-foreground text-sm">
                          {result.subtitle}
                          {result.date && ` • ${formatDate(result.date)}`}
                        </p>
                      )}
                    </div>

                    <Badge
                      variant="outline"
                      className={cn(
                        'text-xs capitalize',
                        getResultBadgeColor(result.type)
                      )}
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

SearchBar.displayName = 'SearchBar';
