import "@testing-library/jest-dom";
import { cleanup } from "@testing-library/react";
import { afterEach, beforeEach, vi } from "vitest";

// Enhanced setup for integration tests
beforeEach(() => {
  // Clear all mocks before each test
  vi.clearAllMocks();

  // Reset DOM
  cleanup();

  // Set up test environment variables
  process.env['NEXT_PUBLIC_SUPABASE_URL'] = "http://localhost:54321";
  process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY'] = "test-anon-key";
  process.env['SUPABASE_SERVICE_ROLE_KEY'] = "test-service-role-key";
  process.env['DATABASE_URL'] = "postgresql://test:test@localhost:54321/test";
  process.env['NODE_ENV'] = "test";
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

// Mock Supabase for integration tests with more realistic behavior
vi.mock("~/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: {
          user: {
            id: "test-user-id",
            email: "test@example.com",
            role: "authenticated",
            user_metadata: { full_name: "Test User" },
          },
        },
        error: null,
      }),
      getSession: vi.fn().mockResolvedValue({
        data: {
          session: {
            user: {
              id: "test-user-id",
              email: "test@example.com",
            },
            access_token: "test-token",
          },
        },
        error: null,
      }),
    },
    from: vi.fn().mockImplementation((table: string) => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      upsert: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      neq: vi.fn().mockReturnThis(),
      gt: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lt: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      like: vi.fn().mockReturnThis(),
      ilike: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      contains: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      range: vi.fn().mockReturnThis(),
      single: vi.fn().mockImplementation(() => {
        // Return mock data based on table
        const mockData = getMockDataForTable(table);
        return Promise.resolve({ data: mockData, error: null });
      }),
      maybeSingle: vi.fn().mockImplementation(() => {
        const mockData = getMockDataForTable(table);
        return Promise.resolve({ data: mockData, error: null });
      }),
      // Mock database operations to return success
      then: vi.fn().mockImplementation((callback) => {
        const mockData = getMockDataForTable(table);
        return Promise.resolve(callback({ data: [mockData], error: null }));
      }),
    })),
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnValue({ unsubscribe: vi.fn() }),
      unsubscribe: vi.fn(),
    })),
    realtime: {
      setAuth: vi.fn(),
    },
  }),
}));

// Mock client-side Supabase
vi.mock("~/lib/supabase/client", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: {
          user: {
            id: "test-user-id",
            email: "test@example.com",
            role: "authenticated",
          },
        },
        error: null,
      }),
      getSession: vi.fn().mockResolvedValue({
        data: {
          session: {
            user: { id: "test-user-id", email: "test@example.com" },
            access_token: "test-token",
          },
        },
        error: null,
      }),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
      signInWithPassword: vi.fn().mockResolvedValue({
        data: { user: { id: "test-user-id" }, session: {} },
        error: null,
      }),
      signUp: vi.fn().mockResolvedValue({
        data: { user: { id: "test-user-id" }, session: {} },
        error: null,
      }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
    },
    from: vi.fn().mockImplementation((table: string) => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      single: vi.fn().mockImplementation(() => {
        const mockData = getMockDataForTable(table);
        return Promise.resolve({ data: mockData, error: null });
      }),
    })),
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnValue({ unsubscribe: vi.fn() }),
      unsubscribe: vi.fn(),
    })),
  }),
}));

// Mock data factory for different tables
function getMockDataForTable(table: string) {
  const mockDataMap: Record<string, any> = {
    users: {
      id: "test-user-id",
      email: "test@example.com",
      full_name: "Test User",
      role: "user",
      created_at: new Date().toISOString(),
    },
    artists: {
      id: "test-artist-id",
      name: "Test Artist",
      slug: "test-artist",
      spotify_id: "spotify-test-id",
      image_url: "https://example.com/artist.jpg",
      genres: ["rock", "alternative"],
      popularity: 75,
      followers: 10000,
      verified: true,
      created_at: new Date().toISOString(),
    },
    shows: {
      id: "test-show-id",
      name: "Test Show",
      date: new Date().toISOString(),
      venue_id: "test-venue-id",
      headliner_artist_id: "test-artist-id",
      status: "active",
      created_at: new Date().toISOString(),
    },
    venues: {
      id: "test-venue-id",
      name: "Test Venue",
      slug: "test-venue",
      city: "Test City",
      state: "Test State",
      country: "Test Country",
      latitude: 40.7128,
      longitude: -74.006,
      capacity: 5000,
      created_at: new Date().toISOString(),
    },
    songs: {
      id: "test-song-id",
      name: "Test Song",
      artist_id: "test-artist-id",
      spotify_id: "spotify-song-id",
      preview_url: "https://example.com/preview.mp3",
      duration_ms: 180000,
      created_at: new Date().toISOString(),
    },
    votes: {
      id: "test-vote-id",
      song_id: "test-song-id",
      user_id: "test-user-id",
      vote_type: "upvote",
      created_at: new Date().toISOString(),
    },
    setlists: {
      id: "test-setlist-id",
      show_id: "test-show-id",
      song_id: "test-song-id",
      position: 1,
      votes: 5,
      created_at: new Date().toISOString(),
    },
  };

  return mockDataMap[table] || {};
}

// Enhanced fetch mock for API routes
global.fetch = vi
  .fn()
  .mockImplementation((url: string | URL, options?: RequestInit) => {
    const urlString = typeof url === "string" ? url : url.toString();

    // Mock different API endpoints
    if (urlString.includes("/api/admin/system-health")) {
      return Promise.resolve({
        ok: true,
        status: 200,
        statusText: "OK",
        json: () =>
          Promise.resolve({
            overall: {
              status: "healthy",
              timestamp: new Date().toISOString(),
              summary: { total: 4, healthy: 4, degraded: 0, down: 0 },
            },
            services: [
              {
                service: "Database",
                status: "healthy",
                responseTime: 45,
                lastCheck: new Date(),
              },
              {
                service: "Authentication",
                status: "healthy",
                responseTime: 30,
                lastCheck: new Date(),
              },
              {
                service: "Spotify API",
                status: "healthy",
                responseTime: 120,
                lastCheck: new Date(),
              },
              {
                service: "Ticketmaster API",
                status: "healthy",
                responseTime: 150,
                lastCheck: new Date(),
              },
            ],
            metrics: {
              cpuUsage: 25,
              memoryUsage: 45,
              diskUsage: 30,
              apiResponseTime: 150,
              activeConnections: 35,
              requestsPerMinute: 750,
              errorRate: "0.001",
            },
            alerts: [],
          }),
        headers: new Headers({ "content-type": "application/json" }),
      } as Response);
    }

    if (urlString.includes("/api/auth")) {
      return Promise.resolve({
        ok: true,
        status: 200,
        statusText: "OK",
        json: () => Promise.resolve({ success: true }),
        headers: new Headers({ "content-type": "application/json" }),
      } as Response);
    }

    if (urlString.includes("/api/artists")) {
      return Promise.resolve({
        ok: true,
        status: 200,
        statusText: "OK",
        json: () =>
          Promise.resolve({
            artists: [getMockDataForTable("artists")],
            pagination: { page: 1, pageSize: 20, total: 1 },
          }),
        headers: new Headers({ "content-type": "application/json" }),
      } as Response);
    }

    if (urlString.includes("/api/shows")) {
      return Promise.resolve({
        ok: true,
        status: 200,
        statusText: "OK",
        json: () =>
          Promise.resolve({
            shows: [getMockDataForTable("shows")],
            pagination: { page: 1, pageSize: 20, total: 1 },
          }),
        headers: new Headers({ "content-type": "application/json" }),
      } as Response);
    }

    if (urlString.includes("/api/votes")) {
      return Promise.resolve({
        ok: true,
        status: 200,
        statusText: "OK",
        json: () =>
          Promise.resolve({
            success: true,
            vote: getMockDataForTable("votes"),
          }),
        headers: new Headers({ "content-type": "application/json" }),
      } as Response);
    }

    // Default mock response
    return Promise.resolve({
      ok: true,
      status: 200,
      statusText: "OK",
      json: () => Promise.resolve({}),
      text: () => Promise.resolve(""),
      headers: new Headers(),
    } as Response);
  });

// Mock console to reduce noise in tests
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

console.error = (...args: any[]) => {
  // Suppress common test warnings that we can't easily fix
  if (
    args[0]?.includes?.("Warning: ReactDOM.render is deprecated") ||
    args[0]?.includes?.('"act"') ||
    args[0]?.includes?.("Using placeholder Supabase URL") ||
    args[0]?.includes?.("Realtime disabled")
  ) {
    return;
  }
  originalConsoleError(...args);
};

console.warn = (...args: any[]) => {
  if (
    args[0]?.includes?.("componentWillReceiveProps") ||
    args[0]?.includes?.("componentWillUpdate")
  ) {
    return;
  }
  originalConsoleWarn(...args);
};
