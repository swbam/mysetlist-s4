# Database Seeding Guide

This guide explains how to seed your MySetlist database with test data.

## Available Seeding Scripts

### 1. **Mock Data Seeding** (Recommended for Testing)
```bash
pnpm seed:mock
```
- Creates realistic mock data without external API calls
- Generates 25 popular artists, 20 venues, shows, songs, setlists, users, and interactions
- Perfect for local development and testing
- No API keys required

To clear existing data first:
```bash
pnpm seed:mock:clear
```

### 2. **Basic Artist Seeding** (Spotify API)
```bash
pnpm seed
```
- Seeds popular artists from Spotify
- Requires `SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET` env vars
- Adds basic artist data only

### 3. **Comprehensive Seeding** (All External APIs)
```bash
pnpm seed:comprehensive
```
- Uses Spotify, Ticketmaster, and Setlist.fm APIs
- Creates the most realistic data
- Requires all API keys to be configured
- Takes longer but provides real venue and show data

### 4. **Combined Seeding**
```bash
pnpm seed:all
```
- Runs mock seeding first, then syncs trending artists
- Good balance of speed and data quality

## Quick Start

For most development needs, use mock data:

```bash
# 1. Clear and seed with mock data
pnpm seed:mock:clear

# 2. Start the development server
pnpm dev

# 3. Visit http://localhost:3000
```

## What Gets Seeded

### Mock Data includes:
- **25 Popular Artists** across genres (Taylor Swift, Billie Eilish, Drake, etc.)
- **20 Real Venues** (Madison Square Garden, Red Rocks, etc.)
- **3-5 Shows per Artist** (mix of upcoming and completed)
- **15-30 Songs per Artist** with realistic titles
- **Setlists** for each show (Main Set + Encore)
- **15 Sample Users** with profiles
- **User Interactions**:
  - Artist follows (5-20 per user)
  - Song votes (20-100 per user)
  - Show attendance records

### Data Relationships:
- Artists → Shows → Setlists → Songs
- Users → Follows → Artists
- Users → Votes → Setlist Songs
- Users → Attendance → Shows

## Viewing Seeded Data

After seeding, you can:

1. **Search for artists** on the homepage
2. **Browse trending artists** on /trending
3. **View artist pages** with shows and stats
4. **Check show details** with setlists
5. **See user interactions** in the database

## Database Management

### View data in Supabase Studio:
```bash
pnpm db:studio
```

### Reset database:
```bash
# Clear all data
pnpm seed:mock:clear

# Or manually in psql/supabase
```

### Check seed status:
```bash
# The scripts will output statistics showing what was created
```

## Troubleshooting

### If seeding fails:

1. **Check database connection**:
   ```bash
   pnpm check:env
   ```

2. **Verify migrations are up to date**:
   ```bash
   pnpm db:push
   ```

3. **Clear and retry**:
   ```bash
   pnpm seed:mock:clear
   pnpm seed:mock
   ```

### Common Issues:

- **"Duplicate key" errors**: Normal if data already exists, can be ignored
- **API rate limits**: Use mock data instead of API-based seeding
- **Missing relationships**: Run the complete seed script, not individual parts

## API Requirements

For external API seeding, you need:

- **Spotify**: `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`
- **Ticketmaster**: `TICKETMASTER_API_KEY`
- **Setlist.fm**: `SETLISTFM_API_KEY`

Add these to your `.env.local` file.

## Performance Tips

- Mock seeding takes ~30 seconds
- Comprehensive seeding can take 5-10 minutes
- For quick testing, use `seed:mock`
- For production-like data, use `seed:comprehensive`

## Next Steps

After seeding:

1. Test the artist search functionality
2. Verify trending page shows data
3. Click on artists to trigger show sync
4. Vote on setlist songs
5. Follow artists as different users

The seeded data provides a complete testing environment for all MySetlist features!