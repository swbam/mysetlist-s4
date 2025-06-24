import Link from 'next/link';
import Image from 'next/image';
import { MapPin, Users, Building, Calendar } from 'lucide-react';
import { Card, CardContent } from '@repo/design-system/components/ui/card';
import { Badge } from '@repo/design-system/components/ui/badge';
import { Button } from '@repo/design-system/components/ui/button';
import { db } from '@repo/database';
import { venues } from '@repo/database/src/schema';
import { desc, isNotNull } from 'drizzle-orm';

async function getFeaturedVenues() {
  const featuredVenues = await db
    .select({
      id: venues.id,
      name: venues.name,
      slug: venues.slug,
      imageUrl: venues.imageUrl,
      city: venues.city,
      state: venues.state,
      country: venues.country,
      capacity: venues.capacity,
      venueType: venues.venueType,
    })
    .from(venues)
    .where(isNotNull(venues.capacity))
    .orderBy(desc(venues.capacity))
    .limit(4);

  return featuredVenues;
}

export async function FeaturedVenues() {
  const formatCapacity = (capacity: number | null) => {
    if (!capacity) return 'N/A';
    if (capacity >= 1000) return `${(capacity / 1000).toFixed(1)}K`;
    return capacity.toString();
  };

  const featuredVenues = await getFeaturedVenues();

  if (featuredVenues.length === 0) {
    return null; // Don't show the section if no venues
  }

  return (
    <section className="py-16 md:py-24">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">
              Featured Venues
            </h2>
            <p className="text-muted-foreground">
              Explore iconic venues from around the world
            </p>
          </div>
          <Button variant="outline" asChild>
            <Link href="/venues">View All Venues</Link>
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {featuredVenues.map((venue) => (
            <Card key={venue.id} className="overflow-hidden hover:shadow-lg transition-shadow">
              <Link href={`/venues/${venue.slug}`}>
                <div className="aspect-[4/3] relative overflow-hidden bg-muted">
                  {venue.imageUrl ? (
                    <Image
                      src={venue.imageUrl}
                      alt={venue.name}
                      fill
                      className="object-cover transition-transform hover:scale-105"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
                      <Building className="h-16 w-16 text-primary/30" />
                    </div>
                  )}
                  {venue.venueType && (
                    <div className="absolute top-2 left-2">
                      <Badge variant="secondary" className="bg-background/90 backdrop-blur">
                        {venue.venueType}
                      </Badge>
                    </div>
                  )}
                </div>
              </Link>
              <CardContent className="p-4">
                <Link href={`/venues/${venue.slug}`}>
                  <h3 className="font-semibold text-lg hover:text-primary transition-colors mb-1">
                    {venue.name}
                  </h3>
                </Link>
                
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                  <MapPin className="h-3 w-3" />
                  <span>
                    {venue.city}
                    {venue.state && `, ${venue.state}`}
                  </span>
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {formatCapacity(venue.capacity)} capacity
                  </span>
                  {venue.venueType && (
                    <Badge variant="outline" className="text-xs">
                      {venue.venueType}
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}