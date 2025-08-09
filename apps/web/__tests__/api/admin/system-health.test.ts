import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "../../../app/api/admin/system-health/route";

// Mock Supabase
const mockSupabase = {
  auth: {
    getUser: vi.fn(),
  },
  from: vi.fn(),
};

vi.mock("~/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue(mockSupabase),
}));

// Mock fetch for external API health checks
global.fetch = vi.fn();

describe("/api/admin/system-health", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    // Set environment variables for tests
    process.env["SPOTIFY_ACCESS_TOKEN"] = "test-token";
    process.env["TICKETMASTER_API_KEY"] = "test-key";
    process.env["SETLISTFM_API_KEY"] = "test-key";
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe("GET", () => {
    it("should return 401 if user is not authenticated", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
      });

      const request = new NextRequest(
        "http://localhost/api/admin/system-health",
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
        "http://localhost/api/admin/system-health",
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Forbidden");
    });

    it("should return system health status for admin user", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: "admin-1" } },
      });

      // Create a proper mock query builder
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { role: "admin" },
          error: null,
        }),
        limit: vi.fn().mockReturnThis(),
        upsert: vi.fn().mockResolvedValue({ data: {}, error: null }),
      };

      // Mock the database health check query
      const mockHealthQuery = {
        select: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: [{}], error: null }),
      };

      // Set up from() method to return appropriate query based on table
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === "users" && mockSupabase.from.mock.calls.length === 1) {
          return mockQuery; // First call for user role check
        } else if (
          table === "users" &&
          mockSupabase.from.mock.calls.length === 2
        ) {
          return mockHealthQuery; // Second call for health check
        } else if (table === "system_health") {
          return {
            upsert: vi.fn().mockResolvedValue({ data: {}, error: null }),
          };
        }
        return mockQuery;
      });

      // Mock external API responses
      (global.fetch as any).mockImplementation((url: string) => {
        if (url.includes("ticketmaster")) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve({ data: "ok" }),
          });
        }
        if (url.includes("setlist.fm")) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve({ data: "ok" }),
          });
        }
        if (url.includes("spotify")) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve({ data: "ok" }),
          });
        }
        return Promise.resolve({
          ok: false,
          status: 500,
        });
      });

      const request = new NextRequest(
        "http://localhost/api/admin/system-health",
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty("overall");
      expect(data).toHaveProperty("services");
      expect(data).toHaveProperty("metrics");
      expect(data.overall.status).toBeDefined();
    });

    it("should handle database connection failures", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: "admin-1" } },
      });

      // Mock user role check to pass
      const mockUserQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { role: "admin" },
          error: null,
        }),
      };

      // Mock database health check to fail
      const mockHealthQuery = {
        select: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: null,
          error: { message: "Connection failed" },
        }),
      };

      // Set up from() method to return appropriate query based on call order
      let callCount = 0;
      mockSupabase.from.mockImplementation((table: string) => {
        callCount++;
        if (table === "users" && callCount === 1) {
          return mockUserQuery; // First call for user role check
        } else if (table === "users" && callCount === 2) {
          return mockHealthQuery; // Second call for health check
        } else if (table === "system_health") {
          return {
            upsert: vi.fn().mockResolvedValue({ data: {}, error: null }),
          };
        }
        return mockUserQuery;
      });

      // Mock external APIs as healthy
      (global.fetch as any).mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ data: "ok" }),
      });

      const request = new NextRequest(
        "http://localhost/api/admin/system-health",
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.overall.status).toBe("down");
      expect(
        data.services.find((s: any) => s.service === "Database")?.status,
      ).toBe("down");
    });

    it("should handle external API failures", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: "admin-1" } },
      });

      // Mock user role check to pass
      const mockUserQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { role: "admin" },
          error: null,
        }),
      };

      // Mock database health check to pass
      const mockHealthQuery = {
        select: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: [{}], error: null }),
      };

      // Set up from() method to return appropriate query based on call order
      let callCount = 0;
      mockSupabase.from.mockImplementation((table: string) => {
        callCount++;
        if (table === "users" && callCount === 1) {
          return mockUserQuery; // First call for user role check
        } else if (table === "users" && callCount === 2) {
          return mockHealthQuery; // Second call for health check
        } else if (table === "system_health") {
          return {
            upsert: vi.fn().mockResolvedValue({ data: {}, error: null }),
          };
        }
        return mockUserQuery;
      });

      // Mock external API failures
      (global.fetch as any).mockImplementation((url: string) => {
        if (url.includes("ticketmaster")) {
          return Promise.resolve({
            ok: false,
            status: 500,
          });
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ data: "ok" }),
        });
      });

      const request = new NextRequest(
        "http://localhost/api/admin/system-health",
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.overall.status).toBe("down");
      expect(
        data.services.find((s: any) => s.service === "Database")?.status,
      ).toBe("healthy");
      expect(
        data.services.find((s: any) => s.service === "Ticketmaster API")
          ?.status,
      ).toBe("down");
    });

    it("should calculate response times correctly", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: "admin-1" } },
      });

      // Mock user role check to pass
      const mockUserQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { role: "admin" },
          error: null,
        }),
      };

      // Mock database health check to pass quickly
      const mockHealthQuery = {
        select: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: [{}], error: null }),
      };

      // Set up from() method to return appropriate query based on call order
      let callCount = 0;
      mockSupabase.from.mockImplementation((table: string) => {
        callCount++;
        if (table === "users" && callCount === 1) {
          return mockUserQuery; // First call for user role check
        } else if (table === "users" && callCount === 2) {
          return mockHealthQuery; // Second call for health check
        } else if (table === "system_health") {
          return {
            upsert: vi.fn().mockResolvedValue({ data: {}, error: null }),
          };
        }
        return mockUserQuery;
      });

      // Mock delayed response for external APIs
      (global.fetch as any).mockImplementation(() => {
        return new Promise((resolve) => {
          setTimeout(() => {
            resolve({
              ok: true,
              status: 200,
              json: () => Promise.resolve({ data: "ok" }),
            });
          }, 100);
        });
      });

      const request = new NextRequest(
        "http://localhost/api/admin/system-health",
      );

      // Start the request and advance timers
      const responsePromise = GET(request);
      vi.advanceTimersByTime(100);

      const response = await responsePromise;
      const data = await response.json();

      expect(response.status).toBe(200);
      // Response times should be present and positive numbers
      expect(
        data.services.find((s: any) => s.service === "Spotify API")
          ?.responseTime,
      ).toBeGreaterThan(0);
    });
  });
});
