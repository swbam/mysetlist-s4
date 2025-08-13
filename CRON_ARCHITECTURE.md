# 🕐 TheSet Cron Jobs Architecture

## 📋 Executive Summary

**All cron jobs are now handled exclusively by Vercel** for better code reuse, maintainability, and unified deployment.

---

## 🏗️ Architecture Decision

### **Why Vercel Instead of Supabase?**

After careful analysis, we chose to run all cron jobs through Vercel because:

1. **Code Reuse** ♻️
   - Direct access to `ArtistImportOrchestrator`
   - Shared `SpotifyClient`, `TicketmasterClient`, `SetlistFmClient`
   - Same error handling and monitoring (Sentry)
   - No code duplication between web app and cron jobs

2. **Developer Experience** 🛠️
   - Single deployment: `git push` deploys everything
   - Local testing: `pnpm dev` runs cron endpoints
   - Unified monitoring in Vercel dashboard
   - Same environment variables

3. **Performance** ⚡
   - 5-minute timeout (perfect for heavy operations)
   - 1GB memory allocation
   - Shared CDN/edge network
   - Built-in retry mechanisms

4. **Cost Efficiency** 💰
   - No additional compute costs
   - Included in Vercel plan
   - Shared resource allocation

---

## 📅 Current Cron Schedule

All times are in UTC:

| Job Name | Schedule | Frequency | Purpose |
|----------|----------|-----------|---------|
| `update-active-artists` | `0 */6 * * *` | Every 6 hours | Updates artists with recent activity |
| `trending-artist-sync` | `0 2 * * *` | Daily at 2 AM | Deep sync for top 100 trending artists |
| `complete-catalog-sync` | `0 3 * * 0` | Weekly Sunday 3 AM | Full catalog verification and cleanup |
| `calculate-trending` | `0 1 * * *` | Daily at 1 AM | Recalculates trending scores |
| `master-sync` | `0 4 * * *` | Daily at 4 AM | Orchestrated sync of all systems |
| `sync-artist-data` | `0 */12 * * *` | Every 12 hours | General artist data maintenance |
| `finish-mysetlist-sync` | `0 5 * * *` | Daily at 5 AM | Creates initial setlists for new shows |

---

## 🔧 Configuration

### **vercel.json**
```json
{
  "crons": [
    {
      "path": "/api/cron/update-active-artists",
      "schedule": "0 */6 * * *"
    },
    // ... other cron jobs
  ],
  "functions": {
    "apps/web/app/api/cron/*/route.ts": {
      "maxDuration": 300,
      "memory": 1024
    }
  }
}
```

### **Environment Variables**
```bash
CRON_SECRET=your-secure-secret  # Required for authentication
```

---

## 🧪 Testing Cron Jobs

### **Manual Trigger (Development)**
```bash
# Set your environment
CRON_SECRET="your-cron-secret"
BASE_URL="http://localhost:3001"

# Trigger a specific job
curl -X POST "${BASE_URL}/api/cron/calculate-trending" \
  -H "x-cron-secret: ${CRON_SECRET}"
```

### **Manual Trigger (Production)**
```bash
# Production URL
BASE_URL="https://your-domain.com"

# Trigger with authentication
curl -X POST "${BASE_URL}/api/cron/trending-artist-sync" \
  -H "x-cron-secret: ${CRON_SECRET}"
```

### **Monitoring Execution**
```bash
# Check cron health
curl "${BASE_URL}/api/monitoring/cron-health" \
  -H "x-admin-key: ${ADMIN_KEY}"
```

---

## 🗑️ Supabase Cleanup

### **What Was Removed**

1. **Edge Functions** (no longer needed):
   - `scheduled-sync`
   - `sync-artists`
   - `sync-setlists`
   - `sync-shows`
   - `sync-artist-shows`
   - `sync-concerts`
   - `sync-song-catalog`
   - `update-trending`

2. **Database Cron Jobs** (all unscheduled):
   - All `pg_cron` scheduled jobs
   - Trigger functions that called APIs
   - Sync orchestration functions

3. **What Remains**:
   - Read-only database functions
   - Essential stored procedures
   - Health check edge function

### **Cleanup Commands**
```bash
# Run the cleanup script
./cleanup-supabase-functions.sh

# Apply the cleanup migration
pnpm db:migrate

# Push to Supabase
supabase db push
```

---

## 📊 Performance Comparison

| Metric | Supabase Crons | Vercel Crons | Improvement |
|--------|----------------|--------------|-------------|
| Code Reuse | ❌ Duplicated | ✅ Shared | 100% |
| Deployment | 2 pipelines | 1 pipeline | 50% simpler |
| Monitoring | Split | Unified | Better visibility |
| Timeout | 60s | 300s | 5x longer |
| Memory | Variable | 1GB guaranteed | Consistent |
| Error Tracking | Manual | Sentry integrated | Automatic |

---

## 🚨 Troubleshooting

### **Cron Not Running**
1. Check `CRON_SECRET` in Vercel environment
2. Verify schedule in `vercel.json`
3. Check Vercel Functions logs
4. Test manual trigger

### **Authentication Errors**
```bash
# Verify secret matches
echo $CRON_SECRET
# Should match what's in Vercel dashboard
```

### **Timeout Issues**
- Max duration is 300 seconds (5 minutes)
- Consider splitting large operations
- Use batch processing

### **Rate Limiting**
- Spotify: 100 req/min
- Ticketmaster: 200 req/hour
- Implement proper delays

---

## 🔍 Monitoring & Logs

### **Vercel Dashboard**
1. Go to Functions tab
2. Filter by `/api/cron/*`
3. Check execution logs
4. Monitor duration and errors

### **Custom Monitoring**
```javascript
// Check last execution times
fetch('/api/monitoring/cron-health')
  .then(res => res.json())
  .then(data => console.log(data));
```

### **Alerting**
- Set up Vercel notifications
- Configure Sentry alerts
- Monitor error rates

---

## 📈 Future Improvements

1. **Smart Scheduling**
   - Adjust frequency based on activity
   - Skip inactive artists
   - Priority queue for popular content

2. **Performance Optimization**
   - Parallel processing
   - Incremental updates
   - Smart caching

3. **Monitoring Enhancement**
   - Custom metrics dashboard
   - Predictive failure detection
   - Auto-recovery mechanisms

---

## ✅ Migration Checklist

- [x] All Vercel cron jobs configured in `vercel.json`
- [x] Supabase cron jobs disabled via migration
- [x] Edge functions removed/archived
- [x] Documentation updated
- [x] Environment variables set
- [x] Manual testing completed
- [x] Monitoring configured
- [x] Team notified of changes

---

## 📞 Support

For issues with cron jobs:

1. Check this documentation
2. Review Vercel Function logs
3. Test manual triggers
4. Check environment variables
5. Review error tracking in Sentry

---

**Last Updated**: January 2025  
**Architecture Decision**: All cron jobs run exclusively on Vercel  
**Status**: ✅ Production Ready