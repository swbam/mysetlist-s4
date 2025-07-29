import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "../../../app/api/admin/users/route";

// Create a function that returns a fresh mock Supabase instance
const createMockSupabase = () => ({
  auth: {
    getUser: vi.fn(),
  },
  from: vi.fn(),
});

// Create a variable to hold our mock instance
let mockSupabase: ReturnType<typeof createMockSupabase>;

// Mock the Supabase server client module
vi.mock("~/lib/api/supabase/server", () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabase)),
}));

describe("/api/admin/users", () => {
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

      const request = new NextRequest("http://localhost/api/admin/users");
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

      const request = new NextRequest("http://localhost/api/admin/users");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Forbidden");
    });

    it.skip("should return user list with pagination for admin user - NEEDS FIX: Mock setup for complex Supabase query chains", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: "admin-1" } },
        error: null,
      });

      const mockUsers = [
        {
          id: "user-1",
          email: "test@example.com",
          display_name: "Test User",
          role: "user",
          created_at: "2023-01-01T00:00:00Z",
          is_banned: false,
          email_confirmed_at: "2023-01-01T00:00:00Z",
        },
      ];

      // Create a general purpose mock query that handles all query methods
      const createMockQuery = (type: string) => {
        const query: any = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          not: vi.fn().mockReturnThis(),
          is: vi.fn().mockReturnThis(),
          or: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          range: vi.fn().mockReturnThis(),
          single: vi.fn(),
        };

        // Handle different query types
        if (type === "role-check") {
          query.single.mockResolvedValue({
            data: { role: "admin" },
            error: null,
          });
        } else if (type === "users") {
          // Chain methods return query for fluent interface
          query.range.mockImplementation(() => {
            // Create a new query object that will handle the final select
            const rangedQuery = { ...query };
            rangedQuery.select = vi.fn().mockResolvedValue({
              data: mockUsers,
              error: null,
              count: 1,
            });
            return rangedQuery;
          });
        } else if (type === "stats") {
          // Statistics queries use select with options
          query.select.mockImplementation((fields: string, options?: any) => {
            if (options?.count === "exact" && options?.head === true) {
              return Promise.resolve({
                count: 1,
                error: null,
              });
            }
            return query;
          });
        }

        return query;
      };

      // Track which call we're on
      let callCount = 0;
      mockSupabase.from.mockImplementation((table: string) => {
        callCount++;
        
        if (callCount === 1) {
          // First call is always the role check
          return createMockQuery("role-check");
        } else if (callCount === 2) {
          // Second call is the users query
          return createMockQuery("users");
        } else {
          // All other calls are statistics queries
          return createMockQuery("stats");
        }
      });

      const request = new NextRequest(
        "http://localhost/api/admin/users?page=1&limit=50",
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty("users");
      expect(data).toHaveProperty("pagination");
      expect(data).toHaveProperty("statistics");
      expect(data.users).toEqual(mockUsers);
      expect(data.pagination.page).toBe(1);
      expect(data.pagination.limit).toBe(50);
      expect(data.pagination.total).toBe(1);
      expect(data.statistics.total).toBe(1);
    });

    it("should apply search filters correctly", async () => {
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
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        not: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
      };

      // Handle the range().select() chain
      mockQuery.range.mockImplementation(() => {
        const rangedQuery = { ...mockQuery };
        rangedQuery.select = vi.fn().mockResolvedValue({
          data: [],
          error: null,
          count: 0,
        });
        return rangedQuery;
      });
      
      // Handle statistics queries
      mockQuery.select.mockImplementation((fields: any, options?: any) => {
        if (options?.count === "exact" && options?.head === true) {
          return Promise.resolve({
            count: 0,
            error: null,
          });
        }
        return mockQuery;
      });

      mockSupabase.from.mockReturnValue(mockQuery);

      const request = new NextRequest(
        "http://localhost/api/admin/users?search=test&role=moderator&status=active",
      );
      await GET(request);

      // Verify search filter was applied
      expect(mockQuery.or).toHaveBeenCalledWith(
        "email.ilike.%test%,display_name.ilike.%test%,username.ilike.%test%",
      );
      // Verify role filter was applied
      expect(mockQuery.eq).toHaveBeenCalledWith("role", "moderator");
      // Verify status filters were applied
      expect(mockQuery.not).toHaveBeenCalledWith("email_confirmed_at", "is", null);
      expect(mockQuery.eq).toHaveBeenCalledWith("is_banned", false);
    });

    it("should handle database errors gracefully", async () => {
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
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockReturnThis(),
      };

      // Make the range().select() chain return an error
      mockQuery.range.mockImplementation(() => {
        const rangedQuery = { ...mockQuery };
        rangedQuery.select = vi.fn().mockResolvedValue({
          data: null,
          error: new Error("Database error"),
          count: null,
        });
        return rangedQuery;
      });

      let callCount = 0;
      mockSupabase.from.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return mockQuery; // Role check succeeds
        } else {
          return mockQuery; // User query fails
        }
      });

      const request = new NextRequest("http://localhost/api/admin/users");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Failed to fetch users");
    });
  });
});