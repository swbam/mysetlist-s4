# Next-Forge Performance Optimization Guide

## Performance Issues Identified

Based on the analysis, MySetlist is experiencing performance issues compared to the base next-forge starter. This guide provides specific optimizations aligned with next-forge best practices.

## 1. Component Optimization Strategy

### Current Issues
- Heavy components causing re-renders
- Missing memoization
- Unoptimized list rendering

### Next-Forge Pattern: Smart Memoization
```typescript
// packages/design-system/components/ui/artist-card.tsx
import { memo } from 'react';

interface ArtistCardProps {
  artist: Artist;
  onFollow?: (id: string) => void;
}

export const ArtistCard = memo(({ artist, onFollow }: ArtistCardProps) => {
  // Component logic
  return (
    <Card>
      {/* Content */}
    </Card>
  );
}, (prevProps, nextProps) => {
  // Custom comparison for better performance
  return prevProps.artist.id === nextProps.artist.id &&
         prevProps.artist.followersCount === nextProps.artist.followersCount;
});

ArtistCard.displayName = 'ArtistCard';
```

### List Virtualization for Large Data Sets
```typescript
// components/virtualized-list.tsx
import { VirtualList } from '@tanstack/react-virtual';

export function VirtualizedArtistGrid({ artists }: { artists: Artist[] }) {
  const parentRef = useRef<HTMLDivElement>(null);
  
  const virtualizer = useVirtualizer({
    count: artists.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 280, // Card height
    overscan: 5,
  });

  return (
    <div ref={parentRef} className="h-screen overflow-auto">
      <div style={{ height: `${virtualizer.getTotalSize()}px` }}>
        {virtualizer.getVirtualItems().map((virtualItem) => (
          <div
            key={virtualItem.key}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              transform: `translateY(${virtualItem.start}px)`,
            }}
          >
            <ArtistCard artist={artists[virtualItem.index]} />
          </div>
        ))}
      </div>
    </div>
  );
}
```

## 2. Next.js App Router Optimizations

### Implement Proper Loading States
```typescript
// app/artists/loading.tsx
export default function Loading() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {Array.from({ length: 9 }).map((_, i) => (
        <Skeleton key={i} className="h-64 w-full" />
      ))}
    </div>
  );
}
```

### Use Streaming and Suspense
```typescript
// app/artists/page.tsx
import { Suspense } from 'react';

export default function ArtistsPage() {
  return (
    <div>
      <h1>Artists</h1>
      <Suspense fallback={<ArtistGridSkeleton />}>
        <ArtistGrid />
      </Suspense>
    </div>
  );
}

// Async component with data fetching
async function ArtistGrid() {
  const artists = await fetchArtists(); // This can be slow
  return <VirtualizedArtistGrid artists={artists} />;
}
```

## 3. Data Fetching Optimization

### Implement ISR (Incremental Static Regeneration)
```typescript
// app/artists/[slug]/page.tsx
export const revalidate = 3600; // Revalidate every hour

export async function generateStaticParams() {
  // Pre-render top 100 artists at build time
  const topArtists = await getTopArtists(100);
  return topArtists.map((artist) => ({
    slug: artist.slug,
  }));
}
```

### Parallel Data Fetching
```typescript
// lib/data-fetching.ts
export async function getArtistPageData(slug: string) {
  // Fetch all data in parallel
  const [artist, shows, similarArtists, stats] = await Promise.all([
    getArtistBySlug(slug),
    getArtistShows(slug),
    getSimilarArtists(slug),
    getArtistStats(slug),
  ]);

  return { artist, shows, similarArtists, stats };
}
```

## 4. Bundle Size Optimization

### Dynamic Imports for Heavy Components
```typescript
// components/analytics/analytics-dashboard.tsx
import dynamic from 'next/dynamic';

const AnalyticsCharts = dynamic(
  () => import('./analytics-charts').then(mod => mod.AnalyticsCharts),
  {
    loading: () => <Skeleton className="h-96" />,
    ssr: false, // Disable SSR for client-only components
  }
);
```

### Optimize Package Imports
```typescript
// next.config.ts
export default {
  experimental: {
    optimizePackageImports: [
      '@repo/design-system',
      'lucide-react',
      'recharts',
      'framer-motion',
      '@supabase/supabase-js',
    ],
  },
};
```

## 5. Image Optimization

### Use Next.js Image with Proper Configuration
```typescript
// components/optimized-image.tsx
import Image from 'next/image';

export function OptimizedImage({ src, alt, priority = false }) {
  return (
    <Image
      src={src}
      alt={alt}
      width={400}
      height={400}
      quality={85}
      placeholder="blur"
      blurDataURL={generateBlurDataURL()} // Generate base64 blur
      loading={priority ? 'eager' : 'lazy'}
      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
    />
  );
}
```

## 6. Database Query Optimization

### Implement Query Caching
```typescript
// lib/cache.ts
import { unstable_cache } from 'next/cache';

export const getCachedArtists = unstable_cache(
  async () => {
    return await db.select().from(artists).limit(100);
  },
  ['artists-list'],
  {
    revalidate: 3600, // 1 hour
    tags: ['artists'],
  }
);
```

### Optimize Database Queries
```typescript
// lib/db/optimized-queries.ts
export async function getArtistWithShows(slug: string) {
  // Use a single query with joins instead of multiple queries
  const result = await db
    .select({
      artist: artists,
      shows: shows,
      venue: venues,
    })
    .from(artists)
    .leftJoin(shows, eq(shows.artistId, artists.id))
    .leftJoin(venues, eq(venues.id, shows.venueId))
    .where(eq(artists.slug, slug))
    .limit(20);

  return result;
}
```

## 7. Service Worker Optimization

### Implement Proper Cache Strategy
```typescript
// public/sw.js
const CACHE_NAME = 'mysetlist-v1';
const urlsToCache = [
  '/',
  '/styles.css',
  '/_next/static/css/',
  '/_next/static/js/',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', (event) => {
  // Network first, fallback to cache
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseClone);
        });
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
```

## 8. Monitoring and Metrics

### Add Performance Monitoring
```typescript
// lib/monitoring/performance.tsx
'use client';

import { useReportWebVitals } from 'next/web-vitals';

export function WebVitals() {
  useReportWebVitals((metric) => {
    // Send to analytics
    console.log(metric);
    
    // Send to monitoring service
    if (metric.value > getThreshold(metric.name)) {
      reportToMonitoring({
        metric: metric.name,
        value: metric.value,
        page: window.location.pathname,
      });
    }
  });

  return null;
}

function getThreshold(metricName: string) {
  const thresholds = {
    FCP: 1800,
    LCP: 2500,
    CLS: 0.1,
    FID: 100,
    TTFB: 800,
  };
  return thresholds[metricName] || 0;
}
```

## Performance Checklist

### Immediate Actions
- [ ] Add React.memo to top 10 heaviest components
- [ ] Implement loading.tsx for all dynamic routes
- [ ] Enable ISR on artist and show pages
- [ ] Add dynamic imports for analytics components

### Week 1 Goals
- [ ] Reduce bundle size by 30%
- [ ] Achieve LCP < 2.5s on all pages
- [ ] Implement virtualization for large lists
- [ ] Add proper image optimization

### Monitoring Setup
```bash
# Add these scripts to package.json
"perf:measure": "lighthouse http://localhost:3001 --output=json --output-path=./lighthouse-report.json",
"perf:analyze": "webpack-bundle-analyzer .next/analyze/client.html -m static -r .next/analyze/report.html",
"perf:monitor": "npm run perf:measure && npm run perf:analyze"
```

## Expected Results

After implementing these optimizations:
- ⚡ 50% faster initial page loads
- 📦 40% smaller JavaScript bundles
- 🎯 90+ Lighthouse performance score
- 🚀 Instant navigation between pages
- 💾 Reduced server load through caching

These optimizations align with next-forge's philosophy of providing a production-ready, high-performance foundation for modern web applications.