# Vercel Environment Variables Setup

## Required Environment Variables

Add these environment variables to your Vercel project:

### Database Configuration
```
DATABASE_URL="postgresql://postgres.yzwkimtdaabyjbpykquu:Bambseth1590@aws-0-us-east-1.pooler.supabase.com:6543/postgres"
DIRECT_URL="postgresql://postgres.yzwkimtdaabyjbpykquu:Bambseth1590@aws-0-us-east-1.pooler.supabase.com:6543/postgres"
```

### Supabase Configuration
```
NEXT_PUBLIC_SUPABASE_URL="https://yzwkimtdaabyjbpykquu.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6d2tpbXRkYWFieWpicHlrcXV1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mjk0NDQ2NzAsImV4cCI6MjA0NTAyMDY3MH0.JpQbmFj7H8P9JN74_uqr8bKMZfqPOIMH5j9pFMh3NZA"
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6d2tpbXRkYWFieWpicHlrcXV1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyOTQ0NDY3MCwiZXhwIjoyMDQ1MDIwNjcwfQ.6lCBSPxerFdHqOIkTyKOoCtrrmgortHdMj85WeJVGHk"
```

### URLs (Update with your actual domain)
```
NEXT_PUBLIC_URL="https://mysetlist-sonnet.vercel.app"
NEXT_PUBLIC_APP_URL="https://mysetlist-sonnet.vercel.app"
NEXT_PUBLIC_WEB_URL="https://mysetlist-sonnet.vercel.app"
NEXT_PUBLIC_API_URL="https://mysetlist-sonnet.vercel.app/api"
NEXT_PUBLIC_DOCS_URL="https://mysetlist-sonnet.vercel.app/docs"
```

## How to Add in Vercel

1. Go to your Vercel project dashboard
2. Navigate to Settings → Environment Variables
3. Add each variable listed above
4. Make sure to select all environments (Production, Preview, Development)
5. Click "Save"

## Important Notes

- The database connection has been configured with fallbacks, so the app will work even if some environment variables are missing
- However, for production use, it's recommended to set all variables properly
- The Supabase keys provided are for the existing MySetlist database
- Update the URL variables with your actual Vercel deployment URL

## Testing Connection

After deployment, you can test the database connection by:
1. Checking the API endpoints: `/api/artists/search?q=test`
2. Viewing the trending page: `/trending`
3. Searching for artists on the homepage