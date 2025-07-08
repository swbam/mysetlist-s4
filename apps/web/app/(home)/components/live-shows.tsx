'use client';

import { RealtimeShowsFeed } from '@/components/realtime-shows-feed';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@repo/design-system/components/ui/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@repo/design-system/components/ui/tabs';

export function LiveShows() {
  return (
    <section className="py-12">
      <div className="container mx-auto px-4">
        <div className="mb-8 text-center">
          <h2 className="mb-4 font-bold text-3xl">Happening Now</h2>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
            Experience live shows in real-time. See what's happening right now,
            track attendance, and follow along with live setlists.
          </p>
        </div>

        <Tabs defaultValue="all" className="w-full">
          <TabsList className="mx-auto mb-8 grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="all">All Shows</TabsTrigger>
            <TabsTrigger value="live">Live Now</TabsTrigger>
            <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
          </TabsList>

          <TabsContent value="all">
            <RealtimeShowsFeed limit={6} />
          </TabsContent>

          <TabsContent value="live">
            <RealtimeShowsFeed limit={6} status="ongoing" />
          </TabsContent>

          <TabsContent value="upcoming">
            <RealtimeShowsFeed limit={6} status="upcoming" />
          </TabsContent>
        </Tabs>

        <Card className="mt-8 bg-muted/50">
          <CardHeader>
            <CardTitle className="text-lg">Real-time Features</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-muted-foreground text-sm">
              <li className="flex items-start gap-2">
                <span className="text-green-500">•</span>
                <span>
                  Live attendance tracking - see who's going in real-time
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500">•</span>
                <span>Live setlists - songs appear as they're played</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500">•</span>
                <span>Instant updates - no need to refresh the page</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500">•</span>
                <span>Vote on songs and see results update live</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
