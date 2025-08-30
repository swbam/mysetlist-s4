import { Button } from "@repo/design-system";
import { Card, CardContent } from "@repo/design-system";
import { Building, MapPin, Users } from "lucide-react";
import Link from "next/link";
import React from "react";
import { createConvexClient } from "~/lib/database";
import { api } from "~/lib/convex-api";

interface FeaturedVenue {
  id: string;
  name: string;
  city: string;
  state?: string | undefined;
  capacity?: number | undefined;
}

async function getFeaturedVenues(): Promise<FeaturedVenue[]> {
  try {
    const convex = createConvexClient();
    const venues = await convex.query(api.venues.getAll, { limit: 6 });
    
    return venues?.map((venue) => ({
      id: venue._id,
      name: venue.name,
      city: venue.city,
      state: venue.state,
      capacity: venue.capacity,
    })) || [];
  } catch (error) {
    console.error("Failed to fetch featured venues:", error);
    return [];
  }
}

export default async function FeaturedVenues() {
  const venues = await getFeaturedVenues();

  if (!venues || venues.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No featured venues available</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-bold text-2xl tracking-tight">Featured Venues</h2>
          <p className="text-muted-foreground">
            Popular venues hosting amazing concerts
          </p>
        </div>
        <Button variant="ghost" asChild>
          <Link href="/venues">View all venues</Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {venues.map((venue) => (
          <Card key={venue.id} className="transition-all hover:shadow-lg">
            <Link href={`/venues/${venue.id}`}>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-lg">{venue.name}</h3>
                    <div className="flex items-center space-x-1 text-muted-foreground text-sm">
                      <MapPin className="h-4 w-4" />
                      <span>
                        {venue.city}
                        {venue.state && `, ${venue.state}`}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Building className="h-4 w-4 text-blue-500" />
                      <span className="text-sm">Venue</span>
                    </div>
                    {venue.capacity && (
                      <div className="flex items-center space-x-1">
                        <Users className="h-4 w-4 text-green-500" />
                        <span className="text-sm">{venue.capacity.toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Link>
          </Card>
        ))}
      </div>
    </div>
  );
}