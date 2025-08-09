import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "../../../../app/api/admin/analytics/votes/route";

// Create a function that returns a fresh mock Supabase instance
const createMockSupabase = () => ({
  auth: {
    getUser: vi.fn(),
  },
  from: vi.fn(),
});

<<<<<<< HEAD
// Create a variable to hold our mock instance
let mockSupabase: ReturnType<typeof createMockSupabase>;

// Mock the Supabase server client module
vi.mock("~/lib/api/supabase/server", () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabase)),
=======
vi.mock("~/lib/supabase/server", () => ({
  createClient: vi.fn(() => mockSupabase),
>>>>>>> fccdd438ab7273b15f8870d2cd1c08442bb2d530
}));

describe("/api/admin/analytics/votes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Create a fresh mock instance for each test
    mockSupabase = createMockSupabase();
  });

  describe("GET", () => {
    it("should return 401 if user is not authenticated", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const request = new NextRequest(
        "http://localhost/api/admin/analytics/votes",
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 403 if user is not admin or moderator", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: "user-1" } },
        error: null,
      });

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { role: "user" },
          error: null,
        }),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      const request = new NextRequest(
        "http://localhost/api/admin/analytics/votes",
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Forbidden");
    });

    it("should return vote analytics for admin user", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: "admin-1" } },
        error: null,
      });

      // Mock vote analytics data
      const mockVoteData = [
        {
          id: "vote-1",
          created_at: "2023-01-01T00:00:00Z",
          vote_type: "up",
          setlist_song_id: "setlist-song-1",
          user_id: "user-1",
          show_id: "show-1",
          artist_id: "artist-1",
          venue_id: "venue-1",
          setlist_song: {
            id: "setlist-song-1",
            song: {
              title: "Test Song",
              artist: "Test Artist",
            },
          },
          user: {
            id: "user-1",
            display_name: "Test User",
            username: "testuser",
          },
        },
      ];

      // Mock for role check
      const roleCheckQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { role: "admin" },
          error: null,
        }),
      };

      // Mock for vote analytics query
      const voteAnalyticsQuery = {
        select: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: mockVoteData,
          error: null,
        }),
      };

      // Set up from() to return different queries based on table
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === "users") {
          return roleCheckQuery;
        } else if (table === "vote_analytics") {
          return voteAnalyticsQuery;
        }
        return roleCheckQuery;
      });

      const request = new NextRequest(
        "http://localhost/api/admin/analytics/votes?period=7d",
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty("summary");
      expect(data).toHaveProperty("topSongs");
      expect(data).toHaveProperty("topUsers");
      expect(data).toHaveProperty("recentActivity");
      expect(data).toHaveProperty("trends");
      expect(data).toHaveProperty("engagementMetrics");

      // Check summary calculations
      expect(data.summary.totalVotes).toBe(1);
      expect(data.summary.upvotes).toBe(1);
      expect(data.summary.downvotes).toBe(0);
      expect(data.summary.uniqueUsers).toBe(1);
      expect(data.summary.uniqueShows).toBe(1);
      expect(data.summary.uniqueSongs).toBe(1);

      // Check top songs
      expect(data.topSongs).toHaveLength(1);
      expect(data.topSongs[0].votes).toBe(1);

      // Check recent activity
      expect(data.recentActivity).toHaveLength(1);
    });

    it("should handle different time periods correctly", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: "admin-1" } },
        error: null,
      });

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { role: "admin" },
          error: null,
        }),
        gte: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      // Test 30 day period
      const request = new NextRequest(
        "http://localhost/api/admin/analytics/votes?period=30d",
      );
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(mockQuery.gte).toHaveBeenCalled();
    });

    it("should filter by location when specified", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: "admin-1" } },
        error: null,
      });

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { role: "admin" },
          error: null,
        }),
        gte: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      const request = new NextRequest(
        "http://localhost/api/admin/analytics/votes?showId=show-123&artistId=artist-456",
      );
      const response = await GET(request);

      expect(response.status).toBe(200);
      // Verify filters were applied
      expect(mockQuery.eq).toHaveBeenCalledWith("show_id", "show-123");
      expect(mockQuery.eq).toHaveBeenCalledWith("artist_id", "artist-456");
    });

    it("should handle errors gracefully", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: "admin-1" } },
        error: null,
      });

      const roleCheckQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { role: "admin" },
          error: null,
        }),
      };

      const errorQuery = {
        select: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: null,
          error: new Error("Database error"),
        }),
      };

      let callCount = 0;
      mockSupabase.from.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return roleCheckQuery; // Role check succeeds
        } else {
          return errorQuery; // Vote query fails
        }
      });

      const request = new NextRequest(
        "http://localhost/api/admin/analytics/votes",
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Failed to fetch analytics");
    });

    it("should calculate engagement metrics correctly", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: "admin-1" } },
        error: null,
      });

      const mockVoteData = [
        {
          id: "vote-1",
          created_at: new Date().toISOString(),
          vote_type: "up",
          setlist_song_id: "song-1",
          user_id: "user-1",
          show_id: "show-1",
          setlist_song: { song: { title: "Song 1", artist: "Artist 1" } },
          user: { display_name: "User 1" },
        },
        {
          id: "vote-2",
          created_at: new Date().toISOString(),
          vote_type: "down",
          setlist_song_id: "song-1",
          user_id: "user-2",
          show_id: "show-1",
          setlist_song: { song: { title: "Song 1", artist: "Artist 1" } },
          user: { display_name: "User 2" },
        },
        {
          id: "vote-3",
          created_at: new Date().toISOString(),
          vote_type: "up",
          setlist_song_id: "song-2",
          user_id: "user-1",
          show_id: "show-1",
          setlist_song: { song: { title: "Song 2", artist: "Artist 1" } },
          user: { display_name: "User 1" },
        },
      ];

      const roleCheckQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { role: "admin" },
          error: null,
        }),
      };

      const voteQuery = {
        select: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: mockVoteData,
          error: null,
        }),
      };

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === "users") {
          return roleCheckQuery;
        } else {
          return voteQuery;
        }
      });

      const request = new NextRequest(
        "http://localhost/api/admin/analytics/votes?period=7d",
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      
      // Verify engagement metrics
      expect(data.engagementMetrics.avgVotesPerUser).toBe("1.50"); // 3 votes / 2 users
      expect(data.engagementMetrics.avgVotesPerSong).toBe("1.50"); // 3 votes / 2 songs
      expect(data.engagementMetrics.upvoteRatio).toBe("66.7"); // 2 upvotes / 3 total
      
      // Verify summary
      expect(data.summary.totalVotes).toBe(3);
      expect(data.summary.upvotes).toBe(2);
      expect(data.summary.downvotes).toBe(1);
      expect(data.summary.uniqueUsers).toBe(2);
      expect(data.summary.uniqueSongs).toBe(2);
    });
  });
});