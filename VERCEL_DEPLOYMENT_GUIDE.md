# Vercel Deployment Guide for MySetlist

## Prerequisites

1. **Vercel Account**: Create an account at https://vercel.com
2. **Vercel CLI**: Already installed via `pnpm add -w -D vercel`
3. **Environment Variables**: Configure in Vercel dashboard

## First-Time Setup

### 1. Login to Vercel CLI
```bash
pnpm vercel login
```

### 2. Link Project
```bash
pnpm vercel link
```
- Select "Link to existing project" if you have one
- Or create a new project

### 3. Configure Environment Variables in Vercel Dashboard

Navigate to your project settings on Vercel and add these required environment variables:

#### Database Configuration
- `DATABASE_URL` - PostgreSQL connection string
- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key
- `SUPABASE_JWT_SECRET` - Supabase JWT secret

#### API Keys
- `SPOTIFY_CLIENT_ID` - Spotify app client ID
- `SPOTIFY_CLIENT_SECRET` - Spotify app client secret
- `NEXT_PUBLIC_SPOTIFY_CLIENT_ID` - Same as SPOTIFY_CLIENT_ID
- `TICKETMASTER_API_KEY` - Ticketmaster API key
- `SETLISTFM_API_KEY` - Setlist.fm API key

#### Authentication & Security
- `NEXTAUTH_SECRET` - Generate with: `openssl rand -base64 32`
- `NEXTAUTH_URL` - Your production URL (e.g., https://mysetlist.vercel.app)
- `CSRF_SECRET` - Generate secure random string
- `CRON_SECRET` - For cron job authentication
- `ADMIN_USER_IDS` - Comma-separated admin user IDs

#### Application URLs
- `NEXT_PUBLIC_APP_URL` - Your production URL
- `NEXT_PUBLIC_WEB_URL` - Same as above
- `NEXT_PUBLIC_API_URL` - Your API URL (e.g., https://mysetlist.vercel.app/api)

#### Optional Analytics
- `NEXT_PUBLIC_POSTHOG_KEY` - PostHog project key
- `NEXT_PUBLIC_POSTHOG_HOST` - PostHog host URL
- `NEXT_PUBLIC_SENTRY_DSN` - Sentry error tracking

## Deployment Commands

### Production Deployment
```bash
# Full build and deploy
pnpm final

# Or manually:
pnpm build
pnpm vercel --prod
```

### Preview Deployment
```bash
pnpm vercel
```

### Skip Build (if already built)
```bash
pnpm vercel --prebuilt
```

## Deployment Script

The `pnpm final` command runs `scripts/simple-deploy.ts` which:
1. Cleans build artifacts
2. Installs dependencies
3. Builds the application
4. Deploys to Vercel

## Troubleshooting

### Environment Variables Not Loading
- Ensure all required variables are set in Vercel dashboard
- Check variable names match exactly (case-sensitive)
- Redeploy after adding/changing variables

### Build Failures
- Check TypeScript errors: `pnpm typecheck`
- Verify all dependencies: `pnpm install`
- Clear cache: `rm -rf apps/web/.next`

### Deployment Hangs
- Check Vercel service status
- Try with `--debug` flag: `pnpm vercel --debug`
- Ensure you're logged in: `pnpm vercel whoami`

## Production Checklist

- [ ] All environment variables configured in Vercel
- [ ] TypeScript builds without errors
- [ ] Tests pass (when implemented)
- [ ] Database migrations applied
- [ ] Supabase functions deployed
- [ ] API rate limits configured
- [ ] Security headers verified
- [ ] Performance optimizations enabled

## Post-Deployment

1. **Verify Deployment**
   - Check all pages load correctly
   - Test authentication flow
   - Verify API endpoints work
   - Check real-time features

2. **Monitor Performance**
   - Check Vercel Analytics
   - Monitor error rates
   - Review API usage

3. **Set Up Domains**
   - Add custom domain in Vercel
   - Configure DNS records
   - Enable HTTPS (automatic)