#!/usr/bin/env ts-node

// Set environment variables if not already set
process.env.DATABASE_URL = process.env.DATABASE_URL || 
  'postgresql://postgres.yzwkimtdaabyjbpykquu:Bambseth1590@aws-0-us-east-1.pooler.supabase.com:6543/postgres';

import { db } from './src/client';
import { artists } from './src/schema';

async function testDrizzleConnection() {
  console.log('Testing Drizzle ORM Connection...\n');
  
  try {
    // Test 1: Simple query
    console.log('1. Testing simple query...');
    const result = await db.select().from(artists).limit(5);
    console.log(`   ✓ Found ${result.length} artists`);
    
    if (result.length > 0) {
      console.log('   Sample artist:', {
        name: result[0].name,
        slug: result[0].slug,
        id: result[0].id
      });
    }
    
    // Test 2: Count query
    console.log('\n2. Testing count query...');
    const allArtists = await db.select().from(artists);
    console.log(`   ✓ Total artists in database: ${allArtists.length}`);
    
    console.log('\n✅ Database connection successful!');
    return true;
  } catch (error) {
    console.error('\n❌ Database connection failed:', error);
    return false;
  }
}

// Run test
testDrizzleConnection()
  .then(success => process.exit(success ? 0 : 1))
  .catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });