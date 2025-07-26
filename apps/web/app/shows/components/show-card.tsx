'use client';

import { Badge } from '@repo/design-system/components/ui/badge';
import { Button } from '@repo/design-system/components/ui/button';
import { Card, CardContent } from '@repo/design-system/components/ui/card';
import { format } from 'date-fns';
import {
  Calendar,
  Heart,
  MapPin,
  Music,
  Star,
  Ticket,
  Users,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';

interface ShowCardProps {
  show: {
    id: string;
    name: string;
    slug: string;
    date: string;
    startTime?: string | null;
    status: string;
    ticketUrl?: string | null;
    minPrice: number | null;
    maxPrice: number | null;
    currency: string;
    attendeeCount: number;
    isFeatured?: boolean;
    headlinerArtist: {
      id: string;
      name: string;
      slug: string;
      imageUrl?: string | null;
      verified: boolean;
      genres?: string[] | null;
    };
    supportingArtists: Array<{
      artist: {
        id: string;
        name: string;
        slug: string;
      };
    }>;
    venue?: {
      id: string;
      name: string;
      slug: string;
      city: string;
      state?: string | null;
      country: string;
      capacity: number | null;
    } | null;
  };
}

export function ShowCard({ show }: ShowCardProps) {
  const [isSaved, setIsSaved] = useState(false);

  const formatPrice = (
    minPrice: number | null,
    maxPrice: number | null,
    currency: string
  ) => {
    if (!minPrice) return 'TBA';
    const currencySymbol = currency === 'USD' ? '$' : currency;
    if (maxPrice && maxPrice !== minPrice) {
      return `${currencySymbol}${minPrice}-${currencySymbol}${maxPrice}`;
    }
    return `${currencySymbol}${minPrice}+`;
  };

  const getAttendancePercentage = (
    attending: number,
    capacity: number | null
  ) => {
    if (!capacity || capacity === 0) return 0;
    return Math.round((attending / capacity) * 100);
  };

  const mainGenre = show.headlinerArtist.genres?.[0] || 'Live Music';
  const attendancePercentage = show.venue?.capacity
    ? getAttendancePercentage(show.attendeeCount, show.venue.capacity)
    : 0;

  return (
    <Card className="overflow-hidden transition-shadow hover:shadow-lg">
      <Link href={`/shows/${show.slug}`}>
        <div className="relative aspect-square cursor-pointer overflow-hidden bg-muted">
          {show.headlinerArtist.imageUrl ? (
            <Image
              src={show.headlinerArtist.imageUrl}
              alt={show.headlinerArtist.name}
              fill
              className="object-cover transition-transform hover:scale-105"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
              <Music className="h-16 w-16 text-primary/30" />
            </div>
          )}
          {show.isFeatured && (
            <div className="absolute top-2 left-2">
              <Badge variant="default">Featured</Badge>
            </div>
          )}
          {show.headlinerArtist.verified && (
            <div className="absolute top-2 right-2">
              <div className="rounded-full bg-primary p-1 text-primary-foreground">
                <Star className="h-4 w-4 fill-current" />
              </div>
            </div>
          )}
          {attendancePercentage > 90 && (
            <div className="absolute bottom-2 left-2">
              <Badge variant="destructive">Nearly Sold Out</Badge>
            </div>
          )}
        </div>
      </Link>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <Link href={`/shows/${show.slug}`}>
            <h3 className="truncate font-semibold text-lg transition-colors hover:text-primary">
              {show.headlinerArtist.name}
            </h3>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsSaved(!isSaved)}
            className="h-8 w-8 flex-shrink-0"
          >
            <Heart
              className={`h-4 w-4 ${isSaved ? 'fill-current text-red-500' : ''}`}
            />
          </Button>
        </div>

        {show.supportingArtists.length > 0 && (
          <p className="mb-2 truncate text-muted-foreground text-sm">
            with {show.supportingArtists.map((sa) => sa.artist.name).join(', ')}
          </p>
        )}

        <div className="mb-3 flex items-center gap-2 text-muted-foreground text-sm">
          <Calendar className="h-4 w-4" />
          <span>{format(new Date(show.date), 'MMM d, yyyy')}</span>
          {show.startTime && <span>• {show.startTime}</span>}
        </div>

        {show.venue && (
          <div className="mb-3 flex items-center gap-2 text-muted-foreground text-sm">
            <MapPin className="h-4 w-4" />
            <span className="truncate">
              {show.venue.name}, {show.venue.city}
            </span>
          </div>
        )}

        <div className="mb-3 flex flex-wrap gap-1">
          <Badge variant="outline" className="text-xs">
            {mainGenre}
          </Badge>
          {show.venue?.capacity && show.venue.capacity > 0 && (
            <Badge variant="secondary" className="text-xs">
              {attendancePercentage > 0 && `${attendancePercentage}% full`}
            </Badge>
          )}
        </div>

        <div className="flex items-center justify-between">
          <div className="text-sm">
            <p className="font-semibold">
              {formatPrice(show.minPrice, show.maxPrice, show.currency)}
            </p>
            {show.attendeeCount > 0 && (
              <div className="flex items-center gap-1 text-muted-foreground">
                <Users className="h-3 w-3" />
                <span>{show.attendeeCount.toLocaleString()} interested</span>
              </div>
            )}
          </div>
          {show.ticketUrl && show.status !== 'cancelled' && (
            <Button asChild size="sm" className="gap-1">
              <a
                href={show.ticketUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Ticket className="h-3 w-3" />
                Tickets
              </a>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}