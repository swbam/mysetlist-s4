import '@testing-library/jest-dom'
import { vi } from 'vitest'
import React from 'react'

// Mock Next.js Image component
vi.mock('next/image', () => ({
  default: ({ src, alt, ...props }: any) => {
    return React.createElement('img', { src, alt, ...props })
  },
}))

// Mock Next.js Link component  
vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: any) => {
    return React.createElement('a', { href, ...props }, children)
  },
}))

// Mock environment variables to prevent server-side access in client tests
vi.mock('@repo/auth/keys', () => ({
  keys: () => ({
    NEXT_PUBLIC_SUPABASE_URL: 'http://localhost:54321',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
  }),
}))

vi.mock('@repo/database/keys', () => ({
  keys: () => ({
    DATABASE_URL: 'postgresql://test',
  }),
}))

vi.mock('@repo/rate-limit/keys', () => ({
  keys: () => ({
    UPSTASH_REDIS_REST_URL: undefined,
    UPSTASH_REDIS_REST_TOKEN: undefined,
  }),
}))

// Set up environment variables for testing
process.env['NEXT_PUBLIC_API_URL'] = 'http://localhost:3002'

// Create a basic fetch mock that can be overridden by individual tests
const createBasicFetchMock = () => {
  return vi.fn().mockImplementation((url: string | URL, options?: RequestInit) => {
    // Convert relative URLs to absolute URLs for testing
    if (typeof url === 'string' && url.startsWith('/')) {
      url = `http://localhost:3000${url}`
    }
    
    return Promise.resolve({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: () => Promise.resolve({}),
      text: () => Promise.resolve(''),
      headers: new Headers(),
    } as Response)
  })
}

// Only set up basic fetch mock if not already mocked
if (!global.fetch || !vi.isMockFunction(global.fetch)) {
  global.fetch = createBasicFetchMock()
}

// Global test environment setup
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
}) 