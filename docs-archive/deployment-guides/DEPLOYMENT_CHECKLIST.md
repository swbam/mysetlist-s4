# MySetlist Deployment Checklist

This checklist ensures that MySetlist is 100% production-ready before deployment.

## 🚨 Critical Pre-Deployment Checks

### Environment Configuration

- [ ] All required environment variables are set in `.env.production`
- [ ] Vercel environment variables are synchronized
- [ ] Database connection string is valid
- [ ] All API keys are configured (Spotify, Ticketmaster, Setlist.fm)
- [ ] NEXTAUTH_SECRET is set and secure
- [ ] NEXT_PUBLIC_SITE_URL matches production domain

### Code Quality

- [ ] TypeScript compilation passes with no errors
- [ ] ESLint passes with no errors
- [ ] All tests pass
- [ ] No console.log statements in production code
- [ ] Error boundaries are in place
- [ ] Loading states are implemented

### Database

- [ ] All migrations have been run
- [ ] Database schema is up to date
- [ ] Indexes are created for performance
- [ ] Row Level Security is enabled
- [ ] Backup strategy is in place

### Build & Performance

- [ ] Production build completes successfully
- [ ] Bundle size is optimized
- [ ] Images are optimized
- [ ] Lighthouse score ≥ 90
- [ ] No 500 errors on any page
- [ ] All pages load in < 3 seconds

### Security

- [ ] Authentication is working correctly
- [ ] CSRF protection is enabled
- [ ] Security headers are configured
- [ ] API rate limiting is in place
- [ ] Sensitive data is not exposed in client bundles

## 🚀 Deployment Process

### 1. Run Pre-Deployment Verification

```bash
# Quick check
./scripts/quick-production-check.sh

# Comprehensive check
pnpm deploy:checklist
```

### 2. Build and Test Locally

```bash
# Build the application
pnpm build

# Run production build locally
pnpm start

# Test critical flows
pnpm deploy:verify
```

### 3. Deploy to Production

```bash
# Interactive deployment guide
pnpm deploy:guide

# OR manual deployment
pnpm vercel:prod
```

### 4. Post-Deployment Verification

```bash
# Set production URL
export NEXT_PUBLIC_SITE_URL=https://mysetlist-sonnet.vercel.app

# Run verification tests
pnpm deploy:verify

# Check health endpoint
pnpm deploy:health
```

## ✅ Post-Deployment Checklist

### Immediate Verification (0-5 minutes)

- [ ] Homepage loads without errors
- [ ] Search functionality works
- [ ] Artist pages load
- [ ] Shows pages load
- [ ] Trending page displays data
- [ ] Authentication flow works
- [ ] No console errors in browser

### Short-term Monitoring (5-30 minutes)

- [ ] Monitor error logs for any issues
- [ ] Check database query performance
- [ ] Verify API response times
- [ ] Test on mobile devices
- [ ] Check memory usage
- [ ] Verify caching is working

### Long-term Monitoring (24-48 hours)

- [ ] Monitor Sentry for errors
- [ ] Check performance metrics
- [ ] Review user feedback
- [ ] Monitor API rate limits
- [ ] Check database growth
- [ ] Verify scheduled jobs are running

## 🔄 Rollback Plan

If critical issues are discovered:

### 1. Immediate Rollback

```bash
# Rollback to previous deployment
vercel rollback

# OR use deployment guide
pnpm deploy:guide
# Select rollback option
```

### 2. Identify Previous Working Deployment

```bash
# List recent deployments
vercel ls --limit 10

# Promote specific deployment
vercel alias set <deployment-url> <production-domain>
```

### 3. Post-Rollback Actions

- [ ] Document the issue that caused rollback
- [ ] Create hotfix branch
- [ ] Test fix thoroughly in staging
- [ ] Re-deploy with fix

## 📊 Success Criteria

The deployment is considered successful when:

1. **All pages load without 500 errors**
2. **Search returns relevant results**
3. **Database queries complete in < 1 second**
4. **API endpoints respond with correct data**
5. **No critical errors in logs**
6. **User authentication works**
7. **Real-time features function correctly**

## 🛠️ Troubleshooting Common Issues

### Build Failures

```bash
# Clear cache and rebuild
rm -rf apps/web/.next
pnpm clean
pnpm install
pnpm build
```

### Environment Variable Issues

```bash
# Verify all variables
pnpm check:env

# Pull from Vercel
vercel env pull .env.production

# Validate configuration
pnpm validate:env
```

### Database Connection Issues

```bash
# Test database connection
pnpm tsx scripts/check-database.ts

# Check Supabase status
curl https://status.supabase.com
```

### Performance Issues

```bash
# Run Lighthouse audit
pnpm perf:lighthouse

# Analyze bundle size
pnpm analyze:web

# Check for memory leaks
pnpm tsx scripts/check-memory-usage.ts
```

## 📝 Notes

- Always deploy during low-traffic periods when possible
- Have the team on standby for the first 30 minutes after deployment
- Keep communication channels open during deployment
- Document any issues or learnings for future deployments
- Update this checklist based on deployment experiences

---

**Last Updated**: [Current Date]
**Version**: 1.0.0
