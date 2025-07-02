import { Card, CardContent, CardHeader } from '@repo/design-system/components/ui/card';
import { Skeleton } from '@repo/design-system/components/ui/skeleton';
import { Music, Users, MapPin, Calendar, Activity } from 'lucide-react';
import { cn } from '@repo/design-system/lib/utils';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function LoadingSpinner({ size = 'md', className }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6', 
    lg: 'h-8 w-8'
  };

  return (
    <div 
      className={cn(
        'animate-spin rounded-full border-2 border-muted border-t-primary',
        sizeClasses[size], 
        className
      )} 
      role="status"
      aria-label="Loading"
    />
  );
}

interface LoadingStateProps {
  message?: string;
  icon?: React.ComponentType<{ className?: string }>;
  className?: string;
}

export function LoadingState({ 
  message = 'Loading...', 
  icon: Icon = Activity,
  className 
}: LoadingStateProps) {
  return (
    <div 
      className={cn('flex flex-col items-center justify-center py-8 sm:py-12 text-center', className)}
      role="status"
      aria-live="polite"
    >
      <div className="relative mb-4">
        <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-muted/50 flex items-center justify-center">
          <Icon className="h-5 w-5 sm:h-6 sm:w-6 text-muted-foreground" />
        </div>
        <div className="absolute inset-0 rounded-full border-2 border-muted border-t-primary animate-spin" />
      </div>
      <p className="text-sm sm:text-base text-muted-foreground px-4">{message}</p>
    </div>
  );
}

// Specific loading skeletons for different components

export function ArtistCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="aspect-square relative overflow-hidden bg-muted mb-4 rounded-lg">
          <Skeleton className="w-full h-full" />
        </div>
        <Skeleton className="h-6 w-full mb-2" />
        <div className="flex gap-2 mb-3">
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-5 w-20" />
        </div>
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-4 w-16" />
        </div>
      </CardContent>
    </Card>
  );
}

export function ShowCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <div className="flex flex-col md:flex-row">
          <div className="flex items-center gap-4 p-6 flex-1">
            <Skeleton className="h-16 w-16 rounded-full flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <Skeleton className="h-6 w-full mb-2" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4 p-6 border-t md:border-t-0 md:border-l">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-8 w-24" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function VenueCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <Skeleton className="h-48 w-full" />
      <CardContent className="p-6">
        <div className="space-y-3">
          <div>
            <Skeleton className="h-6 w-full mb-2" />
            <Skeleton className="h-4 w-32" />
          </div>
          <Skeleton className="h-4 w-full" />
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-16" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-8 flex-1" />
            <Skeleton className="h-8 w-8" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function SetlistSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-2 flex-1">
            <div className="flex items-center gap-2">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-5 w-16" />
            </div>
            <div className="flex items-center gap-4">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
          <Skeleton className="h-8 w-8" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-3 rounded-lg border">
              <Skeleton className="w-8 h-8 rounded-full" />
              <div className="flex-1">
                <Skeleton className="h-4 w-48 mb-1" />
                <Skeleton className="h-3 w-32" />
              </div>
              <div className="flex items-center gap-1">
                <Skeleton className="h-6 w-6" />
                <Skeleton className="h-4 w-8" />
                <Skeleton className="h-6 w-6" />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function StatCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-6 text-center">
        <Skeleton className="h-8 w-8 mx-auto mb-3" />
        <Skeleton className="h-8 w-16 mx-auto mb-2" />
        <Skeleton className="h-4 w-20 mx-auto mb-1" />
        <Skeleton className="h-3 w-24 mx-auto" />
      </CardContent>
    </Card>
  );
}

export function TrendingCardSkeleton() {
  return (
    <div className="flex items-center gap-4 rounded-lg border border-border/50 bg-background/80 p-4">
      <Skeleton className="h-16 w-16 rounded-lg flex-shrink-0" />
      <div className="flex-1">
        <Skeleton className="h-5 w-full mb-2" />
        <Skeleton className="h-4 w-32 mb-1" />
        <Skeleton className="h-3 w-24" />
      </div>
      <div className="flex flex-col items-end gap-1">
        <Skeleton className="h-4 w-12" />
        <Skeleton className="h-4 w-16" />
      </div>
    </div>
  );
}

// Grid skeletons for multiple items
export function ArtistGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <ArtistCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function ShowListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <ShowCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function VenueGridSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <VenueCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function TrendingListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <TrendingCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function StatsGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <StatCardSkeleton key={i} />
      ))}
    </div>
  );
}

// Page-specific loading states
export function HomePageSkeleton() {
  return (
    <div className="space-y-16">
      {/* Hero Section */}
      <div className="py-16 text-center">
        <Skeleton className="h-12 w-96 mx-auto mb-4" />
        <Skeleton className="h-6 w-128 mx-auto mb-8" />
        <Skeleton className="h-12 w-80 mx-auto mb-8" />
        <div className="flex justify-center gap-4">
          <Skeleton className="h-12 w-32" />
          <Skeleton className="h-12 w-32" />
        </div>
      </div>

      {/* Trending Section */}
      <div className="py-16">
        <Skeleton className="h-8 w-48 mx-auto mb-12" />
        <TrendingListSkeleton />
      </div>

      {/* Stats Section */}
      <div className="py-12">
        <StatsGridSkeleton />
      </div>

      {/* Featured Venues */}
      <div className="py-16">
        <Skeleton className="h-8 w-48 mx-auto mb-12" />
        <VenueGridSkeleton />
      </div>
    </div>
  );
}

export function ArtistPageSkeleton() {
  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* Artist Header */}
      <div className="relative h-80 bg-muted rounded-lg overflow-hidden">
        <Skeleton className="w-full h-full" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent" />
        <div className="absolute bottom-8 left-8 flex items-end gap-6">
          <Skeleton className="h-40 w-40 rounded-full" />
          <div className="space-y-3">
            <Skeleton className="h-12 w-80" />
            <div className="flex gap-2">
              <Skeleton className="h-6 w-16" />
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-6 w-18" />
            </div>
            <div className="flex gap-6">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-20" />
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <StatsGridSkeleton />

      {/* Content Tabs */}
      <div className="space-y-6">
        <div className="flex gap-4">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-28" />
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-20" />
        </div>
        <ShowListSkeleton />
      </div>
    </div>
  );
}

export function ShowPageSkeleton() {
  return (
    <div className="container mx-auto py-8">
      <div className="grid gap-8 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-8">
          {/* Show Header */}
          <div className="space-y-4">
            <Skeleton className="h-12 w-full" />
            <div className="flex items-center gap-4">
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-6 w-28" />
            </div>
            <Skeleton className="h-20 w-full" />
          </div>

          {/* Setlist */}
          <SetlistSkeleton />
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-24" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-28" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-24" />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}