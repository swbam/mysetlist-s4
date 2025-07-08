'use client';

import {
  type SearchResult,
  debounce,
  getSearchResultHref,
  searchContent,
} from '@/lib/search';
import { Badge } from '@repo/design-system/components/ui/badge';
import { Button } from '@repo/design-system/components/ui/button';
import { Card } from '@repo/design-system/components/ui/card';
import { Input } from '@repo/design-system/components/ui/input';
import { Loader2, Music, Search, X } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '@repo/design-system/lib/utils';

interface SearchBarProps {
  variant?: 'default' | 'hero';
  placeholder?: string;
  className?: string;
}

export const SearchBar = ({ variant = 'default', placeholder = 'Search artists...', className }: SearchBarProps) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchRef.current &&
        !searchRef.current.contains(event.target as Node)
      ) {
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

  const debouncedSearch = useCallback(debounce(performSearch, 300), [
    performSearch,
  ]);

  useEffect(() => {
    debouncedSearch(query);
  }, [query, debouncedSearch]);

  const getIcon = (type: SearchResult['type']) => {
    // Only artists are searchable now
    return <Music className="h-4 w-4" />;
  };

  return (
    <div ref={searchRef} className={cn("relative w-full max-w-lg", className)}>
      <div className="relative">
        {isLoading ? (
          <Loader2 className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 animate-spin text-muted-foreground" />
        ) : (
          <Search className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 text-muted-foreground" />
        )}
        <Input
          type="search"
          placeholder={placeholder}
          className={cn(
            "pr-10 pl-10",
            variant === 'hero' && "h-14 text-lg"
          )}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.length > 1 && setIsOpen(true)}
        />
        {query && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-0 right-0 h-full"
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
        <Card className="absolute top-full z-50 mt-2 max-h-96 w-full overflow-auto p-2">
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
                <div className="flex items-center gap-3 rounded-md p-2 transition-colors hover:bg-accent">
                  {result.imageUrl ? (
                    <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-full bg-muted">
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
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{result.title}</p>
                    {result.subtitle && (
                      <p className="truncate text-muted-foreground text-sm">
                        {result.subtitle}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {result.meta && (
                      <span className="text-muted-foreground text-xs">
                        {result.meta}
                      </span>
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
