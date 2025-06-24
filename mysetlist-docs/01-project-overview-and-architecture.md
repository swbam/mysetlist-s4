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

MySetlist is a comprehensive concert setlist platform that allows users to discover, track, and share live music experiences. Built on the Next-Forge starter template, it leverages modern web technologies to create a seamless experience for music fans to explore concert history, vote on setlists, and connect with the live music community.

### Core Vision
- **Discover**: Find upcoming shows, venues, and artist histories
- **Track**: Follow favorite artists and get notified of new shows
- **Share**: Contribute setlists and vote on accuracy
- **Connect**: Build a community around live music experiences

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
- **Spotify API**: Artist data, popularity metrics
- **Ticketmaster API**: Venue and show information
- **Setlist.fm API**: Historical setlist data
- **Mapbox**: Location services and venue mapping

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
│       │   ├── (dashboard)/          # User dashboard
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
   - User profiles with music preferences
   - Following system for artists and users

2. **Artist Discovery**
   - Comprehensive artist profiles with Spotify integration
   - Show history and upcoming events
   - Real-time popularity metrics

3. **Show & Venue Management**
   - Detailed show information with setlists
   - Venue profiles with location mapping
   - Historical show data and statistics

4. **Setlist System**
   - Community-driven setlist creation
   - Voting system for accuracy verification
   - Song metadata integration

5. **Search & Discovery**
   - Full-text search across artists, shows, venues
   - Location-based venue discovery
   - Trending and recommendation systems

### Advanced Features
- **Real-time Updates**: Live setlist updates during shows
- **Analytics Dashboard**: User engagement and platform metrics
- **Mobile PWA**: Offline-capable mobile experience
- **Social Features**: Comments, sharing, user interactions

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
- Mobile responsiveness and PWA features

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

### Success Metrics
- **User Engagement**: Active users, session duration
- **Content Quality**: Setlist accuracy, user contributions
- **Performance**: Page load times, search response times
- **Growth**: User acquisition, content creation rates

This overview provides the foundation for building MySetlist using Next-Forge. The following documentation files will detail specific implementation aspects including database schema, component architecture, API integrations, and deployment strategies.