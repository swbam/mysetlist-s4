import { Card, CardContent, CardHeader } from './card';
import { Avatar, AvatarFallback, AvatarImage } from './avatar';
import { Badge } from './badge';
import { Button } from './button';
import { MapPin, Calendar, Users, ExternalLink } from 'lucide-react';

interface VenueCardProps {
  venue: {
    id: string;
    name: string;
    imageUrl?: string;
    address?: string;
    city: string;
    state?: string;
    country: string;
    capacity?: number;
    upcomingShows?: number;
    website?: string;
  };
  onVisit?: (venueId: string) => void;
  variant?: 'default' | 'compact' | 'detailed';
}

export function VenueCard({ venue, onVisit, variant = 'default' }: VenueCardProps) {
  const formatCapacity = (capacity?: number) => {
    if (!capacity) return 'Unknown capacity';
    if (capacity >= 1000) return `${(capacity / 1000).toFixed(1)}K capacity`;
    return `${capacity} capacity`;
  };

  const formatLocation = () => {
    if (venue.state) {
      return `${venue.city}, ${venue.state}, ${venue.country}`;
    }
    return `${venue.city}, ${venue.country}`;
  };

  return (
    <Card className="group hover:shadow-lg transition-all duration-200">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              <AvatarImage src={venue.imageUrl} alt={venue.name} />
              <AvatarFallback>
                <MapPin className="h-6 w-6" />
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-semibold text-lg leading-none">
                {venue.name}
              </h3>
              <div className="flex items-center gap-1 mt-1 text-sm text-muted-foreground">
                <MapPin className="h-3 w-3" />
                {formatLocation()}
              </div>
            </div>
          </div>
          {venue.website && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(venue.website, '_blank')}
            >
              <ExternalLink className="h-4 w-4 mr-1" />
              Visit
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {formatCapacity(venue.capacity)}
            </div>
            {venue.upcomingShows !== undefined && (
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {venue.upcomingShows} upcoming shows
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 