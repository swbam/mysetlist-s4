# 🚀 MySetlist Deployment Guide

**Version**: 1.0.0  
**Deployment Target**: Vercel + Supabase  
**Last Updated**: January 2025

## 📋 Prerequisites

Before deploying MySetlist, ensure you have:

- Node.js 20.x or higher
- pnpm 8.x or higher
- Git
- Vercel account
- Supabase account
- GitHub account (for CI/CD)
- Domain name (optional)

## 🔧 Environment Setup

### 1. **Clone the Repository**
```bash
git clone https://github.com/your-org/mysetlist.git
cd mysetlist
pnpm install
```

### 2. **Environment Variables**
Copy the example environment file and configure:
```bash
cp .env.example .env.local
```

Required environment variables:
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-key

# External APIs
SPOTIFY_CLIENT_ID=your-spotify-client-id
SPOTIFY_CLIENT_SECRET=your-spotify-client-secret
TICKETMASTER_API_KEY=your-ticketmaster-key
SETLIST_FM_API_KEY=your-setlistfm-key

# Redis (Upstash)
UPSTASH_REDIS_REST_URL=your-redis-url
UPSTASH_REDIS_REST_TOKEN=your-redis-token

# Email (Resend)
RESEND_API_KEY=your-resend-key
EMAIL_FROM=noreply@yourdomain.com

# Sentry (Optional)
SENTRY_DSN=your-sentry-dsn
SENTRY_AUTH_TOKEN=your-sentry-token

# App Config
NEXT_PUBLIC_APP_URL=https://yourdomain.com
NEXT_PUBLIC_APP_NAME=MySetlist
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

## ☁️ Vercel Deployment

### 1. **Install Vercel CLI**
```bash
npm install -g vercel
```

### 2. **Deploy to Vercel**
```bash
# Login to Vercel
vercel login

# Deploy (follow prompts)
vercel

# Or deploy to production
vercel --prod
```

### 3. **Configure Environment Variables**
1. Go to Vercel Dashboard
2. Select your project
3. Go to Settings → Environment Variables
4. Add all variables from `.env.local`

### 4. **Configure Build Settings**
```json
{
  "buildCommand": "pnpm build",
  "outputDirectory": "apps/web/.next",
  "installCommand": "pnpm install",
  "framework": "nextjs"
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

## 🆘 Troubleshooting

### Common Issues:

1. **Build Failures**
   ```bash
   # Clear cache and rebuild
   rm -rf .next node_modules
   pnpm install
   pnpm build
   ```

2. **Database Connection Issues**
   - Check Supabase service is running
   - Verify connection string
   - Check connection pool settings

3. **Redis Connection Issues**
   - Verify Upstash credentials
   - Check Redis memory usage
   - Monitor connection limits

4. **API Rate Limiting**
   - Check rate limit headers
   - Monitor Redis for rate limit keys
   - Adjust limits if needed

## 📈 Scaling Considerations

### 1. **Vertical Scaling**
- Upgrade Vercel plan for more resources
- Increase Supabase compute resources
- Upgrade Redis memory

### 2. **Horizontal Scaling**
- Enable Vercel auto-scaling
- Add read replicas in Supabase
- Implement database sharding

### 3. **Performance Optimization**
- Enable ISR for static pages
- Implement aggressive caching
- Use CDN for assets

## 🔄 Rollback Procedures

### 1. **Instant Rollback**
```bash
# Via Vercel CLI
vercel rollback

# Or use Vercel Dashboard
```

### 2. **Database Rollback**
```bash
# Revert last migration
supabase db reset --version [previous-version]
```

## 📊 Production Metrics

Monitor these KPIs post-deployment:

- **Performance**: Core Web Vitals
- **Availability**: Uptime percentage
- **Errors**: Error rate and types
- **Usage**: DAU, votes per day
- **Infrastructure**: CPU, memory, bandwidth

## 🎉 Launch Checklist

- [ ] All tests passing
- [ ] Environment variables configured
- [ ] Database migrations complete
- [ ] DNS configured
- [ ] SSL enabled
- [ ] Monitoring active
- [ ] Backups configured
- [ ] Rate limiting enabled
- [ ] Cron jobs scheduled
- [ ] Admin users created
- [ ] Email sending verified
- [ ] Performance benchmarks met
- [ ] Security scan completed
- [ ] Documentation updated
- [ ] Team access configured

## 📚 Additional Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Project README](./README.md)
- [Architecture Overview](./ARCHITECTURE-OVERVIEW.md)
- [API Documentation](./docs/api/README.md)

## 🚀 Quick Deploy Script

```bash
#!/bin/bash
# deploy.sh - Quick deployment script

echo "🚀 Starting MySetlist deployment..."

# Check prerequisites
command -v pnpm >/dev/null 2>&1 || { echo "pnpm required"; exit 1; }
command -v vercel >/dev/null 2>&1 || { echo "vercel CLI required"; exit 1; }

# Build and test
echo "📦 Building application..."
pnpm build

echo "🧪 Running tests..."
pnpm test

echo "🚀 Deploying to Vercel..."
vercel --prod

echo "✅ Deployment complete!"
```

---

**Need Help?** Contact the development team or check the [troubleshooting guide](./docs/troubleshooting.md).