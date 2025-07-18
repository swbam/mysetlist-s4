#!/usr/bin/env node

// Test database import
console.log('Testing database import...');

try {
  const db = require('@repo/database');
  console.log('✅ Database import successful');
  console.log('Available exports:', Object.keys(db));
  
  // Check if artists table is available
  if (db.artists) {
    console.log('✅ Artists table is available');
  } else {
    console.log('❌ Artists table is not available');
  }
  
  // Check if db instance is available
  if (db.db) {
    console.log('✅ Database instance is available');
  } else {
    console.log('❌ Database instance is not available');
  }
  
} catch (error) {
  console.error('❌ Database import failed:', error.message);
  console.error('Stack:', error.stack);
}

// Test Next.js API route directly
console.log('\nTesting direct API route...');

try {
  // Mock Next.js environment
  process.env.NODE_ENV = 'development';
  process.env.DATABASE_URL = 'postgresql://postgres.yzwkimtdaabyjbpykquu:Bambseth1590@aws-0-us-east-1.pooler.supabase.com:6543/postgres';
  
  // Test database connection
  const { db, artists } = require('@repo/database');
  
  console.log('Database client type:', typeof db);
  console.log('Artists table type:', typeof artists);
  
  // Try to create a simple query
  if (db && artists) {
    console.log('✅ Ready to test database query');
    
    // Test query execution
    db.select().from(artists).limit(1)
      .then(result => {
        console.log('✅ Query successful, result:', result.length, 'rows');
      })
      .catch(error => {
        console.error('❌ Query failed:', error.message);
      });
  }
  
} catch (error) {
  console.error('❌ Direct API test failed:', error.message);
  console.error('Stack:', error.stack);
}