import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { GET as artistsSearchHandler } from "./app/api/artists/search/route";
import { GET as generalSearchHandler } from "./app/api/search/route";
import { GET as suggestionsHandler } from "./app/api/search/suggestions/route";
import {
  testApiRoute,
  mockAPIFetch,
  cleanupApiMocks,
  mockSearchResponse,
} from "./test-utils/api";

/**
 * Tests to verify search functionality consistency across MySetlist components
 * Ensures all artist search components use Ticketmaster API consistently
 */

describe("Search API Consistency Tests", () => {
  beforeEach(() => {
    // Mock Ticketmaster API responses
    mockAPIFetch({
      "app.ticketmaster.com": {
        status: 200,
        data: {
          _embedded: {
            attractions: [
              {
                id: "K8vZ917G1V7",
                name: "Taylor Swift",
                images: [{ url: "https://example.com/taylor-swift.jpg" }],
                classifications: [
                  {
                    genre: { name: "Pop" },
                    segment: { name: "Music" },
                  },
                ],
              },
              {
                id: "K8vZ917G1V8",
                name: "Coldplay",
                images: [{ url: "https://example.com/coldplay.jpg" }],
                classifications: [
                  {
                    genre: { name: "Rock" },
                    segment: { name: "Music" },
                  },
                ],
              },
            ],
          },
        },
      },
    });

    // Set environment variable for tests
    process.env.TICKETMASTER_API_KEY = "test-api-key";
  });

  afterEach(() => {
    cleanupApiMocks();
    delete process.env.TICKETMASTER_API_KEY;
  });

  describe("/api/artists/search", () => {
    it("should return artists from Ticketmaster API", async () => {
      const response = await testApiRoute(
        artistsSearchHandler,
        "/api/artists/search",
        {
          searchParams: { q: "Taylor Swift", limit: "8" },
        },
      );

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toHaveProperty("artists");
      expect(Array.isArray(data.artists)).toBe(true);
      expect(data.artists.length).toBeGreaterThan(0);

      // Verify data structure
      const firstArtist = data.artists[0];
      expect(firstArtist).toHaveProperty("id");
      expect(firstArtist).toHaveProperty("name");
      expect(firstArtist).toHaveProperty("source", "ticketmaster");
      expect(firstArtist).toHaveProperty("externalId");
    });

    it("should handle empty queries", async () => {
      const response = await testApiRoute(
        artistsSearchHandler,
        "/api/artists/search",
        {
          searchParams: { q: "", limit: "8" },
        },
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.artists).toEqual([]);
    });

    it("should handle missing Ticketmaster API key", async () => {
      delete process.env.TICKETMASTER_API_KEY;

      const response = await testApiRoute(
        artistsSearchHandler,
        "/api/artists/search",
        {
          searchParams: { q: "Taylor Swift" },
        },
      );

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe("Ticketmaster API key not configured");
    });
  });

  describe("/api/search", () => {
    it("should return consistent artist data format", async () => {
      const response = await testApiRoute(generalSearchHandler, "/api/search", {
        searchParams: { q: "Coldplay", limit: "8" },
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toHaveProperty("results");
      expect(Array.isArray(data.results)).toBe(true);
      expect(data.results.length).toBeGreaterThan(0);

      // Verify SearchResult interface compliance
      const firstResult = data.results[0];
      expect(firstResult).toHaveProperty("id");
      expect(firstResult).toHaveProperty("type", "artist");
      expect(firstResult).toHaveProperty("title");
      expect(firstResult).toHaveProperty("source", "ticketmaster");
      expect(firstResult).toHaveProperty("requiresSync", true);
      
      // Optional fields should be defined
      expect(firstResult).toHaveProperty("subtitle");
      expect(firstResult).toHaveProperty("slug");
      expect(firstResult).toHaveProperty("verified", false);
    });

    it("should format genre data correctly", async () => {
      const response = await testApiRoute(generalSearchHandler, "/api/search", {
        searchParams: { q: "Taylor Swift" },
      });

      const data = await response.json();
      const firstResult = data.results[0];
      
      // Subtitle should contain genres if available
      expect(typeof firstResult.subtitle).toBe("string");
    });
  });

  describe("/api/search/suggestions", () => {
    it("should return artist suggestions from Ticketmaster API", async () => {
      const response = await testApiRoute(
        suggestionsHandler,
        "/api/search/suggestions",
        {
          searchParams: { q: "Taylor", limit: "5" },
        },
      );

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toHaveProperty("suggestions");
      expect(Array.isArray(data.suggestions)).toBe(true);
      
      if (data.suggestions.length > 0) {
        const firstSuggestion = data.suggestions[0];
        expect(firstSuggestion).toHaveProperty("id");
        expect(firstSuggestion).toHaveProperty("type", "artist");
        expect(firstSuggestion).toHaveProperty("title");
        
        // Should have metadata for popularity
        expect(firstSuggestion).toHaveProperty("metadata");
        if (firstSuggestion.metadata) {
          expect(firstSuggestion.metadata).toHaveProperty("popularity");
        }
      }
    });
  });

  describe("Cross-endpoint consistency", () => {
    it("should return similar artist data across all endpoints", async () => {
      const query = "Coldplay";
      
      // Test all three endpoints with same query
      const [artistsResponse, searchResponse, suggestionsResponse] = await Promise.all([
        testApiRoute(artistsSearchHandler, "/api/artists/search", {
          searchParams: { q: query, limit: "3" },
        }),
        testApiRoute(generalSearchHandler, "/api/search", {
          searchParams: { q: query, limit: "3" },
        }),
        testApiRoute(suggestionsHandler, "/api/search/suggestions", {
          searchParams: { q: query, limit: "3" },
        }),
      ]);

      // All should succeed
      expect(artistsResponse.status).toBe(200);
      expect(searchResponse.status).toBe(200);
      expect(suggestionsResponse.status).toBe(200);

      const artistsData = await artistsResponse.json();
      const searchData = await searchResponse.json();
      const suggestionsData = await suggestionsResponse.json();

      // All should return artist data
      expect(artistsData.artists.length).toBeGreaterThan(0);
      expect(searchData.results.length).toBeGreaterThan(0);
      expect(suggestionsData.suggestions.length).toBeGreaterThan(0);

      // First artist should have same ID (same source)
      const artistsFirstId = artistsData.artists[0]?.id;
      const searchFirstId = searchData.results[0]?.id;
      const suggestionsFirstId = suggestionsData.suggestions[0]?.id;

      expect(artistsFirstId).toBe(searchFirstId);
      expect(artistsFirstId).toBe(suggestionsFirstId);
    });

    it("should handle rate limiting gracefully", async () => {
      // Mock rate limited response
      mockAPIFetch({
        "app.ticketmaster.com": {
          status: 429,
          error: "Rate limit exceeded",
        },
      });

      const response = await testApiRoute(
        artistsSearchHandler,
        "/api/artists/search",
        {
          searchParams: { q: "Test Artist" },
        },
      );

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe("Search failed");
    });
  });

  describe("Data transformation validation", () => {
    it("should properly transform Ticketmaster attraction data to artist format", async () => {
      const response = await testApiRoute(
        artistsSearchHandler,
        "/api/artists/search",
        {
          searchParams: { q: "Taylor Swift" },
        },
      );

      const data = await response.json();
      const artist = data.artists[0];

      // Should transform attraction.name to artist.name
      expect(artist.name).toBe("Taylor Swift");
      
      // Should include image URL
      expect(artist.imageUrl).toBe("https://example.com/taylor-swift.jpg");
      
      // Should include genres array
      expect(Array.isArray(artist.genres)).toBe(true);
      expect(artist.genres[0]).toBe("Pop");
      
      // Should mark as Ticketmaster source
      expect(artist.source).toBe("ticketmaster");
      expect(artist.externalId).toBe("K8vZ917G1V7");
    });

    it("should handle missing image data gracefully", async () => {
      // Mock response without images
      mockAPIFetch({
        "app.ticketmaster.com": {
          status: 200,
          data: {
            _embedded: {
              attractions: [
                {
                  id: "K8vZ917G1V9",
                  name: "Unknown Artist",
                  classifications: [],
                },
              ],
            },
          },
        },
      });

      const response = await testApiRoute(
        artistsSearchHandler,
        "/api/artists/search",
        {
          searchParams: { q: "Unknown Artist" },
        },
      );

      const data = await response.json();
      const artist = data.artists[0];

      expect(artist.imageUrl).toBeUndefined();
      expect(Array.isArray(artist.genres)).toBe(true);
      expect(artist.genres.length).toBe(0);
    });
  });
});

console.log(`
🧪 Search Consistency Test Suite
=================================

This test suite verifies:
✅ All search endpoints use Ticketmaster API consistently
✅ Data structures match component expectations  
✅ Error handling works properly
✅ Rate limiting is handled gracefully
✅ Data transformation preserves all required fields

Run with: pnpm test test-search-consistency.ts
`);