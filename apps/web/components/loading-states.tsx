import {
  Card,
  CardContent,
  CardHeader,
} from "@repo/design-system/components/ui/card"
import { Skeleton } from "@repo/design-system/components/ui/skeleton"
import { cn } from "@repo/design-system/lib/utils"
import { Activity } from "lucide-react"

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg"
  className?: string
}

export function LoadingSpinner({
  size = "md",
  className,
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-6 w-6",
    lg: "h-8 w-8",
  }

  return (
    <div
      className={cn(
        "animate-spin rounded-full border-2 border-muted border-t-primary",
        sizeClasses[size],
        className
      )}
      role="status"
      aria-label="Loading"
    />
  )
}

interface LoadingStateProps {
  message?: string
  icon?: any
  className?: string
}

export function LoadingState({
  message = "Loading...",
  icon: Icon = Activity,
  className,
}: LoadingStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-8 text-center sm:py-12",
        className
      )}
      role="status"
      aria-live="polite"
    >
      <div className="relative mb-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted/50 sm:h-12 sm:w-12">
          <Icon className="h-5 w-5 text-muted-foreground sm:h-6 sm:w-6" />
        </div>
        <div className="absolute inset-0 animate-spin rounded-full border-2 border-muted border-t-primary" />
      </div>
      <p className="px-4 text-muted-foreground text-sm sm:text-base">
        {message}
      </p>
    </div>
  )
}

// Specific loading skeletons for different components

export function ArtistCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="relative mb-4 aspect-square overflow-hidden rounded-lg bg-muted">
          <Skeleton className="h-full w-full" />
        </div>
        <Skeleton className="mb-2 h-6 w-full" />
        <div className="mb-3 flex gap-2">
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-5 w-20" />
        </div>
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-4 w-16" />
        </div>
      </CardContent>
    </Card>
  )
}

export function ShowCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <div className="flex flex-col md:flex-row">
          <div className="flex flex-1 items-center gap-4 p-6">
            <Skeleton className="h-16 w-16 flex-shrink-0 rounded-full" />
            <div className="min-w-0 flex-1">
              <Skeleton className="mb-2 h-6 w-full" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
          <div className="flex flex-col items-start gap-4 border-t p-6 md:flex-row md:items-center md:border-t-0 md:border-l">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-8 w-24" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function VenueCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <Skeleton className="h-48 w-full" />
      <CardContent className="p-6">
        <div className="space-y-3">
          <div>
            <Skeleton className="mb-2 h-6 w-full" />
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
  )
}

export function SetlistSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1 space-y-2">
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
            <div
              key={i}
              className="flex items-center gap-4 rounded-lg border p-3"
            >
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="flex-1">
                <Skeleton className="mb-1 h-4 w-48" />
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
  )
}

export function StatCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-6 text-center">
        <Skeleton className="mx-auto mb-3 h-8 w-8" />
        <Skeleton className="mx-auto mb-2 h-8 w-16" />
        <Skeleton className="mx-auto mb-1 h-4 w-20" />
        <Skeleton className="mx-auto h-3 w-24" />
      </CardContent>
    </Card>
  )
}

export function TrendingCardSkeleton() {
  return (
    <div className="flex items-center gap-4 rounded-lg border border-border/50 bg-background/80 p-4">
      <Skeleton className="h-16 w-16 flex-shrink-0 rounded-lg" />
      <div className="flex-1">
        <Skeleton className="mb-2 h-5 w-full" />
        <Skeleton className="mb-1 h-4 w-32" />
        <Skeleton className="h-3 w-24" />
      </div>
      <div className="flex flex-col items-end gap-1">
        <Skeleton className="h-4 w-12" />
        <Skeleton className="h-4 w-16" />
      </div>
    </div>
  )
}

// Grid skeletons for multiple items
export function ArtistGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <ArtistCardSkeleton key={i} />
      ))}
    </div>
  )
}

export function ShowListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <ShowCardSkeleton key={i} />
      ))}
    </div>
  )
}

export function VenueGridSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <VenueCardSkeleton key={i} />
      ))}
    </div>
  )
}

export function VenueListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <VenueCardSkeleton key={i} />
      ))}
    </div>
  )
}

export function TrendingListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <TrendingCardSkeleton key={i} />
      ))}
    </div>
  )
}

export function StatsGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <StatCardSkeleton key={i} />
      ))}
    </div>
  )
}

// Page-specific loading states
export function HomePageSkeleton() {
  return (
    <div className="space-y-16">
      {/* Hero Section */}
      <div className="py-16 text-center">
        <Skeleton className="mx-auto mb-4 h-12 w-96" />
        <Skeleton className="mx-auto mb-8 h-6 w-128" />
        <Skeleton className="mx-auto mb-8 h-12 w-80" />
        <div className="flex justify-center gap-4">
          <Skeleton className="h-12 w-32" />
          <Skeleton className="h-12 w-32" />
        </div>
      </div>

      {/* Trending Section */}
      <div className="py-16">
        <Skeleton className="mx-auto mb-12 h-8 w-48" />
        <TrendingListSkeleton />
      </div>

      {/* Stats Section */}
      <div className="py-12">
        <StatsGridSkeleton />
      </div>

      {/* Featured Venues */}
      <div className="py-16">
        <Skeleton className="mx-auto mb-12 h-8 w-48" />
        <VenueGridSkeleton />
      </div>
    </div>
  )
}

export function ArtistPageSkeleton() {
  return (
    <div className="container mx-auto space-y-8 py-8">
      {/* Artist Header */}
      <div className="relative h-80 overflow-hidden rounded-lg bg-muted">
        <Skeleton className="h-full w-full" />
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
  )
}

export function ShowPageSkeleton() {
  return (
    <div className="container mx-auto py-8">
      <div className="grid gap-8 lg:grid-cols-3">
        {/* Main Content */}
        <div className="space-y-8 lg:col-span-2">
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
  )
}
