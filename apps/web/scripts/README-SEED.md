# Database Seeding Scripts

This directory contains scripts to seed the MySetlist database with realistic test data for development and testing.

## Available Scripts

### 1. Comprehensive Seed (`seed-comprehensive.ts`)
The most complete seeding script that creates a rich dataset with all entities and relationships.

```bash
# From apps/web directory
pnpm seed

# Or directly
tsx scripts/seed-comprehensive.ts
```

**Creates:**
- 20+ users (admin, moderator, regular users)
- 20 popular artists with varying popularity levels
- 15 real-world venues across major cities
- 200+ songs distributed across artists
- 100+ shows with realistic dates and statuses
- Setlists with 12-20 songs each
- User activity (follows, votes, venue tips)
- Realistic trending scores based on recency and popularity

**Features:**
- Idempotent - clears database before seeding
- Consistent data using faker seed
- Realistic relationships between entities
- Varying popularity and trending scores
- Time-based trending decay

### 2. Quick Seed (`seed-quick.ts`)
A faster SQL-based seeding script for rapid database population.

```bash
# From apps/web directory
pnpm seed:quick

# Or directly
tsx scripts/seed-quick.ts
```

**Creates:**
- 5 users
- 10 popular artists
- 10 venues
- 30+ shows
- 200 songs
- Basic setlists and votes

**Features:**
- Uses direct SQL for speed
- Good for quick testing
- Smaller dataset
- Focus on trending data

### 3. Artist-Only Seed (`seed-database.ts`)
Seeds only artists from Spotify API.

```bash
# From apps/web directory
pnpm seed:artists

# Or directly
tsx scripts/seed-database.ts
```

**Creates:**
- 15 popular artists from Spotify
- Real artist data (images, genres, popularity)
- Requires Spotify API credentials

## Trending Score Algorithm

The seed scripts implement realistic trending scores using:

```javascript
function calculateTrendingScore(date, popularity) {
  const hoursAgo = (Date.now() - date.getTime()) / (1000 * 60 * 60);
  const timeDecay = Math.pow(0.5, hoursAgo / 48); // Half-life of 48 hours
  return popularity * timeDecay;
}
```

This ensures:
- Recent shows have higher trending scores
- Popular artists trend higher
- Scores decay over time
- Featured content gets a boost

## Database Schema

The scripts populate these main tables:
- `users` - User accounts with different roles
- `artists` - Musicians and bands
- `venues` - Concert venues
- `shows` - Concerts and events
- `songs` - Artist song catalogs
- `setlists` - Show song lists
- `votes` - User votes on songs
- `user_follows_artists` - Artist following relationships
- `venue_tips` - User-generated venue tips

## Usage Tips

1. **Development Testing**: Use `pnpm seed` for comprehensive data
2. **Quick Testing**: Use `pnpm seed:quick` for rapid iterations
3. **Artist Import**: Use `pnpm seed:artists` when you have Spotify credentials

## Environment Requirements

Ensure your `.env.local` has:
```env
DATABASE_URL=your-database-connection-string
# For artist seeding:
SPOTIFY_CLIENT_ID=your-spotify-client-id
SPOTIFY_CLIENT_SECRET=your-spotify-client-secret
```

## Customization

To modify the seed data:

1. **Change artist roster**: Edit the `artistsData` array in `seed-comprehensive.ts`
2. **Add more venues**: Update the `venuesData` array
3. **Adjust data volumes**: Modify the loop counts and random ranges
4. **Change trending algorithm**: Update the `calculateTrendingScore` function

## Troubleshooting

**Error: "Cannot find module '@repo/database'"**
- Ensure you've built the database package: `pnpm build` from root

**Error: "Database connection failed"**
- Check your DATABASE_URL in `.env.local`
- Ensure database is running

**Error: "Spotify authentication failed"**
- Check SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET
- Only needed for `seed:artists` script

## Next Steps

After seeding:
1. Visit `/trending` to see trending content
2. Check `/artists` for the artist catalog
3. View individual artist pages
4. Test voting on show setlists
5. Explore venue pages with tips