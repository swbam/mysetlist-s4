import { Skeleton } from '@repo/design-system/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@repo/design-system';

export default function ArtistPageLoading() {
  return (
    <div className="container mx-auto py-8">
      {/* Breadcrumb Navigation Skeleton */}
      <div className="mb-6 flex items-center gap-2">
        <Skeleton className="h-4 w-16" />
        <span className="text-muted-foreground">/</span>
        <Skeleton className="h-4 w-32" />
      </div>

      {/* Artist Header Skeleton */}
      <div className="mb-8 flex items-start gap-6">
        <Skeleton className="h-32 w-32 rounded-full" />
        <div className="flex-1 space-y-4">
          <Skeleton className="h-10 w-1/3" />
          <div className="flex gap-2">
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-6 w-20" />
          </div>
          <div className="flex gap-4">
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-32" />
          </div>
        </div>
      </div>

      {/* Artist Stats Skeleton */}
      <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>

      {/* Content Tabs Skeleton */}
      <Tabs defaultValue="shows" className="mt-8 w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="shows">Upcoming Shows</TabsTrigger>
          <TabsTrigger value="past">Past Shows</TabsTrigger>
          <TabsTrigger value="music">Music</TabsTrigger>
          <TabsTrigger value="about">About</TabsTrigger>
        </TabsList>

        <TabsContent value="shows" className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}