#!/usr/bin/env npx tsx

/**
 * Direct GROK.md Import System Test
 * Tests the orchestrator directly without requiring the web server
 */

import { ArtistImportOrchestrator, type ImportConfig } from './apps/web/lib/services/orchestrators/ArtistImportOrchestrator';
import { ProgressBus } from './apps/web/lib/services/progress/ProgressBus';
import { db } from '@repo/database';
import { artists, shows, songs, venues, artistSongs } from '@repo/database';
import { eq } from 'drizzle-orm';

class DirectGrokTest {
  private orchestrator: ArtistImportOrchestrator;
  private testResults: Array<{
    name: string;
    status: 'PASSED' | 'FAILED';
    duration: number;
    details?: any;
    error?: string;
  }> = [];

  constructor() {
    // Use test configuration with lower concurrency for stability
    const config: Partial<ImportConfig> = {
      concurrency: {
        albums: 3,
        tracks: 2,
        shows: 2,
      },
      livenessThreshold: 0.8,
      retryAttempts: 2,
      phases: {
        identity: { timeoutMs: 5000 },
        shows: { timeoutMs: 60000 },
        catalog: { timeoutMs: 90000 },
      },
    };
    
    this.orchestrator = new ArtistImportOrchestrator(config);
  }

  async runTest(name: string, testFn: () => Promise<any>): Promise<void> {
    const startTime = Date.now();
    
    try {
      console.log(`🧪 Testing: ${name}`);
      const result = await testFn();
      const duration = Date.now() - startTime;
      
      this.testResults.push({
        name,
        status: 'PASSED',
        duration,
        details: result,
      });
      
      console.log(`✅ PASSED: ${name} (${duration}ms)`);
      if (result && typeof result === 'object') {
        console.log(`   📊 Result:`, JSON.stringify(result, null, 2));
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      this.testResults.push({
        name,
        status: 'FAILED',
        duration,
        error: errorMessage,
      });
      
      console.log(`❌ FAILED: ${name} (${duration}ms)`);
      console.log(`   Error: ${errorMessage}`);
    }
  }

  async testDatabaseConnection(): Promise<any> {
    // Test basic database connectivity
    const result = await db.select().from(artists).limit(1);
    return { 
      connectionWorking: true, 
      existingArtists: result.length,
      firstArtist: result[0]?.name || 'None'
    };
  }

  async testEnvironmentVariables(): Promise<any> {
    const requiredVars = [
      'TICKETMASTER_API_KEY',
      'SPOTIFY_CLIENT_ID',
      'SPOTIFY_CLIENT_SECRET',
    ];
    
    const results: Record<string, boolean> = {};
    
    for (const varName of requiredVars) {
      results[varName] = !!process.env[varName];
    }
    
    const allPresent = Object.values(results).every(Boolean);
    
    if (!allPresent) {
      throw new Error(`Missing environment variables: ${Object.entries(results).filter(([_, present]) => !present).map(([name]) => name).join(', ')}`);
    }
    
    return results;
  }

  async testProgressBusBasicOperations(): Promise<any> {
    const testArtistId = 'test-artist-' + Date.now();
    
    // Test reporting progress
    await ProgressBus.report(testArtistId, 'initializing', 10, 'Test message', {
      artistName: 'Test Artist',
      jobId: 'test-job-123',
    });
    
    // Test getting status
    const status = await ProgressBus.getStatus(testArtistId);
    
    if (!status) {
      throw new Error('Progress status not found after reporting');
    }
    
    if (status.stage !== 'initializing' || status.progress !== 10) {
      throw new Error(`Progress status mismatch: expected initializing/10, got ${status.stage}/${status.progress}`);
    }
    
    return {
      reported: true,
      retrieved: true,
      stage: status.stage,
      progress: status.progress,
      message: status.message,
    };
  }

  async testTicketmasterConnectivity(): Promise<any> {
    const tmApiKey = process.env.TICKETMASTER_API_KEY;
    if (!tmApiKey) {
      throw new Error('TICKETMASTER_API_KEY not set');
    }
    
    // Test with a known good attraction ID (Billie Eilish)
    const attractionId = 'K8vZ9171oC0';
    const url = `https://app.ticketmaster.com/discovery/v2/events.json?attractionId=${attractionId}&size=1&apikey=${tmApiKey}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Ticketmaster API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    const totalElements = data?.page?.totalElements || 0;
    const firstEvent = data?._embedded?.events?.[0];
    
    return {
      apiAccessible: true,
      totalEvents: totalElements,
      firstEventName: firstEvent?.name || 'None',
      firstEventDate: firstEvent?.dates?.start?.localDate || 'None',
      venue: firstEvent?._embedded?.venues?.[0]?.name || 'None',
    };
  }

  async testSpotifyConnectivity(): Promise<any> {
    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
    
    if (!clientId || !clientSecret) {
      throw new Error('Spotify credentials not set');
    }
    
    // Get access token
    const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      },
      body: 'grant_type=client_credentials',
    });
    
    if (!tokenResponse.ok) {
      throw new Error(`Spotify auth failed: ${tokenResponse.status} ${tokenResponse.statusText}`);
    }
    
    const tokenData = await tokenResponse.json();
    const token = tokenData.access_token;
    
    // Test API with Billie Eilish's Spotify ID
    const artistId = '6qqNVTkY8uBg9cP3Jd7DAH';
    const artistResponse = await fetch(`https://api.spotify.com/v1/artists/${artistId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    
    if (!artistResponse.ok) {
      throw new Error(`Spotify API error: ${artistResponse.status} ${artistResponse.statusText}`);
    }
    
    const artistData = await artistResponse.json();
    
    return {
      tokenObtained: true,
      apiAccessible: true,
      artistName: artistData.name,
      followers: artistData.followers?.total || 0,
      popularity: artistData.popularity || 0,
    };
  }

  async testPhase1Identity(): Promise<any> {
    // Test GROK.md Phase 1: Identity/Bootstrap (< 200ms)
    const tmAttractionId = 'K8vZ9171oC0'; // Billie Eilish
    
    const startTime = Date.now();
    const result = await this.orchestrator.initiateImport(tmAttractionId);
    const duration = Date.now() - startTime;
    
    if (duration > 200) {
      console.warn(`⚠️  Phase 1 took ${duration}ms (target: <200ms)`);
    }
    
    if (!result.artistId || !result.slug) {
      throw new Error('Phase 1 did not return artistId and slug');
    }
    
    // Verify artist exists in database
    const [artist] = await db
      .select()
      .from(artists)
      .where(eq(artists.id, result.artistId))
      .limit(1);
    
    if (!artist) {
      throw new Error('Artist not found in database after Phase 1');
    }
    
    return {
      artistId: result.artistId,
      slug: result.slug,
      duration,
      performanceTargetMet: duration <= 200,
      artistInDb: !!artist,
      artistName: artist.name,
      importStatus: artist.importStatus,
    };
  }

  async testCompleteImportSmallArtist(): Promise<any> {
    // Test complete import with smaller artist for faster testing
    const tmAttractionId = 'K8vZ9171oC0'; // Billie Eilish
    
    console.log(`   🎯 Starting complete import for attraction: ${tmAttractionId}`);
    
    // Phase 1: Initialize
    const { artistId } = await this.orchestrator.initiateImport(tmAttractionId);
    
    // Set up progress tracking
    const progressEvents: any[] = [];
    const progressListener = (event: any) => {
      progressEvents.push({
        stage: event.stage,
        progress: event.progress,
        message: event.message,
        timestamp: new Date().toISOString(),
      });
      console.log(`   📊 ${event.stage}: ${event.progress}% - ${event.message}`);
    };
    
    ProgressBus.onProgress(artistId, progressListener);
    
    try {
      // Run full import
      const importResult = await this.orchestrator.runFullImport(artistId);
      
      if (!importResult.success) {
        throw new Error(`Import failed: ${importResult.error}`);
      }
      
      // Validate results
      const finalArtist = await db
        .select()
        .from(artists)
        .where(eq(artists.id, artistId))
        .limit(1);
      
      const showCount = await db
        .select({ count: shows.id })
        .from(shows)
        .where(eq(shows.headlinerArtistId, artistId));
      
      const songCount = await db
        .select({ count: songs.id })
        .from(songs)
        .innerJoin(artistSongs, eq(artistSongs.songId, songs.id))
        .where(eq(artistSongs.artistId, artistId));
      
      const venueCount = await db
        .select({ count: venues.id })
        .from(venues)
        .innerJoin(shows, eq(shows.venueId, venues.id))
        .where(eq(shows.headlinerArtistId, artistId));
      
      return {
        importSuccessful: importResult.success,
        artistId,
        finalStatus: finalArtist[0]?.importStatus,
        stats: importResult.stats,
        actualCounts: {
          shows: showCount.length,
          songs: songCount.length,
          venues: venueCount.length,
        },
        progressEvents: progressEvents.length,
        duration: importResult.stats?.duration,
      };
      
    } finally {
      ProgressBus.offProgress(artistId, progressListener);
    }
  }

  async testStudioOnlyFiltering(): Promise<any> {
    // Query database for any imported songs and validate they're studio-only
    const liveSongs = await db
      .select()
      .from(songs)
      .where(eq(songs.isLive, true))
      .limit(10);
    
    const suspiciousLiveTitles = await db
      .select()
      .from(songs)
      .limit(100)
      .then(allSongs => 
        allSongs.filter(song => 
          song.name.toLowerCase().includes('live') ||
          song.name.toLowerCase().includes('unplugged') ||
          song.name.toLowerCase().includes('acoustic') ||
          song.albumName?.toLowerCase().includes('live')
        )
      );
    
    return {
      explicitLiveSongs: liveSongs.length,
      suspiciousLiveTitles: suspiciousLiveTitles.length,
      studioOnlyFilterWorking: liveSongs.length === 0,
      sampleSuspiciousTitles: suspiciousLiveTitles.slice(0, 5).map(s => s.name),
    };
  }

  printSummary(): void {
    const passed = this.testResults.filter(r => r.status === 'PASSED').length;
    const failed = this.testResults.filter(r => r.status === 'FAILED').length;
    const total = this.testResults.length;
    
    console.log('\n📋 GROK.md Import System Direct Test Results');
    console.log('=' .repeat(60));
    console.log(`Total Tests: ${total}`);
    console.log(`Passed: ${passed} ✅`);
    console.log(`Failed: ${failed} ❌`);
    console.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%`);
    
    console.log('\n📊 Test Details:');
    this.testResults.forEach(test => {
      const status = test.status === 'PASSED' ? '✅' : '❌';
      console.log(`   ${status} ${test.name}: ${test.duration}ms`);
      if (test.error) {
        console.log(`      Error: ${test.error}`);
      }
    });
    
    // Performance Analysis
    const phase1Test = this.testResults.find(t => t.name.includes('Phase 1'));
    if (phase1Test && phase1Test.details) {
      console.log('\n⚡ Performance Analysis:');
      console.log(`   Phase 1 (Identity): ${phase1Test.details.duration}ms (target: <200ms) ${phase1Test.details.performanceTargetMet ? '✅' : '⚠️'}`);
    }
    
    const completeImportTest = this.testResults.find(t => t.name.includes('Complete Import'));
    if (completeImportTest && completeImportTest.details) {
      console.log(`   Complete Import: ${completeImportTest.details.duration}ms`);
      console.log(`   Shows Imported: ${completeImportTest.details.actualCounts?.shows || 0}`);
      console.log(`   Songs Imported: ${completeImportTest.details.actualCounts?.songs || 0}`);
      console.log(`   Venues Imported: ${completeImportTest.details.actualCounts?.venues || 0}`);
    }
  }
}

async function main() {
  console.log('🧪 GROK.md Import System - Direct Testing');
  console.log('==========================================\n');
  
  const tester = new DirectGrokTest();
  
  // Run tests in order of dependency
  await tester.runTest('Database Connection', () => tester.testDatabaseConnection());
  await tester.runTest('Environment Variables', () => tester.testEnvironmentVariables());
  await tester.runTest('Progress Bus Operations', () => tester.testProgressBusBasicOperations());
  await tester.runTest('Ticketmaster Connectivity', () => tester.testTicketmasterConnectivity());
  await tester.runTest('Spotify Connectivity', () => tester.testSpotifyConnectivity());
  await tester.runTest('Phase 1 Identity Bootstrap', () => tester.testPhase1Identity());
  await tester.runTest('Complete Import Small Artist', () => tester.testCompleteImportSmallArtist());
  await tester.runTest('Studio-Only Filtering Validation', () => tester.testStudioOnlyFiltering());
  
  tester.printSummary();
  
  const failedTests = tester.testResults.filter(t => t.status === 'FAILED').length;
  process.exit(failedTests > 0 ? 1 : 0);
}

if (require.main === module) {
  main().catch(error => {
    console.error('💥 Test runner failed:', error);
    process.exit(1);
  });
}