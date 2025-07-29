# 🚨 MySetlist Immediate Actions Checklist

## 🔥 DO THESE RIGHT NOW (Under 1 Hour Total)

### 1. Fix Logo Link (2 minutes) ✅
```typescript
// File: /apps/web/components/layout/header.tsx or similar
// Find the Logo component and wrap it with Link

import Link from 'next/link';

// Change from:
<Logo className="h-8 w-8" />

// To:
<Link href="/" className="flex items-center">
  <Logo className="h-8 w-8 cursor-pointer" />
</Link>
```

### 2. Create Missing Index Pages (5 minutes) ✅
```typescript
// Create: /apps/web/app/artists/page.tsx
import { getTrendingArtists } from "~/lib/queries/artists";
import { ArtistGrid } from "./components/artist-grid";

export default async function ArtistsPage() {
  const artists = await getTrendingArtists();
  
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">Discover Artists</h1>
      <ArtistGrid artists={artists} />
    </div>
  );
}

// Create: /apps/web/app/shows/page.tsx
import { getUpcomingShows } from "~/lib/queries/shows";
import { ShowsGrid } from "./components/shows-grid";

export default async function ShowsPage() {
  const shows = await getUpcomingShows();
  
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">Upcoming Shows</h1>
      <ShowsGrid shows={shows} />
    </div>
  );
}
```

### 3. Set Vercel Environment Variables (10 minutes) ✅
1. Go to: https://vercel.com/dashboard/[your-project]/settings/environment-variables
2. Add these (copy from your .env.local):
```
DATABASE_URL
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
SPOTIFY_CLIENT_ID
SPOTIFY_CLIENT_SECRET
TICKETMASTER_API_KEY
SETLISTFM_API_KEY
CRON_SECRET
NEXT_PUBLIC_APP_URL=https://mysetlist.io
```
3. Click "Save" and redeploy

### 4. Remove Mock Data from Homepage (10 minutes) ✅
```typescript
// File: /apps/web/app/(home)/page.tsx or components
// Remove any hardcoded arrays like:
const mockArtists = [...]; // DELETE THIS
const mockShows = [...];   // DELETE THIS

// Replace with actual queries:
const artists = await getTrendingArtists();
const shows = await getUpcomingShows();
```

### 5. Run Database Seed Locally (15 minutes) ✅
```bash
# In your terminal:
cd /Users/seth/mysetlist-s4-1

# Check if seed script exists
pnpm seed:comprehensive

# If that doesn't work, try:
pnpm db:seed

# Or create a quick seed:
pnpm tsx scripts/seed-initial-data.ts
```

### 6. Fix Search API Timeout (5 minutes) ✅
```typescript
// File: /apps/web/app/api/search/route.ts
export const runtime = 'nodejs';
export const maxDuration = 10; // Add this line!

export async function GET(request: Request) {
  try {
    // existing search code
  } catch (error) {
    // Add proper error response
    return NextResponse.json(
      { error: 'Search temporarily unavailable' },
      { status: 503 }
    );
  }
}
```

### 7. Quick Database Check (5 minutes) ✅
```sql
-- Run in Supabase SQL Editor:
-- Check if you have any data
SELECT COUNT(*) as artist_count FROM artists;
SELECT COUNT(*) as show_count FROM shows;
SELECT COUNT(*) as venue_count FROM venues;

-- If counts are 0, you need to run sync
```

### 8. Trigger Manual Sync (10 minutes) ✅
```bash
# Use curl or Postman:
curl -X POST http://localhost:3001/api/cron/master-sync \
  -H "Authorization: Bearer 6155002300" \
  -H "Content-Type: application/json" \
  -d '{"mode": "manual", "type": "all"}'

# Or create a quick sync button in your app
```

## 🎯 After These Quick Fixes

### Expected Results:
- ✅ Logo clicks go to homepage
- ✅ /artists and /shows pages work
- ✅ Search might start working on Vercel
- ✅ Some real data should appear

### Next Priority:
1. Fix the data sync pipeline completely
2. Remove ALL mock data
3. Fix TypeScript errors
4. Optimize performance

## 📊 Quick Health Check

Run this to see what's working:
```bash
# Check build
pnpm build

# Check TypeScript
pnpm typecheck

# Check database connection
pnpm db:studio

# Check API routes
curl http://localhost:3001/api/health
```

## 🚀 Deploy After Each Fix

```bash
# After each change above:
git add .
git commit -m "fix: [what you fixed]"
git push
# Vercel auto-deploys
```

---

**Time Estimate**: 45-60 minutes to complete all items
**Impact**: App goes from 40% functional to 70% functional
**Next Step**: Follow the comprehensive plan for remaining 30%