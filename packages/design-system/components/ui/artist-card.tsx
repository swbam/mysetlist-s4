import { Card, CardContent, CardHeader } from './card';
import { Avatar, AvatarFallback, AvatarImage } from './avatar';
import { Badge } from './badge';
import { Button } from './button';
import { Heart, Music, Users } from 'lucide-react';

interface ArtistCardProps {
  artist: {
    id: string;
    name: string;
    imageUrl?: string;
    genres: string[];
    followers: number;
    isFollowing?: boolean;
  };
  onFollow?: (artistId: string) => void;
  variant?: 'default' | 'compact' | 'detailed';
}

export function ArtistCard({ artist, onFollow, variant = 'default' }: ArtistCardProps) {
  const formatFollowers = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  return (
    <Card className="group hover:shadow-lg transition-all duration-200">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              <AvatarImage src={artist.imageUrl} alt={artist.name} />
              <AvatarFallback>
                <Music className="h-6 w-6" />
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-semibold text-lg leading-none">
                {artist.name}
              </h3>
              <div className="flex items-center gap-1 mt-1 text-sm text-muted-foreground">
                <Users className="h-3 w-3" />
                {formatFollowers(artist.followers)} followers
              </div>
            </div>
          </div>
          {onFollow && (
            <Button
              variant={artist.isFollowing ? 'default' : 'outline'}
              size="sm"
              onClick={() => onFollow(artist.id)}
            >
              <Heart className={`h-4 w-4 mr-1 ${artist.isFollowing ? 'fill-current' : ''}`} />
              {artist.isFollowing ? 'Following' : 'Follow'}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-1">
          {artist.genres.slice(0, 3).map((genre) => (
            <Badge key={genre} variant="secondary" className="text-xs">
              {genre}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
} 