# Database Migrations Guide

## Overview

This project uses PostgreSQL migrations to manage database schema changes. Migrations are stored in the `migrations/` directory and are run in sequential order.

## Migration Files

Current migrations:

1. `0001_initial_schema.sql` - Core tables and initial schema
2. `0002_user_follows_artists.sql` - User-artist following relationship
3. `0003_venue_reviews_photos_tips.sql` - Venue review system
4. `0004_moderation_and_reports.sql` - Content moderation system
5. `0005_email_notifications.sql` - Email notification system
6. `0006_artist_followers_view.sql` - Artist followers view
7. `0007_row_level_security.sql` - RLS policies for all tables
8. `0008_vote_count_trigger.sql` - Vote counting triggers
9. `0009_fix_naming_consistency.sql` - Fix naming conventions
10. `0010_performance_indexes.sql` - Performance optimization indexes

## Running Migrations

### Prerequisites

Ensure you have the following environment variables set:

- `DATABASE_URL` or `POSTGRES_URL` - PostgreSQL connection string
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key

### Commands

```bash
# Run all pending migrations
npm run migrate:deploy

# Or using pnpm from the root
pnpm --filter @repo/database migrate:deploy
```

### Manual Migration (Supabase Dashboard)

If the automated migration fails, you can run migrations manually:

1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy and paste each migration file in order
4. Execute each migration
5. Track executed migrations by creating this table:

```sql
CREATE TABLE IF NOT EXISTS schema_migrations (
  version VARCHAR(255) PRIMARY KEY,
  executed_at TIMESTAMP DEFAULT NOW()
);

-- After each migration, insert a record:
INSERT INTO schema_migrations (version) VALUES ('0001_initial_schema');
```

## Creating New Migrations

1. Create a new SQL file in `migrations/` with the next sequential number
2. Follow the naming convention: `XXXX_descriptive_name.sql`
3. Include:
   - Clear comments explaining the changes
   - Proper error handling (IF EXISTS, IF NOT EXISTS)
   - Update triggers for `updated_at` columns
   - Appropriate indexes for new columns
   - RLS policies if creating new tables

Example:

```sql
-- Create new feature table
CREATE TABLE IF NOT EXISTS new_feature (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Add trigger for updated_at
CREATE TRIGGER update_new_feature_updated_at
BEFORE UPDATE ON new_feature
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add indexes
CREATE INDEX idx_new_feature_name ON new_feature(name);

-- Enable RLS
ALTER TABLE new_feature ENABLE ROW LEVEL SECURITY;

-- Add RLS policies
CREATE POLICY "Users can view new features" ON new_feature
  FOR SELECT TO authenticated
  USING (true);
```

## Migration Best Practices

1. **Always test migrations locally first**
2. **Make migrations idempotent** - Use `IF EXISTS`/`IF NOT EXISTS`
3. **Never modify existing migrations** - Create new ones instead
4. **Include rollback considerations** in comments
5. **Keep migrations focused** - One feature per migration
6. **Document complex logic** with clear comments

## Troubleshooting

### Common Issues

1. **Permission denied**: Ensure you're using the service role key
2. **Table already exists**: Check if migration was partially applied
3. **Function not found**: Ensure extensions are enabled
4. **Connection timeout**: Check your DATABASE_URL is correct

### Checking Migration Status

```sql
-- View all executed migrations
SELECT * FROM schema_migrations ORDER BY version;

-- Check if a specific table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables
  WHERE table_schema = 'public'
  AND table_name = 'your_table_name'
);
```

## Required PostgreSQL Extensions

The following extensions must be enabled:

- `uuid-ossp` - UUID generation
- `postgis` - Geospatial data
- `pg_trgm` - Trigram text search
- `unaccent` - Text normalization

These are automatically enabled in migration 0001.
