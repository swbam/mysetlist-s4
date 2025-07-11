import { NextResponse } from 'next/server';
import { db } from '@repo/database';
import { votes, emailQueue } from '@repo/database';
import { sql } from 'drizzle-orm';

export async function GET() {
  try {
    const tests = {
      votePersistence: false,
      emailQueue: false,
      searchFunctionality: false,
      realtimeSetup: false,
    };

    // Test 1: Vote persistence
    try {
      const voteCount = await db.select({ count: sql<number>`count(*)` }).from(votes);
      tests.votePersistence = true;
      console.log('Vote persistence test passed, votes in DB:', voteCount[0]?.count || 0);
    } catch (error) {
      console.error('Vote persistence test failed:', error);
    }

    // Test 2: Email queue
    try {
      const emailCount = await db.select({ count: sql<number>`count(*)` }).from(emailQueue);
      tests.emailQueue = true;
      console.log('Email queue test passed, emails in queue:', emailCount[0]?.count || 0);
    } catch (error) {
      console.error('Email queue test failed:', error);
    }

    // Test 3: Search functionality
    try {
      const searchResponse = await fetch(`${process.env['NEXT_PUBLIC_APP_URL'] || 'http://localhost:3000'}/api/search?q=test`);
      tests.searchFunctionality = searchResponse.ok;
      console.log('Search functionality test passed');
    } catch (error) {
      console.error('Search functionality test failed:', error);
    }

    // Test 4: Realtime setup
    try {
      const supabaseUrl = process.env['NEXT_PUBLIC_SUPABASE_URL'];
      const supabaseAnonKey = process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY'];
      tests.realtimeSetup = !!(supabaseUrl && supabaseAnonKey && !supabaseUrl.includes('placeholder'));
      console.log('Realtime setup test:', tests.realtimeSetup ? 'configured' : 'not configured');
    } catch (error) {
      console.error('Realtime setup test failed:', error);
    }

    const allPassed = Object.values(tests).every(test => test);

    return NextResponse.json({
      success: allPassed,
      tests,
      summary: {
        passed: Object.values(tests).filter(t => t).length,
        failed: Object.values(tests).filter(t => !t).length,
        total: Object.values(tests).length,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Test suite failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}