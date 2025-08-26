import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system/card";
import { Skeleton } from "@repo/design-system/skeleton";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@repo/design-system/tabs";
import {
  BarChart3,
  Flame,
  MapPin,
  Music,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import type { Metadata } from "next";
import React, { Suspense } from "react";
import { TrendingErrorBoundary } from "~/components/error-boundaries/trending-error-boundary";
import { HotVenues } from "./components/hot-venues";
import { MostVotedSongs } from "./components/most-voted-songs";
import { RecentSetlistActivity } from "./components/recent-setlist-activity";
import { RisingArtists } from "./components/rising-artists";
import { TrendingArtists } from "./components/trending-artists";
import { TrendingLocations } from "./components/trending-locations";
import { TrendingStatistics } from "./components/trending-statistics";

// Force dynamic rendering due to server-side auth check
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Trending - TheSet",
  description:
    "Discover what's trending in the live music world. See top artists, most voted songs, hot venues, and rising stars with real community data.",
  openGraph: {
    title: "Music Trends & Insights | TheSet",
    description:
      "Explore real-time music trends: top artists, most voted songs, hot venues, and rising stars. Data-driven insights from the concert community.",
  },
};

// All data fetching moved to trending-insights.ts for better organization

function TrendingPageSkeleton() {
  return (
    <div className="space-y-8">
      {/* Statistics Skeleton */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16 mb-1" />
              <Skeleton className="h-3 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content Skeleton */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="space-y-8 lg:col-span-2">
          {/* Tab Content Skeleton */}
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-48" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Array.from({ length: 6 }).map((_, j) => (
                  <div
                    key={j}
                    className="flex items-center gap-4 p-3 border rounded-lg"
                  >
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-48" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                    <Skeleton className="h-4 w-16" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Skeleton */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-48" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Array.from({ length: 6 }).map((_, j) => (
                  <div key={j} className="flex items-start gap-3">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <div className="flex-1 space-y-1">
                      <Skeleton className="h-3 w-full" />
                      <Skeleton className="h-3 w-2/3" />
                    </div>
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
    <TrendingErrorBoundary>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="mb-4 flex items-center gap-3">
            <Flame className="h-8 w-8 text-orange-500" />
            <h1 className="font-bold text-4xl">Trending</h1>
          </div>
          <p className="text-muted-foreground text-xl">
            Discover what's hot in the live music world with real community data
          </p>
        </div>

        <Suspense fallback={<TrendingPageSkeleton />}>
          <div className="space-y-8">
            {/* Statistics Dashboard */}
            <section>
              <TrendingStatistics />
            </section>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
              {/* Primary Content */}
              <div className="space-y-8 lg:col-span-2">
                <Tabs defaultValue="artists" className="w-full">
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger
                      value="artists"
                      className="flex items-center gap-2"
                    >
                      <TrendingUp className="h-4 w-4" />
                      <span className="hidden sm:inline">Artists</span>
                    </TabsTrigger>
                    <TabsTrigger
                      value="songs"
                      className="flex items-center gap-2"
                    >
                      <Music className="h-4 w-4" />
                      <span className="hidden sm:inline">Songs</span>
                    </TabsTrigger>
                    <TabsTrigger
                      value="venues"
                      className="flex items-center gap-2"
                    >
                      <MapPin className="h-4 w-4" />
                      <span className="hidden sm:inline">Venues</span>
                    </TabsTrigger>
                    <TabsTrigger
                      value="rising"
                      className="flex items-center gap-2"
                    >
                      <Sparkles className="h-4 w-4" />
                      <span className="hidden sm:inline">Rising</span>
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="artists" className="mt-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <TrendingUp className="h-5 w-5 text-orange-500" />
                          Top Trending Artists
                        </CardTitle>
                        <CardDescription>
                          Artists with the highest engagement and vote activity
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <TrendingArtists />
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="songs" className="mt-6">
                    <MostVotedSongs />
                  </TabsContent>

                  <TabsContent value="venues" className="mt-6">
                    <HotVenues />
                  </TabsContent>

                  <TabsContent value="rising" className="mt-6">
                    <RisingArtists />
                  </TabsContent>
                </Tabs>
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                <TrendingLocations />
                <RecentSetlistActivity />
              </div>
            </div>
          </div>
        </Suspense>
      </div>
    </TrendingErrorBoundary>
  );
}
