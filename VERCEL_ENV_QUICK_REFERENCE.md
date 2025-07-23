# 🎯 MySetlist Vercel Environment Variables - Quick Reference

## Copy & Paste Values for Vercel Dashboard

### 🗄️ Database
```
DATABASE_URL
postgresql://postgres.yzwkimtdaabyjbpykquu:Bambseth1590@aws-0-us-east-1.pooler.supabase.com:6543/postgres

DIRECT_URL
postgresql://postgres.yzwkimtdaabyjbpykquu:Bambseth1590@aws-0-us-east-1.pooler.supabase.com:5432/postgres
```

### 🔐 Supabase
```
NEXT_PUBLIC_SUPABASE_URL
https://yzwkimtdaabyjbpykquu.supabase.co

NEXT_PUBLIC_SUPABASE_ANON_KEY
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6d2tpbXRkYWFieWpicHlrcXV1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA2OTIzMTYsImV4cCI6MjA2NjI2ODMxNn0.8pKUt_PL7q9XmNACDKVrkyqBfK8jmUDx6ARNybrmIVM

SUPABASE_URL
https://yzwkimtdaabyjbpykquu.supabase.co

SUPABASE_ANON_KEY
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6d2tpbXRkYWFieWpicHlrcXV1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA2OTIzMTYsImV4cCI6MjA2NjI2ODMxNn0.8pKUt_PL7q9XmNACDKVrkyqBfK8jmUDx6ARNybrmIVM

SUPABASE_SERVICE_ROLE_KEY
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6d2tpbXRkYWFieWpicHlrcXV1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDY5MjMxNiwiZXhwIjoyMDY2MjY4MzE2fQ.ZMorLC_eZke3bvBAF0zyzqUONxpomfTN2RpE_mLjz18

SUPABASE_JWT_SECRET
8yUxq3AqzLiPV9mdG5jZk38ZonG5nXVUVgq6zlQKCKHcdLcee3Ssg62/8cATrxBC2uvBqFXAIQUjHLMz3Q45rg==
```

### 🎵 External APIs
```
SPOTIFY_CLIENT_ID
2946864dc822469b9c672292ead45f43

SPOTIFY_CLIENT_SECRET
feaf0fc901124b839b11e02f97d18a8d

NEXT_PUBLIC_SPOTIFY_CLIENT_ID
2946864dc822469b9c672292ead45f43

TICKETMASTER_API_KEY
k8GrSAkbFaN0w7qDxGl7ohr8LwdAQm9b

SETLISTFM_API_KEY
xkutflW-aRy_Df9rF4OkJyCsHBYN88V37EBL

SETLIST_FM_API_KEY
xkutflW-aRy_Df9rF4OkJyCsHBYN88V37EBL
```

### 🔒 Security
```
CRON_SECRET
6155002300

NEXTAUTH_SECRET
[Generate a 32+ character random string]

NEXTAUTH_URL
https://mysetlist-sonnet.vercel.app
```

### 🌐 Application URLs
```
NEXT_PUBLIC_URL
https://mysetlist-sonnet.vercel.app

NEXT_PUBLIC_APP_URL
https://mysetlist-sonnet.vercel.app

NEXT_PUBLIC_WEB_URL
https://mysetlist-sonnet.vercel.app

NEXT_PUBLIC_API_URL
https://mysetlist-sonnet.vercel.app/api

NEXT_PUBLIC_APP_ENV
production

NODE_ENV
production
```

### ⚡ Feature Flags (Optional)
```
NEXT_PUBLIC_VERCEL_ANALYTICS
true

NEXT_PUBLIC_ENABLE_SPOTIFY
true

NEXT_PUBLIC_ENABLE_REALTIME
true

NEXT_PUBLIC_ENABLE_ANALYTICS
true
```

---

## 🚀 Quick Setup Commands

### Using Vercel CLI:
```bash
# 1. Install CLI
npm i -g vercel

# 2. Login
vercel login

# 3. Link project
vercel link

# 4. Run setup script
./scripts/setup-vercel-env.sh

# 5. Deploy
vercel --prod
```

### Verify Setup:
```bash
node scripts/verify-vercel-env.js
```

---

## ⚠️ Important Notes

1. **Copy values WITHOUT quotes** when pasting into Vercel dashboard
2. **Select all environments**: Production, Preview, Development
3. **Generate your own NEXTAUTH_SECRET** - don't use the placeholder
4. **Update URLs** if using a custom domain instead of mysetlist-sonnet.vercel.app
5. **Redeploy** after adding all variables

---

## 🆘 Need Help?

- Check deployment logs in Vercel dashboard
- Run verification script to identify missing variables
- Ensure no trailing spaces in values
- Clear build cache if experiencing issues: Settings → Functions → Clear Cache