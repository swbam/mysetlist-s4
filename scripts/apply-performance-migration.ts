#!/usr/bin/env tsx

/**
 * Apply Performance Optimization Migration
 * 
 * This script applies the comprehensive performance optimization migration
 * including all indexes, materialized views, and monitoring functions.
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { Client } from 'pg';

async function main() {
  console.log('🚀 Starting performance optimization migration...\n');

  // Read database connection from environment
  const databaseUrl = process.env.DATABASE_URL || process.env.DIRECT_URL;
  
  if (!databaseUrl) {
    console.error('❌ No DATABASE_URL or DIRECT_URL found in environment');
    process.exit(1);
  }

  const client = new Client({
    connectionString: databaseUrl,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    await client.connect();
    console.log('✅ Connected to database');

    // Read the migration file
    const migrationPath = join(__dirname, '..', 'packages', 'database', 'migrations', '0009_comprehensive_performance_optimization.sql');
    console.log(`📁 Reading migration file: ${migrationPath}`);
    
    const migrationSQL = readFileSync(migrationPath, 'utf-8');
    console.log(`📝 Migration file size: ${migrationSQL.length} characters`);

    // Split migration into individual statements for better error reporting
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('/*'));

    console.log(`🔄 Executing ${statements.length} migration statements...\n`);

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      // Skip comments and empty statements
      if (!statement || statement.startsWith('--') || statement.startsWith('/*')) {
        continue;
      }

      try {
        console.log(`⏳ [${i + 1}/${statements.length}] Executing statement...`);
        
        // Add semicolon back if needed
        const finalStatement = statement.endsWith(';') ? statement : statement + ';';
        
        const result = await client.query(finalStatement);
        
        // Show the first few words of the statement for context
        const preview = statement.substring(0, 80).replace(/\s+/g, ' ').trim();
        console.log(`✅ [${i + 1}/${statements.length}] Success: ${preview}${statement.length > 80 ? '...' : ''}`);
        
        if (result.rowCount !== null) {
          console.log(`   📊 Rows affected: ${result.rowCount}`);
        }
        
        successCount++;
      } catch (error) {
        const preview = statement.substring(0, 80).replace(/\s+/g, ' ').trim();
        console.error(`❌ [${i + 1}/${statements.length}] Error: ${preview}${statement.length > 80 ? '...' : ''}`);
        console.error(`   💥 ${error.message}`);
        
        // Continue with other statements even if one fails
        errorCount++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 Migration Summary:');
    console.log(`✅ Successful statements: ${successCount}`);
    console.log(`❌ Failed statements: ${errorCount}`);
    console.log(`📈 Success rate: ${((successCount / (successCount + errorCount)) * 100).toFixed(1)}%`);

    if (errorCount === 0) {
      console.log('\n🎉 Performance optimization migration completed successfully!');
      
      // Test a few key indexes to verify they were created
      console.log('\n🔍 Verifying key indexes...');
      
      const indexChecks = [
        "SELECT indexname FROM pg_indexes WHERE indexname = 'idx_artists_trending_score_desc'",
        "SELECT indexname FROM pg_indexes WHERE indexname = 'idx_shows_date_desc'", 
        "SELECT indexname FROM pg_indexes WHERE indexname = 'idx_votes_setlist_song_id'",
        "SELECT indexname FROM pg_indexes WHERE indexname = 'idx_songs_fulltext_search'"
      ];

      for (const check of indexChecks) {
        try {
          const result = await client.query(check);
          if (result.rowCount > 0) {
            console.log(`✅ Index verified: ${result.rows[0].indexname}`);
          } else {
            console.log(`⚠️  Index not found in check query`);
          }
        } catch (error) {
          console.log(`❌ Index check failed: ${error.message}`);
        }
      }

      // Check materialized views
      console.log('\n🔍 Verifying materialized views...');
      
      try {
        const mvCheck = await client.query(`
          SELECT matviewname 
          FROM pg_matviews 
          WHERE matviewname IN ('artist_performance_cache', 'show_performance_cache')
        `);
        
        console.log(`✅ Materialized views created: ${mvCheck.rowCount}`);
        mvCheck.rows.forEach(row => {
          console.log(`   📋 ${row.matviewname}`);
        });
      } catch (error) {
        console.log(`❌ Materialized view check failed: ${error.message}`);
      }

      // Check performance functions
      console.log('\n🔍 Verifying performance functions...');
      
      try {
        const funcCheck = await client.query(`
          SELECT proname 
          FROM pg_proc 
          WHERE proname IN ('refresh_performance_caches', 'analyze_performance_bottlenecks', 'get_cache_performance')
        `);
        
        console.log(`✅ Performance functions created: ${funcCheck.rowCount}`);
        funcCheck.rows.forEach(row => {
          console.log(`   🔧 ${row.proname}()`);
        });
      } catch (error) {
        console.log(`❌ Function check failed: ${error.message}`);
      }

    } else {
      console.log('\n⚠️  Migration completed with some errors. Review the failed statements above.');
    }

    console.log('\n📋 Next steps:');
    console.log('1. Run refresh_performance_caches() every 15 minutes via cron');
    console.log('2. Run run_performance_maintenance() daily');
    console.log('3. Monitor index_usage_stats for optimization opportunities');
    console.log('4. Check get_cache_performance() for cache hit ratios');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await client.end();
    console.log('\n🔌 Database connection closed');
  }
}

// Run the migration
main().catch(error => {
  console.error('💥 Unexpected error:', error);
  process.exit(1);
});