import { cn } from "@repo/design-system/lib/utils"
import React from "react"

interface SkeletonLoaderProps {
  className?: string
  variant?: "default" | "artist-card" | "show-card" | "featured"
  count?: number
}

export const SkeletonLoader = React.memo(function SkeletonLoader({
  className,
  variant = "default",
  count = 1,
}: SkeletonLoaderProps) {
  const baseClass = "animate-pulse bg-muted rounded-md"

  const renderSkeleton = () => {
    switch (variant) {
      case "artist-card":
        return (
          <div className="space-y-3">
            <div className={cn(baseClass, "aspect-[3/4] rounded-xl")} />
            <div className={cn(baseClass, "mx-auto h-4 w-3/4")} />
            <div className={cn(baseClass, "mx-auto h-3 w-1/2")} />
          </div>
        )

      case "show-card":
        return (
          <div className="space-y-3">
            <div className={cn(baseClass, "aspect-[16/10] rounded-t-md")} />
            <div className="space-y-2 p-4">
              <div className={cn(baseClass, "h-4 w-full")} />
              <div className={cn(baseClass, "h-3 w-2/3")} />
              <div className={cn(baseClass, "h-3 w-1/2")} />
            </div>
          </div>
        )

      case "featured":
        return (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className={cn(baseClass, "h-96 lg:col-span-2")} />
            <div className={cn(baseClass, "h-96")} />
          </div>
        )

      default:
        return <div className={cn(baseClass, "h-20", className)} />
    }
  }

  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className={className}>
          {renderSkeleton()}
        </div>
      ))}
    </>
  )
})

// Artist Grid Skeleton
export const ArtistGridSkeleton = React.memo(function ArtistGridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-6">
      <SkeletonLoader variant="artist-card" count={6} />
    </div>
  )
})

// Show Grid Skeleton
export const ShowGridSkeleton = React.memo(function ShowGridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
      <SkeletonLoader variant="show-card" count={4} />
    </div>
  )
})

// Homepage Slider Skeleton
export const HomepageSliderSkeleton = React.memo(
  function HomepageSliderSkeleton() {
    return (
      <div className="relative py-16 md:py-24">
        <div className="container mx-auto px-4">
          {/* Header skeleton */}
          <div className="mb-8 flex items-end justify-between">
            <div className="space-y-2">
              <div className="h-8 w-64 animate-pulse rounded-md bg-muted" />
              <div className="h-5 w-96 animate-pulse rounded-md bg-muted" />
            </div>
            <div className="h-6 w-20 animate-pulse rounded-md bg-muted" />
          </div>

          {/* Slider skeleton */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-6">
            <SkeletonLoader variant="artist-card" count={6} />
          </div>
        </div>
      </div>
    )
  }
)

// Hero Section Skeleton
export const HeroSkeleton = React.memo(function HeroSkeleton() {
  return (
    <div className="relative overflow-hidden pt-32 pb-40">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-5xl space-y-6 text-center">
          {/* Title skeleton */}
          <div className="mx-auto h-12 w-80 animate-pulse rounded-md bg-muted" />
          <div className="mx-auto h-6 w-96 animate-pulse rounded-md bg-muted" />

          {/* Search skeleton */}
          <div className="mx-auto mt-12 max-w-2xl">
            <div className="h-12 w-full animate-pulse rounded-md bg-muted" />
          </div>

          {/* Stats skeleton */}
          <div className="mx-auto mt-16 grid max-w-2xl grid-cols-2 gap-8 md:grid-cols-3">
            {[...new Array(3)].map((_, i) => (
              <div key={i} className="space-y-2 text-center">
                <div className="mx-auto h-10 w-20 animate-pulse rounded-md bg-muted" />
                <div className="mx-auto h-4 w-24 animate-pulse rounded-md bg-muted" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
})
