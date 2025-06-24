'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Input } from '@repo/design-system/components/ui/input';
import { Button } from '@repo/design-system/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@repo/design-system/components/ui/card';
import { Badge } from '@repo/design-system/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@repo/design-system/components/ui/tabs';
import { Search, Music, MapPin, Calendar, Users, ExternalLink, Heart } from 'lucide-react';
import { format } from 'date-fns';
import Link from 'next/link';
import Image from 'next/image';
import { toast } from 'sonner';
import { cn } from '@repo/design-system/lib/utils';

type Artist = {
  id: string;
  name: string;
  slug: string;
  imageUrl?: string;
  genres: string[];
  popularity: number;
  showCount: number;
  followerCount: number;
  isFollowing: boolean;
};

type Show = {
  id: string;
  date: Date;
  status: string;
  ticketmasterUrl?: string;
  artist: {
    name: string;
    slug: string;
  };
  venue: {
    name: string;
    slug: string;
    city: string;
    state: string;
  };
};

type Venue = {
  id: string;
  name: string;
  slug: string;
  city: string;
  state: string;
  capacity?: number;
  showCount: number;
};

type SearchResults = {
  artists: Artist[];
  shows: Show[];
  venues: Venue[];
};

export function SearchInterface() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('artists');
  const [followingArtists, setFollowingArtists] = useState<Set<string>>(new Set());

  useEffect(() => {
    const q = searchParams.get('q');
    if (q && q !== query) {
      setQuery(q);
      performSearch(q);
    }
  }, [searchParams]);

  // Check if user is following artists
  useEffect(() => {
    const checkFollowingStatus = async () => {
      if (!results?.artists.length) return;
      
      try {
        const response = await fetch('/api/user/following');
        if (response.ok) {
          const data = await response.json();
          setFollowingArtists(new Set(data.artistIds));
        }
      } catch (error) {
        console.error('Failed to fetch following status:', error);
      }
    };

    checkFollowingStatus();
  }, [results]);

  const performSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults(null);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`);
      if (response.ok) {
        const data = await response.json();
        setResults(data);
        
        // Update URL without triggering reload
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.set('q', searchQuery);
        router.replace(newUrl.toString());
      }
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    performSearch(query);
  };

  const handleFollow = async (artistId: string, currentlyFollowing: boolean) => {
    try {
      const response = await fetch('/api/follow', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          artistId,
          following: !currentlyFollowing,
        }),
      });

      if (response.ok) {
        if (currentlyFollowing) {
          setFollowingArtists(prev => {
            const next = new Set(prev);
            next.delete(artistId);
            return next;
          });
          toast.success('Unfollowed artist');
        } else {
          setFollowingArtists(prev => new Set(prev).add(artistId));
          toast.success('Following artist');
        }
      } else if (response.status === 401) {
        toast.error('Please sign in to follow artists');
        router.push('/auth/sign-in');
      }
    } catch (error) {
      toast.error('Failed to update follow status');
    }
  };

  const resultCounts = results ? {
    artists: results.artists.length,
    shows: results.shows.length,
    venues: results.venues.length,
  } : { artists: 0, shows: 0, venues: 0 };

  return (
    <div className="space-y-6">
      {/* Search Form */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search for artists, shows, or venues..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-10 text-lg py-6"
          />
        </div>
        <Button type="submit" disabled={loading} className="px-8 py-6">
          {loading ? 'Searching...' : 'Search'}
        </Button>
      </form>

      {/* Loading State */}
      {loading && (
        <div className="text-center py-8">
          <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-muted-foreground">Searching Ticketmaster...</p>
        </div>
      )}

      {/* Results */}
      {results && !loading && (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="artists" className="gap-2">
              <Music className="h-4 w-4" />
              Artists ({resultCounts.artists})
            </TabsTrigger>
            <TabsTrigger value="shows" className="gap-2">
              <Calendar className="h-4 w-4" />
              Shows ({resultCounts.shows})
            </TabsTrigger>
            <TabsTrigger value="venues" className="gap-2">
              <MapPin className="h-4 w-4" />
              Venues ({resultCounts.venues})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="artists" className="mt-6">
            {results.artists.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Music className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No artists found</h3>
                  <p className="text-muted-foreground">
                    Try searching for a different artist name.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {results.artists.map((artist) => (
                  <Card key={artist.id} className="overflow-hidden">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-4">
                        {artist.imageUrl && (
                          <div className="relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
                            <Image
                              src={artist.imageUrl}
                              alt={artist.name}
                              fill
                              className="object-cover"
                            />
                          </div>
                        )}
                        <div className="flex-1">
                          <Link 
                            href={`/artists/${artist.slug}`}
                            className="text-xl font-bold hover:text-primary transition-colors"
                          >
                            {artist.name}
                          </Link>
                          <div className="flex items-center gap-2 mt-1">
                            {artist.genres.slice(0, 3).map((genre) => (
                              <Badge key={genre} variant="secondary" className="text-xs">
                                {genre}
                              </Badge>
                            ))}
                          </div>
                          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              <span>{artist.showCount} shows</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Users className="h-4 w-4" />
                              <span>{artist.followerCount.toLocaleString()} followers</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant={followingArtists.has(artist.id) ? "default" : "outline"}
                            size="sm"
                            onClick={() => handleFollow(artist.id, followingArtists.has(artist.id))}
                            className="gap-2"
                          >
                            <Heart className={cn(
                              "h-4 w-4",
                              followingArtists.has(artist.id) && "fill-current"
                            )} />
                            {followingArtists.has(artist.id) ? 'Following' : 'Follow'}
                          </Button>
                          <Button asChild>
                            <Link href={`/artists/${artist.slug}`}>
                              View Artist
                            </Link>
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="shows" className="mt-6">
            {results.shows.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No shows found</h3>
                  <p className="text-muted-foreground">
                    No upcoming shows match your search.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {results.shows.map((show) => (
                  <Card key={show.id}>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <Link 
                            href={`/artists/${show.artist.slug}`}
                            className="text-xl font-bold hover:text-primary transition-colors"
                          >
                            {show.artist.name}
                          </Link>
                          <div className="flex items-center gap-2 mt-1">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            <Link 
                              href={`/venues/${show.venue.slug}`}
                              className="text-muted-foreground hover:text-primary transition-colors"
                            >
                              {show.venue.name} • {show.venue.city}, {show.venue.state}
                            </Link>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span className="text-muted-foreground">
                              {format(new Date(show.date), 'PPP p')}
                            </span>
                            <Badge variant={show.status === 'on_sale' ? 'default' : 'secondary'}>
                              {show.status.replace('_', ' ')}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {show.ticketmasterUrl && (
                            <Button variant="outline" asChild>
                              <a 
                                href={show.ticketmasterUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="gap-2"
                              >
                                <ExternalLink className="h-4 w-4" />
                                Tickets
                              </a>
                            </Button>
                          )}
                          <Button asChild>
                            <Link href={`/setlists/${show.id}`}>
                              View Setlist
                            </Link>
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="venues" className="mt-6">
            {results.venues.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No venues found</h3>
                  <p className="text-muted-foreground">
                    No venues match your search criteria.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {results.venues.map((venue) => (
                  <Card key={venue.id}>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <Link 
                            href={`/venues/${venue.slug}`}
                            className="text-xl font-bold hover:text-primary transition-colors"
                          >
                            {venue.name}
                          </Link>
                          <div className="flex items-center gap-2 mt-1">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            <span className="text-muted-foreground">
                              {venue.city}, {venue.state}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              <span>{venue.showCount} shows</span>
                            </div>
                            {venue.capacity && (
                              <div className="flex items-center gap-1">
                                <Users className="h-4 w-4" />
                                <span>Capacity: {venue.capacity.toLocaleString()}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <Button asChild>
                          <Link href={`/venues/${venue.slug}`}>
                            View Venue
                          </Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}

      {/* Search Tips */}
      {!results && !loading && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Search Tips
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">Finding Artists</h4>
              <p className="text-sm text-muted-foreground">
                Search for artist names like "Taylor Swift", "The Beatles", or "Ed Sheeran". 
                We'll find them on Ticketmaster and add their shows to our database.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Live Data</h4>
              <p className="text-sm text-muted-foreground">
                All artist and show data comes directly from Ticketmaster, so you'll always 
                see the most up-to-date concert information.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Community Powered</h4>
              <p className="text-sm text-muted-foreground">
                Once shows are added, the community creates and votes on setlists together. 
                No effort required from artists!
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 