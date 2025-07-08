import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type RenderOptions, render } from '@testing-library/react';
import { SessionProvider } from 'next-auth/react';
import type React from 'react';
import type { ReactElement } from 'react';
import { vi } from 'vitest';

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
  }),
  useSearchParams: () => ({
    get: vi.fn(),
    has: vi.fn(),
    getAll: vi.fn(),
  }),
  usePathname: () => '/test',
  useParams: () => ({}),
}));

// Mock Supabase client
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getSession: vi
        .fn()
        .mockResolvedValue({ data: { session: null }, error: null }),
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      signIn: vi.fn(),
      signOut: vi.fn(),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn(),
      limit: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
    })),
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(),
      unsubscribe: vi.fn(),
    })),
  }),
}));

// Create a test query client
const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: Number.POSITIVE_INFINITY,
      },
    },
  });

interface AllTheProvidersProps {
  children: React.ReactNode;
  session?: any;
}

function AllTheProviders({ children, session = null }: AllTheProvidersProps) {
  const testQueryClient = createTestQueryClient();

  return (
    <SessionProvider session={session}>
      <QueryClientProvider client={testQueryClient}>
        {children}
      </QueryClientProvider>
    </SessionProvider>
  );
}

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'> & { session?: any }
) => {
  const { session, ...renderOptions } = options || {};

  return render(ui, {
    wrapper: ({ children }) => (
      <AllTheProviders session={session}>{children}</AllTheProviders>
    ),
    ...renderOptions,
  });
};

// Mock fetch for API calls
export const mockFetch = (response: any, ok = true) => {
  global.fetch = vi.fn().mockResolvedValue({
    ok,
    json: async () => response,
    status: ok ? 200 : 400,
    statusText: ok ? 'OK' : 'Bad Request',
  });
  return global.fetch;
};

// Mock authenticated user
export const mockAuthenticatedUser = (overrides = {}) => ({
  id: 'test-user-id',
  email: 'test@example.com',
  user_metadata: {
    full_name: 'Test User',
    ...overrides,
  },
});

// Test data factories
export const createTestArtist = (overrides = {}) => ({
  id: 'test-artist-id',
  name: 'Test Artist',
  slug: 'test-artist',
  spotifyId: 'spotify-test-id',
  ticketmasterId: 'tm-test-id',
  imageUrl: 'https://example.com/artist.jpg',
  genres: ['rock', 'alternative'],
  popularity: 75,
  followers: 10000,
  verified: true,
  ...overrides,
});

export const createTestShow = (overrides = {}) => ({
  id: 'test-show-id',
  name: 'Test Show',
  date: new Date().toISOString(),
  venueId: 'test-venue-id',
  headlinerArtistId: 'test-artist-id',
  ticketmasterId: 'tm-show-id',
  status: 'active',
  ...overrides,
});

export const createTestVenue = (overrides = {}) => ({
  id: 'test-venue-id',
  name: 'Test Venue',
  slug: 'test-venue',
  city: 'Test City',
  state: 'Test State',
  country: 'Test Country',
  latitude: 40.7128,
  longitude: -74.006,
  capacity: 5000,
  ...overrides,
});

export const createTestSong = (overrides = {}) => ({
  id: 'test-song-id',
  name: 'Test Song',
  artistId: 'test-artist-id',
  spotifyId: 'spotify-song-id',
  previewUrl: 'https://example.com/preview.mp3',
  duration: 180000,
  ...overrides,
});

// Re-export everything
export * from '@testing-library/react';
export { customRender as render };
export { vi };
