# Edge Functions Cleanup Summary

## ✅ What Was Fixed

### 1. **CORS Security Vulnerability** - FIXED
- **Previous**: `Access-Control-Allow-Origin: "*"` (allows any origin)
- **Fixed**: Now only allows specific domains:
  - `https://mysetlist.io`
  - `https://www.mysetlist.io`
  - `http://localhost:3000`
  - `http://localhost:3001`
- **Files Updated**:
  - `/supabase/functions/_shared/cors.ts`
  - `/supabase/functions/sync-artist-shows/index.ts`
  - `/supabase/functions/sync-song-catalog/index.ts`

### 2. **Edge Functions Analysis**

#### Local Functions (2 found):
1. `sync-artist-shows` - Proxy to `/api/sync/shows`
2. `sync-song-catalog` - Proxy to `/api/artists/sync`

#### Functions Referenced in Code but Missing Locally (5):
1. `scheduled-sync` - Called by cron jobs
2. `sync-artists` - Called by lib/sync-functions.ts
3. `sync-shows` - Called by lib/sync-functions.ts
4. `sync-setlists` - Called by lib/sync-functions.ts
5. `update-trending` - Referenced in cron jobs

## 🚨 Critical Issues

### 1. **Function Mismatch**
- Code is calling functions that don't exist locally
- This will cause runtime errors when those functions are invoked
- Cron jobs will fail if they're calling missing functions

### 2. **Redundant Architecture**
Current flow: `Cron/App → Edge Function → API Route → Database`
Better flow: `Cron/App → API Route → Database`

### 3. **Deployment Confusion**
- Unclear which functions are actually deployed on Supabase
- Config.toml lists different functions than what exists locally

## 📋 Recommended Actions

### Option 1: Remove Edge Functions (RECOMMENDED)
1. **Delete all edge functions** from Supabase dashboard
2. **Update cron jobs** to call API routes directly
3. **Update code** to remove edge function invocations
4. **Simplify architecture** by removing unnecessary proxy layer

**Benefits**:
- Simpler architecture
- Better performance (no double-hop)
- Easier debugging
- Reduced maintenance

### Option 2: Fix Missing Functions
1. Create the 5 missing edge functions
2. Ensure they match what the code expects
3. Deploy all functions to Supabase
4. Maintain both edge functions and API routes

**Drawbacks**:
- More complex architecture
- Duplicate code
- Higher maintenance burden
- Performance overhead

## 🛠️ Implementation Steps for Option 1

### 1. Update Cron Jobs
Replace edge function calls with direct API calls:
```sql
-- Instead of calling edge function
SELECT net.http_post(
  url := 'https://yzwkimtdaabyjbpykquu.supabase.co/functions/v1/scheduled-sync',
  headers := jsonb_build_object('Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'))
);

-- Call API route directly
SELECT net.http_post(
  url := current_setting('app.settings.app_url') || '/api/cron/sync',
  headers := jsonb_build_object('Authorization', 'Bearer ' || current_setting('app.settings.cron_secret'))
);
```

### 2. Update Code
Replace edge function invocations with fetch calls:
```typescript
// Instead of
const { data } = await supabase.functions.invoke('sync-artists', { body: params });

// Use
const response = await fetch('/api/artists/sync', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(params)
});
const data = await response.json();
```

### 3. Clean Up
- Delete `/supabase/functions` directory
- Remove edge function references from config
- Update documentation

## 📊 Current State

- ✅ CORS vulnerability fixed
- ✅ Database security migration deployed
- ✅ Authentication middleware implemented
- ⚠️ Edge functions still exist but are redundant
- ⚠️ Code references non-existent functions

## 🎯 Next Steps

1. **Check Supabase dashboard** to see which functions are actually deployed
2. **Choose Option 1 or 2** based on your architectural preferences
3. **Implement the chosen solution**
4. **Test all sync operations**
5. **Remove redundant code**

The edge functions are now secure (CORS fixed), but the architecture should be simplified by removing them entirely in favor of direct API calls.