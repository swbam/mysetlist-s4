#!/usr/bin/env node

/**
 * Migration script to help move data from SQL database to Convex
 * 
 * Usage:
 * 1. Export your SQL data to JSON files using this script's export functions
 * 2. Run the import functions to populate Convex
 * 
 * Prerequisites:
 * - Convex project set up and running
 * - Access to your existing SQL database
 */

const fs = require('fs');
const path = require('path');

// Configuration
const EXPORT_DIR = './migration-data';

// Ensure export directory exists
if (!fs.existsSync(EXPORT_DIR)) {
  fs.mkdirSync(EXPORT_DIR, { recursive: true });
}

/**
 * Export functions - adapt these to your SQL database structure
 */

// Example: Export users from SQL to JSON
function exportUsers() {
  // TODO: Replace with your actual SQL query
  const sqlQuery = `
    SELECT 
      id,
      email,
      name,
      spotify_id as spotifyId,
      role,
      EXTRACT(EPOCH FROM created_at) * 1000 as createdAt
    FROM users
  `;
  
  console.log('SQL Query for users export:');
  console.log(sqlQuery);
  console.log('\nSave the results to:', path.join(EXPORT_DIR, 'users.json'));
}

// Example: Export events from SQL to JSON
function exportEvents() {
  const sqlQuery = `
    SELECT 
      id,
      name,
      artist_name as artistName,
      venue,
      EXTRACT(EPOCH FROM date) * 1000 as date,
      status,
      setlist_fm_id as setlistFmId,
      EXTRACT(EPOCH FROM created_at) * 1000 as createdAt
    FROM events
  `;
  
  console.log('SQL Query for events export:');
  console.log(sqlQuery);
  console.log('\nSave the results to:', path.join(EXPORT_DIR, 'events.json'));
}

// Example: Export songs from SQL to JSON
function exportSongs() {
  const sqlQuery = `
    SELECT 
      id,
      title,
      artist,
      spotify_id as spotifyId,
      duration,
      EXTRACT(EPOCH FROM created_at) * 1000 as createdAt
    FROM songs
  `;
  
  console.log('SQL Query for songs export:');
  console.log(sqlQuery);
  console.log('\nSave the results to:', path.join(EXPORT_DIR, 'songs.json'));
}

// Example: Export votes from SQL to JSON
function exportVotes() {
  const sqlQuery = `
    SELECT 
      user_id as userId,
      event_id as eventId,
      song_id as songId,
      EXTRACT(EPOCH FROM created_at) * 1000 as createdAt
    FROM votes
  `;
  
  console.log('SQL Query for votes export:');
  console.log(sqlQuery);
  console.log('\nSave the results to:', path.join(EXPORT_DIR, 'votes.json'));
}

/**
 * Import functions - these will call your Convex mutations
 */

function generateImportScript() {
  const importScript = `
// Import script for Convex
// Run this in your Convex dashboard or using convex run

const fs = require('fs');

// Load exported data
const users = JSON.parse(fs.readFileSync('./migration-data/users.json', 'utf8'));
const events = JSON.parse(fs.readFileSync('./migration-data/events.json', 'utf8'));
const songs = JSON.parse(fs.readFileSync('./migration-data/songs.json', 'utf8'));
const votes = JSON.parse(fs.readFileSync('./migration-data/votes.json', 'utf8'));

// Step 1: Migrate users
console.log('Migrating users...');
const userResults = await convex.mutation('migration:migrateUsers', { users });
const userIdMap = {};
userResults.forEach(result => {
  userIdMap[result.originalId] = result.newId;
});

// Step 2: Migrate events
console.log('Migrating events...');
const eventResults = await convex.mutation('migration:migrateEvents', { events });
const eventIdMap = {};
eventResults.forEach(result => {
  eventIdMap[result.originalId] = result.newId;
});

// Step 3: Migrate songs
console.log('Migrating songs...');
const songResults = await convex.mutation('migration:migrateSongs', { songs });
const songIdMap = {};
songResults.forEach(result => {
  songIdMap[result.originalId] = result.newId;
});

// Step 4: Migrate votes
console.log('Migrating votes...');
const voteResults = await convex.mutation('migration:migrateVotes', {
  votes,
  userIdMap,
  eventIdMap,
  songIdMap
});

// Step 5: Rebuild tallies
console.log('Rebuilding tallies...');
const tallyResults = await convex.mutation('migration:rebuildTallies', {});

console.log('Migration completed!');
console.log('Users migrated:', userResults.length);
console.log('Events migrated:', eventResults.length);
console.log('Songs migrated:', songResults.length);
console.log('Votes migrated:', voteResults.filter(r => r.success).length);
console.log('Tallies created:', tallyResults.length);
`;

  fs.writeFileSync(path.join(EXPORT_DIR, 'import-to-convex.js'), importScript);
  console.log('Import script generated:', path.join(EXPORT_DIR, 'import-to-convex.js'));
}

// Main execution
function main() {
  const command = process.argv[2];
  
  switch (command) {
    case 'export-users':
      exportUsers();
      break;
    case 'export-events':
      exportEvents();
      break;
    case 'export-songs':
      exportSongs();
      break;
    case 'export-votes':
      exportVotes();
      break;
    case 'export-all':
      console.log('=== EXPORTING ALL DATA ===\n');
      exportUsers();
      console.log('\n---\n');
      exportEvents();
      console.log('\n---\n');
      exportSongs();
      console.log('\n---\n');
      exportVotes();
      console.log('\n=== EXPORT COMPLETE ===');
      break;
    case 'generate-import':
      generateImportScript();
      break;
    default:
      console.log('Usage:');
      console.log('  node migrate-to-convex.js export-all     # Show all export queries');
      console.log('  node migrate-to-convex.js export-users  # Show users export query');
      console.log('  node migrate-to-convex.js export-events # Show events export query');
      console.log('  node migrate-to-convex.js export-songs  # Show songs export query');
      console.log('  node migrate-to-convex.js export-votes  # Show votes export query');
      console.log('  node migrate-to-convex.js generate-import # Generate import script');
      break;
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  exportUsers,
  exportEvents,
  exportSongs,
  exportVotes,
  generateImportScript
};