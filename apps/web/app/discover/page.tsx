import { Badge } from '@repo/design-system/components/ui/badge';
import { Button } from '@repo/design-system/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@repo/design-system/components/ui/card';
import { Skeleton } from '@repo/design-system/components/ui/skeleton';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@repo/design-system/components/ui/tabs';
import { createMetadata } from '@repo/seo/metadata';
import {
  Calendar,
  Compass,
  Filter,
  MapPin,
  Music,
  Sparkles,
  TrendingUp,
  Users,
} from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { PersonalizedRecommendations } from '~/components/discovery/personalized-recommendations';
import { LiveTrending } from '~/components/trending/live-trending';
import { DiscoverFilters } from './components/discover-filters';

export const metadata: Metadata = createMetadata({
  title: 'Discover Music - MySetlist',
  description:
    'Discover new artists, find local shows, explore trends, and get personalized recommendations on MySetlist.',
});

function DiscoverSkeleton() {
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-16" />
            </CardHeader>
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Skeleton className="h-96 w-full" />
        </div>
        <div>
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    </div>
  );
}

export default function DiscoverPage() {
  return (
    <div className="container mx-auto py-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 text-center">
          <div className="mb-4 flex items-center justify-center gap-3">
            <Compass className="h-8 w-8 text-primary" />
            <h1 className="font-bold text-4xl">Discover Music</h1>
          </div>
          <p className="mx-auto max-w-2xl text-muted-foreground text-xl">
            Find new artists, explore local shows, discover trends, and get
            personalized recommendations tailored to your music taste
          </p>
        </div>

        <Suspense fallback={<DiscoverSkeleton />}>
          {/* Quick Stats */}
          <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="font-medium text-sm">
                  Active Artists
                </CardTitle>
                <Music className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="font-bold text-2xl">2,847</div>
                <p className="text-muted-foreground text-xs">
                  +12% from last month
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="font-medium text-sm">
                  Upcoming Shows
                </CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="font-bold text-2xl">15,432</div>
                <p className="text-muted-foreground text-xs">Next 30 days</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="font-medium text-sm">
                  Cities Covered
                </CardTitle>
                <MapPin className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="font-bold text-2xl">892</div>
                <p className="text-muted-foreground text-xs">
                  Worldwide venues
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="font-medium text-sm">Community</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="font-bold text-2xl">48.2K</div>
                <p className="text-muted-foreground text-xs">Active users</p>
              </CardContent>
            </Card>
          </div>

          {/* Main Discovery Content */}
          <div className="mb-8 grid grid-cols-1 gap-8 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-2">
              <Tabs defaultValue="recommendations" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="recommendations" className="gap-2">
                    <Sparkles className="h-4 w-4" />
                    For You
                  </TabsTrigger>
                  <TabsTrigger value="trending" className="gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Trending
                  </TabsTrigger>
                  <TabsTrigger value="explore" className="gap-2">
                    <Filter className="h-4 w-4" />
                    Explore
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="recommendations" className="space-y-6">
                  <PersonalizedRecommendations category="all" limit={9} />
                </TabsContent>

                <TabsContent value="trending" className="space-y-6">
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <LiveTrending timeframe="24h" type="artist" limit={5} />
                    <LiveTrending timeframe="24h" type="show" limit={5} />
                  </div>
                </TabsContent>

                <TabsContent value="explore" className="space-y-6">
                  <DiscoverFilters />
                </TabsContent>
              </Tabs>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              <LiveTrending
                timeframe="1h"
                type="all"
                limit={8}
                autoRefresh={true}
              />

              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Quick Discover</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Link href="/search?dateFrom=2024-07-01&dateTo=2024-12-31">
                    <Button
                      variant="outline"
                      className="w-full justify-start gap-2"
                    >
                      <Calendar className="h-4 w-4" />
                      This Weekend's Shows
                    </Button>
                  </Link>

                  <Link href="/search?location=nearby">
                    <Button
                      variant="outline"
                      className="w-full justify-start gap-2"
                    >
                      <MapPin className="h-4 w-4" />
                      Shows Near Me
                    </Button>
                  </Link>

                  <Link href="/trending">
                    <Button
                      variant="outline"
                      className="w-full justify-start gap-2"
                    >
                      <TrendingUp className="h-4 w-4" />
                      What's Trending
                    </Button>
                  </Link>

                  <Link href="/artists">
                    <Button
                      variant="outline"
                      className="w-full justify-start gap-2"
                    >
                      <Music className="h-4 w-4" />
                      Browse All Artists
                    </Button>
                  </Link>
                </CardContent>
              </Card>

              {/* Popular Genres */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Popular Genres</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {[
                      'Rock',
                      'Pop',
                      'Hip-Hop',
                      'Electronic',
                      'Jazz',
                      'Country',
                      'Alternative',
                      'Metal',
                      'R&B',
                      'Indie',
                    ].map((genre) => (
                      <Link
                        key={genre}
                        href={`/search?genre=${encodeURIComponent(genre)}`}
                      >
                        <Badge
                          variant="outline"
                          className="cursor-pointer transition-colors hover:bg-primary hover:text-primary-foreground"
                        >
                          {genre}
                        </Badge>
                      </Link>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Featured Sections */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <Card className="bg-gradient-to-br from-primary/5 to-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5" />
                  Get Better Recommendations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-4 text-muted-foreground">
                  Follow artists and mark shows as attended to improve your
                  personalized recommendations.
                </p>
                <div className="flex gap-2">
                  <Link href="/artists">
                    <Button size="sm">Follow Artists</Button>
                  </Link>
                  <Link href="/profile">
                    <Button variant="outline" size="sm">
                      View Profile
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-50 to-emerald-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Join the Community
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-4 text-muted-foreground">
                  Connect with other music fans, share setlists, and discover
                  concerts together.
                </p>
                <div className="flex gap-2">
                  <Link href="/auth/sign-up">
                    <Button size="sm">Sign Up</Button>
                  </Link>
                  <Link href="/auth/sign-in">
                    <Button variant="outline" size="sm">
                      Sign In
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </Suspense>
      </div>
    </div>
  );
}
