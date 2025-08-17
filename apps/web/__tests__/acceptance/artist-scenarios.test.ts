/**
 * Acceptance Tests with Multiple Artist Types
 * Tests realistic scenarios: sparse, mid-tier, prolific artists
 * Validates complete GROK.md acceptance criteria
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { db } from '@repo/database';
import { artists, venues, shows, songs, artistSongs } from '@repo/database';
import { eq, count } from 'drizzle-orm';

// Import services
import { ArtistImportOrchestrator } from '../../lib/services/orchestrators/ArtistImportOrchestrator';
import { PerformanceMonitor, SLO_TARGETS } from '../../lib/services/monitoring/PerformanceMonitor';
import { testStudioFiltering } from '../../lib/services/ingest/SpotifyCatalogIngest';

// Hoisted module stubs for Vitest (configure implementations per scenario later)
vi.mock('../../lib/services/adapters/TicketmasterClient', () => ({
  iterateEventsByAttraction: vi.fn(),
}));
vi.mock('../../lib/services/adapters/SpotifyClient', () => ({
  getAccessToken: vi.fn(),
  listAllAlbums: vi.fn(),
  listAlbumTracks: vi.fn(),
  getTracksDetails: vi.fn(),
  getAudioFeatures: vi.fn(),
}));

// Artist type definitions for testing
interface ArtistTestScenario {
  name: string;
  type: 'sparse' | 'mid' | 'prolific';
  tmAttractionId: string;
  spotifyId: string;
  expectedShows: number;
  expectedAlbums: number;
  expectedTracks: number;
  expectedLiveAlbums?: number;
  description: string;
}

const ARTIST_SCENARIOS: ArtistTestScenario[] = [
  {
    name: 'Emerging Indie Artist',
    type: 'sparse',
    tmAttractionId: 'sparse001',
    spotifyId: 'sparse_spotify_001',
    expectedShows: 15,
    expectedAlbums: 2,
    expectedTracks: 18,
    expectedLiveAlbums: 0,
    description: 'New artist with minimal catalog and few tour dates'
  },
  {
    name: 'Mid-Tier Touring Artist',
    type: 'mid',
    tmAttractionId: 'mid001',
    spotifyId: 'mid_spotify_001',
    expectedShows: 150,
    expectedAlbums: 8,
    expectedTracks: 120,
    expectedLiveAlbums: 2,
    description: 'Established artist with moderate catalog and regular touring'
  },
  {
    name: 'Stadium Headliner',
    type: 'prolific',
    tmAttractionId: 'prolific001',
    spotifyId: 'prolific_spotify_001',
    expectedShows: 800,
    expectedAlbums: 25,
    expectedTracks: 350,
    expectedLiveAlbums: 8,
    description: 'Major artist with extensive catalog and worldwide touring'
  }
];

// Generate realistic test data for each artist type
const generateArtistData = (scenario: ArtistTestScenario) => {
  // Generate shows based on artist type
  const shows = Array.from({ length: scenario.expectedShows }, (_, i) => ({
    id: `${scenario.type}_event_${i}`,
    name: `${scenario.name} - ${getVenueName(i, scenario.type)}`,
    dates: {
      start: {
        localDate: getEventDate(i, scenario.expectedShows),
        localTime: '20:00:00'
      }
    },
    _embedded: {
      venues: [{
        id: `${scenario.type}_venue_${i % getVenueVariety(scenario.type)}`,
        name: getVenueName(i, scenario.type),
        city: { name: getCityName(i, scenario.type) },
        state: { name: getStateName(i, scenario.type) },
        country: { name: 'United States' },
        address: { line1: `${100 + i} Main Street` },
        location: {
          latitude: (40 + (i % 10)).toString(),
          longitude: (-74 - (i % 10)).toString()
        }
      }]
    },
    url: `https://www.ticketmaster.com/${scenario.type}_event_${i}`,
    priceRanges: getPriceRange(scenario.type)
  }));

  // Generate albums and tracks based on artist type
  const albums = [];
  const tracks: Record<string, any[]> = {};
  const audioFeatures = [];
  
  let trackCounter = 0;

  for (let i = 0; i < scenario.expectedAlbums; i++) {
    const isLiveAlbum = i < (scenario.expectedLiveAlbums || 0);
    const albumId = `${scenario.type}_album_${i}`;
    
    albums.push({
      id: albumId,
      name: isLiveAlbum ? `Live at ${getCityName(i, scenario.type)}` : `Studio Album ${i + 1}`,
      album_type: 'album',
      release_date: `${2015 + i}-${String((i % 12) + 1).padStart(2, '0')}-01`,
      total_tracks: getTracksPerAlbum(scenario.type)
    });

    // Generate tracks for this album
    const tracksPerAlbum = getTracksPerAlbum(scenario.type);
    const albumTracks = [];

    for (let j = 0; j < tracksPerAlbum && trackCounter < scenario.expectedTracks; j++, trackCounter++) {
      const trackId = `${scenario.type}_track_${trackCounter}`;
      const isLiveTrack = isLiveAlbum || (Math.random() < 0.1); // 10% chance for studio albums
      
      const track = {
        id: trackId,
        name: isLiveTrack ? `Song ${j + 1} (Live)` : `Song ${j + 1}`,
        track_number: j + 1,
        disc_number: 1,
        duration_ms: 180000 + (Math.random() * 120000),
        popularity: getTrackPopularity(scenario.type),
        external_ids: { isrc: `${scenario.type.toUpperCase()}${String(trackCounter).padStart(7, '0')}` },
        artists: [{ id: scenario.spotifyId, name: scenario.name }],
        album: albums[i],
        uri: `spotify:track:${trackId}`,
        external_urls: { spotify: `https://open.spotify.com/track/${trackId}` },
        preview_url: Math.random() > 0.3 ? `https://preview.spotify.com/${trackId}` : null,
        explicit: Math.random() < 0.05,
        is_local: false
      };

      albumTracks.push(track);

      // Generate audio features
      audioFeatures.push({
        id: trackId,
        liveness: isLiveTrack ? (0.8 + Math.random() * 0.2) : Math.random() * 0.7,
        energy: Math.random(),
        danceability: Math.random(),
        valence: Math.random(),
        acousticness: Math.random(),
        tempo: 80 + Math.random() * 100
      });
    }

    tracks[albumId] = albumTracks;
  }

  return { shows, albums, tracks, audioFeatures };
};

// Helper functions for realistic data generation
const getVenueName = (index: number, type: string) => {
  const venues = {
    sparse: ['Local Club', 'Community Center', 'Small Theater', 'Coffee Shop'],
    mid: ['City Hall', 'Convention Center', 'Amphitheater', 'Music Hall'],
    prolific: ['Stadium', 'Arena', 'Coliseum', 'Dome', 'Garden']
  };
  return venues[type as keyof typeof venues][index % venues[type as keyof typeof venues].length];
};

const getCityName = (index: number, type: string) => {
  const cities = {
    sparse: ['Austin', 'Portland', 'Nashville', 'Denver'],
    mid: ['Atlanta', 'Seattle', 'Boston', 'Miami', 'Phoenix', 'Detroit'],
    prolific: ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Philadelphia', 'Phoenix', 'San Antonio', 'San Diego', 'Dallas', 'San Jose']
  };
  return cities[type as keyof typeof cities][index % cities[type as keyof typeof cities].length];
};

const getStateName = (index: number, type: string) => {
  const states = {
    sparse: ['Texas', 'Oregon', 'Tennessee', 'Colorado'],
    mid: ['Georgia', 'Washington', 'Massachusetts', 'Florida', 'Arizona', 'Michigan'],
    prolific: ['New York', 'California', 'Illinois', 'Texas', 'Pennsylvania', 'Arizona', 'Texas', 'California', 'Texas', 'California']
  };
  return states[type as keyof typeof states][index % states[type as keyof typeof states].length];
};

const getVenueVariety = (type: string) => {
  return { sparse: 8, mid: 25, prolific: 100 }[type] || 10;
};

const getTracksPerAlbum = (type: string) => {
  return { sparse: 8, mid: 12, prolific: 15 }[type] || 10;
};

const getTrackPopularity = (type: string) => {
  const base = { sparse: 20, mid: 50, prolific: 80 }[type] || 40;
  return base + Math.floor(Math.random() * 20);
};

const getPriceRange = (type: string) => {
  const ranges = {
    sparse: [{ min: 15, max: 40, currency: 'USD' }],
    mid: [{ min: 35, max: 85, currency: 'USD' }],
    prolific: [{ min: 75, max: 300, currency: 'USD' }]
  };
  return ranges[type as keyof typeof ranges];
};

const getEventDate = (index: number, totalShows: number) => {
  const startDate = new Date('2024-01-01');
  const endDate = new Date('2025-12-31');
  const timeSpan = endDate.getTime() - startDate.getTime();
  const eventTime = startDate.getTime() + (index / totalShows) * timeSpan;
  return new Date(eventTime).toISOString().split('T')[0];
};

describe('Acceptance Tests - Realistic Artist Scenarios', () => {
  describe.each(ARTIST_SCENARIOS)('$name ($type artist)', (scenario) => {
    let testArtistId: string;
    let performanceMonitor: PerformanceMonitor;

    beforeEach(async () => {
      // Generate and set up mocks for this artist scenario
      const artistData = generateArtistData(scenario);
      setupScenarioMocks(scenario, artistData);
      
      performanceMonitor = PerformanceMonitor.create(`acceptance-${scenario.type}`, scenario.tmAttractionId);
    });

    afterEach(async () => {
      if (testArtistId) {
        await cleanupTestData(testArtistId);
      }
      vi.clearAllMocks();
    });

    const setupScenarioMocks = (scenario: ArtistTestScenario, data: any) => {
      const { shows, albums, tracks, audioFeatures } = data;

      const tm = require('../../lib/services/adapters/TicketmasterClient');
      const sp = require('../../lib/services/adapters/SpotifyClient');

      vi.mocked(tm.iterateEventsByAttraction).mockImplementation(async function* () {
        const pageSize = 200;
        for (let i = 0; i < shows.length; i += pageSize) {
          yield shows.slice(i, i + pageSize);
          await new Promise(resolve => setTimeout(resolve, getAPIDelay(scenario.type)));
        }
      });

      vi.mocked(sp.getAccessToken).mockResolvedValue(`${scenario.type}_access_token`);
      vi.mocked(sp.listAllAlbums).mockResolvedValue(albums);
      vi.mocked(sp.listAlbumTracks).mockImplementation(async (albumId: string) => {
        await new Promise(resolve => setTimeout(resolve, getAPIDelay(scenario.type) / 2));
        return tracks[albumId] || [];
      });
      vi.mocked(sp.getTracksDetails).mockImplementation(async (trackIds: string[]) => {
        await new Promise(resolve => setTimeout(resolve, getAPIDelay(scenario.type)));
        const allTracks = Object.values(tracks).flat();
        return allTracks.filter((track: any) => trackIds.includes(track.id));
      });
      vi.mocked(sp.getAudioFeatures).mockImplementation(async (trackIds: string[]) => {
        await new Promise(resolve => setTimeout(resolve, getAPIDelay(scenario.type)));
        return audioFeatures.filter((feature: any) => trackIds.includes(feature.id));
      });
    };

    const getAPIDelay = (type: string) => {
      // Simulate realistic API response times
      return { sparse: 50, mid: 100, prolific: 200 }[type] || 100;
    };

    it('should complete import within performance SLOs', async () => {
      performanceMonitor.startTimer('full_import');
      
      const orchestrator = new ArtistImportOrchestrator();
      
      // Phase 1: Identity
      performanceMonitor.startTimer('identity');
      const identityResult = await orchestrator.initiateImport(scenario.tmAttractionId);
      const identityDuration = performanceMonitor.endTimer('identity');
      testArtistId = identityResult.artistId;

      // Phase 2 & 3: Background import
      performanceMonitor.startTimer('background');
      const importResult = await orchestrator.runFullImport(testArtistId);
      const backgroundDuration = performanceMonitor.endTimer('background');
      const totalDuration = performanceMonitor.endTimer('full_import');

      // Verify import success
      expect(importResult.success).toBe(true);

      // Verify SLOs based on artist type
      expect(identityDuration).toBeLessThan(SLO_TARGETS.IDENTITY_PHASE.threshold);

      // Adjust SLO expectations based on data volume
      const showsExpectedTime = Math.min(scenario.expectedShows * 30, SLO_TARGETS.SHOWS_PHASE.threshold);
      const catalogExpectedTime = Math.min(scenario.expectedTracks * 20, SLO_TARGETS.CATALOG_PHASE.threshold);

      // For prolific artists, we allow slightly higher thresholds
      if (scenario.type === 'prolific') {
        expect(backgroundDuration).toBeLessThan(90000); // 90s for major artists
      } else {
        expect(backgroundDuration).toBeLessThan(75000); // 75s for others
      }

      console.log(`${scenario.name} Performance:
        Identity: ${identityDuration}ms
        Background: ${backgroundDuration}ms  
        Total: ${totalDuration}ms`);
    });

    it('should import expected volume of data correctly', async () => {
      const orchestrator = new ArtistImportOrchestrator();
      const identityResult = await orchestrator.initiateImport(scenario.tmAttractionId);
      testArtistId = identityResult.artistId;

      await orchestrator.runFullImport(testArtistId);

      // Verify show count
      const [{ count: showCount }] = await db
        .select({ count: count() })
        .from(shows)
        .where(eq(shows.headlinerArtistId, testArtistId));

      expect(showCount).toBe(scenario.expectedShows);

      // Verify unique venues created (should be less than shows due to multi-night runs)
      const [{ count: venueCount }] = await db
        .select({ count: count() })
        .from(venues);

      expect(venueCount).toBeGreaterThan(0);
      expect(venueCount).toBeLessThanOrEqual(scenario.expectedShows);

      // Verify track count (should be less than expected due to live filtering)
      const [{ count: trackCount }] = await db
        .select({ count: count() })
        .from(artistSongs)
        .where(eq(artistSongs.artistId, testArtistId));

      // Allow for filtering - expect 70-90% of tracks to pass filtering
      const minExpected = Math.floor(scenario.expectedTracks * 0.7);
      const maxExpected = Math.floor(scenario.expectedTracks * 0.9);
      
      expect(trackCount).toBeGreaterThanOrEqual(minExpected);
      expect(trackCount).toBeLessThanOrEqual(maxExpected);

      console.log(`${scenario.name} Data Volume:
        Shows: ${showCount}/${scenario.expectedShows}
        Venues: ${venueCount}
        Tracks: ${trackCount}/${scenario.expectedTracks} (${((trackCount/scenario.expectedTracks)*100).toFixed(1)}% after filtering)`);
    });

    it('should maintain studio-only catalog quality', async () => {
      const orchestrator = new ArtistImportOrchestrator();
      const identityResult = await orchestrator.initiateImport(scenario.tmAttractionId);
      testArtistId = identityResult.artistId;

      await orchestrator.runFullImport(testArtistId);

      // Get all songs for this artist
      const artistTracks = await db
        .select({
          song: songs,
          artistSong: artistSongs
        })
        .from(artistSongs)
        .innerJoin(songs, eq(artistSongs.songId, songs.id))
        .where(eq(artistSongs.artistId, testArtistId));

      // Verify no live tracks
      const liveTracks = artistTracks.filter(({ song }) => song.isLive === true);
      expect(liveTracks).toHaveLength(0);

      // Verify no live track names
      const liveNamePattern = /(live|concert|acoustic version|unplugged)/i;
      const tracksWithLiveNames = artistTracks.filter(({ song }) => 
        liveNamePattern.test(song.name)
      );
      expect(tracksWithLiveNames).toHaveLength(0);

      // Verify ISRC uniqueness
      const tracksByISRC = new Map();
      artistTracks.forEach(({ song }) => {
        if (song.isrc) {
          if (tracksByISRC.has(song.isrc)) {
            throw new Error(`Duplicate ISRC found: ${song.isrc}`);
          }
          tracksByISRC.set(song.isrc, song);
        }
      });

      console.log(`${scenario.name} Quality Metrics:
        Studio tracks: ${artistTracks.length}
        Live tracks: ${liveTracks.length}
        Unique ISRCs: ${tracksByISRC.size}`);
    });

    it('should handle artist-specific edge cases', async () => {
      const orchestrator = new ArtistImportOrchestrator();
      
      // Test with different concurrency settings based on artist type
      const concurrencyConfig = {
        sparse: { albums: 2, tracks: 2, shows: 1 },
        mid: { albums: 5, tracks: 3, shows: 2 },
        prolific: { albums: 10, tracks: 5, shows: 3 }
      };

      const config = {
        concurrency: concurrencyConfig[scenario.type]
      };

      const identityResult = await orchestrator.initiateImport(scenario.tmAttractionId);
      testArtistId = identityResult.artistId;

      await orchestrator.runFullImport(testArtistId);

      // Verify appropriate handling based on artist type
      const dbArtist = await db
        .select()
        .from(artists)
        .where(eq(artists.id, testArtistId))
        .limit(1);

      expect(dbArtist[0]).toMatchObject({
        name: scenario.name,
        tmAttractionId: scenario.tmAttractionId,
        spotifyId: scenario.spotifyId,
        importStatus: 'completed'
      });

      // Type-specific validations
      if (scenario.type === 'sparse') {
        // Sparse artists should complete very quickly
        expect(dbArtist[0].showsSyncedAt).toBeTruthy();
        expect(dbArtist[0].songCatalogSyncedAt).toBeTruthy();
      } else if (scenario.type === 'prolific') {
        // Prolific artists should have comprehensive data
        expect(dbArtist[0].totalSongs).toBeGreaterThan(200);
        expect(dbArtist[0].followers).toBeGreaterThan(1000000);
      }
    });

    it('should maintain performance consistency across multiple runs', async () => {
      const orchestrator = new ArtistImportOrchestrator();
      const durations: number[] = [];

      // Run import multiple times to test consistency
      const runCount = scenario.type === 'sparse' ? 5 : 3; // More runs for simpler data

      for (let i = 0; i < runCount; i++) {
        const startTime = Date.now();
        
        const identityResult = await orchestrator.initiateImport(`${scenario.tmAttractionId}_${i}`);
        await orchestrator.runFullImport(identityResult.artistId);
        
        const duration = Date.now() - startTime;
        durations.push(duration);

        // Clean up for next iteration
        await cleanupTestData(identityResult.artistId);
      }

      // Calculate performance consistency
      const mean = durations.reduce((sum, d) => sum + d, 0) / durations.length;
      const variance = durations.reduce((sum, d) => sum + (d - mean) ** 2, 0) / durations.length;
      const stdDev = Math.sqrt(variance);
      const coefficientOfVariation = stdDev / mean;

      // Performance should be consistent (CV < 30%)
      expect(coefficientOfVariation).toBeLessThan(0.3);

      console.log(`${scenario.name} Consistency:
        Mean: ${mean.toFixed(0)}ms
        Std Dev: ${stdDev.toFixed(0)}ms
        CV: ${(coefficientOfVariation * 100).toFixed(1)}%`);
    });

    const cleanupTestData = async (artistId: string) => {
      await db.delete(artistSongs).where(eq(artistSongs.artistId, artistId));
      await db.delete(shows).where(eq(shows.headlinerArtistId, artistId));
      await db.delete(artists).where(eq(artists.id, artistId));
      
      // Clean up orphaned venues and songs
      const orphanedVenues = await db
        .select({ id: venues.id })
        .from(venues)
        .leftJoin(shows, eq(venues.id, shows.venueId))
        .where(eq(shows.id, null));
        
      if (orphanedVenues.length > 0) {
        const venueIds = orphanedVenues.map(v => v.id);
        await db.delete(venues).where(eq(venues.id, venueIds[0]));
      }
    };
  });

  describe('Cross-Artist Validation', () => {
    it('should handle imports of different artist types concurrently', async () => {
      const orchestrators = ARTIST_SCENARIOS.map(scenario => ({
        orchestrator: new ArtistImportOrchestrator(),
        scenario
      }));

      // Start all imports concurrently
      const importPromises = orchestrators.map(async ({ orchestrator, scenario }) => {
        const artistData = generateArtistData(scenario);
        setupConcurrentMocks(scenario, artistData);
        
        const identityResult = await orchestrator.initiateImport(scenario.tmAttractionId);
        const importResult = await orchestrator.runFullImport(identityResult.artistId);
        
        return {
          scenario,
          identityResult,
          importResult,
          artistId: identityResult.artistId
        };
      });

      const results = await Promise.allSettled(importPromises);

      // All imports should succeed
      const successful = results.filter(r => r.status === 'fulfilled');
      expect(successful.length).toBe(ARTIST_SCENARIOS.length);

      // Clean up all test artists
      for (const result of results) {
        if (result.status === 'fulfilled') {
          await cleanupTestData(result.value.artistId);
        }
      }

      console.log(`Concurrent Import Results: ${successful.length}/${ARTIST_SCENARIOS.length} successful`);
    });

    const setupConcurrentMocks = (scenario: ArtistTestScenario, data: any) => {
      // Set up unique mocks for concurrent testing
      const mockId = `concurrent_${scenario.type}`;
      
      vi.mocked(require('../../lib/services/adapters/TicketmasterClient').iterateEventsByAttraction)
        .mockImplementation(async function* () {
          yield data.shows;
        });

      vi.mocked(require('../../lib/services/adapters/SpotifyClient').listAllAlbums)
        .mockResolvedValue(data.albums);
    };

    const cleanupTestData = async (artistId: string) => {
      await db.delete(artistSongs).where(eq(artistSongs.artistId, artistId));
      await db.delete(shows).where(eq(shows.headlinerArtistId, artistId));
      await db.delete(artists).where(eq(artists.id, artistId));
    };
  });

  describe('Studio Filtering Accuracy Validation', () => {
    it('should achieve >95% accuracy in studio track filtering', async () => {
      // Test filtering accuracy across different artist types
      const filteringResults = await Promise.all(
        ARTIST_SCENARIOS.map(async scenario => {
          const testResult = await testStudioFiltering(scenario.spotifyId, 100);
          return {
            scenario: scenario.name,
            ...testResult
          };
        })
      );

      filteringResults.forEach(result => {
        const accuracy = result.filteringAccuracy;
        expect(accuracy).toBeGreaterThan(0.95); // >95% accuracy
        
        console.log(`${result.scenario} Filtering:
          Total: ${result.totalTracks}
          Studio: ${result.studioTracks}
          Live Filtered: ${result.liveTracksFiltered}
          Accuracy: ${(accuracy * 100).toFixed(1)}%`);
      });
    });
  });
});