/**
 * Test utility for the show lifecycle endpoint
 * This file helps validate the endpoint functionality in development
 */

import { db } from '@repo/database';
import { shows, setlists, artists } from '@repo/database';
import { eq, and, inArray, sql } from 'drizzle-orm';

export interface ShowLifecycleTestData {
  testShows: Array<{
    id: string;
    name: string;
    status: string;
    date: string;
    startTime?: string;
  }>;
  testSetlists: Array<{
    id: string;
    showId: string;
    type: string;
    isLocked: boolean;
  }>;
}

/**
 * Create test data for show lifecycle testing
 */
export async function createTestData(): Promise<ShowLifecycleTestData> {
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  
  // Create test artist if needed
  const testArtist = await db
    .insert(artists)
    .values({
      name: 'Test Artist for Lifecycle',
      slug: 'test-artist-lifecycle',
      spotifyId: 'test-lifecycle-123',
    })
    .onConflictDoUpdate({
      target: artists.slug,
      set: { updatedAt: now },
    })
    .returning({ id: artists.id });

  const artistId = testArtist[0]!.id;

  // Create test shows with different statuses
  const testShows = await db
    .insert(shows)
    .values([
      {
        name: 'Test Show - Should Go Ongoing',
        slug: 'test-show-ongoing',
        headlinerArtistId: artistId,
        date: now.toISOString().split('T')[0]!,
        startTime: '20:00',
        status: 'upcoming',
      },
      {
        name: 'Test Show - Should Complete',
        slug: 'test-show-complete',
        headlinerArtistId: artistId,
        date: yesterday.toISOString().split('T')[0]!,
        startTime: '19:00',
        status: 'ongoing',
      },
      {
        name: 'Test Show - Should Cancel',
        slug: 'test-show-cancel',
        headlinerArtistId: artistId,
        date: new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]!,
        status: 'upcoming',
      },
    ])
    .onConflictDoUpdate({
      target: shows.slug,
      set: { updatedAt: now },
    })
    .returning({
      id: shows.id,
      name: shows.name,
      status: shows.status,
      date: shows.date,
      startTime: shows.startTime,
    });

  // Create test setlists that should be locked
  const testSetlists = await db
    .insert(setlists)
    .values(
      testShows.map((show) => ({
        showId: show.id,
        artistId,
        type: 'predicted' as const,
        name: `Test Setlist - ${show.name}`,
        isLocked: false,
      }))
    )
    .onConflictDoNothing()
    .returning({
      id: setlists.id,
      showId: setlists.showId,
      type: setlists.type,
      isLocked: setlists.isLocked,
    });

  return {
    testShows,
    testSetlists,
  };
}

/**
 * Validate test results after running the lifecycle endpoint
 */
export async function validateTestResults(
  testData: ShowLifecycleTestData
): Promise<{
  success: boolean;
  results: {
    showStatusChanges: number;
    setlistsLocked: number;
    errors: string[];
  };
}> {
  const errors: string[] = [];
  let showStatusChanges = 0;
  let setlistsLocked = 0;

  try {
    // Check if shows changed status as expected
    for (const testShow of testData.testShows) {
      const currentShow = await db
        .select({
          id: shows.id,
          status: shows.status,
          name: shows.name,
        })
        .from(shows)
        .where(eq(shows.id, testShow.id))
        .limit(1);

      if (currentShow.length === 0) {
        errors.push(`Test show ${testShow.name} not found`);
        continue;
      }

      const show = currentShow[0]!;
      
      // Validate expected status changes
      if (testShow.name.includes('Should Go Ongoing') && show.status !== 'ongoing') {
        errors.push(`Show "${show.name}" should be ongoing but is ${show.status}`);
      } else if (testShow.name.includes('Should Complete') && show.status !== 'completed') {
        errors.push(`Show "${show.name}" should be completed but is ${show.status}`);
      } else if (testShow.name.includes('Should Cancel') && show.status !== 'cancelled') {
        errors.push(`Show "${show.name}" should be cancelled but is ${show.status}`);
      } else {
        showStatusChanges++;
      }
    }

    // Check if setlists were locked appropriately
    for (const testSetlist of testData.testSetlists) {
      const currentSetlist = await db
        .select({
          id: setlists.id,
          isLocked: setlists.isLocked,
        })
        .from(setlists)
        .innerJoin(shows, eq(shows.id, setlists.showId))
        .where(eq(setlists.id, testSetlist.id))
        .limit(1);

      if (currentSetlist.length === 0) {
        errors.push(`Test setlist ${testSetlist.id} not found`);
        continue;
      }

      const setlist = currentSetlist[0]!;
      
      // Setlists should be locked if their show is ongoing or completed
      if (setlist.isLocked) {
        setlistsLocked++;
      }
    }

  } catch (error) {
    errors.push(`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  return {
    success: errors.length === 0,
    results: {
      showStatusChanges,
      setlistsLocked,
      errors,
    },
  };
}

/**
 * Clean up test data
 */
export async function cleanupTestData(testData: ShowLifecycleTestData): Promise<void> {
  try {
    // Delete test setlists
    await db
      .delete(setlists)
      .where(
        inArray(
          setlists.id,
          testData.testSetlists.map((s) => s.id)
        )
      );

    // Delete test shows
    await db
      .delete(shows)
      .where(
        inArray(
          shows.id,
          testData.testShows.map((s) => s.id)
        )
      );

    // Clean up test artist if no other shows reference it
    await db
      .delete(artists)
      .where(
        and(
          eq(artists.name, 'Test Artist for Lifecycle'),
          // Only delete if no shows reference this artist
          sql`NOT EXISTS (
            SELECT 1 FROM ${shows} 
            WHERE ${shows.headlinerArtistId} = ${artists.id}
          )`
        )
      );

  } catch (error) {
    console.error('Error cleaning up test data:', error);
  }
}

// Example usage in development:
/*
import { createTestData, validateTestResults, cleanupTestData } from './test-endpoint';

async function testShowLifecycle() {
  // 1. Create test data
  const testData = await createTestData();
  console.log('Created test data:', testData);

  // 2. Run the lifecycle endpoint (manually or via HTTP request)
  const response = await fetch('/api/cron/show-lifecycle', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.CRON_SECRET}`,
    },
  });
  
  const result = await response.json();
  console.log('Lifecycle endpoint result:', result);

  // 3. Validate results
  const validation = await validateTestResults(testData);
  console.log('Validation results:', validation);

  // 4. Clean up
  await cleanupTestData(testData);
  console.log('Cleaned up test data');
}
*/