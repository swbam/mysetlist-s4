import '@testing-library/jest-dom';
import React from 'react';
import { vi } from 'vitest';

// Mock Next.js Image component
vi.mock('next/image', () => ({
  default: ({ src, alt, ...props }: any) => {
    return React.createElement('img', { src, alt, ...props });
  },
}));

// Mock Next.js Link component
vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: any) => {
    return React.createElement('a', { href, ...props }, children);
  },
}));

// Mock Next.js cookies and headers for API route testing
vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
    has: vi.fn(),
    getAll: vi.fn(),
    toString: vi.fn(),
  })),
  headers: vi.fn(() => ({
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
    has: vi.fn(),
    entries: vi.fn(),
    forEach: vi.fn(),
    keys: vi.fn(),
    values: vi.fn(),
  })),
}));

// Mock Next.js server request/response
vi.mock('next/server', () => ({
  NextRequest: vi.fn().mockImplementation((url: string, options?: any) => ({
    url,
    method: options?.method || 'GET',
    headers: new Headers(options?.headers || {}),
    body: options?.body,
    json: vi.fn().mockResolvedValue({}),
    text: vi.fn().mockResolvedValue(''),
  })),
  NextResponse: {
    json: vi.fn().mockImplementation((data: any, options?: any) => ({
      json: vi.fn().mockResolvedValue(data),
      status: options?.status || 200,
      headers: new Headers(options?.headers || {}),
    })),
    next: vi.fn(),
  },
}));

// Mock environment variables to prevent server-side access in client tests
vi.mock('@repo/auth/keys', () => ({
  keys: () => ({
    NEXT_PUBLIC_SUPABASE_URL: 'http://localhost:54321',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
  }),
}));

vi.mock('@repo/database/keys', () => ({
  keys: () => ({
    DATABASE_URL: 'postgresql://test',
  }),
}));

vi.mock('@repo/rate-limit/keys', () => ({
  keys: () => ({
    UPSTASH_REDIS_REST_URL: undefined,
    UPSTASH_REDIS_REST_TOKEN: undefined,
  }),
}));

// Set up environment variables for testing
process.env.NEXT_PUBLIC_API_URL = 'http://localhost:3002';
process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:54321/test';
process.env.NODE_ENV = 'test';
process.env.SPOTIFY_CLIENT_ID = 'test-spotify-client-id';
process.env.SPOTIFY_CLIENT_SECRET = 'test-spotify-client-secret';
process.env.TICKETMASTER_API_KEY = 'test-ticketmaster-key';
process.env.SETLISTFM_API_KEY = 'test-setlistfm-key';
process.env.CRON_SECRET = 'test-cron-secret';

// Create a basic fetch mock that can be overridden by individual tests
const createBasicFetchMock = () => {
  return vi
    .fn()
    .mockImplementation((url: string | URL, _options?: RequestInit) => {
      // Convert relative URLs to absolute URLs for testing
      if (typeof url === 'string' && url.startsWith('/')) {
        url = `http://localhost:3000${url}`;
      }

      return Promise.resolve({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: () => Promise.resolve({}),
        text: () => Promise.resolve(''),
        headers: new Headers(),
      } as Response);
    });
};

// Only set up basic fetch mock if not already mocked
if (!global.fetch || !vi.isMockFunction(global.fetch)) {
  global.fetch = createBasicFetchMock();
}

// Global test environment setup
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});
