# Environment Setup Guide

This guide will help you configure all necessary environment variables for the MySetlist application.

## Quick Start

1. **Copy the environment template:**
   ```bash
   cp .env.example .env.local
   ```

2. **Fill in the required values in `.env.local`**

3. **Validate your configuration:**
   ```bash
   npm run validate:env        # Check all package requirements
   npm run check:env          # Check core requirements
   npm run check:env:test     # Test API connections
   ```

## Required Environment Variables

### Core Application
```bash
# Application URLs
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_WEB_URL=http://localhost:3001
NEXT_PUBLIC_API_URL=http://localhost:3000/api

# Database (Required)
DATABASE_URL="postgresql://username:password@localhost:5432/mysetlist"
```

### Supabase Configuration (Required)
```bash
# Get these from your Supabase project settings
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
SUPABASE_JWT_SECRET=your_supabase_jwt_secret
```

### Authentication (Required)
```bash
# Generate a 32+ character secret
NEXTAUTH_SECRET=your_nextauth_secret_32_characters_minimum
NEXTAUTH_URL=http://localhost:3000
```

### External APIs (Required for data sync)
```bash
# Spotify Web API - https://developer.spotify.com/
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
NEXT_PUBLIC_SPOTIFY_CLIENT_ID=your_spotify_client_id

# Ticketmaster Discovery API - https://developer.ticketmaster.com/
TICKETMASTER_API_KEY=your_ticketmaster_api_key

# Setlist.fm API - https://api.setlist.fm/
SETLISTFM_API_KEY=your_setlistfm_api_key
```

## Optional Environment Variables

### Analytics & Monitoring
```bash
# PostHog Analytics - https://posthog.com/
NEXT_PUBLIC_POSTHOG_KEY=your_posthog_key
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com

# Google Analytics
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX

# Sentry Error Tracking - https://sentry.io/
NEXT_PUBLIC_SENTRY_DSN=your_sentry_dsn_url
SENTRY_ORG=your_sentry_org
SENTRY_PROJECT=your_sentry_project

# BetterStack Monitoring
BETTERSTACK_API_KEY=your_betterstack_api_key
BETTERSTACK_URL=your_betterstack_url
```

### Email Services
```bash
# Resend Email Service - https://resend.com/
RESEND_API_KEY=your_resend_api_key
EMAIL_SYSTEM_TOKEN=your_email_system_token
```

### Caching & Performance
```bash
# Redis/Upstash for caching
REDIS_URL=your_redis_connection_string
UPSTASH_REDIS_REST_URL=your_upstash_redis_url
UPSTASH_REDIS_REST_TOKEN=your_upstash_redis_token

# Vercel Edge Config
EDGE_CONFIG=your_edge_config_url
```

### Feature Flags
```bash
# Flagsmith Feature Flags - https://flagsmith.com/
FLAGSMITH_ENVIRONMENT_KEY=your_flagsmith_environment_key
NEXT_PUBLIC_FLAGSMITH_ENVIRONMENT_KEY=your_flagsmith_environment_key
```

### Security & Jobs
```bash
# Cron job authentication
CRON_SECRET=your_secure_cron_secret

# Admin configuration
ADMIN_USER_IDS=user_id_1,user_id_2
ADMIN_API_KEY=your_admin_api_key

# Webhook secrets
TICKETMASTER_WEBHOOK_SECRET=your_ticketmaster_webhook_secret
SPOTIFY_WEBHOOK_SECRET=your_spotify_webhook_secret
```

## Service Setup Instructions

### 1. Supabase Setup
1. Create a new project at [supabase.com](https://supabase.com)
2. Go to Project Settings > API
3. Copy the Project URL and anon public key
4. Go to Project Settings > Database and copy the connection string
5. Generate a service role key in the API settings

### 2. Spotify API Setup
1. Go to [developer.spotify.com](https://developer.spotify.com/)
2. Create a new app
3. Add redirect URIs: `http://localhost:3000/api/auth/callback/spotify`
4. Copy Client ID and Client Secret

### 3. Ticketmaster API Setup
1. Go to [developer.ticketmaster.com](https://developer.ticketmaster.com/)
2. Register for an API key
3. Copy the API key

### 4. Setlist.fm API Setup
1. Go to [api.setlist.fm](https://api.setlist.fm/)
2. Register for an API key
3. Copy the API key

### 5. PostHog Setup (Optional)
1. Sign up at [posthog.com](https://posthog.com/)
2. Copy your project API key
3. Use the appropriate host URL for your region

### 6. Sentry Setup (Optional)
1. Sign up at [sentry.io](https://sentry.io/)
2. Create a new project
3. Copy the DSN URL

## Environment Validation Commands

### Available Commands
```bash
# Core environment check (required variables only)
npm run check:env

# Test API connections
npm run check:env:test

# Comprehensive package validation
npm run validate:env
```

### What Each Command Checks

#### `npm run check:env`
- Verifies all required environment variables are present
- Checks basic configuration needed to run the app

#### `npm run check:env:test`
- Same as `check:env` plus tests actual API connections
- Validates Spotify and Ticketmaster API credentials work

#### `npm run validate:env`
- Comprehensive validation of all package requirements
- Checks every package's environment dependencies
- Reports warnings for missing optional configurations

## Troubleshooting

### Common Issues

#### 1. Database Connection Errors
- Verify `DATABASE_URL` format: `postgresql://username:password@host:port/database`
- Ensure database exists and credentials are correct
- Check network connectivity to database

#### 2. Supabase Authentication Errors
- Verify all Supabase environment variables are set
- Check that JWT secret matches your Supabase project
- Ensure service role key has proper permissions

#### 3. API Connection Failures
- Run `npm run check:env:test` to test API connections
- Verify API keys are valid and not expired
- Check rate limits and usage quotas

#### 4. Missing Optional Features
- Review warnings from `npm run validate:env`
- Optional features gracefully degrade when not configured
- Enable features by adding the corresponding environment variables

### Development vs Production

#### Development (`.env.local`)
- Use `localhost` URLs
- Enable debug modes
- Use development API keys when available

#### Production (Deploy secrets)
- Use production URLs
- Disable debug modes
- Use production API keys with proper rate limits
- Enable monitoring and analytics

## Security Best Practices

1. **Never commit real secrets to git**
2. **Use different API keys for development and production**
3. **Rotate secrets regularly**
4. **Use minimum required permissions for API keys**
5. **Monitor API usage and set up alerts**

## Package Dependencies

The validation command checks these packages:
- `@repo/next-config` - Core app configuration
- `@repo/database` - Database and Supabase
- `@repo/auth` - Authentication and user management
- `@repo/external-apis` - Spotify, Ticketmaster, SetlistFM
- `@repo/observability` - Sentry, BetterStack monitoring
- `@repo/email` - Email services
- `@repo/feature-flags` - Feature flag management
- `@repo/rate-limit` - Rate limiting and caching
- `@repo/security` - Security and session management
- `@repo/storage` - File storage (optional)
- `@repo/webhooks` - Webhook integrations