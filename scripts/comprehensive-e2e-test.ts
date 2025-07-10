#!/usr/bin/env tsx
/**
 * Comprehensive E2E Test Script - Uses Real Synced Data
 * Run this after sync-trending-artists.ts to test with real data
 */

import { and, desc, eq, gte, sql } from 'drizzle-orm';
// dotenv is loaded by Next.js automatically
import { db } from '../packages/database/src';
import {
  artists,
  setlists,
  showArtists,
  shows,
  songs,
  venues,
  votes,
} from '../packages/database/src/schema';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001';

interface TestResult {
  name: string;
  passed: boolean;
  message: string;
  duration: number;
}

const results: TestResult[] = [];

async function runTest(name: string, testFn: () => Promise<void>) {
  const start = Date.now();
  try {
    await testFn();
    results.push({
      name,
      passed: true,
      message: 'Test passed',
      duration: Date.now() - start,
    });
  } catch (error) {
    results.push({
      name,
      passed: false,
      message: error instanceof Error ? error.message : String(error),
      duration: Date.now() - start,
    });
  }
}

async function checkDatabaseSeeding() {
  await runTest('Artists exist in database', async () => {
    const artistCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(artists)
      .then((r) => Number(r[0].count));

    if (artistCount === 0) {
      throw new Error('No artists found in database');
    }
  });

  await runTest('Artists have Spotify IDs', async () => {
    const artistsWithSpotify = await db
      .select({ count: sql<number>`count(*)` })
      .from(artists)
      .where(sql`${artists.spotifyId} IS NOT NULL`)
      .then((r) => Number(r[0].count));

    if (artistsWithSpotify === 0) {
      throw new Error('No artists with Spotify IDs found');
    }
  });

  await runTest('Shows exist in database', async () => {
    const showCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(shows)
      .then((r) => Number(r[0].count));

    if (showCount === 0) {
      throw new Error('No shows found in database');
    }
  });

  await runTest('Venues exist in database', async () => {
    const venueCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(venues)
      .then((r) => Number(r[0].count));

    if (venueCount === 0) {
      throw new Error('No venues found in database');
    }
  });

  await runTest('Songs exist in database', async () => {
    const _songCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(songs)
      .then((r) => Number(r[0].count));
  });
}

async function testAPIEndpoints() {
  await runTest('GET /api/artists returns data', async () => {
    const response = await fetch(`${APP_URL}/api/artists`);
    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }

    const data = await response.json();
    if (!Array.isArray(data)) {
      throw new Error('API did not return an array');
    }
    if (data.length === 0) {
      throw new Error('API returned empty array');
    }
  });

  await runTest('GET /api/shows returns upcoming shows', async () => {
    const response = await fetch(`${APP_URL}/api/shows?status=upcoming`);
    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }

    const data = await response.json();
    if (!data.shows || !Array.isArray(data.shows)) {
      throw new Error('API did not return shows array');
    }
  });

  await runTest('Artist detail API works', async () => {
    // Get an artist from the database
    const [artist] = await db.select().from(artists).limit(1);
    if (!artist) {
      throw new Error('No artist found to test');
    }

    const response = await fetch(`${APP_URL}/api/artists/${artist.slug}`);
    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }

    const data = await response.json();
    if (!data.id) {
      throw new Error('API did not return artist data');
    }
  });
}

async function testShowFunctionality() {
  await runTest('Shows have associated artists', async () => {
    const showsWithArtists = await db
      .select({
        showId: shows.id,
        showName: shows.name,
        artistName: artists.name,
      })
      .from(shows)
      .innerJoin(showArtists, eq(shows.id, showArtists.showId))
      .innerJoin(artists, eq(showArtists.artistId, artists.id))
      .limit(5);

    if (showsWithArtists.length === 0) {
      throw new Error('No shows with artists found');
    }
    showsWithArtists.forEach((_s) => {});
  });

  await runTest('Shows have venues', async () => {
    const showsWithVenues = await db
      .select({
        showName: shows.name,
        venueName: venues.name,
        city: venues.city,
      })
      .from(shows)
      .innerJoin(venues, eq(shows.venueId, venues.id))
      .limit(5);

    if (showsWithVenues.length === 0) {
      throw new Error('No shows with venues found');
    }
    showsWithVenues.forEach((_s) => {});
  });

  await runTest('Upcoming shows exist', async () => {
    const today = new Date().toISOString().split('T')[0];
    const upcomingShows = await db
      .select({ count: sql<number>`count(*)` })
      .from(shows)
      .where(and(eq(shows.status, 'upcoming'), gte(shows.date, today)))
      .then((r) => Number(r[0].count));

    if (upcomingShows === 0) {
      throw new Error('No upcoming shows found');
    }
  });
}

async function testDataIntegrity() {
  await runTest('All shows have valid dates', async () => {
    const invalidShows = await db
      .select({ count: sql<number>`count(*)` })
      .from(shows)
      .where(sql`${shows.date} IS NULL OR ${shows.date} = ''`)
      .then((r) => Number(r[0].count));

    if (invalidShows > 0) {
      throw new Error(`Found ${invalidShows} shows with invalid dates`);
    }
  });

  await runTest('All artists have slugs', async () => {
    const invalidArtists = await db
      .select({ count: sql<number>`count(*)` })
      .from(artists)
      .where(sql`${artists.slug} IS NULL OR ${artists.slug} = ''`)
      .then((r) => Number(r[0].count));

    if (invalidArtists > 0) {
      throw new Error(`Found ${invalidArtists} artists without slugs`);
    }
  });

  await runTest('All venues have required fields', async () => {
    const invalidVenues = await db
      .select({ count: sql<number>`count(*)` })
      .from(venues)
      .where(
        sql`${venues.name} IS NULL OR ${venues.city} IS NULL OR ${venues.country} IS NULL`
      )
      .then((r) => Number(r[0].count));

    if (invalidVenues > 0) {
      throw new Error(
        `Found ${invalidVenues} venues with missing required fields`
      );
    }
  });
}

async function testVotingSystem() {
  await runTest('Check if any shows have setlists', async () => {
    const _setlistCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(setlists)
      .then((r) => Number(r[0].count));
  });

  await runTest('Check voting table structure', async () => {
    // Just verify the table exists and can be queried
    const _voteCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(votes)
      .then((r) => Number(r[0].count));
  });
}

async function displaySummary() {
  const _passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  const _totalDuration = results.reduce((sum, r) => sum + r.duration, 0);

  if (failed > 0) {
    results.filter((r) => !r.passed).forEach((_r) => {});
  }

  const _stats = await db
    .select({
      artists: sql<number>`(SELECT COUNT(*) FROM ${artists})`,
      shows: sql<number>`(SELECT COUNT(*) FROM ${shows})`,
      venues: sql<number>`(SELECT COUNT(*) FROM ${venues})`,
      songs: sql<number>`(SELECT COUNT(*) FROM ${songs})`,
      upcomingShows: sql<number>`(SELECT COUNT(*) FROM ${shows} WHERE status = 'upcoming' AND date >= CURRENT_DATE)`,
    })
    .then((r) => r[0]);

  const sampleArtists = await db
    .select({
      name: artists.name,
      genres: artists.genres,
      popularity: artists.popularity,
    })
    .from(artists)
    .orderBy(desc(artists.popularity))
    .limit(5);
  sampleArtists.forEach((artist, _i) => {
    const _genres = JSON.parse(artist.genres || '[]')
      .slice(0, 3)
      .join(', ');
  });

  const upcomingShows = await db
    .select({
      showName: shows.name,
      showDate: shows.date,
      artistName: artists.name,
      venueName: venues.name,
      city: venues.city,
    })
    .from(shows)
    .innerJoin(showArtists, eq(shows.id, showArtists.showId))
    .innerJoin(artists, eq(showArtists.artistId, artists.id))
    .leftJoin(venues, eq(shows.venueId, venues.id))
    .where(
      and(
        eq(shows.status, 'upcoming'),
        gte(shows.date, new Date().toISOString().split('T')[0])
      )
    )
    .orderBy(shows.date)
    .limit(5);

  if (upcomingShows.length > 0) {
    upcomingShows.forEach((show, _i) => {
      const _venue = show.venueName
        ? `${show.venueName}, ${show.city}`
        : 'Venue TBA';
    });
  }
}

async function main() {
  try {
    await checkDatabaseSeeding();
    await testAPIEndpoints();
    await testShowFunctionality();
    await testDataIntegrity();
    await testVotingSystem();
  } catch (_error) {
  } finally {
    await displaySummary();
    process.exit(results.some((r) => !r.passed) ? 1 : 0);
  }
}

// Add npm script handler
if (process.argv.includes('--npm-script')) {
}

main().catch(console.error);
