import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@repo/design-system/components/ui/card';
import { Button } from '@repo/design-system/components/ui/button';
import { createMetadata } from '@repo/seo/metadata';
import { ArrowRight, List, Music, Search, Ticket } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import React from 'react';

export const generateMetadata = (): Metadata => {
  return createMetadata({
    title: 'Setlists - MySetlist',
    description:
      'Explore concert setlists, vote on upcoming shows, and discover what songs your favorite artists are playing live.',
  });
};

export default function SetlistsPage() {
  return (
    <div className="flex flex-col gap-8 py-8 md:py-16">
      <div className="container mx-auto">
        <div className="flex flex-col items-center text-center gap-6">
          <div className="flex flex-col gap-4 max-w-3xl">
            <h1 className="font-regular text-4xl tracking-tighter md:text-6xl">
              Concert Setlists
            </h1>
            <p className="text-lg text-muted-foreground">
              Discover what songs artists are playing live, vote on upcoming setlists, 
              and contribute to the community's concert predictions.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-6xl mt-8">
            <Card className="text-left">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="h-5 w-5" />
                  Find Shows
                </CardTitle>
                <CardDescription>
                  Browse upcoming concerts and shows to view and vote on predicted setlists
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild className="w-full">
                  <Link href="/shows" className="flex items-center gap-2">
                    View Shows <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="text-left">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Music className="h-5 w-5" />
                  Artist Setlists
                </CardTitle>
                <CardDescription>
                  Explore your favorite artists' past and predicted future setlists
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild variant="outline" className="w-full">
                  <Link href="/artists" className="flex items-center gap-2">
                    Browse Artists <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="text-left">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <List className="h-5 w-5" />
                  Trending Now
                </CardTitle>
                <CardDescription>
                  See what concerts and setlists are getting the most votes and attention
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild variant="outline" className="w-full">
                  <Link href="/trending" className="flex items-center gap-2">
                    View Trending <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="bg-muted rounded-lg p-6 max-w-4xl mt-8">
            <div className="flex items-start gap-4">
              <Ticket className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
              <div className="text-left">
                <h3 className="font-semibold text-lg mb-2">How Setlist Voting Works</h3>
                <p className="text-muted-foreground mb-4">
                  Find a concert you're attending or interested in, then vote on which songs 
                  you think the artist will play. Community votes help create the most likely 
                  setlist predictions.
                </p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Vote on individual songs for upcoming shows</li>
                  <li>• See real-time community predictions</li>
                  <li>• Compare predictions with actual setlists after shows</li>
                  <li>• Build your reputation as a setlist predictor</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}