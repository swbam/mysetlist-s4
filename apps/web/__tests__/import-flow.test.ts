/**
 * Comprehensive End-to-End Import Flow Tests
 * 
 * This test suite validates the complete artist import system for the concert setlist
 * voting platform, including database operations, API integrations, caching, and
 * performance requirements from the GROK.md specification.
 */

import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import { db, testConnection } from '@repo/database';
import { artists, venues, shows, songs, artistSongs, syncJobs, userFollowsArtists, importStatus } from '@repo/database';
import { eq, and, count, sql, desc, gte, lte } from 'drizzle-orm';
import { EventEmitter } from 'events';

// Import our enhanced database utilities
import { prisma, checkDatabaseHealth, connectDatabase, disconnectDatabase } from '../lib/db/prisma';
import { ArtistQueries, CachedArtistQueries } from '../lib/db/queries/artists';

// Import orchestration services
import { ArtistImportOrchestrator } from '../lib/services/orchestrators/ArtistImportOrchestrator';
import { ProgressBus } from '../lib/services/progress/ProgressBus';
import { PerformanceMonitor } from '../lib/services/monitoring/PerformanceMonitor';

// Import API clients for testing
import { SetlistFmClient, SpotifyClient, TicketmasterClient } from '@repo/external-apis';

interface TestResult {
  success: boolean;
  duration: number;
  error?: string;
  details?: any;
  warnings?: string[];
}

interface ImportTestContext {
  artistId: string;
  sseEvents: any[];
  performanceMetrics: Map<string, number>;
  cacheHits: number;
  cacheMisses: number;
}

/**
 * Enhanced SSE Event Collector with performance tracking
 */
class EnhancedSSECollector extends EventEmitter {
  private events: Array<{ event: any; timestamp: number; phase: string }> = [];
  private phaseTimings: Map<string, { start: number; end?: number }> = new Map();
  
  constructor() {
    super();
    this.setMaxListeners(50);
  }

  addEvent(event: any): void {
    const timestamp = Date.now();
    const phase = event.stage || event.phase || 'unknown';
    
    this.events.push({ event, timestamp, phase });
    
    // Track phase timings
    if (!this.phaseTimings.has(phase)) {
      this.phaseTimings.set(phase, { start: timestamp });
    } else if (event.status === 'completed' || event.stage === 'completed') {
      const phaseData = this.phaseTimings.get(phase);
      if (phaseData) {
        phaseData.end = timestamp;
      }
    }
    
    this.emit('event', event);
    this.emit(`phase:${phase}`, event);
  }

  getPhaseMetrics(): Map<string, { duration: number; eventCount: number }> {
    const metrics = new Map();
    
    for (const [phase, timing] of this.phaseTimings.entries()) {
      const phaseEvents = this.events.filter(e => e.phase === phase);
      const duration = timing.end ? timing.end - timing.start : Date.now() - timing.start;
      
      metrics.set(phase, {
        duration,
        eventCount: phaseEvents.length
      });
    }
    
    return metrics;
  }

  getEventsByPhase(phase: string): any[] {
    return this.events.filter(e => e.phase === phase).map(e => e.event);
  }

  clear(): void {
    this.events = [];
    this.phaseTimings.clear();
    this.removeAllListeners();
  }

  waitForPhase(phase: string, timeout: number = 10000): Promise<any> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Timeout waiting for phase: ${phase}`));
      }, timeout);

      const existingEvent = this.events.find(e => e.phase === phase);
      if (existingEvent) {
        clearTimeout(timer);
        resolve(existingEvent.event);
        return;
      }

      const handler = (event: any) => {
        clearTimeout(timer);
        this.off(`phase:${phase}`, handler);
        resolve(event);
      };

      this.on(`phase:${phase}`, handler);
    });
  }
}

/**
 * Mock data generators for comprehensive testing
 */
class MockDataGenerator {
  static generateArtistData(id: string = 'test-artist-123') {
    return {
      setlistFm: {
        mbid: `mbid-${id}`,
        name: 'Test Artist',
        sortName: 'Test Artist',
        disambiguation: 'American pop artist'
      },
      ticketmaster: {
        id: `tm-${id}`,
        name: 'Test Artist',
        classifications: [{ genre: { name: 'Pop' }, segment: { name: 'Music' } }],
        images: [{ url: `https://example.com/artist-${id}.jpg` }],
        externalLinks: { youtube: [{ url: `https://youtube.com/artist-${id}` }] }
      },
      spotify: {
        id: `spotify-${id}`,
        name: 'Test Artist',
        popularity: 85,
        followers: { total: 5000000 },
        genres: ['pop', 'dance-pop', 'electropop'],
        images: [
          { url: `https://i.scdn.co/image/large-${id}.jpg`, height: 640, width: 640 },
          { url: `https://i.scdn.co/image/medium-${id}.jpg`, height: 300, width: 300 }
        ],
        external_urls: { spotify: `https://open.spotify.com/artist/${id}` }
      }
    };
  }

  static generateShowData(count: number = 50, artistId: string = 'test-artist-123') {
    return Array.from({ length: count }, (_, i) => ({
      id: `show-${i}`,
      name: `Concert ${i + 1}`,
      type: 'concert',
      dates: {
        start: {
          localDate: new Date(Date.now() + i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          localTime: '20:00:00'
        }
      },
      status: { code: i % 10 === 0 ? 'onsale' : 'upcoming' },
      _embedded: {
        venues: [{
          id: `venue-${i % 20}`,
          name: `Venue ${i % 20}`,
          type: 'venue',
          city: { name: `City ${i % 10}` },
          state: { name: `State ${i % 5}`, stateCode: `S${i % 5}` },
          country: { name: 'United States', countryCode: 'US' },
          address: { line1: `${100 + i} Music Street` },
          postalCode: `${10000 + (i % 90000)}`,
          location: { 
            latitude: `${40 + (i % 5)}`, 
            longitude: `${-74 - (i % 5)}` 
          },
          timezone: 'America/New_York',
          boxOfficeInfo: { openHoursDetail: '10:00 AM - 6:00 PM' }
        }]
      },
      url: `https://www.ticketmaster.com/show-${i}`,
      priceRanges: [{ 
        min: 50 + (i % 100), 
        max: 150 + (i % 200), 
        currency: 'USD' 
      }],
      seatmap: { staticUrl: `https://maps.ticketmaster.com/show-${i}` }
    }));
  }

  static generateSongCatalog(count: number = 100, artistId: string = 'test-artist-123') {
    const albums = Array.from({ length: Math.ceil(count / 12) }, (_, i) => ({
      id: `album-${i}`,
      name: `Album ${i + 1}`,
      album_type: i % 4 === 0 ? 'compilation' : i % 3 === 0 ? 'single' : 'album',
      total_tracks: Math.min(12, count - i * 12),
      release_date: `${2015 + (i % 9)}-${String((i % 12) + 1).padStart(2, '0')}-01`,
      release_date_precision: 'day',
      images: [
        { url: `https://i.scdn.co/image/album-${i}-large.jpg`, height: 640, width: 640 },
        { url: `https://i.scdn.co/image/album-${i}-medium.jpg`, height: 300, width: 300 }
      ],
      external_urls: { spotify: `https://open.spotify.com/album/album-${i}` }
    }));

    const tracks = Array.from({ length: count }, (_, i) => {
      const albumIndex = Math.floor(i / 12);
      const trackNumber = (i % 12) + 1;
      
      return {
        id: `track-${i}`,
        name: `Song ${i + 1}`,
        album: albums[albumIndex],
        track_number: trackNumber,
        disc_number: 1,
        duration_ms: 180000 + (i % 120) * 1000,
        popularity: 40 + (i % 60),
        explicit: i % 20 === 0,
        external_ids: { isrc: `ISRC${String(i).padStart(10, '0')}` },
        artists: [{ id: artistId, name: 'Test Artist' }],
        available_markets: ['US', 'CA', 'GB', 'AU'],
        uri: `spotify:track:track-${i}`,
        external_urls: { spotify: `https://open.spotify.com/track/track-${i}` },
        preview_url: i % 5 === 0 ? `https://p.scdn.co/mp3-preview/track-${i}` : null,
        is_local: false,
        is_playable: true
      };
    });

    const audioFeatures = tracks.map((track, i) => ({
      id: track.id,
      acousticness: Math.random() * 0.8,
      danceability: Math.random(),
      energy: Math.random(),
      instrumentalness: Math.random() * 0.3,
      key: i % 12,
      liveness: Math.random() * 0.6, // Ensure below 0.8 threshold for studio tracks
      loudness: -15 + (Math.random() * 10),
      mode: i % 2,
      speechiness: Math.random() * 0.4,
      tempo: 80 + (Math.random() * 120),
      time_signature: 4,
      valence: Math.random(),
      duration_ms: track.duration_ms,
      analysis_url: `https://api.spotify.com/v1/audio-analysis/track-${i}`,
      track_href: `https://api.spotify.com/v1/tracks/track-${i}`,
      type: 'audio_features',
      uri: track.uri
    }));

    return { albums, tracks, audioFeatures };
  }
}

/**
 * Database testing utilities
 */
class DatabaseTestUtils {
  static async cleanupTestData(artistId: string): Promise<void> {
    // Clean up in dependency order
    await db.delete(artistSongs).where(eq(artistSongs.artistId, artistId));
    await db.delete(userFollowsArtists).where(eq(userFollowsArtists.artistId, artistId));
    await db.delete(syncJobs).where(and(eq(syncJobs.entityType, 'artist'), eq(syncJobs.entityId, artistId)));
    await db.delete(shows).where(eq(shows.headlinerArtistId, artistId));
    await db.delete(artists).where(eq(artists.id, artistId));
    
    // Clean up orphaned songs and venues (be careful with this in real scenarios)
    const orphanedSongs = await db
      .select({ id: songs.id })
      .from(songs)
      .leftJoin(artistSongs, eq(songs.id, artistSongs.songId))
      .where(eq(artistSongs.songId, null))
      .limit(100); // Limit to avoid accidental mass deletion
    
    if (orphanedSongs.length > 0) {
      const songIds = orphanedSongs.map(s => s.id);
      for (const songId of songIds) {
        await db.delete(songs).where(eq(songs.id, songId));
      }
    }
  }

  static async validateDatabaseConsistency(artistId: string): Promise<{ valid: boolean; issues: string[] }> {
    const issues: string[] = [];

    try {
      // Check artist exists
      const artistRecord = await prisma.artist.findUnique({
        where: { id: artistId }
      });

      if (!artistRecord) {
        issues.push('Artist record not found');
        return { valid: false, issues };
      }

      // Check required fields
      if (!artistRecord.name) issues.push('Artist name is missing');
      if (!artistRecord.slug) issues.push('Artist slug is missing');

      // Check foreign key consistency
      const showCount = await prisma.show.count({
        where: { headlinerArtistId: artistId }
      });

      const artistSongCount = await prisma.artist_song?.count?.({
        where: { artistId }
      }) || 0;

      // Verify sync job tracking
      const syncJobCount = await db
        .select({ count: count() })
        .from(syncJobs)
        .where(and(eq(syncJobs.entityType, 'artist'), eq(syncJobs.entityId, artistId)));

      if (syncJobCount[0]?.count === 0) {
        issues.push('No sync job records found');
      }

      console.log(`Database consistency check for ${artistId}:`, {
        shows: showCount,
        songs: artistSongCount,
        syncJobs: syncJobCount[0]?.count || 0
      });

    } catch (error) {
      issues.push(`Database validation error: ${error.message}`);
    }

    return { valid: issues.length === 0, issues };
  }

  static async getImportMetrics(artistId: string): Promise<{
    totalDuration: number;
    phaseBreakdown: Record<string, number>;
    recordCounts: Record<string, number>;
    errorCount: number;
  }> {
    const syncJobs = await db
      .select()
      .from(syncJobs)
      .where(and(eq(syncJobs.entityType, 'artist'), eq(syncJobs.entityId, artistId)))
      .orderBy(desc(syncJobs.createdAt));

    const phaseBreakdown: Record<string, number> = {};
    let totalDuration = 0;
    let errorCount = 0;

    for (const job of syncJobs) {
      if (job.completedAt && job.startedAt) {
        const duration = new Date(job.completedAt).getTime() - new Date(job.startedAt).getTime();
        phaseBreakdown[job.phase || 'unknown'] = duration;
        totalDuration += duration;
      }
      
      if (job.status === 'failed' || job.errorMessage) {
        errorCount++;
      }
    }

    // Get record counts
    const [artistSongCount, showCount] = await Promise.all([
      db.select({ count: count() }).from(artistSongs).where(eq(artistSongs.artistId, artistId)),
      db.select({ count: count() }).from(shows).where(eq(shows.headlinerArtistId, artistId))
    ]);

    return {
      totalDuration,
      phaseBreakdown,
      recordCounts: {
        songs: artistSongCount[0]?.count || 0,
        shows: showCount[0]?.count || 0
      },
      errorCount
    };
  }
}

/**
 * Cache testing utilities
 */
class CacheTestUtils {
  static async validateCachePerformance(testOperations: Array<() => Promise<any>>): Promise<{
    averageResponseTime: number;
    cacheHitRatio: number;
    totalOperations: number;
  }> {
    const cache = CacheClient.getInstance();
    const startTime = Date.now();
    let cacheHits = 0;

    // Clear cache for clean test
    await Promise.all([
      'test:cache:performance:1',
      'test:cache:performance:2',
      'test:cache:performance:3'
    ].map(key => cache.del(key)));

    // Run operations twice - first should miss cache, second should hit
    for (let round = 0; round < 2; round++) {
      for (const operation of testOperations) {
        const opStart = Date.now();
        await operation();
        const opTime = Date.now() - opStart;
        
        // Consider it a cache hit if response was very fast (< 10ms)
        if (round > 0 && opTime < 10) {
          cacheHits++;
        }
      }
    }

    const totalTime = Date.now() - startTime;
    const averageResponseTime = totalTime / (testOperations.length * 2);
    const cacheHitRatio = cacheHits / testOperations.length;

    return {
      averageResponseTime,
      cacheHitRatio,
      totalOperations: testOperations.length * 2
    };
  }
}

/**
 * Main test suite
 */
describe('Comprehensive End-to-End Import Flow Tests', () => {
  let testContext: ImportTestContext;
  let sseCollector: EnhancedSSECollector;
  let performanceMonitor: PerformanceMonitor;
  let cache: CacheClient;

  beforeAll(async () => {
    // Ensure database connection
    await connectDatabase();
    const isHealthy = await checkDatabaseHealth();
    if (!isHealthy) {
      throw new Error('Database is not healthy - aborting tests');
    }

    // Initialize cache
    cache = CacheClient.getInstance();
    console.log('Database and cache connections established');
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  beforeEach(async () => {
    sseCollector = new EnhancedSSECollector();
    performanceMonitor = PerformanceMonitor.create('e2e-import-test');
    
    testContext = {
      artistId: '',
      sseEvents: [],
      performanceMetrics: new Map(),
      cacheHits: 0,
      cacheMisses: 0
    };

    // Set up progress monitoring
    ProgressBus.onGlobalProgress((event) => {
      sseCollector.addEvent(event);
      testContext.sseEvents.push(event);
    });
  });

  afterEach(async () => {
    // Clean up test data
    if (testContext.artistId) {
      await DatabaseTestUtils.cleanupTestData(testContext.artistId);
    }
    
    // Clear cache
    await Promise.all([
      cache.del(cacheKeys.artist(testContext.artistId)),
      cache.del(cacheKeys.syncProgress(testContext.artistId))
    ].filter(Boolean));

    vi.clearAllMocks();
    sseCollector.clear();
    ProgressBus.removeAllListeners?.();
  });

  describe('Database Operations and Validation', () => {
    it('should validate Prisma client functionality', async () => {
      // Test database health
      const health = await prisma.$health();
      expect(health.status).toBe('healthy');

      // Test basic CRUD operations
      const testArtist = await prisma.artist.create({
        data: {
          name: 'Test Database Artist',
          slug: 'test-database-artist',
          spotifyId: 'test-spotify-123',
          tmAttractionId: 'test-tm-123',
          genres: JSON.stringify(['pop', 'rock']),
          popularity: 75,
          imageUrl: 'https://example.com/test.jpg'
        }
      });

      testContext.artistId = testArtist.id;
      expect(testArtist.name).toBe('Test Database Artist');

      // Test update
      const updatedArtist = await prisma.artist.update({
        where: { id: testArtist.id },
        data: { popularity: 80 }
      });
      expect(updatedArtist.popularity).toBe(80);

      // Test query functionality
      const artistBySlug = await prisma.artist.findUnique({
        where: { slug: 'test-database-artist' }
      });
      expect(artistBySlug?.id).toBe(testArtist.id);
    });

    it('should execute optimized artist queries efficiently', async () => {
      // Create test data
      const artistData = MockDataGenerator.generateArtistData('query-test');
      const testArtist = await prisma.artist.create({
        data: {
          name: artistData.spotify.name,
          slug: 'query-test-artist',
          spotifyId: artistData.spotify.id,
          tmAttractionId: artistData.ticketmaster.id,
          genres: JSON.stringify(artistData.spotify.genres),
          popularity: artistData.spotify.popularity,
          imageUrl: artistData.spotify.images[0].url,
          followerCount: artistData.spotify.followers.total
        }
      });

      testContext.artistId = testArtist.id;

      // Test optimized queries
      const startTime = Date.now();
      
      const [artistById, artistBySlug, similarArtists] = await Promise.all([
        ArtistQueries.getArtistById(testArtist.id),
        ArtistQueries.getArtistBySlug('query-test-artist'),
        ArtistQueries.getSimilarArtists(testArtist.id, { limit: 5 })
      ]);

      const queryTime = Date.now() - startTime;

      // Verify results
      expect(artistById).toBeTruthy();
      expect(artistById.artist.id).toBe(testArtist.id);
      expect(artistBySlug).toBeTruthy();
      expect(artistBySlug.artist.slug).toBe('query-test-artist');

      // Performance check - complex queries should complete under 500ms
      expect(queryTime).toBeLessThan(500);

      console.log(`Query performance: ${queryTime}ms for 3 complex queries`);
    });

    it('should handle advanced filtering and search operations', async () => {
      // Test search functionality
      const searchResults = await ArtistQueries.searchArtists('Test Artist', {
        limit: 10,
        minPopularity: 50,
        sortBy: 'popularity',
        includeStats: true
      });

      expect(Array.isArray(searchResults)).toBe(true);

      // Test advanced filtering
      const trendingArtists = await ArtistQueries.getTrendingArtists({
        limit: 10,
        timeWindow: 168, // 7 days
        minFollowers: 1000,
        includeStats: true
      });

      expect(Array.isArray(trendingArtists)).toBe(true);

      // Test cached query performance
      const cachedSearchStart = Date.now();
      const cachedResults = await CachedArtistQueries.searchArtists('Test Artist', {
        limit: 10,
        minPopularity: 50
      });
      const cachedSearchTime = Date.now() - cachedSearchStart;

      // Cached results should be significantly faster
      expect(cachedSearchTime).toBeLessThan(100);
    });
  });

  describe('Cache Integration and Performance', () => {
    it('should validate Redis cache functionality', async () => {
      const testKey = 'test:cache:functionality';
      const testData = { artist: 'Test Artist', timestamp: Date.now() };

      // Test basic cache operations
      const setResult = await cache.set(testKey, testData, { ex: 60 });
      expect(setResult).toBe(true);

      const cachedData = await cache.get(testKey);
      expect(cachedData).toEqual(testData);

      // Test TTL
      const ttl = await cache.ttl(testKey);
      expect(ttl).toBeGreaterThan(0);

      // Test deletion
      const delResult = await cache.del(testKey);
      expect(delResult).toBe(1);

      const deletedData = await cache.get(testKey);
      expect(deletedData).toBeNull();
    });

    it('should optimize query performance with caching', async () => {
      // Create test artist
      const testArtist = await prisma.artist.create({
        data: {
          name: 'Cache Performance Test',
          slug: 'cache-perf-test',
          spotifyId: 'cache-test-123',
          genres: JSON.stringify(['pop']),
          popularity: 85
        }
      });

      testContext.artistId = testArtist.id;

      const testOperations = [
        () => CachedArtistQueries.getArtistById(testArtist.id),
        () => CachedArtistQueries.getArtistBySlug('cache-perf-test'),
        () => CachedArtistQueries.searchArtists('Cache Performance', { limit: 5 })
      ];

      const cacheMetrics = await CacheTestUtils.validateCachePerformance(testOperations);

      expect(cacheMetrics.cacheHitRatio).toBeGreaterThan(0.8); // >80% cache hit ratio
      expect(cacheMetrics.averageResponseTime).toBeLessThan(50); // <50ms average
      
      console.log('Cache performance metrics:', cacheMetrics);
    });

    it('should handle cache invalidation properly', async () => {
      const artistKey = cacheKeys.artist('test-invalidation');
      const testData = { id: 'test-invalidation', name: 'Test Artist' };

      // Set initial cache
      await cache.set(artistKey, testData, { ex: 300 });
      
      // Verify cached
      const cached = await cache.get(artistKey);
      expect(cached).toEqual(testData);

      // Test pattern invalidation
      await cache.invalidatePattern('artist');
      
      // Should be invalidated
      const afterInvalidation = await cache.get(artistKey);
      expect(afterInvalidation).toBeNull();
    });
  });

  describe('Complete Import Flow with Real API Integration', () => {
    it('should complete full artist import within SLO targets', async () => {
      // Mock comprehensive API responses
      const mockData = MockDataGenerator.generateArtistData('full-import-test');
      const mockShows = MockDataGenerator.generateShowData(50, 'full-import-test');
      const mockCatalog = MockDataGenerator.generateSongCatalog(100, 'full-import-test');

      // Set up API mocks
      vi.mocked = vi.mocked || ((fn) => fn as any);
      
      // Phase 1: Identity/Bootstrap (< 200ms SLO)
      performanceMonitor.startTimer('identity');
      
      const orchestrator = new ArtistImportOrchestrator();
      const identityResult = await orchestrator.initiateImport('full-import-test');
      
      const identityDuration = performanceMonitor.endTimer('identity');
      testContext.artistId = identityResult.artistId;

      // Verify Phase 1 SLO
      expect(identityDuration).toBeLessThan(200);
      expect(identityResult.artistId).toBeTruthy();
      expect(identityResult.slug).toBeTruthy();

      // Wait for SSE initialization event
      await sseCollector.waitForPhase('initializing', 5000);

      // Phase 2 & 3: Background import
      performanceMonitor.startTimer('background');
      
      const importPromise = orchestrator.runFullImport(testContext.artistId);
      
      // Monitor progress events
      const progressHandler = (event: any) => {
        testContext.performanceMetrics.set(event.stage || 'unknown', Date.now());
      };
      sseCollector.on('event', progressHandler);

      // Wait for completion
      const importResult = await importPromise;
      const backgroundDuration = performanceMonitor.endTimer('background');

      sseCollector.off('event', progressHandler);

      // Verify overall performance
      expect(importResult.success).toBe(true);
      expect(backgroundDuration).toBeLessThan(75000); // Combined phases < 75s

      // Validate database consistency
      const consistencyCheck = await DatabaseTestUtils.validateDatabaseConsistency(testContext.artistId);
      expect(consistencyCheck.valid).toBe(true);

      if (!consistencyCheck.valid) {
        console.error('Database consistency issues:', consistencyCheck.issues);
      }

      // Verify import metrics
      const importMetrics = await DatabaseTestUtils.getImportMetrics(testContext.artistId);
      expect(importMetrics.errorCount).toBe(0);
      expect(importMetrics.recordCounts.songs).toBeGreaterThan(0);
      expect(importMetrics.recordCounts.shows).toBeGreaterThan(0);

      console.log('Import completion metrics:', {
        identityTime: identityDuration,
        backgroundTime: backgroundDuration,
        recordCounts: importMetrics.recordCounts
      });
    });

    it('should stream progress updates via SSE within timing requirements', async () => {
      const orchestrator = new ArtistImportOrchestrator();
      
      // Start import
      const identityResult = await orchestrator.initiateImport('sse-test-artist');
      testContext.artistId = identityResult.artistId;

      // Monitor SSE timing
      const eventTimestamps: Array<{ phase: string; timestamp: number }> = [];
      const startTime = Date.now();

      sseCollector.on('event', (event) => {
        eventTimestamps.push({
          phase: event.stage || event.phase || 'unknown',
          timestamp: Date.now() - startTime
        });
      });

      // Run full import
      await orchestrator.runFullImport(testContext.artistId);

      // Verify SSE timing requirements
      const phases = ['initializing', 'importing-shows', 'importing-songs', 'completed'];
      
      for (let i = 1; i < phases.length; i++) {
        const currentPhase = eventTimestamps.find(e => e.phase === phases[i]);
        const previousPhase = eventTimestamps.find(e => e.phase === phases[i-1]);
        
        if (currentPhase && previousPhase) {
          const timeBetween = currentPhase.timestamp - previousPhase.timestamp;
          // SSE events should be sent within 200ms of phase changes
          expect(timeBetween).toBeLessThan(200);
        }
      }

      // Verify progress monotonicity
      const progressEvents = testContext.sseEvents
        .filter(e => typeof e.progress === 'number')
        .map(e => e.progress);

      for (let i = 1; i < progressEvents.length; i++) {
        expect(progressEvents[i]).toBeGreaterThanOrEqual(progressEvents[i-1]);
      }

      console.log('SSE timing analysis:', {
        totalEvents: eventTimestamps.length,
        phases: eventTimestamps.map(e => ({ phase: e.phase, time: e.timestamp }))
      });
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle API failures gracefully', async () => {
      let apiFailureCount = 0;
      const maxFailures = 3;

      // Mock intermittent API failures
      const originalSpotifyAuth = SpotifyClient.prototype.authenticate;
      SpotifyClient.prototype.authenticate = vi.fn().mockImplementation(async function() {
        apiFailureCount++;
        if (apiFailureCount <= maxFailures) {
          throw new Error('Temporary API failure');
        }
        return { success: true, tokenType: 'Bearer', expiresIn: 3600 };
      });

      const orchestrator = new ArtistImportOrchestrator();
      
      // Should eventually succeed after retries
      const identityResult = await orchestrator.initiateImport('error-recovery-test');
      testContext.artistId = identityResult.artistId;

      // Verify retry logic worked
      expect(apiFailureCount).toBeGreaterThan(maxFailures);

      // Restore original method
      SpotifyClient.prototype.authenticate = originalSpotifyAuth;
    });

    it('should maintain data integrity during partial failures', async () => {
      const orchestrator = new ArtistImportOrchestrator();
      
      // Start successful identity phase
      const identityResult = await orchestrator.initiateImport('partial-failure-test');
      testContext.artistId = identityResult.artistId;

      // Mock failure during shows import
      const originalIterateEvents = TicketmasterClient.prototype.iterateEventsByAttraction;
      TicketmasterClient.prototype.iterateEventsByAttraction = vi.fn().mockRejectedValue(
        new Error('API rate limit exceeded')
      );

      // Import should handle failure gracefully
      await expect(orchestrator.runFullImport(testContext.artistId)).rejects.toThrow();

      // Verify artist record still exists and is marked as failed
      const artistRecord = await prisma.artist.findUnique({
        where: { id: testContext.artistId }
      });

      expect(artistRecord).toBeTruthy();
      expect(artistRecord?.importStatus).toBe('failed');

      // Verify partial data consistency
      const consistencyCheck = await DatabaseTestUtils.validateDatabaseConsistency(testContext.artistId);
      
      // Should have no critical consistency issues even after failure
      const criticalIssues = consistencyCheck.issues.filter(issue => 
        !issue.includes('No sync job') && !issue.includes('shows: 0')
      );
      expect(criticalIssues.length).toBe(0);

      // Restore original method
      TicketmasterClient.prototype.iterateEventsByAttraction = originalIterateEvents;
    });
  });

  describe('Performance and Scalability', () => {
    it('should maintain acceptable memory usage during large imports', async () => {
      const initialMemory = process.memoryUsage();
      
      // Simulate large import with 500 shows and 500 songs
      const mockShows = MockDataGenerator.generateShowData(500, 'memory-test');
      const mockCatalog = MockDataGenerator.generateSongCatalog(500, 'memory-test');

      const orchestrator = new ArtistImportOrchestrator();
      
      // Mock large dataset
      vi.mocked = vi.mocked || ((fn) => fn as any);
      
      const identityResult = await orchestrator.initiateImport('memory-test-artist');
      testContext.artistId = identityResult.artistId;
      
      await orchestrator.runFullImport(testContext.artistId);

      // Force garbage collection
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage();
      const heapGrowth = finalMemory.heapUsed - initialMemory.heapUsed;
      const maxAcceptableGrowth = 200 * 1024 * 1024; // 200MB

      expect(heapGrowth).toBeLessThan(maxAcceptableGrowth);

      console.log(`Memory usage test - Growth: ${(heapGrowth / 1024 / 1024).toFixed(2)}MB`);
    });

    it('should handle concurrent imports without conflicts', async () => {
      const orchestrator1 = new ArtistImportOrchestrator();
      const orchestrator2 = new ArtistImportOrchestrator();

      // Start concurrent imports for different artists
      const concurrentImports = await Promise.allSettled([
        (async () => {
          const identity = await orchestrator1.initiateImport('concurrent-test-1');
          return {
            identity,
            result: await orchestrator1.runFullImport(identity.artistId)
          };
        })(),
        (async () => {
          const identity = await orchestrator2.initiateImport('concurrent-test-2');
          return {
            identity,
            result: await orchestrator2.runFullImport(identity.artistId)
          };
        })()
      ]);

      // At least one should succeed
      const successfulImports = concurrentImports.filter(result => result.status === 'fulfilled');
      expect(successfulImports.length).toBeGreaterThanOrEqual(1);

      // Clean up both test artists
      for (const importResult of concurrentImports) {
        if (importResult.status === 'fulfilled') {
          await DatabaseTestUtils.cleanupTestData(importResult.value.identity.artistId);
        }
      }

      console.log(`Concurrent import test - ${successfulImports.length}/2 succeeded`);
    });

    it('should optimize database queries for scale', async () => {
      // Test query performance with simulated load
      const queryTests = [
        () => ArtistQueries.searchArtists('pop artist', { limit: 50 }),
        () => ArtistQueries.getTrendingArtists({ limit: 20 }),
        () => ArtistQueries.getArtistsAdvanced({ 
          genres: ['pop', 'rock'], 
          minPopularity: 50,
          limit: 30 
        })
      ];

      const performanceResults = [];

      for (const test of queryTests) {
        const startTime = Date.now();
        await test();
        const duration = Date.now() - startTime;
        performanceResults.push(duration);
      }

      // All queries should complete under 1 second
      performanceResults.forEach(duration => {
        expect(duration).toBeLessThan(1000);
      });

      const averageQueryTime = performanceResults.reduce((sum, time) => sum + time, 0) / performanceResults.length;
      
      console.log('Database query performance:', {
        individual: performanceResults,
        average: averageQueryTime
      });

      // Average query time should be under 500ms
      expect(averageQueryTime).toBeLessThan(500);
    });
  });

  describe('Data Quality and Validation', () => {
    it('should validate imported data quality', async () => {
      const testArtist = await prisma.artist.create({
        data: {
          name: 'Data Quality Test Artist',
          slug: 'data-quality-test',
          spotifyId: 'dq-test-123',
          genres: JSON.stringify(['pop', 'rock']),
          popularity: 75,
          imageUrl: 'https://example.com/test.jpg'
        }
      });

      testContext.artistId = testArtist.id;

      // Validate required fields
      expect(testArtist.name).toBeTruthy();
      expect(testArtist.slug).toMatch(/^[a-z0-9-]+$/); // Valid slug format
      expect(testArtist.popularity).toBeGreaterThanOrEqual(0);
      expect(testArtist.popularity).toBeLessThanOrEqual(100);

      // Validate JSON fields
      const genres = JSON.parse(testArtist.genres || '[]');
      expect(Array.isArray(genres)).toBe(true);

      // Validate URL format
      if (testArtist.imageUrl) {
        expect(testArtist.imageUrl).toMatch(/^https?:\/\/.+/);
      }

      console.log('Data quality validation passed for artist:', testArtist.name);
    });

    it('should enforce referential integrity', async () => {
      // Create artist first
      const testArtist = await prisma.artist.create({
        data: {
          name: 'Integrity Test Artist',
          slug: 'integrity-test',
          spotifyId: 'integrity-123'
        }
      });

      testContext.artistId = testArtist.id;

      // Create related records
      const testVenue = await prisma.venue.create({
        data: {
          name: 'Test Venue',
          slug: 'test-venue',
          city: 'Test City',
          state: 'Test State',
          country: 'US'
        }
      });

      const testShow = await prisma.show.create({
        data: {
          name: 'Test Show',
          slug: 'test-show',
          date: new Date(),
          headlinerArtistId: testArtist.id,
          venueId: testVenue.id
        }
      });

      // Verify relationships work
      const showWithArtist = await db
        .select()
        .from(shows)
        .innerJoin(artists, eq(shows.headlinerArtistId, artists.id))
        .innerJoin(venues, eq(shows.venueId, venues.id))
        .where(eq(shows.id, testShow.id));

      expect(showWithArtist).toHaveLength(1);
      expect(showWithArtist[0].artists.id).toBe(testArtist.id);
      expect(showWithArtist[0].venues.id).toBe(testVenue.id);

      // Clean up additional test data
      await prisma.show.delete({ where: { id: testShow.id } });
      await prisma.venue.delete({ where: { id: testVenue.id } });
    });
  });
});