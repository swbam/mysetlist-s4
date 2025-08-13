# TheSet - Development Guide

## Quick Start

```bash
# Clone and setup
git clone https://github.com/your-username/theset.git
cd theset
pnpm install

# Environment setup
cp .env.example .env.local
# Edit .env.local with your API keys

# Database setup
pnpm db:push
pnpm db:seed

# Start development
pnpm dev
# App available at http://localhost:3001
```

## Project Overview

TheSet is a production-ready concert setlist voting platform featuring a modern **ArtistImportOrchestrator** system that provides instant artist page loading with real-time progress tracking via Server-Sent Events (SSE).

### Core Features
- **Instant Artist Discovery**: < 3 second page loads with background sync
- **Real-time Import Progress**: Live SSE updates during data import
- **Smart Song Catalog**: Intelligent filtering and deduplication
- **Progressive Loading**: Content appears as it becomes available
- **Production Performance**: 89% cache hit rate, optimized bundles

## Architecture

### Modern Import System
```typescript
// Three-phase import strategy
Phase 1 (< 3s):    Create artist page with basic data
Phase 2 (Background): Import shows and venues in parallel  
Phase 3 (Background): Import complete song catalog
SSE Progress:      Real-time updates to connected clients
```

### Tech Stack
- **Framework**: Next.js 15.3.4 (App Router)
- **Database**: Supabase (PostgreSQL + Auth + Realtime)
- **ORM**: Drizzle with type-safe queries
- **Styling**: Tailwind CSS 4.0 + shadcn/ui
- **Caching**: Redis + LRU memory fallback
- **External APIs**: Spotify, Ticketmaster, Setlist.fm

### Project Structure
```
apps/web/                   # Main Next.js application
├── app/api/               # API routes with SSE support
├── lib/services/          # ArtistImportOrchestrator, CacheManager
├── components/            # UI components with dynamic imports
└── hooks/                 # Real-time hooks for import progress

packages/
├── database/              # Drizzle ORM + enhanced schema
├── external-apis/         # Smart API clients with rate limiting
└── auth/                  # Supabase authentication
```

## Development Commands

### Essential Commands
```bash
# Development
pnpm dev                   # Start dev server (port 3001)
pnpm build                 # Build for production
pnpm typecheck            # TypeScript validation
pnpm lint                 # Biome linter + formatter

# Database Operations
pnpm db:studio            # Open Drizzle Studio
pnpm db:push              # Push schema changes
pnpm db:generate          # Generate migrations
pnpm db:migrate           # Apply migrations
pnpm db:seed              # Seed with sample data

# Import System
pnpm sync:artists         # Background sync for active artists
pnpm sync:trending        # Deep catalog sync for trending artists

# Testing & Quality
pnpm test                 # Unit tests
pnpm test:e2e            # Playwright E2E tests
pnpm analyze:web         # Bundle analysis

# Deployment
pnpm deploy              # Full automated deployment
pnpm check:env           # Validate environment variables
```

## Environment Setup

### Required Environment Variables
```bash
# Database
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# External APIs
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
TICKETMASTER_API_KEY=your_ticketmaster_api_key
SETLISTFM_API_KEY=your_setlistfm_api_key

# Security & Performance
CRON_SECRET=your_secure_secret
UPSTASH_REDIS_REST_URL=your_redis_url (optional)
UPSTASH_REDIS_REST_TOKEN=your_redis_token (optional)

# Development
NEXT_PUBLIC_APP_URL=http://localhost:3001
NODE_ENV=development
```

### API Keys Setup

#### Spotify API
1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Create a new app
3. Add redirect URI: `http://localhost:3001/auth/callback/spotify`
4. Copy Client ID and Client Secret

#### Ticketmaster API
1. Go to [Ticketmaster Developer Portal](https://developer.ticketmaster.com/)
2. Create account and request API key
3. Copy Consumer Key as `TICKETMASTER_API_KEY`

#### Setlist.fm API
1. Go to [Setlist.fm API](https://api.setlist.fm/)
2. Register for API access
3. Copy API key

## Core Development Patterns

### Server Components (Default)
```typescript
// app/artists/[slug]/page.tsx
export default async function ArtistPage({ 
  params 
}: { 
  params: { slug: string } 
}) {
  // Server-side data fetching
  const artist = await getArtist(params.slug);
  
  if (!artist) {
    notFound();
  }
  
  return (
    <div>
      <ArtistHeader artist={artist} />
      <ArtistContent artist={artist} />
    </div>
  );
}
```

### Client Components (Interactive)
```typescript
// components/artist/import-progress.tsx
'use client'
import { useImportProgress } from '~/hooks/use-import-progress';

export function ImportProgress({ jobId }: { jobId: string }) {
  const { progress, stage, message } = useImportProgress(jobId);
  
  return (
    <div className="space-y-2">
      <div className="progress-bar">
        <div 
          className="progress-fill" 
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="text-sm text-muted-foreground">
        {message}
      </p>
    </div>
  );
}
```

### API Routes with SSE
```typescript
// app/api/artists/import/progress/[jobId]/route.ts
export async function GET(
  request: Request,
  { params }: { params: { jobId: string } }
) {
  const { jobId } = params;
  
  return new Response(
    new ReadableStream({
      start(controller) {
        const subscription = supabase
          .channel(`import_progress_${jobId}`)
          .on('postgres_changes', {
            event: 'UPDATE',
            schema: 'public',
            table: 'import_status',
            filter: `job_id=eq.${jobId}`
          }, (payload) => {
            const data = `data: ${JSON.stringify(payload.new)}\n\n`;
            controller.enqueue(new TextEncoder().encode(data));
          })
          .subscribe();
      }
    }),
    {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      }
    }
  );
}
```

### Database Queries with Drizzle
```typescript
// lib/queries/artists.ts
import { db } from '@repo/database';
import { artists, shows, artistSongs, songs } from '@repo/database/schema';
import { eq, sql } from 'drizzle-orm';

export async function getArtistWithStats(slug: string) {
  return await db
    .select({
      artist: artists,
      showCount: sql<number>`COUNT(DISTINCT ${shows.id})`,
      songCount: sql<number>`COUNT(DISTINCT ${songs.id})`
    })
    .from(artists)
    .leftJoin(shows, eq(shows.headlinerArtistId, artists.id))
    .leftJoin(artistSongs, eq(artistSongs.artistId, artists.id))
    .leftJoin(songs, eq(songs.id, artistSongs.songId))
    .where(eq(artists.slug, slug))
    .groupBy(artists.id)
    .limit(1);
}
```

## Testing Strategy

### Unit Testing with Vitest
```typescript
// __tests__/artist-import.test.ts
import { describe, it, expect, vi } from 'vitest';
import { ArtistImportOrchestrator } from '~/lib/services/artist-import-orchestrator';

describe('ArtistImportOrchestrator', () => {
  it('should complete Phase 1 in under 3 seconds', async () => {
    const orchestrator = new ArtistImportOrchestrator();
    const startTime = Date.now();
    
    const result = await orchestrator.processPhase1('test-tm-id');
    const duration = Date.now() - startTime;
    
    expect(duration).toBeLessThan(3000);
    expect(result.artistId).toBeDefined();
    expect(result.slug).toBeDefined();
  });
});
```

### E2E Testing with Playwright
```typescript
// tests/artist-import.spec.ts
import { test, expect } from '@playwright/test';

test('artist import flow', async ({ page }) => {
  await page.goto('/');
  
  // Search for artist
  await page.fill('[data-testid="search-input"]', 'radiohead');
  await page.click('[data-testid="search-result-0"]');
  
  // Should see import progress
  await expect(page.locator('[data-testid="import-progress"]')).toBeVisible();
  
  // Should navigate to artist page
  await expect(page).toHaveURL(/\/artists\/radiohead/);
  
  // Should see artist data progressively load
  await expect(page.locator('[data-testid="artist-name"]')).toBeVisible();
  await expect(page.locator('[data-testid="shows-section"]')).toBeVisible();
});
```

## Performance Guidelines

### Bundle Optimization
```typescript
// Use dynamic imports for non-critical components
const LazyComponent = dynamic(() => import('./heavy-component'), {
  loading: () => <Skeleton />,
  ssr: false // If client-only
});

// Lazy load icons
const LazyIcon = dynamic(() => 
  import('lucide-react').then(mod => ({ default: mod.Calendar }))
);
```

### Caching Strategy
```typescript
// lib/cache.ts
export const getCachedData = async (key: string) => {
  // Try Redis first
  try {
    const cached = await redis.get(key);
    if (cached) return JSON.parse(cached);
  } catch {
    // Fall back to memory cache
    return memoryCache.get(key);
  }
};
```

### Image Optimization
```typescript
// Use Next.js Image with optimization
import Image from 'next/image';

<Image
  src={artist.imageUrl}
  alt={artist.name}
  width={400}
  height={400}
  placeholder="blur"
  blurDataURL="data:image/jpeg;base64,..."
  quality={85}
  sizes="(max-width: 768px) 100vw, 400px"
/>
```

## Code Quality Standards

### TypeScript Configuration
- Strict mode enabled
- No implicit any
- Import type only when needed
- Comprehensive error handling

### Component Patterns
```typescript
// Proper component typing
interface ArtistCardProps {
  artist: {
    id: string;
    name: string;
    imageUrl?: string;
  };
  onImport?: (artistId: string) => void;
}

export function ArtistCard({ artist, onImport }: ArtistCardProps) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      {/* Component implementation */}
    </Card>
  );
}
```

### Error Handling
```typescript
// Comprehensive error handling
try {
  const result = await orchestrator.importArtist(tmAttractionId);
  return { success: true, data: result };
} catch (error) {
  if (error instanceof ImportError) {
    return { 
      success: false, 
      error: error.message,
      stage: error.stage 
    };
  }
  
  // Log unexpected errors
  console.error('Unexpected import error:', error);
  return { 
    success: false, 
    error: 'An unexpected error occurred' 
  };
}
```

## Debugging

### Common Issues

**Database Connection Issues**
```bash
# Check database connection
pnpm db:studio
# Should open Drizzle Studio at http://localhost:4983
```

**Import System Not Working**
```bash
# Check SSE endpoint
curl -N "http://localhost:3001/api/artists/import/progress/test-job-id"
# Should return text/event-stream
```

**Cache Issues**
```bash
# Check Redis connection (if configured)
redis-cli ping
# Or check memory cache fallback in logs
```

### Development Tools
- **Drizzle Studio**: Database GUI at http://localhost:4983
- **Next.js DevTools**: Bundle analysis and performance
- **Browser DevTools**: Network tab for SSE streams
- **Supabase Dashboard**: Real-time subscriptions and logs

## Best Practices

### Performance
- Use Server Components by default
- Add 'use client' only when needed
- Implement proper loading states
- Optimize images and fonts
- Cache expensive operations

### User Experience  
- Progressive loading for better perceived performance
- Real-time feedback during long operations
- Graceful error handling with recovery options
- Mobile-first responsive design

### Security
- Validate all inputs
- Use environment variables for secrets
- Implement proper CORS policies
- Enable Row Level Security in Supabase
- Rate limit API endpoints

### Code Organization
- Keep components small and focused
- Use custom hooks for logic
- Organize by feature, not by type
- Write comprehensive tests
- Document complex algorithms

This guide provides everything needed to develop efficiently with TheSet's modern architecture and performance-optimized systems.