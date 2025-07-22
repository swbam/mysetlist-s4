#!/usr/bin/env ts-node

import { db, testConnection } from './src/index';
import { createSupabaseServerClient, createSupabaseAdminClient } from './src/supabase';
import { createSupabaseBrowserClient } from './src/supabase-client';
import { artists } from './src/schema';

console.log('Testing Database Connections...\n');

async function testDrizzle() {
  console.log('1. Testing Drizzle Connection:');
  try {
    const connected = await testConnection();
    console.log(`   ✓ Raw connection test: ${connected ? 'SUCCESS' : 'FAILED'}`);
    
    // Try a simple query
    const result = await db.select().from(artists).limit(1);
    console.log(`   ✓ Query test: SUCCESS (found ${result.length} artists)`);
    return true;
  } catch (error) {
    console.log(`   ✗ Drizzle test failed:`, error);
    return false;
  }
}

async function testSupabaseServer() {
  console.log('\n2. Testing Supabase Server Client:');
  try {
    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase.from('artists').select('id').limit(1);
    
    if (error) throw error;
    console.log(`   ✓ Supabase server test: SUCCESS (found ${data?.length || 0} artists)`);
    return true;
  } catch (error) {
    console.log(`   ✗ Supabase server test failed:`, error);
    return false;
  }
}

async function testSupabaseAdmin() {
  console.log('\n3. Testing Supabase Admin Client:');
  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase.from('artists').select('id').limit(1);
    
    if (error) throw error;
    console.log(`   ✓ Supabase admin test: SUCCESS (found ${data?.length || 0} artists)`);
    return true;
  } catch (error) {
    console.log(`   ✗ Supabase admin test failed:`, error);
    return false;
  }
}

async function testSupabaseBrowser() {
  console.log('\n4. Testing Supabase Browser Client:');
  try {
    const supabase = createSupabaseBrowserClient();
    const { data, error } = await supabase.from('artists').select('id').limit(1);
    
    if (error) throw error;
    console.log(`   ✓ Supabase browser test: SUCCESS (found ${data?.length || 0} artists)`);
    return true;
  } catch (error) {
    console.log(`   ✗ Supabase browser test failed:`, error);
    return false;
  }
}

async function runAllTests() {
  const results = await Promise.all([
    testDrizzle(),
    testSupabaseServer(),
    testSupabaseAdmin(),
    testSupabaseBrowser()
  ]);
  
  const allPassed = results.every(r => r);
  
  console.log('\n========================================');
  console.log(`Overall Result: ${allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);
  console.log('========================================\n');
  
  process.exit(allPassed ? 0 : 1);
}

// Run tests
runAllTests().catch(console.error);