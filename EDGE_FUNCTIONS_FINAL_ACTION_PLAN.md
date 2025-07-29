# 🚨 EDGE FUNCTIONS FINAL ACTION PLAN

## Overview
You have 20+ redundant edge functions deployed on Supabase that need to be deleted. All functionality is already implemented in your Next.js API routes, making these edge functions unnecessary overhead.

## ✅ What I've Done
1. **Updated Code References**: Modified `/apps/web/lib/sync-functions.ts` to use API routes instead of edge functions
2. **Created Cleanup Scripts**: Multiple scripts and SQL files to help with cleanup
3. **Documentation**: Created comprehensive guides for manual cleanup

## 🎯 What You Need to Do

### Step 1: Delete All Edge Functions (Manual - Supabase Dashboard)
1. Go to https://supabase.com/dashboard
2. Select your project (ID: `yzwkimtdaabyjbpykquu`)
3. Click **"Edge Functions"** in the left sidebar
4. **DELETE ALL FUNCTIONS** - every single one is redundant

Expected functions to delete:
- All sync functions (sync-artists, sync-shows, etc.)
- All scheduled functions (scheduled-sync, daily-sync, etc.)
- All processing functions (email-processor, analytics-processor, etc.)
- All API proxy functions (spotify-sync, ticketmaster-sync, etc.)

### Step 2: Update Cron Jobs (SQL Editor)
Run the SQL script I created:
```bash
# In Supabase SQL Editor, run:
/scripts/update-cron-jobs-to-api-routes.sql
```

### Step 3: Update Environment Variables
Ensure these are set in both Supabase and Vercel:
```env
NEXT_PUBLIC_APP_URL=https://mysetlist.io
CRON_SECRET=your-secure-secret
```

### Step 4: Test Everything
```bash
# Build to check for TypeScript errors
pnpm build

# Test sync functionality
curl -X POST https://mysetlist.io/api/cron/master-sync \
  -H "Authorization: Bearer YOUR_CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"mode": "manual"}'
```

## 📁 Files Created/Updated

### Updated Files
- `/apps/web/lib/sync-functions.ts` - Now uses fetch() instead of supabase.functions.invoke()
- `/apps/web/app/api/scheduled/_deprecated/backup/route.ts` - Marked as deprecated

### New Scripts
- `/scripts/update-edge-function-references.ts` - Updates code references
- `/scripts/update-cron-jobs-to-api-routes.sql` - Updates Supabase cron jobs
- `/scripts/delete-all-edge-functions.sh` - CLI deletion script (if needed)

### Documentation
- `/docs/EDGE_FUNCTIONS_MANUAL_CLEANUP.md` - Step-by-step manual cleanup guide
- `/EDGE_FUNCTION_CLEANUP_REPORT.md` - Detailed cleanup report

## 🏗️ Architecture After Cleanup

**BEFORE**: 
```
User/Cron → Edge Function → API Route → Database (4 hops, 2 deployments)
```

**AFTER**: 
```
User/Cron → API Route → Database (2 hops, 1 deployment)
```

## 💰 Benefits
1. **Performance**: Removes unnecessary network hop
2. **Cost**: No more edge function invocations on Supabase bill
3. **Simplicity**: Single deployment (Next.js on Vercel)
4. **Debugging**: All code in one place
5. **Maintenance**: No more dual deployment coordination

## ⚠️ Important Notes
- ALL edge functions should be deleted - there are no exceptions
- Your API routes already handle everything these functions were doing
- After deletion, if anything breaks, check that the corresponding API route exists
- The migration is safe because your API routes are already being used by most of your app

## 🔍 Verification Checklist
- [ ] All edge functions deleted from Supabase dashboard
- [ ] Cron jobs updated to use API routes
- [ ] Build passes with no TypeScript errors
- [ ] Manual sync test works
- [ ] No more `supabase.functions.invoke()` calls in codebase
- [ ] Environment variables set correctly

## 🆘 Troubleshooting
If something breaks:
1. Check Vercel logs for API route errors
2. Verify CRON_SECRET is set correctly
3. Ensure API routes exist for the functionality
4. Check that cron jobs have correct URLs

## Summary
Delete ALL 20+ edge functions from Supabase. They're ALL redundant. Your Next.js API routes handle everything more efficiently.