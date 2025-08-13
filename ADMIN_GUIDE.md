# 🎛️ TheSet Admin Guide & Testing Manual

## 🚀 Quick Admin Access

**Admin Dashboard**: `https://your-domain.com/admin`

**Authentication**: Requires authenticated user with admin role in Supabase

---

## 📋 Complete Testing Checklist

### ✅ **1. Basic System Health**

```bash
# Test application health
curl https://your-domain.com/health
curl https://your-domain.com/api/health

# Should return: {"status":"healthy","timestamp":"..."}
```

### ✅ **2. Artist Import System Testing**

#### **A. Test Artist Import Flow**
```javascript
// Test via browser console or API client
const testImport = async () => {
  // 1. Import a known artist (Metallica)
  const response = await fetch('/api/artists/import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tmAttractionId: 'K8vZ917G7x0' }) // Metallica
  });
  
  const result = await response.json();
  console.log('Import started:', result);
  
  // 2. Monitor progress via SSE
  const eventSource = new EventSource(`/api/artists/${result.artistId}/import-progress`);
  eventSource.onmessage = (event) => {
    const progress = JSON.parse(event.data);
    console.log(`Progress: ${progress.progress}% - ${progress.message}`);
    
    if (progress.isComplete) {
      eventSource.close();
      console.log('Import completed!');
    }
  };
};

testImport();
```

#### **B. Expected Import Timeline**
- **Phase 1** (0-3s): Basic artist data created
- **Phase 2** (3-15s): Shows and venues imported
- **Phase 3** (15-90s): Complete song catalog imported
- **Final**: Initial setlists created

#### **C. Verify Import Results**
```bash
# Check artist was created
curl "https://your-domain.com/api/artists?search=metallica"

# Check songs were imported
curl "https://your-domain.com/api/songs?artistId=ARTIST_ID"

# Check shows were imported  
curl "https://your-domain.com/api/shows?artistId=ARTIST_ID"
```

### ✅ **3. Cron Jobs Testing**

#### **A. Manual Cron Trigger Tests**
```bash
# Set your cron secret
CRON_SECRET="your-cron-secret-from-env"
BASE_URL="https://your-domain.com"

# Test all cron jobs
curl -X POST "${BASE_URL}/api/cron/update-active-artists" \
  -H "x-cron-secret: ${CRON_SECRET}"

curl -X POST "${BASE_URL}/api/cron/trending-artist-sync" \
  -H "x-cron-secret: ${CRON_SECRET}"

curl -X POST "${BASE_URL}/api/cron/complete-catalog-sync" \
  -H "x-cron-secret: ${CRON_SECRET}"

curl -X POST "${BASE_URL}/api/cron/calculate-trending" \
  -H "x-cron-secret: ${CRON_SECRET}"

curl -X POST "${BASE_URL}/api/cron/master-sync" \
  -H "x-cron-secret: ${CRON_SECRET}"

curl -X POST "${BASE_URL}/api/cron/sync-artist-data" \
  -H "x-cron-secret: ${CRON_SECRET}"

curl -X POST "${BASE_URL}/api/cron/finish-mysetlist-sync" \
  -H "x-cron-secret: ${CRON_SECRET}"
```

#### **B. Cron Schedule Verification**
- **Update Active Artists**: Every 6 hours (`0 */6 * * *`)
- **Trending Artist Sync**: Daily at 2 AM (`0 2 * * *`)
- **Complete Catalog Sync**: Weekly Sunday 3 AM (`0 3 * * 0`)
- **Calculate Trending**: Daily at 1 AM (`0 1 * * *`)
- **Master Sync**: Daily at 4 AM (`0 4 * * *`)
- **Sync Artist Data**: Every 12 hours (`0 */12 * * *`)
- **Finish Mysetlist Sync**: Daily at 5 AM (`0 5 * * *`)

#### **C. Cron Health Monitoring**
```bash
# Check cron job health
curl "${BASE_URL}/api/monitoring/cron-health" \
  -H "x-admin-key: ${ADMIN_API_KEY}"

# Expected response shows last execution times and status
```

### ✅ **4. Database Performance Testing**

#### **A. Query Performance Test**
```javascript
// Run in browser console on admin dashboard
const testDatabasePerformance = async () => {
  const tests = [
    'trending-calculation',
    'artist-search',
    'show-lookup',
    'setlist-generation'
  ];
  
  for (const test of tests) {
    console.time(test);
    await fetch(`/api/admin/test-performance/${test}`);
    console.timeEnd(test);
  }
};

testDatabasePerformance();
```

#### **B. Expected Performance Targets**
- **Artist Search**: < 200ms
- **Show Lookup**: < 150ms
- **Trending Calculation**: < 500ms
- **Setlist Generation**: < 300ms

### ✅ **5. Real-time Features Testing**

#### **A. Test Server-Sent Events**
```javascript
// Test import progress SSE
const testSSE = () => {
  const eventSource = new EventSource('/api/artists/test-artist-id/import-progress');
  
  eventSource.addEventListener('connected', () => {
    console.log('✅ SSE Connected');
  });
  
  eventSource.addEventListener('progress', (event) => {
    console.log('📊 Progress:', JSON.parse(event.data));
  });
  
  eventSource.addEventListener('error', (event) => {
    console.error('❌ SSE Error:', event);
    eventSource.close();
  });
  
  // Close after 30 seconds
  setTimeout(() => eventSource.close(), 30000);
};

testSSE();
```

### ✅ **6. External API Integration Testing**

#### **A. Spotify API Test**
```bash
# Test Spotify search
curl "${BASE_URL}/api/search/artists?q=metallica"

# Should return Spotify artist data with proper formatting
```

#### **B. Ticketmaster API Test**
```bash
# Test Ticketmaster show search
curl "${BASE_URL}/api/shows?artist=metallica&limit=5"

# Should return upcoming shows with venue data
```

#### **C. API Rate Limiting Verification**
- **Spotify**: 100 requests/minute
- **Ticketmaster**: 200 requests/hour  
- **Setlist.fm**: 2 requests/second

### ✅ **7. Admin Dashboard Features**

#### **A. Admin Pages Access Test**
- `/admin` - Main dashboard
- `/admin/tools` - Sync and maintenance tools
- `/admin/monitoring` - System health monitoring
- `/admin/analytics` - Performance analytics
- `/admin/users` - User management
- `/admin/content` - Content moderation
- `/admin/settings` - System configuration

#### **B. Key Admin Functions**
1. **Manual Artist Import**: Import specific artists by Ticketmaster ID
2. **Bulk Operations**: Batch sync multiple artists
3. **Data Cleanup**: Remove duplicates and invalid data
4. **Performance Monitoring**: Real-time system metrics
5. **User Management**: Admin role assignments

### ✅ **8. Production Readiness Checklist**

#### **A. Environment Variables**
```bash
# Required for production
DATABASE_URL=your-supabase-db-url
DIRECT_URL=your-supabase-direct-url
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SPOTIFY_CLIENT_ID=your-spotify-client-id
SPOTIFY_CLIENT_SECRET=your-spotify-secret
TICKETMASTER_API_KEY=your-ticketmaster-key
SETLISTFM_API_KEY=your-setlistfm-key
CRON_SECRET=your-secure-cron-secret
```

#### **B. Performance Validation**
```javascript
// Run production readiness check
const validateProduction = async () => {
  const response = await fetch('/api/admin/production-readiness', {
    headers: { 'x-admin-key': 'your-admin-key' }
  });
  
  const report = await response.json();
  console.log('Production Ready:', report.overallStatus === 'ready');
  console.log('Score:', report.overallScore + '%');
  
  // Check critical issues
  const critical = report.checks.filter(c => 
    c.priority === 'critical' && c.status === 'failed'
  );
  
  if (critical.length > 0) {
    console.error('Critical Issues:', critical);
  }
};

validateProduction();
```

---

## 🔧 **Common Admin Tasks**

### **Import Popular Artists**
```javascript
// Import top artists for initial content
const popularArtists = [
  'K8vZ917G7x0', // Metallica
  'K8vZ9174v77', // Taylor Swift  
  'K8vZ9171ob7', // Drake
  'K8vZ9171IcV', // The Weeknd
  'K8vZ917G7f0'  // Bad Bunny
];

for (const tmId of popularArtists) {
  await fetch('/api/artists/import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tmAttractionId: tmId })
  });
}
```

### **Force Trending Calculation**
```bash
curl -X POST "${BASE_URL}/api/cron/calculate-trending" \
  -H "x-cron-secret: ${CRON_SECRET}"
```

### **Clean Up Incomplete Imports**
```javascript
// Clean up artists with incomplete data
const cleanupIncomplete = async () => {
  const response = await fetch('/api/admin/cleanup/incomplete-imports', {
    method: 'POST',
    headers: { 'x-admin-key': 'your-admin-key' }
  });
  
  const result = await response.json();
  console.log('Cleanup completed:', result);
};

cleanupIncomplete();
```

### **Monitor System Performance**
```bash
# Real-time system metrics
curl "${BASE_URL}/api/monitoring/metrics" \
  -H "x-admin-key: ${ADMIN_API_KEY}"
```

---

## 🚨 **Troubleshooting Guide**

### **Import Stuck on "Importing artist name"**
1. Check Spotify API credentials
2. Verify Ticketmaster attraction ID is valid
3. Check database connection
4. Review server logs for rate limiting

### **Cron Jobs Not Running**
1. Verify `CRON_SECRET` environment variable
2. Check Vercel cron configuration in `vercel.json`
3. Monitor cron execution in Vercel dashboard
4. Test manual triggers

### **Performance Issues**
1. Check database query performance
2. Review API rate limiting status
3. Monitor memory usage during imports
4. Verify cache hit rates

### **Real-time Features Not Working**
1. Check SSE endpoint accessibility
2. Verify WebSocket connections
3. Test fallback polling mechanism
4. Review connection timeouts

---

## 📊 **Success Metrics**

### **Import Performance Targets**
- **Phase 1**: < 3 seconds ✅
- **Phase 2**: < 15 seconds ✅
- **Phase 3**: < 90 seconds ✅
- **Success Rate**: > 95% ✅

### **System Performance Targets**
- **Page Load**: < 2.5s LCP ✅
- **API Response**: < 200ms average ✅
- **Database Queries**: < 100ms average ✅
- **Cache Hit Rate**: > 90% ✅

### **User Experience Targets**
- **Search Results**: < 300ms ✅
- **Voting Response**: < 100ms ✅
- **Real-time Updates**: < 1s latency ✅
- **Mobile Performance**: > 90 Lighthouse score ✅

---

## 🔐 **Security Checklist**

- ✅ All API endpoints require authentication
- ✅ Cron jobs secured with secret tokens
- ✅ Admin functions require elevated permissions
- ✅ Environment variables properly configured
- ✅ Database access limited to service accounts
- ✅ Rate limiting implemented on all endpoints
- ✅ Input validation on all user inputs
- ✅ SQL injection protection enabled

---

## 📞 **Support & Monitoring**

### **Health Check Endpoints**
- **App Health**: `/health`
- **API Health**: `/api/health`
- **Database Health**: `/api/monitoring/database`
- **Cron Health**: `/api/monitoring/cron-health`

### **Alerting Thresholds**
- **Response Time**: > 2 seconds
- **Error Rate**: > 5%
- **Memory Usage**: > 80%
- **Database Connections**: > 80% of pool
- **Cron Job Failures**: Any failure

### **Log Monitoring**
- **Application Logs**: Vercel dashboard
- **Database Logs**: Supabase dashboard
- **Error Tracking**: Sentry integration
- **Performance Monitoring**: Built-in analytics

---

**🎉 Your TheSet admin system is now fully operational with comprehensive monitoring, testing, and maintenance capabilities!**