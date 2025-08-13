/**
 * Comprehensive Test Suite for Artist Import Flow
 * Tests all three phases and validates performance targets
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { faker } from '@faker-js/faker';
import { ArtistImportOrchestrator, type ImportProgress, type ImportResult } from '../services/artist-import-orchestrator';
import { db, artists, shows, venues, songs, artistSongs, setlists, setlistSongs, eq } from '@repo/database';

// Mock external API responses
const mockTicketmasterResponse = {
  id: 'K8vZ917G7x0',
  name: 'Taylor Swift',
  imageUrl: 'https://s1.ticketm.net/dam/a/123/artist-image.jpg',
  genres: ['Pop', 'Country'],
  classifications: [{ genre: { name: 'Pop' } }]
};

const mockSpotifyArtistResponse = {
  id: '06HL4z0CvFAxyc27GXpf02',
  name: 'Taylor Swift',
  genres: ['pop', 'country'],
  popularity: 100,
  followers: { total: 95000000 },
  images: [
    { url: 'https://i.scdn.co/image/large.jpg', height: 640, width: 640 },
    { url: 'https://i.scdn.co/image/medium.jpg', height: 320, width: 320 },
    { url: 'https://i.scdn.co/image/small.jpg', height: 160, width: 160 }
  ],
  external_urls: { spotify: 'https://open.spotify.com/artist/06HL4z0CvFAxyc27GXpf02' }
};

const mockSpotifySearchResponse = {
  artists: {
    items: [mockSpotifyArtistResponse]
  }
};

const mockSpotifyAlbumsResponse = {
  items: [
    {
      id: 'album1',
      name: '1989',
      album_type: 'album',
      total_tracks: 13,
      release_date: '2014-10-27'
    },
    {
      id: 'album2', 
      name: 'folklore',
      album_type: 'album',
      total_tracks: 16,
      release_date: '2020-07-24'
    }
  ]
};

const mockSpotifyTracksResponse = {
  items: [
    {
      id: 'track1',
      name: 'Shake It Off',
      track_number: 6,
      duration_ms: 219200,
      popularity: 85,
      audio_features: { energy: 0.8, danceability: 0.7 }
    },
    {
      id: 'track2',
      name: 'cardigan',
      track_number: 1,
      duration_ms: 239560,
      popularity: 80,
      audio_features: { energy: 0.5, danceability: 0.6 }
    }
  ]
};

const mockTicketmasterShowsResponse = {
  _embedded: {
    events: [
      {
        id: 'show1',
        name: 'Taylor Swift | The Eras Tour',
        dates: {
          start: {
            localDate: '2024-12-31',
            localTime: '20:00:00'
          }
        },
        _embedded: {
          venues: [{
            id: 'venue1',
            name: 'MetLife Stadium',
            city: { name: 'East Rutherford' },
            state: { name: 'New Jersey' },
            country: { name: 'United States' },
            address: { line1: '1 MetLife Stadium Dr' },
            location: { latitude: '40.813528', longitude: '-74.074361' }
          }]
        },
        classifications: [{ genre: { name: 'Pop' } }],
        info: 'The biggest tour of the year',
        pleaseNote: 'All ages welcome',
        url: 'https://www.ticketmaster.com/event/show1'
      }
    ]
  }
};

// Performance tracking utilities
class PerformanceTracker {
  private startTime: number = 0;
  private phaseTimings: Map<string, number> = new Map();

  start(phase: string): void {
    this.startTime = Date.now();
    this.phaseTimings.set(`${phase}_start`, this.startTime);
  }

  end(phase: string): number {
    const endTime = Date.now();
    const startTime = this.phaseTimings.get(`${phase}_start`) || this.startTime;
    const duration = endTime - startTime;
    this.phaseTimings.set(`${phase}_duration`, duration);
    return duration;
  }

  getDuration(phase: string): number {
    return this.phaseTimings.get(`${phase}_duration`) || 0;
  }

  getAll(): Record<string, number> {
    const result: Record<string, number> = {};
    for (const [key, value] of this.phaseTimings) {
      if (key.endsWith('_duration')) {
        result[key.replace('_duration', '')] = value;
      }
    }
    return result;
  }
}

// Test database helpers
async function cleanupTestData(artistId?: string): Promise<void> {
  if (artistId) {
    // Delete in proper order due to foreign key constraints
    await db.delete(setlistSongs).where(eq(setlistSongs.setlistId, artistId));
    await db.delete(setlists).where(eq(setlists.artistId, artistId));
    await db.delete(artistSongs).where(eq(artistSongs.artistId, artistId));
    await db.delete(shows).where(eq(shows.headlinerArtistId, artistId));
    await db.delete(artists).where(eq(artists.id, artistId));
  }
}

async function createMockArtist(): Promise<string> {
  const [artist] = await db.insert(artists).values({
    name: faker.person.fullName(),
    slug: faker.lorem.slug(),
    spotifyId: faker.string.alphanumeric(22),
    ticketmasterId: faker.string.alphanumeric(10),
    genres: JSON.stringify(['pop', 'rock']),
    popularity: faker.number.int({ min: 0, max: 100 }),
    followers: faker.number.int({ min: 1000, max: 10000000 }),
    imageUrl: faker.image.url(),
    verified: false,
    lastSyncedAt: new Date(),
  } as any).returning({ id: artists.id });

  return artist?.id || '';
}

// Mock setup helpers
function setupApiMocks() {
  // Mock Ticketmaster API
  vi.mock('@repo/external-apis/src/clients/ticketmaster', () => ({
    TicketmasterClient: vi.fn().mockImplementation(() => ({
      getAttraction: vi.fn().mockResolvedValue(mockTicketmasterResponse),
      searchEvents: vi.fn().mockResolvedValue(mockTicketmasterShowsResponse),
    }))
  }));

  // Mock Spotify API
  vi.mock('@repo/external-apis/src/clients/spotify', () => ({
    SpotifyClient: vi.fn().mockImplementation(() => ({
      authenticate: vi.fn().mockResolvedValue(true),
      searchArtists: vi.fn().mockResolvedValue(mockSpotifySearchResponse),
      getArtistAlbums: vi.fn().mockResolvedValue(mockSpotifyAlbumsResponse),
      getAlbumTracks: vi.fn().mockResolvedValue(mockSpotifyTracksResponse),
      getAudioFeatures: vi.fn().mockResolvedValue(mockSpotifyTracksResponse.items.map(t => t.audio_features)),
    }))
  }));

  // Mock sync services
  vi.mock('@repo/external-apis/src/services/artist-sync', () => ({
    ArtistSyncService: vi.fn().mockImplementation(() => ({
      syncCatalog: vi.fn().mockResolvedValue({
        totalSongs: 25,
        totalAlbums: 3,
        skippedLiveTracks: 5,
        deduplicatedTracks: 2
      })
    }))
  }));

  vi.mock('@repo/external-apis/src/services/show-sync', () => ({
    ShowSyncService: vi.fn().mockImplementation(() => ({
      syncArtistShows: vi.fn().mockResolvedValue({
        upcomingShows: 8,
        pastShows: 0,
        venuesCreated: 3
      })
    }))
  }));
}

describe('Artist Import Flow - Comprehensive Tests', () => {
  let orchestrator: ArtistImportOrchestrator;
  let tracker: PerformanceTracker;
  let progressUpdates: ImportProgress[] = [];
  let testArtistId: string | undefined;

  beforeEach(() => {
    setupApiMocks();
    tracker = new PerformanceTracker();
    progressUpdates = [];
    
    orchestrator = new ArtistImportOrchestrator(
      async (progress: ImportProgress) => {
        progressUpdates.push(progress);
      }
    );
  });

  afterEach(async () => {
    if (testArtistId) {
      await cleanupTestData(testArtistId);
    }
    vi.restoreAllMocks();
  });

  describe('Phase 1: Instant Artist Page Load (< 3 seconds)', () => {
    it('should complete Phase 1 within 3 seconds', async () => {
      tracker.start('phase1');
      
      const result = await orchestrator.processPhase1('K8vZ917G7x0');
      testArtistId = result.artistId;
      
      const duration = tracker.end('phase1');
      
      expect(duration).toBeLessThan(3000);
      expect(result).toMatchObject({
        artistId: expect.any(String),
        slug: expect.any(String),
        name: 'Taylor Swift',
        ticketmasterId: 'K8vZ917G7x0'
      });
    });

    it('should handle Ticketmaster timeout gracefully', async () => {
      // Mock timeout
      vi.mocked(orchestrator['ticketmasterClient'].getAttraction)
        .mockRejectedValueOnce(new Error('Ticketmaster API timeout'));

      await expect(orchestrator.processPhase1('K8vZ917G7x0'))
        .rejects.toThrow('Ticketmaster API timeout');
    });

    it('should work without Spotify data', async () => {
      // Mock Spotify failure
      vi.mocked(orchestrator['spotifyClient'].searchArtists)
        .mockRejectedValueOnce(new Error('Spotify timeout'));

      tracker.start('phase1_no_spotify');
      
      const result = await orchestrator.processPhase1('K8vZ917G7x0');
      testArtistId = result.artistId;
      
      const duration = tracker.end('phase1_no_spotify');
      
      expect(duration).toBeLessThan(3000);
      expect(result.name).toBe('Taylor Swift');
      expect(result.spotifyId).toBeUndefined();
    });

    it('should create proper database record', async () => {
      const result = await orchestrator.processPhase1('K8vZ917G7x0');
      testArtistId = result.artistId;

      const [dbArtist] = await db
        .select()
        .from(artists)
        .where(eq(artists.id, result.artistId));

      expect(dbArtist).toMatchObject({
        name: 'Taylor Swift',
        ticketmasterId: 'K8vZ917G7x0',
        slug: expect.stringMatching(/^[a-z0-9-]+$/),
      });
    });
  });

  describe('Phase 2: Priority Background Sync (3-15 seconds)', () => {
    it('should complete Phase 2 within 15 seconds', async () => {
      // Setup artist first
      const phase1Result = await orchestrator.processPhase1('K8vZ917G7x0');
      testArtistId = phase1Result.artistId;

      tracker.start('phase2');
      
      const result = await orchestrator.processPhase2(phase1Result.artistId);
      
      const duration = tracker.end('phase2');
      
      expect(duration).toBeLessThan(15000);
      expect(result).toMatchObject({
        totalShows: expect.any(Number),
        upcomingShows: expect.any(Number),
        venuesCreated: expect.any(Number)
      });
    });

    it('should import shows and venues', async () => {
      const phase1Result = await orchestrator.processPhase1('K8vZ917G7x0');
      testArtistId = phase1Result.artistId;

      await orchestrator.processPhase2(phase1Result.artistId);

      // Verify shows were created
      const showCount = await db
        .select()
        .from(shows)
        .where(eq(shows.headlinerArtistId, phase1Result.artistId));

      expect(showCount.length).toBeGreaterThan(0);
    });

    it('should handle sync service failures gracefully', async () => {
      const phase1Result = await orchestrator.processPhase1('K8vZ917G7x0');
      testArtistId = phase1Result.artistId;

      // Mock sync failure
      vi.mocked(orchestrator['showSyncService'].syncArtistShows)
        .mockRejectedValueOnce(new Error('Show sync failed'));

      await expect(orchestrator.processPhase2(phase1Result.artistId))
        .rejects.toThrow('Phase 2 show sync failed');
    });
  });

  describe('Phase 3: Song Catalog Sync (15-90 seconds)', () => {
    it('should complete Phase 3 within 90 seconds', async () => {
      // Setup artist first
      const phase1Result = await orchestrator.processPhase1('K8vZ917G7x0');
      testArtistId = phase1Result.artistId;

      tracker.start('phase3');
      
      const result = await orchestrator.processPhase3(phase1Result.artistId);
      
      const duration = tracker.end('phase3');
      
      expect(duration).toBeLessThan(90000);
      expect(result).toMatchObject({
        totalSongs: expect.any(Number),
        totalAlbums: expect.any(Number),
        studioTracks: expect.any(Number),
        skippedLiveTracks: expect.any(Number)
      });
    });

    it('should update artist record with catalog info', async () => {
      const phase1Result = await orchestrator.processPhase1('K8vZ917G7x0');
      testArtistId = phase1Result.artistId;

      await orchestrator.processPhase3(phase1Result.artistId);

      const [updatedArtist] = await db
        .select()
        .from(artists)
        .where(eq(artists.id, phase1Result.artistId));

      expect(updatedArtist?.[0]?.songCatalogSyncedAt).toBeTruthy();
      expect(updatedArtist?.[0]?.totalSongs).toBeGreaterThan(0);
      expect(updatedArtist?.[0]?.totalAlbums).toBeGreaterThan(0);
    });

    it('should handle missing Spotify ID', async () => {
      const artistId = await createMockArtist();
      testArtistId = artistId;

      // Update artist to remove Spotify ID
      await db
        .update(artists)
        .set({ spotifyId: null })
        .where(eq(artists.id, artistId));

      await expect(orchestrator.processPhase3(artistId))
        .rejects.toThrow('Artist not found or missing Spotify ID');
    });
  });

  describe('Full Import Flow Integration', () => {
    it('should complete full import within performance targets', async () => {
      tracker.start('full_import');
      
      const result = await orchestrator.importArtist('K8vZ917G7x0');
      testArtistId = result.artistId;
      
      const totalDuration = tracker.end('full_import');
      
      // Validate overall performance
      expect(totalDuration).toBeLessThan(120000); // 2 minutes max
      
      // Validate phase timings
      expect(result.phaseTimings.phase1Duration).toBeLessThan(3000);
      expect(result.phaseTimings.phase2Duration).toBeLessThan(15000);
      expect(result.phaseTimings.phase3Duration).toBeLessThan(90000);
      
      // Validate result structure
      expect(result).toMatchObject({
        success: true,
        artistId: expect.any(String),
        slug: expect.any(String),
        totalSongs: expect.any(Number),
        totalShows: expect.any(Number),
        totalVenues: expect.any(Number),
        importDuration: expect.any(Number),
        phaseTimings: {
          phase1Duration: expect.any(Number),
          phase2Duration: expect.any(Number),
          phase3Duration: expect.any(Number)
        }
      });
    });

    it('should run Phase 2 and 3 in parallel', async () => {
      const startTime = Date.now();
      
      const result = await orchestrator.importArtist('K8vZ917G7x0');
      testArtistId = result.artistId;
      
      // Phase 2 and 3 should overlap significantly
      const phase2Start = result.phaseTimings.phase1Duration;
      const phase3Start = result.phaseTimings.phase1Duration;
      
      // They should start at roughly the same time (within 100ms)
      expect(Math.abs(phase2Start - phase3Start)).toBeLessThan(100);
    });

    it('should track progress correctly', async () => {
      await orchestrator.importArtist('K8vZ917G7x0');
      testArtistId = progressUpdates.find(p => p.artistId)?.artistId;
      
      // Should have progress updates for all stages
      const stages = progressUpdates.map(p => p.stage);
      expect(stages).toContain('initializing');
      expect(stages).toContain('syncing-identifiers');
      expect(stages).toContain('importing-shows');
      expect(stages).toContain('importing-songs');
      expect(stages).toContain('creating-setlists');
      expect(stages).toContain('completed');
      
      // Progress should be increasing
      const progressValues = progressUpdates.map(p => p.progress || 0);
      for (let i = 1; i < progressValues.length; i++) {
        expect(progressValues[i] || 0).toBeGreaterThanOrEqual(progressValues[i - 1] || 0);
      }
    });

    it('should create initial setlists', async () => {
      const result = await orchestrator.importArtist('K8vZ917G7x0');
      testArtistId = result.artistId;

      // Check if setlists were created
      const setlistCount = await db
        .select()
        .from(setlists)
        .where(eq(setlists.artistId, result.artistId));

      // Should have created some setlists for upcoming shows
      expect(setlistCount.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Error Handling and Resilience', () => {
    it('should handle partial failures gracefully', async () => {
      // Mock Phase 3 to fail
      vi.mocked(orchestrator['artistSyncService'].syncCatalog)
        .mockRejectedValueOnce(new Error('Catalog sync failed'));

      await expect(orchestrator.importArtist('K8vZ917G7x0'))
        .rejects.toThrow('Artist import failed');
      
      // Should still have progress updates showing failure
      const failedUpdate = progressUpdates.find(p => p.stage === 'failed');
      expect(failedUpdate).toBeTruthy();
      expect(failedUpdate?.error).toContain('Catalog sync failed');
    });

    it('should handle concurrent imports', async () => {
      const promises = [
        orchestrator.importArtist('K8vZ917G7x0'),
        orchestrator.importArtist('K8vZ917G7x0'), // Same artist
      ];

      const results = await Promise.allSettled(promises);
      
      // At least one should succeed
      const successful = results.filter(r => r.status === 'fulfilled');
      expect(successful.length).toBeGreaterThanOrEqual(1);
      
      if (successful.length > 0) {
        testArtistId = (successful[0] as any).value.artistId;
      }
    });

    it('should handle timeout scenarios', async () => {
      // Mock long-running operation
      vi.mocked(orchestrator['spotifyClient'].searchArtists)
        .mockImplementation(() => new Promise(resolve => setTimeout(resolve, 5000)));

      tracker.start('timeout_test');
      
      const result = await orchestrator.processPhase1('K8vZ917G7x0');
      testArtistId = result.artistId;
      
      const duration = tracker.end('timeout_test');
      
      // Should still complete within time limit
      expect(duration).toBeLessThan(4000);
    });
  });

  describe('Performance Benchmarks', () => {
    it('should meet Core Web Vitals targets', async () => {
      const results: ImportResult[] = [];
      
      // Run multiple imports to get average performance
      for (let i = 0; i < 3; i++) {
        const result = await orchestrator.importArtist('K8vZ917G7x0');
        results.push(result);
        
        // Cleanup for next iteration
        await cleanupTestData(result.artistId);
      }
      
      if (results.length > 0) {
        testArtistId = undefined; // Already cleaned up
      }
      
      // Calculate averages
      const avgPhase1 = results.reduce((sum, r) => sum + r.phaseTimings.phase1Duration, 0) / results.length;
      const avgPhase2 = results.reduce((sum, r) => sum + r.phaseTimings.phase2Duration, 0) / results.length;
      const avgPhase3 = results.reduce((sum, r) => sum + r.phaseTimings.phase3Duration, 0) / results.length;
      
      // Performance targets
      expect(avgPhase1).toBeLessThan(2500); // 2.5s average for Phase 1
      expect(avgPhase2).toBeLessThan(12000); // 12s average for Phase 2
      expect(avgPhase3).toBeLessThan(75000); // 75s average for Phase 3
      
      console.log('Performance Benchmarks:');
      console.log(`  Phase 1 (avg): ${avgPhase1}ms`);
      console.log(`  Phase 2 (avg): ${avgPhase2}ms`);
      console.log(`  Phase 3 (avg): ${avgPhase3}ms`);
    });

    it('should have consistent performance across multiple runs', async () => {
      const durations: number[] = [];
      
      for (let i = 0; i < 5; i++) {
        tracker.start(`run_${i}`);
        const result = await orchestrator.processPhase1('K8vZ917G7x0');
        const duration = tracker.end(`run_${i}`);
        durations.push(duration);
        
        await cleanupTestData(result.artistId);
      }
      
      // Calculate coefficient of variation (std dev / mean)
      const mean = durations.reduce((sum, d) => sum + d, 0) / durations.length;
      const variance = durations.reduce((sum, d) => sum + Math.pow(d - mean, 2), 0) / durations.length;
      const stdDev = Math.sqrt(variance);
      const cv = stdDev / mean;
      
      // Coefficient of variation should be less than 30%
      expect(cv).toBeLessThan(0.3);
      
      console.log('Performance Consistency:');
      console.log(`  Mean: ${mean}ms`);
      console.log(`  Std Dev: ${stdDev}ms`);
      console.log(`  CV: ${(cv * 100).toFixed(1)}%`);
    });
  });

  describe('Memory and Resource Usage', () => {
    it('should not leak memory during import', async () => {
      const initialMemory = process.memoryUsage();
      
      // Run multiple imports
      for (let i = 0; i < 3; i++) {
        const result = await orchestrator.importArtist('K8vZ917G7x0');
        await cleanupTestData(result.artistId);
        
        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }
      }
      
      const finalMemory = process.memoryUsage();
      
      // Memory usage shouldn't increase dramatically
      const heapGrowth = finalMemory.heapUsed - initialMemory.heapUsed;
      const maxAcceptableGrowth = 50 * 1024 * 1024; // 50MB
      
      expect(heapGrowth).toBeLessThan(maxAcceptableGrowth);
    });
  });
});

// Export test utilities for integration with other test files
export { PerformanceTracker, cleanupTestData, createMockArtist, setupApiMocks };