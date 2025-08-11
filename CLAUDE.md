# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# MySetlist - Concert Setlist Voting Platform

## Project Overview

MySetlist is a production-ready web application for concert setlist voting, built with Next.js 15 and Supabase. The app allows fans to discover artists, browse shows, and vote on songs they want to hear at upcoming concerts.

**Core Business Features:**
- Artist discovery with Spotify integration  
- Show tracking with Ticketmaster integration
- Real-time setlist voting system
- Trending content based on user activity
- Social sharing capabilities

**Tech Stack:**
- **Framework**: Next.js 15.3.4 (App Router)
- **Database**: Supabase (PostgreSQL + Auth + Realtime)
- **ORM**: Drizzle
- **Styling**: Tailwind CSS 4.0 + shadcn/ui
- **Monorepo**: Turborepo with pnpm

## Architecture

### Monorepo Structure
```
apps/
├── web/                    # Main Next.js application (port 3001)
│   └── app/
│       ├── api/           # API routes (consolidation target)
│       ├── (home)/        # Homepage and components
│       ├── artists/       # Artist pages
│       ├── shows/         # Show pages  
│       ├── venues/        # Venue pages
│       └── trending/      # Trending page
packages/
├── database/              # Drizzle ORM + Supabase
├── design-system/         # shadcn/ui components
├── external-apis/         # Spotify, Ticketmaster, Setlist.fm integrations
└── auth/                  # Supabase authentication
```

### Database Schema
Core tables: `users`, `artists`, `venues`, `shows`, `songs`, `setlists`, `votes`, `artist_stats`, `user_profiles`

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

# Data Sync
pnpm sync:artists         # Sync trending artists
pnpm sync:popular         # Sync popular artists 
pnpm sync:trending        # Initialize trending data
pnpm db:seed              # Basic seed data

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

## Performance Requirements

### Core Web Vitals
- **LCP**: < 2.5s
- **FID**: < 100ms  
- **CLS**: < 0.1

### Bundle Size Targets
- Homepage: < 350kB
- Artist pages: < 400kB
- Show pages: < 450kB

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

- **Monorepo**: Use Turborepo commands from root
- **Port**: Dev server runs on 3001 (not 3000)
- **Auth**: Supabase Auth only (no Clerk)
- **API Consolidation**: Migrate all routes to `apps/web/app/api`
- **Performance**: ISR for artist/show pages
- **Caching**: Implement for external API calls