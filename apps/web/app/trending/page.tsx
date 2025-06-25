import { Metadata } from 'next';
import { Suspense } from 'react';
import { TrendingArtists } from './components/trending-artists';
import { TrendingShows } from './components/trending-shows';
import { TrendingVenues } from './components/trending-venues';
import { RecentActivity } from './components/recent-activity';
import { LiveTrending } from '@/components/trending/live-trending';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@repo/design-system/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@repo/design-system/components/ui/tabs';
import { Button } from '@repo/design-system/components/ui/button';
import { Badge } from '@repo/design-system/components/ui/badge';
import { TrendingUp, Clock, MapPin, Users, Flame, Activity, Eye } from 'lucide-react';
import { Skeleton } from '@repo/design-system/components/ui/skeleton';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Trending - MySetlist',
  description: 'Discover what\'s trending in the live music world. See the hottest artists, most popular shows, and buzzing venues.',
  openGraph: {
    title: 'Trending Music & Shows | MySetlist',
    description: 'Stay up to date with the latest trends in live music. Discover trending artists, popular shows, and the hottest venues.',
  },
};

function TrendingPageSkeleton() {
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-16" />
            </CardHeader>
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
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

export default function TrendingPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <Flame className="h-8 w-8 text-orange-500" />
          <h1 className="text-4xl font-bold">Trending</h1>
        </div>
        <p className="text-xl text-muted-foreground">
          Discover what's hot in the live music world right now
        </p>
      </div>

      <Suspense fallback={<TrendingPageSkeleton />}>
        <div className="space-y-8">
          {/* Live Trending Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Trending Artists</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">127</div>
                <p className="text-xs text-muted-foreground">
                  +12% from last week
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Hot Shows</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">1,247</div>
                <p className="text-xs text-muted-foreground">
                  +23% from last week
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Search Volume</CardTitle>
                <Eye className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">28.4K</div>
                <p className="text-xs text-muted-foreground">
                  +31% from last week
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Users</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">12,487</div>
                <p className="text-xs text-muted-foreground">
                  +18% from last week
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <Tabs defaultValue="all" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="all">All Trending</TabsTrigger>
                  <TabsTrigger value="artists">Artists</TabsTrigger>
                  <TabsTrigger value="shows">Shows</TabsTrigger>
                  <TabsTrigger value="venues">Venues</TabsTrigger>
                </TabsList>
                
                <TabsContent value="all" className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <LiveTrending 
                      timeframe="24h" 
                      type="artist" 
                      limit={8}
                    />
                    <LiveTrending 
                      timeframe="24h" 
                      type="show" 
                      limit={8}
                    />
                  </div>
                  <LiveTrending 
                    timeframe="24h" 
                    type="venue" 
                    limit={6}
                  />
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
                    <Button variant="outline" className="w-full justify-start gap-2">
                      <TrendingUp className="h-4 w-4" />
                      Advanced Search
                    </Button>
                  </Link>
                  
                  <Link href="/discover">
                    <Button variant="outline" className="w-full justify-start gap-2">
                      <Flame className="h-4 w-4" />
                      Discover Music
                    </Button>
                  </Link>
                  
                  <Link href="/artists">
                    <Button variant="outline" className="w-full justify-start gap-2">
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
                    {['Pop', 'Rock', 'Hip-Hop', 'Electronic', 'Country', 'Jazz'].map((genre) => (
                      <Link key={genre} href={`/search?genre=${encodeURIComponent(genre)}`}>
                        <Badge variant="outline" className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors">
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
  );
}