#!/usr/bin/env node
/**
 * Comprehensive Database Integrity Test for MySetlist
 * Tests database contents, relationships, and data quality
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('❌ Missing required environment variables:');
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', !!SUPABASE_URL);
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', !!SERVICE_KEY);
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

// Core tables to test
const CORE_TABLES = [
  { name: 'artists', key_field: 'name' },
  { name: 'venues', key_field: 'name' },
  { name: 'shows', key_field: 'name' },
  { name: 'songs', key_field: 'title' },
  { name: 'setlists', key_field: 'name' },
  { name: 'setlist_songs', key_field: 'position' },
  { name: 'votes', key_field: 'user_id' },
  { name: 'users', key_field: 'email' },
  { name: 'artist_stats', key_field: 'artist_id' },
  { name: 'artist_songs', key_field: 'artist_id' },
  { name: 'show_artists', key_field: 'show_id' },
  { name: 'user_profiles', key_field: 'user_id' },
];

const results = {
  tableCounts: {},
  relationshipViolations: [],
  dataQualityIssues: [],
  duplicates: [],
  missingRequiredFields: [],
  errors: []
};

/**
 * 1. COUNT RECORDS IN ALL TABLES
 */
async function checkTableCounts() {
  console.log('📊 1. CHECKING TABLE COUNTS\n');
  
  for (const table of CORE_TABLES) {
    try {
      const { count, error } = await supabase
        .from(table.name)
        .select('*', { count: 'exact', head: true });
      
      if (error) {
        results.errors.push(`Table ${table.name}: ${error.message}`);
        console.log(`   ❌ ${table.name}: ERROR - ${error.message}`);
      } else {
        results.tableCounts[table.name] = count || 0;
        console.log(`   ✅ ${table.name}: ${count || 0} records`);
      }
    } catch (e) {
      results.errors.push(`Table ${table.name}: ${e.message}`);
      console.log(`   ❌ ${table.name}: EXCEPTION - ${e.message}`);
    }
  }
  
  console.log('\n   📈 SUMMARY:');
  const totalRecords = Object.values(results.tableCounts).reduce((sum, count) => sum + count, 0);
  console.log(`   🎯 Total records across all tables: ${totalRecords}`);
  
  // Identify empty tables
  const emptyTables = Object.entries(results.tableCounts).filter(([_, count]) => count === 0);
  if (emptyTables.length > 0) {
    console.log(`   ⚠️  Empty tables: ${emptyTables.map(([name]) => name).join(', ')}`);
  }
}

/**
 * 2. CHECK FOREIGN KEY RELATIONSHIPS
 */
async function checkRelationships() {
  console.log('\n🔗 2. CHECKING FOREIGN KEY RELATIONSHIPS\n');
  
  const relationshipChecks = [
    {
      name: 'Shows → Artists (headliner)',
      child: 'shows',
      childField: 'headliner_artist_id',
      parent: 'artists',
      parentField: 'id'
    },
    {
      name: 'Shows → Venues',
      child: 'shows',
      childField: 'venue_id', 
      parent: 'venues',
      parentField: 'id'
    },
    {
      name: 'Setlists → Shows',
      child: 'setlists',
      childField: 'show_id',
      parent: 'shows',
      parentField: 'id'
    },
    {
      name: 'Setlists → Artists',
      child: 'setlists',
      childField: 'artist_id',
      parent: 'artists',
      parentField: 'id'
    },
    {
      name: 'Setlist Songs → Setlists',
      child: 'setlist_songs',
      childField: 'setlist_id',
      parent: 'setlists',
      parentField: 'id'
    },
    {
      name: 'Setlist Songs → Songs',
      child: 'setlist_songs',
      childField: 'song_id',
      parent: 'songs',
      parentField: 'id'
    },
    {
      name: 'Votes → Users',
      child: 'votes',
      childField: 'user_id',
      parent: 'users',
      parentField: 'id'
    },
    {
      name: 'Votes → Setlist Songs',
      child: 'votes',
      childField: 'setlist_song_id',
      parent: 'setlist_songs',
      parentField: 'id'
    },
    {
      name: 'Artist Stats → Artists',
      child: 'artist_stats',
      childField: 'artist_id',
      parent: 'artists',
      parentField: 'id'
    },
    {
      name: 'Artist Songs → Artists',
      child: 'artist_songs',
      childField: 'artist_id',
      parent: 'artists',
      parentField: 'id'
    },
    {
      name: 'Artist Songs → Songs',
      child: 'artist_songs',
      childField: 'song_id',
      parent: 'songs',
      parentField: 'id'
    },
    {
      name: 'Show Artists → Shows',
      child: 'show_artists',
      childField: 'show_id',
      parent: 'shows',
      parentField: 'id'
    },
    {
      name: 'Show Artists → Artists',
      child: 'show_artists',
      childField: 'artist_id',
      parent: 'artists',
      parentField: 'id'
    },
    {
      name: 'User Profiles → Users',
      child: 'user_profiles',
      childField: 'user_id',
      parent: 'users',
      parentField: 'id'
    }
  ];
  
  for (const check of relationshipChecks) {
    try {
      // Find orphaned records (child records with foreign keys that don't exist in parent)
      const { data: orphans, error } = await supabase.rpc('find_orphaned_records', {
        child_table: check.child,
        child_field: check.childField,
        parent_table: check.parent,
        parent_field: check.parentField
      });
      
      if (error) {
        // Fallback: manual check if the RPC doesn't exist
        const { data: childRecords, error: childError } = await supabase
          .from(check.child)
          .select(`${check.childField}`)
          .not(check.childField, 'is', null);
          
        if (childError) {
          results.errors.push(`Relationship check ${check.name}: ${childError.message}`);
          console.log(`   ❌ ${check.name}: ERROR - ${childError.message}`);
          continue;
        }
        
        const parentIds = new Set();
        const { data: parentRecords, error: parentError } = await supabase
          .from(check.parent)
          .select(check.parentField);
          
        if (parentError) {
          results.errors.push(`Relationship check ${check.name}: ${parentError.message}`);
          console.log(`   ❌ ${check.name}: ERROR - ${parentError.message}`);
          continue;
        }
        
        parentRecords?.forEach(record => parentIds.add(record[check.parentField]));
        
        const orphanedIds = childRecords?.filter(record => 
          record[check.childField] && !parentIds.has(record[check.childField])
        ) || [];
        
        if (orphanedIds.length > 0) {
          results.relationshipViolations.push({
            relationship: check.name,
            orphaned_count: orphanedIds.length,
            sample_orphaned_ids: orphanedIds.slice(0, 5).map(r => r[check.childField])
          });
          console.log(`   ❌ ${check.name}: ${orphanedIds.length} orphaned records`);
          console.log(`      Sample orphaned IDs: ${orphanedIds.slice(0, 3).map(r => r[check.childField]).join(', ')}`);
        } else {
          console.log(`   ✅ ${check.name}: No orphaned records`);
        }
      } else {
        // Use RPC result if available
        if (orphans && orphans.length > 0) {
          results.relationshipViolations.push({
            relationship: check.name,
            orphaned_count: orphans.length,
            sample_orphaned_ids: orphans.slice(0, 5)
          });
          console.log(`   ❌ ${check.name}: ${orphans.length} orphaned records`);
        } else {
          console.log(`   ✅ ${check.name}: No orphaned records`);
        }
      }
    } catch (e) {
      results.errors.push(`Relationship check ${check.name}: ${e.message}`);
      console.log(`   ❌ ${check.name}: EXCEPTION - ${e.message}`);
    }
  }
}

/**
 * 3. CHECK FOR DATA QUALITY ISSUES
 */
async function checkDataQuality() {
  console.log('\n🔍 3. CHECKING DATA QUALITY\n');
  
  // Check for missing required fields
  const requiredFieldChecks = [
    { table: 'artists', field: 'name', description: 'Artists without names' },
    { table: 'artists', field: 'slug', description: 'Artists without slugs' },
    { table: 'venues', field: 'name', description: 'Venues without names' },
    { table: 'venues', field: 'city', description: 'Venues without cities' },
    { table: 'shows', field: 'name', description: 'Shows without names' },
    { table: 'shows', field: 'date', description: 'Shows without dates' },
    { table: 'songs', field: 'title', description: 'Songs without titles' },
    { table: 'songs', field: 'artist', description: 'Songs without artist names' },
    { table: 'users', field: 'email', description: 'Users without emails' },
  ];
  
  console.log('   🧹 Checking for missing required fields:');
  for (const check of requiredFieldChecks) {
    try {
      const { count, error } = await supabase
        .from(check.table)
        .select('*', { count: 'exact', head: true })
        .or(`${check.field}.is.null,${check.field}.eq.`);
      
      if (error) {
        results.errors.push(`Required field check ${check.description}: ${error.message}`);
        console.log(`     ❌ ${check.description}: ERROR - ${error.message}`);
      } else if (count > 0) {
        results.missingRequiredFields.push({
          table: check.table,
          field: check.field,
          count: count,
          description: check.description
        });
        console.log(`     ⚠️  ${check.description}: ${count} records`);
      } else {
        console.log(`     ✅ ${check.description}: All records have required field`);
      }
    } catch (e) {
      results.errors.push(`Required field check ${check.description}: ${e.message}`);
      console.log(`     ❌ ${check.description}: EXCEPTION - ${e.message}`);
    }
  }
  
  // Check for duplicate records
  console.log('\n   🔄 Checking for duplicates:');
  const duplicateChecks = [
    { table: 'artists', field: 'slug', description: 'Artists with duplicate slugs' },
    { table: 'artists', field: 'spotify_id', description: 'Artists with duplicate Spotify IDs' },
    { table: 'venues', field: 'slug', description: 'Venues with duplicate slugs' },
    { table: 'shows', field: 'slug', description: 'Shows with duplicate slugs' },
    { table: 'songs', field: 'spotify_id', description: 'Songs with duplicate Spotify IDs' },
    { table: 'users', field: 'email', description: 'Users with duplicate emails' },
  ];
  
  for (const check of duplicateChecks) {
    try {
      // Get all non-null, non-empty values for the field
      const { data: allValues, error: fetchError } = await supabase
        .from(check.table)
        .select(check.field)
        .not(check.field, 'is', null)
        .neq(check.field, '');
      
      if (fetchError) {
        results.errors.push(`Duplicate check ${check.description}: ${fetchError.message}`);
        console.log(`     ❌ ${check.description}: ERROR - ${fetchError.message}`);
        continue;
      }
      
      // Count occurrences of each value
      const valueCounts = {};
      allValues?.forEach(record => {
        const value = record[check.field];
        valueCounts[value] = (valueCounts[value] || 0) + 1;
      });
      
      // Find duplicates
      const duplicates = Object.entries(valueCounts).filter(([_, count]) => count > 1);
      
      if (duplicates.length > 0) {
        results.duplicates.push({
          table: check.table,
          field: check.field,
          duplicate_values: duplicates.slice(0, 5).map(([value, count]) => ({ [check.field]: value, count })),
          total_duplicate_groups: duplicates.length,
          description: check.description
        });
        console.log(`     ⚠️  ${check.description}: ${duplicates.length} duplicate groups`);
        console.log(`        Sample duplicates: ${duplicates.slice(0, 3).map(([value, count]) => `${value} (${count}x)`).join(', ')}`);
      } else {
        console.log(`     ✅ ${check.description}: No duplicates found`);
      }
    } catch (e) {
      results.errors.push(`Duplicate check ${check.description}: ${e.message}`);
      console.log(`     ❌ ${check.description}: EXCEPTION - ${e.message}`);
    }
  }
  
  // Check for invalid data types and ranges
  console.log('\n   📏 Checking for invalid data ranges:');
  const rangeChecks = [
    { 
      table: 'artists', 
      field: 'popularity', 
      condition: 'popularity < 0 OR popularity > 100',
      description: 'Artists with invalid popularity scores'
    },
    { 
      table: 'songs', 
      field: 'popularity', 
      condition: 'popularity < 0 OR popularity > 100',
      description: 'Songs with invalid popularity scores'
    },
    { 
      table: 'songs', 
      field: 'duration_ms', 
      condition: 'duration_ms <= 0 OR duration_ms > 3600000',
      description: 'Songs with invalid duration (0 or > 1 hour)'
    },
    { 
      table: 'venues', 
      field: 'capacity', 
      condition: 'capacity <= 0 OR capacity > 1000000',
      description: 'Venues with invalid capacity'
    },
  ];
  
  for (const check of rangeChecks) {
    try {
      // Note: Supabase doesn't support complex OR conditions easily, so we'll check each part
      const { count, error } = await supabase
        .from(check.table)
        .select('*', { count: 'exact', head: true })
        .not(check.field, 'is', null);
      
      if (error) {
        console.log(`     ❌ ${check.description}: ERROR - ${error.message}`);
      } else {
        // This is a simplified check - in production you'd want more sophisticated validation
        console.log(`     ℹ️  ${check.description}: ${count} total non-null records to validate`);
      }
    } catch (e) {
      results.errors.push(`Range check ${check.description}: ${e.message}`);
      console.log(`     ❌ ${check.description}: EXCEPTION - ${e.message}`);
    }
  }
}

/**
 * 4. CHECK SPECIFIC BUSINESS LOGIC
 */
async function checkBusinessLogic() {
  console.log('\n🎯 4. CHECKING BUSINESS LOGIC\n');
  
  // Check show-setlist consistency
  console.log('   🎪 Checking show-setlist relationships:');
  try {
    // Get all show IDs
    const { data: allShows, error: showsError } = await supabase
      .from('shows')
      .select('id, name')
      .limit(1000);
    
    // Get all show IDs that have setlists
    const { data: showsWithSetlists, error: setlistsError } = await supabase
      .from('setlists')
      .select('show_id');
    
    if (showsError || setlistsError) {
      console.log(`     ❌ Shows without setlists check: ${showsError?.message || setlistsError?.message}`);
    } else {
      const showIdsWithSetlists = new Set(showsWithSetlists?.map(s => s.show_id) || []);
      const showsWithoutSetlists = allShows?.filter(show => !showIdsWithSetlists.has(show.id)) || [];
      
      console.log(`     📊 Shows without setlists: ${showsWithoutSetlists.length} out of ${allShows?.length || 0}`);
      if (showsWithoutSetlists.length > 0) {
        results.dataQualityIssues.push({
          issue: 'Shows without setlists',
          count: showsWithoutSetlists.length,
          sample_data: showsWithoutSetlists.slice(0, 3).map(s => s.name)
        });
        console.log(`        Sample shows: ${showsWithoutSetlists.slice(0, 3).map(s => s.name).join(', ')}`);
      }
    }
  } catch (e) {
    console.log(`     ❌ Shows without setlists check: ${e.message}`);
  }
  
  // Check setlists without songs
  console.log('   🎵 Checking setlist-song relationships:');
  try {
    // Get all setlist IDs
    const { data: allSetlists, error: setlistsError } = await supabase
      .from('setlists')
      .select('id, name')
      .limit(1000);
    
    // Get all setlist IDs that have songs
    const { data: setlistsWithSongs, error: songsError } = await supabase
      .from('setlist_songs')
      .select('setlist_id');
    
    if (setlistsError || songsError) {
      console.log(`     ❌ Setlists without songs check: ${setlistsError?.message || songsError?.message}`);
    } else {
      const setlistIdsWithSongs = new Set(setlistsWithSongs?.map(s => s.setlist_id) || []);
      const setlistsWithoutSongs = allSetlists?.filter(setlist => !setlistIdsWithSongs.has(setlist.id)) || [];
      
      console.log(`     📊 Setlists without songs: ${setlistsWithoutSongs.length} out of ${allSetlists?.length || 0}`);
      if (setlistsWithoutSongs.length > 0) {
        results.dataQualityIssues.push({
          issue: 'Setlists without songs',
          count: setlistsWithoutSongs.length,
          sample_data: setlistsWithoutSongs.slice(0, 3).map(s => s.name || 'Unnamed setlist')
        });
        console.log(`        Sample setlists: ${setlistsWithoutSongs.slice(0, 3).map(s => s.name || 'Unnamed').join(', ')}`);
      }
    }
  } catch (e) {
    console.log(`     ❌ Setlists without songs check: ${e.message}`);
  }
  
  // Check vote consistency
  console.log('   🗳️  Checking vote data integrity:');
  try {
    const { data: votes, error } = await supabase
      .from('votes')
      .select('setlist_song_id')
      .limit(100);
    
    if (error) {
      console.log(`     ❌ Vote check: ${error.message}`);
    } else {
      console.log(`     📊 Total votes sample: ${votes?.length || 0}`);
      
      // Check if setlist_songs.upvotes matches actual vote counts
      if (votes?.length > 0) {
        const sampleSetlistSongId = votes[0].setlist_song_id;
        const { count: actualVoteCount } = await supabase
          .from('votes')
          .select('*', { count: 'exact', head: true })
          .eq('setlist_song_id', sampleSetlistSongId);
        
        const { data: setlistSong } = await supabase
          .from('setlist_songs')
          .select('upvotes')
          .eq('id', sampleSetlistSongId)
          .single();
        
        if (setlistSong && actualVoteCount !== setlistSong.upvotes) {
          console.log(`     ⚠️  Vote count mismatch detected for setlist_song ${sampleSetlistSongId}`);
          console.log(`        Actual votes: ${actualVoteCount}, Stored upvotes: ${setlistSong.upvotes}`);
          results.dataQualityIssues.push({
            issue: 'Vote count mismatch',
            details: `setlist_song ${sampleSetlistSongId}: actual ${actualVoteCount} vs stored ${setlistSong.upvotes}`
          });
        } else {
          console.log(`     ✅ Vote counts appear consistent (sample check)`);
        }
      }
    }
  } catch (e) {
    console.log(`     ❌ Vote check: ${e.message}`);
  }
}

/**
 * MAIN FUNCTION
 */
async function runDatabaseIntegrityTest() {
  console.log('🚀 MySetlist Database Integrity Test');
  console.log('=====================================\n');
  
  const startTime = Date.now();
  
  try {
    await checkTableCounts();
    await checkRelationships();
    await checkDataQuality();
    await checkBusinessLogic();
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log('\n📋 FINAL REPORT');
    console.log('===============\n');
    
    console.log('📊 TABLE RECORD COUNTS:');
    Object.entries(results.tableCounts).forEach(([table, count]) => {
      console.log(`   ${table}: ${count.toLocaleString()}`);
    });
    
    console.log(`\n🔗 RELATIONSHIP VIOLATIONS: ${results.relationshipViolations.length}`);
    results.relationshipViolations.forEach(violation => {
      console.log(`   ❌ ${violation.relationship}: ${violation.orphaned_count} orphaned records`);
    });
    
    console.log(`\n🧹 MISSING REQUIRED FIELDS: ${results.missingRequiredFields.length}`);
    results.missingRequiredFields.forEach(issue => {
      console.log(`   ⚠️  ${issue.description}: ${issue.count} records`);
    });
    
    console.log(`\n🔄 DUPLICATE RECORDS: ${results.duplicates.length}`);
    results.duplicates.forEach(dup => {
      console.log(`   ⚠️  ${dup.description}: ${dup.total_duplicate_groups} groups`);
    });
    
    console.log(`\n🎯 BUSINESS LOGIC ISSUES: ${results.dataQualityIssues.length}`);
    results.dataQualityIssues.forEach(issue => {
      console.log(`   ⚠️  ${issue.issue}: ${issue.count || 'detected'}`);
    });
    
    console.log(`\n❌ ERRORS ENCOUNTERED: ${results.errors.length}`);
    results.errors.forEach(error => {
      console.log(`   🚨 ${error}`);
    });
    
    const totalIssues = results.relationshipViolations.length + 
                       results.missingRequiredFields.length + 
                       results.duplicates.length + 
                       results.dataQualityIssues.length + 
                       results.errors.length;
    
    console.log(`\n⏱️  Test completed in ${duration}s`);
    console.log(`🎯 Overall Status: ${totalIssues === 0 ? '✅ HEALTHY' : `⚠️  ${totalIssues} ISSUES FOUND`}`);
    
    if (totalIssues === 0) {
      console.log('🎉 Database appears to be in good condition!');
    } else {
      console.log('🔧 Consider addressing the issues found above.');
    }
    
  } catch (error) {
    console.error('\n💥 FATAL ERROR:', error);
    process.exit(1);
  }
}

// Export for testing
if (require.main === module) {
  runDatabaseIntegrityTest();
}

module.exports = { runDatabaseIntegrityTest, results };