'use client';

import { useDebounce } from '@/hooks/use-debounce';
import {
  Alert,
  AlertDescription,
} from '@repo/design-system/components/ui/alert';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@repo/design-system/components/ui/avatar';
import { Badge } from '@repo/design-system/components/ui/badge';
import { Button } from '@repo/design-system/components/ui/button';
import { Card, CardHeader } from '@repo/design-system/components/ui/card';
import { Input } from '@repo/design-system/components/ui/input';
import { Loader2, Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import * as React from 'react';

interface Artist {
  id: string;
  name: string;
  imageUrl?: string;
  genres?: string[];
  source: 'database' | 'ticketmaster' | 'spotify';
  externalId?: string;
  spotifyId?: string;
  ticketmasterId?: string;
  popularity?: number;
}

export function ArtistSearch() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isSyncing, setIsSyncing] = useState<string | null>(null);
  const [results, setResults] = useState<Artist[]>([]);
  const [error, setError] = useState<string | null>(null);
  const debouncedQuery = useDebounce(query, 500);

  const searchArtists = async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    setIsSearching(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/artists/search?q=${encodeURIComponent(searchQuery)}`
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Search failed');
      }

      setResults(data.artists || []);
    } catch (err: any) {
      setError(err.message || 'Failed to search artists');
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectArtist = async (artist: Artist) => {
    // If artist is from external source, trigger auto-import
    if (artist.source !== 'database') {
      setIsSyncing(artist.id);
      setError(null);

      try {
        const response = await fetch('/api/artists/auto-import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            artistName: artist.name,
            spotifyId:
              artist.spotifyId || artist.source === 'spotify'
                ? artist.id
                : undefined,
            ticketmasterId:
              artist.ticketmasterId || artist.source === 'ticketmaster'
                ? artist.externalId
                : undefined,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Import failed');
        }

        // Navigate to the imported artist page
        if (data.artist?.slug) {
          router.push(`/artists/${data.artist.slug}`);
        } else {
          throw new Error('Failed to get artist slug');
        }
      } catch (err: any) {
        setError(err.message || 'Failed to import artist');
      } finally {
        setIsSyncing(null);
      }
    } else {
      // Artist already in database, navigate directly
      // artist.id is actually the slug for database artists
      router.push(`/artists/${artist.id}`);
    }
  };

  // Trigger search when debounced query changes
  React.useEffect(() => {
    if (debouncedQuery) {
      searchArtists(debouncedQuery);
    } else {
      setResults([]);
    }
  }, [debouncedQuery]);

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <div className="relative">
        <Search className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search for artists..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="h-12 pl-10 text-lg"
        />
        {isSearching && (
          <Loader2 className="-translate-y-1/2 absolute top-1/2 right-3 h-4 w-4 animate-spin" />
        )}
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {results.length > 0 && (
        <div className="grid gap-4">
          {results.map((artist) => (
            <Card
              key={`${artist.source}-${artist.id}`}
              className="cursor-pointer transition-shadow hover:shadow-lg"
              onClick={() => handleSelectArtist(artist)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={artist.imageUrl} alt={artist.name} />
                    <AvatarFallback>
                      {artist.name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-lg">{artist.name}</h3>
                      {artist.source !== 'database' && (
                        <Badge variant="outline" className="text-xs">
                          {artist.source === 'spotify'
                            ? 'Spotify'
                            : 'Ticketmaster'}
                        </Badge>
                      )}
                    </div>
                    {artist.genres && artist.genres.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {artist.genres.slice(0, 3).map((genre) => (
                          <Badge
                            key={genre}
                            variant="secondary"
                            className="text-xs"
                          >
                            {genre}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {isSyncing === artist.id ? (
                      <Button size="sm" disabled>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Syncing...
                      </Button>
                    ) : (
                      <Button size="sm" variant="default">
                        View
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}

      {query && !isSearching && results.length === 0 && (
        <div className="py-8 text-center">
          <p className="text-muted-foreground">
            No artists found for "{query}". Try a different search term.
          </p>
        </div>
      )}
    </div>
  );
}
