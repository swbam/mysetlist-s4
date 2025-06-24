'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Input } from '@repo/design-system/components/ui/input';
import { Button } from '@repo/design-system/components/ui/button';
import { Card } from '@repo/design-system/components/ui/card';
import { Badge } from '@repo/design-system/components/ui/badge';
import { Search, Music, MapPin, Calendar, X, Loader2 } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { searchContent, getSearchResultHref, debounce, type SearchResult } from '@/lib/search';

export const SearchBar = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const performSearch = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < 2) {
      setResults([]);
      setIsOpen(false);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const response = await searchContent(searchQuery, 8);
      setResults(response.results);
      setIsOpen(true);
    } catch (error) {
      console.error('Search failed:', error);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const debouncedSearch = useCallback(
    debounce(performSearch, 300),
    [performSearch]
  );

  useEffect(() => {
    debouncedSearch(query);
  }, [query, debouncedSearch]);

  const getIcon = (type: SearchResult['type']) => {
    switch (type) {
      case 'artist':
        return <Music className="h-4 w-4" />;
      case 'show':
        return <Calendar className="h-4 w-4" />;
      case 'venue':
        return <MapPin className="h-4 w-4" />;
    }
  };


  return (
    <div ref={searchRef} className="relative w-full max-w-lg">
      <div className="relative">
        {isLoading ? (
          <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground animate-spin" />
        ) : (
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        )}
        <Input
          type="search"
          placeholder="Search artists, shows, venues..."
          className="pl-10 pr-10"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.length > 1 && setIsOpen(true)}
        />
        {query && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-0 top-0 h-full"
            onClick={() => {
              setQuery('');
              setIsOpen(false);
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
      
      {isOpen && results.length > 0 && (
        <Card className="absolute top-full mt-2 w-full z-50 p-2 max-h-96 overflow-auto">
          <div className="space-y-1">
            {results.map((result) => (
              <Link
                key={`${result.type}-${result.id}`}
                href={getSearchResultHref(result)}
                onClick={() => {
                  setQuery('');
                  setIsOpen(false);
                }}
              >
                <div className="flex items-center gap-3 p-2 rounded-md hover:bg-accent transition-colors">
                  {result.imageUrl ? (
                    <div className="relative h-10 w-10 rounded-full overflow-hidden bg-muted flex-shrink-0">
                      <Image
                        src={result.imageUrl}
                        alt={result.title}
                        fill
                        className="object-cover"
                      />
                    </div>
                  ) : (
                    <div className="text-muted-foreground">
                      {getIcon(result.type)}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{result.title}</p>
                    {result.subtitle && (
                      <p className="text-sm text-muted-foreground truncate">{result.subtitle}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {result.meta && (
                      <span className="text-xs text-muted-foreground">{result.meta}</span>
                    )}
                    <Badge variant="outline" className="text-xs">
                      {result.type}
                    </Badge>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};