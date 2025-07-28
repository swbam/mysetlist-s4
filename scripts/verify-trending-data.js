#!/usr/bin/env node

/**
 * Verify Trending Data Script
 * Confirms that the trending system has real data and is working properly
 */

const { drizzle } = require('drizzle-orm/postgres-js');
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
  console.error('❌ DATABASE_URL not found');
  process.exit(1);
}

console.log('🔍 MySetlist Trending Data Verification');
console.log('========================================');

async function verifyTrendingData() {
  let sql;
  
  try {
    sql = postgres(DATABASE_URL, {
      ssl: 'require',
      max: 1,
    });

    console.log('✅ Database connected\n');

    // 1. Check artists with trending scores
    console.log('👤 TOP TRENDING ARTISTS:');
    const trendingArtists = await sql`
      SELECT 
        name, 
        trending_score, 
        popularity,
        followers,
        spotify_id,
        image_url,
        updated_at
      FROM artists 
      WHERE trending_score > 0 
      ORDER BY trending_score DESC 
      LIMIT 10
    `;
    
    if (trendingArtists.length === 0) {
      console.log('  ❌ No artists have trending scores!');
    } else {
      trendingArtists.forEach((artist, i) => {
        const spotifyStatus = artist.spotify_id ? '🎵' : '⚪';
        const imageStatus = artist.image_url ? '🖼️' : '⚪';
        console.log(`  ${i + 1}. ${artist.name} ${spotifyStatus}${imageStatus}`);
        console.log(`     Score: ${artist.trending_score?.toFixed(2)} | Popularity: ${artist.popularity} | Followers: ${artist.followers?.toLocaleString()}`);
        console.log(`     Updated: ${new Date(artist.updated_at).toLocaleString()}`);
        console.log('');
      });
    }

    // 2. Check shows with trending scores
    console.log('🎭 TOP TRENDING SHOWS:');
    const trendingShows = await sql`
      SELECT 
        s.name as show_name,
        s.trending_score,
        s.date,
        s.status,
        s.vote_count,
        s.view_count,
        s.attendee_count,
        a.name as artist_name,
        v.name as venue_name,
        v.city,
        v.state
      FROM shows s
      LEFT JOIN artists a ON s.headliner_artist_id = a.id
      LEFT JOIN venues v ON s.venue_id = v.id
      WHERE s.trending_score > 0 
      ORDER BY s.trending_score DESC 
      LIMIT 10
    `;
    
    if (trendingShows.length === 0) {
      console.log('  ❌ No shows have trending scores!');
    } else {
      trendingShows.forEach((show, i) => {
        const venueInfo = show.venue_name ? 
          `${show.venue_name}, ${show.city}${show.state ? `, ${show.state}` : ''}` : 
          'TBA';
        console.log(`  ${i + 1}. ${show.show_name}`);
        console.log(`     Artist: ${show.artist_name || 'Various'}`);
        console.log(`     Venue: ${venueInfo}`);
        console.log(`     Date: ${new Date(show.date).toLocaleDateString()}`);
        console.log(`     Score: ${show.trending_score?.toFixed(2)} | Status: ${show.status}`);
        console.log(`     Votes: ${show.vote_count || 0} | Views: ${show.view_count || 0} | Attendees: ${show.attendee_count || 0}`);
        console.log('');
      });
    }

    // 3. Check activity log entries
    console.log('📝 RECENT ACTIVITY LOG:');
    const recentActivity = await sql`
      SELECT 
        action,
        target_type,
        details,
        created_at
      FROM user_activity_log 
      ORDER BY created_at DESC 
      LIMIT 5
    `;
    
    if (recentActivity.length === 0) {
      console.log('  ⚠️  No activity log entries found');
    } else {
      recentActivity.forEach((activity, i) => {
        console.log(`  ${i + 1}. ${activity.action} (${activity.target_type})`);
        console.log(`     Time: ${new Date(activity.created_at).toLocaleString()}`);
        if (activity.details) {
          const details = typeof activity.details === 'string' ? JSON.parse(activity.details) : activity.details;
          if (details.artistName) {
            console.log(`     Artist: ${details.artistName}`);
          }
          if (details.source) {
            console.log(`     Source: ${details.source}`);
          }
        }
        console.log('');
      });
    }

    // 4. Statistics summary
    console.log('📊 DATABASE STATISTICS:');
    const stats = await sql`
      SELECT 
        (SELECT COUNT(*) FROM artists) as total_artists,
        (SELECT COUNT(*) FROM artists WHERE trending_score > 0) as trending_artists,
        (SELECT COUNT(*) FROM artists WHERE spotify_id IS NOT NULL) as spotify_artists,
        (SELECT COUNT(*) FROM shows) as total_shows,
        (SELECT COUNT(*) FROM shows WHERE trending_score > 0) as trending_shows,
        (SELECT COUNT(*) FROM shows WHERE status = 'upcoming') as upcoming_shows,
        (SELECT COUNT(*) FROM venues) as total_venues,
        (SELECT COUNT(*) FROM user_activity_log) as activity_entries,
        (SELECT MAX(trending_score) FROM artists) as max_artist_score,
        (SELECT MAX(trending_score) FROM shows) as max_show_score
    `;
    
    const stat = stats[0];
    console.log(`  🎤 Artists: ${stat.total_artists} total, ${stat.trending_artists} trending, ${stat.spotify_artists} with Spotify`);
    console.log(`  🎵 Shows: ${stat.total_shows} total, ${stat.trending_shows} trending, ${stat.upcoming_shows} upcoming`);
    console.log(`  🏛️  Venues: ${stat.total_venues} total`);
    console.log(`  📝 Activity Log: ${stat.activity_entries} entries`);
    console.log(`  📈 Max Scores: Artists ${stat.max_artist_score?.toFixed(2)}, Shows ${stat.max_show_score?.toFixed(2)}`);

    // 5. Data quality checks
    console.log('\n✅ DATA QUALITY CHECKS:');
    
    // Check for artists without Spotify data
    const artistsWithoutSpotify = await sql`
      SELECT COUNT(*) as count FROM artists WHERE spotify_id IS NULL
    `;
    console.log(`  ${artistsWithoutSpotify[0].count === 0 ? '✅' : '⚠️'} Artists without Spotify: ${artistsWithoutSpotify[0].count}`);
    
    // Check for shows without venues
    const showsWithoutVenues = await sql`
      SELECT COUNT(*) as count FROM shows WHERE venue_id IS NULL
    `;
    console.log(`  ${showsWithoutVenues[0].count === 0 ? '✅' : '⚠️'} Shows without venues: ${showsWithoutVenues[0].count}`);
    
    // Check for null trending scores
    const nullTrendingArtists = await sql`
      SELECT COUNT(*) as count FROM artists WHERE trending_score IS NULL OR trending_score = 0
    `;
    console.log(`  ${nullTrendingArtists[0].count === 0 ? '✅' : '⚠️'} Artists without trending scores: ${nullTrendingArtists[0].count}`);

    console.log('\n🎉 VERIFICATION COMPLETE!');
    
    // Final recommendation
    if (stat.trending_artists > 0 && stat.trending_shows > 0) {
      console.log('✨ The trending system is working with real data!');
      console.log('🚀 The trending page should now display actual trending content.');
      console.log('💡 To see this in action, start the development server with: pnpm dev');
    } else {
      console.log('⚠️  The trending system needs more data. Run the sync scripts to populate with real API data.');
    }

  } catch (error) {
    console.error('❌ Verification failed:', error.message);
    process.exit(1);
  } finally {
    if (sql) {
      await sql.end();
    }
  }
}

verifyTrendingData().catch(console.error);