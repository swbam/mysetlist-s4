# MySetlist Concert Setlist App - Project Overview & Architecture

## Table of Contents
1. [Project Overview](#project-overview)
2. [Next-Forge Foundation](#next-forge-foundation)
3. [Technology Stack](#technology-stack)
4. [Application Architecture](#application-architecture)
5. [Feature Set Overview](#feature-set-overview)
6. [Development Phases](#development-phases)
7. [Team Handoff Strategy](#team-handoff-strategy)

## Project Overview

MySetlist is a comprehensive concert setlist platform that allows users to discover, track, and share live music experiences. Built on the Next-Forge starter template, it leverages modern web technologies to create a seamless experience for music fans to explore concert history and vote on setlists.

### Core Vision
- **Discover**: Find upcoming shows, venues, and artist histories from real setlist.fm setlists.
- **Track**: Follow favorite artists and get notified of new shows
- **Share**: Artists can share show links on social media to promote voting on the setlist 
- **Vote**: Add songs to a setlist from the dropdown on each show page. Vote on songs already on the list 

### Target Users
- **Music Fans**: Discover new shows and track favorite artists
- **Concert Goers**: Contribute and verify setlist information
- **Industry Professionals**: Access comprehensive show data
- **Venue Operators**: Manage venue information and show listings

## Next-Forge Foundation

### Why Next-Forge
Next-Forge provides a production-ready foundation with enterprise-grade patterns:

```
next-forge structure:
├── apps/
│   └── web/                 # Main Next.js application
├── packages/
│   ├── auth/               # Authentication package
│   ├── database/           # Database package (Drizzle + Supabase)
│   ├── email/              # Email package (Resend)
│   ├── ui/                 # Shared UI components
│   └── utils/              # Shared utilities
├── tooling/
│   ├── eslint/             # ESLint configuration
│   ├── prettier/           # Prettier configuration
│   └── typescript/         # TypeScript configuration
└── infrastructure/         # Deployment configurations
```

### Key Benefits
- **Monorepo Structure**: Organized codebase with shared packages
- **Type Safety**: End-to-end TypeScript with strict configurations
- **Authentication Ready**: Built-in auth patterns with multiple providers
- **Database Integration**: Drizzle ORM with migration support
- **Component Library**: Shadcn/ui components pre-configured
- **Deployment Ready**: Vercel-optimized with CI/CD

## Technology Stack

### Core Framework (from Next-Forge)
- **Next.js 14**: App Router with Server Components
- **React 18**: Latest React features and patterns
- **TypeScript**: Strict type checking throughout
- **Tailwind CSS**: Utility-first styling
- **Shadcn/ui**: Component library foundation

### Database & Backend
- **Supabase**: PostgreSQL database with real-time features
- **Drizzle ORM**: Type-safe database queries
- **Row Level Security**: Built-in data protection
- **PostGIS**: Location-based queries for venues

### Authentication (Modified from Next-Forge)
- **Supabase Auth**: Replace Next-Forge auth with Supabase
- **Spotify OAuth**: Music streaming integration
- **Email/Password**: Traditional authentication
- **Social Logins**: Google, Apple integration via Supabase

### External APIs
- **Spotify API**: Artist data and music information
- **Ticketmaster API**: Venue and show information
- **Setlist.fm API**: Historical setlist data
# Database
DATABASE_URL="postgresql://postgres.yzwkimtdaabyjbpykquu:Bambseth1590@aws-0-us-east-1.pooler.supabase.com:6543/postgres"

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://yzwkimtdaabyjbpykquu.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6d2tpbXRkYWFieWpicHlrcXV1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA2OTIzMTYsImV4cCI6MjA2NjI2ODMxNn0.8pKUt_PL7q9XmNACDKVrkyqBfK8jmUDx6ARNybrmIVM
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6d2tpbXRkYWFieWpicHlrcXV1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDY5MjMxNiwiZXhwIjoyMDY2MjY4MzE2fQ.ZMorLC_eZke3bvBAF0zyzqUONxpomfTN2RpE_mLjz18
SUPABASE_JWT_SECRET=8yUxq3AqzLiPV9mdG5jZk38ZonG5nXVUVgq6zlQKCKHcdLcee3Ssg62/8cATrxBC2uvBqFXAIQUjHLMz3Q45rg==

# External APIs
SPOTIFY_CLIENT_ID=2946864dc822469b9c672292ead45f43
SPOTIFY_CLIENT_SECRET=feaf0fc901124b839b11e02f97d18a8d
TICKETMASTER_API_KEY=k8GrSAkbFaN0w7qDxGl7ohr8LwdAQm9b
SETLISTFM_API_KEY=xkutflW-aRy_Df9rF4OkJyCsHBYN88V37EBL

# Cron Secret
CRON_SECRET=6155002300

# Application URLs
NEXT_PUBLIC_URL=http://localhost:3001
NEXT_PUBLIC_APP_URL=http://localhost:3001
NEXT_PUBLIC_WEB_URL=http://localhost:3001
NEXT_PUBLIC_APP_ENV=development


### Deployment & Infrastructure
- **Vercel**: Frontend hosting and serverless functions
- **Supabase**: Database and authentication hosting
- **Upstash**: Redis for caching and rate limiting
- **Resend**: Email delivery service

## Application Architecture

### Monorepo Structure (Modified Next-Forge)

```
MySetlist-nextfor/
├── apps/
│   └── web/                           # Main Next.js application
│       ├── app/                       # App Router structure
│       │   ├── (auth)/               # Authentication routes
│       │   ├── profile/              # User profile
│       │   ├── artists/              # Artist pages
│       │   ├── shows/                # Show pages
│       │   ├── venues/               # Venue pages
│       │   ├── setlists/             # Setlist pages
│       │   └── api/                  # API routes
│       ├── components/               # App-specific components
│       ├── hooks/                    # Custom React hooks
│       └── lib/                      # App utilities
├── packages/
│   ├── auth/                         # Supabase authentication
│   ├── database/                     # Drizzle + Supabase schemas
│   ├── email/                        # Email templates and sending
│   ├── external-apis/                # Third-party API integrations
│   ├── ui/                           # Shared UI components
│   └── utils/                        # Shared utilities
└── tooling/                          # Development tools
```

### Data Flow Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Next.js App Router                        │
├─────────────────────────────────────────────────────────────┤
│  Route Handlers    │  Server Components  │  Client Components│
│  ├── API Routes   │  ├── Show Pages     │  ├── Interactive  │
│  ├── Webhooks     │  ├── Artist Pages   │  │   Forms        │
│  └── Auth         │  └── Search Results │  └── Vote System  │
├─────────────────────────────────────────────────────────────┤
│                    Shared Packages                           │
│  ├── @repo/auth   ├── @repo/database   ├── @repo/ui         │
│  ├── @repo/email  └── @repo/external-apis                   │
├─────────────────────────────────────────────────────────────┤
│  Supabase          │  External APIs     │  Services         │
│  ├── PostgreSQL   │  ├── Spotify       │  ├── Vercel       │
│  ├── Auth         │  ├── Ticketmaster  │  ├── Upstash      │
│  └── Real-time    │  └── Setlist.fm    │  └── Resend       │
└─────────────────────────────────────────────────────────────┘
```

## Feature Set Overview

### Core Features
1. **User Management**
   - Supabase authentication with Spotify integration
   - Basic user accounts and following system for artists

2. **Artist Discovery**
   - Comprehensive artist profiles with Spotify integration
   - Show history and upcoming events
   - Real-time follower counts and updates

3. **Show & Venue Management**
   - Detailed show information with setlists
   - Venue profiles with location information
   - Historical show data and statistics

4. **Setlist System**
   - User-driven setlist creation
   - Voting system for accuracy verification
   - Song metadata integration

5. **Search & Discovery**
   - Search for artists, click an artist then see all their upcoming shows on their artist page
   - Venue discovery and search functionality
   - Trending shows on homepage using sync system and cron jobs

### Advanced Features
- **Real-time Updates**: Live setlist updates during shows
- **Email Notifications**: Artist and show notifications
- **Mobile Responsive**: Optimized for mobile devices

## Development Phases

### Phase 1: Foundation Setup (Week 1-2)
- Set up Next-Forge monorepo structure
- Configure Supabase database and authentication
- Implement core database schema with Drizzle
- Set up basic UI components and layouts

### Phase 2: Core Features (Week 3-6)
- User authentication and profile management
- Artist and venue CRUD operations
- Basic search functionality
- Show and setlist management

### Phase 3: Advanced Features (Week 7-10)
- External API integrations (Spotify, Ticketmaster)
- Real-time updates and notifications
- Advanced search and filtering
- Mobile responsiveness

### Phase 4: Polish & Deploy (Week 11-12)
- Performance optimization
- Security hardening
- Testing and quality assurance
- Production deployment and monitoring

## Team Handoff Strategy

### Developer Onboarding
1. **Repository Setup**
   - Clone next-forge template
   - Configure environment variables
   - Set up local development environment

2. **Architecture Understanding**
   - Review monorepo structure and packages
   - Understand data flow and API patterns
   - Familiarize with component library

3. **Development Workflow**
   - Feature branch development
   - Package-based development approach
   - Testing and quality assurance processes

### Key Implementation Notes
- **Start with Next-Forge**: Use the existing structure as foundation
- **Supabase Integration**: Replace default auth with Supabase Auth
- **Package Isolation**: Keep features modular using the package system
- **Type Safety**: Maintain strict TypeScript throughout
- **Performance First**: Optimize for speed and user experience



This overview provides the foundation for building MySetlist using Next-Forge. The following documentation files will detail specific implementation aspects including database schema, component architecture, API integrations, and deployment strategies.