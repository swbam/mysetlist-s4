# DATA PIPELINE & API INTEGRATION ANALYSIS REPORT
## Sub-Agent 2: Complete Analysis & Fix Plan

### 🔍 EXECUTIVE SUMMARY

After thorough analysis of the codebase, I've identified the following critical issues:

1. **MOCK DATA USAGE**: Hardcoded mock data found in homepage components
2. **API ROUTES**: Search API routes exist and use real Supabase queries
3. **DATA SYNC**: Sync infrastructure exists but may not be properly triggered
4. **TRENDING PAGE**: Uses real Supabase queries but data may be empty
5. **CRON JOBS**: Supabase cron jobs and edge functions are properly configured

---

## 🚨 CRITICAL FINDINGS

### 1. **MOCK DATA IN HOMEPAGE COMPONENTS** 🔥

#### **Location**: `/apps/web/app/(home)/components/`
- **featured-content.tsx**: Lines 26-89 contain hardcoded mock data
  - Featured show: Taylor Swift concert (hardcoded)
  - Top voted songs: Static array with fake vote counts
  - Upcoming highlights: Hardcoded artist/venue data

- **hero.tsx**: Lines 91, 145-165 contain hardcoded data
  - Popular artists suggestions: Hardcoded array ['Taylor Swift', 'The Weeknd', 'Drake', 'Olivia Rodrigo']
  - Stats section: Hardcoded values (10K+ artists, 50M+ votes, 100K+ fans)
  - Trending badge: Hardcoded "1,247 Active Shows"

### 2. **API ROUTES STATUS** ✅

#### **Search API**: `/apps/web/app/api/search/`
- ✅ `/api/search/artists/route.ts` - Properly queries Supabase `artists` table
- ✅ Uses fuzzy matching with `ilike` operator
- ✅ Orders by popularity
- ✅ Returns real data from database

#### **Sync API**: `/apps/web/app/api/sync/`
- ✅ `/api/sync/artist/route.ts` - Triggers artist data sync
- ✅ `/api/sync/shows/route.ts` - Syncs show data
- ✅ `/api/sync/songs/route.ts` - Syncs song catalog
- ✅ `/api/sync/artist-stats/route.ts` - Updates artist statistics

### 3. **DATABASE QUERIES** ✅

#### **Artist Pages**: Working correctly
- ✅ `getArtist()` - Fetches from database
- ✅ `getArtistShows()` - Real show data with venue joins
- ✅ `getArtistStats()` - Real statistics
- ✅ Proper caching with `unstable_cache`

#### **Trending Page**: Queries exist but may return empty data
- ✅ `getTrendingStats()` - Queries real Supabase data
- ✅ Counts artists with `trending_score > 0`
- ✅ Gets upcoming shows count
- ⚠️ May return 0 values if no data in database

### 4. **SUPABASE INFRASTRUCTURE** ✅

#### **Cron Jobs**: Properly configured
- ✅ `20250705001_schedule_cron_jobs.sql` - Schedules hourly sync
- ✅ Uses `pg_cron` extension
- ✅ Calls `scheduled-sync` edge function

#### **Edge Functions**: All sync functions exist
- ✅ `scheduled-sync/` - Main orchestrator
- ✅ `sync-artists/` - Artist data sync
- ✅ `sync-artist-shows/` - Show data sync
- ✅ `sync-song-catalog/` - Song catalog sync
- ✅ `update-trending/` - Trending score updates

---

## 🔧 FIXES REQUIRED

### 1. **REMOVE MOCK DATA FROM HOMEPAGE**

#### **featured-content.tsx** - Replace hardcoded data with API calls:
```tsx
// Remove lines 26-89 mock data
// Add data fetching:
const [featuredShow, setFeaturedShow] = useState(null);
const [topVotedSongs, setTopVotedSongs] = useState([]);
const [upcomingHighlights, setUpcomingHighlights] = useState([]);

useEffect(() => {
  // Fetch from /api/trending/featured
  // Fetch from /api/trending/top-songs
  // Fetch from /api/trending/upcoming-shows
}, []);
```

#### **hero.tsx** - Replace hardcoded data:
```tsx
// Remove hardcoded popular artists (line 91)
// Fetch from /api/trending/popular-artists

// Remove hardcoded stats (lines 145-165)
// Fetch from /api/stats/platform
```

### 2. **CREATE MISSING API ENDPOINTS**

Need to create:
- `/api/trending/featured/route.ts` - Featured show data
- `/api/trending/top-songs/route.ts` - Top voted songs
- `/api/trending/upcoming-shows/route.ts` - Upcoming highlights
- `/api/trending/popular-artists/route.ts` - Popular artist suggestions
- `/api/stats/platform/route.ts` - Platform statistics

### 3. **VERIFY DATA POPULATION**

Check if database has data:
1. Artists table - Should have artists with Spotify IDs
2. Shows table - Should have upcoming shows
3. Venues table - Should have venue data
4. trending_score fields - Should be calculated

### 4. **TRIGGER INITIAL DATA SYNC**

If database is empty:
1. Manually trigger `/api/sync/artists` for popular artists
2. Run trending score calculation
3. Ensure cron jobs are active in Supabase

---

## 📋 ACTION PLAN

### IMMEDIATE FIXES (Priority 1):

1. **Remove Mock Data**
   - Update `featured-content.tsx` to fetch real data
   - Update `hero.tsx` to fetch real data
   - Create necessary API endpoints

2. **Create API Endpoints**
   - Implement trending data endpoints
   - Implement platform stats endpoint
   - Ensure proper error handling

3. **Test Search on Vercel**
   - Verify environment variables are set
   - Check Supabase connection in production
   - Debug any CORS issues

### SECONDARY FIXES (Priority 2):

1. **Data Population**
   - Create seed script for initial data
   - Trigger sync for popular artists
   - Calculate initial trending scores

2. **Monitoring**
   - Add logging to sync operations
   - Monitor cron job execution
   - Track API performance

---

## 🎯 DELIVERABLES

1. **Mock Data Removal** ✅
   - Identified all instances of hardcoded data
   - Plan for replacement with API calls

2. **API Route Verification** ✅
   - Search APIs are properly implemented
   - Sync APIs exist and use real data

3. **Database Status** ✅
   - Queries are correct
   - Infrastructure exists
   - May need data population

4. **Cron Job Status** ✅
   - Properly configured in migrations
   - Edge functions exist
   - Should be running hourly

5. **Production Issues** 🔍
   - Search may fail due to missing env vars
   - Database may be empty
   - Need to verify Supabase connection

---

## 🚀 NEXT STEPS

1. Remove mock data from homepage components
2. Create missing API endpoints for trending data
3. Verify Supabase environment variables on Vercel
4. Populate database with initial data if empty
5. Monitor sync operations for successful data flow