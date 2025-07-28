# MySetlist Production Deployment Guide

## Overview

This guide provides comprehensive instructions for deploying MySetlist to production on Vercel with Supabase. All critical deployment configurations have been audited and optimized for production readiness.

## 🚀 Pre-Deployment Checklist

### ✅ Critical Configuration Fixes Applied

- [x] **TypeScript Build Errors**: Disabled `ignoreBuildErrors` in `next.config.ts`
- [x] **Hardcoded URLs**: Updated Supabase config to use environment variables
- [x] **Security**: Removed `.env.local` file with production secrets
- [x] **Vercel Config**: Enhanced with proper build commands, headers, and cron jobs
- [x] **Environment Template**: Created comprehensive `.env.production.example`

### 🔐 Security Configurations

1. **Environment Variables**: All localhost URLs replaced with environment variables
2. **HTTPS Enforcement**: Security headers configured in `vercel.json` and `next.config.ts`
3. **Secret Management**: Production secrets must be configured in Vercel Environment Variables
4. **CORS Protection**: Proper CORS configuration in middleware and API routes

## 📋 Environment Variables Setup

### Step 1: Vercel Project Configuration

1. Log into your Vercel dashboard
2. Create a new project or select existing MySetlist project
3. Go to **Settings** → **Environment Variables**

### Step 2: Required Environment Variables

Copy the variables from `.env.production.example` and configure in Vercel:

#### **Application URLs (CRITICAL)**

```
NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app
NEXT_PUBLIC_WEB_URL=https://your-domain.vercel.app
NEXT_PUBLIC_API_URL=https://your-domain.vercel.app/api
NODE_ENV=production
```

#### **Supabase Configuration (REQUIRED)**

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
SUPABASE_JWT_SECRET=your_supabase_jwt_secret
DATABASE_URL=postgresql://postgres:[password]@[host]:6543/postgres
```

#### **External API Keys (REQUIRED)**

```
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
NEXT_PUBLIC_SPOTIFY_CLIENT_ID=your_spotify_client_id
TICKETMASTER_API_KEY=your_ticketmaster_api_key
SETLISTFM_API_KEY=your_setlistfm_api_key
```

#### **Authentication & Security (REQUIRED)**

```
NEXTAUTH_SECRET=your_32_character_minimum_secret_string
NEXTAUTH_URL=https://your-domain.vercel.app
CSRF_SECRET=your_csrf_secret_key
CRON_SECRET=your_secure_cron_secret
ADMIN_USER_IDS=admin_user_id_1,admin_user_id_2
```

### Step 3: Optional Enhanced Features

#### **Analytics & Monitoring**

```
NEXT_PUBLIC_POSTHOG_KEY=your_posthog_project_api_key
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com
NEXT_PUBLIC_SENTRY_DSN=your_sentry_dsn_url
SENTRY_ORG=your_sentry_organization
SENTRY_PROJECT=your_sentry_project
```

#### **Performance & Caching**

```
UPSTASH_REDIS_REST_URL=your_upstash_redis_url
UPSTASH_REDIS_REST_TOKEN=your_upstash_redis_token
EDGE_CONFIG=your_vercel_edge_config_url
```

## 🗄️ Database Setup

### Supabase Configuration

1. **Project Setup**: Ensure your Supabase project is configured
2. **Database URL**: Use the pooled connection string from Supabase
3. **Migrations**: All 24 migrations are production-ready and will be applied automatically

### Migration Files Applied

- Base schema with users, artists, venues, shows, songs, setlists
- Trending algorithms and functions
- Performance indexes and optimizations
- RLS (Row Level Security) policies
- Admin dashboard statistics
- Realtime subscriptions

## 🚀 Deployment Process

### Option 1: Vercel CLI Deployment

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy from project root
vercel --prod
```

### Option 2: Git-Based Deployment

1. Push your code to GitHub/GitLab
2. Connect repository to Vercel
3. Configure environment variables in Vercel dashboard
4. Deploy automatically on push to `main` branch

### Option 3: Manual Deployment

```bash
# Build the project
cd apps/web
pnpm build

# Deploy with Vercel
vercel --prod
```

## 🔄 Automated Cron Jobs

The following cron jobs are configured in `vercel.json`:

- **Trending Update**: Every 6 hours (`0 */6 * * *`)
- **Popular Artists Sync**: Daily at 2 AM (`0 2 * * *`)
- **Daily Data Sync**: Daily at 1 AM (`0 1 * * *`)
- **Health Check**: Every 5 minutes (`*/5 * * * *`)

## 🎯 Production Verification

### Health Check Endpoints

1. **Basic Health**: `https://your-domain.vercel.app/api/health`
2. **Comprehensive Health**: `https://your-domain.vercel.app/api/health/comprehensive`
3. **Database Health**: `https://your-domain.vercel.app/api/health/db`

### Expected Health Check Response

```json
{
  "status": "healthy",
  "timestamp": "2025-01-21T10:00:00.000Z",
  "responseTime": "150ms",
  "system": {
    "environment": "production",
    "version": "1.0.0",
    "deployment": {
      "vercel": {
        "url": "your-domain.vercel.app",
        "region": "iad1",
        "branch": "main",
        "commit": "abc1234"
      }
    }
  },
  "services": {
    "database": {
      "healthy": true,
      "message": "Database connection successful",
      "responseTime": "50ms"
    },
    "auth": {
      "healthy": true,
      "message": "Auth service operational",
      "responseTime": "30ms"
    },
    "apis": {
      "healthy": true,
      "message": "All API integrations healthy",
      "details": {
        "spotify": { "healthy": true, "message": "Spotify API accessible" },
        "ticketmaster": {
          "healthy": true,
          "message": "Ticketmaster API accessible"
        }
      },
      "responseTime": "200ms"
    }
  },
  "uptime": 3600
}
```

## 🔧 Performance Optimization

### Build Configuration

- **Output Directory**: `apps/web/.next`
- **Build Command**: `cd apps/web && pnpm build`
- **Install Command**: `pnpm install --frozen-lockfile`
- **Node.js Runtime**: Latest stable version

### Security Headers Applied

- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
- `Referrer-Policy: strict-origin-when-cross-origin`

### Image Optimization

- **Formats**: AVIF, WebP fallback
- **Domains**: `i.scdn.co`, `s1.ticketm.net`, `images.unsplash.com`
- **Device Sizes**: Optimized for mobile to 4K displays

## 🚨 Troubleshooting

### Common Issues

#### 1. Environment Variable Errors

**Symptom**: Build fails with environment variable errors
**Solution**:

- Verify all required variables are set in Vercel
- Run `pnpm check:env` locally to validate
- Check variable names match exactly

#### 2. Database Connection Errors

**Symptom**: 500 errors on API routes
**Solution**:

- Verify Supabase URL and keys are correct
- Check database connection string format
- Ensure RLS policies are configured

#### 3. External API Failures

**Symptom**: Features not working (search, sync)
**Solution**:

- Test API keys using health check endpoint
- Verify rate limits not exceeded
- Check API key permissions

#### 4. Build Errors

**Symptom**: TypeScript or build failures
**Solution**:

- Ensure `ignoreBuildErrors: false` is set
- Fix TypeScript errors before deployment
- Check for missing dependencies

### Debugging Commands

```bash
# Validate environment
pnpm check:env

# Test API integrations
pnpm check:env --test-apis

# Type check
pnpm typecheck

# Build locally
pnpm build

# Test production build
pnpm start
```

## 📊 Monitoring & Analytics

### Performance Targets

- **Lighthouse Score**: ≥90 overall
- **Largest Contentful Paint**: <2.5 seconds
- **First Contentful Paint**: <1.8 seconds
- **Cumulative Layout Shift**: <0.1

### Error Monitoring

- **Sentry**: Configured for error tracking and performance monitoring
- **Vercel Analytics**: Built-in performance and visitor analytics
- **PostHog**: User behavior and feature analytics

### Database Monitoring

- **Supabase Dashboard**: Real-time database metrics
- **Connection Pooling**: Configured for optimal performance
- **Query Performance**: Indexes optimized for common queries

## 🎉 Post-Deployment Verification

### 1. Functional Testing

- [ ] Homepage loads correctly
- [ ] User authentication works (sign-up/sign-in)
- [ ] Artist search returns results
- [ ] Show pages display setlists
- [ ] Voting functionality works
- [ ] Real-time updates function
- [ ] Mobile responsive design

### 2. Performance Testing

- [ ] Lighthouse audit scores ≥90
- [ ] Page load times <3 seconds
- [ ] API response times <500ms
- [ ] Image optimization working
- [ ] Caching headers present

### 3. Security Testing

- [ ] HTTPS enforcement working
- [ ] Security headers present
- [ ] CORS policies configured
- [ ] Rate limiting active
- [ ] No sensitive data exposed

### 4. Integration Testing

- [ ] Spotify OAuth working
- [ ] External API syncing working
- [ ] Email notifications sending
- [ ] Cron jobs executing
- [ ] Database queries optimized

## 📞 Support & Maintenance

### Regular Maintenance Tasks

1. **Weekly**: Review Vercel deployment logs
2. **Monthly**: Update dependencies and security patches
3. **Quarterly**: Review and rotate API keys
4. **As needed**: Scale Supabase plan based on usage

### Emergency Procedures

1. **Rollback**: Use Vercel dashboard to rollback to previous deployment
2. **Database Issues**: Access Supabase dashboard for database recovery
3. **API Outages**: Check external service status pages
4. **Performance Issues**: Review metrics in Vercel and Sentry

---

## ✅ Deployment Complete

Once all steps are completed and verifications pass, your MySetlist application will be fully operational in production with:

- ✅ World-class performance and optimization
- ✅ Enterprise-grade security configuration
- ✅ Comprehensive monitoring and alerting
- ✅ Automated scaling and reliability
- ✅ Professional deployment pipeline

**Your production URL**: `https://your-domain.vercel.app`

**Health Check**: `https://your-domain.vercel.app/api/health`
