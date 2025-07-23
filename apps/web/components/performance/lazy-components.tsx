'use client';

import dynamic from 'next/dynamic';
import { Suspense } from 'react';
import { LoadingSkeleton } from '~/components/ui/loading-skeleton';
import { ContentSkeleton } from '~/components/ui/content-skeleton';

// Lazy-loaded components with loading states
export const LazyArtistGrid = dynamic(
  () => import('~/app/artists/components/artist-grid').then(mod => ({ default: mod.ArtistGrid })),
  {
    loading: () => <ContentSkeleton className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4" />,
    ssr: false,
  }
);

export const LazySetlistViewer = dynamic(
  () => import('~/components/setlist/setlist-viewer').then(mod => ({ default: mod.SetlistViewer })),
  {
    loading: () => <LoadingSkeleton className="h-64" />,
    ssr: true,
  }
);

export const LazySearchBar = dynamic(
  () => import('~/components/search-bar').then(mod => ({ default: mod.SearchBar })),
  {
    loading: () => <div className="h-12 bg-muted animate-pulse rounded-md" />,
    ssr: true,
  }
);

export const LazyVoteButton = dynamic(
  () => import('~/components/voting/vote-button').then(mod => ({ default: mod.VoteButton })),
  {
    loading: () => <div className="flex flex-col items-center gap-1 h-20 w-16 animate-pulse bg-muted rounded" />,
    ssr: false,
  }
);

export const LazyAnalyticsDashboard = dynamic(
  () => import('~/components/analytics/advanced-analytics-dashboard'),
  {
    loading: () => <ContentSkeleton className="h-96" />,
    ssr: false,
  }
);

export const LazyRealtimeSetlistViewer = dynamic(
  () => import('~/components/setlist/realtime-setlist-viewer'),
  {
    loading: () => <LoadingSkeleton className="h-64" />,
    ssr: false,
  }
);

export const LazyVotingDashboard = dynamic(
  () => import('~/components/voting/comprehensive-voting-dashboard'),
  {
    loading: () => <ContentSkeleton className="h-80" />,
    ssr: false,
  }
);

// Higher-order component for adding Suspense boundaries
export function withSuspense<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: React.ReactNode
) {
  return function SuspenseWrapper(props: P) {
    return (
      <Suspense fallback={fallback || <LoadingSkeleton />}>
        <Component {...props} />
      </Suspense>
    );
  };
}

// Intersection Observer based lazy loading for images
export const LazyImage = dynamic(
  () => import('~/components/optimized-image'),
  {
    loading: () => <div className="bg-muted animate-pulse rounded" />,
    ssr: false,
  }
);

// Performance-optimized list components
export const LazyVirtualizedList = dynamic(
  () => import('~/components/virtualized-list'),
  {
    loading: () => <LoadingSkeleton className="h-64" />,
    ssr: false,
  }
);

export const LazyInfiniteScroll = dynamic(
  () => import('~/components/ui/infinite-scroll'),
  {
    loading: () => <LoadingSkeleton className="h-32" />,
    ssr: false,
  }
);