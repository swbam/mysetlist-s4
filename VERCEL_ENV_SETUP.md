# Vercel Environment Variables Setup Guide

This guide provides a comprehensive list of all environment variables needed to deploy the MySetlist application to Vercel. Use this as a checklist to ensure your deployment has all required configuration.

## Quick Copy-Paste Format for Vercel Dashboard

```bash
# Core Database & Authentication (REQUIRED)
DATABASE_URL=postgresql://postgres.yzwkimtdaabyjbpykquu:Bambseth1590@aws-0-us-east-1.pooler.supabase.com:6543/postgres
NEXT_PUBLIC_SUPABASE_URL=https://yzwkimtdaabyjbpykquu.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6d2tpbXRkYWFieWpicHlrcXV1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA2OTIzMTYsImV4cCI6MjA2NjI2ODMxNn0.8pKUt_PL7q9XmNACDKVrkyqBfK8jmUDx6ARNybrmIVM
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6d2tpbXRkYWFieWpicHlrcXV1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDY5MjMxNiwiZXhwIjoyMDY2MjY4MzE2fQ.ZMorLC_eZke3bvBAF0zyzqUONxpomfTN2RpE_mLjz18
SUPABASE_JWT_SECRET=8yUxq3AqzLiPV9mdG5jZk38ZonG5nXVUVgq6zlQKCKHcdLcee3Ssg62/8cATrxBC2uvBqFXAIQUjHLMz3Q45rg==

# Application URLs (REQUIRED - Update NEXT_PUBLIC_APP_URL to your production domain)
NEXT_PUBLIC_APP_URL=https://mysetlist-sonnet.vercel.app
NEXT_PUBLIC_APP_ENV=production

# External Music APIs (REQUIRED for core functionality)
SPOTIFY_CLIENT_ID=2946864dc822469b9c672292ead45f43
SPOTIFY_CLIENT_SECRET=feaf0fc901124b839b11e02f97d18a8d
TICKETMASTER_API_KEY=k8GrSAkbFaN0w7qDxGl7ohr8LwdAQm9b
SETLISTFM_API_KEY=xkutflW-aRy_Df9rF4OkJyCsHBYN88V37EBL

# Cron Jobs Security (REQUIRED)
CRON_SECRET=6155002300

# CMS (Already configured)
BASEHUB_TOKEN=bshb_pk_lk7rivauai7m3ihf1eehzsl7efd4ay64waxualooakqgeaz1mklo48gisjhqbhvv

# Email Service (OPTIONAL - Add if using Resend)
RESEND_API_KEY=your_resend_api_key
RESEND_FROM=noreply@your-domain.com

# Maps (OPTIONAL - Add if using Mapbox)
NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=your_mapbox_token

# Analytics (OPTIONAL - Add if using these services)
NEXT_PUBLIC_POSTHOG_KEY=your_posthog_key
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
NEXT_PUBLIC_GA_MEASUREMENT_ID=your_google_analytics_id

# Error Monitoring (OPTIONAL - Add if using Sentry)
NEXT_PUBLIC_SENTRY_DSN=your_sentry_dsn
SENTRY_AUTH_TOKEN=your_sentry_auth_token
SENTRY_ORG=your_sentry_org
SENTRY_PROJECT=your_sentry_project

# Performance Monitoring (OPTIONAL)
BETTERSTACK_API_KEY=your_betterstack_key
BETTERSTACK_URL=your_betterstack_url

# Internationalization (OPTIONAL)
LANGUINE_PROJECT_ID=your_languine_project_id
```

---

## Detailed Environment Variables Reference

### 🔴 REQUIRED Variables

#### Database & Core Infrastructure

| Variable | Description | Example Value | Where to Get |
|----------|-------------|---------------|--------------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://postgres:password@host:5432/database` | Supabase Dashboard → Settings → Database |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | `https://abcdefgh.supabase.co` | Supabase Dashboard → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key | `eyJhbGciOiJIUzI1NiIsInR5cCI6...` | Supabase Dashboard → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | `eyJhbGciOiJIUzI1NiIsInR5cCI6...` | Supabase Dashboard → Settings → API |

#### Application Configuration

| Variable | Description | Example Value | Notes |
|----------|-------------|---------------|-------|
| `NEXT_PUBLIC_APP_URL` | Main application URL | `https://mysetlist.vercel.app` | Your Vercel deployment URL |
| `NEXT_PUBLIC_WEB_URL` | Web app URL | `https://mysetlist.vercel.app` | Usually same as APP_URL |
| `NEXT_PUBLIC_APP_ENV` | Environment identifier | `production` | Set to `production` for Vercel |

#### Email Service

| Variable | Description | Example Value | Where to Get |
|----------|-------------|---------------|--------------|
| `RESEND_API_KEY` | Resend API key | `re_abc123...` | [Resend Dashboard](https://resend.com/api-keys) |
| `RESEND_TOKEN` | Resend token | `re_abc123...` | Usually same as API key |
| `RESEND_FROM` | From email address | `noreply@yourdomain.com` | Must be verified in Resend |
| `EMAIL_FROM` | Alternative from email | `noreply@yourdomain.com` | Same as RESEND_FROM |

#### Security

| Variable | Description | Example Value | Notes |
|----------|-------------|---------------|-------|
| `CRON_SECRET` | Cron job authentication | `super-secret-random-string-123` | Generate a random 32+ character string |

### 🟡 RECOMMENDED Variables

#### External Music APIs

| Variable | Description | Example Value | Where to Get |
|----------|-------------|---------------|--------------|
| `SPOTIFY_CLIENT_ID` | Spotify app client ID | `abc123def456...` | [Spotify Developer Dashboard](https://developer.spotify.com/dashboard) |
| `SPOTIFY_CLIENT_SECRET` | Spotify app secret | `xyz789abc123...` | Spotify Developer Dashboard |
| `NEXT_PUBLIC_SPOTIFY_CLIENT_ID` | Public Spotify client ID | `abc123def456...` | Same as SPOTIFY_CLIENT_ID |
| `TICKETMASTER_API_KEY` | Ticketmaster Discovery API | `k8GrSAkbFaN0w7qD...` | [Ticketmaster Developer Portal](https://developer.ticketmaster.com/) |
| `SETLISTFM_API_KEY` | Setlist.fm API key | `xkutflW-aRy_Df9r...` | [Setlist.fm API](https://api.setlist.fm/docs/1.0/index.html) |

### 🟢 OPTIONAL Variables

#### Maps & Geolocation

| Variable | Description | Example Value | Where to Get |
|----------|-------------|---------------|--------------|
| `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` | Mapbox maps token | `pk.eyJ1IjoibXl1c2Vy...` | [Mapbox Account](https://account.mapbox.com/access-tokens/) |

#### Content Management

| Variable | Description | Example Value | Where to Get |
|----------|-------------|---------------|--------------|
| `BASEHUB_TOKEN` | BaseHub CMS token | `bshb_pk_abc123...` | [BaseHub Dashboard](https://basehub.com/) |

#### Analytics

| Variable | Description | Example Value | Where to Get |
|----------|-------------|---------------|--------------|
| `NEXT_PUBLIC_POSTHOG_KEY` | PostHog analytics key | `phc_abc123def456...` | [PostHog Dashboard](https://app.posthog.com/) |
| `NEXT_PUBLIC_POSTHOG_HOST` | PostHog host URL | `https://us.i.posthog.com` | PostHog Dashboard |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | Google Analytics ID | `G-ABC123DEF4` | [Google Analytics](https://analytics.google.com/) |

#### Error Monitoring

| Variable | Description | Example Value | Where to Get |
|----------|-------------|---------------|--------------|
| `NEXT_PUBLIC_SENTRY_DSN` | Sentry error tracking DSN | `https://abc123@sentry.io/123456` | [Sentry Dashboard](https://sentry.io/) |
| `SENTRY_AUTH_TOKEN` | Sentry auth token | `abc123def456...` | Sentry → Settings → Auth Tokens |
| `SENTRY_ORG` | Sentry organization | `my-org` | Sentry Dashboard |
| `SENTRY_PROJECT` | Sentry project name | `mysetlist` | Sentry Dashboard |

#### Performance Monitoring

| Variable | Description | Example Value | Where to Get |
|----------|-------------|---------------|--------------|
| `BETTERSTACK_API_KEY` | Better Stack monitoring | `btrstck_abc123...` | [Better Stack Dashboard](https://betterstack.com/) |
| `BETTERSTACK_URL` | Better Stack URL | `https://uptime.betterstack.com/...` | Better Stack Dashboard |

#### Internationalization

| Variable | Description | Example Value | Where to Get |
|----------|-------------|---------------|--------------|
| `LANGUINE_PROJECT_ID` | Languine translation service | `proj_abc123...` | [Languine Dashboard](https://languine.ai/) |

---

## Setup Instructions

### 1. Create Supabase Project

1. Go to [Supabase](https://supabase.com/) and create a new project
2. Navigate to Settings → API to get your keys
3. Copy the values for:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
4. Navigate to Settings → Database to get `DATABASE_URL`

### 2. Set Up Email Service (Resend)

1. Sign up at [Resend](https://resend.com/)
2. Add and verify your domain
3. Create an API key in the dashboard
4. Use the API key for both `RESEND_API_KEY` and `RESEND_TOKEN`

### 3. Configure External APIs (Optional)

#### Spotify
1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Create a new app
3. Add your Vercel URL to redirect URIs
4. Copy Client ID and Secret

#### Ticketmaster
1. Register at [Ticketmaster Developer Portal](https://developer.ticketmaster.com/)
2. Create an app to get your API key

#### Setlist.fm
1. Register at [Setlist.fm API](https://api.setlist.fm/docs/1.0/index.html)
2. Generate an API key

### 4. Set Up Analytics (Optional)

#### PostHog
1. Sign up at [PostHog](https://app.posthog.com/)
2. Create a project
3. Copy the project key and host URL

#### Google Analytics
1. Set up a property in [Google Analytics](https://analytics.google.com/)
2. Copy the Measurement ID (starts with "G-")

### 5. Configure Monitoring (Optional)

#### Sentry
1. Create account at [Sentry](https://sentry.io/)
2. Create a new project
3. Copy DSN and create auth token

#### Better Stack
1. Sign up at [Better Stack](https://betterstack.com/)
2. Create monitoring and get API key

### 6. Generate Security Keys

```bash
# Generate a secure random string for CRON_SECRET
openssl rand -hex 32
```

---

## Vercel Deployment Steps

### 1. Add Environment Variables in Vercel Dashboard

1. Go to your Vercel project dashboard
2. Navigate to Settings → Environment Variables
3. Add each variable one by one:
   - Set Environment: `Production`, `Preview`, and `Development`
   - Add the variable name and value
   - Click "Save"

### 2. Alternative: Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Set environment variables via CLI
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add DATABASE_URL production
# ... repeat for all variables
```

### 3. Bulk Import (Advanced)

Create a `.env.production` file locally (don't commit this):

```bash
# Copy the variables from the quick copy-paste section above
# Then use Vercel CLI to import
vercel env pull .env.local
```

---

## Verification Steps

### 1. Check Environment Variables

After deployment, verify variables are set:

```bash
# In Vercel Function or during build
console.log('Environment check:', {
  hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
  hasSupabaseKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  hasResendKey: !!process.env.RESEND_API_KEY,
  // ... check other critical variables
});
```

### 2. Test Core Features

1. **Database Connection**: Check if app loads and data displays
2. **Authentication**: Test Supabase auth flows
3. **Email**: Test signup/notification emails
4. **External APIs**: Test Spotify/Ticketmaster integrations
5. **Cron Jobs**: Verify scheduled tasks work with CRON_SECRET

### 3. Monitor Logs

- Check Vercel Function logs for environment-related errors
- Monitor Sentry for runtime errors
- Check Supabase logs for database connection issues

---

## Common Issues & Solutions

### Missing Environment Variables

**Error**: `Environment variable X is not defined`

**Solution**: Ensure the variable is set in Vercel dashboard and redeploy

### Supabase Connection Issues

**Error**: `Invalid Supabase key` or connection timeouts

**Solution**: 
- Verify `DATABASE_URL` format: `postgresql://user:password@host:port/database`
- Check Supabase service role key has correct permissions
- Ensure Supabase project is not paused

### Email Not Sending

**Error**: Emails not being delivered

**Solution**:
- Verify domain is added and verified in Resend
- Check `RESEND_FROM` email matches verified domain
- Ensure `RESEND_API_KEY` is correct

### External API Failures

**Error**: Spotify/Ticketmaster API errors

**Solution**:
- Verify API keys are valid and not expired
- Check rate limits and quota usage
- Ensure redirect URIs include your Vercel domain

### Cron Jobs Not Running

**Error**: Scheduled tasks failing

**Solution**:
- Verify `CRON_SECRET` is set and matches webhook configuration
- Check Vercel cron job logs
- Ensure cron routes are properly configured

---

## Security Best Practices

1. **Never commit `.env` files** with real values to git
2. **Use different keys** for development and production
3. **Rotate keys regularly**, especially API keys
4. **Monitor usage** of external APIs to detect unusual activity
5. **Use least privilege** principle for database and service keys
6. **Enable monitoring** to detect and alert on security issues

---

## Support Resources

- [Vercel Environment Variables Docs](https://vercel.com/docs/concepts/projects/environment-variables)
- [Supabase Environment Variables Guide](https://supabase.com/docs/guides/getting-started/environment-variables)
- [Next.js Environment Variables](https://nextjs.org/docs/basic-features/environment-variables)

---

*Last updated: 2024-12-24*