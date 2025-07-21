# How to Import Environment Variables into Vercel

## Quick Steps

1. **Go to Vercel Dashboard**: https://vercel.com/swbams-projects/windhoek
2. Click **Settings** tab
3. Click **Environment Variables** in the left sidebar
4. Click **Import .env** button (or add manually)

## Method 1: Import from File (Recommended)

1. Copy all content from `VERCEL_ENV_VARIABLES.txt`
2. In Vercel, click **Import .env**
3. Paste the content
4. Select which environments to apply to:
   - ✅ **Production** (for main branch)
   - ✅ **Preview** (for all other branches)
   - ✅ **Development** (for local dev)
5. Click **Import**

## Method 2: Add Manually

For each variable, you need to:
1. Enter the **Key** (e.g., `NEXT_PUBLIC_URL`)
2. Enter the **Value** (e.g., `https://theset.live`)
3. Select **Environments**
4. Click **Save**

## Environment-Specific Values

Some variables need different values per environment:

### Production (main branch):
```
NEXT_PUBLIC_URL=https://theset.live
NEXT_PUBLIC_APP_URL=https://theset.live
NEXT_PUBLIC_WEB_URL=https://theset.live
NEXT_PUBLIC_API_URL=https://theset.live/api
```

### Preview (all other branches):
```
NEXT_PUBLIC_URL=https://windhoek.vercel.app
NEXT_PUBLIC_APP_URL=https://windhoek.vercel.app
NEXT_PUBLIC_WEB_URL=https://windhoek.vercel.app
NEXT_PUBLIC_API_URL=https://windhoek.vercel.app/api
```

## Required Variables Checklist

### ✅ Application Config
- [ ] NODE_ENV
- [ ] NEXT_PUBLIC_APP_ENV
- [ ] NEXT_PUBLIC_URL
- [ ] NEXT_PUBLIC_APP_URL
- [ ] NEXT_PUBLIC_WEB_URL
- [ ] NEXT_PUBLIC_API_URL

### ✅ Supabase (All environments)
- [ ] DATABASE_URL
- [ ] DIRECT_URL
- [ ] NEXT_PUBLIC_SUPABASE_URL
- [ ] NEXT_PUBLIC_SUPABASE_ANON_KEY
- [ ] SUPABASE_URL
- [ ] SUPABASE_ANON_KEY
- [ ] SUPABASE_SERVICE_ROLE_KEY
- [ ] SUPABASE_JWT_SECRET

### ✅ External APIs (All environments)
- [ ] SPOTIFY_CLIENT_ID
- [ ] SPOTIFY_CLIENT_SECRET
- [ ] NEXT_PUBLIC_SPOTIFY_CLIENT_ID
- [ ] TICKETMASTER_API_KEY
- [ ] SETLISTFM_API_KEY

### ✅ Analytics (All environments)
- [ ] NEXT_PUBLIC_POSTHOG_KEY
- [ ] NEXT_PUBLIC_POSTHOG_HOST

### ✅ Security (All environments)
- [ ] CRON_SECRET

### ✅ Logging
- [ ] NEXT_PUBLIC_LOG_LEVEL (set to "error" for production)

## After Setting Variables

1. **Redeploy**: Variables take effect on next deployment
2. **Verify**: Check deployment logs for any missing variable errors
3. **Test**: Visit your deployment URL to ensure everything works

## Tips

- Use **Import .env** for bulk import - much faster!
- Double-check Production vs Preview values
- Sensitive values (like SERVICE_ROLE_KEY) are automatically hidden
- Changes require redeployment to take effect

## Common Issues

**Build fails with "Missing environment variable"**
- Check you've added ALL required variables
- Ensure no typos in variable names
- Verify variables are set for the correct environment

**Wrong URLs in production**
- Make sure Production environment has `theset.live` URLs
- Preview should have `windhoek.vercel.app` URLs