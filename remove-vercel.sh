#!/bin/bash

# Remove all environment variables from Vercel
echo "Removing all environment variables from Vercel..."

# Array of environment variables to remove
ENV_VARS=(
  "SETLIST_FM_API_KEY"
  "NEXTAUTH_URL"
  "DB_SSL_MODE"
  "NODE_TLS_REJECT_UNAUTHORIZED"
  "NEXT_PUBLIC_API_URL"
  "NEXT_PUBLIC_DOCS_URL"
  "NODE_ENV"
  "DIRECT_URL"
  "SUPABASE_URL"
  "NEXT_PUBLIC_SPOTIFY_CLIENT_ID"
  "REDIS_URL"
  "ADMIN_API_KEY"
  "CRON_SECRET"
  "CSRF_SECRET"
  "NEXTAUTH_SECRET"
  "SUPABASE_JWT_SECRET"
  "NEXT_PUBLIC_SUPABASE_ANON_KEY"
  "NEXT_PUBLIC_SUPABASE_URL"
  "NEXT_PUBLIC_APP_URL"
  "DATABASE_URL"
  "SUPABASE_SERVICE_ROLE_KEY"
  "SPOTIFY_CLIENT_ID"
  "SPOTIFY_CLIENT_SECRET"
  "TICKETMASTER_API_KEY"
  "SETLISTFM_API_KEY"
)

# Remove each environment variable
for var in "${ENV_VARS[@]}"; do
  echo "Removing $var..."
  vercel env rm "$var" --yes
done

echo "All environment variables have been removed!"
echo "Run 'vercel env ls' to verify they're gone."