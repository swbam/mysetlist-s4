# MySetlist - How to Run Song Import and Tests

## 🎵 Song Import Commands

### 1. Import Top Artists with Songs
```bash
# This syncs the top 5 artists (Taylor Swift, Drake, etc.) with their songs
pnpm sync:artists

# Or run directly:
tsx scripts/sync-top-artists.ts
```

### 2. Sync Popular Artists
```bash
# Syncs popular artists from the database
pnpm sync:popular
```

### 3. Seed Initial Data
```bash
# Seeds top artists directly to database
pnpm db:seed
```

### 4. Create Sample Setlists
```bash
# Creates setlists for shows (already run, but can run again)
node create-sample-setlists.js
```

## 🧪 Test Commands

### 1. Run All Tests
```bash
# Run the test suite
pnpm test
```

### 2. Run E2E Tests
```bash
# End-to-end tests
pnpm test:e2e
```

### 3. Type Checking
```bash
# Check TypeScript types
pnpm typecheck
```

### 4. Build Test
```bash
# Test if the app builds successfully
pnpm build
```

## 🔍 Check Data Commands

### 1. Check Database Status
```bash
# Check what's in the database
npx tsx test-data.ts
```

### 2. Check Sync Status
```bash
# Check sync job status
tsx scripts/check-sync-status.ts
```

### 3. Verify Database Connection
```bash
# Verify database is connected
tsx scripts/verify-database-connection.ts
```

## 🚀 Quick Start Sequence

Run these commands in order to get everything working:

```bash
# 1. Check environment variables
pnpm check:env

# 2. Sync top artists with their songs
pnpm sync:artists

# 3. Create setlists for shows
node create-sample-setlists.js

# 4. Check the data
npx tsx test-data.ts

# 5. Run tests
pnpm test

# 6. Build and deploy
pnpm build
vercel --prod
```

## 📊 Current Database Status

As of last check:
- **Artists**: 12+ (Taylor Swift, The Weeknd, Drake, etc.)
- **Shows**: 232 upcoming shows
- **Songs**: 229 songs (may need more imports)
- **Setlists**: 42 setlists
- **Votes**: 406 votes

## ⚠️ Important Notes

1. **API Keys Required**: Make sure these are in `.env.local`:
   - `TICKETMASTER_API_KEY`
   - `SPOTIFY_CLIENT_ID`
   - `SPOTIFY_CLIENT_SECRET`
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`

2. **Rate Limits**: The sync scripts respect API rate limits, so they may take a few minutes to complete.

3. **Songs Import**: The `sync:artists` command will fetch songs from Spotify for each artist. This is what populates the song dropdown.

4. **Testing Flow**: After importing songs, test the complete flow:
   - Search for "Taylor Swift"
   - Navigate to her artist page
   - View a show
   - Click on setlist/voting
   - The song dropdown should now have songs!

## 🐛 Troubleshooting

If songs aren't appearing:
1. Check if the sync command completed: `tsx scripts/check-sync-status.ts`
2. Verify API keys are correct: `pnpm check:env`
3. Check for errors in logs: `vercel logs [deployment-url]`
4. Manually check database: `npx tsx test-data.ts`

If tests fail:
1. Make sure database is seeded: `pnpm db:seed`
2. Check environment variables: `pnpm check:env`
3. Run type checking first: `pnpm typecheck`