#!/usr/bin/env node

/**
 * Verify Artist Shows Script
 * Checks if artists have proper show associations
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

    console.log('🔍 MySetlist Artist Shows Verification');
    console.log('====================================');
    console.log('✅ Database connection established');
    
    // Check top artists and their show counts
    console.log('\n📊 Top artists and their show counts:');
    
    const artistShowCounts = await sql`
      SELECT 
        a.id,
        a.name,
        a.spotify_id,
        COUNT(DISTINCT s.id) as total_shows,
        COUNT(DISTINCT sa.show_id) as shows_via_show_artists,
        COUNT(DISTINCT CASE WHEN s.headliner_artist_id = a.id THEN s.id END) as headliner_shows
      FROM artists a
      LEFT JOIN shows s ON s.headliner_artist_id = a.id
      LEFT JOIN show_artists sa ON sa.artist_id = a.id AND sa.is_headliner = true
      GROUP BY a.id, a.name, a.spotify_id
      ORDER BY total_shows DESC, a.name
      LIMIT 10
    `;
    
    artistShowCounts.forEach((artist, i) => {
      console.log(`  ${i + 1}. ${artist.name}`);
      console.log(`     Total shows: ${artist.total_shows}`);
      console.log(`     Via show_artists: ${artist.shows_via_show_artists}`);
      console.log(`     As headliner: ${artist.headliner_shows}`);
      if (artist.spotify_id) {
        console.log(`     Spotify ID: ${artist.spotify_id}`);
      }
      console.log('');
    });
    
    // Check for specific show details
    console.log('\n🎭 Show details with artist relationships:');
    
    const showDetails = await sql`
      SELECT 
        s.id as show_id,
        s.name as show_name,
        s.date,
        s.headliner_artist_id,
        ha.name as headliner_name,
        COUNT(sa.id) as show_artists_count,
        ARRAY_AGG(
          CASE WHEN sa.artist_id IS NOT NULL 
          THEN json_build_object(
            'artist_name', saa.name,
            'is_headliner', sa.is_headliner,
            'order_index', sa.order_index
          ) END
        ) as show_artists
      FROM shows s
      LEFT JOIN artists ha ON s.headliner_artist_id = ha.id
      LEFT JOIN show_artists sa ON sa.show_id = s.id
      LEFT JOIN artists saa ON sa.artist_id = saa.id
      GROUP BY s.id, s.name, s.date, s.headliner_artist_id, ha.name
      ORDER BY s.date DESC
      LIMIT 5
    `;
    
    showDetails.forEach((show, i) => {
      console.log(`  ${i + 1}. Show: ${show.show_name} (${show.date})`);
      console.log(`     Headliner: ${show.headliner_name || 'None'}`);
      console.log(`     Show Artists Count: ${show.show_artists_count}`);
      if (show.show_artists && show.show_artists[0]) {
        console.log(`     Show Artists:`, JSON.stringify(show.show_artists.filter(sa => sa !== null), null, 2));
      }
      console.log('');
    });
    
    // Check for any inconsistencies
    console.log('\n🔍 Checking for inconsistencies...');
    
    const inconsistencies = await sql`
      SELECT 
        s.id as show_id,
        s.name as show_name,
        s.headliner_artist_id,
        ha.name as headliner_name,
        COUNT(sa.id) as show_artists_entries
      FROM shows s
      LEFT JOIN artists ha ON s.headliner_artist_id = ha.id
      LEFT JOIN show_artists sa ON sa.show_id = s.id AND sa.artist_id = s.headliner_artist_id AND sa.is_headliner = true
      WHERE s.headliner_artist_id IS NOT NULL
      GROUP BY s.id, s.name, s.headliner_artist_id, ha.name
      HAVING COUNT(sa.id) = 0
    `;
    
    if (inconsistencies.length > 0) {
      console.log(`⚠️  Found ${inconsistencies.length} shows with headliners but no show_artists entries:`);
      inconsistencies.forEach((inc, i) => {
        console.log(`  ${i + 1}. Show: ${inc.show_name}, Headliner: ${inc.headliner_name}`);
      });
    } else {
      console.log('✅ No inconsistencies found! All shows with headliners have proper show_artists entries.');
    }
    
    // Check total statistics
    console.log('\n📈 Summary Statistics:');
    
    const stats = await sql`
      SELECT 
        (SELECT COUNT(*) FROM artists) as total_artists,
        (SELECT COUNT(*) FROM shows) as total_shows,
        (SELECT COUNT(*) FROM show_artists) as total_show_artists,
        (SELECT COUNT(*) FROM shows WHERE headliner_artist_id IS NOT NULL) as shows_with_headliners,
        (SELECT COUNT(DISTINCT show_id) FROM show_artists WHERE is_headliner = true) as shows_with_headliner_artists
    `;
    
    const stat = stats[0];
    console.log(`  Total Artists: ${stat.total_artists}`);
    console.log(`  Total Shows: ${stat.total_shows}`);
    console.log(`  Total Show-Artist Relationships: ${stat.total_show_artists}`);
    console.log(`  Shows with Headliners: ${stat.shows_with_headliners}`);
    console.log(`  Shows with Headliner Artists: ${stat.shows_with_headliner_artists}`);
    
    if (stat.shows_with_headliners === stat.shows_with_headliner_artists) {
      console.log('\n🎉 All data looks consistent!');
    } else {
      console.log('\n⚠️  Data inconsistency detected between headliner shows and show_artists entries');
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