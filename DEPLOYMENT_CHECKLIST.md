# MySetlist Deployment Checklist

## 🚀 Pre-Deployment Steps

### 1. Environment Variables (CRITICAL)
- [ ] Run `./scripts/generate-secure-secrets.sh` to generate secure secrets
- [ ] Add ALL required environment variables to Vercel:
  - [ ] `NEXT_PUBLIC_SUPABASE_URL`
  - [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - [ ] `SUPABASE_SERVICE_ROLE_KEY`
  - [ ] `DATABASE_URL`
  - [ ] `NEXTAUTH_SECRET` (CRITICAL - was missing!)
  - [ ] `NEXTAUTH_URL` (set to your Vercel domain)
  - [ ] `SPOTIFY_CLIENT_ID`
  - [ ] `SPOTIFY_CLIENT_SECRET`
  - [ ] `TICKETMASTER_API_KEY`
  - [ ] `SETLISTFM_API_KEY`
  - [ ] `INTERNAL_API_KEY`

### 2. Database Setup
- [ ] Ensure Supabase database has all required tables
- [ ] Run database migrations if needed
- [ ] Verify Row Level Security (RLS) policies are in place
- [ ] Test database connection with the DATABASE_URL

### 3. External API Configuration
- [ ] Verify Spotify App settings:
  - [ ] Add redirect URI: `https://your-domain.vercel.app/api/auth/callback/spotify`
- [ ] Verify Ticketmaster API key is active
- [ ] Verify SetlistFM API key is active

### 4. Vercel Project Settings
- [ ] Set Node.js version to 20.x
- [ ] Configure cron jobs in vercel.json (already done)
- [ ] Set environment variables for Production environment
- [ ] Enable Vercel Analytics (optional)

## 🔧 Fixes Applied

### ✅ Completed Fixes:
1. **Artist Pages 500 Error** - Fixed by removing problematic mbid column query
2. **Search Functionality** - Added proper error handling for missing env vars
3. **Mock Data Replacement** - All mock data replaced with real API calls
4. **API Consolidation** - Verified apps/api removed, everything in apps/web/app/api
5. **Environment Schema** - Updated with all required variables
6. **Vercel Cron Jobs** - Added all 8 missing cron job configurations
7. **Security Enhancements** - Added middleware protection for sensitive routes

### ⚠️ Known Issues:
1. **TypeScript Errors** - Currently ignored in build (set to false for production)
2. **Performance** - May need optimization after deployment
3. **Test Suite** - Tests need updating for Supabase Auth

## 📋 Post-Deployment Verification

### 1. Core Functionality Tests
- [ ] Homepage loads with search bar
- [ ] Search returns real artist results
- [ ] Clicking artist triggers data sync
- [ ] Artist pages display shows and data
- [ ] Shows page displays upcoming events
- [ ] Venues page shows venue information
- [ ] Trending page displays trending content

### 2. Authentication Tests
- [ ] Sign up with email works
- [ ] Sign in works
- [ ] Spotify OAuth works
- [ ] User menu displays correctly
- [ ] Protected routes redirect properly

### 3. Data Sync Verification
- [ ] Cron jobs execute on schedule
- [ ] Artist data syncs from Spotify
- [ ] Show data syncs from Ticketmaster
- [ ] Setlist data syncs from SetlistFM
- [ ] Trending calculations update

### 4. Performance Checks
- [ ] Run Lighthouse audit (target: >90)
- [ ] Check Core Web Vitals
- [ ] Verify image optimization
- [ ] Test page load times

## 🚨 Troubleshooting

### If Search Doesn't Work:
1. Check Vercel logs for environment variable errors
2. Verify all Supabase env vars are set
3. Check API endpoint responses in Network tab

### If Artist Pages Show 500:
1. Check Vercel Function logs
2. Verify database schema matches code
3. Check for missing environment variables

### If Data Doesn't Sync:
1. Verify cron jobs are running (check Vercel logs)
2. Check external API keys are valid
3. Verify rate limits aren't exceeded

## 📝 Final Steps

1. **Deploy to Vercel**
   ```bash
   git add .
   git commit -m "Production-ready MySetlist app with all fixes applied"
   git push
   ```

2. **Monitor Initial Deploy**
   - Watch build logs for errors
   - Check function logs after deploy
   - Test all core functionality

3. **Enable Monitoring**
   - Set up Sentry for error tracking
   - Configure analytics (PostHog/Vercel)
   - Set up uptime monitoring

## 🎉 Success Criteria

Your MySetlist app is ready when:
- ✅ All pages load without errors
- ✅ Search returns real artist data
- ✅ Artist/show/venue data displays correctly
- ✅ Authentication works properly
- ✅ Data syncs automatically
- ✅ Performance meets targets (>90 Lighthouse)
- ✅ No 500 errors in production