# 🚀 MySetlist App - Production Deployment Checklist

## ✅ Code Fixes Applied

All critical issues have been fixed in the codebase:

1. **✅ Fixed vercel.json configuration**
   - Removed invalid `rootDirectory` property
   - Proper monorepo build configuration

2. **✅ Added missing dependency**
   - Added `@repo/external-apis` to package.json

3. **✅ Fixed syntax errors**
   - Added missing comma in env.ts

4. **✅ Removed hardcoded credentials**
   - No more hardcoded Supabase URLs/keys
   - No more hardcoded database credentials

5. **✅ Fixed null reference errors**
   - Added null checks for artist data

6. **✅ Fixed async/await issues**
   - All createServiceClient() calls now properly awaited

7. **✅ Verified environment schema**
   - DATABASE_URL is properly defined in env.ts

8. **✅ Removed hardcoded URLs**
   - Using dynamic URLs based on environment

## 🔧 Pre-Deployment Steps

### 1. Install Dependencies
```bash
pnpm install
```

### 2. Build Locally to Verify
```bash
cd apps/web
pnpm build
```

### 3. Run Production Validation
```bash
pnpm validate:prod
```

## 🌐 Vercel Configuration

### 1. Environment Variables to Set in Vercel Dashboard

**CRITICAL - App will NOT work without these:**

```bash
# Database (REQUIRED)
DATABASE_URL=postgresql://[user]:[password]@[host]:5432/[database]?sslmode=require
DIRECT_URL=postgresql://[user]:[password]@[host]:5432/[database]?sslmode=require

# Supabase (REQUIRED)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Authentication (REQUIRED)
NEXTAUTH_URL=https://mysetlist-sonnet.vercel.app
NEXTAUTH_SECRET=[generate-32-char-secret]

# External APIs (REQUIRED)
SPOTIFY_CLIENT_ID=your-spotify-client-id
SPOTIFY_CLIENT_SECRET=your-spotify-client-secret
TICKETMASTER_API_KEY=your-ticketmaster-api-key
SETLISTFM_API_KEY=your-setlistfm-api-key

# App URLs
NEXT_PUBLIC_APP_URL=https://mysetlist-sonnet.vercel.app
NEXT_PUBLIC_API_URL=https://mysetlist-sonnet.vercel.app/api
```

### 2. Generate Secrets
```bash
# Generate NEXTAUTH_SECRET
openssl rand -base64 32
```

### 3. Update OAuth Providers
- **Spotify**: Add redirect URL `https://mysetlist-sonnet.vercel.app/api/auth/callback/spotify`
- Update any other OAuth providers with production URLs

## 📋 Deployment Steps

1. **Commit and Push Changes**
   ```bash
   git add .
   git commit -m "Fix production deployment issues"
   git push origin main
   ```

2. **Monitor Vercel Build**
   - Check build logs in Vercel dashboard
   - Ensure no build errors

3. **Post-Deployment Verification**
   - [ ] Homepage loads without errors
   - [ ] Search functionality works
   - [ ] Artist pages load without 500 errors
   - [ ] Authentication works
   - [ ] Database queries execute
   - [ ] External API integrations work

## 🔍 Troubleshooting

If deployment fails:

1. **Check Build Logs**
   - Look for missing environment variables
   - Check for TypeScript errors

2. **Verify Environment Variables**
   - All required variables are set in Vercel
   - No typos in variable names

3. **Check Function Logs**
   - Monitor runtime errors in Vercel Functions tab
   - Look for database connection issues

## 📊 Success Criteria

Your app is successfully deployed when:
- ✅ Build completes without errors
- ✅ Homepage shows real data (not mock)
- ✅ Search returns results
- ✅ Artist pages load properly
- ✅ Users can authenticate
- ✅ Voting functionality works
- ✅ Data syncs from external APIs

## 🚨 Important Notes

1. **Do NOT skip environment variables** - The app will fail without them
2. **Rotate any exposed credentials** immediately
3. **Enable Vercel's secret scanning** for added security
4. **Monitor initial traffic** for any runtime errors

## 📞 Next Steps After Deployment

1. Test all critical user flows
2. Set up monitoring (Sentry, etc.)
3. Configure custom domain if needed
4. Enable analytics
5. Set up backup strategy

---

**Your app is now ready for deployment!** Follow this checklist carefully and your MySetlist app will be live and fully functional.