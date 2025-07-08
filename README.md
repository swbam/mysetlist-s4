# MySetlist - Concert Setlist Voting Web App 🎵

A comprehensive concert setlist platform that allows users to discover, track, and share live music experiences. Built with Next.js 14, Supabase, and TypeScript.

## Features ✨

### Core Features
- **Artist Discovery** - Search and follow your favorite artists with Spotify integration
- **Show Tracking** - Find upcoming concerts and past shows with Ticketmaster integration
- **Setlist Voting** - Vote on setlist accuracy and contribute to the community
- **Real-time Updates** - Live voting and setlist updates during concerts
- **User Profiles** - Track your concert history and music preferences
- **Mobile Responsive** - Optimized for all device sizes

### Advanced Features
- **Real-time Collaboration** - See other users' votes and comments in real-time
- **Smart Search** - Find artists, venues, and shows with intelligent search
- **Social Features** - Follow artists, comment on shows, share experiences
- **Analytics Dashboard** - Track your concert stats and music taste
- **Email Notifications** - Get notified about new shows and setlist updates

## Tech Stack 🛠

- **Frontend**: Next.js 14, React 18, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, Realtime, Edge Functions)
- **UI Components**: Shadcn/ui, Radix UI
- **External APIs**: Spotify, Ticketmaster, Setlist.fm
- **Deployment**: Vercel (Frontend), Supabase (Backend)
- **Performance**: Fast loading, optimized images, efficient caching

## Getting Started 🚀

### Prerequisites
- Node.js 18+ and pnpm
- Supabase account and project
- API keys for Spotify, Ticketmaster, and Setlist.fm

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/mysetlist-sonnet.git
cd mysetlist-sonnet
```

2. Install dependencies:
```bash
pnpm install
```

3. Set up environment variables:
Create a `.env` file in the root directory with your credentials:
```env
# Database
DATABASE_URL="your_supabase_database_url"

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# External APIs
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
TICKETMASTER_API_KEY=your_ticketmaster_api_key
SETLISTFM_API_KEY=your_setlistfm_api_key

# Cron Secret
CRON_SECRET=your_cron_secret
```

4. Run database migrations:
```bash
pnpm db:push
```

5. Start the development server:
```bash
./run.sh
# or
pnpm --filter=web dev
```

The app will be available at `http://localhost:3000`

## Project Structure 📁

```
mysetlist-sonnet/
├── apps/
│   └── web/                  # Main Next.js application
│       ├── app/             # App Router pages and layouts
│       ├── components/      # React components
│       ├── hooks/          # Custom React hooks
│       └── lib/            # Utilities and helpers
├── packages/
│   ├── auth/               # Supabase authentication
│   ├── database/           # Database schema and queries
│   ├── design-system/      # UI components and styles
│   ├── email/              # Email templates
│   └── external-apis/      # API integrations
├── supabase/
│   └── functions/          # Edge Functions
│       ├── sync-artists/   # Spotify artist sync
│       ├── sync-shows/     # Ticketmaster show sync
│       └── sync-setlists/  # Setlist.fm sync
└── mysetlist-docs/         # Project documentation
```

## Edge Functions 🔧

The app uses Supabase Edge Functions for external API integrations:

- **sync-artists** - Syncs artist data from Spotify
- **sync-shows** - Fetches upcoming shows from Ticketmaster
- **sync-setlists** - Imports setlists from Setlist.fm
- **scheduled-sync** - Runs periodic data syncs

## Key Features Implementation 🎯

### Real-time Voting
- Uses Supabase Realtime subscriptions
- Optimistic UI updates for instant feedback
- Conflict resolution for concurrent votes

### Search System
- Full-text search across artists, venues, and shows
- Integration with external APIs for discovering new content
- Smart caching for performance

### Mobile Experience
- Responsive design for all screen sizes
- Touch-friendly interfaces and interactions
- Fast loading and optimized performance
- Native-like navigation patterns

### Authentication
- Supabase Auth with multiple providers
- Spotify OAuth for music integration
- Email/password authentication
- Protected routes and API endpoints

## Development Commands 📝

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Build for production
pnpm build

# Run tests
pnpm test

# Lint and format
pnpm lint
pnpm format

# Database commands
pnpm db:generate  # Generate migrations
pnpm db:push     # Push schema changes
pnpm db:studio   # Open Drizzle Studio
```

## Deployment 🚀

### Frontend (Vercel)
1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy with automatic CI/CD

### Backend (Supabase)
1. Edge Functions are deployed via Supabase CLI
2. Database migrations are handled through Drizzle
3. Cron jobs are configured in Supabase dashboard

## Contributing 🤝

Contributions are welcome! Please read our contributing guidelines before submitting PRs.

## License 📄

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments 🙏

Built with:
- [Next-Forge](https://github.com/haydenbleasel/next-forge) - Production-ready Next.js template
- [Supabase](https://supabase.com) - Open source Firebase alternative
- [Shadcn/ui](https://ui.shadcn.com) - Beautiful UI components
- [Spotify Web API](https://developer.spotify.com/documentation/web-api)
- [Ticketmaster Discovery API](https://developer.ticketmaster.com)
- [Setlist.fm API](https://api.setlist.fm/docs/1.0/index.html)
