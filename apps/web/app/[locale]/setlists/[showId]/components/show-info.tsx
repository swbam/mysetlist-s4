'use client';

import { Card, CardContent } from '@repo/design-system/components/ui/card';
import { Badge } from '@repo/design-system/components/ui/badge';
import { Button } from '@repo/design-system/components/ui/button';
import { Calendar, MapPin, Users, Share2, Heart } from 'lucide-react';
import { format } from 'date-fns';
import { useState } from 'react';

type ShowInfoProps = {
  showId: string;
};

// Mock data - in real app this would come from the database
const mockShow = {
  id: 1,
  artist: 'Taylor Swift',
  tour: 'The Eras Tour',
  venue: 'Madison Square Garden',
  city: 'New York, NY',
  date: new Date('2024-03-15'),
  attending: 18500,
  capacity: 20000,
  status: 'live' as const,
};

export const ShowInfo = ({ showId }: ShowInfoProps) => {
  const [isSaved, setIsSaved] = useState(false);

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold">{mockShow.artist}</h1>
              <Badge variant={mockShow.status === 'live' ? 'destructive' : 'secondary'}>
                {mockShow.status === 'live' ? '🔴 LIVE NOW' : 'Upcoming'}
              </Badge>
            </div>
            <p className="text-lg text-muted-foreground mb-4">{mockShow.tour}</p>
            
            <div className="flex flex-col sm:flex-row gap-4 text-sm">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span>{mockShow.venue} • {mockShow.city}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>{format(mockShow.date, 'EEEE, MMMM d, yyyy')}</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span>{mockShow.attending.toLocaleString()} attending</span>
              </div>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" size="icon">
              <Share2 className="h-4 w-4" />
            </Button>
            <Button 
              variant={isSaved ? "default" : "outline"}
              onClick={() => setIsSaved(!isSaved)}
              className="gap-2"
            >
              <Heart className={`h-4 w-4 ${isSaved ? 'fill-current' : ''}`} />
              {isSaved ? 'Saved' : 'Save'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};