import {
  ArtistGridSkeleton,
  TrendingListSkeleton,
} from '@/components/loading-states';
import { Skeleton } from '@repo/design-system/components/ui/skeleton';

export default function ArtistsLoading() {
  return (
    <div className="flex flex-col gap-8 py-8 md:py-16">
      <div className="container mx-auto">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-4">
            <h1 className="font-regular text-4xl tracking-tighter md:text-6xl">
              Discover Artists
            </h1>
            <p className="max-w-2xl text-lg text-muted-foreground">
              Search for your favorite artists to discover their upcoming
              shows and past setlists
            </p>
          </div>

          {/* Search bar skeleton */}
          <Skeleton className="h-12 w-full max-w-2xl" />

          {/* Trending Artists Section */}
          <div className="mt-12">
            <h2 className="mb-6 font-semibold text-2xl">Trending Artists</h2>
            <TrendingListSkeleton count={5} />
          </div>

          {/* Popular Artists Grid */}
          <div className="mt-12">
            <h2 className="mb-6 font-semibold text-2xl">Popular Artists</h2>
            <ArtistGridSkeleton count={6} />
          </div>
        </div>
      </div>
    </div>
  );
}