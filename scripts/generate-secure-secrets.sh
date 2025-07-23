#!/bin/bash

# Generate secure secrets for production deployment
echo "Generating secure secrets for MySetlist production deployment..."

# Function to generate secure random string
generate_secret() {
    openssl rand -base64 32 | tr -d "=+/" | cut -c1-32
}

# Generate secrets
NEXTAUTH_SECRET=$(generate_secret)
SUPABASE_SERVICE_ROLE_KEY="<YOUR_SUPABASE_SERVICE_ROLE_KEY>"
INTERNAL_API_KEY=$(generate_secret)
ADMIN_SECRET=$(generate_secret)
WEBHOOK_SECRET=$(generate_secret)
ENCRYPTION_KEY=$(generate_secret)

# Output environment variables
cat << EOF

# Critical Production Secrets - Add these to Vercel Environment Variables

# Authentication
NEXTAUTH_SECRET="${NEXTAUTH_SECRET}"
NEXTAUTH_URL="https://mysetlist-sonnet.vercel.app"

# Supabase (Get from Supabase dashboard)
NEXT_PUBLIC_SUPABASE_URL="<YOUR_SUPABASE_URL>"
NEXT_PUBLIC_SUPABASE_ANON_KEY="<YOUR_SUPABASE_ANON_KEY>"
SUPABASE_SERVICE_ROLE_KEY="${SUPABASE_SERVICE_ROLE_KEY}"
DATABASE_URL="<YOUR_DATABASE_URL>"

# External APIs (Get from respective services)
SPOTIFY_CLIENT_ID="<YOUR_SPOTIFY_CLIENT_ID>"
SPOTIFY_CLIENT_SECRET="<YOUR_SPOTIFY_CLIENT_SECRET>"
TICKETMASTER_API_KEY="<YOUR_TICKETMASTER_API_KEY>"
SETLISTFM_API_KEY="<YOUR_SETLISTFM_API_KEY>"

# Security
INTERNAL_API_KEY="${INTERNAL_API_KEY}"
ADMIN_SECRET="${ADMIN_SECRET}"
WEBHOOK_SECRET="${WEBHOOK_SECRET}"
ENCRYPTION_KEY="${ENCRYPTION_KEY}"

# Monitoring (Optional but recommended)
SENTRY_DSN="<YOUR_SENTRY_DSN>"
SENTRY_AUTH_TOKEN="<YOUR_SENTRY_AUTH_TOKEN>"
POSTHOG_API_KEY="<YOUR_POSTHOG_API_KEY>"

# Email (If using email features)
RESEND_API_KEY="<YOUR_RESEND_API_KEY>"
EMAIL_FROM="noreply@mysetlist-sonnet.vercel.app"

# Feature Flags
NEXT_PUBLIC_POSTHOG_KEY="<YOUR_POSTHOG_KEY>"
NEXT_PUBLIC_POSTHOG_HOST="https://app.posthog.com"

# Performance
VERCEL_FORCE_NO_BUILD_CACHE="false"
ANALYZE="false"

# Vercel Configuration
VERCEL_ENV="production"
VERCEL_URL="mysetlist-sonnet.vercel.app"

EOF

echo ""
echo "IMPORTANT STEPS:"
echo "1. Replace all placeholder values (<YOUR_...>) with actual values from your services"
echo "2. Add ALL of these environment variables to your Vercel project settings"
echo "3. Make sure to set them for the Production environment"
echo "4. Never commit these secrets to git"
echo ""
echo "To add to Vercel:"
echo "1. Go to https://vercel.com/[your-team]/[your-project]/settings/environment-variables"
echo "2. Add each variable one by one"
echo "3. Select 'Production' environment for all secrets"
echo "4. Redeploy your application after adding all variables"