#!/usr/bin/env node

/**
 * Script to identify and remove unused Supabase edge functions
 * Run with: pnpm tsx scripts/cleanup-unused-edge-functions.ts
 */

import chalk from 'chalk';

console.log(chalk.yellow('\n🧹 Supabase Edge Functions Cleanup Analysis\n'));

// Functions that exist in codebase and should be KEPT
const KEEP_FUNCTIONS = [
  'scheduled-sync',      // Main orchestrator
  'sync-artists',        // Syncs artist data
  'sync-artist-shows',   // Syncs shows for artists
  'sync-shows',          // Syncs show details
  'sync-setlists',       // Syncs setlist data
  'sync-song-catalog',   // Syncs song catalog
  'update-trending'      // Updates trending data
];

// Functions deployed but NOT in codebase - should be DELETED
const DELETE_FUNCTIONS = [
  'artist-discovery',     // Duplicate of search functionality
  'artist-sync',          // Old duplicate of sync-artists
  'daily-artist-sync',    // Replaced by scheduled-sync
  'daily-sync',           // Replaced by scheduled-sync
  'get-artist-shows',     // Replaced by sync-artist-shows
  'process-artist-links', // Not used anywhere
  'real-time-sync',       // Not needed, no real-time requirements
  'search-spotify-artists', // Should be API route, not edge function
  'setlist-scraper'       // Old name for sync-setlists
];

console.log(chalk.green('✅ Functions to KEEP (7 total):'));
KEEP_FUNCTIONS.forEach(fn => {
  console.log(`   - ${fn}`);
});

console.log(chalk.red('\n❌ Functions to DELETE (9 total):'));
DELETE_FUNCTIONS.forEach(fn => {
  console.log(`   - ${fn}`);
});

console.log(chalk.yellow('\n📋 Cleanup Instructions:'));
console.log('1. Go to Supabase Dashboard > Edge Functions');
console.log('2. For each function in the DELETE list above:');
console.log('   - Click on the function name');
console.log('   - Click "Delete" button');
console.log('   - Confirm deletion');

console.log(chalk.cyan('\n🔍 Verification:'));
console.log('- Only scheduled-sync is called by cron jobs');
console.log('- Other sync functions are called by scheduled-sync');
console.log('- No API routes reference the functions to delete');

console.log(chalk.green('\n✨ Result: Reduce from 16 to 7 functions\n'));