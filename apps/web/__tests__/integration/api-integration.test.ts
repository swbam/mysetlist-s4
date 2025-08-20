/**
 * Integration Tests for API Clients and Data Flow
 * Tests TM pagination, Spotify batching, venue FK mapping
 * Validates GROK.md integration requirements
 */

import { db } from "@repo/database";
import { artistSongs, artists, shows, songs, venues } from "@repo/database";
import { eq, inArray } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  getAccessToken,
  getAudioFeatures,
  getTracksDetails,
  listAlbumTracks,
  listAllAlbums,
} from "../../lib/services/adapters/SpotifyClient";
import { iterateEventsByAttraction } from "../../lib/services/adapters/TicketmasterClient";
import { SpotifyCatalogIngest } from "../../lib/services/ingest/SpotifyCatalogIngest";
// Import services
import { TicketmasterIngest } from "../../lib/services/ingest/TicketmasterIngest";

// Mock external API responses
const mockTicketmasterEvents = [
  {
    id: "event1",
    name: "Artist Concert - New York",
    dates: {
      start: {
        localDate: "2024-06-15",
        localTime: "20:00:00",
        dateTime: "2024-06-16T00:00:00Z",
      },
    },
    _embedded: {
      venues: [
        {
          id: "venue1",
          name: "Madison Square Garden",
          city: { name: "New York" },
          state: { name: "New York", stateCode: "NY" },
          country: { name: "United States", countryCode: "US" },
          address: { line1: "4 Pennsylvania Plaza" },
          postalCode: "10001",
          location: { latitude: "40.750504", longitude: "-73.993439" },
          timezone: "America/New_York",
        },
      ],
    },
    url: "https://www.ticketmaster.com/event1",
    priceRanges: [{ min: 50.0, max: 200.0, currency: "USD" }],
  },
  {
    id: "event2",
    name: "Artist Concert - Los Angeles",
    dates: {
      start: {
        localDate: "2024-06-20",
        localTime: "19:30:00",
        dateTime: "2024-06-21T02:30:00Z",
      },
    },
    _embedded: {
      venues: [
        {
          id: "venue2",
          name: "The Forum",
          city: { name: "Inglewood" },
          state: { name: "California", stateCode: "CA" },
          country: { name: "United States", countryCode: "US" },
          address: { line1: "3900 W Manchester Blvd" },
          postalCode: "90305",
          location: { latitude: "33.958302", longitude: "-118.341751" },
          timezone: "America/Los_Angeles",
        },
      ],
    },
    url: "https://www.ticketmaster.com/event2",
    priceRanges: [{ min: 75.0, max: 250.0, currency: "USD" }],
  },
];

const mockSpotifyAlbums = [
  {
    id: "album1",
    name: "1989 (Taylor's Version)",
    album_type: "album",
    total_tracks: 13,
    release_date: "2023-10-27",
    images: [
      { url: "https://i.scdn.co/image/album1.jpg", height: 640, width: 640 },
    ],
  },
  {
    id: "album2",
    name: "folklore",
    album_type: "album",
    total_tracks: 16,
    release_date: "2020-07-24",
    images: [
      { url: "https://i.scdn.co/image/album2.jpg", height: 640, width: 640 },
    ],
  },
];

const mockSpotifyTracks = {
  album1: [
    {
      id: "track1",
      name: "Shake It Off (Taylor's Version)",
      track_number: 6,
      disc_number: 1,
      duration_ms: 219200,
      popularity: 95,
      external_ids: { isrc: "USUM72312345" },
      artists: [{ id: "artist1", name: "Taylor Swift" }],
      uri: "spotify:track:track1",
      external_urls: { spotify: "https://open.spotify.com/track/track1" },
      preview_url: "https://p.scdn.co/mp3-preview/track1",
      explicit: false,
      is_local: false,
    },
    {
      id: "track2",
      name: "Blank Space (Taylor's Version)",
      track_number: 7,
      disc_number: 1,
      duration_ms: 231867,
      popularity: 92,
      external_ids: { isrc: "USUM72312346" },
      artists: [{ id: "artist1", name: "Taylor Swift" }],
      uri: "spotify:track:track2",
      external_urls: { spotify: "https://open.spotify.com/track/track2" },
      preview_url: "https://p.scdn.co/mp3-preview/track2",
      explicit: false,
      is_local: false,
    },
  ],
  album2: [
    {
      id: "track3",
      name: "cardigan",
      track_number: 1,
      disc_number: 1,
      duration_ms: 239560,
      popularity: 88,
      external_ids: { isrc: "USUM72012347" },
      artists: [{ id: "artist1", name: "Taylor Swift" }],
      uri: "spotify:track:track3",
      external_urls: { spotify: "https://open.spotify.com/track/track3" },
      preview_url: "https://p.scdn.co/mp3-preview/track3",
      explicit: false,
      is_local: false,
    },
  ],
};

const mockAudioFeatures = [
  { id: "track1", liveness: 0.1, energy: 0.8, danceability: 0.7, valence: 0.9 },
  {
    id: "track2",
    liveness: 0.15,
    energy: 0.75,
    danceability: 0.65,
    valence: 0.85,
  },
  {
    id: "track3",
    liveness: 0.05,
    energy: 0.3,
    danceability: 0.4,
    valence: 0.2,
  },
];

describe("API Integration Tests", () => {
  let testArtistId: string;

  beforeEach(async () => {
    // Create test artist
    const [artist] = await db
      .insert(artists)
      .values({
        name: "Test Artist",
        slug: "test-artist",
        spotifyId: "spotify-artist-1",
        tmAttractionId: "tm-attraction-1",
        genres: JSON.stringify(["pop"]),
        popularity: 85,
        followers: 1000000,
        imageUrl: "https://example.com/artist.jpg",
        verified: true,
        lastSyncedAt: new Date(),
      } as any)
      .returning({ id: artists.id });

    testArtistId = artist.id;
  });

  afterEach(async () => {
    // Clean up test data
    if (testArtistId) {
      await db
        .delete(artistSongs)
        .where(eq(artistSongs.artistId, testArtistId));
      await db.delete(shows).where(eq(shows.headlinerArtistId, testArtistId));
      await db.delete(artists).where(eq(artists.id, testArtistId));
    }
  });

  describe("Ticketmaster Integration", () => {
    beforeEach(() => {
      // Mock Ticketmaster API client
      vi.mock("../../lib/services/adapters/TicketmasterClient", () => ({
        iterateEventsByAttraction: vi
          .fn()
          .mockImplementation(async function* () {
            // Simulate paginated response
            yield mockTicketmasterEvents.slice(0, 1); // Page 1
            yield mockTicketmasterEvents.slice(1, 2); // Page 2
          }),
      }));
    });

    it("should handle paginated event fetching correctly", async () => {
      const allEvents: any[] = [];

      // Test the pagination iterator
      for await (const eventBatch of iterateEventsByAttraction(
        "tm-attraction-1",
      )) {
        allEvents.push(...eventBatch);
      }

      expect(allEvents).toHaveLength(2);
      expect(allEvents[0].id).toBe("event1");
      expect(allEvents[1].id).toBe("event2");
    });

    it("should properly map venue foreign keys", async () => {
      const ingest = new TicketmasterIngest();

      const result = await ingest.ingest({
        artistId: testArtistId,
        tmAttractionId: "tm-attraction-1",
        concurrency: 2,
      });

      expect(result.newVenues).toBe(2);
      expect(result.newShows).toBe(2);
      expect(result.errors).toHaveLength(0);

      // Verify venues were created
      const dbVenues = await db.select().from(venues);
      expect(dbVenues).toHaveLength(2);

      const msgVenue = dbVenues.find((v) => v.tmVenueId === "venue1");
      const forumVenue = dbVenues.find((v) => v.tmVenueId === "venue2");

      expect(msgVenue?.name).toBe("Madison Square Garden");
      expect(forumVenue?.name).toBe("The Forum");

      // Verify shows reference correct venue IDs
      const dbShows = await db
        .select()
        .from(shows)
        .where(eq(shows.headlinerArtistId, testArtistId));

      expect(dbShows).toHaveLength(2);

      const nyShow = dbShows.find((s) => s.tmEventId === "event1");
      const laShow = dbShows.find((s) => s.tmEventId === "event2");

      expect(nyShow?.venueId).toBe(msgVenue?.id);
      expect(laShow?.venueId).toBe(forumVenue?.id);
    });

    it("should handle venue-show FK relationship correctly on re-runs", async () => {
      const ingest = new TicketmasterIngest();

      // First run
      await ingest.ingest({
        artistId: testArtistId,
        tmAttractionId: "tm-attraction-1",
        concurrency: 2,
      });

      // Second run (should be idempotent)
      const result2 = await ingest.ingest({
        artistId: testArtistId,
        tmAttractionId: "tm-attraction-1",
        concurrency: 2,
      });

      expect(result2.newVenues).toBe(0); // No new venues
      expect(result2.newShows).toBe(0); // No new shows

      // Verify FK relationships are still intact
      const dbShows = await db
        .select()
        .from(shows)
        .where(eq(shows.headlinerArtistId, testArtistId));

      expect(dbShows).toHaveLength(2);
      dbShows.forEach((show) => {
        expect(show.venueId).toBeTruthy();
        expect(show.venueId).toMatch(/^[a-f0-9-]{36}$/); // Valid UUID
      });
    });

    it("should extract complete show data including pricing", async () => {
      const ingest = new TicketmasterIngest();

      await ingest.ingest({
        artistId: testArtistId,
        tmAttractionId: "tm-attraction-1",
      });

      const dbShows = await db
        .select()
        .from(shows)
        .where(eq(shows.headlinerArtistId, testArtistId));

      const nyShow = dbShows.find((s) => s.tmEventId === "event1");
      const laShow = dbShows.find((s) => s.tmEventId === "event2");

      // Verify show details
      expect(nyShow).toMatchObject({
        name: "Artist Concert - New York",
        date: "2024-06-15",
        startTime: "20:00:00",
        minPrice: 5000, // $50.00 in cents
        maxPrice: 20000, // $200.00 in cents
        currency: "USD",
        ticketUrl: "https://www.ticketmaster.com/event1",
      });

      expect(laShow).toMatchObject({
        name: "Artist Concert - Los Angeles",
        date: "2024-06-20",
        startTime: "19:30:00",
        minPrice: 7500, // $75.00 in cents
        maxPrice: 25000, // $250.00 in cents
        currency: "USD",
        ticketUrl: "https://www.ticketmaster.com/event2",
      });
    });
  });

  describe("Spotify Integration", () => {
    beforeEach(() => {
      // Mock Spotify API client
      vi.mock("../../lib/services/adapters/SpotifyClient", () => ({
        getAccessToken: vi.fn().mockResolvedValue("mock-token"),
        listAllAlbums: vi.fn().mockResolvedValue(mockSpotifyAlbums),
        listAlbumTracks: vi.fn().mockImplementation(async (albumId: string) => {
          return (
            mockSpotifyTracks[albumId as keyof typeof mockSpotifyTracks] || []
          );
        }),
        getTracksDetails: vi
          .fn()
          .mockImplementation(async (trackIds: string[]) => {
            const allTracks = Object.values(mockSpotifyTracks).flat();
            return allTracks.filter((track) => trackIds.includes(track.id));
          }),
        getAudioFeatures: vi
          .fn()
          .mockImplementation(async (trackIds: string[]) => {
            return mockAudioFeatures.filter((feature) =>
              trackIds.includes(feature.id),
            );
          }),
      }));
    });

    it("should handle album batching correctly", async () => {
      const ingest = new SpotifyCatalogIngest();

      const result = await ingest.ingest({
        artistId: testArtistId,
        spotifyId: "spotify-artist-1",
        concurrency: 2,
      });

      expect(result.albumsProcessed).toBe(2);
      expect(result.tracksProcessed).toBe(3);
      expect(result.studioTracksIngested).toBe(3);
      expect(result.errors).toHaveLength(0);

      // Verify tracks were inserted
      const dbSongs = await db
        .select()
        .from(songs)
        .where(inArray(songs.spotifyId, ["track1", "track2", "track3"]));

      expect(dbSongs).toHaveLength(3);

      // Verify artist-song relationships
      const dbArtistSongs = await db
        .select()
        .from(artistSongs)
        .where(eq(artistSongs.artistId, testArtistId));

      expect(dbArtistSongs).toHaveLength(3);
    });

    it("should handle Spotify batch size limits", async () => {
      // Mock large track list to test batching
      const largeMockTracks = Array.from({ length: 125 }, (_, i) => ({
        id: `track${i}`,
        name: `Track ${i}`,
        track_number: i + 1,
        disc_number: 1,
        duration_ms: 200000,
        popularity: 50,
        external_ids: { isrc: `ISRC${i}` },
        artists: [{ id: "artist1", name: "Test Artist" }],
        uri: `spotify:track:track${i}`,
        external_urls: { spotify: `https://open.spotify.com/track/track${i}` },
        preview_url: null,
        explicit: false,
        is_local: false,
      }));

      const largeMockFeatures = largeMockTracks.map((track) => ({
        id: track.id,
        liveness: 0.1,
        energy: 0.5,
        danceability: 0.5,
        valence: 0.5,
      }));

      // Mock single large album
      vi.mocked(listAllAlbums).mockResolvedValue([
        {
          id: "large-album",
          name: "Large Album",
          album_type: "album",
          total_tracks: 125,
          release_date: "2023-01-01",
        },
      ]);

      vi.mocked(listAlbumTracks).mockResolvedValue(largeMockTracks);
      vi.mocked(getTracksDetails).mockImplementation(
        async (trackIds: string[]) => {
          // Verify batch size limits are respected
          expect(trackIds.length).toBeLessThanOrEqual(50);
          return largeMockTracks.filter((track) => trackIds.includes(track.id));
        },
      );
      vi.mocked(getAudioFeatures).mockImplementation(
        async (trackIds: string[]) => {
          // Verify batch size limits are respected
          expect(trackIds.length).toBeLessThanOrEqual(100);
          return largeMockFeatures.filter((feature) =>
            trackIds.includes(feature.id),
          );
        },
      );

      const ingest = new SpotifyCatalogIngest();

      const result = await ingest.ingest({
        artistId: testArtistId,
        spotifyId: "spotify-artist-1",
        concurrency: 2,
      });

      // Should process all tracks despite batching
      expect(result.tracksProcessed).toBe(125);
      expect(result.studioTracksIngested).toBe(125);

      // Verify API was called with proper batch sizes
      expect(vi.mocked(getTracksDetails)).toHaveBeenCalledTimes(3); // 125 tracks / 50 per batch = 3 calls
      expect(vi.mocked(getAudioFeatures)).toHaveBeenCalledTimes(2); // 125 tracks / 100 per batch = 2 calls
    });

    it("should properly filter and deduplicate tracks", async () => {
      // Mock tracks with duplicates and live tracks
      const duplicateAndLiveTracks = [
        {
          id: "track1",
          name: "Studio Track",
          external_ids: { isrc: "ISRC001" },
          popularity: 80,
          // other fields...
        },
        {
          id: "track2",
          name: "Studio Track (Remaster)",
          external_ids: { isrc: "ISRC001" }, // Same ISRC
          popularity: 90, // Higher popularity
          // other fields...
        },
        {
          id: "track3",
          name: "Live Track (Live at Venue)",
          external_ids: { isrc: "ISRC002" },
          popularity: 85,
          // other fields...
        },
      ];

      const mockFeaturesWithLive = [
        { id: "track1", liveness: 0.1, energy: 0.8 }, // Studio
        { id: "track2", liveness: 0.15, energy: 0.75 }, // Studio (higher popularity)
        { id: "track3", liveness: 0.95, energy: 0.9 }, // Live (high liveness)
      ];

      vi.mocked(listAlbumTracks).mockResolvedValue(duplicateAndLiveTracks);
      vi.mocked(getTracksDetails).mockResolvedValue(duplicateAndLiveTracks);
      vi.mocked(getAudioFeatures).mockResolvedValue(mockFeaturesWithLive);

      const ingest = new SpotifyCatalogIngest();

      const result = await ingest.ingest({
        artistId: testArtistId,
        spotifyId: "spotify-artist-1",
      });

      // Should ingest only 1 track (track2 - higher popularity, studio)
      expect(result.tracksProcessed).toBe(3);
      expect(result.studioTracksIngested).toBe(1);
      expect(result.duplicatesFiltered).toBe(1); // track1 filtered due to lower popularity
      expect(result.liveFeaturesFiltered).toBe(1); // track3 filtered due to high liveness
      expect(result.liveNameFiltered).toBe(1); // track3 also filtered by name

      // Verify only the correct track was inserted
      const dbSongs = await db
        .select()
        .from(songs)
        .where(eq(songs.spotifyId, "track2"));

      expect(dbSongs).toHaveLength(1);
    });
  });

  describe("Error Handling and Recovery", () => {
    it("should handle partial API failures gracefully", async () => {
      // Mock intermittent failures
      let callCount = 0;
      vi.mocked(listAlbumTracks).mockImplementation(async (albumId: string) => {
        callCount++;
        if (callCount === 1) {
          throw new Error("API temporarily unavailable");
        }
        return (
          mockSpotifyTracks[albumId as keyof typeof mockSpotifyTracks] || []
        );
      });

      const ingest = new SpotifyCatalogIngest();

      const result = await ingest.ingest({
        artistId: testArtistId,
        spotifyId: "spotify-artist-1",
        concurrency: 1, // Sequential processing to ensure predictable failure
      });

      // Should have errors but still process some albums
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.albumsProcessed).toBeGreaterThan(0);

      // Should contain error details
      const apiError = result.errors.find(
        (e) => e.type === "album_tracks_fetch",
      );
      expect(apiError).toBeTruthy();
      expect(apiError?.message).toContain("API temporarily unavailable");
    });

    it("should maintain data consistency during failures", async () => {
      // Create initial venue
      const [venue] = await db
        .insert(venues)
        .values({
          tmVenueId: "venue1",
          name: "Test Venue",
          slug: "test-venue",
          city: "Test City",
          state: "Test State",
          country: "US",
          address: "123 Test St",
          postalCode: "12345",
          timezone: "America/New_York",
        })
        .returning({ id: venues.id });

      // Mock failure during show processing
      vi.mocked(iterateEventsByAttraction).mockImplementation(
        async function* () {
          yield [mockTicketmasterEvents[0]]; // First event succeeds
          throw new Error("Network timeout"); // Failure on second batch
        },
      );

      const ingest = new TicketmasterIngest();

      await expect(
        ingest.ingest({
          artistId: testArtistId,
          tmAttractionId: "tm-attraction-1",
        }),
      ).rejects.toThrow("Network timeout");

      // Verify partial data was still saved consistently
      const dbShows = await db
        .select()
        .from(shows)
        .where(eq(shows.headlinerArtistId, testArtistId));

      const dbVenues = await db.select().from(venues);

      // Should have the original venue plus any successfully created ones
      expect(dbVenues.length).toBeGreaterThanOrEqual(1);

      // Shows that were created should have valid venue references
      dbShows.forEach((show) => {
        expect(show.venueId).toBeTruthy();
        expect(dbVenues.some((v) => v.id === show.venueId)).toBe(true);
      });
    });

    it("should handle concurrent access to same resources", async () => {
      const ingest1 = new TicketmasterIngest();
      const ingest2 = new TicketmasterIngest();

      // Run two ingests simultaneously
      const [result1, result2] = await Promise.allSettled([
        ingest1.ingest({
          artistId: testArtistId,
          tmAttractionId: "tm-attraction-1",
        }),
        ingest2.ingest({
          artistId: testArtistId,
          tmAttractionId: "tm-attraction-1",
        }),
      ]);

      // At least one should succeed
      const successful = [result1, result2].filter(
        (r) => r.status === "fulfilled",
      );
      expect(successful.length).toBeGreaterThanOrEqual(1);

      // Verify no duplicate venues or shows were created
      const dbVenues = await db.select().from(venues);
      const dbShows = await db
        .select()
        .from(shows)
        .where(eq(shows.headlinerArtistId, testArtistId));

      // Should have exactly the expected number (not duplicated)
      expect(dbVenues).toHaveLength(2);
      expect(dbShows).toHaveLength(2);

      // Verify unique constraints are maintained
      const tmVenueIds = dbVenues.map((v) => v.tmVenueId).filter(Boolean);
      const tmEventIds = dbShows.map((s) => s.tmEventId).filter(Boolean);

      expect(new Set(tmVenueIds).size).toBe(tmVenueIds.length); // No duplicates
      expect(new Set(tmEventIds).size).toBe(tmEventIds.length); // No duplicates
    });
  });
});
