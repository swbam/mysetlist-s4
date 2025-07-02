# MySetlist Production Deployment Guide

This guide covers the complete production deployment setup for MySetlist with performance optimizations, monitoring, and production-ready configurations.

## 📋 Pre-Deployment Checklist

### 1. Environment Variables Configuration

Ensure all required environment variables are set in your production environment:

```bash
# Required Core Variables
DATABASE_URL=postgresql://...
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
NEXT_PUBLIC_APP_URL=https://mysetlist.com
NEXT_PUBLIC_APP_ENV=production

# External APIs
SPOTIFY_CLIENT_ID=...
SPOTIFY_CLIENT_SECRET=...
TICKETMASTER_API_KEY=...
SETLISTFM_API_KEY=...

# Email Service
RESEND_API_KEY=...
EMAIL_FROM=noreply@mysetlist.com

# Monitoring & Analytics
NEXT_PUBLIC_SENTRY_DSN=...
SENTRY_AUTH_TOKEN=...
NEXT_PUBLIC_POSTHOG_KEY=...
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com

# Performance & Caching
UPSTASH_REDIS_REST_URL=...
UPSTASH_REDIS_REST_TOKEN=...
ENABLE_PERFORMANCE_MONITORING=true
ENABLE_CACHE_WARMING=true

# Security
CRON_SECRET=... # Generate a secure random string

# Feature Flags
NEXT_PUBLIC_ENABLE_ANALYTICS=true
NEXT_PUBLIC_ENABLE_ERROR_TRACKING=true
NEXT_PUBLIC_ENABLE_PERFORMANCE_MONITORING=true
```

### 2. Dependencies Installation

```bash
# Install production dependencies
npm ci --production

# Add Redis cache (if not already added)
npm install @upstash/redis
```

### 3. Database Setup

```bash
# Run database migrations
npm run db:migrate

# Seed essential data (if needed)
npm run db:seed
```

## 🚀 Deployment Platforms

### Vercel Deployment (Recommended)

1. **Project Configuration**
   ```bash
   # Install Vercel CLI
   npm i -g vercel

   # Link project
   vercel link

   # Configure environment variables
   vercel env add PRODUCTION
   ```

2. **Deploy to Production**
   ```bash
   # Deploy main branch to production
   vercel --prod

   # Or use GitHub integration for automatic deployments
   ```

3. **Vercel Configuration** (already included in `vercel.json`)
   - Custom function timeouts for API routes
   - Cron jobs for maintenance tasks
   - Security headers
   - Cache optimizations

### Manual Deployment

1. **Build Application**
   ```bash
   # Production build with optimizations
   npm run build:production

   # Analyze bundle size
   npm run build:analyze
   ```

2. **Start Production Server**
   ```bash
   npm start
   ```

## 📊 Performance Optimizations

### 1. Caching Strategy

MySetlist implements a multi-layer caching strategy:

- **Redis Cache**: Server-side caching for API responses and database queries
- **CDN Cache**: Static asset caching via Vercel Edge Network
- **Browser Cache**: Client-side caching with appropriate TTL values
- **Next.js Cache**: Built-in ISR and data fetching optimizations

### 2. Image Optimization

- **Next.js Image Optimization**: Automatic format conversion (WebP/AVIF)
- **Lazy Loading**: Images load on demand with intersection observer
- **Responsive Images**: Multiple sizes for different viewports
- **Blur Placeholders**: Smooth loading experience

### 3. Bundle Optimization

- **Code Splitting**: Automatic route-based splitting
- **Tree Shaking**: Remove unused code
- **Dynamic Imports**: Load components on demand
- **Webpack Optimizations**: Custom bundle splitting strategies

### 4. Database Optimizations

- **Connection Pooling**: Efficient database connections
- **Query Optimization**: Indexed queries and performance monitoring
- **Batch Operations**: Multiple operations in single transactions
- **Query Caching**: Cached frequently accessed data

## 🔍 Monitoring & Analytics

### 1. Error Tracking (Sentry)

MySetlist uses Sentry for comprehensive error tracking:

- **Client-side errors**: JavaScript exceptions and performance issues
- **Server-side errors**: API failures and database issues
- **Performance monitoring**: Request timing and resource usage
- **Session replay**: User interaction recording for debugging

**Configuration:**
- Errors are automatically filtered to reduce noise
- Performance sampling optimized for production
- Source maps disabled to prevent code exposure

### 2. Performance Monitoring

Custom performance monitoring tracks:

- **Page load times**: Core Web Vitals and custom metrics
- **API response times**: Database query performance
- **Memory usage**: JavaScript heap and server memory
- **Cache performance**: Hit/miss ratios and efficiency

### 3. User Analytics (PostHog)

- **User behavior tracking**: Page views and interactions
- **Feature usage**: A/B testing and feature flags
- **Performance metrics**: User-perceived performance
- **Custom events**: Application-specific tracking

## 🛠 Maintenance & Operations

### 1. Automated Cron Jobs

Vercel cron jobs handle maintenance tasks:

- **Cache Warming** (`/api/cron/cache-warm`): Every 30 minutes
- **Analytics Processing** (`/api/cron/analytics`): Daily at 1 AM
- **Database Backup** (`/api/cron/backup`): Daily at 2 AM

### 2. Health Monitoring

The `/api/health` endpoint provides comprehensive health checks:

- **Database connectivity**: Connection and query performance
- **External APIs**: Spotify, Ticketmaster, Setlist.fm status
- **Cache system**: Redis functionality and performance
- **Memory usage**: Server resource utilization

### 3. Database Maintenance

Use the database optimization utilities:

```typescript
import { DatabaseOptimizer } from '@/lib/database-optimizations';

// Check connection health
const health = await DatabaseOptimizer.checkConnectionHealth();

// Analyze slow queries
const analysis = await DatabaseOptimizer.analyzeSlowQueries();

// Perform maintenance
const maintenance = await DatabaseOptimizer.performMaintenance();
```

## 🔒 Security Configuration

### 1. Security Headers

Production security headers are automatically applied:

- **CSP**: Content Security Policy to prevent XSS
- **HSTS**: HTTP Strict Transport Security
- **X-Frame-Options**: Prevent clickjacking
- **X-Content-Type-Options**: Prevent MIME sniffing

### 2. Environment Security

- All sensitive data in environment variables
- No hardcoded secrets in codebase
- Cron endpoints protected with secret tokens
- Database connections use SSL

### 3. Input Validation

- All API endpoints validate input
- SQL injection prevention through parameterized queries
- Rate limiting on public endpoints
- CORS configuration for external requests

## 📈 Performance Benchmarks

### Target Metrics

- **Page Load Time**: < 3 seconds (First Contentful Paint)
- **API Response Time**: < 500ms average
- **Database Query Time**: < 100ms average
- **Cache Hit Ratio**: > 80%
- **Error Rate**: < 1%

### Monitoring Commands

```bash
# Run performance tests
npm run lighthouse

# Check bundle size
npm run analyze

# Run all quality checks
npm run quality:ci
```

## 🚨 Troubleshooting

### Common Issues

1. **High Memory Usage**
   - Check Node.js memory limits
   - Analyze cache usage with monitoring tools
   - Review database connection pooling

2. **Slow API Responses**
   - Check database query performance
   - Verify cache hit rates
   - Monitor external API response times

3. **Build Failures**
   - Verify all environment variables are set
   - Check TypeScript compilation errors
   - Review dependency compatibility

### Debug Commands

```bash
# Check application health
curl https://mysetlist.com/api/health

# View cron job status (requires auth)
curl -H "Authorization: Bearer $CRON_SECRET" \
     https://mysetlist.com/api/cron/cache-warm

# Monitor performance metrics
# Access via Sentry and PostHog dashboards
```

## 📞 Support & Monitoring

### Production Monitoring Setup

1. **Uptime Monitoring**: Configure external uptime monitoring
2. **Alert Configuration**: Set up alerts for critical failures
3. **Dashboard Setup**: Create monitoring dashboards
4. **Log Analysis**: Set up log aggregation and analysis

### Emergency Procedures

1. **Database Issues**: Contact Supabase support
2. **CDN Issues**: Check Vercel status
3. **External API Failures**: Monitor third-party status pages
4. **Performance Degradation**: Scale resources or enable emergency cache

---

## 🎯 Post-Deployment Verification

After deployment, verify these items:

- [ ] Health endpoint returns "healthy" status
- [ ] All external API integrations working
- [ ] Cron jobs executing successfully
- [ ] Error rates within acceptable limits
- [ ] Performance metrics meeting targets
- [ ] Security headers properly configured
- [ ] Cache warming functioning
- [ ] Monitoring systems receiving data

For additional support or questions about production deployment, refer to the monitoring dashboards or contact the development team.