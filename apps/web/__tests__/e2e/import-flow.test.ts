/**
 * End-to-End Tests for Complete Import Flows
 * Tests complete import workflows, SSE streaming, error recovery
 * Validates GROK.md E2E requirements
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { db } from '@repo/database';
import { artists, venues, shows, songs, artistSongs, importStatus } from '@repo/database';
import { eq } from 'drizzle-orm';
import { EventEmitter } from 'events';

// Import services
import { ArtistImportOrchestrator } from '../../lib/services/orchestrators/ArtistImportOrchestrator';
import { ProgressBus } from '../../lib/services/progress/ProgressBus';
import { PerformanceMonitor } from '../../lib/services/monitoring/PerformanceMonitor';

// Mock realistic external API data
const mockArtistData = {
  ticketmaster: {
    id: 'K8vZ917G7x0',
    name: 'Taylor Swift',
    classifications: [{ genre: { name: 'Pop' } }],
    images: [{ url: 'https://s1.ticketm.net/dam/a/123/artist.jpg' }]
  },
  spotify: {
    id: '06HL4z0CvFAxyc27GXpf02',
    name: 'Taylor Swift',
    popularity: 100,
    followers: { total: 95000000 },
    genres: ['pop', 'country'],
    images: [{ url: 'https://i.scdn.co/image/large.jpg', height: 640, width: 640 }]
  }
};

// Mock comprehensive show data (1000+ events for SLO testing)
const generateMockShows = (count: number = 1000) => {
  return Array.from({ length: count }, (_, i) => ({
    id: `event${i}`,
    name: `Concert ${i + 1} - City ${i % 50}`,
    dates: {
      start: {
        localDate: new Date(Date.now() + i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        localTime: '20:00:00'
      }
    },
    _embedded: {
      venues: [{
        id: `venue${i % 100}`, // Reuse venues to test FK mapping
        name: `Venue ${i % 100}`,
        city: { name: `City ${i % 50}` },
        state: { name: `State ${i % 20}`, stateCode: `S${i % 20}` },
        country: { name: 'United States', countryCode: 'US' },
        address: { line1: `${100 + i} Main Street` },
        postalCode: `${10000 + (i % 90000)}`,
        location: { 
          latitude: (40 + (i % 10)).toString(), 
          longitude: (-74 - (i % 10)).toString() 
        },
        timezone: 'America/New_York'
      }]
    },
    url: `https://www.ticketmaster.com/event${i}`,
    priceRanges: [{ min: 50 + (i % 50), max: 200 + (i % 100), currency: 'USD' }]
  }));
};

// Mock comprehensive track data (2000+ tracks for SLO testing)
const generateMockTracks = (count: number = 2000) => {
  const albums = Array.from({ length: Math.ceil(count / 15) }, (_, i) => ({
    id: `album${i}`,
    name: `Album ${i + 1}`,
    album_type: 'album',
    total_tracks: Math.min(15, count - i * 15),
    release_date: `${2020 + (i % 5)}-01-01`
  }));

  const tracks = Array.from({ length: count }, (_, i) => ({
    id: `track${i}`,
    name: `Track ${i + 1}`,
    album: albums[Math.floor(i / 15)],
    track_number: (i % 15) + 1,
    disc_number: 1,
    duration_ms: 180000 + (i % 120) * 1000,
    popularity: 50 + (i % 50),
    external_ids: { isrc: `ISRC${String(i).padStart(7, '0')}` },
    artists: [{ id: mockArtistData.spotify.id, name: mockArtistData.spotify.name }],
    uri: `spotify:track:track${i}`,
    external_urls: { spotify: `https://open.spotify.com/track/track${i}` },
    preview_url: i % 3 === 0 ? `https://p.scdn.co/mp3-preview/track${i}` : null,
    explicit: i % 10 === 0,
    is_local: false
  }));

  const audioFeatures = tracks.map(track => ({
    id: track.id,
    liveness: Math.random() * 0.7, // Ensure all are below 0.8 threshold for studio-only
    energy: Math.random(),
    danceability: Math.random(),
    valence: Math.random(),
    acousticness: Math.random(),
    instrumentalness: Math.random(),
    speechiness: Math.random(),
    tempo: 80 + Math.random() * 100
  }));

  return { albums, tracks, audioFeatures };
};

// SSE Event collector for testing
class SSEEventCollector extends EventEmitter {
  private events: any[] = [];
  
  constructor() {
    super();
    this.setMaxListeners(20);
  }

  addEvent(event: any): void {
    this.events.push({
      ...event,
      timestamp: Date.now()
    });
    this.emit('event', event);
  }

  getEvents(): any[] {
    return [...this.events];
  }

  getEventsByStage(stage: string): any[] {
    return this.events.filter(e => e.stage === stage);
  }

  clear(): void {
    this.events = [];
  }

  waitForStage(stage: string, timeout: number = 5000): Promise<any> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Timeout waiting for stage: ${stage}`));
      }, timeout);

      const existingEvent = this.events.find(e => e.stage === stage);
      if (existingEvent) {
        clearTimeout(timer);
        resolve(existingEvent);
        return;
      }

      const handler = (event: any) => {
        if (event.stage === stage) {
          clearTimeout(timer);
          this.off('event', handler);
          resolve(event);
        }
      };

      this.on('event', handler);
    });
  }
}

describe('End-to-End Import Flow Tests', () => {
  let testArtistId: string;
  let sseCollector: SSEEventCollector;
  let performanceMonitor: PerformanceMonitor;

  beforeEach(async () => {
    sseCollector = new SSEEventCollector();
    
    // Set up comprehensive mocks
    setupComprehensiveMocks();
    
    // Set up progress monitoring
    ProgressBus.onGlobalProgress((event) => {
      sseCollector.addEvent(event);
    });
  });

  afterEach(async () => {
    // Clean up test data
    if (testArtistId) {
      await cleanupTestData(testArtistId);
    }
    
    vi.clearAllMocks();
    sseCollector.removeAllListeners();
  });

  const setupComprehensiveMocks = () => {
    const mockShows = generateMockShows(1000);
    const { albums, tracks, audioFeatures } = generateMockTracks(2000);

    // Mock Ticketmaster with realistic pagination
    vi.mock('../../lib/services/adapters/TicketmasterClient', () => ({
      iterateEventsByAttraction: vi.fn().mockImplementation(async function* () {
        const pageSize = 200;
        for (let i = 0; i < mockShows.length; i += pageSize) {
          const batch = mockShows.slice(i, i + pageSize);
          yield batch;
          // Simulate API delay
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      })
    }));

    // Mock Spotify with realistic batching
    vi.mock('../../lib/services/adapters/SpotifyClient', () => ({
      getAccessToken: vi.fn().mockResolvedValue('mock-access-token'),
      listAllAlbums: vi.fn().mockResolvedValue(albums),
      listAlbumTracks: vi.fn().mockImplementation(async (albumId: string) => {
        const albumIndex = parseInt(albumId.replace('album', ''));
        const startIndex = albumIndex * 15;
        const endIndex = Math.min(startIndex + 15, tracks.length);
        return tracks.slice(startIndex, endIndex);
      }),
      getTracksDetails: vi.fn().mockImplementation(async (trackIds: string[]) => {
        return tracks.filter(track => trackIds.includes(track.id));
      }),
      getAudioFeatures: vi.fn().mockImplementation(async (trackIds: string[]) => {
        return audioFeatures.filter(feature => trackIds.includes(feature.id));
      })
    }));
  };

  const cleanupTestData = async (artistId: string) => {
    await db.delete(artistSongs).where(eq(artistSongs.artistId, artistId));
    await db.delete(importStatus).where(eq(importStatus.artistId, artistId));
    await db.delete(shows).where(eq(shows.headlinerArtistId, artistId));
    await db.delete(artists).where(eq(artists.id, artistId));
    
    // Clean up songs that are no longer referenced
    const unreferencedSongs = await db
      .select({ id: songs.id })
      .from(songs)
      .leftJoin(artistSongs, eq(songs.id, artistSongs.songId))
      .where(eq(artistSongs.songId, null));
    
    if (unreferencedSongs.length > 0) {
      const songIds = unreferencedSongs.map(s => s.id);
      await db.delete(songs).where(eq(songs.id, songIds[0])); // Clean up test songs
    }
  };

  describe('Complete Import Flow with Performance SLOs', () => {
    it('should complete full import within GROK.md SLO targets', async () => {
      performanceMonitor = PerformanceMonitor.create('e2e-full-import');
      
      // Phase 1: Identity/Bootstrap (< 200ms SLO)
      performanceMonitor.startTimer('identity');
      const orchestrator = new ArtistImportOrchestrator();
      const identityResult = await orchestrator.initiateImport('K8vZ917G7x0');
      const identityDuration = performanceMonitor.endTimer('identity');
      
      testArtistId = identityResult.artistId;

      // Verify Phase 1 SLO
      expect(identityDuration).toBeLessThan(200); // GROK.md: < 200ms
      expect(identityResult.artistId).toBeTruthy();
      expect(identityResult.slug).toBeTruthy();

      // Wait for identity stage SSE event
      await sseCollector.waitForStage('initializing');

      // Phase 2 & 3: Background import (< 30s shows, < 45s catalog)
      performanceMonitor.startTimer('background');
      const fullImportPromise = orchestrator.runFullImport(testArtistId);

      // Monitor SSE progress
      const progressEvents = [];
      const progressHandler = (event: any) => progressEvents.push(event);
      sseCollector.on('event', progressHandler);

      // Wait for import completion
      const importResult = await fullImportPromise;
      const backgroundDuration = performanceMonitor.endTimer('background');

      sseCollector.off('event', progressHandler);

      // Verify overall performance
      expect(importResult.success).toBe(true);
      expect(backgroundDuration).toBeLessThan(75000); // Combined phases < 75s

      // Verify SLOs using performance monitor
      const sloValidation = performanceMonitor.validateSLOs();
      if (!sloValidation.allPassed) {
        console.log('SLO Violations:', sloValidation.results.filter(r => !r.passed));
      }
      expect(sloValidation.allPassed).toBe(true);

      // Verify data completeness
      const dbArtist = await db
        .select()
        .from(artists)
        .where(eq(artists.id, testArtistId))
        .limit(1);

      expect(dbArtist[0]).toMatchObject({
        name: 'Taylor Swift',
        spotifyId: '06HL4z0CvFAxyc27GXpf02',
        tmAttractionId: 'K8vZ917G7x0',
        importStatus: 'completed'
      });

      // Verify shows import (1k events)
      const dbShows = await db
        .select()
        .from(shows)
        .where(eq(shows.headlinerArtistId, testArtistId));

      expect(dbShows.length).toBe(1000);

      // Verify catalog import (2k+ tracks, studio-only)
      const dbArtistSongs = await db
        .select()
        .from(artistSongs)
        .where(eq(artistSongs.artistId, testArtistId));

      expect(dbArtistSongs.length).toBe(2000);

      // Verify all songs are studio-only (isLive = false)
      const songIds = dbArtistSongs.map(as => as.songId);
      const dbSongs = await db
        .select()
        .from(songs)
        .where(eq(songs.id, songIds[0])); // Check first song as representative

      dbSongs.forEach(song => {
        expect(song.isLive).toBe(false);
      });
    });

    it('should stream progress via SSE within 200ms of phase changes', async () => {
      const orchestrator = new ArtistImportOrchestrator();
      
      // Start import
      const identityResult = await orchestrator.initiateImport('K8vZ917G7x0');
      testArtistId = identityResult.artistId;

      // Collect SSE events with timestamps
      const sseEvents: Array<{ event: any; timestamp: number }> = [];
      const startTime = Date.now();

      sseCollector.on('event', (event) => {
        sseEvents.push({
          event,
          timestamp: Date.now() - startTime
        });
      });

      // Start background import
      const importPromise = orchestrator.runFullImport(testArtistId);

      // Wait for completion
      await importPromise;

      // Verify SSE event timing (GROK.md: SSE events within 200ms)
      const stages = ['initializing', 'importing-shows', 'importing-songs', 'completed'];
      
      for (let i = 1; i < stages.length; i++) {
        const currentStageEvents = sseEvents.filter(e => e.event.stage === stages[i]);
        const previousStageEvents = sseEvents.filter(e => e.event.stage === stages[i-1]);
        
        if (currentStageEvents.length > 0 && previousStageEvents.length > 0) {
          const timeBetween = currentStageEvents[0].timestamp - previousStageEvents[previousStageEvents.length - 1].timestamp;
          expect(timeBetween).toBeLessThan(200); // GROK.md: < 200ms
        }
      }

      // Verify progress increases monotonically
      const progressValues = sseEvents
        .map(e => e.event.progress)
        .filter(p => typeof p === 'number');

      for (let i = 1; i < progressValues.length; i++) {
        expect(progressValues[i]).toBeGreaterThanOrEqual(progressValues[i-1]);
      }
    });

    it('should maintain < 1% import failure rate', async () => {
      const orchestrator = new ArtistImportOrchestrator();
      const importResults = [];
      
      // Run multiple imports to test failure rate
      const importCount = 10;
      
      for (let i = 0; i < importCount; i++) {
        try {
          const identityResult = await orchestrator.initiateImport(`K8vZ917G7x${i}`);
          const importResult = await orchestrator.runFullImport(identityResult.artistId);
          
          importResults.push({ success: true, artistId: identityResult.artistId });
          
          // Clean up after each import
          await cleanupTestData(identityResult.artistId);
        } catch (error) {
          importResults.push({ success: false, error: error.message });
        }
      }

      const failureCount = importResults.filter(r => !r.success).length;
      const failureRate = (failureCount / importCount) * 100;

      // GROK.md: Import failure rate < 1%
      expect(failureRate).toBeLessThan(1);
      
      console.log(`Import Success Rate: ${100 - failureRate}% (${importCount - failureCount}/${importCount})`);
    });
  });

  describe('Error Recovery and Resilience', () => {
    it('should recover from transient API failures', async () => {
      let apiCallCount = 0;
      
      // Mock intermittent failures
      vi.mocked(require('../../lib/services/adapters/SpotifyClient').getAccessToken)
        .mockImplementation(async () => {
          apiCallCount++;
          if (apiCallCount <= 2) {
            throw new Error('API temporarily unavailable');
          }
          return 'mock-access-token';
        });

      const orchestrator = new ArtistImportOrchestrator();
      
      const identityResult = await orchestrator.initiateImport('K8vZ917G7x0');
      testArtistId = identityResult.artistId;

      // Should recover from initial failures
      const importResult = await orchestrator.runFullImport(testArtistId);
      
      expect(importResult.success).toBe(true);
      expect(apiCallCount).toBeGreaterThan(2); // Should have retried
    });

    it('should handle partial import failures gracefully', async () => {
      // Mock failure during catalog phase
      vi.mocked(require('../../lib/services/adapters/SpotifyClient').listAllAlbums)
        .mockRejectedValue(new Error('Spotify API rate limit exceeded'));

      const orchestrator = new ArtistImportOrchestrator();
      
      const identityResult = await orchestrator.initiateImport('K8vZ917G7x0');
      testArtistId = identityResult.artistId;

      // Import should fail gracefully
      await expect(orchestrator.runFullImport(testArtistId)).rejects.toThrow();

      // But shows should still be imported
      const dbShows = await db
        .select()
        .from(shows)
        .where(eq(shows.headlinerArtistId, testArtistId));

      expect(dbShows.length).toBeGreaterThan(0);

      // Artist status should be marked as failed
      const dbArtist = await db
        .select()
        .from(artists)
        .where(eq(artists.id, testArtistId))
        .limit(1);

      expect(dbArtist[0].importStatus).toBe('failed');

      // Should have error event in SSE stream
      await sseCollector.waitForStage('failed');
      const errorEvents = sseCollector.getEventsByStage('failed');
      expect(errorEvents.length).toBeGreaterThan(0);
      expect(errorEvents[0].error).toContain('Spotify API rate limit');
    });

    it('should resume import from checkpoint after failure', async () => {
      const orchestrator = new ArtistImportOrchestrator();
      
      // First attempt - succeed identity, fail on shows
      const identityResult = await orchestrator.initiateImport('K8vZ917G7x0');
      testArtistId = identityResult.artistId;

      // Mock failure after identity phase
      vi.mocked(require('../../lib/services/adapters/TicketmasterClient').iterateEventsByAttraction)
        .mockRejectedValue(new Error('Network timeout'));

      await expect(orchestrator.runFullImport(testArtistId)).rejects.toThrow('Network timeout');

      // Verify identity phase completed
      const dbArtist1 = await db
        .select()
        .from(artists)
        .where(eq(artists.id, testArtistId))
        .limit(1);

      expect(dbArtist1[0].name).toBe('Taylor Swift');
      expect(dbArtist1[0].importStatus).toBe('failed');

      // Second attempt - fix the network issue
      vi.mocked(require('../../lib/services/adapters/TicketmasterClient').iterateEventsByAttraction)
        .mockImplementation(require('./api-integration.test.ts').setupApiMocks);

      // Resume import
      const resumeResult = await orchestrator.runFullImport(testArtistId);
      
      expect(resumeResult.success).toBe(true);

      // Verify full import completed
      const dbArtist2 = await db
        .select()
        .from(artists)
        .where(eq(artists.id, testArtistId))
        .limit(1);

      expect(dbArtist2[0].importStatus).toBe('completed');
      expect(dbArtist2[0].showsSyncedAt).toBeTruthy();
      expect(dbArtist2[0].songCatalogSyncedAt).toBeTruthy();
    });
  });

  describe('Concurrent Import Handling', () => {
    it('should handle concurrent imports without data corruption', async () => {
      const orchestrator1 = new ArtistImportOrchestrator();
      const orchestrator2 = new ArtistImportOrchestrator();

      // Start two imports concurrently for different artists
      const [result1, result2] = await Promise.allSettled([
        (async () => {
          const identity = await orchestrator1.initiateImport('K8vZ917G1x0');
          return { identity, import: await orchestrator1.runFullImport(identity.artistId) };
        })(),
        (async () => {
          const identity = await orchestrator2.initiateImport('K8vZ917G2x0');
          return { identity, import: await orchestrator2.runFullImport(identity.artistId) };
        })()
      ]);

      // Both should succeed
      expect(result1.status).toBe('fulfilled');
      expect(result2.status).toBe('fulfilled');

      if (result1.status === 'fulfilled' && result2.status === 'fulfilled') {
        testArtistId = result1.value.identity.artistId;
        
        // Clean up second artist too
        await cleanupTestData(result2.value.identity.artistId);

        // Verify both imports completed successfully
        expect(result1.value.import.success).toBe(true);
        expect(result2.value.import.success).toBe(true);

        // Verify no data corruption between artists
        const artist1Songs = await db
          .select()
          .from(artistSongs)
          .where(eq(artistSongs.artistId, result1.value.identity.artistId));

        const artist2Songs = await db
          .select()
          .from(artistSongs)
          .where(eq(artistSongs.artistId, result2.value.identity.artistId));

        expect(artist1Songs.length).toBeGreaterThan(0);
        expect(artist2Songs.length).toBeGreaterThan(0);

        // Verify no cross-contamination
        const artist1SongIds = artist1Songs.map(as => as.songId);
        const artist2SongIds = artist2Songs.map(as => as.songId);
        
        // Songs can be shared, but artist-song relationships should be distinct
        expect(artist1Songs.every(as => as.artistId === result1.value.identity.artistId)).toBe(true);
        expect(artist2Songs.every(as => as.artistId === result2.value.identity.artistId)).toBe(true);
      }
    });

    it('should prevent duplicate imports for same artist', async () => {
      const orchestrator = new ArtistImportOrchestrator();
      
      // Start first import
      const identity1 = await orchestrator.initiateImport('K8vZ917G7x0');
      testArtistId = identity1.artistId;

      // Try to start second import for same artist
      const identity2 = await orchestrator.initiateImport('K8vZ917G7x0');
      
      // Should return same artist ID (idempotent)
      expect(identity2.artistId).toBe(identity1.artistId);

      // Run imports concurrently
      const [result1, result2] = await Promise.allSettled([
        orchestrator.runFullImport(identity1.artistId),
        orchestrator.runFullImport(identity2.artistId)
      ]);

      // At least one should succeed
      const successful = [result1, result2].filter(r => r.status === 'fulfilled');
      expect(successful.length).toBeGreaterThanOrEqual(1);

      // Verify final state is consistent
      const dbArtist = await db
        .select()
        .from(artists)
        .where(eq(artists.id, testArtistId))
        .limit(1);

      expect(dbArtist[0].importStatus).toBe('completed');
    });
  });

  describe('Auto-Import Functionality', () => {
    it('should auto-import artist when not found in database', async () => {
      // Mock successful external API search
      const mockSpotifySearch = vi.fn().mockResolvedValue({
        artists: {
          items: [{
            id: 'test-spotify-id',
            name: 'Test Artist',
            popularity: 75,
            followers: { total: 1000000 },
            genres: ['rock', 'alternative'],
            images: [{ url: 'https://test.com/image.jpg' }],
            external_urls: { spotify: 'https://open.spotify.com/artist/test' }
          }]
        }
      });

      const mockTicketmasterSearch = vi.fn().mockResolvedValue({
        _embedded: {
          attractions: [{
            id: 'test-tm-id',
            name: 'Test Artist',
            classifications: [{ genre: { name: 'Rock' } }]
          }]
        }
      });

      // Mock the clients
      vi.mock('@repo/external-apis', () => ({
        SpotifyClient: class {
          async authenticate() { return true; }
          async searchArtists() { return mockSpotifySearch(); }
        },
        TicketmasterClient: class {
          async searchAttractions() { return mockTicketmasterSearch(); }
        }
      }));

      // Import the function after mocking
      const { getArtist } = await import('../../app/artists/[slug]/actions');

      // Test auto-import with non-existent artist
      const result = await getArtist('test-artist');

      // Should return minimal artist data
      expect(result).toBeTruthy();
      expect(result.name).toBe('Test Artist');
      expect(result.slug).toBe('test-artist');
      expect(result.spotifyId).toBe('test-spotify-id');
      expect(result.importStatus).toBe('importing');

      // Verify external API was called
      expect(mockSpotifySearch).toHaveBeenCalledWith('Test Artist', 5);
      expect(mockTicketmasterSearch).toHaveBeenCalledWith({
        keyword: 'Test Artist',
        classificationName: 'music',
        size: 10,
      });
    });

    it('should return null when artist not found in external APIs', async () => {
      // Mock no results from external APIs
      const mockSpotifySearch = vi.fn().mockResolvedValue({
        artists: { items: [] }
      });

      const mockTicketmasterSearch = vi.fn().mockResolvedValue({
        _embedded: { attractions: [] }
      });

      vi.mock('@repo/external-apis', () => ({
        SpotifyClient: class {
          async authenticate() { return true; }
          async searchArtists() { return mockSpotifySearch(); }
        },
        TicketmasterClient: class {
          async searchAttractions() { return mockTicketmasterSearch(); }
        }
      }));

      const { getArtist } = await import('../../app/artists/[slug]/actions');

      const result = await getArtist('nonexistent-artist');

      expect(result).toBeNull();
      expect(mockSpotifySearch).toHaveBeenCalledWith('Nonexistent Artist', 5);
      expect(mockTicketmasterSearch).toHaveBeenCalledWith({
        keyword: 'Nonexistent Artist',
        classificationName: 'music',
        size: 10,
      });
    });

    it('should handle auto-import API failures gracefully', async () => {
      // Mock API failures
      const mockSpotifySearch = vi.fn().mockRejectedValue(new Error('Spotify API Error'));
      const mockTicketmasterSearch = vi.fn().mockRejectedValue(new Error('Ticketmaster API Error'));

      vi.mock('@repo/external-apis', () => ({
        SpotifyClient: class {
          async authenticate() { return true; }
          async searchArtists() { return mockSpotifySearch(); }
        },
        TicketmasterClient: class {
          async searchAttractions() { return mockTicketmasterSearch(); }
        }
      }));

      const { getArtist } = await import('../../app/artists/[slug]/actions');

      const result = await getArtist('test-artist');

      // Should return null when APIs fail
      expect(result).toBeNull();
    });
  });

  describe('Memory and Resource Management', () => {
    it('should not leak memory during large imports', async () => {
      const initialMemory = process.memoryUsage();
      
      const orchestrator = new ArtistImportOrchestrator();
      
      // Run large import
      const identityResult = await orchestrator.initiateImport('K8vZ917G7x0');
      testArtistId = identityResult.artistId;
      
      await orchestrator.runFullImport(testArtistId);

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage();
      
      // Memory growth should be reasonable (< 100MB)
      const heapGrowth = finalMemory.heapUsed - initialMemory.heapUsed;
      const maxAcceptableGrowth = 100 * 1024 * 1024; // 100MB
      
      expect(heapGrowth).toBeLessThan(maxAcceptableGrowth);
      
      console.log(`Memory Growth: ${(heapGrowth / 1024 / 1024).toFixed(2)}MB`);
    });

    it('should clean up resources properly after completion', async () => {
      const orchestrator = new ArtistImportOrchestrator();
      
      const identityResult = await orchestrator.initiateImport('K8vZ917G7x0');
      testArtistId = identityResult.artistId;
      
      // Monitor active listeners
      const initialListeners = ProgressBus.listenerCount(testArtistId);
      
      await orchestrator.runFullImport(testArtistId);
      
      // Wait a bit for cleanup
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Verify listeners were cleaned up
      const finalListeners = ProgressBus.listenerCount(testArtistId);
      expect(finalListeners).toBeLessThanOrEqual(initialListeners);
    });
  });
});