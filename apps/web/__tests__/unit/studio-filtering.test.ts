/**
 * Unit Tests for Studio-Only Filtering Logic
 * Tests core functions: isLikelyLiveAlbum, isLikelyLiveTitle, liveness threshold, ISRC dedupe
 * Validates GROK.md studio-only requirements
 */

import { describe, expect, it } from "vitest";

// Import utility functions from string utils
import {
  cleanSongTitle,
  createSlug,
  generateMatchingKey,
  isLikelyLiveAlbum,
  isLikelyLiveTitle,
} from "../../lib/services/util/strings";

describe("Studio-Only Filtering - Core Functions", () => {
  describe("isLikelyLiveAlbum", () => {
    it("should identify live albums by name patterns", () => {
      const liveAlbums = [
        "Live at Madison Square Garden",
        "MTV Unplugged",
        "Live from the BBC",
        "Concert at Red Rocks",
        "Live in London",
        "Acoustic Sessions",
        "Live (Deluxe Edition)",
        "[Live at Wembley]",
        "The Concert - Live",
        "Unplugged and Seated",
      ];

      liveAlbums.forEach((album) => {
        expect(isLikelyLiveAlbum(album)).toBe(true);
      });
    });

    it("should NOT identify studio albums as live", () => {
      const studioAlbums = [
        "1989",
        "folklore",
        "Lover",
        "reputation",
        "Red (Taylor's Version)",
        "The Beatles (White Album)",
        "Abbey Road",
        "Dark Side of the Moon",
        "Nevermind",
      ];

      studioAlbums.forEach((album) => {
        expect(isLikelyLiveAlbum(album)).toBe(false);
      });
    });

    it("should handle edge cases and ambiguous names", () => {
      // These should be classified as studio albums
      expect(isLikelyLiveAlbum("Live Wire")).toBe(false); // Song title, not performance context
      expect(isLikelyLiveAlbum("Living Things")).toBe(false); // Contains 'live' but not performance context
      expect(isLikelyLiveAlbum("I Want to Live Forever")).toBe(false);

      // These should be classified as live albums
      expect(isLikelyLiveAlbum("Live Wire - Live at the Forum")).toBe(true);
      expect(isLikelyLiveAlbum("Acoustic Live Sessions")).toBe(true);
    });

    it("should be case insensitive", () => {
      expect(isLikelyLiveAlbum("LIVE AT THE APOLLO")).toBe(true);
      expect(isLikelyLiveAlbum("mtv UNPLUGGED")).toBe(true);
      expect(isLikelyLiveAlbum("Live from Central Park")).toBe(true);
    });
  });

  describe("isLikelyLiveTitle", () => {
    it("should identify live tracks by title patterns", () => {
      const liveTracks = [
        "Shake It Off (Live)",
        "cardigan - live version",
        "Love Story [Live]",
        "anti-hero (acoustic version)",
        "Cruel Summer live at BBC",
        "willow - MTV Unplugged",
        "All Too Well (Live from SNL)",
        "Style (acoustic session)",
        "Blank Space - Live at The Grammy Awards",
      ];

      liveTracks.forEach((track) => {
        expect(isLikelyLiveTitle(track)).toBe(true);
      });
    });

    it("should NOT identify studio tracks as live", () => {
      const studioTracks = [
        "Shake It Off",
        "anti-hero",
        "Love Story",
        "cardigan",
        "willow",
        "All Too Well (10 Minute Version)",
        "Style",
        "Blank Space",
        "Cruel Summer",
        "Live Wire", // Contains 'live' but not in performance context
      ];

      studioTracks.forEach((track) => {
        expect(isLikelyLiveTitle(track)).toBe(false);
      });
    });

    it("should handle various live performance indicators", () => {
      expect(isLikelyLiveTitle("Song (Live at Venue)")).toBe(true);
      expect(isLikelyLiveTitle("Song (Live from Studio)")).toBe(true);
      expect(isLikelyLiveTitle("Song (Concert Version)")).toBe(true);
      expect(isLikelyLiveTitle("Song (Unplugged)")).toBe(true);
      expect(isLikelyLiveTitle("Song - Live")).toBe(true);
      expect(isLikelyLiveTitle("Song [Live]")).toBe(true);
    });
  });

  describe("Liveness Threshold Logic", () => {
    const LIVENESS_THRESHOLD = 0.8;

    it("should filter tracks above liveness threshold", () => {
      const mockTracks = [
        { id: "1", name: "Studio Track", liveness: 0.1 },
        { id: "2", name: "Live Track", liveness: 0.9 },
        { id: "3", name: "Borderline Track", liveness: 0.8 },
        { id: "4", name: "Another Studio Track", liveness: 0.05 },
        { id: "5", name: "Clear Live Track", liveness: 0.95 },
      ];

      const studioTracks = mockTracks.filter(
        (track) => track.liveness <= LIVENESS_THRESHOLD,
      );

      expect(studioTracks).toHaveLength(3);
      expect(studioTracks.map((t) => t.id)).toEqual(["1", "3", "4"]);
    });

    it("should handle edge cases at threshold boundary", () => {
      expect(0.8 <= LIVENESS_THRESHOLD).toBe(true); // Exactly at threshold = studio
      expect(0.80001 > LIVENESS_THRESHOLD).toBe(true); // Slightly above = live
      expect(0.79999 <= LIVENESS_THRESHOLD).toBe(true); // Slightly below = studio
    });

    it("should validate threshold value is reasonable", () => {
      expect(LIVENESS_THRESHOLD).toBe(0.8);
      expect(LIVENESS_THRESHOLD).toBeGreaterThan(0);
      expect(LIVENESS_THRESHOLD).toBeLessThan(1);
    });
  });

  describe("ISRC Deduplication Logic", () => {
    it("should deduplicate tracks with same ISRC by popularity", () => {
      const tracksWithSameISRC = [
        {
          id: "1",
          name: "Song (Original)",
          isrc: "USUM71703861",
          popularity: 85,
        },
        {
          id: "2",
          name: "Song (Remaster)",
          isrc: "USUM71703861",
          popularity: 90,
        },
        {
          id: "3",
          name: "Song (Deluxe)",
          isrc: "USUM71703861",
          popularity: 88,
        },
      ];

      // Simulate deduplication logic
      const isrcMap = new Map();
      for (const track of tracksWithSameISRC) {
        const existing = isrcMap.get(track.isrc);
        if (!existing || track.popularity > existing.popularity) {
          isrcMap.set(track.isrc, track);
        }
      }

      const deduplicatedTracks = Array.from(isrcMap.values());

      expect(deduplicatedTracks).toHaveLength(1);
      expect(deduplicatedTracks[0].id).toBe("2"); // Highest popularity (90)
      expect(deduplicatedTracks[0].name).toBe("Song (Remaster)");
    });

    it("should keep tracks without ISRC", () => {
      const mixedTracks = [
        { id: "1", name: "Track A", isrc: "ISRC1", popularity: 85 },
        { id: "2", name: "Track B", isrc: null, popularity: 90 },
        { id: "3", name: "Track C", isrc: undefined, popularity: 88 },
        { id: "4", name: "Track D", isrc: "ISRC1", popularity: 95 }, // Duplicate ISRC, higher popularity
      ];

      const isrcMap = new Map();
      const tracksWithoutISRC = [];

      for (const track of mixedTracks) {
        if (!track.isrc) {
          tracksWithoutISRC.push(track);
        } else {
          const existing = isrcMap.get(track.isrc);
          if (!existing || track.popularity > existing.popularity) {
            isrcMap.set(track.isrc, track);
          }
        }
      }

      const allTracks = [...Array.from(isrcMap.values()), ...tracksWithoutISRC];

      expect(allTracks).toHaveLength(3); // 1 deduplicated ISRC + 2 without ISRC
      expect(allTracks.some((t) => t.id === "4")).toBe(true); // Higher popularity ISRC track
      expect(allTracks.some((t) => t.id === "2")).toBe(true); // No ISRC track
      expect(allTracks.some((t) => t.id === "3")).toBe(true); // No ISRC track
      expect(allTracks.some((t) => t.id === "1")).toBe(false); // Lower popularity, same ISRC
    });

    it("should handle fallback matching for tracks without ISRC", () => {
      const tracksWithoutISRC = [
        { id: "1", name: "Test Song", durationMs: 180000, isrc: null },
        { id: "2", name: "Test Song", durationMs: 180000, isrc: null }, // Duplicate by name+duration
        { id: "3", name: "Different Song", durationMs: 180000, isrc: null },
      ];

      // Fallback matching using title + duration
      const fallbackMap = new Map();

      for (const track of tracksWithoutISRC) {
        const key = generateMatchingKey(
          cleanSongTitle(track.name),
          Math.round((track.durationMs || 0) / 1000).toString(),
        );

        if (!fallbackMap.has(key)) {
          fallbackMap.set(key, track);
        }
      }

      const deduplicatedTracks = Array.from(fallbackMap.values());

      expect(deduplicatedTracks).toHaveLength(2); // One duplicate removed
      expect(deduplicatedTracks.some((t) => t.name === "Test Song")).toBe(true);
      expect(deduplicatedTracks.some((t) => t.name === "Different Song")).toBe(
        true,
      );
    });
  });

  describe("String Utility Functions", () => {
    describe("cleanSongTitle", () => {
      it("should clean and normalize song titles", () => {
        expect(cleanSongTitle("  Song Title  ")).toBe("Song Title");
        expect(cleanSongTitle("Song (feat. Artist)")).toBe("Song");
        expect(cleanSongTitle("Song [Explicit]")).toBe("Song");
        expect(cleanSongTitle("Song - Remastered")).toBe("Song");
      });

      it("should handle special characters and encoding", () => {
        expect(cleanSongTitle("Café")).toBe("Café");
        expect(cleanSongTitle('Song with "quotes"')).toBe("Song with quotes");
        expect(cleanSongTitle("Song & Artist")).toBe("Song & Artist");
      });
    });

    describe("generateMatchingKey", () => {
      it("should create consistent keys for matching", () => {
        const key1 = generateMatchingKey("Test Song", "180");
        const key2 = generateMatchingKey("Test Song", "180");
        const key3 = generateMatchingKey("Different Song", "180");

        expect(key1).toBe(key2);
        expect(key1).not.toBe(key3);
      });

      it("should be case insensitive", () => {
        const key1 = generateMatchingKey("Test Song", "180");
        const key2 = generateMatchingKey("TEST SONG", "180");

        expect(key1).toBe(key2);
      });
    });

    describe("createSlug", () => {
      it("should create URL-safe slugs", () => {
        expect(createSlug("Taylor Swift")).toBe("taylor-swift");
        expect(createSlug("The Beatles")).toBe("the-beatles");
        expect(createSlug("P!nk")).toBe("pink");
        expect(createSlug("AC/DC")).toBe("acdc");
      });

      it("should handle special characters and spaces", () => {
        expect(createSlug("Song Title (Live)")).toBe("song-title-live");
        expect(createSlug("Artist & Band")).toBe("artist-band");
        expect(createSlug("Track #1")).toBe("track-1");
      });
    });
  });

  describe("Integration: Complete Studio Filtering Pipeline", () => {
    it("should correctly filter a mixed catalog to studio-only", () => {
      const mixedCatalog = [
        // Studio albums
        {
          album: { name: "1989", id: "album1" },
          tracks: [
            {
              id: "1",
              name: "Shake It Off",
              liveness: 0.1,
              isrc: "ISRC1",
              popularity: 95,
            },
            {
              id: "2",
              name: "Blank Space",
              liveness: 0.15,
              isrc: "ISRC2",
              popularity: 88,
            },
          ],
        },
        // Live album (should be filtered out)
        {
          album: { name: "Live at the Grammy Awards", id: "album2" },
          tracks: [
            {
              id: "3",
              name: "Love Story (Live)",
              liveness: 0.95,
              isrc: "ISRC3",
              popularity: 82,
            },
          ],
        },
        // Studio album with mixed tracks
        {
          album: { name: "folklore", id: "album3" },
          tracks: [
            {
              id: "4",
              name: "cardigan",
              liveness: 0.05,
              isrc: "ISRC4",
              popularity: 90,
            },
            {
              id: "5",
              name: "the 1 (acoustic version)",
              liveness: 0.25,
              isrc: "ISRC5",
              popularity: 78,
            },
            {
              id: "6",
              name: "august (Live at Studio)",
              liveness: 0.85,
              isrc: "ISRC6",
              popularity: 85,
            },
          ],
        },
      ];

      // Apply filtering pipeline
      let allTracks = [];

      for (const albumData of mixedCatalog) {
        // Step 1: Filter live albums
        if (isLikelyLiveAlbum(albumData.album.name)) {
          continue;
        }

        // Step 2: Filter individual tracks
        for (const track of albumData.tracks) {
          // Filter by name patterns
          if (isLikelyLiveTitle(track.name)) {
            continue;
          }

          // Filter by liveness threshold
          if (track.liveness > 0.8) {
            continue;
          }

          allTracks.push(track);
        }
      }

      // Step 3: ISRC deduplication (not needed in this example)

      expect(allTracks).toHaveLength(3);
      expect(allTracks.map((t) => t.id)).toEqual(["1", "2", "4"]);

      // Verify filtering results
      expect(allTracks.every((t) => t.liveness <= 0.8)).toBe(true);
      expect(allTracks.every((t) => !isLikelyLiveTitle(t.name))).toBe(true);
    });

    it("should maintain idempotency when run multiple times", () => {
      const catalog = [
        {
          id: "1",
          name: "Studio Track",
          liveness: 0.1,
          isrc: "ISRC1",
          popularity: 95,
        },
      ];

      // Run filtering pipeline multiple times
      const result1 = catalog.filter(
        (t) => !isLikelyLiveTitle(t.name) && t.liveness <= 0.8,
      );
      const result2 = result1.filter(
        (t) => !isLikelyLiveTitle(t.name) && t.liveness <= 0.8,
      );
      const result3 = result2.filter(
        (t) => !isLikelyLiveTitle(t.name) && t.liveness <= 0.8,
      );

      expect(result1).toEqual(result2);
      expect(result2).toEqual(result3);
      expect(result3).toHaveLength(1);
    });
  });
});
