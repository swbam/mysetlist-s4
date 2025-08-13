# TheSet Deployment Guide

## 🚀 Production Deployment Checklist

### Prerequisites
- [ ] Vercel account connected to GitHub repository
- [ ] Supabase project created (ID: yzwkimtdaabyjbpykquu)
- [ ] All environment variables configured in Vercel
- [ ] API keys obtained for Spotify, Ticketmaster, SetlistFM

### Environment Variables Required

```bash
# Database
DATABASE_URL=postgresql://postgres:[password]@db.yzwkimtdaabyjbpykquu.supabase.co:5432/postgres
DIRECT_URL=postgresql://postgres:[password]@db.yzwkimtdaabyjbpykquu.supabase.co:5432/postgres?pgbouncer=true

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://yzwkimtdaabyjbpykquu.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[your-anon-key]
SUPABASE_SERVICE_ROLE_KEY=[your-service-role-key]
SUPABASE_JWT_SECRET=[your-jwt-secret]

# External APIs
SPOTIFY_CLIENT_ID=[your-spotify-client-id]
SPOTIFY_CLIENT_SECRET=[your-spotify-client-secret]
NEXT_PUBLIC_SPOTIFY_CLIENT_ID=[your-spotify-client-id]
TICKETMASTER_API_KEY=[your-ticketmaster-api-key]
SETLISTFM_API_KEY=[your-setlistfm-api-key]

# Cron Jobs
CRON_SECRET=6155002300
NEXT_PUBLIC_CRON_SECRET=6155002300

# URLs
NEXT_PUBLIC_APP_URL=https://mysetlist-sonnet.vercel.app
NEXT_PUBLIC_WEB_URL=https://mysetlist-sonnet.vercel.app
NEXT_PUBLIC_API_URL=https://mysetlist-sonnet.vercel.app/api
```

### Deployment Steps

1. **Deploy to Vercel**
   ```bash
   # Push to main branch
   git add .
   git commit -m "Deploy TheSet v1.0.0"
   git push origin main
   ```

2. **Configure Supabase**
   - Go to Supabase Dashboard
   - Navigate to Authentication → URL Configuration
   - Add site URL: `https://mysetlist-sonnet.vercel.app`
   - Add redirect URLs:
     - `https://mysetlist-sonnet.vercel.app/*`
     - `https://mysetlist-sonnet.vercel.app/auth/callback`
     - `https://mysetlist-sonnet.vercel.app/auth/callback/spotify`

3. **Set Up Cron Jobs**
   - Cron jobs are managed by Supabase pg_cron
   - Run the migration: `supabase/migrations/20250107_fix_cron_job_urls.sql`
   - Jobs will run automatically:
     - Hourly sync: Every hour at :15
     - Song sync: Every hour at :45
     - Trending calculation: Every 2 hours
     - Deep sync: Daily at 2:30 AM UTC

4. **Initial Data Population**
   - After deployment, trigger initial sync:
   ```bash
   curl -X POST "https://mysetlist-sonnet.vercel.app/api/sync" \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer 6155002300" \
     -d '{"type": "all", "limit": 50}'
   ```

5. **Verify Deployment**
   - Check health: `https://mysetlist-sonnet.vercel.app/api/system/health-check`
   - Visit homepage: `https://mysetlist-sonnet.vercel.app`
   - Test search functionality
   - Verify artist pages load with data
   - Check trending page

### Post-Deployment Monitoring

1. **Vercel Dashboard**
   - Monitor function logs
   - Check error rates
   - Review performance metrics

2. **Supabase Dashboard**
   - Monitor database usage
   - Check cron job execution
   - Review authentication logs

3. **Health Checks**
   - API Health: `/api/system/health-check`
   - Cron Status: Check Supabase logs
   - Data Sync: Monitor `sync_jobs` table

### Troubleshooting

**Issue: No data showing**
- Run manual sync via API
- Check cron job execution in Supabase
- Verify API keys are correct

**Issue: Search not working**
- Check Supabase connection
- Verify database has data
- Check browser console for errors

**Issue: Authentication failing**
- Verify Supabase redirect URLs
- Check Spotify OAuth settings
- Ensure JWT secret matches

### Performance Optimization

- ISR enabled for artist pages (1 hour)
- Static generation for top 50 artists
- CDN caching for API responses
- Optimized bundle splitting
- Image optimization enabled

### Security Notes

- All API routes require authentication for mutations
- Cron endpoints protected by bearer token
- CSP headers configured
- Rate limiting enabled
- CORS properly configured

## 📊 Production Metrics

Target performance:
- Lighthouse Score: ≥90
- First Contentful Paint: <1.5s
- Time to Interactive: <3s
- API Response Time: <500ms

## 🎉 Launch Checklist

- [ ] All environment variables set in Vercel
- [ ] Database migrations applied
- [ ] Cron jobs active and running
- [ ] Initial data sync completed
- [ ] Health check passing
- [ ] Search functionality working
- [ ] Artist pages loading
- [ ] Authentication flow tested
- [ ] Performance metrics met
- [ ] Monitoring configured

## Support

For issues or questions:
- Check Vercel function logs
- Review Supabase logs
- Monitor `/api/system/health-check`
- Check browser console for client errors
