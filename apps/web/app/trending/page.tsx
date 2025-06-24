import { Suspense } from 'react';
import { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { format } from 'date-fns';
import { TrendingUp, Users, MessageCircle, Calendar, MapPin } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@repo/design-system/components/ui/card';
import { Badge } from '@repo/design-system/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@repo/design-system/components/ui/tabs';
import { Skeleton } from '@repo/design-system/components/ui/skeleton';
import { getDailyTrending, getWeeklyTrending, getMonthlyTrending } from '@/lib/trending';

export const metadata: Metadata = {
  title: 'Trending | MySetlist',
  description: 'Discover trending shows and artists on MySetlist',
};

async function TrendingContent() {
  const [daily, weekly, monthly] = await Promise.all([
    getDailyTrending(10),
    getWeeklyTrending(20),
    getMonthlyTrending(30),
  ]);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-4">Trending</h1>
        <p className="text-muted-foreground text-lg">
          Discover what's hot in the live music scene
        </p>
      </div>

      <Tabs defaultValue="week" className="w-full">
        <TabsList className="grid w-full grid-cols-3 max-w-[400px]">
          <TabsTrigger value="day">Today</TabsTrigger>
          <TabsTrigger value="week">This Week</TabsTrigger>
          <TabsTrigger value="month">This Month</TabsTrigger>
        </TabsList>

        <TabsContent value="day" className="mt-6">
          <TrendingList items={daily.combined} period="today" />
        </TabsContent>

        <TabsContent value="week" className="mt-6">
          <div className="space-y-8">
            <section>
              <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
                <TrendingUp className="w-6 h-6" />
                Trending Shows
              </h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {weekly.shows.slice(0, 6).map((show) => (
                  <TrendingShowCard key={show.id} show={show} />
                ))}
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
                <Users className="w-6 h-6" />
                Trending Artists
              </h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {weekly.artists.slice(0, 6).map((artist) => (
                  <TrendingArtistCard key={artist.id} artist={artist} />
                ))}
              </div>
            </section>
          </div>
        </TabsContent>

        <TabsContent value="month" className="mt-6">
          <TrendingList items={monthly.combined} period="this month" />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function TrendingList({ items, period }: { items: any[]; period: string }) {
  return (
    <div className="space-y-4">
      <p className="text-muted-foreground mb-4">
        Top trending content {period}
      </p>
      {items.map((item, index) => (
        <Card key={item.id} className="hover:shadow-lg transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-start gap-4">
              <div className="text-2xl font-bold text-muted-foreground w-8">
                {index + 1}
              </div>
              
              {item.image_url && (
                <div className="relative w-16 h-16 rounded-md overflow-hidden flex-shrink-0">
                  <Image
                    src={item.image_url}
                    alt={item.name}
                    fill
                    className="object-cover"
                  />
                </div>
              )}

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <Link
                      href={item.type === 'show' ? `/shows/${item.slug}` : `/artists/${item.slug}`}
                      className="font-semibold hover:underline line-clamp-1"
                    >
                      {item.name}
                    </Link>
                    
                    {item.type === 'show' && (
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {item.venue_name}
                        </span>
                        {item.show_date && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {format(new Date(item.show_date), 'MMM d')}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <Badge variant={item.type === 'show' ? 'default' : 'secondary'}>
                    {item.type}
                  </Badge>
                </div>

                <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" />
                    {item.votes} votes
                  </span>
                  <span className="flex items-center gap-1">
                    <MessageCircle className="w-3 h-3" />
                    {item.comments} comments
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {item.attendees} attendees
                  </span>
                </div>
              </div>

              <div className="text-right">
                <div className="text-sm font-medium text-primary">
                  Score: {(item.score * 100).toFixed(0)}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function TrendingShowCard({ show }: { show: any }) {
  return (
    <Card className="hover:shadow-lg transition-shadow h-full">
      <Link href={`/shows/${show.slug}`}>
        <CardHeader className="p-4 pb-2">
          <div className="flex items-start justify-between">
            <CardTitle className="text-lg line-clamp-2">{show.artist_name}</CardTitle>
            <Badge>Show</Badge>
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-2">
          {show.image_url && (
            <div className="relative w-full h-40 mb-3 rounded-md overflow-hidden">
              <Image
                src={show.image_url}
                alt={show.artist_name}
                fill
                className="object-cover"
              />
            </div>
          )}
          
          <div className="space-y-2 text-sm text-muted-foreground">
            <p className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {show.venue_name}
            </p>
            {show.show_date && (
              <p className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {format(new Date(show.show_date), 'EEEE, MMMM d')}
              </p>
            )}
          </div>

          <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
            <span>{show.votes} votes</span>
            <span>{show.comments} comments</span>
            <span>{show.attendees} going</span>
          </div>
        </CardContent>
      </Link>
    </Card>
  );
}

function TrendingArtistCard({ artist }: { artist: any }) {
  return (
    <Card className="hover:shadow-lg transition-shadow h-full">
      <Link href={`/artists/${artist.slug}`}>
        <CardHeader className="p-4 pb-2">
          <div className="flex items-start justify-between">
            <CardTitle className="text-lg line-clamp-1">{artist.name}</CardTitle>
            <Badge variant="secondary">Artist</Badge>
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-2">
          {artist.image_url && (
            <div className="relative w-full h-40 mb-3 rounded-md overflow-hidden">
              <Image
                src={artist.image_url}
                alt={artist.name}
                fill
                className="object-cover"
              />
            </div>
          )}

          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              {artist.votes} votes
            </span>
            <span className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              {artist.attendees} fans
            </span>
          </div>
          
          <p className="text-xs text-muted-foreground mt-2">
            {artist.recent_activity} total interactions
          </p>
        </CardContent>
      </Link>
    </Card>
  );
}

function TrendingLoading() {
  return (
    <div className="container mx-auto px-4 py-8">
      <Skeleton className="h-10 w-48 mb-4" />
      <Skeleton className="h-6 w-96 mb-8" />
      
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="flex items-start gap-4">
                <Skeleton className="w-8 h-8" />
                <Skeleton className="w-16 h-16 rounded-md" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default function TrendingPage() {
  return (
    <Suspense fallback={<TrendingLoading />}>
      <TrendingContent />
    </Suspense>
  );
}