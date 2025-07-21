/**
 * Test utilities for data maintenance endpoint
 * Use this for development and testing purposes
 */

import { db } from '@repo/database';
import { users, emailLogs, shows, setlists, votes, setlistSongs } from '@repo/database';
import { sql } from 'drizzle-orm';

interface TestDataStats {
  users: {
    total: number;
    unverified: number;
    oldUnverified: number;
  };
  emailLogs: {
    total: number;
    oldLogs: number;
  };
  contentIntegrity: {
    orphanedVotes: number;
    orphanedSetlistSongs: number;
    orphanedSetlists: number;
    duplicateSongs: number;
  };
  shows: {
    total: number;
    cancelled: number;
    oldCancelled: number;
  };
}

/**
 * Generate test data for maintenance endpoint testing
 */
export async function generateTestData() {
  const now = new Date();
  const thirtyOneDaysAgo = new Date(now.getTime() - 31 * 24 * 60 * 60 * 1000);
  const ninetyOneDaysAgo = new Date(now.getTime() - 91 * 24 * 60 * 60 * 1000);

  try {
    // Create some unverified users (old ones for cleanup testing)
    const testUsers = [];
    for (let i = 0; i < 5; i++) {
      const testUser = await db.insert(users).values({
        email: `test-unverified-${i}-${Date.now()}@example.com`,
        displayName: `Test User ${i}`,
        emailVerified: null, // Unverified
        createdAt: thirtyOneDaysAgo,
        updatedAt: thirtyOneDaysAgo,
      }).returning();
      testUsers.push(testUser[0]);
    }

    // Create some old email logs for cleanup testing
    for (let i = 0; i < 10; i++) {
      await db.insert(emailLogs).values({
        emailType: 'test_email',
        subject: `Test Email ${i}`,
        recipient: `test${i}@example.com`,
        status: 'sent',
        createdAt: ninetyOneDaysAgo,
        updatedAt: ninetyOneDaysAgo,
      });
    }

    console.log('Test data generated successfully');
    return {
      testUsersCreated: testUsers.length,
      testEmailLogsCreated: 10,
      message: 'Test data ready for maintenance endpoint testing'
    };
  } catch (error) {
    console.error('Failed to generate test data:', error);
    throw error;
  }
}

/**
 * Get current statistics before running maintenance
 */
export async function getPreMaintenanceStats(): Promise<TestDataStats> {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

  // User statistics
  const userStats = await db.execute(sql`
    SELECT 
      COUNT(*) as total,
      COUNT(CASE WHEN email_verified IS NULL THEN 1 END) as unverified,
      COUNT(CASE WHEN email_verified IS NULL AND created_at <= ${thirtyDaysAgo} THEN 1 END) as old_unverified
    FROM ${users}
  `);

  // Email log statistics
  const emailStats = await db.execute(sql`
    SELECT 
      COUNT(*) as total,
      COUNT(CASE WHEN created_at <= ${ninetyDaysAgo} THEN 1 END) as old_logs
    FROM ${emailLogs}
  `);

  // Content integrity statistics
  const orphanedVotes = await db.execute(sql`
    SELECT COUNT(*) as count
    FROM ${votes} v
    WHERE NOT EXISTS (
      SELECT 1 FROM ${setlistSongs} ss WHERE ss.id = v.setlist_song_id
    )
  `);

  const orphanedSetlistSongs = await db.execute(sql`
    SELECT COUNT(*) as count
    FROM ${setlistSongs} ss
    WHERE NOT EXISTS (
      SELECT 1 FROM ${setlists} sl WHERE sl.id = ss.setlist_id
    )
  `);

  const orphanedSetlists = await db.execute(sql`
    SELECT COUNT(*) as count
    FROM ${setlists} sl
    WHERE NOT EXISTS (
      SELECT 1 FROM ${shows} s WHERE s.id = sl.show_id
    )
  `);

  // Show statistics
  const showStats = await db.execute(sql`
    SELECT 
      COUNT(*) as total,
      COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled,
      COUNT(CASE WHEN status = 'cancelled' AND updated_at <= ${thirtyDaysAgo} THEN 1 END) as old_cancelled
    FROM ${shows}
  `);

  return {
    users: {
      total: Number(userStats.rows[0]?.total || 0),
      unverified: Number(userStats.rows[0]?.unverified || 0),
      oldUnverified: Number(userStats.rows[0]?.old_unverified || 0),
    },
    emailLogs: {
      total: Number(emailStats.rows[0]?.total || 0),
      oldLogs: Number(emailStats.rows[0]?.old_logs || 0),
    },
    contentIntegrity: {
      orphanedVotes: Number(orphanedVotes.rows[0]?.count || 0),
      orphanedSetlistSongs: Number(orphanedSetlistSongs.rows[0]?.count || 0),
      orphanedSetlists: Number(orphanedSetlists.rows[0]?.count || 0),
      duplicateSongs: 0, // Complex query, would need actual implementation
    },
    shows: {
      total: Number(showStats.rows[0]?.total || 0),
      cancelled: Number(showStats.rows[0]?.cancelled || 0),
      oldCancelled: Number(showStats.rows[0]?.old_cancelled || 0),
    },
  };
}

/**
 * Compare stats before and after maintenance
 */
export function compareStats(before: TestDataStats, after: TestDataStats) {
  return {
    users: {
      totalChange: after.users.total - before.users.total,
      unverifiedChange: after.users.unverified - before.users.unverified,
      oldUnverifiedChange: after.users.oldUnverified - before.users.oldUnverified,
    },
    emailLogs: {
      totalChange: after.emailLogs.total - before.emailLogs.total,
      oldLogsChange: after.emailLogs.oldLogs - before.emailLogs.oldLogs,
    },
    contentIntegrity: {
      orphanedVotesChange: after.contentIntegrity.orphanedVotes - before.contentIntegrity.orphanedVotes,
      orphanedSetlistSongsChange: after.contentIntegrity.orphanedSetlistSongs - before.contentIntegrity.orphanedSetlistSongs,
      orphanedSetlistsChange: after.contentIntegrity.orphanedSetlists - before.contentIntegrity.orphanedSetlists,
    },
    shows: {
      totalChange: after.shows.total - before.shows.total,
      cancelledChange: after.shows.cancelled - before.shows.cancelled,
      oldCancelledChange: after.shows.oldCancelled - before.shows.oldCancelled,
    },
  };
}

/**
 * Clean up test data after testing
 */
export async function cleanupTestData() {
  try {
    // Remove test users
    await db.execute(sql`
      DELETE FROM ${users} 
      WHERE email LIKE 'test-unverified-%@example.com'
    `);

    // Remove test email logs
    await db.execute(sql`
      DELETE FROM ${emailLogs} 
      WHERE subject LIKE 'Test Email %' 
      AND recipient LIKE 'test%@example.com'
    `);

    console.log('Test data cleaned up successfully');
    return { success: true, message: 'Test data removed' };
  } catch (error) {
    console.error('Failed to cleanup test data:', error);
    throw error;
  }
}

/**
 * Run a complete test cycle
 */
export async function runMaintenanceTest() {
  console.log('Starting maintenance test cycle...');

  try {
    // 1. Generate test data
    console.log('1. Generating test data...');
    const testDataResult = await generateTestData();

    // 2. Get before stats
    console.log('2. Getting before-maintenance stats...');
    const beforeStats = await getPreMaintenanceStats();

    // 3. Wait a moment
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 4. Simulate maintenance call (would be done externally)
    console.log('3. Maintenance should be run now via API call...');
    console.log('   GET /api/cron/data-maintenance');

    // 5. Get after stats (this would be called after maintenance)
    console.log('4. Getting after-maintenance stats...');
    const afterStats = await getPreMaintenanceStats();

    // 6. Compare results
    const comparison = compareStats(beforeStats, afterStats);

    // 7. Cleanup test data
    console.log('5. Cleaning up remaining test data...');
    await cleanupTestData();

    return {
      success: true,
      testDataGenerated: testDataResult,
      beforeStats,
      afterStats,
      comparison,
      message: 'Test cycle completed. Check the comparison results to validate maintenance effectiveness.'
    };
  } catch (error) {
    console.error('Test cycle failed:', error);
    
    // Try to cleanup even if test failed
    try {
      await cleanupTestData();
    } catch (cleanupError) {
      console.error('Also failed to cleanup test data:', cleanupError);
    }

    throw error;
  }
}