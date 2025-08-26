"use client";

import {
  Card,
  CardContent,
  CardHeader,
} from "@repo/design-system/card";
import { Skeleton } from "@repo/design-system/skeleton";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@repo/design-system/tabs";

export function ArtistHeaderSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start gap-6">
          {/* Image Skeleton */}
          <Skeleton className="h-32 w-32 rounded-lg flex-shrink-0" />

          {/* Content Skeleton */}
          <div className="flex-1 space-y-4">
            {/* Artist name */}
            <Skeleton className="h-8 w-64" />

            {/* Genres */}
            <div className="flex gap-2">
              <Skeleton className="h-6 w-16" />
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-6 w-18" />
            </div>

            {/* Stats */}
            <div className="flex gap-4">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-20" />
            </div>

            {/* Bio */}
            <Skeleton className="h-4 w-full max-w-md" />
            <Skeleton className="h-4 w-3/4 max-w-sm" />
          </div>

          {/* Follow button */}
          <Skeleton className="h-10 w-24" />
        </div>
      </CardHeader>
    </Card>
  );
}

export function ArtistStatsSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-4 text-center">
            <Skeleton className="h-8 w-16 mx-auto mb-2" />
            <Skeleton className="h-4 w-20 mx-auto" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function ShowListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              {/* Date skeleton */}
              <div className="flex-shrink-0 text-center">
                <Skeleton className="h-6 w-12 mb-1" />
                <Skeleton className="h-4 w-8" />
              </div>

              {/* Show info */}
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-24" />
              </div>

              {/* Action button */}
              <Skeleton className="h-8 w-20" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function SetlistSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-16" />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center justify-between p-2 border rounded"
          >
            <div className="flex items-center gap-3">
              <Skeleton className="h-4 w-6" />
              <Skeleton className="h-4 w-40" />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-6 w-12" />
              <Skeleton className="h-8 w-8 rounded" />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function ArtistPageSkeleton() {
  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* Breadcrumb skeleton */}
      <div className="flex items-center gap-2">
        <Skeleton className="h-4 w-12" />
        <Skeleton className="h-4 w-4" />
        <Skeleton className="h-4 w-24" />
      </div>

      {/* Artist Header */}
      <ArtistHeaderSkeleton />

      {/* Artist Stats */}
      <ArtistStatsSkeleton />

      {/* Content Tabs */}
      <Tabs defaultValue="shows" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="shows">
            <Skeleton className="h-4 w-24" />
          </TabsTrigger>
          <TabsTrigger value="past">
            <Skeleton className="h-4 w-20" />
          </TabsTrigger>
        </TabsList>

        <TabsContent value="shows" className="space-y-4 mt-6">
          <ShowListSkeleton />
        </TabsContent>

        <TabsContent value="past" className="space-y-4 mt-6">
          <ShowListSkeleton count={5} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
