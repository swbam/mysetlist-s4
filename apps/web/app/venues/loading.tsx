import { Skeleton } from "@repo/design-system/skeleton";
import { VenueGridSkeleton } from "~/components/loading-states";

export default function VenuesLoading() {
  return (
    <div className="flex flex-col gap-8 py-8 md:py-16">
      <div className="container mx-auto">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-4">
            <h1 className="font-regular text-4xl tracking-tighter md:text-6xl">
              Music Venues
            </h1>
            <p className="max-w-2xl text-lg text-muted-foreground">
              Explore the best music venues around the world
            </p>
          </div>

          {/* Search and filter skeleton */}
          <div className="flex flex-col gap-4 sm:flex-row">
            <Skeleton className="h-10 flex-1" />
            <Skeleton className="h-10 w-32" />
          </div>

          {/* Venues list skeleton */}
          <VenueGridSkeleton count={6} />
        </div>
      </div>
    </div>
  );
}
