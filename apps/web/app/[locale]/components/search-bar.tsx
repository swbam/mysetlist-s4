'use client';

import { useState, useEffect, useRef } from 'react';
import { Input } from '@repo/design-system/components/ui/input';
import { Button } from '@repo/design-system/components/ui/button';
import { Card } from '@repo/design-system/components/ui/card';
import { Badge } from '@repo/design-system/components/ui/badge';
import { Search, Music, MapPin, Calendar, X } from 'lucide-react';
import Link from 'next/link';

type SearchResult = {
  id: string;
  type: 'artist' | 'show' | 'venue';
  title: string;
  subtitle?: string;
  meta?: string;
};

// Mock search results - in real app this would come from the database
const mockSearch = (query: string): SearchResult[] => {
  if (!query) return [];
  
  const results: SearchResult[] = [
    { id: '1', type: 'artist', title: 'Taylor Swift', subtitle: 'Pop', meta: '52 upcoming shows' },
    { id: '2', type: 'artist', title: 'The Weeknd', subtitle: 'R&B', meta: '45 upcoming shows' },
    { id: '3', type: 'show', title: 'Taylor Swift - The Eras Tour', subtitle: 'Madison Square Garden', meta: 'March 15' },
    { id: '4', type: 'venue', title: 'Madison Square Garden', subtitle: 'New York, NY', meta: 'Capacity: 20,000' },
    { id: '5', type: 'venue', title: 'The Forum', subtitle: 'Los Angeles, CA', meta: 'Capacity: 17,500' },
  ];
  
  return results.filter(result => 
    result.title.toLowerCase().includes(query.toLowerCase())
  );
};

export const SearchBar = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
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

  useEffect(() => {
    if (query.length > 1) {
      const searchResults = mockSearch(query);
      setResults(searchResults);
      setIsOpen(true);
    } else {
      setResults([]);
      setIsOpen(false);
    }
  }, [query]);

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

  const getHref = (result: SearchResult) => {
    switch (result.type) {
      case 'artist':
        return `/artists/${result.id}`;
      case 'show':
        return `/setlists/${result.id}`;
      case 'venue':
        return `/venues/${result.id}`;
    }
  };

  return (
    <div ref={searchRef} className="relative w-full max-w-lg">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
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
                href={getHref(result)}
                onClick={() => {
                  setQuery('');
                  setIsOpen(false);
                }}
              >
                <div className="flex items-center gap-3 p-2 rounded-md hover:bg-accent transition-colors">
                  <div className="text-muted-foreground">
                    {getIcon(result.type)}
                  </div>
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