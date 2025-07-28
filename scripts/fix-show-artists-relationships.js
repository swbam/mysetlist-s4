#!/usr/bin/env node

/**
 * Fix Show Artists Relationships Script
 * Populates missing show_artists records for headliners
 */

const postgres = require('postgres');
const { config } = require('dotenv');
const { resolve } = require('path');
const { existsSync } = require('fs');

// Load environment variables
const envPaths = [
  resolve(__dirname, '../.env.local'),
  resolve(__dirname, '../apps/web/.env.local'),
];

for (const envPath of envPaths) {
  if (existsSync(envPath)) {
    config({ path: envPath, override: false });
  }
}

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not found in environment variables');
  process.exit(1);
}

async function main() {
  let sql;
  
  try {
    // Create connection
    sql = postgres(DATABASE_URL, {
      ssl: 'require',
      max: 1,
      idle_timeout: 20,
      connect_timeout: 10,
    });

    console.log('🔍 MySetlist Show Artists Relationship Fix');
    console.log('==========================================');
    console.log('✅ Database connection established');
    
    // First, check current state
    console.log('\n📊 Checking current state...');
    
    const currentState = await sql`
      SELECT 
        COUNT(*) as total_shows,
        COUNT(CASE WHEN headliner_artist_id IS NOT NULL THEN 1 END) as shows_with_headliner,
        COUNT(DISTINCT sa.show_id) as shows_with_show_artists
      FROM shows s
      LEFT JOIN show_artists sa ON s.id = sa.show_id AND sa.is_headliner = true
    `;
    
    console.log(`  Total shows: ${currentState[0].total_shows}`);
    console.log(`  Shows with headliner: ${currentState[0].shows_with_headliner}`);
    console.log(`  Shows in show_artists: ${currentState[0].shows_with_show_artists}`);
    
    // Check how many missing relationships we need to fix
    const missingCount = await sql`
      SELECT COUNT(*) as missing_count
      FROM shows s
      WHERE s.headliner_artist_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM show_artists sa 
        WHERE sa.show_id = s.id 
        AND sa.artist_id = s.headliner_artist_id
        AND sa.is_headliner = true
      )
    `;
    
    console.log(`\n🔧 Missing show_artists relationships: ${missingCount[0].missing_count}`);
    
    if (parseInt(missingCount[0].missing_count) === 0) {
      console.log('✅ No missing relationships found! All shows already have proper show_artists entries.');
      return;
    }
    
    // Show a few examples of what will be fixed
    console.log('\n📝 Examples of shows that will be fixed:');
    const examples = await sql`
      SELECT 
        s.id as show_id,
        s.name as show_name,
        s.headliner_artist_id,
        a.name as artist_name
      FROM shows s
      JOIN artists a ON s.headliner_artist_id = a.id
      WHERE s.headliner_artist_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM show_artists sa 
        WHERE sa.show_id = s.id 
        AND sa.artist_id = s.headliner_artist_id
        AND sa.is_headliner = true
      )
      LIMIT 5
    `;
    
    examples.forEach((example, i) => {
      console.log(`  ${i + 1}. Show "${example.show_name}" → Artist "${example.artist_name}"`);
    });
    
    // Execute the fix
    console.log('\n🚀 Executing fix...');
    
    const insertResult = await sql`
      INSERT INTO show_artists (show_id, artist_id, order_index, is_headliner, created_at)
      SELECT 
        s.id as show_id,
        s.headliner_artist_id as artist_id,
        0 as order_index,
        true as is_headliner,
        NOW() as created_at
      FROM shows s
      WHERE s.headliner_artist_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM show_artists sa 
        WHERE sa.show_id = s.id 
        AND sa.artist_id = s.headliner_artist_id
        AND sa.is_headliner = true
      )
    `;
    
    console.log(`✅ Successfully inserted ${insertResult.count} show_artists relationships`);
    
    // Verify the fix
    console.log('\n🔍 Verifying fix...');
    
    const verifyState = await sql`
      SELECT 
        COUNT(*) as total_shows,
        COUNT(CASE WHEN headliner_artist_id IS NOT NULL THEN 1 END) as shows_with_headliner,
        COUNT(DISTINCT sa.show_id) as shows_with_show_artists
      FROM shows s
      LEFT JOIN show_artists sa ON s.id = sa.show_id AND sa.is_headliner = true
    `;
    
    console.log(`  Total shows: ${verifyState[0].total_shows}`);
    console.log(`  Shows with headliner: ${verifyState[0].shows_with_headliner}`);
    console.log(`  Shows in show_artists: ${verifyState[0].shows_with_show_artists}`);
    
    // Final check for any remaining missing relationships
    const finalMissingCount = await sql`
      SELECT COUNT(*) as missing_count
      FROM shows s
      WHERE s.headliner_artist_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM show_artists sa 
        WHERE sa.show_id = s.id 
        AND sa.artist_id = s.headliner_artist_id
        AND sa.is_headliner = true
      )
    `;
    
    if (parseInt(finalMissingCount[0].missing_count) === 0) {
      console.log('\n🎉 SUCCESS! All show_artists relationships are now properly populated!');
    } else {
      console.log(`\n⚠️  Still ${finalMissingCount[0].missing_count} missing relationships - may need manual investigation`);
    }
    
  } catch (error) {
    console.error('\n💥 Script failed:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    if (sql) {
      await sql.end();
    }
  }
}

main().catch(console.error);