# SYNC SYSTEM QUICK REFERENCE

## 🚀 Quick Start

### Test the Sync System
```bash
# Run verification tests
npx tsx test-sync-system.ts

# Test with development server
npm run dev
npx tsx verify-sync-functionality.ts
```

### Key API Endpoints
```bash
# Sync Pipeline Status
GET /api/sync/unified-pipeline

# Artist Auto-Import
POST /api/artists/auto-import
{
  "artistId": "uuid",
  "artistName": "Artist Name",
  "spotifyId": "spotify_id"
}

# Unified Sync
POST /api/sync/unified-pipeline  
{
  "artistId": "uuid",
  "mode": "single"
}

# Cron Jobs
GET /api/cron/trending-update
GET /api/cron/daily-sync
```

## 📁 File Structure

### Core Sync Files
```
apps/web/app/api/sync/unified-pipeline/
├── route.ts          # API endpoint
├── sync-service.ts   # Core logic
└── enhanced-sync-service.ts

apps/web/app/api/artists/auto-import/
└── route.ts          # Auto-import logic

apps/web/app/api/cron/
├── trending-update/route.ts
├── daily-sync/route.ts
└── hourly-update/route.ts
```

### Database Integration
```
packages/database/src/schema/
├── artists.ts        # Artist schema
├── shows.ts          # Show schema
├── venues.ts         # Venue schema
├── setlists.ts       # Setlist schema
└── relations.ts      # Relationships
```

## 🔧 Configuration

### Required Environment Variables
```env
# API Keys
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
TICKETMASTER_API_KEY=your_ticketmaster_key
SETLISTFM_API_KEY=your_setlistfm_key

# Database
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SUPABASE_ANON_KEY=your_anon_key

# Cron Security
CRON_SECRET=your_cron_secret
```

### Rate Limits
- **Spotify**: 90 requests/minute
- **Ticketmaster**: 200 requests/hour  
- **SetlistFM**: 1 request/second

## 🎯 How It Works

### Artist Auto-Import Flow
1. User clicks on artist in search results
2. System checks if artist exists in database
3. If not exists, creates artist record
4. Checks if sync needed (24h interval)
5. Triggers unified sync pipeline
6. Returns artist data with stats

### Unified Sync Pipeline
1. **Spotify**: Artist metadata, top tracks
2. **Ticketmaster**: Show data, venue info
3. **SetlistFM**: Historical setlists
4. **Statistics**: Calculate artist stats
5. **Progress**: Track sync progress

### Cron Jobs
- **Trending Update**: Recalculate trending scores
- **Daily Sync**: Sync popular artists
- **Hourly Update**: Update show data
- **Email Processing**: Handle email queue

## 🛠️ Common Tasks

### Add New Artist
```typescript
// Auto-import from frontend
const response = await fetch('/api/artists/auto-import', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    artistName: 'Artist Name',
    spotifyId: 'optional_spotify_id'
  })
});
```

### Manual Sync
```typescript
// Sync specific artist
const response = await fetch('/api/sync/unified-pipeline', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    artistId: 'artist-uuid',
    mode: 'single'
  })
});
```

### Bulk Operations
```typescript
// Sync multiple artists
const response = await fetch('/api/sync/unified-pipeline', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    artistIds: ['uuid1', 'uuid2', 'uuid3'],
    mode: 'bulk'
  })
});
```

## 🔍 Troubleshooting

### Common Issues
1. **API Rate Limits**: Check rate limiting in sync-service.ts
2. **Database Connection**: Verify Supabase credentials
3. **Missing Data**: Check external API keys
4. **Sync Failures**: Review error logs in sync progress

### Debug Commands
```bash
# Check API health
curl http://localhost:3000/api/health

# Test sync pipeline
curl http://localhost:3000/api/sync/unified-pipeline

# Check database connection
curl http://localhost:3000/api/health/db
```

## 📊 Monitoring

### Key Metrics
- Sync success/failure rates
- API response times
- Database query performance
- External API rate limit usage

### Log Files
- Development: Console logs
- Production: Sentry integration
- Database: Supabase logs
- Sync Progress: Real-time tracking

## 🎉 Success Indicators

### System Health
- [x] All API endpoints respond correctly
- [x] Database connections stable
- [x] External API integrations working
- [x] Cron jobs running on schedule
- [x] Sync operations completing successfully

### Data Quality
- [x] Artists have complete profiles
- [x] Shows linked to correct venues
- [x] Setlists populated with songs
- [x] Statistics calculated accurately
- [x] Relationships maintained properly

*Quick Reference for MySetlist Sync System*