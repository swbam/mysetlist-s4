'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent } from '@repo/design-system/components/ui/card';
import { Badge } from '@repo/design-system/components/ui/badge';
import { Button } from '@repo/design-system/components/ui/button';
import { 
  Music, 
  MapPin, 
  Calendar, 
  Users, 
  ExternalLink, 
  Heart, 
  Star,
  Clock,
  DollarSign,
  TrendingUp
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@repo/design-system/lib/utils';

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

interface SearchResultCardProps {
  result: SearchResult;
  onFollow?: (artistId: string, isFollowing: boolean) => void;
  isFollowing?: boolean;
  showType?: boolean;
}

export function SearchResultCard({ 
  result, 
  onFollow, 
  isFollowing = false, 
  showType = true 
}: SearchResultCardProps) {
  const getResultIcon = () => {
    switch (result.type) {
      case 'artist': return <Music className="h-4 w-4" />;
      case 'show': return <Calendar className="h-4 w-4" />;
      case 'venue': return <MapPin className="h-4 w-4" />;
    }
  };

  const getResultLink = () => {
    switch (result.type) {
      case 'artist': return `/artists/${result.slug}`;
      case 'show': return `/shows/${result.slug}`;
      case 'venue': return `/venues/${result.slug}`;
      default: return '/';
    }
  };

  const getBadgeVariant = () => {
    switch (result.type) {
      case 'artist': return 'default';
      case 'show': return 'secondary';
      case 'venue': return 'outline';
    }
  };

  const formatPrice = (price: SearchResult['price']) => {
    if (!price) return null;
    return `${price.currency}${price.min}-${price.max}`;
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return format(date, 'MMM dd, yyyy');
    } catch {
      return dateString;
    }
  };

  const handleClick = () => {
    // Fire sync request for artist data; ignore errors
    if (result.type === 'artist') {
      fetch('/api/sync/artist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ artistId: result.id }),
      }).catch(() => {});
    }
  };

  return (
    <Card className={cn(
      "overflow-hidden transition-all duration-200 hover:shadow-md hover:scale-[1.02]",
      result.verified && "ring-2 ring-primary/20"
    )}>
      <CardContent className="p-6">
        <div className="flex items-center gap-4">
          {/* Image/Avatar */}
          {result.imageUrl ? (
            <div className="relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
              <Image
                src={result.imageUrl}
                alt={result.title}
                fill
                className="object-cover"
                sizes="64px"
              />
            </div>
          ) : (
            <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
              {getResultIcon()}
            </div>
          )}

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Link 
                href={getResultLink()}
                onClick={handleClick}
                className="text-xl font-bold hover:text-primary transition-colors truncate"
              >
                {result.title}
              </Link>
              
              {showType && (
                <Badge variant={getBadgeVariant()} className="text-xs">
                  {result.type}
                </Badge>
              )}
              
              {result.verified && (
                <Badge variant="default" className="text-xs bg-green-100 text-green-800">
                  <Star className="h-3 w-3 mr-1" />
                  Verified
                </Badge>
              )}
            </div>

            <p className="text-muted-foreground mb-2 truncate">
              {result.subtitle}
            </p>

            {/* Type-specific metadata */}
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              {result.type === 'artist' && (
                <>
                  {result.followerCount && (
                    <span className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      {result.followerCount.toLocaleString()} followers
                    </span>
                  )}
                  {result.showCount && (
                    <span className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {result.showCount} shows
                    </span>
                  )}
                  {result.popularity && (
                    <span className="flex items-center gap-1">
                      <TrendingUp className="h-4 w-4" />
                      {result.popularity}% popularity
                    </span>
                  )}
                </>
              )}

              {result.type === 'show' && (
                <>
                  {result.date && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {formatDate(result.date)}
                    </span>
                  )}
                  {result.price && (
                    <span className="flex items-center gap-1">
                      <DollarSign className="h-4 w-4" />
                      {formatPrice(result.price)}
                    </span>
                  )}
                </>
              )}

              {result.type === 'venue' && (
                <>
                  {result.capacity && (
                    <span className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      {result.capacity.toLocaleString()} capacity
                    </span>
                  )}
                  {result.showCount && (
                    <span className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {result.showCount} upcoming shows
                    </span>
                  )}
                </>
              )}
            </div>

            {/* Genres for artists */}
            {result.type === 'artist' && result.genres && result.genres.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {result.genres.slice(0, 3).map((genre) => (
                  <Badge key={genre} variant="outline" className="text-xs">
                    {genre}
                  </Badge>
                ))}
                {result.genres.length > 3 && (
                  <Badge variant="outline" className="text-xs">
                    +{result.genres.length - 3} more
                  </Badge>
                )}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2 flex-shrink-0">
            {result.type === 'artist' && onFollow && (
              <Button
                variant={isFollowing ? "default" : "outline"}
                size="sm"
                onClick={() => onFollow(result.id, isFollowing)}
                className="gap-2"
              >
                <Heart className={cn(
                  "h-4 w-4",
                  isFollowing && "fill-current"
                )} />
                {isFollowing ? 'Following' : 'Follow'}
              </Button>
            )}

            {result.type === 'show' && result.venue && (
              <Link href={`/venues/${result.venue.name.toLowerCase().replace(/\s+/g, '-')}`}>
                <Button variant="outline" size="sm" className="gap-2">
                  <MapPin className="h-4 w-4" />
                  Venue
                </Button>
              </Link>
            )}

            <Link href={getResultLink()} onClick={handleClick}>
              <Button size="sm" className="gap-2">
                <ExternalLink className="h-4 w-4" />
                {result.type === 'artist' ? 'View Artist' : 
                 result.type === 'show' ? 'View Show' : 'View Venue'}
              </Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}