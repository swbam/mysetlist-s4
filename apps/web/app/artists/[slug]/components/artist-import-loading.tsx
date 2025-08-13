"use client";

import {
  Card,
  CardContent,
  CardHeader,
} from "@repo/design-system/components/ui/card";
import { Download, Loader2 } from "lucide-react";
import { ArtistPageSkeleton } from "~/components/skeletons/artist-page-skeleton";

interface ArtistImportLoadingProps {
  artistName?: string;
}

export function ArtistImportLoading(_props: ArtistImportLoadingProps) {
  return (
    <div className="container mx-auto py-8">
      <Card className="mb-8 border-2 border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center mb-2">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        </CardHeader>
      </Card>
      <ArtistPageSkeleton />
      <div className="mt-8 text-center">
        <Loader2 className="h-5 w-5 animate-spin text-primary inline-block" />
      </div>
    </div>
  );
}
