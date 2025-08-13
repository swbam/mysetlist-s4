# TheSet - Concert Setlist Voting App

A modern web application for concert-goers to vote on songs they want to hear at upcoming shows. Built with Next.js 15, Supabase, and the next-forge template.

## 🎸 Features

- **Artist Discovery**: Search and browse artists with Spotify integration
- **Concert Listings**: View upcoming and past shows with Ticketmaster data
- **Setlist Voting**: Vote on songs you want to hear at concerts
- **Real-time Updates**: Live voting results, import progress, and trending data via SSE
- **Spotify Integration**: Sign in with Spotify for personalized experience
- **Mobile Responsive**: Optimized for all devices

## 🚀 Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth (Email + Spotify OAuth)
- **Styling**: Tailwind CSS + shadcn/ui
- **Deployment**: Vercel
- **External APIs**: Spotify, Ticketmaster, SetlistFM
- **Monorepo**: Turborepo with pnpm

## 📦 Project Structure

```
apps/
├── web/              # Main Next.js application
├── docs/             # Documentation site
└── api/              # API microservice

packages/
├── ui/               # Shared UI components
├── database/         # Database schema and utilities
├── auth/             # Authentication utilities
├── external-apis/    # External API integrations
└── config/           # Shared configuration
```

## 🛠️ Development Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/theset.git
   cd theset
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your credentials
   ```

4. **Run database migrations**
   ```bash
   pnpm db:push
   ```

5. **Start development server**
   ```bash
   pnpm dev
   ```

   The app will be available at http://localhost:3001

## 🔧 Environment Variables

Required environment variables:

```bash
# Database
DATABASE_URL=
DIRECT_URL=

# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_JWT_SECRET=

# External APIs
SPOTIFY_CLIENT_ID=
SPOTIFY_CLIENT_SECRET=
TICKETMASTER_API_KEY=
SETLISTFM_API_KEY=

# Cron Jobs
CRON_SECRET=
```

See `.env.example` for a complete list.

## 📝 Scripts

- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm start` - Start production server
- `pnpm lint` - Run linting
- `pnpm test` - Run tests
- `pnpm db:push` - Push database schema
- `pnpm db:generate` - Generate database types

## 🚀 Deployment

The app is configured for deployment on Vercel:

1. Connect your GitHub repository to Vercel
2. Configure environment variables in Vercel dashboard
3. Deploy with `git push origin main`

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions.

## 🔄 Data Synchronization

The app uses a modern **ArtistImportOrchestrator** system for intelligent data sync:

### Real-time Import System
- **Phase 1 (< 3 seconds)**: Instant artist page creation with basic data
- **Phase 2 (Background)**: Show and venue import via Ticketmaster API  
- **Phase 3 (Background)**: Complete song catalog sync via Spotify API
- **SSE Progress Tracking**: Real-time progress updates via Server-Sent Events
- **Smart Caching**: Multi-layer caching with Redis and memory fallback

### Automated Background Jobs
- **Active Artists Sync**: Every 6 hours for artists with recent activity
- **Trending Artists Sync**: Daily deep catalog refresh for top 100 artists
- **Weekly Full Sync**: Complete system maintenance and data integrity checks

All cron jobs are managed by Supabase Edge Functions with intelligent rate limiting.

## 🏗️ Architecture

### Modern Import System
- **ArtistImportOrchestrator**: Production-grade background sync system
- **SSE Progress Tracking**: Real-time import progress via Server-Sent Events
- **Multi-phase Processing**: Optimized 3-phase import strategy
- **Intelligent Caching**: Redis + memory fallback with pattern-based invalidation

### Core Infrastructure  
- **ISR (Incremental Static Regeneration)**: Artist pages are statically generated and revalidated
- **Edge Functions**: API routes optimized for edge runtime
- **Database**: Supabase provides PostgreSQL with Row Level Security
- **Caching**: Multi-layer caching (Redis + LRU memory cache)
- **CDN**: Vercel Edge Network for global distribution
- **Bundle Optimization**: Dynamic imports and code splitting (< 350kB homepage)

## 🧪 Testing

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run E2E tests
pnpm test:e2e
```

## 📊 Performance

Target metrics:
- Lighthouse Score: ≥90
- First Contentful Paint: <1.5s
- Time to Interactive: <3s
- Core Web Vitals: All green

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- Built on [next-forge](https://github.com/haydenbleasel/next-forge) template
- Uses [shadcn/ui](https://ui.shadcn.com/) components
- Powered by [Supabase](https://supabase.com/)