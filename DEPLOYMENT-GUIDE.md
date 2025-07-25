# 🚀 MySetlist Deployment Guide - Consolidated

**Version**: 2.0.0  
**Deployment Target**: Vercel + Supabase  
**Last Updated**: January 2025

> **Note**: This guide consolidates all deployment documentation into a single source of truth.

## 🎯 Quick Start

```bash
# For production deployment
pnpm build && vercel --prod

# For preview deployment
vercel
```

## 📋 Prerequisites

Before deploying MySetlist, ensure you have:

- **Node.js**: 20.x or higher
- **pnpm**: 8.x or higher (included via `packageManager` in package.json)
- **Accounts Required**:
  - Vercel account (deployment platform)
  - Supabase account (database & auth)
  - GitHub account (version control & CI/CD)
  - External API accounts (Spotify, Ticketmaster, Setlist.fm)
- **Domain**: Custom domain (optional, Vercel provides subdomain)

## 🔧 Environment Setup

### 1. **Clone and Install**
```bash
git clone https://github.com/your-org/mysetlist.git
cd mysetlist
pnpm install --frozen-lockfile
```

### 2. **Environment Variables Configuration**

#### Local Development
```bash
cp apps/web/.env.example apps/web/.env.local
```

#### Vercel Dashboard Configuration
Navigate to your Vercel project → Settings → Environment Variables

**Required Variables** (grouped by service):

##### Core Application
```env
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app
NEXT_PUBLIC_WEB_URL=https://your-domain.vercel.app  
NEXT_PUBLIC_API_URL=https://your-domain.vercel.app/api
```

##### Supabase (Database & Auth)
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SUPABASE_JWT_SECRET=your_jwt_secret
DATABASE_URL=postgresql://postgres:[password]@[host]:6543/postgres
```

##### External APIs
```env
# Spotify
SPOTIFY_CLIENT_ID=your_client_id
SPOTIFY_CLIENT_SECRET=your_client_secret
NEXT_PUBLIC_SPOTIFY_CLIENT_ID=your_client_id

# Ticketmaster
TICKETMASTER_API_KEY=your_api_key

# Setlist.fm
SETLISTFM_API_KEY=your_api_key
```

##### Security & Authentication
```env
NEXTAUTH_SECRET=your_32_char_minimum_secret
NEXTAUTH_URL=https://your-domain.vercel.app
CSRF_SECRET=your_csrf_secret
CRON_SECRET=your_cron_secret
ADMIN_USER_IDS=admin_id_1,admin_id_2
```

##### Optional Services
```env
# Redis Cache (Upstash)
UPSTASH_REDIS_REST_URL=your_redis_url
UPSTASH_REDIS_REST_TOKEN=your_redis_token

# Email (Resend)
RESEND_API_KEY=your_resend_key
EMAIL_FROM=noreply@yourdomain.com

# Analytics & Monitoring
NEXT_PUBLIC_SENTRY_DSN=your_sentry_dsn
NEXT_PUBLIC_POSTHOG_KEY=your_posthog_key
```

### 3. **Validate Environment**
```bash
pnpm check:env              # Validate all environment variables
pnpm check:env --test-apis  # Test external API connections
```

## 🗄️ Database Setup

### 1. **Create Supabase Project**
1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Save the database credentials

### 2. **Run Database Migrations**
```bash
# Install Supabase CLI
npm install -g supabase

# Link to your project
supabase link --project-ref your-project-ref

# Run migrations
supabase db push

# Seed initial data (optional)
pnpm db:seed
```

### 3. **Enable Required Extensions**
```sql
-- Run in Supabase SQL editor
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "unaccent";
```

### 4. **Configure Row Level Security**
RLS policies are automatically applied via migrations.

## ☁️ Deployment Options

### Option 1: Vercel CLI (Recommended)
```bash
# First-time setup
vercel login
vercel link  # Link to existing project or create new

# Deploy to preview
vercel

# Deploy to production
vercel --prod
```

### Option 2: Git-Based Deployment
1. Push code to GitHub/GitLab/Bitbucket
2. Import project in Vercel Dashboard
3. Configure environment variables
4. Auto-deploy on push to `main`

### Option 3: Quick Deploy Script
```bash
# Use the built-in deployment script
pnpm final
```

### Build Configuration (auto-detected)
```json
{
  "buildCommand": "cd apps/web && pnpm build",
  "outputDirectory": "apps/web/.next",
  "installCommand": "pnpm install --frozen-lockfile",
  "framework": "nextjs",
  "nodeVersion": "20.x"
}
```

## 🔄 CI/CD Setup

### 1. **GitHub Actions Configuration**
The project includes pre-configured GitHub Actions workflows:

- `.github/workflows/ci.yml` - Continuous Integration
- `.github/workflows/deploy-production.yml` - Production Deployment
- `.github/workflows/deploy-staging.yml` - Staging Deployment

### 2. **GitHub Secrets**
Add these secrets to your GitHub repository:
```yaml
VERCEL_ORG_ID
VERCEL_PROJECT_ID
VERCEL_TOKEN
SUPABASE_SERVICE_ROLE_KEY
SENTRY_AUTH_TOKEN
```

### 3. **Branch Protection**
Configure branch protection rules:
- Require PR reviews before merging
- Require status checks to pass
- Require branches to be up to date

## 🌐 Custom Domain Setup

### 1. **Add Domain in Vercel**
1. Go to Project Settings → Domains
2. Add your domain
3. Follow DNS configuration instructions

### 2. **SSL Configuration**
SSL is automatically provisioned by Vercel.

### 3. **Configure DNS Records**
```
Type    Name    Value
A       @       76.76.21.21
CNAME   www     cname.vercel-dns.com
```

## 📊 Redis Setup (Upstash)

### 1. **Create Upstash Account**
1. Go to [upstash.com](https://upstash.com)
2. Create a new Redis database
3. Choose the closest region

### 2. **Configure Redis**
```typescript
// Already configured in lib/cache/redis.ts
import { Redis } from '@upstash/redis';

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});
```

## 📧 Email Configuration (Resend)

### 1. **Setup Resend**
1. Create account at [resend.com](https://resend.com)
2. Verify your domain
3. Get API key

### 2. **Configure Email Templates**
Email templates are located in `apps/email/`.

## 🔍 Monitoring Setup

### 1. **Sentry Configuration**
```bash
# Install Sentry CLI
npm install -g @sentry/cli

# Initialize Sentry
sentry-cli login
```

### 2. **Vercel Analytics**
Analytics are automatically enabled for Vercel deployments.

### 3. **Custom Monitoring Stack** (Optional)
Deploy the monitoring stack:
```bash
cd infrastructure/monitoring
docker-compose up -d
```

## 🚦 Health Checks

### 1. **API Health Check**
```bash
curl https://yourdomain.com/api/health
```

### 2. **Database Health Check**
```bash
curl https://yourdomain.com/api/health/db
```

### 3. **External APIs Health Check**
```bash
curl https://yourdomain.com/api/external-apis/diagnostics
```

## 🔐 Security Checklist

Before going live, ensure:

- [ ] All environment variables are set
- [ ] RLS policies are enabled
- [ ] API rate limiting is configured
- [ ] CORS is properly configured
- [ ] Security headers are set
- [ ] SSL is enabled
- [ ] Secrets are not committed to git

## 📱 Progressive Web App

### 1. **PWA Configuration**
The app is PWA-ready with:
- Service worker
- Web manifest
- Offline support

### 2. **Testing PWA**
Use Chrome DevTools → Lighthouse → PWA audit

## 🎯 Post-Deployment

### 1. **Run Smoke Tests**
```bash
pnpm test:e2e:production
```

### 2. **Configure Cron Jobs**
Cron jobs are automatically configured via Vercel:
```typescript
// See vercel.json
{
  "crons": [
    {
      "path": "/api/cron/trending-update",
      "schedule": "0 * * * *"
    }
  ]
}
```

### 3. **Warm Cache**
```bash
curl -X POST https://yourdomain.com/api/admin/cache-warm
```

## 🚦 Health Checks & Monitoring

### Health Check Endpoints
```bash
# Basic health check
curl https://your-domain.vercel.app/api/health

# Comprehensive health check (includes all services)
curl https://your-domain.vercel.app/api/health/comprehensive

# Database connectivity
curl https://your-domain.vercel.app/api/health/db
```

### Cron Jobs (Configured in vercel.json)
- **Trending Update**: Every 6 hours
- **Popular Artists Sync**: Daily at 2 AM
- **Daily Data Sync**: Daily at 1 AM
- **Health Check**: Every 5 minutes

## 🆘 Troubleshooting

### Build Failures
```bash
# TypeScript errors
pnpm typecheck

# Clear cache and rebuild
rm -rf apps/web/.next
pnpm build
```

### Environment Variable Issues
```bash
# Validate environment
pnpm check:env

# Test API connections
pnpm check:env --test-apis
```

### Database Connection Issues
- Verify Supabase URL and keys in Vercel dashboard
- Check database connection string format
- Ensure RLS policies are configured

### Performance Issues
- Check Vercel Analytics for insights
- Review bundle size: `pnpm analyze:web`
- Monitor API response times

## 📈 Production Readiness

### Quick Deployment Checklist
- [ ] Environment variables configured in Vercel
- [ ] Database migrations applied
- [ ] TypeScript builds without errors
- [ ] External API keys validated
- [ ] Health checks passing

### Performance Targets
- **Lighthouse Score**: ≥90
- **Bundle Size**: <500KB initial
- **API Response**: <500ms p95

### Rollback
```bash
# Instant rollback via Vercel Dashboard or CLI
vercel rollback
```

## 🚀 Quick Reference

```bash
# Development
pnpm dev

# Build & Test
pnpm build
pnpm typecheck
pnpm check:env

# Deploy
vercel          # Preview
vercel --prod   # Production

# Health Check
curl https://your-domain.vercel.app/api/health
```

## 📚 Related Documentation

- [API Documentation](./docs/api/README.md)
- [Database Schema](./mysetlist-docs/02-database-schema-and-models.md)
- [Environment Setup](./ENVIRONMENT_SETUP.md)

---

**Support**: For deployment issues, check Vercel logs or contact the development team.