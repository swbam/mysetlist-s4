'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { format } from 'date-fns';
import { 
  Sparkles, 
  Calendar, 
  MapPin, 
  Music, 
  Building2,
  RefreshCw,
  Info,
  ChevronRight,
  Heart,
  ExternalLink,
  TrendingUp
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@repo/design-system/components/ui/card';
import { Badge } from '@repo/design-system/components/ui/badge';
import { Button } from '@repo/design-system/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@repo/design-system/components/ui/tabs';
import { Skeleton } from '@repo/design-system/components/ui/skeleton';
import { Alert, AlertDescription } from '@repo/design-system/components/ui/alert';
import { useAuth } from '@/app/providers/auth-provider';
import type { RecommendedItem } from '@/lib/recommendations';

interface RecommendationsData {
  shows: RecommendedItem[];
  artists: RecommendedItem[];
  venues: RecommendedItem[];
}

export default function DiscoverPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [recommendations, setRecommendations] = useState<RecommendationsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!user) {
      router.push('/auth/sign-in?redirect=/discover');
      return;
    }

    fetchRecommendations();
  }, [user, router]);

  const fetchRecommendations = async () => {
    try {
      setError(null);
      const response = await fetch('/api/recommendations?type=all');
      
      if (!response.ok) {
        throw new Error('Failed to fetch recommendations');
      }

      const data = await response.json();
      setRecommendations(data.data);
    } catch (err) {
      setError('Unable to load recommendations. Please try again later.');
      console.error('Error fetching recommendations:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchRecommendations();
  };

  if (!user) {
    return null;
  }

  if (loading) {
    return <DiscoverLoading />;
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!recommendations) {
    return (
      <div className="container mx-auto px-4 py-8">
        <EmptyState />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-4 flex items-center gap-2">
              <Sparkles className="w-8 h-8" />
              Discover
            </h1>
            <p className="text-muted-foreground text-lg">
              Personalized recommendations based on your music taste
            </p>
          </div>
          
          <Button
            onClick={handleRefresh}
            disabled={refreshing}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      <Tabs defaultValue="shows" className="w-full">
        <TabsList className="grid w-full grid-cols-3 max-w-[400px]">
          <TabsTrigger value="shows" className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Shows
          </TabsTrigger>
          <TabsTrigger value="artists" className="flex items-center gap-2">
            <Music className="w-4 h-4" />
            Artists
          </TabsTrigger>
          <TabsTrigger value="venues" className="flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            Venues
          </TabsTrigger>
        </TabsList>

        <TabsContent value="shows" className="mt-6">
          <RecommendedShows shows={recommendations.shows} />
        </TabsContent>

        <TabsContent value="artists" className="mt-6">
          <RecommendedArtists artists={recommendations.artists} />
        </TabsContent>

        <TabsContent value="venues" className="mt-6">
          <RecommendedVenues venues={recommendations.venues} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function RecommendedShows({ shows }: { shows: RecommendedItem[] }) {
  if (shows.length === 0) {
    return (
      <Alert>
        <Info className="w-4 h-4" />
        <AlertDescription>
          No show recommendations available yet. Follow some artists or attend shows to get personalized recommendations!
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {shows.map((show) => (
        <Card key={show.id} className="hover:shadow-lg transition-shadow h-full">
          <Link href={`/shows/${show.slug}`}>
            <CardHeader className="p-4 pb-2">
              <div className="flex items-start justify-between">
                <CardTitle className="text-lg line-clamp-2">
                  {show.metadata?.artist_name}
                </CardTitle>
                <Badge variant="outline" className="text-xs">
                  {Math.round(show.score * 100)}% match
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">{show.reason}</p>
            </CardHeader>
            <CardContent className="p-4 pt-2">
              {show.image_url && (
                <div className="relative w-full h-40 mb-3 rounded-md overflow-hidden">
                  <Image
                    src={show.image_url}
                    alt={show.metadata?.artist_name || ''}
                    fill
                    className="object-cover"
                  />
                </div>
              )}
              
              <div className="space-y-2 text-sm text-muted-foreground">
                <p className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {show.metadata?.venue_name}
                </p>
                {show.metadata?.show_date && (
                  <p className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {format(new Date(show.metadata.show_date), 'EEEE, MMMM d')}
                  </p>
                )}
              </div>

              <div className="mt-3 flex items-center text-primary">
                <span className="text-sm font-medium">View details</span>
                <ChevronRight className="w-4 h-4 ml-1" />
              </div>
            </CardContent>
          </Link>
        </Card>
      ))}
    </div>
  );
}

function RecommendedArtists({ artists }: { artists: RecommendedItem[] }) {
  if (artists.length === 0) {
    return (
      <Alert>
        <Info className="w-4 h-4" />
        <AlertDescription>
          No artist recommendations available yet. Start following artists to discover similar ones!
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {artists.map((artist) => (
        <Card key={artist.id} className="hover:shadow-lg transition-shadow h-full">
          <Link href={`/artists/${artist.slug}`}>
            <CardHeader className="p-4 pb-2">
              <div className="flex items-start justify-between">
                <CardTitle className="text-lg line-clamp-1">{artist.name}</CardTitle>
                <Badge variant="outline" className="text-xs">
                  {Math.round(artist.score * 100)}% match
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground line-clamp-2">{artist.reason}</p>
            </CardHeader>
            <CardContent className="p-4 pt-2">
              {artist.image_url && (
                <div className="relative w-full h-40 mb-3 rounded-md overflow-hidden">
                  <Image
                    src={artist.image_url}
                    alt={artist.name}
                    fill
                    className="object-cover"
                  />
                </div>
              )}

              {artist.metadata?.genres && artist.metadata.genres.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {artist.metadata.genres.slice(0, 3).map((genre: string) => (
                    <Badge key={genre} variant="secondary" className="text-xs">
                      {genre}
                    </Badge>
                  ))}
                </div>
              )}

              {artist.metadata?.followers && (
                <p className="text-sm text-muted-foreground">
                  {artist.metadata.followers.toLocaleString()} followers
                </p>
              )}

              <div className="mt-3 flex items-center text-primary">
                <span className="text-sm font-medium">View artist</span>
                <ChevronRight className="w-4 h-4 ml-1" />
              </div>
            </CardContent>
          </Link>
        </Card>
      ))}
    </div>
  );
}

function RecommendedVenues({ venues }: { venues: RecommendedItem[] }) {
  if (venues.length === 0) {
    return (
      <Alert>
        <Info className="w-4 h-4" />
        <AlertDescription>
          No venue recommendations available yet. Attend some shows to get venue suggestions!
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {venues.map((venue) => (
        <Card key={venue.id} className="hover:shadow-lg transition-shadow h-full">
          <Link href={`/venues/${venue.slug}`}>
            <CardHeader className="p-4 pb-2">
              <div className="flex items-start justify-between">
                <CardTitle className="text-lg line-clamp-1">{venue.name}</CardTitle>
                <Badge variant="outline" className="text-xs">
                  {Math.round(venue.score * 100)}% match
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">{venue.reason}</p>
            </CardHeader>
            <CardContent className="p-4 pt-2">
              {venue.image_url && (
                <div className="relative w-full h-40 mb-3 rounded-md overflow-hidden">
                  <Image
                    src={venue.image_url}
                    alt={venue.name}
                    fill
                    className="object-cover"
                  />
                </div>
              )}

              <div className="space-y-2 text-sm text-muted-foreground">
                <p className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {venue.metadata?.city}
                </p>
                {venue.metadata?.capacity && (
                  <p>Capacity: {venue.metadata.capacity.toLocaleString()}</p>
                )}
                {venue.metadata?.show_count && (
                  <p>{venue.metadata.show_count} upcoming shows</p>
                )}
              </div>

              <div className="mt-3 flex items-center text-primary">
                <span className="text-sm font-medium">View venue</span>
                <ChevronRight className="w-4 h-4 ml-1" />
              </div>
            </CardContent>
          </Link>
        </Card>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <Card className="max-w-2xl mx-auto">
      <CardContent className="p-8 text-center">
        <Sparkles className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
        <h2 className="text-2xl font-semibold mb-2">Welcome to Discover!</h2>
        <p className="text-muted-foreground mb-6">
          We'll show you personalized recommendations once you start using MySetlist.
        </p>
        <div className="space-y-4 text-left max-w-md mx-auto">
          <div className="flex items-start gap-3">
            <Music className="w-5 h-5 text-primary mt-0.5" />
            <div>
              <p className="font-medium">Follow Artists</p>
              <p className="text-sm text-muted-foreground">
                Follow your favorite artists to discover similar ones
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Calendar className="w-5 h-5 text-primary mt-0.5" />
            <div>
              <p className="font-medium">Attend Shows</p>
              <p className="text-sm text-muted-foreground">
                Mark shows you're attending to get venue recommendations
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Building2 className="w-5 h-5 text-primary mt-0.5" />
            <div>
              <p className="font-medium">Vote on Setlists</p>
              <p className="text-sm text-muted-foreground">
                Vote for songs to help us understand your preferences
              </p>
            </div>
          </div>
        </div>
        <div className="mt-6">
          <Button asChild>
            <Link href="/artists">Explore Artists</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function DiscoverLoading() {
  return (
    <div className="container mx-auto px-4 py-8">
      <Skeleton className="h-10 w-48 mb-4" />
      <Skeleton className="h-6 w-96 mb-8" />
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="p-4 pb-2">
              <Skeleton className="h-5 w-3/4 mb-2" />
              <Skeleton className="h-4 w-full" />
            </CardHeader>
            <CardContent className="p-4 pt-2">
              <Skeleton className="w-full h-40 mb-3 rounded-md" />
              <Skeleton className="h-4 w-2/3 mb-2" />
              <Skeleton className="h-4 w-1/2" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}