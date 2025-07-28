import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "../../../../app/api/admin/analytics/votes/route";

// Mock Supabase
const mockSupabase = {
  auth: {
    getUser: vi.fn(),
  },
  from: vi.fn(),
};

vi.mock("~/lib/api/supabase/server", () => ({
  createClient: vi.fn(() => mockSupabase),
}));

describe("/api/admin/analytics/votes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET", () => {
    it("should return 401 if user is not authenticated", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
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
      });

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { role: "user" },
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
      });

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { role: "admin" },
        }),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
      };

      // Mock vote analytics data
      const mockVoteData = [
        {
          id: "vote-1",
          created_at: "2023-01-01T00:00:00Z",
          vote_type: "played",
          setlist_song: {
            song: {
              id: "song-1",
              name: "Test Song",
              artist: { name: "Test Artist" },
            },
          },
          user: {
            id: "user-1",
            display_name: "Test User",
          },
        },
      ];

      const mockTopSongs = [
        {
          song_id: "song-1",
          song_name: "Test Song",
          artist_name: "Test Artist",
          vote_count: 25,
        },
      ];

      const mockTopUsers = [
        {
          user_id: "user-1",
          display_name: "Test User",
          vote_count: 15,
        },
      ];

      // Mock different queries based on table
      mockSupabase.from.mockImplementation((table) => {
        if (table === "setlist_song_votes") {
          return {
            ...mockQuery,
            select: vi.fn().mockImplementation((fields) => {
              if (fields.includes("count")) {
                return {
                  ...mockQuery,
                  gte: vi.fn().mockReturnThis(),
                  lte: vi.fn().mockReturnThis(),
                  eq: vi.fn().mockResolvedValue({ count: 100 }),
                };
              }
              return {
                ...mockQuery,
                gte: vi.fn().mockReturnThis(),
                lte: vi.fn().mockReturnThis(),
                order: vi.fn().mockReturnThis(),
                limit: vi.fn().mockResolvedValue({ data: mockVoteData }),
              };
            }),
          };
        }
        return mockQuery;
      });

      // Mock raw SQL queries for top songs and users
      const mockRpc = vi.fn();
      mockSupabase.rpc = mockRpc;

      mockRpc.mockImplementation((procedure) => {
        if (procedure === "get_top_voted_songs") {
          return Promise.resolve({ data: mockTopSongs });
        }
        if (procedure === "get_top_voting_users") {
          return Promise.resolve({ data: mockTopUsers });
        }
        return Promise.resolve({ data: [] });
      });

      const request = new NextRequest(
        "http://localhost/api/admin/analytics/votes?period=7d",
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty("summary");
      expect(data).toHaveProperty("top_songs");
      expect(data).toHaveProperty("top_users");
      expect(data).toHaveProperty("recent_votes");
      expect(data).toHaveProperty("trends");

      expect(data.summary.total_votes).toBe(100);
      expect(data.top_songs).toEqual(mockTopSongs);
      expect(data.top_users).toEqual(mockTopUsers);
      expect(data.recent_votes).toEqual(mockVoteData);
    });

    it("should handle different time periods correctly", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: "admin-1" } },
      });

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { role: "admin" },
        }),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
      };

      mockSupabase.from.mockReturnValue(mockQuery);
      mockSupabase.rpc = vi.fn().mockResolvedValue({ data: [] });

      // Test 30 day period
      const request = new NextRequest(
        "http://localhost/api/admin/analytics/votes?period=30d",
      );
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(mockQuery.gte).toHaveBeenCalled();
      expect(mockQuery.lte).toHaveBeenCalled();
    });

    it("should filter by vote type when specified", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: "admin-1" } },
      });

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { role: "admin" },
        }),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
      };

      mockSupabase.from.mockReturnValue(mockQuery);
      mockSupabase.rpc = vi.fn().mockResolvedValue({ data: [] });

      const request = new NextRequest(
        "http://localhost/api/admin/analytics/votes?vote_type=played",
      );
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(mockQuery.eq).toHaveBeenCalledWith("vote_type", "played");
    });

    it("should handle errors gracefully", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: "admin-1" } },
      });

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { role: "admin" },
        }),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
      };

      // Mock database error
      mockQuery.select.mockRejectedValueOnce(new Error("Database error"));

      mockSupabase.from.mockReturnValue(mockQuery);

      const request = new NextRequest(
        "http://localhost/api/admin/analytics/votes",
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Failed to fetch vote analytics");
    });

    it("should calculate vote trends correctly", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: "admin-1" } },
      });

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { role: "admin" },
        }),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
      };

      // Mock vote counts for trend calculation
      mockSupabase.from.mockImplementation((_table) => {
        return {
          ...mockQuery,
          select: vi.fn().mockImplementation((fields) => {
            if (fields.includes("count")) {
              return {
                ...mockQuery,
                gte: vi.fn().mockReturnThis(),
                lte: vi.fn().mockReturnThis(),
                eq: vi.fn().mockResolvedValue({ count: 50 }),
              };
            }
            return {
              ...mockQuery,
              gte: vi.fn().mockReturnThis(),
              lte: vi.fn().mockReturnThis(),
              order: vi.fn().mockReturnThis(),
              limit: vi.fn().mockResolvedValue({ data: [] }),
            };
          }),
        };
      });

      mockSupabase.rpc = vi.fn().mockResolvedValue({ data: [] });

      const request = new NextRequest(
        "http://localhost/api/admin/analytics/votes?period=7d",
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.summary).toHaveProperty("votes_today");
      expect(data.summary).toHaveProperty("votes_yesterday");
      expect(data.trends).toHaveProperty("daily_change");
    });
  });
});
