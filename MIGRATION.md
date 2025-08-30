# Migration Guide: SQL to Convex

This guide helps you migrate your existing SQL database to Convex for the MySetlist application.

## Overview

The migration process involves:
1. Exporting data from your existing SQL database
2. Running Convex migration functions to import the data
3. Rebuilding vote tallies
4. Updating your application configuration

## Prerequisites

- Convex project set up and running (`convex dev`)
- Access to your existing SQL database
- Node.js installed

## Step 1: Export Data from SQL

Use the migration helper script to generate SQL export queries:

```bash
node scripts/migrate-to-convex.js export-all
```

This will show you the SQL queries to run against your database. Execute each query and save the results as JSON files:

- `migration-data/users.json`
- `migration-data/events.json`
- `migration-data/songs.json`
- `migration-data/votes.json`

### Example SQL Queries

**Users:**
```sql
SELECT 
  id,
  email,
  name,
  spotify_id as spotifyId,
  role,
  EXTRACT(EPOCH FROM created_at) * 1000 as createdAt
FROM users;
```

**Events:**
```sql
SELECT 
  id,
  name,
  artist_name as artistName,
  venue,
  EXTRACT(EPOCH FROM date) * 1000 as date,
  status,
  setlist_fm_id as setlistFmId,
  EXTRACT(EPOCH FROM created_at) * 1000 as createdAt
FROM events;
```

**Songs:**
```sql
SELECT 
  id,
  title,
  artist,
  spotify_id as spotifyId,
  duration,
  EXTRACT(EPOCH FROM created_at) * 1000 as createdAt
FROM songs;
```

**Votes:**
```sql
SELECT 
  user_id as userId,
  event_id as eventId,
  song_id as songId,
  EXTRACT(EPOCH FROM created_at) * 1000 as createdAt
FROM votes;
```

## Step 2: Import Data to Convex

### Option A: Using Convex Dashboard

1. Open your Convex dashboard
2. Go to the "Functions" tab
3. Run the migration functions in order:

```javascript
// 1. Migrate users
const userResults = await convex.mutation('migration:migrateUsers', {
  users: [/* your users data */]
});

// 2. Migrate events
const eventResults = await convex.mutation('migration:migrateEvents', {
  events: [/* your events data */]
});

// 3. Migrate songs
const songResults = await convex.mutation('migration:migrateSongs', {
  songs: [/* your songs data */]
});

// 4. Create ID mappings
const userIdMap = {};
userResults.forEach(result => {
  userIdMap[result.originalId] = result.newId;
});
// ... repeat for events and songs

// 5. Migrate votes
const voteResults = await convex.mutation('migration:migrateVotes', {
  votes: [/* your votes data */],
  userIdMap,
  eventIdMap,
  songIdMap
});

// 6. Rebuild tallies
const tallyResults = await convex.mutation('migration:rebuildTallies', {});
```

### Option B: Using Generated Script

1. Generate the import script:
   ```bash
   node scripts/migrate-to-convex.js generate-import
   ```

2. Edit the generated `migration-data/import-to-convex.js` file with your actual data

3. Run the import script in your Convex environment

## Step 3: Update Environment Variables

Update your environment variables to use Convex:

```env
# Convex
NEXT_PUBLIC_CONVEX_URL=https://your-convex-deployment.convex.cloud

# Legacy Supabase (can be removed after migration)
# NEXT_PUBLIC_SUPABASE_URL=...
# NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

## Step 4: Update Application Code

The application has already been updated to use Convex providers:

- ✅ `ConvexClientProvider` replaces `AuthProvider`
- ✅ Convex queries and mutations replace Supabase calls
- ✅ Authentication handled by Convex Auth

## Step 5: Test the Migration

1. Start your development server:
   ```bash
   pnpm dev
   ```

2. Verify that:
   - Users can sign in
   - Events are displayed correctly
   - Voting functionality works
   - Vote tallies are accurate

## Rollback Plan

If you need to rollback:

1. Revert the environment variables to use Supabase
2. Revert the code changes in `apps/web/app/layout.tsx`
3. Remove the Convex provider files

## Data Validation

After migration, validate your data:

```javascript
// Check record counts
const userCount = await convex.query('users:count');
const eventCount = await convex.query('events:count');
const songCount = await convex.query('songs:count');
const voteCount = await convex.query('votes:count');

console.log('Migration Summary:');
console.log(`Users: ${userCount}`);
console.log(`Events: ${eventCount}`);
console.log(`Songs: ${songCount}`);
console.log(`Votes: ${voteCount}`);
```

## Troubleshooting

### Common Issues

1. **Missing ID mappings**: Ensure all referenced IDs exist in the mapping objects
2. **Duplicate data**: The migration functions check for existing records to prevent duplicates
3. **Type mismatches**: Verify that your exported data matches the expected Convex schema

### Getting Help

- Check Convex logs in the dashboard
- Verify your schema matches the expected structure
- Ensure all required fields are present in your exported data

## Post-Migration Cleanup

After successful migration and testing:

1. Remove Supabase dependencies from `package.json`
2. Delete Supabase-related files
3. Update documentation to reflect Convex usage
4. Archive your SQL database (don't delete immediately)

## Performance Considerations

- Large datasets should be migrated in batches
- Consider running migration during low-traffic periods
- Monitor Convex usage limits during migration

For questions or issues, refer to the [Convex documentation](https://docs.convex.dev) or create an issue in the project repository.