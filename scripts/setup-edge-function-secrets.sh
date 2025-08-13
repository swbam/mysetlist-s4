#!/bin/bash

# Setup Edge Function Secrets for TheSet

echo "Setting up Edge Function secrets..."

PROJECT_REF="yzwkimtdaabyjbpykquu"

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Spotify credentials
echo "Setting Spotify credentials..."
supabase secrets set SPOTIFY_CLIENT_ID=$SPOTIFY_CLIENT_ID --project-ref $PROJECT_REF
supabase secrets set SPOTIFY_CLIENT_SECRET=$SPOTIFY_CLIENT_SECRET --project-ref $PROJECT_REF

# Ticketmaster API key
echo "Setting Ticketmaster API key..."
supabase secrets set TICKETMASTER_API_KEY=$TICKETMASTER_API_KEY --project-ref $PROJECT_REF

# Setlist.fm API key
echo "Setting Setlist.fm API key..."
supabase secrets set SETLISTFM_API_KEY=$SETLISTFM_API_KEY --project-ref $PROJECT_REF

# Cron secret for scheduled functions
echo "Setting cron secret..."
supabase secrets set CRON_SECRET=$CRON_SECRET --project-ref $PROJECT_REF

echo "Edge Function secrets configured successfully!"