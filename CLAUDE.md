# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# MySetlist Web App - Claude Code Configuration

## Project Overview

MySetlist is a concert setlist voting platform built on Next-Forge that allows users to discover artists, view shows, and vote on setlists. The application is in the final stages of development but has **critical issues** that must be resolved to achieve production readiness.

**Core Features**:
- Artist discovery with Spotify integration
- Show tracking with Ticketmaster data
- Setlist voting system with real-time updates
- Trending content based on user activity
- Social sharing for artists to promote voting

**Current State**: The app has substantial infrastructure but suffers from performance bottlenecks, incomplete features, and technical debt preventing production deployment.

## 🚨 CRITICAL ISSUES REQUIRING IMMEDIATE FIX

### 1. Cookie Context Errors (BLOCKING)
- **Problem**: API routes calling `cookies()` during static generation
- **Affected**: `/api/analytics/advanced`, `/api/health/comprehensive`, `/api/data-pipeline`, `/api/artists/sync-shows`
- **Fix**: Move Supabase auth calls to request context only

### 2. Navigation & Routing Failures
- **Logo Not Linked**: Logo in header needs Link wrapper to homepage
- **404 Errors**: `/shows` and `/artists` pages returning 404s despite components existing
- **Auth Visibility**: Sign-in/Sign-up only visible in dropdown, needs main nav presence

### 3. Performance Issues
- **Bundle Sizes**: Homepage 493kB (target <350kB), Artist pages 547kB (target <400kB)
- **App Slower**: Navigation lag compared to base Next-Forge starter
- **Service Worker**: Legacy PWA cache causing stale content

### 4. TypeScript Errors
- **Scale**: Hundreds of tsc errors across monorepo
- **Priority**: `packages/database`, `packages/auth`, `apps/web` pages

### 5. API Consolidation Required
- **CRITICAL**: Remove `apps/api` folder entirely
- **Migrate**: All API functionality to `apps/web/app/api`
- **Maintain**: Next-forge patterns in unified structure

## Architecture

### Monorepo Structure (Next-Forge)
```
mysetlist-s4-1/
├── apps/
│   ├── web/                 # Main Next.js application
│   │   └── app/
│   │       ├── api/        # ALL API routes (consolidated here)
│   │       ├── (auth)/     # Authentication pages
│   │       ├── artists/    # Artist pages
│   │       ├── shows/      # Show pages
│   │       ├── venues/     # Venue pages
│   │       └── trending/   # Trending page
│   └── email/              # Email service (React Email)
├── packages/
│   ├── auth/               # Supabase authentication
│   ├── database/           # Drizzle ORM + Supabase
│   ├── design-system/      # shadcn/ui components
│   ├── email/              # Email templates
│   ├── external-apis/      # Spotify, Ticketmaster, Setlist.fm
│   ├── analytics/          # Analytics integration
│   ├── monitoring/         # Error tracking (Sentry)
│   └── utils/              # Shared utilities
├── supabase/               # Supabase functions & migrations
├── scripts/                # Deployment & sync scripts
└── docs/                   # Documentation
```

### Technology Stack
- **Framework**: Next.js 15.3.4 with App Router
- **Database**: Supabase (PostgreSQL + Auth + Realtime)
- **ORM**: Drizzle with type-safe queries
- **Styling**: Tailwind CSS 4.0 + shadcn/ui
- **APIs**: Spotify, Ticketmaster, Setlist.fm
- **Deployment**: Vercel + Supabase

### Database Schema (20+ tables)
- **Core**: users, artists, venues, shows, songs, setlists, votes
- **Features**: artist_stats, email_queue, user_profiles, show_comments
- **Integration**: External IDs for Spotify, Ticketmaster, SetlistFM

## Development Commands

### Essential Commands
```bash
# Development
pnpm dev                    # Start development server (port 3001)
pnpm build                  # Build for production
pnpm typecheck             # Run TypeScript checks
pnpm test                  # Run test suite
pnpm lint                  # Run linter

# Database
pnpm db:push               # Push schema to Supabase
pnpm db:studio             # Open Drizzle Studio
pnpm db:generate           # Generate migrations
pnpm db:migrate            # Run migrations

# Data Sync
pnpm sync:artists          # Sync trending artists
pnpm sync:top              # Sync top artists
pnpm seed                  # Seed database
pnpm seed:comprehensive    # Comprehensive seed data

# Deployment
pnpm final                 # Simple deployment script
pnpm final:full            # Full deployment pipeline
pnpm final:validate        # Validate deployment
pnpm updateit              # Update Supabase functions & pull env

# Testing
pnpm test:e2e              # Run E2E tests
pnpm allofit               # Check env + sync + test

# Environment
pnpm check:env             # Check environment variables
pnpm validate:env          # Validate env configuration
```

### Performance Commands
```bash
pnpm analyze:web           # Bundle analysis
pnpm perf:lighthouse       # Lighthouse audit
pnpm perf:check           # Full performance check
```

## Development Workflow

### 1. Environment Setup
```bash
# Required environment variables (see .env.example)
DATABASE_URL                # Supabase PostgreSQL
NEXT_PUBLIC_SUPABASE_URL   # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
SPOTIFY_CLIENT_ID
SPOTIFY_CLIENT_SECRET
TICKETMASTER_API_KEY
SETLISTFM_API_KEY
CRON_SECRET
```

### 2. Local Development
```bash
# Install dependencies
pnpm install

# Start database
pnpm db:push
pnpm seed:comprehensive

# Start dev server
pnpm dev

# Open http://localhost:3001
```

### 3. Testing Changes
```bash
# Type checking
pnpm typecheck

# Run tests
pnpm test

# Check bundle size
pnpm analyze:web
```

## Sub-Agent Coordination (6 Parallel Agents)

### Agent 1: Navigation & Routing
- **Scope**: Route handlers, middleware, layouts, navigation components
- **Files**: `app/(auth)/*`, `app/layout.tsx`, `components/header/*`
- **Priority**: Fix cookie context errors, 404 pages, navigation crashes

### Agent 2: Database & Sync
- **Scope**: Database models, sync utilities, cron jobs, API consolidation
- **Files**: `packages/database/*`, `app/api/*` (consolidation target)
- **Priority**: Migrate apps/api to apps/web/app/api, fix sync pipeline

### Agent 3: Frontend Data
- **Scope**: API routes, data hooks, state management, server actions
- **Files**: `app/api/*`, `hooks/*`, `lib/api/*`
- **Priority**: Implement trending endpoints, fix data loading

### Agent 4: UI Components
- **Scope**: React components, styling, design system
- **Files**: `components/*`, `packages/design-system/*`
- **Priority**: Homepage search, slider components, responsive design

### Agent 5: Artist/Show Pages
- **Scope**: Page components, data binding, user flows
- **Files**: `app/artists/*`, `app/shows/*`, `app/venues/*`
- **Priority**: Fix data loading, complete artist→show→setlist flow

### Agent 6: Performance
- **Scope**: Config files, optimization, build process
- **Files**: `next.config.js`, `tailwind.config.js`, deployment scripts
- **Priority**: Bundle optimization, sub-second load times

## External API Integration

### Spotify API
- **Purpose**: Artist data, track information, audio features
- **Auth**: Client credentials flow
- **Rate Limit**: 180 requests per minute
- **Key Endpoints**: `/artists`, `/tracks`, `/audio-features`

### Ticketmaster API
- **Purpose**: Venue data, show information, ticket links
- **Auth**: API key
- **Rate Limit**: 5000 requests per day
- **Key Endpoints**: `/events`, `/venues`, `/attractions`

### Setlist.fm API
- **Purpose**: Historical setlist data
- **Auth**: API key
- **Rate Limit**: Generous, but implement caching
- **Key Endpoints**: `/setlists`, `/artists`, `/venues`

## Performance Requirements

### Core Web Vitals Targets
- **LCP**: < 2.5s (Largest Contentful Paint)
- **FID**: < 100ms (First Input Delay)
- **CLS**: < 0.1 (Cumulative Layout Shift)

### Bundle Size Targets
- **Homepage**: < 350 kB
- **Artist Pages**: < 400 kB
- **Show Pages**: < 450 kB
- **Shared Chunks**: < 250 kB

### Lighthouse Scores
- **Performance**: > 90
- **Accessibility**: > 90
- **Best Practices**: > 90
- **SEO**: > 90

## Quality Standards

### TypeScript
- **Strict Mode**: Enabled
- **Zero Errors**: No TypeScript errors in production
- **Type Coverage**: 100% for new code

### Testing
- **Unit Tests**: Vitest for business logic
- **E2E Tests**: Cypress/Playwright for user flows
- **Coverage**: > 80% for critical paths

### Accessibility
- **WCAG 2.1 AA**: Minimum compliance
- **Keyboard Navigation**: Full support
- **Screen Readers**: Proper ARIA labels

## Production Checklist

### Before Deployment
- [ ] Zero TypeScript errors
- [ ] All tests passing
- [ ] Bundle sizes within targets
- [ ] Lighthouse scores > 90
- [ ] Environment variables configured
- [ ] API rate limiting implemented
- [ ] Error tracking (Sentry) configured
- [ ] Analytics configured

### Critical Fixes Required
1. Fix cookie context errors in API routes
2. Resolve navigation 404 issues
3. Complete API consolidation (remove apps/api)
4. Optimize bundle sizes
5. Fix TypeScript errors
6. Implement proper caching

## Important Implementation Notes

### API Route Pattern (After Consolidation)
```typescript
// app/api/artists/[id]/route.ts
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  // Get cookies in request context only
  const cookieStore = await cookies()
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
  
  // Your logic here
}
```

### Data Fetching Pattern
```typescript
// Use server components for initial data
async function ArtistPage({ params }: { params: { id: string } }) {
  const artist = await getArtist(params.id)
  
  return <ArtistClient artist={artist} />
}

// Use client components for interactivity
'use client'
function ArtistClient({ artist }: { artist: Artist }) {
  // Interactive features here
}
```

### Performance Optimization
- Use `dynamic` imports for heavy components
- Implement `React.memo()` for expensive renders
- Use Next.js Image component for all images
- Enable ISR for artist/show pages
- Implement proper caching strategies

## ULTRATHINK Reminders

Before implementing any feature:
1. **Think 1**: Does this follow Next-Forge patterns?
2. **Think 2**: Will this work with the consolidated API structure?
3. **Think 3**: Does this meet performance and quality targets?

Remember: This is a production application requiring world-class quality. No compromises on performance, accessibility, or user experience.