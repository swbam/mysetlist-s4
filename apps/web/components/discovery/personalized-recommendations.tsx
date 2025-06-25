'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@repo/design-system/components/ui/card';
import { Badge } from '@repo/design-system/components/ui/badge';
import { Button } from '@repo/design-system/components/ui/button';
import { Skeleton } from '@repo/design-system/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@repo/design-system/components/ui/avatar';
import { 
  Sparkles, 
  Music, 
  Calendar, 
  MapPin, 
  Heart,
  Users,
  RefreshCw,
  Star,
  ExternalLink,
  TrendingUp
} from 'lucide-react';
import { cn } from '@repo/design-system/lib/utils';
import { toast } from 'sonner';

interface Recommendation {
  id: string;
  type: 'artist' | 'show' | 'venue' | 'genre';
  title: string;
  subtitle: string;
  imageUrl?: string;
  slug: string;
  reason: string;
  confidence: number;
  metadata?: {
    genres?: string[];
    popularity?: number;
    followerCount?: number;
    showDate?: string;
    venue?: string;
    price?: string;
  };
}

interface PersonalizedRecommendationsProps {
  userId?: string;
  category?: 'all' | 'artists' | 'shows' | 'venues';
  limit?: number;
  className?: string;
}

export function PersonalizedRecommendations({ 
  userId, 
  category = 'all', 
  limit = 6,
  className 
}: PersonalizedRecommendationsProps) {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [followingArtists, setFollowingArtists] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchRecommendations();
    fetchFollowingStatus();
  }, [userId, category, limit]);

  const fetchRecommendations = async () => {
    setLoading(true);
    setError(null);
    
    try {
      if (userId) {
        // For authenticated users, use the existing recommendations API
        const params = new URLSearchParams({
          type: category,
          limit: limit.toString(),
        });
        
        const response = await fetch(`/api/recommendations?${params}`);
        if (!response.ok) {
          if (response.status === 401) {
            // If not authenticated, fall back to trending data
            return fetchTrendingData();
          }
          throw new Error('Failed to fetch recommendations');
        }
        
        const result = await response.json();
        
        // Transform API response to component format
        const recommendations: Recommendation[] = [];
        
        if (result.data) {
          // Process different types from the API response
          if (result.data.shows) {
            recommendations.push(...result.data.shows.map((show: any) => ({
              id: show.id,
              type: 'show' as const,
              title: show.title || show.name,
              subtitle: show.artist || show.venue_name || 'Show',
              imageUrl: show.image_url || show.imageUrl,
              slug: show.id,
              reason: 'Recommended based on your music preferences and location',
              confidence: Math.round(show.score || 75),
              metadata: {
                showDate: show.date,
                venue: show.venue_name,
                price: show.price_range,
              },
            })));
          }
          
          if (result.data.artists) {
            recommendations.push(...result.data.artists.map((artist: any) => ({
              id: artist.id,
              type: 'artist' as const,
              title: artist.name,
              subtitle: artist.genre || 'Artist',
              imageUrl: artist.image_url || artist.imageUrl,
              slug: artist.id,
              reason: 'Similar to artists you follow and like',
              confidence: Math.round(artist.score || 75),
              metadata: {
                genres: artist.genres ? [artist.genre] : [],
                followerCount: artist.follower_count,
                popularity: artist.popularity,
              },
            })));
          }
          
          if (result.data.venues) {
            recommendations.push(...result.data.venues.map((venue: any) => ({
              id: venue.id,
              type: 'venue' as const,
              title: venue.name,
              subtitle: `${venue.city}, ${venue.state}`,
              imageUrl: venue.image_url || venue.imageUrl,
              slug: venue.id,
              reason: 'Near your location or similar to venues you visit',
              confidence: Math.round(venue.score || 75),
              metadata: {},
            })));
          }
        }
        
        setRecommendations(recommendations.slice(0, limit));
      } else {
        // For unauthenticated users, use trending data
        await fetchTrendingData();
      }
    } catch (err) {
      console.error('Error fetching recommendations:', err);
      setError('Failed to load recommendations');
    } finally {
      setLoading(false);
    }
  };

  const fetchTrendingData = async () => {
    try {
      const response = await fetch(`/api/trending/live?timeframe=24h&type=${category === 'all' ? 'all' : category}&limit=${limit}`);
      if (!response.ok) throw new Error('Failed to fetch trending data');
      
      const trendingData = await response.json();
      
      // Transform trending data to recommendation format
      const recommendations: Recommendation[] = trendingData.trending?.map((item: any) => ({
        id: item.id,
        type: item.type as Recommendation['type'],
        title: item.name,
        subtitle: `Trending ${item.type}`,
        imageUrl: item.image_url || item.imageUrl,
        slug: item.id,
        reason: `Popular in the last 24 hours with ${item.score} trend points`,
        confidence: Math.min(Math.round(item.score / 10), 100),
        metadata: {
          popularity: item.score,
        },
      })) || [];
      
      setRecommendations(recommendations);
    } catch (err) {
      console.error('Error fetching trending data:', err);
      setError('Failed to load trending recommendations');
    }
  };

  const fetchFollowingStatus = async () => {
    if (!userId) return;
    
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

  const handleFollow = async (artistId: string, isFollowing: boolean) => {
    try {
      const response = await fetch(`/api/artists/${artistId}/follow`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          following: !isFollowing,
        }),
      });

      if (response.ok) {
        if (isFollowing) {
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
      }
    } catch (error) {
      toast.error('Failed to update follow status');
    }
  };

  const getIcon = (type: Recommendation['type']) => {
    switch (type) {
      case 'artist': return <Music className="h-4 w-4" />;
      case 'show': return <Calendar className="h-4 w-4" />;
      case 'venue': return <MapPin className="h-4 w-4" />;
      case 'genre': return <Star className="h-4 w-4" />;
    }
  };

  const getLink = (recommendation: Recommendation) => {
    switch (recommendation.type) {
      case 'artist': return `/artists/${recommendation.slug}`;
      case 'show': return `/shows/${recommendation.slug}`;
      case 'venue': return `/venues/${recommendation.slug}`;
      case 'genre': return `/search?genre=${encodeURIComponent(recommendation.title)}`;
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'text-green-600 bg-green-50';
    if (confidence >= 60) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 80) return 'High match';
    if (confidence >= 60) return 'Good match';
    return 'Possible match';
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-500" />
            Recommended for You
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: limit }).map((_, i) => (
              <div key={i} className="space-y-4">
                <Skeleton className="h-32 w-full rounded-lg" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-500" />
            Recommended for You
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={fetchRecommendations} variant="outline">
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-500" />
            Recommended for You
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchRecommendations}
            className="h-8 w-8 p-0"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {recommendations.length === 0 ? (
          <div className="text-center py-8">
            <Sparkles className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No recommendations yet</h3>
            <p className="text-muted-foreground mb-4">
              Follow some artists and attend shows to get personalized recommendations.
            </p>
            <Link href="/artists">
              <Button>Discover Artists</Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recommendations.map((recommendation) => (
              <Card key={recommendation.id} className="overflow-hidden hover:shadow-md transition-shadow">
                <div className="relative">
                  {recommendation.imageUrl ? (
                    <div className="h-32 bg-cover bg-center" style={{ backgroundImage: `url(${recommendation.imageUrl})` }}>
                      <div className="absolute inset-0 bg-black/20" />
                    </div>
                  ) : (
                    <div className="h-32 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                      {getIcon(recommendation.type)}
                    </div>
                  )}
                  
                  <div className="absolute top-2 right-2">
                    <Badge className={cn("text-xs", getConfidenceColor(recommendation.confidence))}>
                      {getConfidenceLabel(recommendation.confidence)}
                    </Badge>
                  </div>
                </div>

                <CardContent className="p-4">
                  <div className="space-y-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Link
                          href={getLink(recommendation)}
                          className="font-semibold hover:underline truncate"
                        >
                          {recommendation.title}
                        </Link>
                        <Badge variant="outline" className="text-xs">
                          {recommendation.type}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {recommendation.subtitle}
                      </p>
                    </div>

                    <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                      <span className="font-medium">Why this recommendation:</span>
                      <br />
                      {recommendation.reason}
                    </div>

                    {recommendation.metadata?.genres && (
                      <div className="flex flex-wrap gap-1">
                        {recommendation.metadata.genres.slice(0, 2).map((genre) => (
                          <Badge key={genre} variant="outline" className="text-xs">
                            {genre}
                          </Badge>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-2">
                      {recommendation.type === 'artist' && (
                        <Button
                          variant={followingArtists.has(recommendation.id) ? "default" : "outline"}
                          size="sm"
                          onClick={() => handleFollow(recommendation.id, followingArtists.has(recommendation.id))}
                          className="gap-1"
                        >
                          <Heart className={cn(
                            "h-3 w-3",
                            followingArtists.has(recommendation.id) && "fill-current"
                          )} />
                          {followingArtists.has(recommendation.id) ? 'Following' : 'Follow'}
                        </Button>
                      )}
                      
                      <Link href={getLink(recommendation)}>
                        <Button size="sm" variant={recommendation.type === 'artist' ? "ghost" : "default"}>
                          <ExternalLink className="h-3 w-3 mr-1" />
                          View
                        </Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}