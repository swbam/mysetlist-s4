"use client";

import { Card, CardContent, CardHeader } from "@repo/design-system/components/ui/card";
import { Skeleton } from "@repo/design-system/components/ui/skeleton";
import { Loader2, Download } from "lucide-react";

interface ArtistImportLoadingProps {
  artistName?: string;
}

export function ArtistImportLoading({ artistName }: ArtistImportLoadingProps) {
  return (
    <div className="container mx-auto py-8">
      {/* Loading Header */}
      <Card className="mb-8 border-2 border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Download className="h-5 w-5 text-primary" />
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
          <h1 className="text-2xl font-bold">
            Importing {artistName ? `"${artistName}"` : "Artist"}
          </h1>
          <p className="text-muted-foreground">
            Getting the latest data from Ticketmaster...
          </p>
        </CardHeader>
        </Card>

      {/* Artist Header Skeleton */}
      <Card className="mb-8">
        <CardHeader>
          <div className="flex items-start gap-6">
            {/* Image Skeleton */}
            <Skeleton className="h-32 w-32 rounded-lg flex-shrink-0" />
            
            {/* Content Skeleton */}
            <div className="flex-1 space-y-4">
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-4 w-40" />
              <div className="flex gap-2">
                <Skeleton className="h-6 w-16" />
                <Skeleton className="h-6 w-20" />
                <Skeleton className="h-6 w-18" />
              </div>
              <Skeleton className="h-4 w-full max-w-md" />
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Stats Skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4 text-center">
              <Skeleton className="h-6 w-12 mx-auto mb-2" />
              <Skeleton className="h-4 w-16 mx-auto" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs Skeleton */}
      <Card>
        <CardHeader>
          <div className="flex gap-4 mb-4">
            <Skeleton className="h-9 w-32" />
            <Skeleton className="h-9 w-28" />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-4 border rounded-lg">
              <Skeleton className="h-12 w-12 rounded" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-4 w-32" />
              </div>
              <Skeleton className="h-8 w-20" />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Progress Indicator */}
      <div className="mt-8 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm font-medium">This may take a few seconds...</span>
        </div>
      </div>
    </div>
  );
}