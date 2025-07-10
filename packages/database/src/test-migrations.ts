#!/usr/bin/env node
import 'dotenv/config';
import postgres from 'postgres';

async function testMigrations() {
  const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;

  if (!connectionString) {
    process.exit(1);
  }

  const sql = postgres(connectionString, {
    max: 1,
    ssl: 'require',
  });

  try {
    const _extensions = await sql`
      SELECT extname FROM pg_extension 
      WHERE extname IN ('uuid-ossp', 'postgis', 'pg_trgm', 'unaccent')
      ORDER BY extname
    `;
    const _tables = await sql`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      AND table_name IN (
        'users', 'user_profiles', 'artists', 'artist_stats', 
        'venues', 'shows', 'show_artists', 'songs', 'setlists', 
        'setlist_songs', 'votes', 'venue_reviews', 'venue_photos',
        'venue_insider_tips', 'user_follows_artists', 'email_preferences',
        'email_unsubscribes', 'email_queue', 'email_logs', 'reports',
        'moderation_logs', 'user_bans', 'content_moderation',
        'platform_stats', 'admin_notifications', 'schema_migrations'
      )
      ORDER BY table_name
    `;
    const _enums = await sql`
      SELECT typname FROM pg_type 
      WHERE typtype = 'e' 
      AND typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
      ORDER BY typname
    `;
    const _rlsTables = await sql`
      SELECT tablename, rowsecurity 
      FROM pg_tables 
      WHERE schemaname = 'public' 
      AND rowsecurity = true
      ORDER BY tablename
    `;
    const _indexes = await sql`
      SELECT COUNT(*) as count 
      FROM pg_indexes 
      WHERE schemaname = 'public'
    `;
    const _triggers = await sql`
      SELECT COUNT(*) as count 
      FROM information_schema.triggers 
      WHERE trigger_schema = 'public' 
      AND trigger_name LIKE 'update_%_updated_at'
    `;
    const _foreignKeys = await sql`
      SELECT COUNT(*) as count 
      FROM information_schema.table_constraints 
      WHERE constraint_type = 'FOREIGN KEY' 
      AND table_schema = 'public'
    `;
    const migrations = await sql`
      SELECT version, executed_at 
      FROM schema_migrations 
      ORDER BY version
      LIMIT 5
    `;
    migrations.forEach((_m) => {});
  } catch (_error) {
    process.exit(1);
  } finally {
    await sql.end();
  }
}

// Run tests
if (import.meta.url === `file://${process.argv[1]}`) {
  testMigrations().catch(console.error);
}
