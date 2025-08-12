"use client";

import { Card, CardContent, CardHeader } from "@repo/design-system/components/ui/card";
import { Loader2, Download } from "lucide-react";
import { ArtistPageSkeleton } from "~/components/skeletons/artist-page-skeleton";

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

      {/* Use comprehensive skeleton */}
      <ArtistPageSkeleton />

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