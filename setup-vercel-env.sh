#\!/bin/bash
echo "🚀 Setting up Vercel Environment Variables..."

# Database Configuration
vercel env add DATABASE_URL production
vercel env add DIRECT_URL production

# Supabase Configuration  
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
vercel env add SUPABASE_SERVICE_ROLE_KEY production
vercel env add SUPABASE_JWT_SECRET production

# External APIs
vercel env add SPOTIFY_CLIENT_ID production
vercel env add SPOTIFY_CLIENT_SECRET production
vercel env add NEXT_PUBLIC_SPOTIFY_CLIENT_ID production
vercel env add TICKETMASTER_API_KEY production
vercel env add SETLISTFM_API_KEY production

# Security
vercel env add NEXTAUTH_SECRET production
vercel env add CSRF_SECRET production
vercel env add CRON_SECRET production

echo "✅ Environment variables setup complete\!"
