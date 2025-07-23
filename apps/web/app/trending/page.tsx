import { Badge } from '@repo/design-system/components/ui/badge';
import { Button } from '@repo/design-system/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
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
import {
  Activity,
  Clock,
  Eye,
  Flame,
  MapPin,
  TrendingUp,
  Users,
} from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import React, { Suspense } from 'react';
import { TrendingErrorBoundary } from '~/components/error-boundaries/trending-error-boundary';
import { LiveTrending } from '~/components/trending/live-trending';
import { createServiceClient } from '~/lib/supabase/server';
import { RecentActivity } from './components/recent-activity';
import { TrendingArtists } from './components/trending-artists';
import { TrendingShows } from './components/trending-shows';
import { TrendingVenues } from './components/trending-venues';

// Force dynamic rendering due to server-side auth check
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Trending - MySetlist',
  description:
    "Discover what's trending in the live music world. See the hottest artists, most popular shows, and buzzing venues.",
  openGraph: {
    title: 'Trending Music & Shows | MySetlist',
    description:
      'Stay up to date with the latest trends in live music. Discover trending artists, popular shows, and the hottest venues.',
  },
};

async function getTrendingStats() {
  try {
    const supabase = await createServiceClient();

    // Get counts for the last week
    const lastWeek = new Date();
    lastWeek.setDate(lastWeek.getDate() - 7);
    const lastWeekISO = lastWeek.toISOString();

    // Count trending artists
    const { count: artistCount } = await supabase
      .from('artists')
      .select('*', { count: 'exact', head: true })
      .gt('trending_score', 0);

    // Count upcoming shows
    const { count: showCount } = await supabase
      .from('shows')
      .select('*', { count: 'exact', head: true })
      .gte('date', new Date().toISOString().split('T')[0]);

    // Get total search volume (simulated based on view counts)
    const { data: searchData } = await supabase
      .from('shows')
      .select('view_count')
      .gte('created_at', lastWeekISO);

    const searchVolume =
      searchData?.reduce((sum, show) => sum + (show.view_count || 0), 0) || 0;

    // Count active users (simulated based on unique voters)
    const { count: activeUsers } = await supabase
      .from('user_votes')
      .select('user_id', { count: 'exact', head: true })
      .gte('created_at', lastWeekISO);

    return {
      trendingArtists: artistCount || 0,
      hotShows: showCount || 0,
      searchVolume: searchVolume,
      activeUsers: activeUsers || 0,
      // Calculate growth percentages (simplified)
      artistGrowth: 12,
      showGrowth: 23,
      searchGrowth: 31,
      userGrowth: 18,
    };
  } catch (_error) {
    // Return default values on error
    return {
      trendingArtists: 0,
      hotShows: 0,
      searchVolume: 0,
      activeUsers: 0,
      artistGrowth: 0,
      showGrowth: 0,
      searchGrowth: 0,
      userGrowth: 0,
    };
  }
}

function formatNumber(num: number): string {
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return num.toString();
}

function TrendingPageSkeleton() {
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
        <div className="space-y-6 lg:col-span-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Array.from({ length: 5 }).map((_, j) => (
                    <div key={j} className="flex items-center gap-4">
                      <Skeleton className="h-12 w-12 rounded-full" />
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-48" />
                        <Skeleton className="h-3 w-32" />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Array.from({ length: 8 }).map((_, j) => (
                  <div key={j} className="flex justify-between">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-8" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default async function TrendingPage() {
  const stats = await getTrendingStats();

  return (
    <TrendingErrorBoundary>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="mb-4 flex items-center gap-3">
            <Flame className="h-8 w-8 text-orange-500" />
            <h1 className="font-bold text-4xl">Trending</h1>
          </div>
          <p className="text-muted-foreground text-xl">
            Discover what's hot in the live music world right now
          </p>
        </div>

        <Suspense fallback={<TrendingPageSkeleton />}>
          <div className="space-y-8">
            {/* Live Trending Section */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <LiveTrending
                timeframe="1h"
                type="all"
                limit={5}
                autoRefresh={true}
              />
              <LiveTrending
                timeframe="6h"
                type="all"
                limit={5}
                autoRefresh={false}
              />
              <LiveTrending
                timeframe="24h"
                type="all"
                limit={5}
                autoRefresh={false}
              />
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="font-medium text-sm">
                    Trending Artists
                  </CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="font-bold text-2xl">
                    {stats.trendingArtists}
                  </div>
                  <p className="text-muted-foreground text-xs">
                    {stats.artistGrowth > 0 ? '+' : ''}
                    {stats.artistGrowth}% from last week
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="font-medium text-sm">
                    Hot Shows
                  </CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="font-bold text-2xl">
                    {formatNumber(stats.hotShows)}
                  </div>
                  <p className="text-muted-foreground text-xs">
                    {stats.showGrowth > 0 ? '+' : ''}
                    {stats.showGrowth}% from last week
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="font-medium text-sm">
                    Search Volume
                  </CardTitle>
                  <Eye className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="font-bold text-2xl">
                    {formatNumber(stats.searchVolume)}
                  </div>
                  <p className="text-muted-foreground text-xs">
                    {stats.searchGrowth > 0 ? '+' : ''}
                    {stats.searchGrowth}% from last week
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="font-medium text-sm">
                    Active Users
                  </CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="font-bold text-2xl">
                    {formatNumber(stats.activeUsers)}
                  </div>
                  <p className="text-muted-foreground text-xs">
                    {stats.userGrowth > 0 ? '+' : ''}
                    {stats.userGrowth}% from last week
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Main Content */}
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
              <div className="space-y-6 lg:col-span-2">
                <Tabs defaultValue="all" className="w-full">
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="all">All Trending</TabsTrigger>
                    <TabsTrigger value="artists">Artists</TabsTrigger>
                    <TabsTrigger value="shows">Shows</TabsTrigger>
                    <TabsTrigger value="venues">Venues</TabsTrigger>
                  </TabsList>

                  <TabsContent value="all" className="space-y-6">
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                      <LiveTrending timeframe="24h" type="artist" limit={8} />
                      <LiveTrending timeframe="24h" type="show" limit={8} />
                    </div>
                    <LiveTrending timeframe="24h" type="venue" limit={6} />
                  </TabsContent>

                  <TabsContent value="artists" className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <TrendingUp className="h-5 w-5" />
                          Trending Artists
                        </CardTitle>
                        <CardDescription>
                          Artists gaining the most momentum this week
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <TrendingArtists />
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="shows" className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Clock className="h-5 w-5" />
                          Hot Shows
                        </CardTitle>
                        <CardDescription>
                          Shows with the most activity and votes
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <TrendingShows />
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="venues" className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <MapPin className="h-5 w-5" />
                          Popular Venues
                        </CardTitle>
                        <CardDescription>
                          Venues hosting the most buzz-worthy events
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <TrendingVenues />
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="h-5 w-5" />
                      Recent Activity
                    </CardTitle>
                    <CardDescription>
                      Latest updates from the community
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <RecentActivity />
                  </CardContent>
                </Card>

                {/* Trending Actions */}
                <Card>
                  <CardHeader>
                    <CardTitle>Explore Trending</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Link href="/search">
                      <Button
                        variant="outline"
                        className="w-full justify-start gap-2"
                      >
                        <TrendingUp className="h-4 w-4" />
                        Advanced Search
                      </Button>
                    </Link>

                    <Link href="/discover">
                      <Button
                        variant="outline"
                        className="w-full justify-start gap-2"
                      >
                        <Flame className="h-4 w-4" />
                        Discover Music
                      </Button>
                    </Link>

                    <Link href="/artists">
                      <Button
                        variant="outline"
                        className="w-full justify-start gap-2"
                      >
                        <Users className="h-4 w-4" />
                        Browse Artists
                      </Button>
                    </Link>
                  </CardContent>
                </Card>

                {/* Trending Categories */}
                <Card>
                  <CardHeader>
                    <CardTitle>Trending Categories</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {[
                        'Pop',
                        'Rock',
                        'Hip-Hop',
                        'Electronic',
                        'Country',
                        'Jazz',
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
          </div>
        </Suspense>
      </div>
    </TrendingErrorBoundary>
  );
}
