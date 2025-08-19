/**
 * Quality Validation Tests
 * Tests GROK.md quality requirements: idempotency, completeness, catalog purity, ISRC dedup
 * Validates all quality bars from GROK.md Section 0
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { db } from '@repo/database';
import { artists, venues, shows, songs, artistSongs, importStatus } from '@repo/database';
import { eq, count, sql, inArray } from 'drizzle-orm';

// Import services
import { ArtistImportOrchestrator } from '../../lib/services/orchestrators/ArtistImportOrchestrator';
import { SpotifyCatalogIngest } from '../../lib/services/ingest/SpotifyCatalogIngest';
import { TicketmasterIngest } from '../../lib/services/ingest/TicketmasterIngest';
import { ProgressBus } from '../../lib/services/progress/ProgressBus';

// Test data for validation
const mockComprehensiveData = {
  // Realistic artist with multiple releases and duplicates
  artist: {
    tmAttractionId: 'K8vZ917G7x0',
    name: 'Taylor Swift',
    spotifyId: '06HL4z0CvFAxyc27GXpf02'
  },
  
  // Shows with duplicate venues (test FK mapping)
  shows: [
    {
      id: 'event1',
      name: 'The Eras Tour - New York Night 1',
      dates: { start: { localDate: '2024-10-01', localTime: '19:00:00' } },
      _embedded: {
        venues: [{
          id: 'venue1',
          name: 'MetLife Stadium',
          city: { name: 'East Rutherford' },
          state: { name: 'New Jersey' },
          country: { name: 'United States' },
          address: { line1: '1 MetLife Stadium Dr' }
        }]
      }
    },
    {
      id: 'event2',
      name: 'The Eras Tour - New York Night 2',
      dates: { start: { localDate: '2024-10-02', localTime: '19:00:00' } },
      _embedded: {
        venues: [{
          id: 'venue1', // Same venue as event1
          name: 'MetLife Stadium',
          city: { name: 'East Rutherford' },
          state: { name: 'New Jersey' },
          country: { name: 'United States' },
          address: { line1: '1 MetLife Stadium Dr' }
        }]
      }
    },
    {
      id: 'event3',
      name: 'The Eras Tour - Los Angeles',
      dates: { start: { localDate: '2024-10-15', localTime: '19:30:00' } },
      _embedded: {
        venues: [{
          id: 'venue2',
          name: 'SoFi Stadium',
          city: { name: 'Los Angeles' },
          state: { name: 'California' },
          country: { name: 'United States' },
          address: { line1: '1001 Stadium Dr' }
        }]
      }
    }
  ],

  // Tracks with duplicates, live versions, and same ISRCs
  albums: [
    {
      id: 'album1',
      name: 'Midnights',
      album_type: 'album',
      release_date: '2022-10-21'
    },
    {
      id: 'album2', 
      name: 'Midnights (Deluxe Edition)',
      album_type: 'album',
      release_date: '2022-10-25'
    },
    {
      id: 'album3',
      name: 'Live from Paris', // Live album - should be filtered
      album_type: 'album',
      release_date: '2023-03-01'
    }
  ],

  tracks: {
    album1: [
      {
        id: 'track1',
        name: 'Anti-Hero',
        external_ids: { isrc: 'USUM72214401' },
        popularity: 95,
        duration_ms: 200690
      },
      {
        id: 'track2',
        name: 'Lavender Haze',
        external_ids: { isrc: 'USUM72214402' },
        popularity: 88,
        duration_ms: 202273
      }
    ],
    album2: [
      {
        id: 'track3',
        name: 'Anti-Hero', // Same song, same ISRC, lower popularity
        external_ids: { isrc: 'USUM72214401' }, // Same ISRC as track1
        popularity: 92, // Lower than track1
        duration_ms: 200690
      },
      {
        id: 'track4',
        name: 'Snow On The Beach',
        external_ids: { isrc: 'USUM72214403' },
        popularity: 85,
        duration_ms: 256442
      }
    ],
    album3: [
      {
        id: 'track5',
        name: 'Anti-Hero (Live from Paris)', // Live version - should be filtered
        external_ids: { isrc: 'USUM72214404' },
        popularity: 78,
        duration_ms: 205000
      }
    ]
  },

  audioFeatures: [
    { id: 'track1', liveness: 0.1 }, // Studio
    { id: 'track2', liveness: 0.15 }, // Studio
    { id: 'track3', liveness: 0.12 }, // Studio (duplicate)
    { id: 'track4', liveness: 0.08 }, // Studio
    { id: 'track5', liveness: 0.92 } // Live (high liveness)
  ]
};

describe('Quality Validation Tests', () => {
  let testArtistId: string;

  beforeEach(async () => {
    // Set up comprehensive mocks
    setupQualityValidationMocks();
  });

  afterEach(async () => {
    if (testArtistId) {
      await cleanupTestData(testArtistId);
    }
    vi.clearAllMocks();
  });

  const setupQualityValidationMocks = () => {
    const { shows, albums, tracks, audioFeatures } = mockComprehensiveData;

    // Mock Ticketmaster
    vi.mock('../../lib/services/adapters/TicketmasterClient', () => ({
      iterateEventsByAttraction: vi.fn().mockImplementation(async function* () {
        yield shows;
      })
    }));

    // Mock Spotify
    vi.mock('../../lib/services/adapters/SpotifyClient', () => ({
      getAccessToken: vi.fn().mockResolvedValue('mock-token'),
      listAllAlbums: vi.fn().mockResolvedValue(albums),
      listAlbumTracks: vi.fn().mockImplementation(async (albumId: string) => {
        return tracks[albumId as keyof typeof tracks] || [];
      }),
      getTracksDetails: vi.fn().mockImplementation(async (trackIds: string[]) => {
        const allTracks = Object.values(tracks).flat();
        return allTracks.filter(track => trackIds.includes(track.id));
      }),
      getAudioFeatures: vi.fn().mockResolvedValue(audioFeatures)
    }));
  };

  const cleanupTestData = async (artistId: string) => {
    await db.delete(artistSongs).where(eq(artistSongs.artistId, artistId));
    await db.delete(importStatus).where(eq(importStatus.artistId, artistId));
    await db.delete(shows).where(eq(shows.headlinerArtistId, artistId));
    await db.delete(artists).where(eq(artists.id, artistId));
  };

  describe('GROK.md Quality Bar 1: Idempotency', () => {
    it('should produce identical results when import is re-run', async () => {
      const orchestrator = new ArtistImportOrchestrator();

      // First import
      const identity = await orchestrator.initiateImport(mockComprehensiveData.artist.tmAttractionId);
      testArtistId = identity.artistId;
      
      await orchestrator.runFullImport(testArtistId);

      // Capture initial state
      const initialCounts = await getDatabaseCounts(testArtistId);
      const initialArtist = await getArtistState(testArtistId);
      const initialShows = await getShowsState(testArtistId);
      const initialSongs = await getSongsState(testArtistId);

      // Second import (should be idempotent)
      await orchestrator.runFullImport(testArtistId);

      // Capture state after re-run
      const finalCounts = await getDatabaseCounts(testArtistId);
      const finalArtist = await getArtistState(testArtistId);
      const finalShows = await getShowsState(testArtistId);
      const finalSongs = await getSongsState(testArtistId);

      // Verify idempotency: no new rows created
      expect(finalCounts.artists).toBe(initialCounts.artists);
      expect(finalCounts.venues).toBe(initialCounts.venues);
      expect(finalCounts.shows).toBe(initialCounts.shows);
      expect(finalCounts.songs).toBe(initialCounts.songs);
      expect(finalCounts.artistSongs).toBe(initialCounts.artistSongs);

      // Verify data consistency
      expect(finalArtist).toEqual(initialArtist);
      expect(finalShows).toEqual(initialShows);
      expect(finalSongs).toEqual(initialSongs);
    });

    it('should handle partial re-runs without creating duplicates', async () => {
      const orchestrator = new ArtistImportOrchestrator();
      
      const identity = await orchestrator.initiateImport(mockComprehensiveData.artist.tmAttractionId);
      testArtistId = identity.artistId;

      // First: Complete shows import only
      const ticketmasterIngest = new TicketmasterIngest();
      await ticketmasterIngest.ingest({
        artistId: testArtistId,
        tmAttractionId: mockComprehensiveData.artist.tmAttractionId
      });

      const countsAfterShows = await getDatabaseCounts(testArtistId);

      // Second: Re-run shows import
      await ticketmasterIngest.ingest({
        artistId: testArtistId,
        tmAttractionId: mockComprehensiveData.artist.tmAttractionId
      });

      const countsAfterShowsRerun = await getDatabaseCounts(testArtistId);

      // Should not create new venues or shows
      expect(countsAfterShowsRerun.venues).toBe(countsAfterShows.venues);
      expect(countsAfterShowsRerun.shows).toBe(countsAfterShows.shows);

      // Third: Add catalog import
      const catalogIngest = new SpotifyCatalogIngest();
      await catalogIngest.ingest({
        artistId: testArtistId,
        spotifyId: mockComprehensiveData.artist.spotifyId
      });

      const countsAfterCatalog = await getDatabaseCounts(testArtistId);

      // Fourth: Re-run catalog import
      await catalogIngest.ingest({
        artistId: testArtistId,
        spotifyId: mockComprehensiveData.artist.spotifyId
      });

      const countsAfterCatalogRerun = await getDatabaseCounts(testArtistId);

      // Should not create new songs or relationships
      expect(countsAfterCatalogRerun.songs).toBe(countsAfterCatalog.songs);
      expect(countsAfterCatalogRerun.artistSongs).toBe(countsAfterCatalog.artistSongs);
    });
  });

  describe('GROK.md Quality Bar 2: TM Completeness', () => {
    it('should ingest all Ticketmaster pages when pagination exists', async () => {
      // Mock large event dataset with pagination
      const largeEventSet = Array.from({ length: 450 }, (_, i) => ({
        id: `event${i}`,
        name: `Concert ${i + 1}`,
        dates: { start: { localDate: `2024-${String((i % 12) + 1).padStart(2, '0')}-01` } },
        _embedded: {
          venues: [{
            id: `venue${i % 50}`, // 50 unique venues
            name: `Venue ${i % 50}`,
            city: { name: `City ${i % 20}` },
            state: { name: 'State' },
            country: { name: 'US' }
          }]
        }
      }));

      // Mock paginated responses (200 per page)
      vi.mocked(require('../../lib/services/adapters/TicketmasterClient').iterateEventsByAttraction)
        .mockImplementation(async function* () {
          const pageSize = 200;
          for (let i = 0; i < largeEventSet.length; i += pageSize) {
            yield largeEventSet.slice(i, i + pageSize);
          }
        });

      const orchestrator = new ArtistImportOrchestrator();
      const identity = await orchestrator.initiateImport(mockComprehensiveData.artist.tmAttractionId);
      testArtistId = identity.artistId;

      await orchestrator.runFullImport(testArtistId);

      // Verify all events were ingested
      const [{ count: showCount }] = await db
        .select({ count: count() })
        .from(shows)
        .where(eq(shows.headlinerArtistId, testArtistId));

      expect(showCount).toBe(450); // All events ingested

      // Verify all unique venues were created
      const [{ count: venueCount }] = await db
        .select({ count: count() })
        .from(venues);

      expect(venueCount).toBe(50); // All unique venues created
    });

    it('should handle pagination edge cases correctly', async () => {
      // Test empty pages, single event pages, etc.
      const edgeCaseEvents = [
        [], // Empty first page
        [{ id: 'event1', name: 'Single Event', dates: { start: { localDate: '2024-01-01' } }, _embedded: { venues: [{ id: 'venue1', name: 'Venue 1', city: { name: 'City' }, state: { name: 'State' }, country: { name: 'US' } }] } }], // Single event
        [], // Empty middle page
        Array.from({ length: 3 }, (_, i) => ({ id: `event${i + 2}`, name: `Event ${i + 2}`, dates: { start: { localDate: '2024-01-02' } }, _embedded: { venues: [{ id: `venue${i + 2}`, name: `Venue ${i + 2}`, city: { name: 'City' }, state: { name: 'State' }, country: { name: 'US' } }] } })) // Multiple events
      ];

      vi.mocked(require('../../lib/services/adapters/TicketmasterClient').iterateEventsByAttraction)
        .mockImplementation(async function* () {
          for (const page of edgeCaseEvents) {
            if (page.length > 0) yield page;
          }
        });

      const orchestrator = new ArtistImportOrchestrator();
      const identity = await orchestrator.initiateImport(mockComprehensiveData.artist.tmAttractionId);
      testArtistId = identity.artistId;

      await orchestrator.runFullImport(testArtistId);

      // Should handle edge cases gracefully
      const [{ count: showCount }] = await db
        .select({ count: count() })
        .from(shows)
        .where(eq(shows.headlinerArtistId, testArtistId));

      expect(showCount).toBe(4); // 1 + 3 events (empty pages ignored)
    });
  });

  describe('GROK.md Quality Bar 3: Catalog Purity (0 Live Tracks)', () => {
    it('should ensure zero live tracks in final database', async () => {
      const orchestrator = new ArtistImportOrchestrator();
      const identity = await orchestrator.initiateImport(mockComprehensiveData.artist.tmAttractionId);
      testArtistId = identity.artistId;

      await orchestrator.runFullImport(testArtistId);

      // Get all songs for this artist
      const artistSongIds = await db
        .select({ songId: artistSongs.songId })
        .from(artistSongs)
        .where(eq(artistSongs.artistId, testArtistId));

      const songIds = artistSongIds.map(as => as.songId);

      if (songIds.length > 0) {
        const liveSongs = await db
          .select()
          .from(songs)
          .where(sql`${songs.id} = ANY(${songIds}) AND ${songs.isLive} = true`);

        // GROK.md: Zero live tracks in DB
        expect(liveSongs).toHaveLength(0);

        // Verify all songs are marked as studio
        const allSongs = await db
          .select({ isLive: songs.isLive, name: songs.name })
          .from(songs)
          .where(sql`${songs.id} = ANY(${songIds})`);

        allSongs.forEach(song => {
          expect(song.isLive).toBe(false);
        });

        // Verify no live track names made it through
        const songNames = allSongs.map(s => s.name.toLowerCase());
        const liveKeywords = ['live at', 'live from', '(live)', '[live]', 'acoustic version', 'unplugged'];
        
        songNames.forEach(name => {
          liveKeywords.forEach(keyword => {
            expect(name).not.toContain(keyword);
          });
        });
      }
    });

    it('should filter tracks with high liveness audio features', async () => {
      // Mock tracks with varying liveness scores
      const testTracks = [
        { id: 'studio1', name: 'Studio Track 1', liveness: 0.05 },
        { id: 'studio2', name: 'Studio Track 2', liveness: 0.3 },
        { id: 'borderline', name: 'Borderline Track', liveness: 0.79 }, // Just under threshold
        { id: 'live1', name: 'Live Track 1', liveness: 0.81 }, // Just over threshold
        { id: 'live2', name: 'Live Track 2', liveness: 0.95 }
      ];

      vi.mocked(require('../../lib/services/adapters/SpotifyClient').getAudioFeatures)
        .mockResolvedValue(testTracks.map(t => ({ id: t.id, liveness: t.liveness })));

      vi.mocked(require('../../lib/services/adapters/SpotifyClient').getTracksDetails)
        .mockResolvedValue(testTracks.map(t => ({
          id: t.id,
          name: t.name,
          external_ids: { isrc: `ISRC${t.id}` },
          popularity: 80,
          duration_ms: 200000,
          artists: [{ name: 'Test Artist' }],
          album: { name: 'Test Album' }
        })));

      const catalogIngest = new SpotifyCatalogIngest();
      const result = await catalogIngest.ingest({
        artistId: 'test-artist',
        spotifyId: 'test-spotify-id'
      });

      // Should filter out high liveness tracks
      expect(result.liveFeaturesFiltered).toBe(2); // live1, live2
      expect(result.studioTracksIngested).toBe(3); // studio1, studio2, borderline

      // Verify liveness threshold is exactly 0.8
      expect(result.liveFeaturesFiltered + result.studioTracksIngested).toBe(testTracks.length);
    });
  });

  describe('GROK.md Quality Bar 4: ISRC Deduplication', () => {
    it('should keep only one row per ISRC with highest popularity', async () => {
      const orchestrator = new ArtistImportOrchestrator();
      const identity = await orchestrator.initiateImport(mockComprehensiveData.artist.tmAttractionId);
      testArtistId = identity.artistId;

      await orchestrator.runFullImport(testArtistId);

      // Get all songs for this artist
      const artistSongRecords = await db
        .select({
          songId: artistSongs.songId,
          song: songs
        })
        .from(artistSongs)
        .innerJoin(songs, eq(artistSongs.songId, songs.id))
        .where(eq(artistSongs.artistId, testArtistId));

      // Group by ISRC
      const isrcGroups = new Map<string, any[]>();
      artistSongRecords.forEach(({ song }) => {
        if (song.isrc) {
          if (!isrcGroups.has(song.isrc)) {
            isrcGroups.set(song.isrc, []);
          }
          isrcGroups.get(song.isrc)!.push(song);
        }
      });

      // Verify each ISRC has only one song (highest popularity)
      for (const [isrc, songs] of isrcGroups) {
        expect(songs).toHaveLength(1);
        
        // For the duplicate ISRC in our test data, verify we kept the higher popularity version
        if (isrc === 'USUM72214401') { // Anti-Hero ISRC
          expect(songs[0].popularity).toBe(95); // Should keep track1 (pop 95) over track3 (pop 92)
          expect(songs[0].spotifyId).toBe('track1');
        }
      }

      // Verify overall deduplication worked
      const totalSongs = artistSongs.length;
      const uniqueISRCs = new Set(artistSongs.map(({ song }) => song.isrc).filter(Boolean));
      
      // All songs with ISRCs should have unique ISRCs
      const songsWithISRC = artistSongs.filter(({ song }) => song.isrc);
      expect(songsWithISRC.length).toBe(uniqueISRCs.size);
    });

    it('should handle fallback deduplication for tracks without ISRC', async () => {
      // Mock tracks without ISRC but with same title/duration
      const tracksWithoutISRC = [
        {
          id: 'noIsrc1',
          name: 'Unreleased Demo',
          external_ids: {}, // No ISRC
          popularity: 45,
          duration_ms: 180000,
          artists: [{ name: 'Test Artist' }],
          album: { name: 'Demos' }
        },
        {
          id: 'noIsrc2', 
          name: 'Unreleased Demo', // Same name
          external_ids: {}, // No ISRC
          popularity: 50, // Higher popularity
          duration_ms: 180000, // Same duration
          artists: [{ name: 'Test Artist' }],
          album: { name: 'Demos Remastered' }
        },
        {
          id: 'noIsrc3',
          name: 'Different Demo',
          external_ids: {},
          popularity: 40,
          duration_ms: 190000, // Different duration
          artists: [{ name: 'Test Artist' }],
          album: { name: 'Demos' }
        }
      ];

      vi.mocked(require('../../lib/services/adapters/SpotifyClient').getTracksDetails)
        .mockResolvedValue(tracksWithoutISRC);

      vi.mocked(require('../../lib/services/adapters/SpotifyClient').getAudioFeatures)
        .mockResolvedValue(tracksWithoutISRC.map(t => ({ id: t.id, liveness: 0.1 })));

      const catalogIngest = new SpotifyCatalogIngest();
      const result = await catalogIngest.ingest({
        artistId: 'test-artist',
        spotifyId: 'test-spotify-id'
      });

      // Should deduplicate by title+duration, keeping higher popularity
      expect(result.studioTracksIngested).toBe(2); // noIsrc2 (higher pop) + noIsrc3 (different)
      expect(result.duplicatesFiltered).toBe(1); // noIsrc1 filtered out
    });
  });

  describe('GROK.md Quality Bar 5: Progress SSE Timing', () => {
    it('should emit SSE events within 200ms of phase changes', async () => {
      const progressEvents: Array<{ stage: string; timestamp: number }> = [];
      
      // Monitor progress events
      ProgressBus.onGlobalProgress((event) => {
        progressEvents.push({
          stage: event.stage,
          timestamp: Date.now()
        });
      });

      const orchestrator = new ArtistImportOrchestrator();
      const identity = await orchestrator.initiateImport(mockComprehensiveData.artist.tmAttractionId);
      testArtistId = identity.artistId;

      await orchestrator.runFullImport(testArtistId);

      // Analyze timing between phase changes
      const phaseTransitions = [
        { from: 'initializing', to: 'importing-shows' },
        { from: 'importing-shows', to: 'importing-songs' },
        { from: 'importing-songs', to: 'completed' }
      ];

      for (const transition of phaseTransitions) {
        const fromEvents = progressEvents.filter(e => e.stage === transition.from);
        const toEvents = progressEvents.filter(e => e.stage === transition.to);

        if (fromEvents.length > 0 && toEvents.length > 0) {
          const lastFromEvent = fromEvents[fromEvents.length - 1];
          const firstToEvent = toEvents[0];
          const timeDiff = firstToEvent.timestamp - lastFromEvent.timestamp;

          // GROK.md: SSE events within 200ms of phase changes
          expect(timeDiff).toBeLessThan(200);
        }
      }
    });
  });

  // Helper functions
  async function getDatabaseCounts(artistId: string) {
    const [artistCount] = await db.select({ count: count() }).from(artists);
    const [venueCount] = await db.select({ count: count() }).from(venues);
    const [showCount] = await db.select({ count: count() }).from(shows).where(eq(shows.headlinerArtistId, artistId));
    const [songCount] = await db.select({ count: count() }).from(songs);
    const [artistSongCount] = await db.select({ count: count() }).from(artistSongs).where(eq(artistSongs.artistId, artistId));

    return {
      artists: artistCount.count,
      venues: venueCount.count,
      shows: showCount.count,
      songs: songCount.count,
      artistSongs: artistSongCount.count
    };
  }

  async function getArtistState(artistId: string) {
    const [artist] = await db
      .select()
      .from(artists)
      .where(eq(artists.id, artistId));
    
    return {
      ...artist,
      // Normalize timestamps for comparison
      createdAt: artist.createdAt?.getTime(),
      updatedAt: artist.updatedAt?.getTime(),
      lastSyncedAt: artist.lastSyncedAt?.getTime(),
      showsSyncedAt: artist.showsSyncedAt?.getTime(),
      songCatalogSyncedAt: artist.songCatalogSyncedAt?.getTime()
    };
  }

  async function getShowsState(artistId: string) {
    const showRecords = await db
      .select()
      .from(shows)
      .where(eq(shows.headlinerArtistId, artistId))
      .orderBy(shows.tmEventId);

    return showRecords.map(show => ({
      ...show,
      createdAt: show.createdAt?.getTime(),
      updatedAt: show.updatedAt?.getTime()
    }));
  }

  async function getSongsState(artistId: string) {
    const artistSongRecords = await db
      .select({
        artistSong: artistSongs,
        song: songs
      })
      .from(artistSongs)
      .innerJoin(songs, eq(artistSongs.songId, songs.id))
      .where(eq(artistSongs.artistId, artistId))
      .orderBy(songs.spotifyId);

    return artistSongRecords.map(({ artistSong, song }) => ({
      artistSong: {
        ...artistSong,
        createdAt: artistSong.createdAt?.getTime(),
        updatedAt: artistSong.updatedAt?.getTime()
      },
      song: {
        ...song,
        createdAt: song.createdAt?.getTime(),
        updatedAt: song.updatedAt?.getTime()
      }
    }));
  }
});