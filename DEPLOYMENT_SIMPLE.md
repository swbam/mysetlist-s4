# 🚀 TheSet Deployment Guide

## Quick Start

Deploy everything with one command:

```bash
pnpm deploy
```

That's it! This command handles everything:
- Database migrations
- Type generation  
- Building the app
- Git operations
- Vercel deployment
- Supabase functions
- Cron jobs setup

## What It Does

The `pnpm deploy` command automatically:

1. **Validates** your environment
2. **Updates** database schema
3. **Generates** TypeScript types
4. **Builds** the application
5. **Deploys** Supabase functions
6. **Commits** all changes
7. **Pushes** to GitHub
8. **Deploys** to Vercel

## Prerequisites

Before running `pnpm deploy`, ensure you have:

- ✅ Node.js 18+
- ✅ pnpm installed
- ✅ Git configured
- ✅ Vercel CLI (`npm i -g vercel`)
- ✅ Supabase CLI (`npm i -g supabase`)
- ✅ `.env.local` with all required keys

## First Time Setup

```bash
# 1. Install dependencies
pnpm install

# 2. Login to services
vercel login
supabase login

# 3. Link Vercel project
vercel

# 4. Deploy!
pnpm deploy
```

## Environment Variables

Required in `.env.local`:

```env
# Database
DATABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_key

# APIs
SPOTIFY_CLIENT_ID=your_spotify_id
SPOTIFY_CLIENT_SECRET=your_spotify_secret
TICKETMASTER_API_KEY=your_ticketmaster_key
SETLISTFM_API_KEY=your_setlistfm_key
```

## Other Commands

```bash
# Development
pnpm dev          # Start dev server

# Database
pnpm db:studio    # Open database GUI
pnpm db:seed      # Add sample data

# Data Sync
pnpm sync:artists # Sync artist data

# Deploy Options
pnpm deploy:preview  # Preview deployment
pnpm deploy:prod     # Production (Vercel only)
```

## Troubleshooting

### Build Fails?
```bash
pnpm clean
pnpm install
pnpm build
```

### Database Issues?
```bash
pnpm db:push
pnpm db:studio  # Check schema
```

### Vercel Issues?
```bash
vercel login
vercel --prod
```

## Support

For detailed documentation, see `/scripts/README.md`

---

**Remember:** The `pnpm deploy` command is all you need for a complete deployment! 🎉