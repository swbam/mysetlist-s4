# Spotify Authentication Setup

## Overview
The MySetlist app uses Spotify OAuth to allow users to sign in with their Spotify account and access their music data.

## Features
- Sign in with Spotify
- View top artists from Spotify
- View followed artists from Spotify
- Sync artists to MySetlist database for show/setlist data

## Setup Instructions

### 1. Spotify App Configuration
1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Create a new app or use existing app
3. Add redirect URIs:
   - Development: `http://localhost:3001/auth/callback`
   - Production: `https://your-domain.com/auth/callback`
4. Note your Client ID and Client Secret

### 2. Supabase Configuration
1. Go to your Supabase project dashboard
2. Navigate to Authentication > Providers
3. Enable Spotify provider
4. Add your Spotify Client ID and Client Secret
5. Set redirect URL to match your app URL

### 3. Environment Variables
Ensure these are set in your `.env` file:
```
SPOTIFY_CLIENT_ID=your_client_id
SPOTIFY_CLIENT_SECRET=your_client_secret
```

### 4. Database Migration
Run the migration to create the user_music_preferences table:
```sql
-- Run the migration file at: migrations/create_user_music_preferences.sql
```

## User Flow
1. User clicks "Sign in with Spotify" button
2. User is redirected to Spotify for authorization
3. User grants permissions (email, profile, top artists, followed artists)
4. User is redirected back to `/auth/callback?next=/my-artists`
5. App exchanges code for session
6. User is redirected to `/my-artists` page
7. App fetches user's Spotify data and displays artists
8. User can click on any artist to sync their show/setlist data

## API Endpoints
- `GET /api/auth/spotify/user-data` - Fetch user's Spotify artists
- `POST /api/auth/spotify/refresh` - Refresh Spotify token

## Scopes Used
- `user-read-email` - Read user's email address
- `user-read-private` - Read user's profile info
- `user-top-read` - Read user's top artists
- `user-follow-read` - Read artists user follows

## Troubleshooting
1. If users can't see their artists, they may need to reconnect Spotify
2. Tokens expire after 1 hour, but are automatically refreshed
3. If the user_music_preferences table doesn't exist, the app will still work but won't store preferences