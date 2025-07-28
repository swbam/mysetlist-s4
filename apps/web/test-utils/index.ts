import type { User } from "@supabase/supabase-js";
import { vi } from "vitest";

export const mockUser: User = {
  id: "test-user-id",
  email: "test@example.com",
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  app_metadata: {},
  user_metadata: {},
  aud: "authenticated",
  role: "authenticated",
  phone: null,
  confirmation_sent_at: null,
  confirmed_at: new Date().toISOString(),
  email_confirmed_at: new Date().toISOString(),
  phone_confirmed_at: null,
  recovery_sent_at: null,
  last_sign_in_at: new Date().toISOString(),
  identities: [],
  factors: [],
  is_anonymous: false,
};

export function createMockSupabaseClient() {
  const mockQuery = {
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
    single: vi.fn().mockResolvedValue({ data: { role: "admin" }, error: null }),
    maybeSingle: vi
      .fn()
      .mockResolvedValue({ data: { role: "admin" }, error: null }),
  };

  return {
    auth: {
      getUser: vi
        .fn()
        .mockResolvedValue({ data: { user: mockUser }, error: null }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
      signInWithPassword: vi.fn().mockResolvedValue({
        data: { user: mockUser, session: {} },
        error: null,
      }),
      signUp: vi.fn().mockResolvedValue({
        data: { user: mockUser, session: {} },
        error: null,
      }),
      getSession: vi.fn().mockResolvedValue({
        data: {
          session: {
            user: mockUser,
            access_token: "test-token",
          },
        },
        error: null,
      }),
    },
    from: vi.fn().mockImplementation((table: string) => {
      // Return mock data with proper query chain
      const chainableQuery = {
        ...mockQuery,
        then: vi.fn().mockImplementation((callback) => {
          const mockData = getMockDataForTable(table);
          return Promise.resolve(callback({ data: [mockData], error: null }));
        }),
      };
      return chainableQuery;
    }),
  };
}

function getMockDataForTable(table: string) {
  const mockDataMap: Record<string, any> = {
    users: {
      id: "test-user-id",
      email: "test@example.com",
      full_name: "Test User",
      role: "admin",
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
    votes: {
      id: "test-vote-id",
      song_id: "test-song-id",
      user_id: "test-user-id",
      vote_type: "upvote",
      created_at: new Date().toISOString(),
    },
  };

  return mockDataMap[table] || {};
}

export function mockSupabase() {
  vi.mock("~/lib/supabase/server", () => ({
    createClient: vi.fn().mockResolvedValue(createMockSupabaseClient()),
  }));
}

export function renderWithProviders(component: React.ReactElement) {
  // Add providers as needed (AuthProvider, ThemeProvider, etc.)
  return component;
}

export * from "./performance";
export * from "./accessibility";
