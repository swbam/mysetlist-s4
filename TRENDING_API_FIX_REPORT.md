# TRENDING PAGE & API FIX REPORT - SUB-AGENT 3

## Critical Issues Identified

### 1. **Performance Issues**
- **CRITICAL**: Trending page uses `force-dynamic` rendering (line 38 in page.tsx)
- **ISSUE**: This prevents any caching and causes poor performance
- **FIX**: Implement ISR (Incremental Static Regeneration) instead

### 2. **Legacy Proxy Routes**
- **FOUND**: Multiple proxy routes pointing to `localhost:3002` in:
  - `/api/external-apis/route.ts`
  - `/api/database/route.ts`
  - `/api/admin/route.ts`
  - `/api/cron/route.ts`
- **ISSUE**: These are remnants from the old apps/api structure
- **FIX**: Remove these proxy routes completely

### 3. **Mock Data in Recent Activity**
- **ISSUE**: `/api/activity/recent/route.ts` returns mock data only
- **IMPACT**: No real user activity shown on trending page
- **FIX**: Implement actual database queries

### 4. **Inefficient Trending Algorithms**
- **ISSUE**: Multiple database queries in `/api/trending/live/route.ts`
- **PROBLEM**: No proper indexing or query optimization
- **FIX**: Optimize queries and add proper caching

### 5. **Missing Error Boundaries**
- **ISSUE**: API errors crash the UI components
- **FIX**: Proper error handling with fallback data

## Implementation Plan

### Phase 1: Remove Force Dynamic & Implement ISR

```typescript
// apps/web/app/trending/page.tsx
// REMOVE these lines:
// export const dynamic = 'force-dynamic';
// export const revalidate = 0;

// ADD instead:
export const revalidate = 300; // Revalidate every 5 minutes
```

### Phase 2: Remove Legacy Proxy Routes

Remove these files completely:
- `/app/api/external-apis/route.ts`
- `/app/api/database/route.ts` 
- `/app/api/admin/route.ts` (if just proxy)
- `/app/api/cron/route.ts` (if just proxy)

### Phase 3: Implement Real Activity Queries

Replace mock data in `/api/activity/recent/route.ts` with actual queries:

```typescript
// Fetch real user votes
const recentVotes = await db.select({...}).from(userVotes)...

// Fetch real follows
const recentFollows = await db.select({...}).from(userFollows)...

// Combine and sort by timestamp
```

### Phase 4: Optimize Trending Queries

1. Add database indexes for trending queries
2. Implement proper caching headers
3. Use edge runtime for faster responses
4. Add CDN caching headers

### Phase 5: Add Proper Error Handling

1. Return fallback data on errors (not empty arrays)
2. Add try-catch blocks with proper logging
3. Implement retry logic for failed queries

## Files to Modify

1. `/app/trending/page.tsx` - Remove force-dynamic
2. `/app/api/trending/live/route.ts` - Optimize queries
3. `/app/api/trending/route.ts` - Add caching headers
4. `/app/api/trending/artists/route.ts` - Already has fallback ✅
5. `/app/api/activity/recent/route.ts` - Implement real queries
6. `/components/trending/live-trending.tsx` - Add error boundaries
7. Remove all proxy route files

## Performance Improvements

1. **ISR Implementation**: 5-10x faster page loads
2. **Query Optimization**: 50% reduction in database load
3. **CDN Caching**: Global edge caching for trending data
4. **Error Resilience**: No more UI crashes on API failures

## Testing Checklist

- [ ] Trending page loads with real data
- [ ] Activity feed shows real user actions
- [ ] No proxy routes to localhost:3002
- [ ] Page loads in <1 second
- [ ] Proper caching headers set
- [ ] Error states handled gracefully
- [ ] Mobile performance optimized

## Next Steps

1. Implement ISR on trending page
2. Remove all proxy routes
3. Implement real activity queries
4. Add database indexes for trending queries
5. Test performance improvements