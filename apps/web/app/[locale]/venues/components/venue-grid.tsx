'use client';

import { Card, CardContent, CardHeader } from '@repo/design-system/components/ui/card';
import { Badge } from '@repo/design-system/components/ui/badge';
import { Button } from '@repo/design-system/components/ui/button';
import { MapPin, Users, Star, Car, Train, Heart } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

// Mock data - in real app this would come from the database
const mockVenues = [
  {
    id: 1,
    name: 'Madison Square Garden',
    type: 'Arena',
    location: 'New York, NY',
    capacity: 20000,
    rating: 4.8,
    reviews: 1250,
    parkingAvailable: true,
    publicTransit: true,
    upcomingShows: 45,
    tips: ['Enter through Penn Station for shorter lines', 'Best acoustics in sections 200-210'],
  },
  {
    id: 2,
    name: 'The Fillmore',
    type: 'Theater',
    location: 'San Francisco, CA',
    capacity: 1315,
    rating: 4.9,
    reviews: 890,
    parkingAvailable: false,
    publicTransit: true,
    upcomingShows: 28,
    tips: ['Free apples at the entrance', 'Balcony has the best sound'],
  },
  {
    id: 3,
    name: 'Red Rocks Amphitheatre',
    type: 'Amphitheater',
    location: 'Morrison, CO',
    capacity: 9525,
    rating: 5.0,
    reviews: 2100,
    parkingAvailable: true,
    publicTransit: false,
    upcomingShows: 65,
    tips: ['Bring layers - weather changes quickly', 'Row 1 is actually row 26'],
  },
  {
    id: 4,
    name: 'The Troubadour',
    type: 'Club',
    location: 'West Hollywood, CA',
    capacity: 500,
    rating: 4.7,
    reviews: 670,
    parkingAvailable: false,
    publicTransit: true,
    upcomingShows: 52,
    tips: ['Get there early for standing room', 'Bar upstairs has a great view'],
  },
  {
    id: 5,
    name: 'Fenway Park',
    type: 'Stadium',
    location: 'Boston, MA',
    capacity: 37755,
    rating: 4.6,
    reviews: 1890,
    parkingAvailable: true,
    publicTransit: true,
    upcomingShows: 8,
    tips: ['Field seats have the best sound', 'Green Monster seats are unique experience'],
  },
  {
    id: 6,
    name: 'The Blue Note',
    type: 'Club',
    location: 'New York, NY',
    capacity: 250,
    rating: 4.8,
    reviews: 540,
    parkingAvailable: false,
    publicTransit: true,
    upcomingShows: 120,
    tips: ['Intimate venue - every seat is good', 'Two shows per night on weekends'],
  },
];

export const VenueGrid = () => {
  const [favoriteVenues, setFavoriteVenues] = useState<number[]>([]);

  const toggleFavorite = (venueId: number) => {
    setFavoriteVenues(prev => 
      prev.includes(venueId)
        ? prev.filter(id => id !== venueId)
        : [...prev, venueId]
    );
  };

  const formatCapacity = (capacity: number) => {
    if (capacity >= 1000) return `${(capacity / 1000).toFixed(1)}K`;
    return capacity.toString();
  };

  return (
    <div className="flex flex-col gap-4">
      {mockVenues.map((venue) => (
        <Card key={venue.id} className="overflow-hidden hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <Link href={`/venues/${venue.id}`}>
                  <h3 className="text-xl font-semibold hover:text-primary transition-colors">
                    {venue.name}
                  </h3>
                </Link>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline">{venue.type}</Badge>
                  <span className="text-sm text-muted-foreground">
                    Capacity: {formatCapacity(venue.capacity)}
                  </span>
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => toggleFavorite(venue.id)}
              >
                <Heart className={`h-4 w-4 ${favoriteVenues.includes(venue.id) ? 'fill-current text-red-500' : ''}`} />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span>{venue.location}</span>
              </div>
              <div className="flex items-center gap-1">
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                <span className="font-medium">{venue.rating}</span>
                <span className="text-sm text-muted-foreground">({venue.reviews})</span>
              </div>
            </div>
            
            <div className="flex gap-4 text-sm">
              {venue.parkingAvailable && (
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Car className="h-4 w-4" />
                  <span>Parking</span>
                </div>
              )}
              {venue.publicTransit && (
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Train className="h-4 w-4" />
                  <span>Transit</span>
                </div>
              )}
              <div className="flex items-center gap-1 text-muted-foreground">
                <Users className="h-4 w-4" />
                <span>{venue.upcomingShows} upcoming shows</span>
              </div>
            </div>
            
            {venue.tips.length > 0 && (
              <div className="pt-2 border-t">
                <p className="text-sm font-medium mb-2">Insider Tips:</p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  {venue.tips.slice(0, 2).map((tip, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-primary">•</span>
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            <Link href={`/venues/${venue.id}`}>
              <Button variant="outline" className="w-full">
                View Details & Shows
              </Button>
            </Link>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};