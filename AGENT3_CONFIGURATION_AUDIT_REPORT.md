# AGENT 3: CONFIGURATION & ENVIRONMENT AUDIT REPORT

## CRITICAL ISSUES FOUND

### 1. **HARDCODED LOCALHOST URLS IN PRODUCTION CODE** 🔥
**Location**: `/root/repo/apps/web/lib/utils.ts:77,81`
```typescript
// CURRENT (BROKEN):
return 'http://localhost:3001';

// SHOULD BE:
return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001';
```
**Impact**: Production app may try to connect to localhost instead of actual URLs
**Fix Priority**: IMMEDIATE

### 2. **MISSING CRITICAL ENVIRONMENT VARIABLES IN env.ts SCHEMA** 🔥
**Location**: `/root/repo/apps/web/env.ts`

Missing from schema but required by the app:
- `SPOTIFY_CLIENT_ID` (server-side)
- `SPOTIFY_CLIENT_SECRET` (server-side)
- `NEXT_PUBLIC_SPOTIFY_CLIENT_ID` (client-side)
- `SUPABASE_URL` (server-side, different from NEXT_PUBLIC_SUPABASE_URL)
- `SUPABASE_ANON_KEY` (server-side)
- `SUPABASE_SERVICE_ROLE_KEY` (required but optional in schema)
- `DATABASE_URL` (completely missing!)
- `DIRECT_URL` (for migrations)

### 3. **DUPLICATE/MISALIGNED API KEY NAMING** ⚠️
The app expects both:
- `SETLISTFM_API_KEY`
- `SETLIST_FM_API_KEY`

This causes confusion and potential failures. Should standardize on one.

### 4. **VERCEL PRODUCTION CONFIGURATION ISSUES** 🔥

#### a. Missing Required URLs in Production Example
The `.env.production.example` uses placeholder URLs:
```
NEXT_PUBLIC_URL=https://mysetlist-sonnet.vercel.app
```
But actual deployment appears to be at different URLs based on search results.

#### b. CSP Header Conflicts
`vercel.json` has Content-Security-Policy that might be too restrictive:
- Missing websocket protocols for Supabase realtime
- May block some external resources

### 5. **EXTERNAL API INTEGRATION ISSUES** ⚠️

#### Missing Validation
The external-apis package (`packages/external-apis/src/env.ts`) marks critical APIs as optional:
```typescript
SPOTIFY_CLIENT_ID: z.string().optional(), // Should be required!
SPOTIFY_CLIENT_SECRET: z.string().optional(), // Should be required!
```

### 6. **SUPABASE EDGE FUNCTIONS CONFIGURATION** ⚠️
Edge functions expect different env var names:
- Functions use `SUPABASE_URL` 
- Main app uses `NEXT_PUBLIC_SUPABASE_URL`
- No clear mapping between them

### 7. **BUILD CONFIGURATION WARNINGS** ⚠️

#### TypeScript Errors Ignored
```typescript
typescript: {
  ignoreBuildErrors: true, // DANGEROUS for production!
}
```

#### Missing Environment Validation
The app can skip env validation with `SKIP_ENV_VALIDATION=true`, which is dangerous.

### 8. **MISSING PRODUCTION SECRETS** 🔥
Based on `.env.production.example`, these are required but not validated:
- `NEXTAUTH_SECRET` (32+ characters)
- `CSRF_SECRET`
- `CRON_SECRET`
- `ADMIN_USER_IDS`
- `EMAIL_SYSTEM_TOKEN`

## RECOMMENDED FIXES

### 1. **Fix Hardcoded URLs** (IMMEDIATE)
```typescript
// apps/web/lib/utils.ts
export function getBaseUrl(): string {
  // Use environment variable first
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }
  
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  
  if (process.env.NODE_ENV === 'production') {
    if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
      return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
    }
    if (process.env.VERCEL_URL) {
      return `https://${process.env.VERCEL_URL}`;
    }
  }
  
  return 'http://localhost:3001';
}
```

### 2. **Update Environment Schema** (IMMEDIATE)
Add missing required variables to `/root/repo/apps/web/env.ts`:
```typescript
server: {
  // Add these as REQUIRED
  DATABASE_URL: z.string().url(),
  DIRECT_URL: z.string().url().optional(),
  SPOTIFY_CLIENT_ID: z.string().min(1),
  SPOTIFY_CLIENT_SECRET: z.string().min(1),
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1), // Remove .optional()
  
  // Fix naming inconsistency
  SETLISTFM_API_KEY: z.string().min(1),
  // Remove SETLIST_FM_API_KEY duplicate
}

client: {
  // Add missing public Spotify ID
  NEXT_PUBLIC_SPOTIFY_CLIENT_ID: z.string().min(1),
}
```

### 3. **Create Environment Validation Script** (HIGH)
Create a production validation script that checks:
- All required vars are present
- URLs are valid and not localhost
- API keys have proper format
- Secrets are sufficiently long

### 4. **Fix Vercel Configuration** (HIGH)
Update `vercel.json`:
```json
{
  "env": {
    "NEXT_PUBLIC_APP_URL": "https://mysetlist-sonnet.vercel.app",
    "NEXT_PUBLIC_API_URL": "https://mysetlist-sonnet.vercel.app/api"
  },
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Content-Security-Policy",
          "value": "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' *.vercel-analytics.com *.vercel.live; style-src 'self' 'unsafe-inline'; img-src 'self' data: https: *.spotify.com *.scdn.co *.ticketm.net; connect-src 'self' *.supabase.co *.spotify.com api.setlist.fm app.ticketmaster.com *.vercel-analytics.com wss: ws:; font-src 'self' data:; frame-src 'self' accounts.spotify.com;"
        }
      ]
    }
  ]
}
```

### 5. **Standardize Environment Variables** (MEDIUM)
Create a mapping layer for edge functions:
```typescript
// apps/web/lib/config/edge-env-mapper.ts
export const mapEdgeEnv = () => ({
  SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  // ... other mappings
});
```

### 6. **Remove TypeScript Build Errors Ignore** (HIGH)
Change in `next.config.ts`:
```typescript
typescript: {
  ignoreBuildErrors: false, // Fix the errors instead!
}
```

## DEPLOYMENT CHECKLIST

Before deploying to production, ensure:

1. [ ] All environment variables from `.env.production.example` are set in Vercel
2. [ ] Remove all localhost references from code
3. [ ] Run `pnpm check:env` locally with production values
4. [ ] Verify all API integrations work with production keys
5. [ ] Test Supabase connection with production credentials
6. [ ] Ensure NEXTAUTH_SECRET is 32+ characters
7. [ ] Set proper domain in Spotify/OAuth redirect URIs
8. [ ] Enable environment validation (remove SKIP_ENV_VALIDATION)
9. [ ] Fix all TypeScript errors
10. [ ] Test edge functions with production environment

## SECURITY RECOMMENDATIONS

1. **Rotate all exposed keys** if any were committed
2. **Use Vercel environment variables** for all secrets
3. **Enable audit logging** for admin operations
4. **Implement rate limiting** on all API routes
5. **Add request signing** for webhooks
6. **Use different keys** for development/staging/production

## MONITORING SETUP

Ensure these are configured in production:
- Sentry DSN for error tracking
- PostHog for analytics (optional)
- Vercel Analytics enabled
- Health check endpoints monitored
- Uptime monitoring on critical endpoints

---

## FIXES IMPLEMENTED

### ✅ 1. Fixed Hardcoded Localhost URLs
- Updated `/root/repo/apps/web/lib/utils.ts` to prioritize environment variables
- Added proper fallback chain for production URLs
- Added warning when no production URL is configured

### ✅ 2. Updated Environment Schema
- Added missing critical variables to `apps/web/env.ts`:
  - DATABASE_URL, DIRECT_URL
  - SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET
  - SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
  - NEXT_PUBLIC_SPOTIFY_CLIENT_ID
  - NEXT_PUBLIC_APP_URL, NEXT_PUBLIC_API_URL
- Removed duplicate SUPABASE_JWT_SECRET from security section
- Added fallback logic for environment variable aliases

### ✅ 3. Fixed TypeScript Build Configuration
- Changed `ignoreBuildErrors` to be conditional based on `FORCE_IGNORE_TS_ERRORS` env var
- Default is now `false` for production safety

### ✅ 4. Updated Vercel Configuration
- Fixed CSP header to include websocket protocols (ws: and wss:)
- Added missing image domain (*.ticketm.net)

### ✅ 5. Created Production Validation Script
- New script: `scripts/validate-production-env.ts`
- Run with: `pnpm validate:prod`
- Validates all production requirements including:
  - No localhost URLs in production
  - Minimum secret lengths
  - Proper URL formats
  - API key presence

### ✅ 6. Created Environment Fix Script
- New script: `scripts/fix-env-naming.ts`
- Standardizes SETLISTFM_API_KEY naming across codebase

## REMAINING ACTIONS FOR DEPLOYMENT

1. **Set Environment Variables in Vercel Dashboard**:
   ```bash
   # Required variables (see .env.production.example)
   NEXT_PUBLIC_APP_URL=https://mysetlist-sonnet.vercel.app
   NEXT_PUBLIC_API_URL=https://mysetlist-sonnet.vercel.app/api
   DATABASE_URL=postgresql://...
   # ... all other required vars
   ```

2. **Generate Secure Secrets**:
   ```bash
   # Generate 32-character secrets
   openssl rand -base64 32
   ```

3. **Update OAuth Redirect URIs**:
   - Spotify: Add `https://mysetlist-sonnet.vercel.app/api/auth/callback/spotify`
   - Update any other OAuth providers

4. **Run Validation Before Deploy**:
   ```bash
   pnpm validate:prod
   ```

5. **Deploy with Confidence**:
   ```bash
   vercel --prod
   ```

---

**Agent 3 Status**: Configuration audit complete. Critical fixes implemented. Ready for production deployment after setting environment variables in Vercel.