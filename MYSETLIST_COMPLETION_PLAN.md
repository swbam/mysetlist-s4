# MySetlist Completion Plan - 100% Functional App

## ✅ Completed Items
- [x] ArtistImportOrchestrator created with phase-based import
- [x] SSE progress tracking implemented
- [x] Basic import API working
- [x] Database schema exists with proper tables
- [x] 14 artists in database
- [x] 425 artist_songs connections
- [x] 136 shows in database
- [x] Documentation updated with complete sync system architecture

## 🔴 Critical Issues to Fix

### Priority 1: Connect Frontend to Real Database Data
- [ ] Fix `/api/stats/route.ts` to query actual database instead of hardcoded values
- [ ] Update homepage to show real active show count
- [ ] Fix artist pages to display actual shows from database
- [ ] Implement proper show filtering (upcoming vs past)

### Priority 2: Artist Page Show Display
- [ ] Create `getArtistShows()` function to query database
- [ ] Fix artist page components to fetch and display shows
- [ ] Add upcoming/past show filtering logic
- [ ] Connect venue data to show displays

### Priority 3: SetlistFM Integration
- [ ] Create SetlistFM client in external-apis package
- [ ] Implement `/api/cron/sync-past-setlists` endpoint
- [ ] Create `actual_setlists` table for storing real setlist data
- [ ] Build service to fetch actual setlists for completed shows
- [ ] Update show status from "upcoming" to "completed" after show date

### Priority 4: Cron Job Implementation
- [ ] `/api/cron/sync-active-artists` - Every 6 hours
- [ ] `/api/cron/sync-past-setlists` - Daily at 2 AM
- [ ] `/api/cron/sync-trending` - Every 4 hours
- [ ] `/api/cron/deep-catalog-refresh` - Weekly
- [ ] `/api/cron/cleanup-old-data` - Monthly
- [ ] Add cron secret verification to all endpoints

### Priority 5: Complete Import Orchestrator
- [ ] Implement parallel processing for Phase 2
- [ ] Fix live track filtering in song import
- [ ] Add setlist generation logic
- [ ] Ensure progress tracking updates properly

## 📋 Implementation Steps

### Step 1: Fix Homepage Stats (Immediate)
1. Update `/api/stats/route.ts` to query real data
2. Test homepage displays actual counts
3. Verify caching works properly

### Step 2: Fix Artist Shows Display
1. Create database query functions for shows
2. Update artist page components
3. Add proper filtering and sorting
4. Test show display on artist pages

### Step 3: Implement SetlistFM Integration
1. Add SetlistFM API client
2. Create sync service for past setlists
3. Build cron job for daily sync
4. Test actual setlist import

### Step 4: Setup All Cron Jobs
1. Create all cron endpoints
2. Add authentication/security
3. Configure Vercel cron in vercel.json
4. Test each cron job

### Step 5: Complete Import System
1. Add parallel processing
2. Fix song filtering
3. Implement setlist generation
4. Test full import flow

## 🎯 Success Metrics
- Homepage shows real data from database ✅
- Artist pages display actual shows ✅
- Past shows have real setlists from SetlistFM ✅
- Cron jobs keep data fresh automatically ✅
- Import completes in < 90 seconds ✅
- All hardcoded/fake data removed ✅

## 🚀 Deployment Checklist
- [ ] All TypeScript errors resolved
- [ ] Environment variables configured
- [ ] Cron jobs scheduled in Vercel
- [ ] Database migrations applied
- [ ] Performance targets met
- [ ] Error handling comprehensive

## Timeline
- **Phase 1** (Now): Fix frontend to show real data (30 min)
- **Phase 2** (Next): Artist page shows (1 hour)
- **Phase 3** (Then): SetlistFM integration (2 hours)
- **Phase 4** (After): Cron jobs (1 hour)
- **Phase 5** (Finally): Complete import system (1 hour)

**Total Estimated Time**: 5-6 hours to 100% functional
