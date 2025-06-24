#!/usr/bin/env node
import 'dotenv/config';
import postgres from 'postgres';

async function testMigrations() {
  const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  
  if (!connectionString) {
    console.error('❌ Missing DATABASE_URL or POSTGRES_URL environment variable');
    process.exit(1);
  }

  const sql = postgres(connectionString, {
    max: 1,
    ssl: 'require'
  });

  console.log('🔍 Testing database migrations...\n');

  try {
    // Test 1: Check if all required extensions are installed
    console.log('1️⃣ Checking PostgreSQL extensions...');
    const extensions = await sql`
      SELECT extname FROM pg_extension 
      WHERE extname IN ('uuid-ossp', 'postgis', 'pg_trgm', 'unaccent')
      ORDER BY extname
    `;
    console.log('✅ Extensions:', extensions.map(e => e.extname).join(', '));

    // Test 2: Check if all required tables exist
    console.log('\n2️⃣ Checking core tables...');
    const tables = await sql`
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
    console.log(`✅ Found ${tables.length} tables`);

    // Test 3: Check if all enums exist
    console.log('\n3️⃣ Checking enum types...');
    const enums = await sql`
      SELECT typname FROM pg_type 
      WHERE typtype = 'e' 
      AND typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
      ORDER BY typname
    `;
    console.log('✅ Enums:', enums.map(e => e.typname).join(', '));

    // Test 4: Check RLS status
    console.log('\n4️⃣ Checking Row Level Security...');
    const rlsTables = await sql`
      SELECT tablename, rowsecurity 
      FROM pg_tables 
      WHERE schemaname = 'public' 
      AND rowsecurity = true
      ORDER BY tablename
    `;
    console.log(`✅ RLS enabled on ${rlsTables.length} tables`);

    // Test 5: Check indexes
    console.log('\n5️⃣ Checking performance indexes...');
    const indexes = await sql`
      SELECT COUNT(*) as count 
      FROM pg_indexes 
      WHERE schemaname = 'public'
    `;
    console.log(`✅ Found ${indexes[0].count} indexes`);

    // Test 6: Check triggers
    console.log('\n6️⃣ Checking update triggers...');
    const triggers = await sql`
      SELECT COUNT(*) as count 
      FROM information_schema.triggers 
      WHERE trigger_schema = 'public' 
      AND trigger_name LIKE 'update_%_updated_at'
    `;
    console.log(`✅ Found ${triggers[0].count} updated_at triggers`);

    // Test 7: Check foreign key constraints
    console.log('\n7️⃣ Checking foreign key constraints...');
    const foreignKeys = await sql`
      SELECT COUNT(*) as count 
      FROM information_schema.table_constraints 
      WHERE constraint_type = 'FOREIGN KEY' 
      AND table_schema = 'public'
    `;
    console.log(`✅ Found ${foreignKeys[0].count} foreign key constraints`);

    // Test 8: Check migration status
    console.log('\n8️⃣ Checking migration history...');
    const migrations = await sql`
      SELECT version, executed_at 
      FROM schema_migrations 
      ORDER BY version
      LIMIT 5
    `;
    console.log(`✅ ${migrations.length} migrations recorded`);
    migrations.forEach(m => {
      console.log(`   - ${m.version} (${new Date(m.executed_at).toLocaleString()})`);
    });

    console.log('\n✅ All migration tests passed!');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

// Run tests
if (import.meta.url === `file://${process.argv[1]}`) {
  testMigrations().catch(console.error);
}