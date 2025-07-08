'use client';

import { SearchBox } from '@repo/design-system';
import { Card, CardContent, CardHeader, CardTitle } from '@repo/design-system';
import { Badge } from '@repo/design-system';
import { Button } from '@repo/design-system';
import { Calendar, MapPin, Music, Search, TrendingUp } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';

interface SearchSuggestion {
  id: string;
  type:
    | 'artist'
    | 'show'
    | 'venue'
    | 'song'
    | 'genre'
    | 'location'
    | 'recent'
    | 'trending';
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

interface SearchResult {
  id: string;
  type: 'artist' | 'show' | 'venue';
  title: string;
  subtitle: string;
  imageUrl?: string | null;
  slug: string;
  verified?: boolean;
  popularity?: number;
  genres?: string[];
  showCount?: number;
  followerCount?: number;
  date?: string;
  venue?: {
    name: string;
    city: string;
    state: string;
  };
  artist?: {
    name: string;
    slug: string;
  };
  capacity?: number;
  price?: {
    min: number;
    max: number;
    currency: string;
  };
}

interface EnhancedSearchProps {
  placeholder?: string;
  showRecentSearches?: boolean;
  autoFocus?: boolean;
  onResultSelect?: (result: SearchResult) => void;
  className?: string;
}

export function EnhancedSearch({
  placeholder = 'Search artists, shows, venues...',
  showRecentSearches = true,
  autoFocus = false,
  onResultSelect,
  className,
}: EnhancedSearchProps) {
  const router = useRouter();
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Load recent searches from localStorage
  useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('mysetlist-recent-searches');
      if (stored) {
        try {
          setRecentSearches(JSON.parse(stored));
        } catch (error) {
          console.error('Failed to parse recent searches:', error);
        }
      }
    }
  });

  const saveToRecentSearches = useCallback(
    (query: string) => {
      if (typeof window === 'undefined') return;

      const updated = [
        query,
        ...recentSearches.filter((q) => q !== query),
      ].slice(0, 10); // Keep only last 10 searches

      setRecentSearches(updated);
      localStorage.setItem(
        'mysetlist-recent-searches',
        JSON.stringify(updated)
      );
    },
    [recentSearches]
  );

  const handleSearch = async (query: string): Promise<SearchSuggestion[]> => {
    if (query.length < 2) return [];

    try {
      const response = await fetch(
        `/api/search/suggestions?q=${encodeURIComponent(query)}`
      );
      if (response.ok) {
        const data = await response.json();
        return data.suggestions || [];
      }
    } catch (error) {
      console.error('Search suggestions failed:', error);
    }

    return [];
  };

  const handleSuggestionSelect = async (suggestion: SearchSuggestion) => {
    saveToRecentSearches(suggestion.title);

    // Handle different suggestion types
    switch (suggestion.type) {
      case 'artist':
        router.push(`/artists/${suggestion.id}`);
        break;
      case 'show':
        router.push(`/shows/${suggestion.id}`);
        break;
      case 'venue':
        router.push(`/venues/${suggestion.id}`);
        break;
      case 'genre':
        router.push(`/discover?genre=${encodeURIComponent(suggestion.title)}`);
        break;
      case 'location':
        router.push(
          `/discover?location=${encodeURIComponent(suggestion.title)}`
        );
        break;
      case 'recent':
      case 'trending':
        performFullSearch(suggestion.title);
        break;
      default:
        performFullSearch(suggestion.title);
    }
  };

  const handleSearchSubmit = (query: string) => {
    saveToRecentSearches(query);
    performFullSearch(query);
  };

  const performFullSearch = async (query: string) => {
    setIsSearching(true);
    router.push(`/search?q=${encodeURIComponent(query)}`);
  };

  return (
    <div className={className}>
      <SearchBox
        placeholder={placeholder}
        onSearch={handleSearch}
        onSelect={handleSuggestionSelect}
        onSubmit={handleSearchSubmit}
        showRecentSearches={showRecentSearches}
        recentSearches={recentSearches}
        autoFocus={autoFocus}
        disabled={isSearching}
      />

      {/* Quick Search Categories */}
      {!isSearching && (
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card
            className="cursor-pointer transition-shadow hover:shadow-md"
            onClick={() => router.push('/artists')}
          >
            <CardContent className="p-4 text-center">
              <Music className="mx-auto mb-2 h-8 w-8 text-primary" />
              <h3 className="mb-1 font-semibold">Artists</h3>
              <p className="text-muted-foreground text-sm">
                Discover and follow your favorite musicians
              </p>
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer transition-shadow hover:shadow-md"
            onClick={() => router.push('/shows')}
          >
            <CardContent className="p-4 text-center">
              <Calendar className="mx-auto mb-2 h-8 w-8 text-primary" />
              <h3 className="mb-1 font-semibold">Shows</h3>
              <p className="text-muted-foreground text-sm">
                Find concerts and view setlists
              </p>
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer transition-shadow hover:shadow-md"
            onClick={() => router.push('/venues')}
          >
            <CardContent className="p-4 text-center">
              <MapPin className="mx-auto mb-2 h-8 w-8 text-primary" />
              <h3 className="mb-1 font-semibold">Venues</h3>
              <p className="text-muted-foreground text-sm">
                Explore concert halls and arenas
              </p>
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer transition-shadow hover:shadow-md"
            onClick={() => router.push('/trending')}
          >
            <CardContent className="p-4 text-center">
              <TrendingUp className="mx-auto mb-2 h-8 w-8 text-primary" />
              <h3 className="mb-1 font-semibold">Trending</h3>
              <p className="text-muted-foreground text-sm">
                What's hot in the music world
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Popular Searches */}
      {!isSearching && recentSearches.length === 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Popular Right Now
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {[
                'Taylor Swift',
                'Coldplay',
                'Ed Sheeran',
                'BTS',
                'Billie Eilish',
                'The Weeknd',
                'Ariana Grande',
                'Drake',
              ].map((artist) => (
                <Button
                  key={artist}
                  variant="outline"
                  size="sm"
                  onClick={() => performFullSearch(artist)}
                  className="gap-2"
                >
                  <Search className="h-3 w-3" />
                  {artist}
                </Button>
              ))}
            </div>

            <div className="mt-4">
              <h4 className="mb-2 font-medium">Popular Genres</h4>
              <div className="flex flex-wrap gap-2">
                {[
                  'Rock',
                  'Pop',
                  'Hip-Hop',
                  'Electronic',
                  'Country',
                  'Jazz',
                  'R&B',
                  'Indie',
                ].map((genre) => (
                  <Badge
                    key={genre}
                    variant="secondary"
                    className="cursor-pointer hover:bg-secondary/80"
                    onClick={() =>
                      router.push(
                        `/discover?genre=${encodeURIComponent(genre)}`
                      )
                    }
                  >
                    {genre}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
