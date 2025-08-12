"use client";

import { Card, CardContent } from "@repo/design-system/components/ui/card";
import { Skeleton } from "@repo/design-system/components/ui/skeleton";

export function SearchResultSkeleton() {
  return (
    <div className="flex items-center gap-3 p-2 rounded-md">
      <Skeleton className="h-10 w-10 rounded-full" />
      <div className="flex-1 space-y-1">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-24" />
      </div>
      <Skeleton className="h-4 w-12" />
    </div>
  );
}

export function SearchDropdownSkeleton({ count = 5 }: { count?: number }) {
  return (
    <Card className="border border-border/50 bg-card/95 shadow-lg backdrop-blur-sm">
      <CardContent className="p-1 max-h-80 overflow-auto">
        <div className="space-y-1">
          {Array.from({ length: count }).map((_, i) => (
            <SearchResultSkeleton key={i} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function ArtistGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="overflow-hidden">
          <div className="aspect-square relative">
            <Skeleton className="absolute inset-0" />
          </div>
          <CardContent className="p-4 space-y-2">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-12" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function SearchPageSkeleton() {
  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Search header */}
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="relative max-w-2xl">
          <Skeleton className="h-12 w-full" />
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {["All", "Artists", "Shows", "Venues"].map((_, i) => (
          <Skeleton key={i} className="h-9 w-16" />
        ))}
      </div>

      {/* Results grid */}
      <ArtistGridSkeleton />
    </div>
  );
}