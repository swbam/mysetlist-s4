'use client';

import { useState } from 'react';
import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Search, Loader2 } from 'lucide-react';
import { Input } from '@repo/design-system/components/ui/input';
import { Button } from '@repo/design-system/components/ui/button';
import { Card, CardContent, CardHeader } from '@repo/design-system/components/ui/card';
import { Badge } from '@repo/design-system/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@repo/design-system/components/ui/avatar';
import { useDebounce } from '@/hooks/use-debounce';
import { Alert, AlertDescription } from '@repo/design-system/components/ui/alert';

interface Artist {
  id: string;
  name: string;
  imageUrl?: string;
  genres?: string[];
  source: 'database' | 'ticketmaster';
  externalId?: string;
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
      const response = await fetch(`/api/artists/search?q=${encodeURIComponent(searchQuery)}`);
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
    // If artist is from external source, sync it first
    if (artist.source === 'ticketmaster' && artist.externalId) {
      setIsSyncing(artist.id);
      setError(null);

      try {
        const response = await fetch('/api/artists/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ externalId: artist.externalId, name: artist.name }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Sync failed');
        }

        // Navigate to the synced artist page
        router.push(`/artists/${data.slug}`);
      } catch (err: any) {
        setError(err.message || 'Failed to sync artist');
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
    <div className="w-full max-w-3xl mx-auto space-y-6">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search for artists..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-10 h-12 text-lg"
        />
        {isSearching && (
          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin" />
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
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => handleSelectArtist(artist)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={artist.imageUrl} alt={artist.name} />
                    <AvatarFallback>{artist.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold">{artist.name}</h3>
                    {artist.genres && artist.genres.length > 0 && (
                      <div className="flex gap-1 mt-1 flex-wrap">
                        {artist.genres.slice(0, 3).map((genre) => (
                          <Badge key={genre} variant="secondary" className="text-xs">
                            {genre}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {artist.source === 'ticketmaster' && (
                      <Badge variant="outline" className="text-xs">
                        External
                      </Badge>
                    )}
                    {isSyncing === artist.id ? (
                      <Button size="sm" disabled>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Syncing...
                      </Button>
                    ) : (
                      <Button size="sm" variant={artist.source === 'database' ? 'default' : 'secondary'}>
                        {artist.source === 'database' ? 'View' : 'Import'}
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
        <div className="text-center py-8">
          <p className="text-muted-foreground">
            No artists found for "{query}". Try a different search term.
          </p>
        </div>
      )}
    </div>
  );
}