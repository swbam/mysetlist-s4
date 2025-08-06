# MySetlist Production Deployment Checklist

## ✅ Pre-Deployment Verification

### 1. Configuration Status
- ✅ **Cron Jobs**: Configured in Supabase only (not in Vercel)
- ✅ **API Routes**: Consolidated in `apps/web/app/api/`
- ✅ **Vercel Config**: No cron configuration in vercel.json
- ✅ **Build Configuration**: Proper monorepo settings

### 2. Database & Supabase
- ✅ **Migrations Applied**: All SQL migrations including cron setup
- ✅ **Cron Jobs Active**: 
  - `sync-artist-data-hourly`: Every hour
  - `master-sync-daily`: Daily at 2 AM
  - `update-trending-every-30min`: Every 30 minutes
- ✅ **Indexes Created**: Performance indexes on key tables
- ✅ **RLS Policies**: Security policies configured

### 3. Fixed Issues
- ✅ **Voting System**: Only upvoting allowed, toggle behavior
- ✅ **Setlist Generation**: Pulls 5 random real songs from artist catalog
- ✅ **Search Functionality**: Working with real data
- ✅ **Data Sync**: Comprehensive sync for artists, songs, and shows
- ✅ **Mock Data Removed**: All features use real data

## 🚀 Deployment Steps

### Step 1: Verify Vercel CLI
```bash
vercel --version
# If not installed: npm i -g vercel
```

### Step 2: Link to Vercel Project
```bash
vercel link
# Follow prompts to link to your Vercel project
```

### Step 3: Set Environment Variables on Vercel
```bash
# Required variables (set in Vercel Dashboard or CLI):
vercel env add DATABASE_URL production
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
vercel env add SUPABASE_SERVICE_ROLE_KEY production
vercel env add SPOTIFY_CLIENT_ID production
vercel env add SPOTIFY_CLIENT_SECRET production
vercel env add TICKETMASTER_API_KEY production
vercel env add SETLISTFM_API_KEY production
vercel env add CRON_SECRET production
vercel env add NEXTAUTH_SECRET production
vercel env add NEXTAUTH_URL production
```

### Step 4: Deploy to Production
```bash
# Deploy to production
vercel --prod

# Or using git push (if connected to GitHub)
git add .
git commit -m "Production deployment - cron jobs in Supabase only"
git push origin main
```

### Step 5: Verify Deployment
1. Check deployment URL works
2. Test search functionality
3. Test artist pages load real data
4. Test voting on shows
5. Check trending page updates

### Step 6: Monitor Cron Jobs
```sql
-- Check cron job logs in Supabase
SELECT * FROM cron_job_logs 
ORDER BY created_at DESC 
LIMIT 20;

-- Check active cron jobs
SELECT * FROM cron.job;
```

## 📊 Post-Deployment Monitoring

### Health Checks
- `/api/health` - Basic health check
- `/api/health/comprehensive` - Detailed system status

### Performance Metrics
- Bundle sizes optimized for production
- ISR enabled for artist/show pages
- CDN caching for static assets

### Error Tracking
- Sentry configured for error monitoring
- Console logs available in Vercel dashboard

## ⚠️ Important Notes

1. **Cron Jobs**: All cron jobs run in Supabase, NOT Vercel
2. **API Keys**: Ensure all external API keys are valid
3. **Database**: Supabase handles all data persistence
4. **Build**: Vercel's infrastructure will handle the build process
5. **Domain**: Update NEXTAUTH_URL and NEXT_PUBLIC_APP_URL after deployment

## 🎯 Success Criteria

- [ ] Application loads without errors
- [ ] Search returns real artist data
- [ ] Shows display with setlists
- [ ] Voting works (upvote only)
- [ ] Trending page shows real data
- [ ] Cron jobs executing in Supabase
- [ ] No TypeScript errors in production
- [ ] Performance scores > 80 on Lighthouse

## 🔧 Troubleshooting

### If build fails on Vercel:
1. Check environment variables are set
2. Verify Node version compatibility (18.x or 20.x)
3. Check build logs for specific errors

### If cron jobs don't run:
1. Verify pg_cron extension is enabled in Supabase
2. Check cron_job_logs table for errors
3. Ensure app_settings table has correct URLs

### If API routes return 500:
1. Check Supabase connection
2. Verify API keys are correct
3. Check Vercel function logs

## 📝 Final Command

```bash
# One-line deployment (after setup)
git add . && git commit -m "Production ready - cron in Supabase" && git push origin main
```

The app is now configured for production deployment with all cron jobs running in Supabase as requested!