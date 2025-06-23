'use client';

import { Card, CardContent, CardHeader } from '@repo/design-system/components/ui/card';
import { Button } from '@repo/design-system/components/ui/button';
import { Badge } from '@repo/design-system/components/ui/badge';
import { Calendar, MapPin, Ticket, Users, Heart } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { format } from 'date-fns';

// Mock data - in real app this would come from the database
const mockShows = [
  {
    id: 1,
    artist: 'Taylor Swift',
    tour: 'The Eras Tour',
    venue: 'Madison Square Garden',
    city: 'New York, NY',
    date: new Date('2024-03-15'),
    price: '$125+',
    attending: 18500,
    capacity: 20000,
    genre: 'Pop',
    ticketsAvailable: true,
  },
  {
    id: 2,
    artist: 'Arctic Monkeys',
    tour: 'The Car Tour',
    venue: 'The Forum',
    city: 'Los Angeles, CA',
    date: new Date('2024-03-18'),
    price: '$85+',
    attending: 12000,
    capacity: 17500,
    genre: 'Indie Rock',
    ticketsAvailable: true,
  },
  {
    id: 3,
    artist: 'Billie Eilish',
    tour: 'Happier Than Ever Tour',
    venue: 'United Center',
    city: 'Chicago, IL',
    date: new Date('2024-03-20'),
    price: '$95+',
    attending: 19000,
    capacity: 20000,
    genre: 'Alternative',
    ticketsAvailable: false,
  },
  {
    id: 4,
    artist: 'The Weeknd',
    tour: 'After Hours Tour',
    venue: 'TD Garden',
    city: 'Boston, MA',
    date: new Date('2024-03-22'),
    price: '$110+',
    attending: 15000,
    capacity: 19500,
    genre: 'R&B',
    ticketsAvailable: true,
  },
  {
    id: 5,
    artist: 'Olivia Rodrigo',
    tour: 'GUTS World Tour',
    venue: 'The Anthem',
    city: 'Washington, DC',
    date: new Date('2024-03-25'),
    price: '$75+',
    attending: 5500,
    capacity: 6000,
    genre: 'Pop Rock',
    ticketsAvailable: false,
  },
];

export const ShowsList = () => {
  const [savedShows, setSavedShows] = useState<number[]>([]);

  const toggleSave = (showId: number) => {
    setSavedShows(prev => 
      prev.includes(showId)
        ? prev.filter(id => id !== showId)
        : [...prev, showId]
    );
  };

  const getAttendancePercentage = (attending: number, capacity: number) => {
    return Math.round((attending / capacity) * 100);
  };

  return (
    <div className="flex flex-col gap-4">
      {mockShows.map((show) => {
        const attendancePercentage = getAttendancePercentage(show.attending, show.capacity);
        
        return (
          <Card key={show.id} className="overflow-hidden hover:shadow-lg transition-shadow">
            <CardHeader className="pb-4">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <Link href={`/shows/${show.id}`}>
                    <h3 className="text-2xl font-semibold hover:text-primary transition-colors">
                      {show.artist}
                    </h3>
                  </Link>
                  {show.tour && (
                    <p className="text-sm text-muted-foreground mt-1">{show.tour}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{show.genre}</Badge>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => toggleSave(show.id)}
                  >
                    <Heart className={`h-4 w-4 ${savedShows.includes(show.id) ? 'fill-current text-red-500' : ''}`} />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{show.venue}</span>
                    <span className="text-muted-foreground">• {show.city}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>{format(show.date, 'EEEE, MMMM d, yyyy')}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <div className="flex items-center gap-2">
                      <span>{show.attending.toLocaleString()} attending</span>
                      <Badge variant={attendancePercentage > 90 ? "destructive" : "secondary"}>
                        {attendancePercentage}% full
                      </Badge>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-end justify-end gap-4">
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Starting from</p>
                    <p className="text-2xl font-semibold">{show.price}</p>
                  </div>
                  <Button 
                    disabled={!show.ticketsAvailable}
                    className="gap-2"
                  >
                    <Ticket className="h-4 w-4" />
                    {show.ticketsAvailable ? 'Get Tickets' : 'Sold Out'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};