# MySetlist Deployment Guide 🚀

This guide covers deploying MySetlist to production using Vercel (frontend) and Supabase (backend).

## Prerequisites

- Vercel account
- Supabase project (already set up)
- API keys for Spotify, Ticketmaster, and Setlist.fm
- Node.js 18+ and pnpm installed locally

## 1. Supabase Setup (Backend)

### Database Setup

The database migrations are already in place. To deploy them:

```bash
# Push all migrations
pnpm db:push

# Or manually via Supabase CLI
supabase db push --project-ref yzwkimtdaabyjbpykquu
```

### Edge Functions

Edge functions are already deployed:
- `sync-artists` - Spotify artist sync
- `sync-shows` - Ticketmaster show sync  
- `sync-setlists` - Setlist.fm sync
- `scheduled-sync` - Periodic data syncs

### Cron Jobs Setup

1. Go to your Supabase dashboard
2. Navigate to Database → Extensions
3. Enable `pg_cron` and `pg_net` extensions
4. Run the cron jobs migration:
   ```bash
   supabase db push --project-ref yzwkimtdaabyjbpykquu < supabase/migrations/20240126_setup_cron_jobs.sql
   ```

### Spotify OAuth Configuration

1. In Supabase dashboard, go to Authentication → Providers
2. Spotify should already be enabled
3. Add these redirect URLs:
   - Development: `http://localhost:3000/auth/callback`
   - Production: `https://your-domain.com/auth/callback`

## 2. Vercel Deployment (Frontend)

### Initial Setup

1. Install Vercel CLI:
   ```bash
   npm i -g vercel
   ```

2. Link your project:
   ```bash
   vercel link
   ```

### Environment Variables

Add these in Vercel dashboard (Settings → Environment Variables):

```env
# Supabase (all environments)
NEXT_PUBLIC_SUPABASE_URL=https://yzwkimtdaabyjbpykquu.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Database
DATABASE_URL=your_database_url

# External APIs
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
TICKETMASTER_API_KEY=your_ticketmaster_api_key
SETLISTFM_API_KEY=your_setlistfm_api_key

# Email (if using Resend)
RESEND_API_KEY=your_resend_api_key
EMAIL_FROM=noreply@your-domain.com

# Cron Secret
CRON_SECRET=your_cron_secret

# Application URL
NEXT_PUBLIC_URL=https://your-domain.com
```

### Deploy Commands

```bash
# Preview deployment
vercel

# Production deployment
vercel --prod

# Or use the deploy script
./scripts/deploy.sh production
```

## 3. Post-Deployment Setup

### 1. Verify Edge Functions

Test each edge function:

```bash
# Test artist sync
curl -X POST https://yzwkimtdaabyjbpykquu.supabase.co/functions/v1/sync-artists \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"artistName": "The Beatles"}'

# Test show sync
curl -X POST https://yzwkimtdaabyjbpykquu.supabase.co/functions/v1/sync-shows \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"artistName": "The Beatles"}'
```

### 2. Test Authentication

1. Try signing up with email
2. Try signing in with Spotify
3. Verify email confirmation works
4. Test password reset flow

### 3. Configure Domain (Optional)

In Vercel:
1. Go to Settings → Domains
2. Add your custom domain
3. Update DNS records as instructed

In Supabase:
1. Update redirect URLs to use your custom domain
2. Update CORS settings if needed

### 4. Monitor Performance

- Enable Vercel Analytics
- Set up Supabase monitoring
- Configure error tracking (Sentry)

## 4. Continuous Deployment

### GitHub Integration

1. Connect GitHub repo to Vercel
2. Enable automatic deployments:
   - Production: deploys from `main` branch
   - Preview: deploys from pull requests

### Database Migrations

For future schema changes:

```bash
# Generate migration
pnpm db:generate

# Apply locally
pnpm db:push

# Deploy to production
supabase db push --project-ref yzwkimtdaabyjbpykquu
```

## 5. Monitoring & Maintenance

### Health Checks

- Frontend: `https://your-domain.com/api/health`
- Edge Functions: Check Supabase Function Logs

### Cron Job Monitoring

View cron job status:
```sql
SELECT * FROM cron_job_status;
```

### Logs

- Vercel: Function logs in dashboard
- Supabase: 
  - Edge Function logs
  - Database logs
  - Auth logs

## Troubleshooting

### Common Issues

1. **Edge Functions not working**
   - Check environment variables in Supabase dashboard
   - Verify API keys are correct
   - Check function logs for errors

2. **Authentication issues**
   - Verify redirect URLs match your domain
   - Check Supabase Auth settings
   - Ensure environment variables are set

3. **Database connection issues**
   - Verify DATABASE_URL is correct
   - Check connection pooling settings
   - Monitor Supabase dashboard for limits

### Support

- Vercel: https://vercel.com/support
- Supabase: https://supabase.com/support
- MySetlist Issues: [Create an issue on GitHub]

## Security Checklist

- [ ] All API keys are in environment variables
- [ ] Database has Row Level Security enabled
- [ ] CORS is properly configured
- [ ] Rate limiting is enabled
- [ ] SSL/TLS is enforced
- [ ] Security headers are set
- [ ] Input validation on all forms
- [ ] SQL injection protection (via Drizzle ORM)

## Performance Optimization

- [ ] Enable Vercel Edge Network
- [ ] Configure caching headers
- [ ] Optimize images with Next.js Image
- [ ] Enable gzip compression
- [ ] Monitor Core Web Vitals
- [ ] Use database indexes effectively

---

## Recent Fixes - Vercel Cron Job Issues

### Issue Fixed
The Vercel deployment was failing due to incorrect cron job configurations. The project was configured to use Vercel's cron feature, but the actual cron jobs should be handled by Supabase's `pg_cron` extension.

### Changes Made

#### 1. Removed Vercel Cron Configurations
- **File**: `apps/web/vercel.json`
  - Removed `crons` array that referenced `/api/cron/*` endpoints
  - These cron jobs are now handled by Supabase's `pg_cron` extension

- **File**: `apps/api/vercel.json`
  - Removed `crons` array that referenced `/cron/keep-alive` endpoint

#### 2. Updated Supabase Cron Job Configuration
- **File**: `supabase/migrations/20240126_setup_cron_jobs.sql`
  - Updated cron job URLs to point to the correct Next.js API routes
  - Changed from `POST` requests to Edge Functions to `GET` requests to Next.js API routes
  - Added `app_settings` table to store configuration values (app URL, cron secret)

#### 3. Current Cron Job Setup
The following cron jobs are now properly configured to run via Supabase's `pg_cron` extension:

1. **Email Processing** - Runs every 5 minutes
   - Endpoint: `{app_url}/api/cron/email-processing`

2. **Daily Reminders** - Runs daily at 10 AM UTC
   - Endpoint: `{app_url}/api/cron/daily-reminders`

3. **Weekly Digest** - Runs Sundays at 9 AM UTC
   - Endpoint: `{app_url}/api/cron/weekly-digest`

The migration automatically configures the `app_settings` table with the correct app URL and cron secret.

### Testing
Both build processes now work correctly:
- `pnpm build --filter=web` ✅
- `pnpm build --filter=api` ✅

The deployment should now proceed without cron-related errors.

---

Happy deploying! 🎉