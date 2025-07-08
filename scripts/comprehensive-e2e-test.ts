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
    console.log(`✅ ${name}`);
  } catch (error) {
    results.push({
      name,
      passed: false,
      message: error instanceof Error ? error.message : String(error),
      duration: Date.now() - start,
    });
    console.error(`❌ ${name}: ${error}`);
  }
}

async function checkDatabaseSeeding() {
  console.log('\n🔍 Checking database seeding...\n');

  await runTest('Artists exist in database', async () => {
    const artistCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(artists)
      .then((r) => Number(r[0].count));

    if (artistCount === 0) throw new Error('No artists found in database');
    console.log(`   Found ${artistCount} artists`);
  });

  await runTest('Artists have Spotify IDs', async () => {
    const artistsWithSpotify = await db
      .select({ count: sql<number>`count(*)` })
      .from(artists)
      .where(sql`${artists.spotifyId} IS NOT NULL`)
      .then((r) => Number(r[0].count));

    if (artistsWithSpotify === 0)
      throw new Error('No artists with Spotify IDs found');
    console.log(`   Found ${artistsWithSpotify} artists with Spotify IDs`);
  });

  await runTest('Shows exist in database', async () => {
    const showCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(shows)
      .then((r) => Number(r[0].count));

    if (showCount === 0) throw new Error('No shows found in database');
    console.log(`   Found ${showCount} shows`);
  });

  await runTest('Venues exist in database', async () => {
    const venueCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(venues)
      .then((r) => Number(r[0].count));

    if (venueCount === 0) throw new Error('No venues found in database');
    console.log(`   Found ${venueCount} venues`);
  });

  await runTest('Songs exist in database', async () => {
    const songCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(songs)
      .then((r) => Number(r[0].count));

    console.log(
      `   Found ${songCount} songs (may be 0 if song sync is still running)`
    );
  });
}

async function testAPIEndpoints() {
  console.log('\n🌐 Testing API endpoints...\n');

  await runTest('GET /api/artists returns data', async () => {
    const response = await fetch(`${APP_URL}/api/artists`);
    if (!response.ok) throw new Error(`API returned ${response.status}`);

    const data = await response.json();
    if (!Array.isArray(data)) throw new Error('API did not return an array');
    if (data.length === 0) throw new Error('API returned empty array');

    console.log(`   Returned ${data.length} artists`);
  });

  await runTest('GET /api/shows returns upcoming shows', async () => {
    const response = await fetch(`${APP_URL}/api/shows?status=upcoming`);
    if (!response.ok) throw new Error(`API returned ${response.status}`);

    const data = await response.json();
    if (!data.shows || !Array.isArray(data.shows))
      throw new Error('API did not return shows array');

    console.log(`   Returned ${data.shows.length} upcoming shows`);
  });

  await runTest('Artist detail API works', async () => {
    // Get an artist from the database
    const [artist] = await db.select().from(artists).limit(1);
    if (!artist) throw new Error('No artist found to test');

    const response = await fetch(`${APP_URL}/api/artists/${artist.slug}`);
    if (!response.ok) throw new Error(`API returned ${response.status}`);

    const data = await response.json();
    if (!data.id) throw new Error('API did not return artist data');

    console.log(`   Successfully fetched artist: ${data.name}`);
  });
}

async function testShowFunctionality() {
  console.log('\n🎤 Testing show functionality...\n');

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

    if (showsWithArtists.length === 0)
      throw new Error('No shows with artists found');

    console.log(
      `   Found ${showsWithArtists.length} show-artist relationships`
    );
    showsWithArtists.forEach((s) => {
      console.log(`     - ${s.showName} featuring ${s.artistName}`);
    });
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

    if (showsWithVenues.length === 0)
      throw new Error('No shows with venues found');

    console.log(`   Found ${showsWithVenues.length} shows with venues`);
    showsWithVenues.forEach((s) => {
      console.log(`     - ${s.showName} at ${s.venueName}, ${s.city}`);
    });
  });

  await runTest('Upcoming shows exist', async () => {
    const today = new Date().toISOString().split('T')[0];
    const upcomingShows = await db
      .select({ count: sql<number>`count(*)` })
      .from(shows)
      .where(and(eq(shows.status, 'upcoming'), gte(shows.date, today)))
      .then((r) => Number(r[0].count));

    if (upcomingShows === 0) throw new Error('No upcoming shows found');
    console.log(`   Found ${upcomingShows} upcoming shows`);
  });
}

async function testDataIntegrity() {
  console.log('\n🔒 Testing data integrity...\n');

  await runTest('All shows have valid dates', async () => {
    const invalidShows = await db
      .select({ count: sql<number>`count(*)` })
      .from(shows)
      .where(sql`${shows.date} IS NULL OR ${shows.date} = ''`)
      .then((r) => Number(r[0].count));

    if (invalidShows > 0)
      throw new Error(`Found ${invalidShows} shows with invalid dates`);
    console.log('   All shows have valid dates');
  });

  await runTest('All artists have slugs', async () => {
    const invalidArtists = await db
      .select({ count: sql<number>`count(*)` })
      .from(artists)
      .where(sql`${artists.slug} IS NULL OR ${artists.slug} = ''`)
      .then((r) => Number(r[0].count));

    if (invalidArtists > 0)
      throw new Error(`Found ${invalidArtists} artists without slugs`);
    console.log('   All artists have valid slugs');
  });

  await runTest('All venues have required fields', async () => {
    const invalidVenues = await db
      .select({ count: sql<number>`count(*)` })
      .from(venues)
      .where(
        sql`${venues.name} IS NULL OR ${venues.city} IS NULL OR ${venues.country} IS NULL`
      )
      .then((r) => Number(r[0].count));

    if (invalidVenues > 0)
      throw new Error(
        `Found ${invalidVenues} venues with missing required fields`
      );
    console.log('   All venues have required fields');
  });
}

async function testVotingSystem() {
  console.log('\n🗳️ Testing voting system (if applicable)...\n');

  await runTest('Check if any shows have setlists', async () => {
    const setlistCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(setlists)
      .then((r) => Number(r[0].count));

    console.log(`   Found ${setlistCount} setlists (may be 0 for new shows)`);
  });

  await runTest('Check voting table structure', async () => {
    // Just verify the table exists and can be queried
    const voteCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(votes)
      .then((r) => Number(r[0].count));

    console.log(`   Votes table accessible, contains ${voteCount} votes`);
  });
}

async function displaySummary() {
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(60) + '\n');

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);

  console.log(`Total Tests: ${results.length}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`⏱️  Total Duration: ${totalDuration}ms\n`);

  if (failed > 0) {
    console.log('Failed Tests:');
    results
      .filter((r) => !r.passed)
      .forEach((r) => {
        console.log(`  ❌ ${r.name}`);
        console.log(`     ${r.message}`);
      });
  }

  // Data summary
  console.log('\n📈 DATABASE SUMMARY:');

  const stats = await db
    .select({
      artists: sql<number>`(SELECT COUNT(*) FROM ${artists})`,
      shows: sql<number>`(SELECT COUNT(*) FROM ${shows})`,
      venues: sql<number>`(SELECT COUNT(*) FROM ${venues})`,
      songs: sql<number>`(SELECT COUNT(*) FROM ${songs})`,
      upcomingShows: sql<number>`(SELECT COUNT(*) FROM ${shows} WHERE status = 'upcoming' AND date >= CURRENT_DATE)`,
    })
    .then((r) => r[0]);

  console.log(`  Artists: ${stats.artists}`);
  console.log(`  Shows: ${stats.shows}`);
  console.log(`  Venues: ${stats.venues}`);
  console.log(`  Songs: ${stats.songs}`);
  console.log(`  Upcoming Shows: ${stats.upcomingShows}`);

  // Sample data
  console.log('\n🎵 SAMPLE DATA:');

  const sampleArtists = await db
    .select({
      name: artists.name,
      genres: artists.genres,
      popularity: artists.popularity,
    })
    .from(artists)
    .orderBy(desc(artists.popularity))
    .limit(5);

  console.log('\nTop 5 Artists by Popularity:');
  sampleArtists.forEach((artist, i) => {
    const genres = JSON.parse(artist.genres || '[]')
      .slice(0, 3)
      .join(', ');
    console.log(
      `  ${i + 1}. ${artist.name} (Popularity: ${artist.popularity}) - ${genres || 'No genres'}`
    );
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
    console.log('\nNext 5 Upcoming Shows:');
    upcomingShows.forEach((show, i) => {
      const venue = show.venueName
        ? `${show.venueName}, ${show.city}`
        : 'Venue TBA';
      console.log(
        `  ${i + 1}. ${show.showDate}: ${show.artistName} at ${venue}`
      );
    });
  }

  console.log('\n' + '='.repeat(60));
  console.log(failed > 0 ? '❌ TESTS FAILED' : '✅ ALL TESTS PASSED');
  console.log('='.repeat(60) + '\n');
}

async function main() {
  console.log('🚀 Starting Comprehensive E2E Test with Real Data\n');
  console.log(`Testing against: ${APP_URL}`);
  console.log('='.repeat(60));

  try {
    await checkDatabaseSeeding();
    await testAPIEndpoints();
    await testShowFunctionality();
    await testDataIntegrity();
    await testVotingSystem();
  } catch (error) {
    console.error('\n💥 Unexpected error during tests:', error);
  } finally {
    await displaySummary();
    process.exit(results.some((r) => !r.passed) ? 1 : 0);
  }
}

// Add npm script handler
if (process.argv.includes('--npm-script')) {
  console.log('Running comprehensive E2E test...');
}

main().catch(console.error);
