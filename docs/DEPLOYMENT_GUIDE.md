# MySetlist Deployment Guide

## Overview

This guide provides comprehensive instructions for deploying the MySetlist application to production. The application is built with Next.js and uses Supabase for the database and authentication.

## Prerequisites

- Node.js 18+ and pnpm
- Vercel CLI
- Supabase account and project
- External API keys (Spotify, Ticketmaster, Setlist.fm)
- Upstash Redis account (optional but recommended)

## Environment Setup

### Required Environment Variables

Create the following environment files:

#### `.env.production`

```bash
# Database
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
DATABASE_URL=your_database_url

# External APIs
NEXT_PUBLIC_SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
TICKETMASTER_API_KEY=your_ticketmaster_api_key
SETLISTFM_API_KEY=your_setlistfm_api_key

# Caching (Optional)
UPSTASH_REDIS_REST_URL=your_redis_url
UPSTASH_REDIS_REST_TOKEN=your_redis_token

# Monitoring
SENTRY_DSN=your_sentry_dsn
SENTRY_ORG=your_sentry_org
SENTRY_PROJECT=your_sentry_project

# Security
NEXTAUTH_SECRET=your_nextauth_secret
NEXTAUTH_URL=https://your-domain.com

# Analytics (Optional)
POSTHOG_API_KEY=your_posthog_key
```

### Vercel Configuration

Set up the following in your Vercel dashboard:

1. **Environment Variables**: Add all production environment variables
2. **Build Settings**:
   - Framework Preset: Next.js
   - Build Command: `pnpm run build`
   - Output Directory: `.next`
3. **Functions**: Configure for serverless functions
4. **Domains**: Set up custom domain if needed

## Database Setup

### 1. Supabase Project Setup

1. Create a new Supabase project
2. Enable Row Level Security (RLS)
3. Set up authentication providers (Email, Spotify OAuth)
4. Configure storage buckets if needed

### 2. Database Migration

Run the database migrations:

```bash
# Install dependencies
pnpm install

# Run migrations
pnpm run db:migrate

# Verify migration
pnpm run db:verify
```

### 3. Initial Data Seeding

Seed the database with initial data:

```bash
# Seed trending artists and venues
pnpm run db:seed

# Sync popular artists from Spotify
pnpm run sync:artists
```

## Deployment Process

### Automated Deployment (Recommended)

The application uses GitHub Actions for automated deployment:

1. **Push to main branch** triggers production deployment
2. **Push to develop branch** triggers staging deployment
3. **Pull requests** trigger preview deployments

### Manual Deployment

For manual deployment:

```bash
# Build and deploy to production
./scripts/deploy.sh -e production -m

# Deploy to staging
./scripts/deploy.sh -e staging
```

## Post-Deployment Checklist

### 1. Health Checks

Verify all systems are operational:

```bash
# Check application health
curl https://your-domain.com/api/health/comprehensive

# Check database connectivity
curl https://your-domain.com/api/health/db

# Verify external APIs
curl https://your-domain.com/api/external-apis/diagnostics
```

### 2. Performance Verification

- Run Lighthouse audit (target: 90+ scores)
- Check Core Web Vitals
- Verify caching is working
- Test real-time features

### 3. Security Verification

- Verify HTTPS is enforced
- Check security headers
- Test rate limiting
- Verify CSRF protection

### 4. Functionality Testing

- Test user registration and login
- Verify search functionality
- Test voting system
- Check real-time updates
- Verify mobile responsiveness

## Monitoring and Maintenance

### Application Monitoring

- **Sentry**: Error tracking and performance monitoring
- **Vercel Analytics**: Traffic and performance metrics
- **Supabase Dashboard**: Database and auth metrics
- **Custom Dashboard**: `/admin` for application-specific metrics

### Regular Maintenance Tasks

1. **Weekly**:
   - Review error logs
   - Check performance metrics
   - Update trending scores

2. **Monthly**:
   - Database cleanup
   - Security updates
   - Performance optimization

3. **Quarterly**:
   - Dependency updates
   - Security audit
   - Backup verification

### Backup and Recovery

- **Database**: Automated daily backups via Supabase
- **Code**: Version controlled in Git
- **Environment**: Document all configurations
- **Recovery**: Test restore procedures quarterly

## Scaling Considerations

### Performance Optimization

- **CDN**: Vercel Edge Network for global distribution
- **Caching**: Redis for API responses and session data
- **Database**: Connection pooling and query optimization
- **Images**: Next.js Image optimization with WebP/AVIF

### Horizontal Scaling

- **Serverless Functions**: Auto-scaling with Vercel
- **Database**: Supabase handles scaling automatically
- **Cache**: Upstash Redis for distributed caching
- **Real-time**: Supabase handles WebSocket scaling

## Troubleshooting

### Common Issues

1. **Build Failures**:
   - Check environment variables
   - Verify dependencies
   - Review build logs

2. **Database Connection Issues**:
   - Verify connection string
   - Check firewall settings
   - Review RLS policies

3. **API Rate Limits**:
   - Monitor external API usage
   - Implement exponential backoff
   - Use caching effectively

4. **Real-time Connection Issues**:
   - Check WebSocket support
   - Verify Supabase configuration
   - Review network policies

### Support Contacts

- **Technical Issues**: Check GitHub Issues
- **Database**: Supabase Support
- **Hosting**: Vercel Support
- **External APIs**: Respective provider support

## Security Best Practices

### Production Security

1. **Environment Variables**: Never commit secrets to Git
2. **HTTPS**: Enforce HTTPS everywhere
3. **Headers**: Implement security headers (CSP, HSTS, etc.)
4. **Rate Limiting**: Protect against abuse
5. **Input Validation**: Sanitize all user inputs
6. **Authentication**: Use secure session management

### Regular Security Tasks

- Update dependencies monthly
- Review access logs weekly
- Conduct security audits quarterly
- Monitor for vulnerabilities continuously

## Performance Targets

### Core Web Vitals

- **LCP (Largest Contentful Paint)**: < 2.5s
- **FID (First Input Delay)**: < 100ms
- **CLS (Cumulative Layout Shift)**: < 0.1

### Application Metrics

- **API Response Time**: < 200ms (95th percentile)
- **Database Query Time**: < 100ms (average)
- **Cache Hit Rate**: > 80%
- **Uptime**: > 99.9%

## Rollback Procedures

### Emergency Rollback

If critical issues are detected:

1. **Immediate**: Revert to previous Vercel deployment
2. **Database**: Restore from backup if needed
3. **Monitoring**: Verify rollback success
4. **Communication**: Notify stakeholders

### Planned Rollback

For planned rollbacks:

1. **Preparation**: Document rollback steps
2. **Execution**: Follow documented procedures
3. **Verification**: Test all functionality
4. **Cleanup**: Remove failed deployment artifacts

This deployment guide ensures a smooth and secure production deployment of the MySetlist application.
