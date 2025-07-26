'use client';

import { VenueCard } from '~/components/cards/venue-card';
import { ResponsiveGrid, EmptyState } from '~/components/layout/responsive-grid';
import { MapPin } from 'lucide-react';
import { MapPin } from 'lucide-react';
import { VenueCard } from './venue-card';

interface Venue {
  id: string;
  name: string;
  slug: string;
  city: string;
  state: string | null;
  country: string;
  capacity: number | null;
  latitude: number | null;
  longitude: number | null;
  avgRating?: number;
  reviewCount?: number;
  upcomingShowCount?: number;
  distance?: number;
  amenities: string | null;
  website?: string | null;

}

interface VenueGridClientProps {
  venues: Venue[];
}

export function VenueGridClient({ venues }: VenueGridClientProps) {
  const handleFavorite = (venueId: string) => {
    // TODO: Implement favorite functionality
    console.log('Favoriting venue:', venueId);
  };

  const emptyState = (
    <EmptyState
      icon={<MapPin className="h-8 w-8 text-muted-foreground" />}
      title="No Venues Found"
      description="Try adjusting your filters or search criteria to find venues in your area."
    />
  );

  return (
    <ResponsiveGrid 
      variant="venues" 
      emptyState={emptyState}
      className="min-h-[600px]"
    >
      {venues.map((venue) => (
        <div key={venue.id} role="gridcell">
          <VenueCard 
            venue={venue}
            variant="default"
            showFavoriteButton={true}
            onFavorite={handleFavorite}
          />
        </div>
      ))}
    </ResponsiveGrid>
  if (venues.length === 0) {
    return (
      <div className="py-12 text-center">
        <MapPin className="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
        <h3 className="mb-2 font-semibold text-lg">No venues found</h3>
        <p className="text-muted-foreground">
          Try adjusting your filters or search criteria
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
      {venues.map((venue) => (
        <VenueCard key={venue.id} venue={venue} />
      ))}

    <div className="grid gap-4">
      {venues.map((venue) => {
        const hasParking = false;

        return (
          <Card
            key={venue.id}
            className="overflow-hidden transition-shadow hover:shadow-lg"
          >
            <div className="flex">
              <div className="flex-1">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <Link href={`/venues/${venue.slug}`}>
                        <h3 className="font-semibold text-xl transition-colors hover:text-primary">
                          {venue.name}
                        </h3>
                      </Link>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        {venue.capacity && (
                          <span className="text-muted-foreground text-sm">
                            Capacity: {formatCapacity(venue.capacity)}
                          </span>
                        )}
                        {venue.distance !== undefined && (
                          <Badge variant="secondary">
                            {formatDistance(venue.distance)} away
                          </Badge>
                        )}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        {venue.capacity && (
                          <span className="text-muted-foreground text-sm">
                            Capacity: {formatCapacity(venue.capacity)}
                          </span>
                        )}
                        {venue.distance !== undefined && (
                          <Badge variant="secondary">
                            {formatDistance(venue.distance)} away
                          </Badge>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => toggleFavorite(venue.id)}
                    >
                      <Heart
                        className={`h-4 w-4 ${favoriteVenues.includes(venue.id) ? 'fill-current text-red-500' : ''}`}
                      />
                    </Button>
                  </div>
                </CardHeader>

                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span>
                        {venue.city}, {venue.state || venue.country}
                      </span>
                    </div>
                    {venue.avgRating !== undefined && (
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        <span className="font-medium">
                          {venue.avgRating.toFixed(1)}
                        </span>
                        <span className="text-muted-foreground text-sm">
                          ({venue.reviewCount || 0})
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-4 text-sm">
                    {hasParking && (
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Car className="h-4 w-4" />
                        <span>Parking</span>
                      </div>
                    )}
                    {venue.upcomingShowCount !== undefined &&
                      venue.upcomingShowCount > 0 && (
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Users className="h-4 w-4" />
                          <span>{venue.upcomingShowCount} upcoming shows</span>
                        </div>
                      )}
                  </div>

                  <Link href={`/venues/${venue.slug}`}>
                    <Button variant="outline" className="w-full">
                      View Details & Shows
                    </Button>
                  </Link>
                </CardContent>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}