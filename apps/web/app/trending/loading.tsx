import {
  ArtistGridSkeleton,
  ShowListSkeleton,
  TrendingListSkeleton,
} from '@/components/loading-states';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@repo/design-system/components/ui/tabs';
import { BarChart, Calendar, Music, TrendingUp } from 'lucide-react';

export default function TrendingLoading() {
  return (
    <div className="flex flex-col gap-8 py-8 md:py-16">
      <div className="container mx-auto px-4">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-4">
            <h1 className="font-regular text-4xl tracking-tighter md:text-6xl">
              Trending
            </h1>
            <p className="max-w-2xl text-lg text-muted-foreground">
              Discover what's popular in the live music scene right now
            </p>
          </div>

          <Tabs defaultValue="artists" className="w-full">
            <TabsList className="grid w-full max-w-[400px] grid-cols-4">
              <TabsTrigger value="artists" className="gap-2">
                <Music className="h-4 w-4" />
                <span className="hidden sm:inline">Artists</span>
              </TabsTrigger>
              <TabsTrigger value="shows" className="gap-2">
                <Calendar className="h-4 w-4" />
                <span className="hidden sm:inline">Shows</span>
              </TabsTrigger>
              <TabsTrigger value="charts" className="gap-2">
                <BarChart className="h-4 w-4" />
                <span className="hidden sm:inline">Charts</span>
              </TabsTrigger>
              <TabsTrigger value="rising" className="gap-2">
                <TrendingUp className="h-4 w-4" />
                <span className="hidden sm:inline">Rising</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="artists" className="mt-6">
              <TrendingListSkeleton count={10} />
            </TabsContent>

            <TabsContent value="shows" className="mt-6">
              <ShowListSkeleton count={5} />
            </TabsContent>

            <TabsContent value="charts" className="mt-6">
              <ArtistGridSkeleton count={6} />
            </TabsContent>

            <TabsContent value="rising" className="mt-6">
              <TrendingListSkeleton count={8} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}