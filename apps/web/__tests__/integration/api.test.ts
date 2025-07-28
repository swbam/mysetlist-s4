import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { testDb } from "../utils/test-db";

// Test database setup
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

describe("API Integration Tests", () => {
  beforeAll(async () => {
    await testDb.setup();
  });

  afterAll(async () => {
    await testDb.cleanup();
  });

  beforeEach(async () => {
    await testDb.reset();
  });

  describe("Search API", () => {
    it("should search artists successfully", async () => {
      // Insert test data
      const { data: artist } = await supabase
        .from("artists")
        .insert({
          name: "Test Artist",
          slug: "test-artist",
          genres: ["Rock", "Alternative"],
        })
        .select()
        .single();

      // Test search
      const response = await fetch(
        `${process.env.TEST_BASE_URL}/api/search?q=Test Artist`,
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.results).toHaveLength(1);
      expect(data.results[0].title).toBe("Test Artist");
      expect(data.results[0].type).toBe("artist");
    });

    it("should handle empty search queries", async () => {
      const response = await fetch(
        `${process.env.TEST_BASE_URL}/api/search?q=`,
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.results).toHaveLength(0);
    });

    it("should filter search results by type", async () => {
      // Insert test data
      await supabase.from("artists").insert({
        name: "Test Artist",
        slug: "test-artist",
      });

      await supabase.from("venues").insert({
        name: "Test Venue",
        slug: "test-venue",
        city: "Test City",
        state: "TS",
      });

      // Test artist filter
      const artistResponse = await fetch(
        `${process.env.TEST_BASE_URL}/api/search?q=Test&type=artist`,
      );
      const artistData = await artistResponse.json();

      expect(artistData.results).toHaveLength(1);
      expect(artistData.results[0].type).toBe("artist");

      // Test venue filter
      const venueResponse = await fetch(
        `${process.env.TEST_BASE_URL}/api/search?q=Test&type=venue`,
      );
      const venueData = await venueResponse.json();

      expect(venueData.results).toHaveLength(1);
      expect(venueData.results[0].type).toBe("venue");
    });
  });

  describe("Voting API", () => {
    let testUser: any;
    let testSetlistSong: any;

    beforeEach(async () => {
      // Create test user
      const { data: user } = await supabase.auth.admin.createUser({
        email: "test@example.com",
        password: "testpassword",
        email_confirm: true,
      });
      testUser = user.user;

      // Create test data
      const { data: artist } = await supabase
        .from("artists")
        .insert({ name: "Test Artist", slug: "test-artist" })
        .select()
        .single();

      const { data: venue } = await supabase
        .from("venues")
        .insert({
          name: "Test Venue",
          slug: "test-venue",
          city: "Test City",
          state: "TS",
        })
        .select()
        .single();

      const { data: show } = await supabase
        .from("shows")
        .insert({
          name: "Test Show",
          slug: "test-show",
          headliner_artist_id: artist.id,
          venue_id: venue.id,
          date: "2024-12-31",
        })
        .select()
        .single();

      const { data: song } = await supabase
        .from("songs")
        .insert({
          title: "Test Song",
          artist: "Test Artist",
        })
        .select()
        .single();

      const { data: setlist } = await supabase
        .from("setlists")
        .insert({
          show_id: show.id,
          artist_id: artist.id,
          type: "predicted",
        })
        .select()
        .single();

      const { data: setlistSong } = await supabase
        .from("setlist_songs")
        .insert({
          setlist_id: setlist.id,
          song_id: song.id,
          position: 1,
        })
        .select()
        .single();

      testSetlistSong = setlistSong;
    });

    afterEach(async () => {
      if (testUser) {
        await supabase.auth.admin.deleteUser(testUser.id);
      }
    });

    it("should allow authenticated users to vote", async () => {
      // Get session token
      const { data: session } = await supabase.auth.signInWithPassword({
        email: "test@example.com",
        password: "testpassword",
      });

      const response = await fetch(`${process.env.TEST_BASE_URL}/api/votes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.session?.access_token}`,
        },
        body: JSON.stringify({
          setlistSongId: testSetlistSong.id,
          voteType: "up",
        }),
      });

      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.userVote).toBe("up");
      expect(data.upvotes).toBe(1);
      expect(data.netVotes).toBe(1);
    });

    it("should prevent unauthenticated voting", async () => {
      const response = await fetch(`${process.env.TEST_BASE_URL}/api/votes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          setlistSongId: testSetlistSong.id,
          voteType: "up",
        }),
      });

      expect(response.status).toBe(401);
    });

    it("should allow users to change their vote", async () => {
      const { data: session } = await supabase.auth.signInWithPassword({
        email: "test@example.com",
        password: "testpassword",
      });

      const authHeaders = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.session?.access_token}`,
      };

      // First vote
      await fetch(`${process.env.TEST_BASE_URL}/api/votes`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          setlistSongId: testSetlistSong.id,
          voteType: "up",
        }),
      });

      // Change vote
      const response = await fetch(`${process.env.TEST_BASE_URL}/api/votes`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          setlistSongId: testSetlistSong.id,
          voteType: "down",
        }),
      });

      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.userVote).toBe("down");
      expect(data.upvotes).toBe(0);
      expect(data.downvotes).toBe(1);
      expect(data.netVotes).toBe(-1);
    });

    it("should allow users to remove their vote", async () => {
      const { data: session } = await supabase.auth.signInWithPassword({
        email: "test@example.com",
        password: "testpassword",
      });

      const authHeaders = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.session?.access_token}`,
      };

      // First vote
      await fetch(`${process.env.TEST_BASE_URL}/api/votes`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          setlistSongId: testSetlistSong.id,
          voteType: "up",
        }),
      });

      // Remove vote
      const response = await fetch(`${process.env.TEST_BASE_URL}/api/votes`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          setlistSongId: testSetlistSong.id,
          voteType: null,
        }),
      });

      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.userVote).toBe(null);
      expect(data.upvotes).toBe(0);
      expect(data.downvotes).toBe(0);
      expect(data.netVotes).toBe(0);
    });
  });

  describe("Health Check API", () => {
    it("should return system health status", async () => {
      const response = await fetch(
        `${process.env.TEST_BASE_URL}/api/health/comprehensive`,
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty("status");
      expect(data).toHaveProperty("timestamp");
      expect(data).toHaveProperty("checks");
      expect(data.checks).toBeInstanceOf(Array);
      expect(data.checks.length).toBeGreaterThan(0);
    });

    it("should include database health check", async () => {
      const response = await fetch(
        `${process.env.TEST_BASE_URL}/api/health/comprehensive`,
      );
      const data = await response.json();

      const dbCheck = data.checks.find(
        (check: any) => check.service === "database",
      );
      expect(dbCheck).toBeDefined();
      expect(dbCheck.status).toBe("healthy");
    });
  });

  describe("Trending API", () => {
    it("should return trending artists", async () => {
      // Insert test data with trending scores
      await supabase.from("artists").insert([
        { name: "Trending Artist 1", slug: "trending-1", trending_score: 100 },
        { name: "Trending Artist 2", slug: "trending-2", trending_score: 80 },
        { name: "Regular Artist", slug: "regular", trending_score: 10 },
      ]);

      const response = await fetch(
        `${process.env.TEST_BASE_URL}/api/trending/artists?limit=2`,
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.artists).toHaveLength(2);
      expect(data.artists[0].name).toBe("Trending Artist 1");
      expect(data.artists[1].name).toBe("Trending Artist 2");
    });

    it("should return trending shows", async () => {
      // Create test data
      const { data: artist } = await supabase
        .from("artists")
        .insert({ name: "Test Artist", slug: "test-artist" })
        .select()
        .single();

      const { data: venue } = await supabase
        .from("venues")
        .insert({
          name: "Test Venue",
          slug: "test-venue",
          city: "Test City",
          state: "TS",
        })
        .select()
        .single();

      await supabase.from("shows").insert([
        {
          name: "Trending Show 1",
          slug: "trending-show-1",
          headliner_artist_id: artist.id,
          venue_id: venue.id,
          date: "2024-12-31",
          trending_score: 90,
        },
        {
          name: "Regular Show",
          slug: "regular-show",
          headliner_artist_id: artist.id,
          venue_id: venue.id,
          date: "2024-12-30",
          trending_score: 20,
        },
      ]);

      const response = await fetch(
        `${process.env.TEST_BASE_URL}/api/trending/shows?limit=1`,
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.shows).toHaveLength(1);
      expect(data.shows[0].name).toBe("Trending Show 1");
    });
  });
});
