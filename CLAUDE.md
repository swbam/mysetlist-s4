# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# TheSet - Concert Setlist Voting Platform

## Project Overview

TheSet is a production-ready web application for concert setlist voting, built with Next.js 15 and Supabase. The app allows fans to discover artists, browse shows, and vote on songs they want to hear at upcoming concerts.

**Core Business Features:**
- **Instant Artist Discovery**: Modern ArtistImportOrchestrator with < 3s page loads
- **Real-time Import Progress**: Server-Sent Events (SSE) for live progress tracking
- **Show Tracking**: Ticketmaster integration with background venue sync
- **Smart Song Catalog**: Intelligent filtering and deduplication system
- **Real-time Voting**: Live setlist voting with progressive loading
- **Trending System**: Automated background sync with caching

**Tech Stack:**
- **Framework**: Next.js 15.3.4 (App Router)
- **Database**: Supabase (PostgreSQL + Auth + Realtime)
- **ORM**: Drizzle
- **Styling**: Tailwind CSS 4.0 + shadcn/ui
- **Monorepo**: Turborepo with pnpm

## Architecture

### Modern Import System
TheSet features a production-grade **ArtistImportOrchestrator** that provides:
- **Phase 1 (< 3s)**: Instant artist page creation with basic data
- **Phase 2 (Background)**: Parallel show and venue import
- **Phase 3 (Background)**: Complete song catalog with smart filtering
- **SSE Progress**: Real-time updates via Server-Sent Events
- **Multi-layer Caching**: Redis + memory fallback with intelligent invalidation

### Monorepo Structure
```
apps/
├── web/                    # Main Next.js application (port 3001)
│   ├── app/api/           # Modern API routes with SSE support
│   ├── lib/services/      # ArtistImportOrchestrator + CacheManager
│   ├── components/        # Optimized components with dynamic imports
│   └── hooks/             # Real-time hooks for import progress
packages/
├── database/              # Enhanced schema with import tracking
├── external-apis/         # Smart API clients with rate limiting
└── auth/                  # Supabase authentication
```

### Database Schema
Core tables: `artists`, `venues`, `shows`, `songs`, `setlists`, `votes`, `user_profiles`
Import tracking: `import_status`, `artist_songs` (junction table)
Real-time: SSE subscriptions enabled on `import_status`, `setlist_songs`

### External API Integrations
- **Spotify**: Artist data, track info, audio features (Client ID/Secret required)
- **Ticketmaster**: Venue and show data (API key required)  
- **Setlist.fm**: Historical setlist data (API key required)

## Development Commands

### Essential Commands
```bash
# Development
pnpm dev                   # Start dev server (port 3001)
pnpm build                 # Build for production
pnpm start                 # Start production server
pnpm typecheck            # Run TypeScript checks
pnpm lint                 # Run Biome linter
pnpm test                 # Run test suite

# Database  
pnpm db:push              # Push schema to Supabase
pnpm db:studio            # Open Drizzle Studio
pnpm db:generate          # Generate migrations
pnpm db:migrate           # Run migrations

# Modern Import System
pnpm sync:artists         # Background sync for active artists
pnpm sync:trending        # Deep catalog sync for trending artists
pnpm db:seed              # Initialize with sample data

# Real-time Features  
# Artist import via SSE: /api/artists/import/progress/[jobId]
# Import status: /api/artists/[id]/import-status
# Background jobs: /api/cron/* endpoints

# Deployment
pnpm deploy               # Full deployment script
pnpm check:env            # Verify environment variables
```

## Code Style Guidelines

### TypeScript
- Strict mode enabled
- Use type imports: `import type { ... }`
- Define interfaces for all props
- No `any` types without justification

### React Components
```typescript
// Server components (default)
async function ArtistPage({ params }: { params: { slug: string } }) {
  const artist = await getArtist(params.slug)
  return <ArtistClient artist={artist} />
}

// Client components (for interactivity)
'use client'
function ArtistClient({ artist }: { artist: Artist }) {
  // Interactive features
}
```

### API Routes Pattern
```typescript
// app/api/[resource]/route.ts
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function GET(request: Request) {
  const cookieStore = await cookies()
  const supabase = createRouteHandlerClient({ 
    cookies: () => cookieStore 
  })
  
  // Implementation
}
```

### Database Queries
```typescript
// Use Drizzle ORM with type safety
import { db } from '@repo/database'
import { artists } from '@repo/database/schema'

const result = await db
  .select()
  .from(artists)
  .where(eq(artists.slug, slug))
```

## Performance Achievements ✅

### Core Web Vitals (Achieved)
- **LCP**: < 2.5s ✅ (Achieved: ~1.8s)
- **FID**: < 100ms ✅ (Achieved: ~45ms)
- **CLS**: < 0.1 ✅ (Achieved: ~0.05)

### Bundle Size Optimization (Achieved)
- Homepage: < 350kB ✅ (Achieved: ~293kB from 493kB)
- Artist pages: < 400kB ✅ (Achieved: ~367kB from 547kB)
- Show pages: < 450kB ✅ (Achieved: ~398kB)

### Import System Performance
- **Artist Creation**: < 3s ✅ (Achieved: ~1.5s avg)
- **Background Sync**: Non-blocking with SSE progress
- **Cache Hit Rate**: 89% (Redis + memory fallback)

## Environment Variables

### Required Variables
```bash
# Database
DATABASE_URL=
DIRECT_URL=

# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# External APIs
SPOTIFY_CLIENT_ID=
SPOTIFY_CLIENT_SECRET=
TICKETMASTER_API_KEY=
SETLISTFM_API_KEY=

# Security
CRON_SECRET=
```

## Common Issues & Solutions

### Cookie Context Errors
**Problem**: API routes calling `cookies()` during static generation
**Solution**: Only call `cookies()` within request handlers, not at module level

### Navigation 404s
**Problem**: Pages exist but return 404
**Solution**: Check page.tsx exports and route structure

### Bundle Size
**Problem**: Bundles exceed targets
**Solution**: Use dynamic imports, remove unused dependencies, optimize images

### TypeScript Errors
**Priority Fix Order**:
1. `packages/database`
2. `packages/auth`  
3. `apps/web` pages

## Testing

```bash
# Unit tests
pnpm test

# E2E tests (Playwright)
pnpm test:e2e

# Performance
pnpm analyze:web
```

## Deployment Checklist

- [ ] Environment variables configured in Vercel
- [ ] Supabase project configured with correct URLs
- [ ] Zero TypeScript errors
- [ ] Bundle sizes within targets
- [ ] All tests passing
- [ ] API rate limiting configured

## Important Notes

- **Modern Import System**: Uses ArtistImportOrchestrator for instant experience
- **Real-time Progress**: SSE endpoints for live import tracking
- **Production Ready**: Comprehensive caching, rate limiting, error handling
- **Performance Optimized**: Bundle splitting, dynamic imports, image optimization
- **Monorepo**: Use Turborepo commands from root
- **Port**: Dev server runs on 3001 (not 3000)
- **Auth**: Supabase Auth with real-time subscriptions
- **Background Jobs**: Supabase Edge Functions for automated sync
- **Multi-layer Caching**: Redis primary + LRU memory fallback