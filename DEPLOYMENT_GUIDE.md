# TheSet - Complete Deployment Guide

## 🚀 Quick Deployment

For fastest deployment, use the automated script:

```bash
pnpm deploy
```

This command handles everything automatically:
- Database migrations and type generation
- Application build and optimization  
- Supabase Edge Functions deployment
- Git operations and Vercel deployment
- Environment validation

## 📋 Prerequisites

Before deploying, ensure you have:

- ✅ Node.js 18+ and pnpm installed
- ✅ Git configured with your credentials
- ✅ Vercel CLI (`npm i -g vercel`)
- ✅ Supabase CLI (`npm i -g supabase`)
- ✅ All required environment variables configured

## 🔐 Environment Variables

### Required for Production

```bash
# Application URLs
NEXT_PUBLIC_URL=https://your-domain.vercel.app
NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app
NEXT_PUBLIC_WEB_URL=https://your-domain.vercel.app
NEXT_PUBLIC_API_URL=https://your-domain.vercel.app/api

# Database
DATABASE_URL=postgresql://postgres.yzwkimtdaabyjbpykquu:${PASSWORD}@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1
DIRECT_URL=postgresql://postgres.yzwkimtdaabyjbpykquu:${PASSWORD}@aws-0-us-east-1.pooler.supabase.com:5432/postgres

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://yzwkimtdaabyjbpykquu.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# External APIs
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
TICKETMASTER_API_KEY=your_ticketmaster_api_key
SETLISTFM_API_KEY=your_setlistfm_api_key

# Security
NEXTAUTH_SECRET=your_nextauth_secret
CRON_SECRET=your_cron_secret

# Environment
NODE_ENV=production
NEXT_PUBLIC_APP_ENV=production
```

## 🎯 Deployment Methods

### Method 1: Automated Deployment (Recommended)

```bash
# First time setup
pnpm install
vercel login
supabase login
vercel link  # Link to your Vercel project

# Deploy everything
pnpm deploy
```

### Method 2: Vercel Dashboard Deployment

1. Go to [Vercel Dashboard](https://vercel.com/new)
2. Import Git Repository: `https://github.com/your-username/your-repo`
3. Configure project settings:
   - **Framework Preset**: Next.js
   - **Root Directory**: `./`
   - **Build Command**: `pnpm build`
   - **Output Directory**: `apps/web/.next`
   - **Install Command**: `pnpm install --frozen-lockfile`
4. Add all environment variables from the list above
5. Click "Deploy"

### Method 3: Vercel CLI Deployment

```bash
# Install and login
npm i -g vercel
vercel login

# Link project (first time only)
vercel link

# Deploy to production
vercel --prod
```

## 🏗️ Post-Deployment Setup

### 1. Configure Supabase

In your Supabase Dashboard:

1. **Authentication → URL Configuration**:
   - Site URL: `https://your-domain.vercel.app`
   - Redirect URLs:
     - `https://your-domain.vercel.app/*`
     - `https://your-domain.vercel.app/auth/callback`
     - `https://your-domain.vercel.app/auth/callback/spotify`

2. **Database Migrations**:
   ```bash
   # Apply all migrations
   supabase db push
   
   # Verify cron jobs are active
   supabase sql --file ./check-cron-jobs.sql
   ```

### 2. Initialize Data

Trigger initial data sync:

```bash
# Sync trending artists
curl -X POST "https://your-domain.vercel.app/api/cron/trending-artist-sync" \
  -H "Authorization: Bearer ${CRON_SECRET}" \
  -H "Content-Type: application/json" \
  -d '{"limit": 50}'

# Import some popular artists
curl -X POST "https://your-domain.vercel.app/api/cron/update-active-artists" \
  -H "Authorization: Bearer ${CRON_SECRET}" \
  -H "Content-Type: application/json" \
  -d '{"limit": 20, "forceSync": true}'
```

### 3. Verify Deployment

Test these endpoints to ensure everything works:

```bash
# Health check
curl https://your-domain.vercel.app/api/health

# Search functionality
curl "https://your-domain.vercel.app/api/artists/search?q=radiohead"

# Artist import (should return SSE stream)
curl -N "https://your-domain.vercel.app/api/artists/import/progress/test-id"
```

## 🎯 Key Features to Test

### Modern Import System

1. **Search for an Artist**: Search for "Radiohead" or "Taylor Swift"
2. **Click Artist**: Should trigger ArtistImportOrchestrator
3. **Watch Progress**: Real-time SSE progress updates
4. **Artist Page Load**: Should load instantly with basic data
5. **Background Sync**: Shows and songs appear progressively

### Real-time Features

- ✅ Live import progress via Server-Sent Events
- ✅ Real-time voting updates
- ✅ Trending content updates
- ✅ User activity feeds

## 📊 Performance Targets

Your deployment should meet these benchmarks:

### Core Web Vitals
- **LCP (Largest Contentful Paint)**: < 2.5s
- **FID (First Input Delay)**: < 100ms  
- **CLS (Cumulative Layout Shift)**: < 0.1

### Bundle Sizes (After Optimization)
- **Homepage**: < 350kB ✅
- **Artist Pages**: < 400kB ✅
- **Show Pages**: < 450kB ✅

### API Performance
- **Search Response**: < 300ms
- **Artist Import (Phase 1)**: < 3s
- **Import Progress**: Real-time via SSE

## 🔧 Troubleshooting

### Common Issues

**Build Fails?**
```bash
# Clean and rebuild
pnpm clean
pnpm install
pnpm build
```

**Database Connection Issues?**
```bash
# Check database connection
pnpm db:push
pnpm db:studio  # Should open Drizzle Studio
```

**Import System Not Working?**
- Verify all API keys are set correctly
- Check Supabase Edge Functions are deployed
- Ensure cron jobs are active in Supabase

**No Search Results?**
- Run initial data sync (see step 2 above)
- Check Spotify and Ticketmaster API credentials
- Verify database has data via Drizzle Studio

### Performance Issues

**Slow Page Loads?**
- Check bundle sizes with `pnpm analyze:web`
- Verify CDN caching is working
- Check Core Web Vitals in Lighthouse

**Import Progress Slow?**
- API rate limiting is working correctly (this is expected)
- Background sync continues even if user navigates away
- Check Redis cache is connected for better performance

## 🎉 Production Checklist

- [ ] **Environment**: All variables set in Vercel
- [ ] **Database**: Supabase configured with correct URLs
- [ ] **Authentication**: Redirect URLs configured
- [ ] **APIs**: All external API keys working
- [ ] **Performance**: Bundle sizes under targets
- [ ] **Functionality**: Search and import working
- [ ] **Real-time**: SSE progress tracking active
- [ ] **Cron Jobs**: Background sync jobs running
- [ ] **Security**: CRON_SECRET and auth configured
- [ ] **Monitoring**: Error tracking enabled

## 🚨 Security Notes

- All API routes require authentication for mutations
- Cron endpoints protected by bearer token (`CRON_SECRET`)
- Row Level Security (RLS) enabled on all Supabase tables
- CSP headers configured for XSS protection
- Rate limiting enabled on all external API calls

## 📞 Support

### Monitoring & Logs

- **Vercel Dashboard**: Function logs and performance metrics
- **Supabase Dashboard**: Database activity and auth logs  
- **Real-time Status**: `/api/health` endpoint
- **Import Progress**: Check individual artist import status

### Getting Help

- **GitHub Issues**: For bug reports and feature requests
- **Vercel Logs**: Check function execution logs
- **Supabase Logs**: Monitor database and auth activity
- **Browser Console**: Client-side error debugging

---

## 🌟 What Makes This Deployment Special

This deployment includes a **production-grade artist import system** that rivals major music platforms:

### Revolutionary Import Experience
- ⚡ **Instant Navigation**: Artist pages load in < 3 seconds
- 📊 **Real-time Progress**: Live SSE updates during background sync
- 🔄 **Non-blocking Operations**: Users can navigate while import continues
- 🎯 **Smart Caching**: Multi-layer caching with automatic failover
- 🚀 **Scalable Architecture**: Handles high-volume concurrent imports

### Advanced Performance Features
- 📦 **Optimized Bundles**: Dynamic imports and code splitting
- 🎭 **Progressive Loading**: Content streams in as it becomes available
- 💾 **Intelligent Caching**: Redis + memory cache with pattern invalidation
- ⚡ **Edge Optimization**: Vercel Edge Functions for global performance

**Your deployment is ready for production scale!** 🎉