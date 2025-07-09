import { cn } from '@repo/design-system/lib/utils';
import React from 'react';

interface SkeletonLoaderProps {
  className?: string;
  variant?: 'default' | 'artist-card' | 'show-card' | 'featured';
  count?: number;
}

export const SkeletonLoader = React.memo(function SkeletonLoader({
  className,
  variant = 'default',
  count = 1,
}: SkeletonLoaderProps) {
  const baseClass = 'animate-pulse bg-muted rounded-md';

  const renderSkeleton = () => {
    switch (variant) {
      case 'artist-card':
        return (
          <div className="space-y-3">
            <div className={cn(baseClass, 'aspect-[3/4] rounded-xl')} />
            <div className={cn(baseClass, 'h-4 w-3/4 mx-auto')} />
            <div className={cn(baseClass, 'h-3 w-1/2 mx-auto')} />
          </div>
        );

      case 'show-card':
        return (
          <div className="space-y-3">
            <div className={cn(baseClass, 'aspect-[16/10] rounded-t-md')} />
            <div className="p-4 space-y-2">
              <div className={cn(baseClass, 'h-4 w-full')} />
              <div className={cn(baseClass, 'h-3 w-2/3')} />
              <div className={cn(baseClass, 'h-3 w-1/2')} />
            </div>
          </div>
        );

      case 'featured':
        return (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className={cn(baseClass, 'lg:col-span-2 h-96')} />
            <div className={cn(baseClass, 'h-96')} />
          </div>
        );

      default:
        return <div className={cn(baseClass, 'h-20', className)} />;
    }
  };

  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className={className}>
          {renderSkeleton()}
        </div>
      ))}
    </>
  );
});

// Artist Grid Skeleton
export const ArtistGridSkeleton = React.memo(function ArtistGridSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
      <SkeletonLoader variant="artist-card" count={6} />
    </div>
  );
});

// Show Grid Skeleton
export const ShowGridSkeleton = React.memo(function ShowGridSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <SkeletonLoader variant="show-card" count={4} />
    </div>
  );
});

// Homepage Slider Skeleton
export const HomepageSliderSkeleton = React.memo(function HomepageSliderSkeleton() {
  return (
    <div className="relative py-16 md:py-24">
      <div className="container mx-auto px-4">
        {/* Header skeleton */}
        <div className="mb-8 flex items-end justify-between">
          <div className="space-y-2">
            <div className="h-8 w-64 bg-muted rounded-md animate-pulse" />
            <div className="h-5 w-96 bg-muted rounded-md animate-pulse" />
          </div>
          <div className="h-6 w-20 bg-muted rounded-md animate-pulse" />
        </div>
        
        {/* Slider skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <SkeletonLoader variant="artist-card" count={6} />
        </div>
      </div>
    </div>
  );
});

// Hero Section Skeleton
export const HeroSkeleton = React.memo(function HeroSkeleton() {
  return (
    <div className="relative overflow-hidden pt-32 pb-40">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-5xl text-center space-y-6">
          {/* Title skeleton */}
          <div className="h-12 w-80 bg-muted rounded-md animate-pulse mx-auto" />
          <div className="h-6 w-96 bg-muted rounded-md animate-pulse mx-auto" />
          
          {/* Search skeleton */}
          <div className="mx-auto max-w-2xl mt-12">
            <div className="h-12 w-full bg-muted rounded-md animate-pulse" />
          </div>
          
          {/* Stats skeleton */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-8 mt-16 max-w-2xl mx-auto">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="text-center space-y-2">
                <div className="h-10 w-20 bg-muted rounded-md animate-pulse mx-auto" />
                <div className="h-4 w-24 bg-muted rounded-md animate-pulse mx-auto" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
});