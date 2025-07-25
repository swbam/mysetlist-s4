# MySetlist Configuration & Environment Audit Report

## Executive Summary
This report provides a comprehensive audit of the MySetlist application's configuration, environment setup, and deployment readiness. The audit was conducted by SUB-AGENT 3, focusing on configuration, environment variables, and API structure.

**Status**: ⚠️ **Several configuration issues require immediate attention**

---

## 1. API Consolidation Status ✅

### Current State: **COMPLETED**
- ✅ The `apps/api` folder has been successfully removed
- ✅ All API routes are now consolidated in `apps/web/app/api`
- ✅ No orphaned API references found
- ✅ Vercel configuration correctly points to `apps/web` build

### Evidence:
- API routes location: `/root/repo/apps/web/app/api/`
- Build command in vercel.json: `"buildCommand": "cd apps/web && pnpm build"`
- Output directory: `"outputDirectory": "apps/web/.next"`

---

## 2. Environment Variables Audit ⚠️

### Missing Variables in env.ts Schema
The following environment variables are defined in `.env.example` but **missing** from the `apps/web/env.ts` schema:

1. **Authentication & Security**:
   - ❌ `CSRF_SECRET` - Critical for CSRF protection
   - ❌ `ADMIN_API_KEY` - Admin operations security
   - ❌ `JWT_SECRET` - Only in auth package, not in web app
   - ❌ `SUPABASE_JWT_SECRET` - Missing from schema

2. **External APIs**:
   - ❌ `SETLIST_FM_API_KEY` - Duplicate key naming issue (has `SETLISTFM_API_KEY`)
   - ❌ `NEXT_PUBLIC_SPOTIFY_CLIENT_ID` - Missing from runtimeEnv

3. **Analytics & Monitoring**:
   - ❌ `NEXT_PUBLIC_GA_MEASUREMENT_ID` - Google Analytics
   - ❌ `NEXT_PUBLIC_VERCEL_ANALYTICS` - Vercel Analytics
   - ❌ `SENTRY_ORG` - Sentry organization
   - ❌ `SENTRY_PROJECT` - Sentry project
   - ❌ `BETTERSTACK_API_KEY` - Monitoring
   - ❌ `BETTERSTACK_URL` - Monitoring

4. **Performance & Features**:
   - ❌ `NEXT_PUBLIC_ENABLE_SPOTIFY` - Feature flag
   - ❌ `NEXT_PUBLIC_ENABLE_REALTIME` - Feature flag
   - ❌ `NEXT_PUBLIC_ENABLE_PUSH_NOTIFICATIONS` - Feature flag
   - ❌ `NEXT_PUBLIC_ENABLE_ADVANCED_SEARCH` - Feature flag
   - ❌ `NEXT_PUBLIC_ENABLE_USER_GENERATED_CONTENT` - Feature flag

5. **Database Configuration**:
   - ❌ `DB_POOL_*` settings - Connection pooling
   - ❌ `PGBOUNCER_*` settings - PgBouncer configuration

### Environment Files Present:
- ✅ `.env.local` - Contains development credentials
- ✅ `.env.production` - Contains production settings
- ✅ `.env.example` - Comprehensive example file
- ✅ `VERCEL_ENV_VARIABLES.txt` - Vercel import guide

---

## 3. Configuration Issues Found 🔥

### 3.1 TypeScript Build Errors
```typescript
// next.config.ts line 7-9
typescript: {
  ignoreBuildErrors: true, // TODO: Fix remaining design system component type issues
}
```
**Impact**: TypeScript errors are being ignored in production builds, which can lead to runtime errors.

### 3.2 Missing NEXTAUTH_SECRET in Production
The `VERCEL_ENV_VARIABLES.txt` file is missing the `NEXTAUTH_SECRET` variable, which is **required** for authentication in production.

### 3.3 Docker Compose API Service
The `docker-compose.yml` still references an API service (lines 107-140) even though the API has been consolidated. This service should be removed.

### 3.4 Middleware Protected Routes
The middleware configuration has limited protected routes:
```typescript
const protectedPaths = ['/dashboard', '/vote', '/profile', '/api/user'];
```
Missing protection for:
- `/admin/*` routes
- `/settings/*` routes
- `/my-artists/*` routes

### 3.5 Environment Variable Naming Inconsistency
- Both `SETLISTFM_API_KEY` and `SETLIST_FM_API_KEY` are used
- Both `NEXT_PUBLIC_URL` and `NEXT_PUBLIC_APP_URL` seem redundant

---

## 4. Vercel Deployment Configuration ⚠️

### Current Settings:
- ✅ Build command correctly set
- ✅ Output directory properly configured
- ✅ Region set to `iad1` (US East)
- ⚠️ Only 2 cron jobs configured (should have more based on API routes)
- ⚠️ Git deployment enabled for non-existent branch `mysetlist-completion-fix`

### Missing Cron Jobs:
Based on the API routes, these cron jobs should be added to `vercel.json`:
```json
{
  "path": "/api/cron/calculate-trending",
  "schedule": "*/30 * * * *"  // Every 30 minutes
},
{
  "path": "/api/cron/hourly-update",
  "schedule": "0 * * * *"  // Every hour
},
{
  "path": "/api/cron/trending-update",
  "schedule": "*/15 * * * *"  // Every 15 minutes
}
```

---

## 5. Security Configuration Issues 🚨

### 5.1 Exposed Credentials
The `.env.local` and `VERCEL_ENV_VARIABLES.txt` files contain **actual API keys and secrets**. While these may be development/test credentials, they should still be kept secure.

### 5.2 Missing Security Headers
The CSP (Content Security Policy) in `vercel.json` is missing some important directives:
- Missing `object-src 'none'`
- Missing `base-uri 'self'`
- Missing `form-action 'self'`

### 5.3 Rate Limiting Configuration
No environment variables for rate limiting configuration (mentioned in `.env.example` but not implemented):
- `RATE_LIMIT_WINDOW_MS`
- `RATE_LIMIT_MAX_REQUESTS`

---

## 6. Performance Configuration ⚠️

### Issues Found:
1. **No Redis/Caching Configuration** in production environment variables
2. **Missing Edge Config** setup for Vercel
3. **No CDN/Asset optimization** configuration
4. **Performance budgets** defined in `.env.example` but not used in code

---

## 7. Recommendations & Action Items

### Immediate Actions Required:

1. **Update env.ts Schema** (Priority: HIGH)
   ```typescript
   // Add missing critical variables to apps/web/env.ts
   server: {
     CSRF_SECRET: z.string().min(1),
     ADMIN_API_KEY: z.string().min(1).optional(),
     SUPABASE_JWT_SECRET: z.string().min(1),
     // ... other missing variables
   }
   ```

2. **Add NEXTAUTH_SECRET to Vercel** (Priority: CRITICAL)
   - Generate a secure 32+ character secret
   - Add to Vercel environment variables

3. **Remove Docker API Service** (Priority: MEDIUM)
   - Update docker-compose.yml to remove the API service
   - Update nginx configuration accordingly

4. **Fix TypeScript Build Errors** (Priority: HIGH)
   - Set `ignoreBuildErrors: false` in next.config.ts
   - Fix the underlying TypeScript errors

5. **Update Middleware Protection** (Priority: HIGH)
   - Add protection for admin and settings routes
   - Consider implementing role-based access control

6. **Configure Cron Jobs** (Priority: HIGH)
   - Add all missing cron jobs to vercel.json
   - Ensure CRON_SECRET is properly validated in each endpoint

7. **Implement Rate Limiting** (Priority: MEDIUM)
   - Add rate limiting environment variables
   - Ensure middleware properly enforces limits

### Long-term Improvements:

1. **Implement Redis Caching** for production
2. **Set up Vercel Edge Config** for feature flags
3. **Configure performance monitoring** with proper budgets
4. **Implement proper secret rotation** strategy
5. **Set up environment-specific configuration** management

---

## 8. Validation Scripts Needed

Create validation scripts for:
1. Environment variable completeness check
2. API endpoint security audit
3. Build configuration validation
4. Deployment readiness check

---

## Conclusion

While the API consolidation has been successfully completed, there are several critical configuration issues that need immediate attention before the application can be considered production-ready. The most critical issues are:

1. Missing NEXTAUTH_SECRET in production
2. TypeScript errors being ignored
3. Incomplete environment variable schema
4. Missing security configurations

Addressing these issues should be the immediate priority to ensure a stable and secure production deployment.