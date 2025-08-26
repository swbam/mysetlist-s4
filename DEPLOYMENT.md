# MySetlist Deployment Guide

## 🚀 Quick Deployment to Vercel

### 1. Prerequisites
- Vercel account
- GitHub repository connected to Vercel
- All required environment variables (see `.env.example`)

### 2. Vercel Project Setup

**IMPORTANT**: This is a monorepo. You need to configure Vercel correctly:

1. **Create New Project** in Vercel
2. **Import from GitHub** - select your repository
3. **Configure Build Settings**:
   - **Framework Preset**: Next.js
   - **Root Directory**: `apps/web` (CRITICAL!)
   - **Build Command**: `pnpm build`
   - **Output Directory**: `.next` (default)
   - **Install Command**: `pnpm install --frozen-lockfile`

### 3. Environment Variables

Add these in Vercel Dashboard → Settings → Environment Variables:

#### Required Variables
```bash
# Database
DATABASE_URL=your_supabase_database_url
DIRECT_URL=your_supabase_database_url

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SUPABASE_JWT_SECRET=your_jwt_secret

# External APIs
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
TICKETMASTER_API_KEY=your_ticketmaster_api_key

# Security
NEXTAUTH_SECRET=your_32_character_secret
CRON_SECRET=your_32_character_cron_secret

# Redis (Recommended)
REDIS_URL=your_redis_url
# OR for Upstash
UPSTASH_REDIS_REST_URL=your_upstash_url
UPSTASH_REDIS_REST_TOKEN=your_upstash_token
```

#### Optional Variables
```bash
SETLISTFM_API_KEY=your_setlistfm_key
SENTRY_DSN=your_sentry_dsn
NEXT_PUBLIC_POSTHOG_KEY=your_posthog_key
```

### 4. Database Setup

1. **Run Migrations** (if using Supabase):
   ```bash
   # Apply all migrations
   cd supabase
   npx supabase db push
   ```

2. **Or manually apply** the migration files in `supabase/migrations/`

### 5. Deploy

1. **Push to main branch**:
   ```bash
   git add .
   git commit -m "feat: complete app fixes for deployment"
   git push origin main
   ```

2. **Vercel will automatically deploy** from the `apps/web` directory

### 6. Post-Deployment Setup

1. **Initialize Workers** (one-time):
   ```bash
   curl -X POST https://your-app.vercel.app/api/workers/init
   ```

2. **Test Health Check**:
   ```bash
   curl https://your-app.vercel.app/api/health
   ```

3. **Verify Cron Jobs** are working in Vercel Dashboard → Functions → Cron

## 🔧 Troubleshooting

### Build Failures

1. **"Module not found" errors**:
   - Ensure Root Directory is set to `apps/web`
   - Check that all `@repo/*` packages are properly configured

2. **Environment validation fails**:
   ```bash
   # Test locally first
   cd apps/web
   pnpm validate:env
   ```

3. **TypeScript errors**:
   ```bash
   # Check types locally
   cd apps/web
   pnpm typecheck
   ```

### Runtime Issues

1. **Database connection errors**:
   - Verify DATABASE_URL is correct
   - Check Supabase project is active
   - Ensure migrations are applied

2. **Redis connection errors**:
   - App will fallback to memory cache
   - Check REDIS_URL or UPSTASH_* variables

3. **External API errors**:
   - Verify all API keys are valid
   - Check API quotas and limits

## 📊 Monitoring

### Health Checks
- **Health endpoint**: `/api/health`
- **Queue stats**: `/api/queues/stats`
- **Active imports**: `/api/import/active`

### Cron Jobs
All cron jobs are configured in `vercel.json` and will run automatically:
- Cache warming: Every 15 minutes
- Trending calculations: Every 2 hours
- Data cleanup: Daily at 1:30 AM
- Artist sync: Every 6-8 hours

### Logs
- View logs in Vercel Dashboard → Functions
- Check Sentry for error tracking (if configured)

## 🔄 Updates

To deploy updates:

1. **Make changes** to your code
2. **Test locally**:
   ```bash
   pnpm dev
   pnpm build
   ```
3. **Push to main**:
   ```bash
   git push origin main
   ```
4. **Vercel auto-deploys** from the configured root directory

## 🚨 Emergency Procedures

### Rollback Deployment
1. Go to Vercel Dashboard → Deployments
2. Find previous working deployment
3. Click "Promote to Production"

### Disable Cron Jobs
1. Go to Vercel Dashboard → Settings → Functions
2. Disable specific cron functions if needed

### Database Issues
1. Check Supabase Dashboard for database status
2. Verify connection strings are correct
3. Check for migration issues

## 📈 Performance Optimization

### After Deployment
1. **Monitor Core Web Vitals** in Vercel Analytics
2. **Check bundle size** with `pnpm analyze`
3. **Monitor API response times** in health checks
4. **Optimize cron job timing** based on traffic patterns

### Scaling
- **Database**: Upgrade Supabase plan if needed
- **Redis**: Consider dedicated Redis instance for high traffic
- **CDN**: Vercel handles this automatically
- **API Limits**: Monitor external API usage

## ✅ Success Checklist

After deployment, verify:
- [ ] App loads at your domain
- [ ] Health check returns 200: `/api/health`
- [ ] Database connection works
- [ ] Redis connection works (or fallback active)
- [ ] Cron jobs are scheduled in Vercel
- [ ] External APIs are accessible
- [ ] Import system works
- [ ] Queue system initializes

Your MySetlist app should now be fully deployed and operational! 🎉